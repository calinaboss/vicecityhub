(function() {
      const countdownEl = document.getElementById('redirect-countdown');
      let sec = 3;
      const timer = setInterval(() => {
        sec -= 1;
        if (countdownEl && sec >= 0) countdownEl.textContent = String(sec);
        if (sec <= 0) {
          clearInterval(timer);
          window.location.href = 'profile.html';
        }
      }, 900);
    })();
