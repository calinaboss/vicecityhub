document.querySelectorAll('[data-toggle-pw]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inputId = btn.getAttribute('data-toggle-pw');
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
      });
    });

    function showBoxFeedback(el, type, msg) {
      if (!el) return;
      el.style.display = 'block';
      if (type === 'error') {
        el.style.background = 'rgba(239, 68, 68, 0.16)';
        el.style.color = '#fca5a5';
      } else if (type === 'success') {
        el.style.background = 'rgba(16, 185, 129, 0.16)';
        el.style.color = '#6ee7b7';
      } else {
        el.style.background = 'rgba(59, 130, 246, 0.14)';
        el.style.color = '#93c5fd';
      }
      el.textContent = msg;
    }

    async function initSettingsPage() {
      try {
        const res = await fetch('/api/auth?action=me', { credentials: 'same-origin' });
        const data = await res.json();
        if (data && data.authenticated && data.user) {
          localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
          const unameInput = document.getElementById('new-username-input');
          const emailInput = document.getElementById('support-email-input');
          if (unameInput) unameInput.value = data.user.username || '';
          if (emailInput && data.user.email) emailInput.value = data.user.email;
        } else {
          const cached = localStorage.getItem('vicecityhub_user');
          if (!cached) {
            window.location.href = 'login.html';
          }
        }
      } catch (e) {}
    }

    initSettingsPage();

    const formUsername = document.getElementById('form-change-username');
    const usernameFeedback = document.getElementById('username-feedback');
    if (formUsername) {
      formUsername.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('new-username-input').value.trim();
        const currentPassword = document.getElementById('username-current-pw').value;
        showBoxFeedback(usernameFeedback, 'info', 'Updating username...');
        try {
          const res = await fetch('/api/profile?action=change_username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ new_username: newUsername, current_password: currentPassword })
          });
          const data = await res.json();
          if (!res.ok) {
            showBoxFeedback(usernameFeedback, 'error', data.error || 'Could not update username.');
            return;
          }
          const cached = JSON.parse(localStorage.getItem('vicecityhub_user') || '{}');
          cached.username = data.username;
          localStorage.setItem('vicecityhub_user', JSON.stringify(cached));
          document.getElementById('username-current-pw').value = '';
          showBoxFeedback(usernameFeedback, 'success', `Username updated to @${data.username}!`);
        } catch (err) {
          showBoxFeedback(usernameFeedback, 'error', 'Network error while updating username.');
        }
      });
    }

    const formPassword = document.getElementById('form-change-password');
    const passwordFeedback = document.getElementById('password-feedback');
    if (formPassword) {
      formPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('pw-current-input').value;
        const newPassword = document.getElementById('pw-new-input').value;
        const confirmPassword = document.getElementById('pw-confirm-input').value;

        if (newPassword !== confirmPassword) {
          showBoxFeedback(passwordFeedback, 'error', 'New password and confirmation do not match.');
          return;
        }

        showBoxFeedback(passwordFeedback, 'info', 'Updating password...');
        try {
          const res = await fetch('/api/profile?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
          });
          const data = await res.json();
          if (!res.ok) {
            showBoxFeedback(passwordFeedback, 'error', data.error || 'Could not update password.');
            return;
          }
          formPassword.reset();
          showBoxFeedback(passwordFeedback, 'success', 'Password updated with PBKDF2-SHA256!');
        } catch (err) {
          showBoxFeedback(passwordFeedback, 'error', 'Network error while updating password.');
        }
      });
    }

    const formSupport = document.getElementById('form-support-ticket');
    const supportFeedback = document.getElementById('support-feedback');
    const myTicketsList = document.getElementById('my-tickets-list');
    const btnRefreshMyTickets = document.getElementById('btn-refresh-my-tickets');
    let activeOpenTicketId = new URLSearchParams(window.location.search).get('ticket') || '';

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function loadMyTickets() {
      if (!myTicketsList) return;
      try {
        const res = await fetch('/api/profile?action=my_tickets', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        const tickets = (data && data.tickets) || [];

        if (tickets.length === 0) {
          myTicketsList.innerHTML = `<div style="padding: 14px 0; font-size: 0.82rem; color: var(--text-dim);">No active support tickets.</div>`;
          return;
        }

        if (!activeOpenTicketId && tickets.length === 1) {
          activeOpenTicketId = tickets[0].id;
        }

        myTicketsList.innerHTML = tickets.map(t => {
          const shortId = (t.id || '').slice(0, 8);
          const isOpen = activeOpenTicketId === t.id;
          const msgs = Array.isArray(t.messages) ? t.messages : [];
          const hasAdminReply = msgs.some(m => m.sender_role === 'admin');

          const messagesHtml = msgs.map(m => {
            const isAdmin = m.sender_role === 'admin';
            return `
              <div class="ticket-chat-bubble ${isAdmin ? 'from-admin' : 'from-user'}">
                <div class="ticket-chat-meta">
                  <strong>${escapeHtml(m.sender_name)}</strong>
                  ${isAdmin ? '<span class="badge-pill mod">ADMIN</span>' : '<span class="badge-pill verified">YOU</span>'}
                  <span>${escapeHtml((m.created_at || '').slice(11, 16) || 'Now')}</span>
                </div>
                <div class="ticket-chat-text">${escapeHtml(m.message)}</div>
              </div>
            `;
          }).join('');

          return `
            <div class="ticket-thread-card" data-ticket-box="${escapeHtml(t.id)}">
              <div class="ticket-thread-header" data-toggle-ticket="${escapeHtml(t.id)}">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge-pill ${hasAdminReply ? 'mod' : 'verified'}">${hasAdminReply ? 'ADMIN REPLIED' : 'OPEN'}</span>
                  <strong>Ticket #${escapeHtml(shortId)}: ${escapeHtml(t.subject)}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(t.category)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.76rem; color: var(--accent-cyan); font-weight: 700;">
                    <i class="fa-regular fa-comment-dots"></i> ${isOpen ? 'Hide Chat' : 'Open Chat'} (${msgs.length})
                  </span>
                </div>
              </div>

              <div class="ticket-chat-drawer" id="ticket-drawer-${escapeHtml(t.id)}" style="display: ${isOpen ? 'block' : 'none'};">
                <div class="ticket-chat-messages" id="ticket-msgs-${escapeHtml(t.id)}">
                  ${messagesHtml}
                </div>
                <div class="ticket-chat-input-row">
                  <input type="text" class="form-input ticket-reply-input" id="reply-input-${escapeHtml(t.id)}" placeholder="Write a message to support..." maxlength="1500">
                  <button type="button" class="btn-post-submit" style="height: 38px; padding: 0 14px; font-size: 0.8rem;" data-send-ticket="${escapeHtml(t.id)}">
                    <i class="fa-solid fa-paper-plane"></i> Send
                  </button>
                  <button type="button" class="btn-secondary" style="height: 38px; min-height: 38px; padding: 0 12px; font-size: 0.78rem; color: #fca5a5;" data-close-my-ticket="${escapeHtml(t.id)}" title="Resolve and delete temporary chat">
                    <i class="fa-solid fa-trash-can"></i> End Chat
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } catch (e) {}
    }

    if (myTicketsList) {
      myTicketsList.addEventListener('click', async (e) => {
        const toggleHeader = e.target.closest('[data-toggle-ticket]');
        if (toggleHeader) {
          const tid = toggleHeader.getAttribute('data-toggle-ticket');
          activeOpenTicketId = activeOpenTicketId === tid ? '' : tid;
          await loadMyTickets();
          return;
        }

        const sendBtn = e.target.closest('[data-send-ticket]');
        if (sendBtn) {
          const tid = sendBtn.getAttribute('data-send-ticket');
          const input = document.getElementById(`reply-input-${tid}`);
          const msg = (input?.value || '').trim();
          if (!msg) return;
          input.value = '';
          try {
            const res = await fetch('/api/profile?action=ticket_reply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ ticket_id: tid, message: msg })
            });
            if (res.ok) {
              activeOpenTicketId = tid;
              await loadMyTickets();
            }
          } catch (err) {}
          return;
        }

        const closeBtn = e.target.closest('[data-close-my-ticket]');
        if (closeBtn) {
          const tid = closeBtn.getAttribute('data-close-my-ticket');
          if (!window.confirm('End and permanently delete this temporary support chat?')) return;
          try {
            const res = await fetch('/api/profile?action=close_ticket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ ticket_id: tid })
            });
            if (res.ok) {
              if (activeOpenTicketId === tid) activeOpenTicketId = '';
              await loadMyTickets();
            }
          } catch (err) {}
        }
      });
    }

    if (btnRefreshMyTickets) {
      btnRefreshMyTickets.addEventListener('click', loadMyTickets);
    }

    loadMyTickets();
    setInterval(() => {
      if (activeOpenTicketId) loadMyTickets();
    }, 6000);

    if (formSupport) {
      formSupport.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('support-email-input').value.trim();
        const category = document.getElementById('support-category-select').value;
        const subject = document.getElementById('support-subject-input').value.trim();
        const message = document.getElementById('support-message-input').value.trim();

        showBoxFeedback(supportFeedback, 'info', 'Sending assistance request...');
        try {
          const res = await fetch('/api/profile?action=support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email, category, subject, message })
          });
          const data = await res.json();
          if (!res.ok) {
            showBoxFeedback(supportFeedback, 'error', data.error || 'Could not send request.');
            return;
          }
          document.getElementById('support-subject-input').value = '';
          document.getElementById('support-message-input').value = '';
          const tid = data.ticket_id || '';
          const shortId = tid.slice(0, 8);
          activeOpenTicketId = tid;
          supportFeedback.style.display = 'block';
          supportFeedback.style.background = 'rgba(16, 185, 129, 0.16)';
          supportFeedback.style.color = '#6ee7b7';
          supportFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Ticket <strong>#${escapeHtml(shortId)}</strong> sent! You can view its status and live chat in <a href="settings.html?ticket=${encodeURIComponent(tid)}#my-tickets" style="color: #ffffff; text-decoration: underline; font-weight: 800;">Settings &rarr; Submitted Tickets (Chat Open)</a>.`;
          await loadMyTickets();
          const myTicketsEl = document.getElementById('my-tickets');
          if (myTicketsEl) myTicketsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
          showBoxFeedback(supportFeedback, 'error', 'Network error while sending assistance request.');
        }
      });
    }

    async function performLogout() {
      try {
        await fetch('/api/auth?action=logout', { method: 'POST', credentials: 'same-origin' });
      } catch (e) {}
      localStorage.removeItem('vicecityhub_user');
      window.location.href = 'index.html';
    }

    const btnLogoutTop = document.getElementById('btn-logout-top');
    const btnLogoutBottom = document.getElementById('btn-logout-bottom');
    if (btnLogoutTop) btnLogoutTop.addEventListener('click', performLogout);
    if (btnLogoutBottom) btnLogoutBottom.addEventListener('click', performLogout);
