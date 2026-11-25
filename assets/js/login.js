let currentAuthMode = 'login';
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const usernameGroup = document.getElementById('username-group');
const authUsername = document.getElementById('auth-username');
const authForm = document.getElementById('auth-form');
const authFeedback = document.getElementById('auth-feedback');
const standardContainer = document.getElementById('standard-auth-container');
const oauthCard = document.getElementById('oauth-setup-card');
const oauthForm = document.getElementById('oauth-complete-form');
const oauthUsernameInput = document.getElementById('oauth-username');
const oauthEmailDisplay = document.getElementById('oauth-email-display');
const oauthFeedback = document.getElementById('oauth-feedback');
const oauthSubmitBtn = document.getElementById('oauth-submit-btn');

function setTab(tab) {
  if (authFeedback) authFeedback.style.display = 'none';
  if (tab === 'signup') {
    currentAuthMode = 'register';
    if (tabSignup) tabSignup.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (authTitle) authTitle.textContent = 'Create an Account';
    if (authSubtitle) authSubtitle.textContent = "Join GTA VI's community hub";
    if (usernameGroup) usernameGroup.style.display = 'flex';
    if (authUsername) authUsername.required = true;
  } else {
    currentAuthMode = 'login';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (authTitle) authTitle.textContent = 'Welcome Back';
    if (authSubtitle) authSubtitle.textContent = 'Log in to your ViceCityHub account';
    if (usernameGroup) usernameGroup.style.display = 'none';
    if (authUsername) authUsername.required = false;
  }
}

if (tabLogin) tabLogin.addEventListener('click', () => setTab('login'));
if (tabSignup) tabSignup.addEventListener('click', () => setTab('signup'));

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
const oauthSetup = urlParams.get('oauth_setup');
const oauthEmail = urlParams.get('email');
const oauthSuggested = urlParams.get('suggested');
const oauthError = urlParams.get('error');

if (oauthSetup === 'google' && standardContainer && oauthCard) {
  standardContainer.style.display = 'none';
  oauthCard.style.display = 'block';
  if (authTitle) authTitle.style.display = 'none';
  if (authSubtitle) authSubtitle.style.display = 'none';
  if (oauthEmailDisplay && oauthEmail) {
    oauthEmailDisplay.textContent = oauthEmail;
  }
  if (oauthUsernameInput && oauthSuggested) {
    oauthUsernameInput.value = oauthSuggested;
    setTimeout(() => oauthUsernameInput.focus(), 100);
  }
} else {
  if (urlParams.get('tab') === 'signup' || urlParams.get('tab') === 'register') {
    setTab('signup');
  }

  if (oauthError && authFeedback) {
    authFeedback.style.display = 'block';
    authFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
    authFeedback.style.color = '#fca5a5';
    if (oauthError === 'google_cancelled') {
      authFeedback.textContent = 'Google Sign-In was cancelled.';
    } else if (oauthError === 'account_suspended') {
      authFeedback.textContent = 'This account has been suspended by moderators.';
    } else if (oauthError === 'invalid_state') {
      authFeedback.textContent = 'Request expired or invalid. Please try logging in again.';
    } else if (oauthError === 'oauth_config_missing') {
      authFeedback.textContent = 'Google Sign-In configuration missing. Please verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET variables.';
    } else {
      authFeedback.textContent = 'Google authentication failed. Please try again or use email and password.';
    }
  }
}

if (oauthForm) {
  oauthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chosenUsername = oauthUsernameInput.value.trim();
    if (!chosenUsername) return;

    if (oauthFeedback) {
      oauthFeedback.style.display = 'block';
      oauthFeedback.style.background = 'rgba(59, 130, 246, 0.14)';
      oauthFeedback.style.color = '#93c5fd';
      oauthFeedback.textContent = 'Setting up profile...';
    }
    if (oauthSubmitBtn) {
      oauthSubmitBtn.disabled = true;
    }

    try {
      const res = await fetch('/api/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: chosenUsername })
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        data = { error: `Server error (${res.status}). Please try again shortly.` };
      }

      if (!res.ok) {
        if (oauthFeedback) {
          oauthFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
          oauthFeedback.style.color = '#fca5a5';
          oauthFeedback.textContent = data.error || 'Error during registration.';
        }
        if (oauthSubmitBtn) oauthSubmitBtn.disabled = false;
        return;
      }

      if (oauthFeedback) {
        oauthFeedback.style.background = 'rgba(16, 185, 129, 0.16)';
        oauthFeedback.style.color = '#6ee7b7';
        oauthFeedback.textContent = 'Account created! Redirecting to your profile...';
      }

      if (data.user && data.user.username) {
        localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        window.location.href = `profile.html?u=${encodeURIComponent(data.user ? data.user.username : chosenUsername)}`;
      }, 500);
    } catch (err) {
      if (oauthFeedback) {
        oauthFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
        oauthFeedback.style.color = '#fca5a5';
        oauthFeedback.textContent = err && err.message ? `Connection error: ${err.message}` : 'Network error. Please try again.';
      }
      if (oauthSubmitBtn) oauthSubmitBtn.disabled = false;
    }
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = authUsername ? authUsername.value.trim() : '';
    const turnstileInput = authForm.querySelector('[name="cf-turnstile-response"]');
    const cfTurnstileResponse = turnstileInput ? turnstileInput.value : '';

    if (authFeedback) {
      authFeedback.style.display = 'block';
      authFeedback.style.background = 'rgba(59, 130, 246, 0.14)';
      authFeedback.style.color = '#93c5fd';
      authFeedback.textContent = 'Verifying credentials...';
    }

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
        if (authFeedback) {
          authFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
          authFeedback.style.color = '#fca5a5';
          authFeedback.textContent = data.error || `Error (${res.status}): Authentication failed.`;
        }
        if (window.turnstile) window.turnstile.reset();
        return;
      }
      if (authFeedback) {
        authFeedback.style.background = 'rgba(16, 185, 129, 0.16)';
        authFeedback.style.color = '#6ee7b7';
        authFeedback.textContent = 'Authenticated! Redirecting to ViceCityHub...';
      }
      if (data.user && data.user.username) {
        localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
      }
      setTimeout(() => {
        window.location.href = 'thank-you.html?welcome=1';
      }, 450);
    } catch (err) {
      if (authFeedback) {
        authFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
        authFeedback.style.color = '#fca5a5';
        authFeedback.textContent = err && err.message ? `Connection error: ${err.message}` : 'Network error. Please try again.';
      }
    }
  });
}
