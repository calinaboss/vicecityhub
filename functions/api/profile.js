import {
  getClientIp,
  sha256Hex,
  generateUuid,
  jsonResponse,
  isTursoConfigured,
  runTursoSql,
  ensureTursoSchema,
  checkRateLimit,
  getAuthenticatedUser,
  sanitizePlainText,
  sanitizeHexColor,
  validateAndSanitizeAvatarDataUrl,
  sanitizeSocialLinks
} from './_turso.js';

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  let c = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    c |= aBuf[i] ^ bBuf[i];
  }
  return c === 0;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const pwBuf = new TextEncoder().encode(password);
  try {
    const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      key,
      256
    );
    const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `100000:${saltHex}:${hashHex}`;
  } catch (e) {
    const hashHex = await sha256Hex(`${saltHex}:${password}`);
    return `sha256:${saltHex}:${hashHex}`;
  }
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const prefix = parts[0];
  const saltHex = parts[1];
  const originalHashHex = parts[2];
  if (!saltHex || !originalHashHex) return false;

  if (prefix === 'sha256') {
    const derivedHex = await sha256Hex(`${saltHex}:${password}`);
    return constantTimeEqual(derivedHex, originalHashHex);
  }

  try {
    const iterations = Math.min(parseInt(prefix, 10) || 100000, 100000);
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const pwBuf = new TextEncoder().encode(password);
    const key = await crypto.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    );
    const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return constantTimeEqual(derivedHex, originalHashHex);
  } catch (e) {
    return false;
  }
}

function parseSocialJson(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (e) {
    return {};
  }
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const ip = getClientIp(request);
    const ipHash = await sha256Hex(ip);
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';

    if (!isTursoConfigured(env)) {
      return jsonResponse({ error: 'Database not configured' }, 500);
    }

    await ensureTursoSchema(env);

    // ------------------------------------------------------------------------
    // GET PROFILE (Own profile or public profile via ?u=username)
    // ------------------------------------------------------------------------
    if (request.method === 'GET') {
      const requestedUsername = (url.searchParams.get('u') || '').trim();
      const viewer = await getAuthenticatedUser(request, env);

      let targetUser = null;

      if (requestedUsername) {
        const { rows } = await runTursoSql(
          env,
          `SELECT id, username, role, avatar_url, banner_color, bio, discord_handle,
                  social_links, followers_count, following_count, created_at
           FROM users
           WHERE LOWER(username) = LOWER(?) AND is_banned = 0
           LIMIT 1`,
          [requestedUsername]
        );
        if (rows.length > 0) {
          targetUser = rows[0];
        }
      } else if (viewer) {
        targetUser = viewer;
      }

      if (!targetUser) {
        return jsonResponse({ error: 'User profile not found' }, 404);
      }

      const isOwnProfile = Boolean(viewer && viewer.id === targetUser.id);
      let isFollowing = false;

      if (viewer && !isOwnProfile) {
        try {
          const { rows: fRows } = await runTursoSql(
            env,
            'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
            [viewer.id, targetUser.id]
          );
          isFollowing = fRows.length > 0;
        } catch (e) {}
      }

      // Fetch user's recent community posts
      let recentPosts = [];
      try {
        const { rows: pRows } = await runTursoSql(
          env,
          `SELECT id, category, category_label, title, content, media_url, media_type, likes_count, comments_count, created_at
           FROM community_posts
           WHERE (user_id = ? OR LOWER(username) = LOWER(?)) AND status = 'approved'
           ORDER BY created_at DESC
           LIMIT 15`,
          [targetUser.id, targetUser.username]
        );
        recentPosts = pRows;
      } catch (e) {}

      return jsonResponse({
        ok: true,
        isOwnProfile,
        isFollowing,
        viewer: viewer ? { id: viewer.id, username: viewer.username, avatar_url: viewer.avatar_url, role: viewer.role } : null,
        profile: {
          id: targetUser.id,
          username: targetUser.username,
          email: isOwnProfile ? targetUser.email : undefined,
          role: targetUser.role || 'user',
          avatar_url: targetUser.avatar_url || 'assets/brand/favicon-192x192.png',
          banner_color: sanitizeHexColor(targetUser.banner_color),
          bio: targetUser.bio || '',
          discord_handle: targetUser.discord_handle || '',
          social_links: parseSocialJson(targetUser.social_links),
          followers_count: Number(targetUser.followers_count || 0),
          following_count: Number(targetUser.following_count || 0),
          created_at: targetUser.created_at
        },
        posts: recentPosts
      });
    }

    // ------------------------------------------------------------------------
    // POST ACTIONS
    // ------------------------------------------------------------------------
    if (request.method === 'POST') {
      const allowed = await checkRateLimit(env, `profile_${ipHash}`, 25, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Rate limit exceeded. Please wait a moment.' }, 429);
      }

      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400);
      }

      const viewer = await getAuthenticatedUser(request, env);

      // 1. UPDATE PROFILE (PFP, Banner Hex Color, Bio, Discord Handle, Social Links)
      if (action === 'update') {
        if (!viewer) {
          return jsonResponse({ error: 'Authentication required. Please log in.' }, 401);
        }

        const bannerColor = sanitizeHexColor(body.banner_color || viewer.banner_color);
        const bio = sanitizePlainText(body.bio || '', 300);
        const discordHandle = (body.discord_handle || '')
          .trim()
          .replace(/[^a-zA-Z0-9_.#-]/g, '')
          .slice(0, 36);

        let avatarUrl = viewer.avatar_url || '';
        if (typeof body.avatar_url === 'string' && body.avatar_url.trim()) {
          try {
            avatarUrl = validateAndSanitizeAvatarDataUrl(body.avatar_url);
          } catch (imgErr) {
            return jsonResponse({ error: imgErr.message || 'Invalid profile picture format.' }, 400);
          }
        }

        const sanitizedSocials = sanitizeSocialLinks(body.social_links || {});
        const socialLinksJson = JSON.stringify(sanitizedSocials);

        await runTursoSql(
          env,
          `UPDATE users
           SET avatar_url = ?, banner_color = ?, bio = ?, discord_handle = ?, social_links = ?
           WHERE id = ?`,
          [avatarUrl, bannerColor, bio, discordHandle, socialLinksJson, viewer.id]
        );

        return jsonResponse({
          ok: true,
          profile: {
            id: viewer.id,
            username: viewer.username,
            role: viewer.role,
            avatar_url: avatarUrl || 'assets/brand/favicon-192x192.png',
            banner_color: bannerColor,
            bio,
            discord_handle: discordHandle,
            social_links: sanitizedSocials,
            followers_count: Number(viewer.followers_count || 0),
            following_count: Number(viewer.following_count || 0)
          }
        });
      }

      // 2. FOLLOW / UNFOLLOW USER
      if (action === 'follow') {
        if (!viewer) {
          return jsonResponse({ error: 'Please log in to follow community members.' }, 401);
        }

        const targetUsername = (body.username || '').trim();
        if (!targetUsername) {
          return jsonResponse({ error: 'Target username is required' }, 400);
        }

        const { rows: targetRows } = await runTursoSql(
          env,
          'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?) AND is_banned = 0 LIMIT 1',
          [targetUsername]
        );
        if (targetRows.length === 0) {
          return jsonResponse({ error: 'User not found' }, 404);
        }
        const targetUser = targetRows[0];
        if (targetUser.id === viewer.id) {
          return jsonResponse({ error: 'You cannot follow yourself' }, 400);
        }

        const { rows: existing } = await runTursoSql(
          env,
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
          [viewer.id, targetUser.id]
        );

        let following = false;
        if (existing.length > 0) {
          await runTursoSql(
            env,
            'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
            [viewer.id, targetUser.id]
          );
          following = false;
        } else {
          await runTursoSql(
            env,
            'INSERT INTO user_follows (id, follower_id, following_id) VALUES (?, ?, ?)',
            [generateUuid(), viewer.id, targetUser.id]
          );
          following = true;
        }

        const { rows: followersCountRows } = await runTursoSql(
          env,
          'SELECT COUNT(*) AS cnt FROM user_follows WHERE following_id = ?',
          [targetUser.id]
        );
        const { rows: viewerFollowingRows } = await runTursoSql(
          env,
          'SELECT COUNT(*) AS cnt FROM user_follows WHERE follower_id = ?',
          [viewer.id]
        );

        const followersCount = Number(followersCountRows[0]?.cnt || 0);
        const viewerFollowingCount = Number(viewerFollowingRows[0]?.cnt || 0);

        await runTursoSql(env, 'UPDATE users SET followers_count = ? WHERE id = ?', [followersCount, targetUser.id]);
        await runTursoSql(env, 'UPDATE users SET following_count = ? WHERE id = ?', [viewerFollowingCount, viewer.id]);

        return jsonResponse({
          ok: true,
          following,
          followers_count: followersCount
        });
      }

      // 3. CHANGE USERNAME (Account Settings)
      if (action === 'change_username') {
        if (!viewer) {
          return jsonResponse({ error: 'Authentication required.' }, 401);
        }

        const newUsername = (body.new_username || '').trim().replace(/[^\w.-]/g, '').slice(0, 24);
        const currentPassword = body.current_password || '';

        if (newUsername.length < 3) {
          return jsonResponse({ error: 'New username must be between 3 and 24 characters (letters, numbers, _ . -).' }, 400);
        }
        if (!currentPassword) {
          return jsonResponse({ error: 'Current password is required to change your username.' }, 400);
        }

        const { rows: userRows } = await runTursoSql(
          env,
          'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
          [viewer.id]
        );
        if (userRows.length === 0 || !(await verifyPassword(currentPassword, userRows[0].password_hash))) {
          return jsonResponse({ error: 'Incorrect current password.' }, 403);
        }

        const { rows: taken } = await runTursoSql(
          env,
          'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1',
          [newUsername, viewer.id]
        );
        if (taken.length > 0) {
          return jsonResponse({ error: 'This username is already taken by another member.' }, 409);
        }

        const oldUsername = viewer.username;
        await runTursoSql(env, 'UPDATE users SET username = ? WHERE id = ?', [newUsername, viewer.id]);
        await runTursoSql(
          env,
          'UPDATE community_posts SET author = ?, username = ? WHERE user_id = ? OR LOWER(username) = LOWER(?)',
          [newUsername, newUsername.toLowerCase(), viewer.id, oldUsername]
        ).catch(() => {});
        await runTursoSql(
          env,
          'UPDATE community_comments SET author = ?, username = ? WHERE user_id = ? OR LOWER(username) = LOWER(?)',
          [newUsername, newUsername.toLowerCase(), viewer.id, oldUsername]
        ).catch(() => {});

        return jsonResponse({
          ok: true,
          username: newUsername
        });
      }

      // 4. CHANGE PASSWORD (Account Settings)
      if (action === 'change_password') {
        if (!viewer) {
          return jsonResponse({ error: 'Authentication required.' }, 401);
        }

        const currentPassword = body.current_password || '';
        const newPassword = body.new_password || '';

        if (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
          return jsonResponse({ error: 'New password must be between 8 and 128 characters.' }, 400);
        }

        const { rows: userRows } = await runTursoSql(
          env,
          'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
          [viewer.id]
        );
        if (userRows.length === 0 || !(await verifyPassword(currentPassword, userRows[0].password_hash))) {
          return jsonResponse({ error: 'Incorrect current password.' }, 403);
        }

        const newHash = await hashPassword(newPassword);
        await runTursoSql(env, 'UPDATE users SET password_hash = ? WHERE id = ?', [newHash, viewer.id]);

        return jsonResponse({ ok: true });
      }

      // 5. SUBMIT ACCOUNT SUPPORT / ASSISTANCE TICKET
      if (action === 'support') {
        const email = ((viewer && viewer.email) || body.email || '').trim().toLowerCase();
        const category = sanitizePlainText(body.category || 'account', 40);
        const subject = sanitizePlainText(body.subject || '', 120);
        const message = sanitizePlainText(body.message || '', 1500);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse({ error: 'Please provide a valid contact email address.' }, 400);
        }
        if (subject.length < 4 || message.length < 10) {
          return jsonResponse({ error: 'Please provide a clear subject and message (at least 10 characters).' }, 400);
        }

        const ticketId = generateUuid();
        await runTursoSql(
          env,
          `INSERT INTO support_tickets (id, user_id, username, email, category, subject, message, ip_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ticketId, viewer ? viewer.id : null, viewer ? viewer.username : 'Guest', email, category, subject, message, ipHash]
        );

        return jsonResponse({
          ok: true,
          ticket_id: ticketId
        }, 201);
      }
    }

    return jsonResponse({ error: 'Invalid method or profile action' }, 405);
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Unexpected server error in profile service.'
    }, 500);
  }
}
