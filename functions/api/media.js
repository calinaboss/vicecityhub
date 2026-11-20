import {
  getClientIp,
  sha256Hex,
  generateUuid,
  jsonResponse,
  isTursoConfigured,
  runTursoSql,
  checkRateLimit,
  getAuthenticatedUser
} from './_turso.js';

const ALLOWED_MEDIA_MIMES = new Set([
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/webm'
]);

const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

function verifyMagicBytes(mime, b64Chunk) {
  let binStr;
  try {
    binStr = atob(b64Chunk.slice(0, 64));
  } catch (e) {
    return false;
  }
  if (binStr.length < 12) return false;
  const b = (i) => binStr.charCodeAt(i) & 0xff;

  if (mime === 'image/webp') {
    return b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
           b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50;
  }
  if (mime === 'image/jpeg') {
    return b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff;
  }
  if (mime === 'image/png') {
    return b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47;
  }
  if (mime === 'image/gif') {
    return b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38;
  }
  if (mime === 'video/mp4') {

    return b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70;
  }
  if (mime === 'video/webm') {

    return b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3;
  }
  return false;
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    if (!isTursoConfigured(env)) {
      return jsonResponse({ error: 'Database not configured' }, 500);
    }

    if (request.method === 'GET') {
      const mediaId = (url.searchParams.get('id') || '').trim();
      if (!/^[0-9a-fA-F-]{20,40}$/.test(mediaId)) {
        return new Response('Not Found', { status: 404 });
      }

      const { rows: metaRows } = await runTursoSql(
        env,
        'SELECT mime_type FROM media_uploads WHERE id = ? LIMIT 1',
        [mediaId]
      );
      if (metaRows.length === 0) {
        return new Response('Media Not Found', { status: 404 });
      }

      const mimeType = metaRows[0].mime_type;
      if (!ALLOWED_MEDIA_MIMES.has(mimeType)) {
        return new Response('Forbidden Media Type', { status: 403 });
      }

      const { rows: chunkRows } = await runTursoSql(
        env,
        'SELECT data_b64 FROM media_chunks WHERE media_id = ? ORDER BY chunk_index ASC',
        [mediaId]
      );
      if (chunkRows.length === 0) {
        return new Response('Media Empty', { status: 404 });
      }

      const byteArrays = [];
      let totalLen = 0;
      for (const row of chunkRows) {
        const bin = atob(row.data_b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          arr[i] = bin.charCodeAt(i);
        }
        byteArrays.push(arr);
        totalLen += arr.byteLength;
      }

      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const arr of byteArrays) {
        combined.set(arr, offset);
        offset += arr.byteLength;
      }

      return new Response(combined.buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(totalLen),
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'inline',
          'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Accept-Ranges': 'bytes'
        }
      });
    }

    if (request.method === 'POST') {
      const ip = getClientIp(request);
      const ipHash = await sha256Hex(ip);
      const allowed = await checkRateLimit(env, `media_up_${ipHash}`, 45, 60000);
      if (!allowed) {
        return jsonResponse({ error: 'Upload rate limit reached. Please wait a minute.' }, 429);
      }

      const user = await getAuthenticatedUser(request, env);
      if (!user) {
        return jsonResponse({ error: 'Authentication required. Please log in to upload media.' }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON payload' }, 400);
      }

      const action = url.searchParams.get('action') || 'init';

      if (action === 'init') {
        const mimeType = (body.mime_type || '').trim().toLowerCase();
        const totalBytes = Number(body.total_bytes || 0);
        const totalChunks = Number(body.total_chunks || 1);
        const firstChunkB64 = (body.data_b64 || '').trim();

        if (!ALLOWED_MEDIA_MIMES.has(mimeType)) {
          return jsonResponse({ error: 'Unsupported media format. Allowed: JPG, PNG, WebP, GIF, MP4, WebM.' }, 400);
        }
        if (totalBytes <= 0 || totalBytes > MAX_MEDIA_BYTES) {
          return jsonResponse({ error: 'File exceeds the 15 MB maximum size limit.' }, 400);
        }
        if (totalChunks < 1 || totalChunks > 35) {
          return jsonResponse({ error: 'Invalid chunk count.' }, 400);
        }
        if (!firstChunkB64 || firstChunkB64.length > 1100000 || !/^[A-Za-z0-9+/=]+$/.test(firstChunkB64)) {
          return jsonResponse({ error: 'Invalid base64 media chunk.' }, 400);
        }

        if (!verifyMagicBytes(mimeType, firstChunkB64)) {
          return jsonResponse({ error: 'Security violation: File binary signature does not match declared media type.' }, 400);
        }

        const mediaId = generateUuid();
        await runTursoSql(
          env,
          'INSERT INTO media_uploads (id, user_id, mime_type, total_bytes, total_chunks) VALUES (?, ?, ?, ?, ?)',
          [mediaId, user.id, mimeType, totalBytes, totalChunks]
        );
        await runTursoSql(
          env,
          'INSERT INTO media_chunks (media_id, chunk_index, data_b64) VALUES (?, 0, ?)',
          [mediaId, firstChunkB64]
        );

        return jsonResponse({
          ok: true,
          media_id: mediaId,
          media_url: `/api/media?id=${mediaId}`,
          media_type: mimeType.startsWith('video/') ? 'video' : 'image'
        }, 201);
      }

      if (action === 'chunk') {
        const mediaId = (body.media_id || '').trim();
        const chunkIndex = Number(body.chunk_index || 0);
        const chunkB64 = (body.data_b64 || '').trim();

        if (!/^[0-9a-fA-F-]{20,40}$/.test(mediaId) || chunkIndex < 1 || chunkIndex > 35) {
          return jsonResponse({ error: 'Invalid media ID or chunk index.' }, 400);
        }
        if (!chunkB64 || chunkB64.length > 1100000 || !/^[A-Za-z0-9+/=]+$/.test(chunkB64)) {
          return jsonResponse({ error: 'Invalid chunk payload.' }, 400);
        }

        const { rows: ownerRows } = await runTursoSql(
          env,
          'SELECT user_id, total_chunks FROM media_uploads WHERE id = ? LIMIT 1',
          [mediaId]
        );
        if (ownerRows.length === 0 || ownerRows[0].user_id !== user.id) {
          return jsonResponse({ error: 'Unauthorized media upload session.' }, 403);
        }
        if (chunkIndex >= Number(ownerRows[0].total_chunks)) {
          return jsonResponse({ error: 'Chunk index out of bounds.' }, 400);
        }

        await runTursoSql(
          env,
          'INSERT OR REPLACE INTO media_chunks (media_id, chunk_index, data_b64) VALUES (?, ?, ?)',
          [mediaId, chunkIndex, chunkB64]
        );

        return jsonResponse({ ok: true, chunk_index: chunkIndex });
      }
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({
      error: err && err.message ? err.message : 'Media upload error.'
    }, 500);
  }
}
