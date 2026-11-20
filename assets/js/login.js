let currentAuthMode = 'login';
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const usernameGroup = document.getElementById('username-group');
    const authUsername = document.getElementById('auth-username');
    const authForm = document.getElementById('auth-form');
    const authFeedback = document.getElementById('auth-feedback');

    function setTab(tab) {
      authFeedback.style.display = 'none';
      if (tab === 'signup') {
        currentAuthMode = 'register';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = "Join GTA VI's community hub";
        usernameGroup.style.display = 'flex';
        authUsername.required = true;
      } else {
        currentAuthMode = 'login';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Log in to your ViceCityHub account';
        usernameGroup.style.display = 'none';
        authUsername.required = false;
      }
    }

    tabLogin.addEventListener('click', () => setTab('login'));
    tabSignup.addEventListener('click', () => setTab('signup'));

    const authPasswordInput = document.getElementById('auth-password');
    const toggleAuthPasswordBtn = document.getElementById('toggle-auth-password');
    if (toggleAuthPasswordBtn && authPasswordInput) {
      toggleAuthPasswordBtn.addEventListener('click', () => {
        const isPw = authPasswordInput.type === 'password';
        authPasswordInput.type = isPw ? 'text' : 'password';
        const icon = toggleAuthPasswordBtn.querySelector('i');
        if (icon) {
          icon.className = isPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'signup' || urlParams.get('tab') === 'register') {
      setTab('signup');
    }

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const username = authUsername.value.trim();
      const turnstileInput = authForm.querySelector('[name="cf-turnstile-response"]');
      const cfTurnstileResponse = turnstileInput ? turnstileInput.value : '';

      authFeedback.style.display = 'block';
      authFeedback.style.background = 'rgba(59, 130, 246, 0.14)';
      authFeedback.style.color = '#93c5fd';
      authFeedback.textContent = 'Verifying credentials...';

      try {
        const res = await fetch(`/api/auth?action=${currentAuthMode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username, cfTurnstileResponse })
        });
        const rawText = await res.text();
        let data = {};
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          data = { error: `Server returned status ${res.status}. Please wait a few seconds for Cloudflare Pages deployment to finish.` };
        }
        if (!res.ok) {
          authFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
          authFeedback.style.color = '#fca5a5';
          authFeedback.textContent = data.error || `Error (${res.status}): Authentication failed.`;
          if (window.turnstile) window.turnstile.reset();
          return;
        }
        authFeedback.style.background = 'rgba(16, 185, 129, 0.16)';
        authFeedback.style.color = '#6ee7b7';
        authFeedback.textContent = 'Authenticated! Redirecting to ViceCityHub...';
        if (data.user && data.user.username) {
          localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
        }
        setTimeout(() => {
          window.location.href = 'thank-you.html?welcome=1';
        }, 450);
      } catch (err) {
        authFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
        authFeedback.style.color = '#fca5a5';
        authFeedback.textContent = err && err.message ? `Connection error: ${err.message}` : 'Network error. Please try again.';
      }
    });
