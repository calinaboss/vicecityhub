document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dedicated-tutorial-form');
  const modBanner = document.getElementById('tutorial-moderation-banner');
  const submitBtn = document.getElementById('btn-submit-tutorial');
  const toastEl = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 4000);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const hp = (document.getElementById('tutorial_hp_url')?.value || '').trim();
      if (hp.length > 0) return;

      const title = (document.getElementById('tut-title-input')?.value || '').trim();
      const category = (document.getElementById('tut-category-select')?.value || 'easter_eggs').trim();
      const videoUrl = (document.getElementById('tut-url-input')?.value || '').trim();
      const thumbUrl = (document.getElementById('tut-thumb-input')?.value || '').trim();
      const description = (document.getElementById('tut-desc-input')?.value || '').trim();

      if (title.length < 3) {
        showToast('Title must be at least 3 characters long.');
        return;
      }

      if (description.length < 10) {
        showToast('Description must be at least 10 characters long.');
        return;
      }

      if (!videoUrl) {
        showToast('Please enter a YouTube, TikTok, or Instagram video link.');
        return;
      }

      const turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
      const cfTurnstileResponse = turnstileInput ? turnstileInput.value : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
      }

      try {
        const res = await fetch('/api/tutorials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            action: 'submit',
            title,
            category,
            video_url: videoUrl,
            thumbnail_url: thumbUrl,
            description,
            tutorial_hp_url: hp,
            cfTurnstileResponse
          })
        });

        if (res.status === 401) {
          showToast('Please log in or create an account to submit your video.');
          setTimeout(() => {
            window.location.href = 'login.html?tab=signup';
          }, 1500);
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          showToast(data.error || 'Failed to submit tutorial. Please retry.');
          if (window.turnstile) window.turnstile.reset();
          return;
        }

        if (data.pending) {
          if (modBanner) {
            modBanner.style.display = 'block';
            modBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          showToast('Tutorial submitted! Waiting for moderator approval.');
          form.reset();
          if (window.turnstile) window.turnstile.reset();
        } else {
          showToast('Tutorial published successfully!');
          setTimeout(() => {
            window.location.href = 'tutorials.html';
          }, 1200);
        }
      } catch (err) {
        showToast('Network error while submitting tutorial.');
        if (window.turnstile) window.turnstile.reset();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Submit Video for Approval';
        }
      }
    });
  }

  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeDrawerBtn && mobileDrawer) {
    closeDrawerBtn.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) {
        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
});
