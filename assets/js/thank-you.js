(function() {
  const countdownEl = document.getElementById('redirect-countdown');
  let targetUrl = 'profile.html';

  fetch('/api/auth?action=me', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(data => {
      if (data && data.authenticated && data.user) {
        localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
        if (data.user.username) {
          targetUrl = `profile.html?u=${encodeURIComponent(data.user.username)}`;
        }
      }
    })
    .catch(() => {});

  let sec = 3;
  const timer = setInterval(() => {
    sec -= 1;
    if (countdownEl && sec >= 0) countdownEl.textContent = String(sec);
    if (sec <= 0) {
      clearInterval(timer);
      window.location.href = targetUrl;
    }
  }, 900);
})();
