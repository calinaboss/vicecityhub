// ============================================================================
// VICECITYHUB.EU - FULL-PAGE CENTERED PROFILE & WHATSCR CIRCULAR AVATAR CROPPER
// Max 5MB input -> Auto-compressed 256x256 WebP/JPEG (~18KB) + 100% EXIF stripped
// Zero Unicode Emojis - 100% FontAwesome 6 Vector Icons - OWASP Hardened
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const bannerStrip = document.getElementById('profile-banner-strip');
  const btnOpenEditor = document.getElementById('btn-open-profile-editor');
  const avatarImg = document.getElementById('profile-avatar-img');
  const btnTriggerAvatar = document.getElementById('btn-trigger-avatar-upload');
  const avatarFileInput = document.getElementById('profile-avatar-file-input');
  const usernameDisplay = document.getElementById('profile-username-display');
  const roleBadge = document.getElementById('profile-role-badge');
  const followersCountEl = document.getElementById('profile-followers-count');
  const followingCountEl = document.getElementById('profile-following-count');
  const bioDisplay = document.getElementById('profile-bio-display');
  const socialsBar = document.getElementById('profile-socials-bar');
  const ownerActions = document.getElementById('profile-owner-actions');
  const visitorActions = document.getElementById('profile-visitor-actions');
  const btnFollowToggle = document.getElementById('btn-follow-toggle');
  const btnToggleEditPanel = document.getElementById('btn-toggle-edit-panel');
  const editPanel = document.getElementById('profile-edit-panel');
  const btnCancelEdit = document.getElementById('btn-cancel-profile-edit');
  const profileUpdateForm = document.getElementById('profile-update-form');
  const saveFeedback = document.getElementById('profile-save-feedback');
  const postsListEl = document.getElementById('profile-posts-list');

  // Form inputs
  const bannerColorPicker = document.getElementById('banner-color-picker');
  const bannerHexInput = document.getElementById('banner-hex-input');
  const bioInput = document.getElementById('profile-bio-input');
  const bioCharCount = document.getElementById('bio-char-count');
  const discordInput = document.getElementById('profile-discord-input');
  const socialXInput = document.getElementById('social-x-input');
  const socialYoutubeInput = document.getElementById('social-youtube-input');
  const socialTwitchInput = document.getElementById('social-twitch-input');
  const socialInstagramInput = document.getElementById('social-instagram-input');
  const socialTiktokInput = document.getElementById('social-tiktok-input');
  const socialGithubInput = document.getElementById('social-github-input');
  const socialWebsiteInput = document.getElementById('social-website-input');

  // Circular Crop Modal elements
  const cropModal = document.getElementById('avatar-crop-modal');
  const cropCanvas = document.getElementById('avatar-crop-canvas');
  const cropZoomSlider = document.getElementById('crop-zoom-slider');
  const cropSizeBadge = document.getElementById('crop-size-badge');
  const btnCloseCropModal = document.getElementById('btn-close-crop-modal');
  const btnCancelCrop = document.getElementById('btn-cancel-crop');
  const btnApplyCrop = document.getElementById('btn-apply-crop');

  let currentProfile = null;
  let isOwnProfile = false;
  let isFollowing = false;
  let pendingAvatarDataUrl = '';

  function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
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

  function applyBannerHex(hex) {
    const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ff2a85';
    if (bannerStrip) {
      bannerStrip.style.background = `linear-gradient(135deg, ${clean} 0%, #161b22 95%)`;
      bannerStrip.style.borderTop = `3px solid ${clean}`;
    }
  }

  function renderSocialsBar(profile) {
    if (!socialsBar) return;
    socialsBar.innerHTML = '';

    const links = profile.social_links || {};
    const discordHandle = (profile.discord_handle || '').trim();

    // 1. Click-to-Copy Discord Handle Badge
    if (discordHandle) {
      const discordBtn = document.createElement('button');
      discordBtn.type = 'button';
      discordBtn.className = 'profile-social-pill discord-copy-pill';
      discordBtn.title = 'Click to copy Discord username';
      discordBtn.innerHTML = `<i class="fa-brands fa-discord"></i> <span>${escapeHtml(discordHandle)}</span> <i class="fa-regular fa-copy" style="font-size: 0.72rem; opacity: 0.75;"></i>`;
      discordBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(discordHandle).then(() => {
            showToast(`Discord username copied: ${discordHandle}`);
          }).catch(() => {
            showToast(`Discord: ${discordHandle}`);
          });
        } else {
          showToast(`Discord: ${discordHandle}`);
        }
      });
      socialsBar.appendChild(discordBtn);
    }

    // 2. Social Links Icons (OWASP verified HTTPS links)
    const iconMap = [
      { key: 'x', icon: 'fa-brands fa-x-twitter', label: 'X / Twitter' },
      { key: 'youtube', icon: 'fa-brands fa-youtube', label: 'YouTube' },
      { key: 'twitch', icon: 'fa-brands fa-twitch', label: 'Twitch' },
      { key: 'instagram', icon: 'fa-brands fa-instagram', label: 'Instagram' },
      { key: 'tiktok', icon: 'fa-brands fa-tiktok', label: 'TikTok' },
      { key: 'github', icon: 'fa-brands fa-github', label: 'GitHub' },
      { key: 'website', icon: 'fa-solid fa-globe', label: 'Website' }
    ];

    iconMap.forEach(item => {
      const url = links[item.key];
      if (!url || typeof url !== 'string' || !url.startsWith('https://')) return;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer ugc';
      a.className = 'profile-social-pill';
      a.title = item.label;
      a.setAttribute('aria-label', item.label);
      a.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
      socialsBar.appendChild(a);
    });
  }

  function renderUserPosts(posts) {
    if (!postsListEl) return;
    if (!Array.isArray(posts) || posts.length === 0) {
      postsListEl.innerHTML = `
        <div class="empty-feed-state" style="padding: 28px 12px;">
          <i class="fa-regular fa-message" style="font-size: 1.6rem; color: var(--text-dim); margin-bottom: 8px; display: block;"></i>
          <p style="font-size: 0.85rem; color: var(--text-muted);">No community posts published yet.</p>
        </div>
      `;
      return;
    }

    postsListEl.innerHTML = posts.map(p => {
      let mediaHtml = '';
      const mUrl = p.media_url || '';
      if (mUrl) {
        const isVideo = p.media_type === 'video' || /\.(mp4|webm)(\?.*)?$/i.test(mUrl);
        if (isVideo) {
          mediaHtml = `
            <div class="post-media-container post-video-wrap">
              <video src="${escapeHtml(mUrl)}" class="post-video-player" controls playsinline preload="metadata"></video>
            </div>
          `;
        } else {
          mediaHtml = `
            <div class="post-media-container" data-full-img="${escapeHtml(mUrl)}" title="Click for Fullscreen Preview">
              <img src="${escapeHtml(mUrl)}" alt="${escapeHtml(p.title)}" loading="lazy">
            </div>
          `;
        }
      }
      return `
      <article class="post-card">
        <div class="post-header">
          <span class="post-category-tag">${escapeHtml(p.category_label || p.category || 'Discussions')}</span>
          <span class="post-timestamp">${escapeHtml((p.created_at || '').slice(0, 10) || 'Recent')}</span>
        </div>
        <h3 class="post-title">${escapeHtml(p.title)}</h3>
        <p class="post-text">${escapeHtml(p.content)}</p>
        ${mediaHtml}
        <div class="post-footer">
          <div class="post-actions-group">
            <span class="action-btn" style="cursor: default;"><i class="fa-solid fa-heart" style="color: var(--accent-pink);"></i> ${Number(p.likes_count || 0)}</span>
            <span class="action-btn" style="cursor: default;"><i class="fa-regular fa-comment"></i> ${Number(p.comments_count || 0)}</span>
          </div>
          <a href="index.html" style="font-size: 0.78rem; color: var(--accent-pink); font-weight: 600;">View in Feed <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </article>
    `;
    }).join('');
  }

  function populateProfileUI(data) {
    currentProfile = data.profile;
    isOwnProfile = Boolean(data.isOwnProfile);
    isFollowing = Boolean(data.isFollowing);

    document.title = `@${currentProfile.username} \u2022 ViceCityHub.eu`;

    if (usernameDisplay) usernameDisplay.textContent = currentProfile.username;
    if (roleBadge) {
      const isAdmin = currentProfile.role === 'admin';
      roleBadge.textContent = isAdmin ? 'ADMIN' : 'MEMBER';
      roleBadge.className = isAdmin ? 'badge-pill mod' : 'badge-pill verified';
    }

    if (avatarImg) {
      avatarImg.src = currentProfile.avatar_url || 'assets/brand/favicon-192x192.png';
    }

    applyBannerHex(currentProfile.banner_color || '#ff2a85');

    if (followersCountEl) followersCountEl.textContent = Number(currentProfile.followers_count || 0);
    if (followingCountEl) followingCountEl.textContent = Number(currentProfile.following_count || 0);

    if (bioDisplay) {
      bioDisplay.textContent = currentProfile.bio
        ? currentProfile.bio
        : 'ViceCityHub community member exploring Leonida & Vice City.';
    }

    renderSocialsBar(currentProfile);
    renderUserPosts(data.posts || []);

    if (isOwnProfile) {
      if (ownerActions) ownerActions.style.display = 'flex';
      if (visitorActions) visitorActions.style.display = 'none';
      if (btnTriggerAvatar) btnTriggerAvatar.style.display = 'flex';
      if (btnOpenEditor) btnOpenEditor.style.display = 'inline-flex';

      // Sync localStorage user
      const cached = JSON.parse(localStorage.getItem('vicecityhub_user') || '{}');
      cached.id = currentProfile.id;
      cached.username = currentProfile.username;
      cached.role = currentProfile.role;
      cached.avatar_url = currentProfile.avatar_url;
      cached.banner_color = currentProfile.banner_color;
      localStorage.setItem('vicecityhub_user', JSON.stringify(cached));

      // Populate edit form
      const hex = currentProfile.banner_color || '#ff2a85';
      if (bannerColorPicker) bannerColorPicker.value = hex;
      if (bannerHexInput) bannerHexInput.value = hex;
      if (bioInput) {
        bioInput.value = currentProfile.bio || '';
        if (bioCharCount) bioCharCount.textContent = `${bioInput.value.length} / 300`;
      }
      if (discordInput) discordInput.value = currentProfile.discord_handle || '';

      const links = currentProfile.social_links || {};
      if (socialXInput) socialXInput.value = links.x || '';
      if (socialYoutubeInput) socialYoutubeInput.value = links.youtube || '';
      if (socialTwitchInput) socialTwitchInput.value = links.twitch || '';
      if (socialInstagramInput) socialInstagramInput.value = links.instagram || '';
      if (socialTiktokInput) socialTiktokInput.value = links.tiktok || '';
      if (socialGithubInput) socialGithubInput.value = links.github || '';
      if (socialWebsiteInput) socialWebsiteInput.value = links.website || '';
    } else {
      if (ownerActions) ownerActions.style.display = 'none';
      if (visitorActions) visitorActions.style.display = 'flex';
      if (btnTriggerAvatar) btnTriggerAvatar.style.display = 'none';
      if (btnOpenEditor) btnOpenEditor.style.display = 'none';
      updateFollowButtonState();
    }
  }

  function updateFollowButtonState() {
    if (!btnFollowToggle) return;
    if (isFollowing) {
      btnFollowToggle.className = 'btn-secondary';
      btnFollowToggle.innerHTML = '<i class="fa-solid fa-user-check"></i> <span>Following</span>';
    } else {
      btnFollowToggle.className = 'btn-post-submit';
      btnFollowToggle.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>Follow</span>';
    }
  }

  async function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const u = (params.get('u') || '').trim();
    const endpoint = u ? `/api/profile?u=${encodeURIComponent(u)}` : '/api/profile';

    try {
      const res = await fetch(endpoint, { credentials: 'same-origin' });
      if (res.status === 404 && !u) {
        window.location.href = 'login.html';
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.profile) {
        if (!u) {
          window.location.href = 'login.html';
          return;
        }
        if (usernameDisplay) usernameDisplay.textContent = 'User Not Found';
        if (bioDisplay) bioDisplay.textContent = data.error || 'This profile does not exist.';
        return;
      }
      populateProfileUI(data);
    } catch (err) {
      if (usernameDisplay) usernameDisplay.textContent = 'Offline / Error';
    }
  }

  loadProfile();

  // Follow / Unfollow Toggle
  if (btnFollowToggle) {
    btnFollowToggle.addEventListener('click', async () => {
      if (!currentProfile) return;
      try {
        const res = await fetch('/api/profile?action=follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: currentProfile.username })
        });
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        const data = await res.json();
        if (res.ok && data.ok) {
          isFollowing = Boolean(data.following);
          if (followersCountEl) followersCountEl.textContent = Number(data.followers_count || 0);
          updateFollowButtonState();
          showToast(isFollowing ? `Now following @${currentProfile.username}` : `Unfollowed @${currentProfile.username}`);
        }
      } catch (e) {
        showToast('Could not update follow status.');
      }
    });
  }

  // Toggle Customize Profile Panel
  function toggleEditPanel(forceOpen) {
    if (!editPanel) return;
    const isHidden = editPanel.style.display === 'none';
    const shouldShow = typeof forceOpen === 'boolean' ? forceOpen : isHidden;
    editPanel.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) {
      editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  if (btnToggleEditPanel) btnToggleEditPanel.addEventListener('click', () => toggleEditPanel());
  if (btnOpenEditor) btnOpenEditor.addEventListener('click', () => toggleEditPanel(true));
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => toggleEditPanel(false));

  // HEX Banner Color Picker Live Sync
  if (bannerColorPicker && bannerHexInput) {
    bannerColorPicker.addEventListener('input', () => {
      bannerHexInput.value = bannerColorPicker.value.toLowerCase();
      applyBannerHex(bannerColorPicker.value);
    });
    bannerHexInput.addEventListener('input', () => {
      let val = bannerHexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        bannerColorPicker.value = val.toLowerCase();
        applyBannerHex(val);
      }
    });
  }

  document.querySelectorAll('.hex-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-hex');
      if (hex && bannerColorPicker && bannerHexInput) {
        bannerColorPicker.value = hex;
        bannerHexInput.value = hex;
        applyBannerHex(hex);
      }
    });
  });

  if (bioInput && bioCharCount) {
    bioInput.addEventListener('input', () => {
      bioCharCount.textContent = `${bioInput.value.length} / 300`;
    });
  }

  // ==========================================================================
  // WHATSCR-STYLE CIRCULAR PFP CROPPER + AUTO COMPRESSION & EXIF STRIPPING
  // ==========================================================================
  let cropImageObj = null;
  let cropScale = 1;
  let cropBaseScale = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let isDraggingCrop = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function drawCropCanvas() {
    if (!cropCanvas || !cropImageObj) return;
    const ctx = cropCanvas.getContext('2d');
    const W = cropCanvas.width;
    const H = cropCanvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const totalScale = cropBaseScale * cropScale;
    const drawW = cropImageObj.width * totalScale;
    const drawH = cropImageObj.height * totalScale;

    // Clamp offsets so the circle is always covered
    const maxOffsetX = Math.max(0, (drawW - W) / 2);
    const maxOffsetY = Math.max(0, (drawH - H) / 2);
    cropOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, cropOffsetX));
    cropOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, cropOffsetY));

    const x = (W - drawW) / 2 + cropOffsetX;
    const y = (H - drawH) / 2 + cropOffsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropImageObj, x, y, drawW, drawH);
  }

  function exportOptimizedAvatarDataUrl() {
    if (!cropCanvas || !cropImageObj) return '';
    // Re-encode onto an exact 256x256 output canvas to strip 100% EXIF/GPS metadata
    // and compress 5MB photos down to ~15-22 KB WebP/JPEG
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 256;
    outCanvas.height = 256;
    const outCtx = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, 256, 256);

    let dataUrl = outCanvas.toDataURL('image/webp', 0.78);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = outCanvas.toDataURL('image/jpeg', 0.78);
    }
    if (cropSizeBadge) {
      const approxKb = Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));
      cropSizeBadge.textContent = `Auto-optimized: ~${approxKb} KB (100% EXIF metadata removed)`;
    }
    return dataUrl;
  }

  if (btnTriggerAvatar && avatarFileInput) {
    btnTriggerAvatar.addEventListener('click', () => avatarFileInput.click());

    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // Enforce 5 MB max input file size
      const MAX_BYTES = 5 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        showToast('Image exceeds 5 MB limit. Please choose a file under 5 MB.');
        avatarFileInput.value = '';
        return;
      }

      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        showToast('Only JPG, PNG, or WebP images are allowed.');
        avatarFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          cropImageObj = img;
          const W = cropCanvas ? cropCanvas.width : 256;
          const H = cropCanvas ? cropCanvas.height : 256;
          cropBaseScale = Math.max(W / img.width, H / img.height);
          cropScale = 1;
          cropOffsetX = 0;
          cropOffsetY = 0;
          if (cropZoomSlider) cropZoomSlider.value = '1';
          drawCropCanvas();
          exportOptimizedAvatarDataUrl();
          if (cropModal) {
            cropModal.classList.add('open');
            cropModal.setAttribute('aria-hidden', 'false');
          }
        };
        img.onerror = () => {
          showToast('Could not read image file.');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (cropZoomSlider) {
    cropZoomSlider.addEventListener('input', () => {
      cropScale = parseFloat(cropZoomSlider.value) || 1;
      drawCropCanvas();
      exportOptimizedAvatarDataUrl();
    });
  }

  if (cropCanvas) {
    const startDrag = (clientX, clientY) => {
      if (!cropImageObj) return;
      isDraggingCrop = true;
      dragStartX = clientX - cropOffsetX;
      dragStartY = clientY - cropOffsetY;
    };
    const moveDrag = (clientX, clientY) => {
      if (!isDraggingCrop || !cropImageObj) return;
      cropOffsetX = clientX - dragStartX;
      cropOffsetY = clientY - dragStartY;
      drawCropCanvas();
    };
    const endDrag = () => {
      if (isDraggingCrop) {
        isDraggingCrop = false;
        exportOptimizedAvatarDataUrl();
      }
    };

    cropCanvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    // Mouse wheel zoom inside fullscreen Discord-style cropper
    cropCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      cropScale = Math.max(1, Math.min(3.5, cropScale + delta));
      if (cropZoomSlider) cropZoomSlider.value = String(cropScale.toFixed(2));
      drawCropCanvas();
      exportOptimizedAvatarDataUrl();
    }, { passive: false });

    let pinchStartDist = 0;
    let pinchStartScale = 1;

    cropCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        isDraggingCrop = false;
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartScale = cropScale;
      }
    }, { passive: true });
    cropCanvas.addEventListener('touchmove', (e) => {
      if (isDraggingCrop && e.touches.length === 1) {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        cropScale = Math.max(1, Math.min(3.5, pinchStartScale * (dist / pinchStartDist)));
        if (cropZoomSlider) cropZoomSlider.value = String(cropScale.toFixed(2));
        drawCropCanvas();
      }
    }, { passive: false });
    cropCanvas.addEventListener('touchend', endDrag);
  }

  function closeCropModal() {
    if (cropModal) {
      cropModal.classList.remove('open');
      cropModal.setAttribute('aria-hidden', 'true');
    }
    if (avatarFileInput) avatarFileInput.value = '';
  }

  if (btnCloseCropModal) btnCloseCropModal.addEventListener('click', closeCropModal);
  if (btnCancelCrop) btnCancelCrop.addEventListener('click', closeCropModal);

  if (btnApplyCrop) {
    btnApplyCrop.addEventListener('click', async () => {
      const optimizedDataUrl = exportOptimizedAvatarDataUrl();
      if (!optimizedDataUrl) return;
      pendingAvatarDataUrl = optimizedDataUrl;
      if (avatarImg) avatarImg.src = optimizedDataUrl;
      closeCropModal();

      // Immediately save new avatar to backend
      await saveProfileToServer(true);
    });
  }

  async function saveProfileToServer(silentAvatarOnly = false) {
    if (!currentProfile) return;
    const payload = {
      avatar_url: pendingAvatarDataUrl || currentProfile.avatar_url || '',
      banner_color: (bannerHexInput && bannerHexInput.value.trim()) || currentProfile.banner_color || '#ff2a85',
      bio: bioInput ? bioInput.value.trim() : (currentProfile.bio || ''),
      discord_handle: discordInput ? discordInput.value.trim() : (currentProfile.discord_handle || ''),
      social_links: {
        x: socialXInput ? socialXInput.value.trim() : '',
        youtube: socialYoutubeInput ? socialYoutubeInput.value.trim() : '',
        twitch: socialTwitchInput ? socialTwitchInput.value.trim() : '',
        instagram: socialInstagramInput ? socialInstagramInput.value.trim() : '',
        tiktok: socialTiktokInput ? socialTiktokInput.value.trim() : '',
        github: socialGithubInput ? socialGithubInput.value.trim() : '',
        website: socialWebsiteInput ? socialWebsiteInput.value.trim() : ''
      }
    };

    if (!silentAvatarOnly && saveFeedback) {
      saveFeedback.style.display = 'block';
      saveFeedback.style.background = 'rgba(59, 130, 246, 0.14)';
      saveFeedback.style.color = '#93c5fd';
      saveFeedback.textContent = 'Saving profile...';
    }

    try {
      const res = await fetch('/api/profile?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silentAvatarOnly && saveFeedback) {
          saveFeedback.style.background = 'rgba(239, 68, 68, 0.16)';
          saveFeedback.style.color = '#fca5a5';
          saveFeedback.textContent = data.error || 'Could not save profile changes.';
        } else {
          showToast(data.error || 'Could not save profile picture.');
        }
        return;
      }

      currentProfile = { ...currentProfile, ...data.profile };
      pendingAvatarDataUrl = '';
      if (avatarImg) avatarImg.src = currentProfile.avatar_url;
      applyBannerHex(currentProfile.banner_color);
      if (bioDisplay) {
        bioDisplay.textContent = currentProfile.bio || 'ViceCityHub community member exploring Leonida & Vice City.';
      }
      renderSocialsBar(currentProfile);

      // Update localStorage user cache so navbar avatar updates immediately
      const cached = JSON.parse(localStorage.getItem('vicecityhub_user') || '{}');
      cached.avatar_url = currentProfile.avatar_url;
      cached.banner_color = currentProfile.banner_color;
      localStorage.setItem('vicecityhub_user', JSON.stringify(cached));

      if (!silentAvatarOnly && saveFeedback) {
        saveFeedback.style.background = 'rgba(16, 185, 129, 0.16)';
        saveFeedback.style.color = '#6ee7b7';
        saveFeedback.textContent = 'Profile updated!';
        setTimeout(() => {
          saveFeedback.style.display = 'none';
          toggleEditPanel(false);
        }, 900);
      }
      showToast(silentAvatarOnly ? 'Profile picture optimized & saved!' : 'Profile changes saved!');
    } catch (err) {
      showToast('Network error while saving profile.');
    }
  }

  if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfileToServer(false);
    });
  }
});
