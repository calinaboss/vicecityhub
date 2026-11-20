document.addEventListener('DOMContentLoaded', () => {
      const welcomeLine = document.getElementById('admin-welcome-line');
      const btnRefresh = document.getElementById('btn-refresh-admin');
      const tabButtons = document.querySelectorAll('[data-admin-tab]');
      const officialList = document.getElementById('admin-official-list');
      const pendingDiscordsList = document.getElementById('admin-pending-discords-list');
      const approvedDiscordsList = document.getElementById('admin-approved-discords-list');
      const allPostsList = document.getElementById('admin-all-posts-list');
      const usersList = document.getElementById('admin-users-list');
      const ticketsList = document.getElementById('admin-tickets-list');
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
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(d.description)}</p>
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

      async function loadAdminData() {
        try {
          const res = await fetch('/api/admin', { credentials: 'same-origin' });
          if (res.status === 401 || res.status === 403) {
            window.location.href = 'index.html';
            return;
          }
          const data = await res.json();
          if (!res.ok || !data.ok) {
            window.location.href = 'index.html';
            return;
          }
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
        } catch (err) {
          showToast('Error loading admin panel.');
        }
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
        if (action && targetId) {
          runAdminAction(action, targetId, confirmMsg);
        }
      });

      if (userSearchInput) userSearchInput.addEventListener('input', renderUsersList);
      if (btnRefresh) btnRefresh.addEventListener('click', loadAdminData);

      loadAdminData();
    });
