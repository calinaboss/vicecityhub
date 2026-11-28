document.addEventListener('DOMContentLoaded', () => {
      const cachedUserStr = localStorage.getItem('vicecityhub_user');
      if (!cachedUserStr) {
        window.location.replace('403.html');
        return;
      }

      const welcomeLine = document.getElementById('admin-welcome-line');
      const btnRefresh = document.getElementById('btn-refresh-admin');
      const tabButtons = document.querySelectorAll('[data-admin-tab]');
      const officialList = document.getElementById('admin-official-list');
      const pendingDiscordsList = document.getElementById('admin-pending-discords-list');
      const approvedDiscordsList = document.getElementById('admin-approved-discords-list');
      const allPostsList = document.getElementById('admin-all-posts-list');
      const usersList = document.getElementById('admin-users-list');
      const ticketsList = document.getElementById('admin-tickets-list');
      const tutorialsList = document.getElementById('admin-tutorials-list');
      const tutorialForm = document.getElementById('admin-tutorial-form');
      const userSearchInput = document.getElementById('admin-user-search');

      let cachedUsers = [];

      function showToast(msg) {
        const toast = document.getElementById('toast-notification');
        const toastText = document.getElementById('toast-text');
        if (!toast || !toastText) return;
        toastText.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function resolveTutorialThumb(t) {
        let thumb = (t.thumbnail_url || '').trim();
        const platform = (t.platform || '').toLowerCase();
        const vUrl = t.video_url || '';
        if (platform === 'instagram') {
          return '/assets/brand/instagram-fallback.webp';
        }
        if (!thumb || thumb === '/assets/brand/vicecityhub-og.jpg' || thumb === '/assets/brand/video-fallback-16x9.webp') {
          if (platform === 'youtube') {
            const ym = vUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            if (ym && ym[1]) return `https://img.youtube.com/vi/${ym[1]}/hqdefault.jpg`;
          }
        }
        return thumb || '/assets/brand/video-fallback-16x9.webp';
      }

      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.getAttribute('data-admin-tab');
          document.querySelectorAll('.admin-tab-panel').forEach(panel => {
            panel.style.display = panel.id === `admin-tab-${target}` ? 'block' : 'none';
          });
        });
      });

      async function runAdminAction(action, targetId, confirmMsg) {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action, targetId })
          });
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'Action failed');
            return;
          }
          showToast('Moderation action applied!');
          await loadAdminData();
        } catch (err) {
          showToast('Network error');
        }
      }

      function renderOfficialPending(items) {
        document.getElementById('count-pending-official').textContent = items.length;
        if (items.length === 0) {
          officialList.innerHTML = `<div class="empty-feed-state" style="padding: 24px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No Official News posts waiting for approval.</p></div>`;
          return;
        }
        officialList.innerHTML = items.map(p => `
          <div class="admin-row-item">
            <div class="admin-row-info">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge-pill mod">OFFICIAL PENDING</span>
                <strong>${escapeHtml(p.title)}</strong>
                <span style="font-size: 0.76rem; color: var(--text-dim);">by @${escapeHtml(p.username)} &bull; ${escapeHtml((p.created_at || '').slice(0, 16))}</span>
              </div>
              <p style="font-size: 0.83rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(p.content)}</p>
            </div>
            <div class="admin-row-actions">
              <button type="button" class="btn-post-submit" style="height: 34px; padding: 0 12px; font-size: 0.78rem;" data-act="approve_post" data-id="${escapeHtml(p.id)}">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="reject_post" data-id="${escapeHtml(p.id)}">
                <i class="fa-solid fa-trash-can"></i> Reject
              </button>
            </div>
          </div>
        `).join('');
      }

      function renderDiscords(pending, approved) {
        document.getElementById('count-pending-discords').textContent = pending.length;
        if (pending.length === 0) {
          pendingDiscordsList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No Discord servers waiting for approval.</p></div>`;
        } else {
          pendingDiscordsList.innerHTML = pending.map(d => `
            <div class="admin-row-item">
              <div class="admin-row-info">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="discord-pill-tag">${escapeHtml(d.tag)}</span>
                  <span class="discord-country-tag">${escapeHtml(d.country_label)}</span>
                  <strong>${escapeHtml(d.name)}</strong>
                  <a href="${escapeHtml(d.invite_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.76rem; color: var(--accent-cyan);">${escapeHtml(d.invite_url)}</a>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px; white-space: pre-line; word-break: break-word;">${escapeHtml(d.description)}</p>
              </div>
              <div class="admin-row-actions">
                <button type="button" class="btn-post-submit" style="height: 34px; padding: 0 12px; font-size: 0.78rem;" data-act="approve_discord" data-id="${escapeHtml(d.id)}">
                  <i class="fa-solid fa-check"></i> Approve
                </button>
                <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_discord" data-id="${escapeHtml(d.id)}">
                  <i class="fa-solid fa-trash-can"></i> Reject
                </button>
              </div>
            </div>
          `).join('');
        }

        if (approved.length === 0) {
          approvedDiscordsList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No active Discord servers in directory.</p></div>`;
        } else {
          approvedDiscordsList.innerHTML = approved.map(d => `
            <div class="admin-row-item">
              <div class="admin-row-info">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="discord-pill-tag">${escapeHtml(d.tag)}</span>
                  <strong>${escapeHtml(d.name)}</strong>
                  <a href="${escapeHtml(d.invite_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.76rem; color: var(--accent-cyan);">${escapeHtml(d.invite_url)}</a>
                </div>
              </div>
              <div class="admin-row-actions">
                <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_discord" data-id="${escapeHtml(d.id)}">
                  <i class="fa-solid fa-trash-can"></i> Remove
                </button>
              </div>
            </div>
          `).join('');
        }
      }

      function renderAllPosts(posts) {
        document.getElementById('count-all-posts').textContent = posts.length;
        if (posts.length === 0) {
          allPostsList.innerHTML = `<div class="empty-feed-state" style="padding: 24px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No approved community posts in feed.</p></div>`;
          return;
        }
        allPostsList.innerHTML = posts.map(p => {
          const isPinned = Number(p.pinned) === 1;
          return `
            <div class="admin-row-item">
              <div class="admin-row-info">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  ${isPinned ? '<span class="badge-pill mod"><i class="fa-solid fa-thumbtack"></i> PINNED</span>' : ''}
                  <span class="post-category-tag">${escapeHtml(p.category_label || p.category)}</span>
                  <strong>${escapeHtml(p.title)}</strong>
                  <span style="font-size: 0.76rem; color: var(--text-dim);">by @${escapeHtml(p.username)} &bull; ${Number(p.likes_count || 0)} likes</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml((p.content || '').slice(0, 180))}</p>
              </div>
              <div class="admin-row-actions">
                <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: ${isPinned ? 'var(--accent-pink)' : 'var(--text-main)'};" data-act="pin_post" data-id="${escapeHtml(p.id)}">
                  <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin Post'}
                </button>
                <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_post" data-id="${escapeHtml(p.id)}" data-confirm="Delete this post permanently?">
                  <i class="fa-solid fa-trash-can"></i> Delete
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      function renderUsersList() {
        const q = (userSearchInput?.value || '').trim().toLowerCase();
        const filtered = cachedUsers.filter(u => !q || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
        document.getElementById('count-all-users').textContent = cachedUsers.length;

        if (filtered.length === 0) {
          usersList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No matching user profiles.</p></div>`;
          return;
        }

        usersList.innerHTML = filtered.map(u => {
          const isAdmin = u.role === 'admin';
          const isBanned = Number(u.is_banned) === 1;
          return `
            <div class="admin-row-item">
              <div class="admin-row-info" style="display: flex; align-items: center; gap: 12px;">
                <img src="${escapeHtml(u.avatar_url || 'assets/brand/favicon-192x192.png')}" alt="${escapeHtml(u.username)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <a href="profile.html?u=${encodeURIComponent(u.username)}" style="font-weight: 800; color: var(--text-main);">@${escapeHtml(u.username)}</a>
                    <span class="badge-pill ${isAdmin ? 'mod' : 'verified'}">${isAdmin ? 'ADMIN' : 'MEMBER'}</span>
                    ${isBanned ? '<span class="badge-pill mod">SUSPENDED</span>' : ''}
                  </div>
                  <div style="font-size: 0.76rem; color: var(--text-dim);">${escapeHtml(u.email)} &bull; ${Number(u.followers_count || 0)} followers &bull; Joined ${escapeHtml((u.created_at || '').slice(0, 10))}</div>
                </div>
              </div>
              <div class="admin-row-actions">
                <a href="profile.html?u=${encodeURIComponent(u.username)}" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 11px; font-size: 0.76rem;">
                  <i class="fa-solid fa-eye"></i> Profile
                </a>
                ${!isAdmin ? `
                  <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 11px; font-size: 0.76rem;" data-act="${isBanned ? 'unban_user' : 'ban_user'}" data-id="${escapeHtml(u.id)}">
                    <i class="fa-solid fa-ban"></i> ${isBanned ? 'Unban' : 'Suspend'}
                  </button>
                  <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 11px; font-size: 0.76rem; color: #fca5a5;" data-act="delete_user" data-id="${escapeHtml(u.id)}" data-confirm="Permanently delete profile @${escapeHtml(u.username)} and all their posts?">
                    <i class="fa-solid fa-user-xmark"></i> Delete Profile
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      function renderReports(reports) {
        const countEl = document.getElementById('count-all-reports');
        const reportsList = document.getElementById('admin-reports-list');
        if (countEl) countEl.textContent = reports.length;
        if (!reportsList) return;
        if (reports.length === 0) {
          reportsList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No reported posts pending review.</p></div>`;
          return;
        }
        reportsList.innerHTML = reports.map(r => `
          <div class="admin-row-item">
            <div class="admin-row-info">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge-pill mod"><i class="fa-solid fa-flag"></i> REPORTED</span>
                <strong>${escapeHtml(r.post_title || 'Post #' + (r.target_id || '').slice(0, 8))}</strong>
                <span style="font-size: 0.76rem; color: var(--text-dim);">Author: @${escapeHtml(r.post_username || r.post_author || 'Unknown')} &bull; ${escapeHtml((r.created_at || '').slice(0, 16))}</span>
              </div>
              <p style="font-size: 0.82rem; color: #fca5a5; margin-top: 4px;"><strong>Report Reason:</strong> ${escapeHtml(r.reason)}</p>
              ${r.post_content ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">"${escapeHtml(r.post_content.slice(0, 200))}"</p>` : ''}
            </div>
            <div class="admin-row-actions">
              ${r.target_id ? `
                <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_post" data-id="${escapeHtml(r.target_id)}" data-confirm="Delete this reported post permanently?">
                  <i class="fa-solid fa-trash-can"></i> Delete Post
                </button>
              ` : ''}
              <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem;" data-act="dismiss_report" data-id="${escapeHtml(r.id)}">
                <i class="fa-solid fa-check"></i> Dismiss Report
              </button>
            </div>
          </div>
        `).join('');
      }

      function renderTickets(tickets) {
        document.getElementById('count-all-tickets').textContent = tickets.length;
        if (tickets.length === 0) {
          ticketsList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No active support ticket chats.</p></div>`;
          return;
        }
        ticketsList.innerHTML = tickets.map(t => {
          const shortId = (t.id || '').slice(0, 8);
          const msgs = Array.isArray(t.messages) && t.messages.length > 0
            ? t.messages
            : [{ sender_role: 'user', sender_name: t.username || 'User', message: t.message, created_at: t.created_at }];

          const messagesHtml = msgs.map(m => {
            const isAdmin = m.sender_role === 'admin';
            return `
              <div class="ticket-chat-bubble ${isAdmin ? 'from-admin' : 'from-user'}">
                <div class="ticket-chat-meta">
                  <strong>${escapeHtml(m.sender_name)}</strong>
                  ${isAdmin ? '<span class="badge-pill mod">ADMIN</span>' : '<span class="badge-pill verified">USER</span>'}
                  <span>${escapeHtml((m.created_at || '').slice(11, 16) || '')}</span>
                </div>
                <div class="ticket-chat-text">${escapeHtml(m.message)}</div>
              </div>
            `;
          }).join('');

          return `
            <div class="ticket-thread-card">
              <div class="ticket-thread-header">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge-pill mod">TICKET #${escapeHtml(shortId)}</span>
                  <strong>${escapeHtml(t.subject)}</strong>
                  <span style="font-size: 0.76rem; color: var(--text-dim);">by @${escapeHtml(t.username || 'Guest')} (${escapeHtml(t.email)}) &bull; ${escapeHtml(t.category)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button type="button" class="btn-secondary" style="height: 32px; min-height: 32px; padding: 0 11px; font-size: 0.76rem; color: #fca5a5;" data-act="close_ticket" data-id="${escapeHtml(t.id)}" data-confirm="Close and permanently erase this temporary ticket chat?">
                    <i class="fa-solid fa-trash-can"></i> Close &amp; Erase Chat
                  </button>
                </div>
              </div>
              <div class="ticket-chat-drawer" style="display: block;">
                <div class="ticket-chat-messages">
                  ${messagesHtml}
                </div>
                <div class="ticket-chat-input-row">
                  <input type="text" class="form-input ticket-reply-input" id="admin-reply-input-${escapeHtml(t.id)}" placeholder="Reply to @${escapeHtml(t.username || 'User')} in live chat..." maxlength="1500">
                  <button type="button" class="btn-post-submit" style="height: 38px; padding: 0 14px; font-size: 0.8rem;" data-admin-reply-ticket="${escapeHtml(t.id)}">
                    <i class="fa-solid fa-paper-plane"></i> Send Reply
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      function renderTutorials(pending = [], approved = []) {
        const pendingCountEl = document.getElementById('count-pending-tutorials');
        if (pendingCountEl) pendingCountEl.textContent = pending.length;
        const approvedCountEl = document.getElementById('count-approved-tutorials');
        if (approvedCountEl) approvedCountEl.textContent = approved.length;
        const countEl = document.getElementById('count-all-tutorials');
        if (countEl) countEl.textContent = pending.length > 0 ? `${pending.length} pending` : approved.length;

        const pendingListEl = document.getElementById('admin-pending-tutorials-list');
        if (pendingListEl) {
          if (pending.length === 0) {
            pendingListEl.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No tutorials waiting for moderator approval.</p></div>`;
          } else {
            pendingListEl.innerHTML = pending.map(t => `
              <div class="admin-row-item">
                <div style="display: flex; gap: 14px; align-items: center; width: 100%;">
                  <div style="width: 100px; height: 60px; border-radius: 8px; overflow: hidden; background: #000; flex-shrink: 0; position: relative;">
                    <img src="${escapeHtml(resolveTutorialThumb(t))}" alt="${escapeHtml(t.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/assets/brand/video-fallback-16x9.webp'">
                    <div style="position: absolute; bottom: 3px; right: 4px; background: rgba(0,0,0,0.7); font-size: 0.65rem; padding: 1px 4px; border-radius: 4px; text-transform: uppercase;">
                      ${escapeHtml(t.platform || 'video')}
                    </div>
                  </div>
                  <div class="admin-row-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span class="badge-pill mod"><i class="fa-solid fa-clock"></i> PENDING APPROVAL</span>
                      <span class="badge-pill verified">${escapeHtml(t.category_label || t.category)}</span>
                      <strong>${escapeHtml(t.title)}</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(t.description)}</p>
                    <div style="margin-top: 4px;">
                      <a href="${escapeHtml(t.video_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.76rem; color: var(--accent-cyan); text-decoration: none;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Video Link
                      </a>
                    </div>
                  </div>
                </div>
                <div class="admin-row-actions">
                  <button type="button" class="btn-post-submit" style="height: 34px; padding: 0 12px; font-size: 0.78rem;" data-act="approve_tutorial" data-id="${escapeHtml(t.id)}">
                    <i class="fa-solid fa-check"></i> Approve
                  </button>
                  <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_tutorial" data-id="${escapeHtml(t.id)}" data-confirm="Reject and permanently delete this tutorial submission?">
                    <i class="fa-solid fa-trash-can"></i> Reject
                  </button>
                </div>
              </div>
            `).join('');
          }
        }

        if (tutorialsList) {
          if (approved.length === 0) {
            tutorialsList.innerHTML = `<div class="empty-feed-state" style="padding: 20px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No published tutorials or easter eggs in directory.</p></div>`;
          } else {
            tutorialsList.innerHTML = approved.map(t => `
              <div class="admin-row-item">
                <div style="display: flex; gap: 14px; align-items: center; width: 100%;">
                  <div style="width: 100px; height: 60px; border-radius: 8px; overflow: hidden; background: #000; flex-shrink: 0; position: relative;">
                    <img src="${escapeHtml(resolveTutorialThumb(t))}" alt="${escapeHtml(t.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/assets/brand/video-fallback-16x9.webp'">
                    <div style="position: absolute; bottom: 3px; right: 4px; background: rgba(0,0,0,0.7); font-size: 0.65rem; padding: 1px 4px; border-radius: 4px; text-transform: uppercase;">
                      ${escapeHtml(t.platform || 'video')}
                    </div>
                  </div>
                  <div class="admin-row-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span class="badge-pill verified">${escapeHtml(t.category_label || t.category)}</span>
                      <strong>${escapeHtml(t.title)}</strong>
                      <span style="font-size: 0.76rem; color: var(--text-dim);"><i class="fa-solid fa-eye"></i> ${escapeHtml(t.views_count || 0)} views</span>
                    </div>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(t.description)}</p>
                    <div style="margin-top: 4px;">
                      <a href="${escapeHtml(t.video_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.76rem; color: var(--accent-cyan); text-decoration: none;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Video Link
                      </a>
                    </div>
                  </div>
                </div>
                <div class="admin-row-actions">
                  <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_tutorial" data-id="${escapeHtml(t.id)}" data-confirm="Permanently delete this tutorial/easter egg video?">
                    <i class="fa-solid fa-trash-can"></i> Delete
                  </button>
                </div>
              </div>
            `).join('');
          }
        }
      }

      async function loadAdminData() {
        try {
          const res = await fetch('/api/admin', { credentials: 'same-origin' });
          if (res.status === 401 || res.status === 403) {
            window.location.replace('403.html');
            return;
          }
          const data = await res.json();
          if (!res.ok || !data.ok || !data.admin) {
            window.location.replace('403.html');
            return;
          }
          const guard = document.getElementById('admin-guard-style');
          if (guard) guard.remove();
          document.body.style.display = '';

          if (welcomeLine && data.admin) {
            welcomeLine.textContent = `Logged in as Administrator @${data.admin.username} (${data.admin.email})`;
          }
          renderOfficialPending(data.pendingOfficialPosts || []);
          renderDiscords(data.pendingDiscords || [], data.approvedDiscords || []);
          renderAllPosts(data.allPosts || []);
          cachedUsers = data.users || [];
          renderUsersList();
          renderReports(data.reports || []);
          renderTickets(data.tickets || []);
          renderTutorials(data.pendingTutorials || [], data.approvedTutorials || data.tutorials || []);
          renderAdminFeedPosts(data.adminFeedPosts || []);
        } catch (err) {
          window.location.replace('403.html');
        }
      }

      function renderAdminFeedPosts(serverPosts = []) {
        const countFeedposts = document.getElementById('count-admin-feedposts');
        const countApprovedFeedposts = document.getElementById('count-approved-feedposts');
        const feedpostsList = document.getElementById('admin-feedposts-list');

        let localPosts = [];
        try {
          localPosts = JSON.parse(localStorage.getItem('vicecityhub_admin_feed_posts') || '[]');
        } catch (e) {}

        const combined = [...localPosts];
        serverPosts.forEach(sp => {
          if (!combined.some(p => p.id === sp.id)) {
            combined.push({
              id: sp.id,
              title: sp.title,
              text: sp.content,
              mediaUrl: sp.media_url,
              likes: sp.likes_count || 0,
              time: sp.created_at
            });
          }
        });

        if (countFeedposts) countFeedposts.textContent = combined.length;
        if (countApprovedFeedposts) countApprovedFeedposts.textContent = combined.length;

        if (!feedpostsList) return;
        if (combined.length === 0) {
          feedpostsList.innerHTML = `<div class="empty-feed-state" style="padding: 24px 0;"><p style="color: var(--text-muted); font-size: 0.85rem;">No admin feed posts published yet.</p></div>`;
          return;
        }

        feedpostsList.innerHTML = combined.map(p => `
          <div class="admin-row-item">
            <div style="display: flex; gap: 14px; align-items: center; width: 100%;">
              <div style="width: 90px; height: 60px; border-radius: 6px; overflow: hidden; background: #000; flex-shrink: 0;">
                <img src="${escapeHtml(p.mediaUrl || '')}" alt="Post image" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/brand/favicon-512x512.png'">
              </div>
              <div class="admin-row-info" style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge-pill mod"><i class="fa-solid fa-camera"></i> ADMIN FEED</span>
                  <span style="font-size: 0.76rem; color: var(--text-dim);"><i class="fa-solid fa-thumbs-up"></i> ${escapeHtml(p.likes || 0)} likes &bull; Likes-Only</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-main); margin-top: 4px; line-height: 1.4;">${escapeHtml(p.text || '')}</p>
              </div>
            </div>
            <div class="admin-row-actions">
              <button type="button" class="btn-secondary" style="height: 34px; min-height: 34px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-act="delete_feedpost" data-id="${escapeHtml(p.id)}" data-confirm="Permanently delete this admin feed post?">
                <i class="fa-solid fa-trash-can"></i> Delete
              </button>
            </div>
          </div>
        `).join('');
      }

      const feedpostForm = document.getElementById('admin-feedpost-form');
      const feedpostFile = document.getElementById('feedpost-file');
      const btnBrowseFeedpostFile = document.getElementById('btn-browse-feedpost-file');
      const feedpostFileName = document.getElementById('feedpost-file-name');
      const feedpostImg = document.getElementById('feedpost-img');
      const feedpostPreviewBox = document.getElementById('feedpost-preview-box');
      const feedpostImgPreview = document.getElementById('feedpost-img-preview');
      const btnRemoveFeedpostPreview = document.getElementById('btn-remove-feedpost-preview');

      if (btnBrowseFeedpostFile && feedpostFile) {
        btnBrowseFeedpostFile.addEventListener('click', (e) => {
          if (e.target.tagName !== 'LABEL') {
            feedpostFile.click();
          }
        });
      }

      if (feedpostFile) {
        feedpostFile.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
            showToast('Please select a valid image file (JPG, PNG, WebP, GIF)');
            feedpostFile.value = '';
            return;
          }

          if (feedpostFileName) {
            feedpostFileName.textContent = file.name;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
            const rawUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
              const maxWidth = 1600;
              const maxHeight = 1600;
              let w = img.width;
              let h = img.height;
              if (w > maxWidth || h > maxHeight) {
                const ratio = Math.min(maxWidth / w, maxHeight / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const processedUrl = canvas.toDataURL('image/jpeg', 0.88);
              if (feedpostImg) feedpostImg.value = processedUrl;
              if (feedpostImgPreview) feedpostImgPreview.src = processedUrl;
              if (feedpostPreviewBox) feedpostPreviewBox.style.display = 'block';
            };
            img.src = rawUrl;
          };
          reader.readAsDataURL(file);
        });
      }

      if (btnRemoveFeedpostPreview) {
        btnRemoveFeedpostPreview.addEventListener('click', () => {
          if (feedpostFile) feedpostFile.value = '';
          if (feedpostFileName) feedpostFileName.textContent = 'No file chosen';
          if (feedpostImg) feedpostImg.value = '';
          if (feedpostPreviewBox) feedpostPreviewBox.style.display = 'none';
        });
      }

      if (feedpostImg && feedpostPreviewBox && feedpostImgPreview) {
        feedpostImg.addEventListener('input', () => {
          const url = (feedpostImg.value || '').trim();
          if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:image/'))) {
            feedpostImgPreview.src = url;
            feedpostPreviewBox.style.display = 'block';
          } else {
            feedpostPreviewBox.style.display = 'none';
          }
        });
      }

      if (feedpostForm) {
        feedpostForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const media_url = (feedpostImg?.value || '').trim();
          const content = (document.getElementById('feedpost-text')?.value || '').trim();
          if (!media_url || !content) {
            showToast('Please provide both an image URL and text content.');
            return;
          }
          const submitBtn = document.getElementById('btn-publish-feedpost');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
          }

          const localPost = {
            id: 'admin_feed_' + Date.now(),
            category: 'admin_feed',
            categoryLabel: 'Official Feed',
            pinned: true,
            author: 'ViceCityHub',
            username: 'vicecityhub',
            badge: 'Admin Feed',
            badgeClass: 'mod',
            title: 'ViceCityHub Feed Update',
            text: content,
            mediaUrl: media_url,
            mediaType: 'image',
            avatar: 'assets/brand/favicon-512x512.png',
            likes: 0,
            isLiked: false,
            bookmarks: 0,
            isBookmarked: false,
            comments: [],
            time: new Date().toISOString()
          };

          try {
            const existingLocal = JSON.parse(localStorage.getItem('vicecityhub_admin_feed_posts') || '[]');
            existingLocal.unshift(localPost);
            localStorage.setItem('vicecityhub_admin_feed_posts', JSON.stringify(existingLocal));
          } catch (e) {}

          try {
            const res = await fetch('/api/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                action: 'create_feed_post',
                media_url,
                content,
                title: 'ViceCityHub Feed Update'
              })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.id) {
              localPost.id = data.id;
            }
            showToast('Admin feed post published to hub!');
            feedpostForm.reset();
            if (feedpostPreviewBox) feedpostPreviewBox.style.display = 'none';
            await loadAdminData();
          } catch (err) {
            showToast('Published locally to feed!');
            feedpostForm.reset();
            if (feedpostPreviewBox) feedpostPreviewBox.style.display = 'none';
            await loadAdminData();
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish to Feed';
            }
          }
        });
      }

      if (tutorialForm) {
        tutorialForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = (document.getElementById('tut-title')?.value || '').trim();
          const category = (document.getElementById('tut-category')?.value || 'easter_eggs').trim();
          const video_url = (document.getElementById('tut-url')?.value || '').trim();
          const thumbnail_url = (document.getElementById('tut-thumb')?.value || '').trim();
          const description = (document.getElementById('tut-desc')?.value || '').trim();
          const submitBtn = document.getElementById('btn-save-tut');

          if (!title || !video_url || !description) {
            showToast('Please fill all required fields');
            return;
          }

          if (!/<(?:iframe|blockquote)[^>]*>/i.test(video_url)) {
            showToast('ONLY EMBEDS (just search in the share or three dots buttons of the video and option with the embed and copy the code paste it here)');
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
          }

          try {
            const res = await fetch('/api/tutorials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                action: 'create',
                title,
                category,
                video_url,
                thumbnail_url,
                description
              })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
              showToast(data.error || 'Failed to publish tutorial');
            } else {
              showToast('Tutorial published successfully!');
              tutorialForm.reset();
              await loadAdminData();
            }
          } catch (err) {
            showToast('Network error while saving tutorial');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Video Tutorial';
            }
          }
        });
      }

      document.body.addEventListener('click', async (e) => {
        const replyBtn = e.target.closest('[data-admin-reply-ticket]');
        if (replyBtn) {
          const tid = replyBtn.getAttribute('data-admin-reply-ticket');
          const input = document.getElementById(`admin-reply-input-${tid}`);
          const msg = (input?.value || '').trim();
          if (!msg) return;
          input.value = '';
          try {
            const res = await fetch('/api/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ action: 'reply_ticket', targetId: tid, message: msg })
            });
            if (res.ok) {
              showToast('Reply sent to user ticket chat!');
              await loadAdminData();
            }
          } catch (err) {}
          return;
        }

        const actBtn = e.target.closest('[data-act]');
        if (!actBtn) return;
        const action = actBtn.getAttribute('data-act');
        const targetId = actBtn.getAttribute('data-id');
        const confirmMsg = actBtn.getAttribute('data-confirm') || '';
        if (action === 'delete_feedpost') {
          if (confirmMsg && !window.confirm(confirmMsg)) return;
          try {
            const cur = JSON.parse(localStorage.getItem('vicecityhub_admin_feed_posts') || '[]');
            const updated = cur.filter(p => p.id !== targetId);
            localStorage.setItem('vicecityhub_admin_feed_posts', JSON.stringify(updated));
          } catch (e) {}
          runAdminAction('delete_post', targetId);
          return;
        }
        if (action && targetId) {
          runAdminAction(action, targetId, confirmMsg);
        }
      });

      if (userSearchInput) userSearchInput.addEventListener('input', renderUsersList);
      if (btnRefresh) btnRefresh.addEventListener('click', loadAdminData);

      loadAdminData();
    });
