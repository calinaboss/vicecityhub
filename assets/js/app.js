document.addEventListener('DOMContentLoaded', () => {

  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer');

  const postModal = document.getElementById('create-post-modal');
  const discordModal = document.getElementById('submit-discord-modal');
  const openPostModalBtns = document.querySelectorAll('.trigger-new-post');
  const openDiscordModalBtns = document.querySelectorAll('.trigger-add-discord');
  const closeModalBtns = document.querySelectorAll('.trigger-close-modal');

  const postForm = document.getElementById('new-post-form');
  const discordForm = document.getElementById('new-discord-form');

  const feedContainer = document.getElementById('community-feed');
  const filterChips = document.querySelectorAll('.filter-chip');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  const discordGrid = document.getElementById('discords-page-grid');
  const discordSearchInput = document.getElementById('discord-search-input');
  const discordCountryFilter = document.getElementById('discord-country-filter');
  const discordTypeFilter = document.getElementById('discord-type-filter');

  const cheatsGrid = document.getElementById('cheats-list-grid');
  const cheatSearchInput = document.getElementById('cheat-search-input');
  const platformPills = document.querySelectorAll('[data-platform]');

  const leafletMapContainer = document.getElementById('leonida-leaflet-map');
  const poiPills = document.querySelectorAll('[data-poi]');

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message) {
    if (!toast) return;
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function openModal(m) {
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(m) {
    if (!m) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
  }

  openPostModalBtns.forEach(btn => btn.addEventListener('click', () => openModal(postModal)));
  openDiscordModalBtns.forEach(btn => btn.addEventListener('click', () => openModal(discordModal)));

  if (discordModal && (window.location.search.includes('action=submit') || window.location.hash === '#submit')) {
    openModal(discordModal);
  }

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(postModal);
      closeModal(discordModal);
    });
  });

  [postModal, discordModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(postModal);
      closeModal(discordModal);
      if (mobileDrawer && mobileDrawer.classList.contains('open')) closeDrawer();
    }
  });

  function openDrawer() {
    if (mobileDrawer) {
      mobileDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }
  function closeDrawer() {
    if (mobileDrawer) {
      mobileDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) closeDrawer();
    });
  }

  let posts = [];

  let currentCategory = 'all';

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('vicecityhub_user') || 'null');
    } catch (e) {
      return null;
    }
  }

  function getLocalLikedPosts() {
    try {
      return new Set(JSON.parse(localStorage.getItem('vch_liked_posts') || '[]'));
    } catch (e) {
      return new Set();
    }
  }

  function saveLocalLikedPost(postId, isLiked) {
    try {
      const set = getLocalLikedPosts();
      if (isLiked) set.add(postId);
      else set.delete(postId);
      localStorage.setItem('vch_liked_posts', JSON.stringify([...set]));
    } catch (e) {}
  }

  function getLocalBookmarkedPosts() {
    try {
      return new Set(JSON.parse(localStorage.getItem('vch_bookmarked_posts') || '[]'));
    } catch (e) {
      return new Set();
    }
  }

  function saveLocalBookmarkedPost(postId, isBookmarked) {
    try {
      const set = getLocalBookmarkedPosts();
      if (isBookmarked) set.add(postId);
      else set.delete(postId);
      localStorage.setItem('vch_bookmarked_posts', JSON.stringify([...set]));
    } catch (e) {}
  }

  function renderPostCard(post) {
    const isPinnedClass = post.pinned ? 'pinned' : '';
    const pinBadge = post.pinned ? `<span class="badge-pill mod" style="margin-right: 6px;"><i class="fa-solid fa-thumbtack"></i> Pinned</span>` : '';
    const badgeHtml = post.badge ? `<span class="badge-pill ${post.badgeClass}">${post.badge}</span>` : '';

    const currentUser = getCurrentUser();
    const isOwnPost = Boolean(
      currentUser && (
        (currentUser.id && post.user_id && currentUser.id === post.user_id) ||
        (currentUser.username && post.username && currentUser.username.toLowerCase() === post.username.toLowerCase()) ||
        (currentUser.username && post.author && currentUser.username.toLowerCase() === post.author.toLowerCase())
      )
    );

    const postComments = Array.isArray(post.comments) ? post.comments : [];
    const maxInitial = 2;
    const initialComments = postComments.slice(0, maxInitial);
    const extraComments = postComments.slice(maxInitial);

    const renderComment = (c) => `
      <div class="single-comment">
        <div class="single-comment-meta">
          <span class="author">${escapeHtml(c.author)}</span> &bull; <span>${escapeHtml(formatTimeAgo(c.time))}</span>
        </div>
        <p class="single-comment-text">${escapeHtml(c.text)}</p>
      </div>
    `;

    const initialCommentsHtml = initialComments.map(renderComment).join('');
    const extraCommentsHtml = extraComments.length > 0 ? `
      <div class="extra-comments-collapsed" id="extra-comments-${post.id}" style="display: none;">
        ${extraComments.map(renderComment).join('')}
      </div>
      <button type="button" class="btn-show-more-comments" data-id="${post.id}">
        <i class="fa-solid fa-chevron-down"></i> View ${extraComments.length} more comments
      </button>
    ` : '';

    let mediaHtml = '';
    const mUrl = post.mediaUrl || post.media_url || '';
    if (mUrl) {
      const isVideo = post.mediaType === 'video' || post.media_type === 'video' || /\.(mp4|webm)(\?.*)?$/i.test(mUrl);
      if (isVideo) {
        mediaHtml = `
          <div class="post-media-container post-video-wrap">
            <video src="${escapeHtml(mUrl)}" class="post-video-player" controls playsinline preload="metadata"></video>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="post-media-container" data-full-img="${escapeHtml(mUrl)}" title="Click to view full screen (drag to pan, scroll to zoom)">
            <img src="${escapeHtml(mUrl)}" alt="${escapeHtml(post.title)}" loading="lazy">
          </div>
        `;
      }
    }

    return `
      <article class="post-card ${isPinnedClass}" data-id="${post.id}">
        <div class="post-header">
          <a href="profile.html?u=${encodeURIComponent(post.username || post.author)}" class="post-author-box" title="View @${escapeHtml(post.username)} profile">
            <img class="post-avatar" src="${escapeHtml(post.avatar || 'assets/brand/favicon-192x192.png')}" alt="${escapeHtml(post.author)}">
            <div class="post-author-info">
              <div class="author-name-row">
                ${pinBadge}
                <span class="author-username">${escapeHtml(post.author)}</span>
                ${badgeHtml}
              </div>
              <span class="post-timestamp">${escapeHtml(formatTimeAgo(post.time))} &bull; @${escapeHtml(post.username)}</span>
            </div>
          </a>
          <span class="post-category-tag">${escapeHtml(post.categoryLabel)}</span>
        </div>

        <h2 class="post-title"><a href="/d/${encodeURIComponent(post.id)}" class="post-title-link">${escapeHtml(post.title)}</a></h2>
        <p class="post-text">${escapeHtml(post.text)}</p>
        ${mediaHtml}

        <div class="post-footer">
          <div class="post-actions-group">
            <button class="action-btn btn-like ${post.isLiked ? 'active-like' : ''}" data-id="${post.id}">
              <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
              <span>${post.likes}</span>
            </button>
            <button class="action-btn btn-comments-toggle" data-id="${post.id}">
              <i class="fa-regular fa-comment"></i>
              <span>${post.comments.length}</span>
            </button>
            <a href="/d/${encodeURIComponent(post.id)}" class="action-btn" title="Open full discussion thread">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Thread
            </a>
            <button class="action-btn btn-share" data-id="${post.id}" data-title="${escapeHtml(post.title)}">
              <i class="fa-solid fa-share-nodes"></i> Share
            </button>
            ${!isOwnPost ? `
              <button class="action-btn btn-report-post" data-id="${post.id}" data-title="${escapeHtml(post.title)}" title="Report Post">
                <i class="fa-regular fa-flag"></i> Report
              </button>
            ` : ''}
            ${isCurrentUserAdmin() ? `
              <button class="action-btn btn-admin-pin" data-id="${post.id}" title="${post.pinned ? 'Unpin Post' : 'Pin Post'}">
                <i class="fa-solid fa-thumbtack" style="color: ${post.pinned ? 'var(--accent-pink)' : 'inherit'};"></i>
              </button>
              <button class="action-btn btn-admin-delete" data-id="${post.id}" title="Delete Post">
                <i class="fa-solid fa-trash-can" style="color: #fca5a5;"></i>
              </button>
            ` : ''}
          </div>
          <button class="action-btn btn-bookmark ${post.isBookmarked ? 'active-bookmark' : ''}" data-id="${post.id}">
            <i class="${post.isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
        </div>

        <div class="post-comments-drawer" id="comments-${post.id}">
          <div class="comment-input-row">
            <input type="text" class="comment-input-field" placeholder="Write a comment..." maxlength="280">
            <button class="comment-submit-btn" data-id="${post.id}">Post</button>
          </div>
          <div class="comments-list" id="comments-list-${post.id}">
            ${initialCommentsHtml}
            ${extraCommentsHtml}
          </div>
        </div>
      </article>
    `;
  }

  function isCurrentUserAdmin() {
    try {
      const u = JSON.parse(localStorage.getItem('vicecityhub_user') || 'null');
      return Boolean(u && u.role === 'admin');
    } catch (e) {
      return false;
    }
  }

  function renderTrendingFeed() {
    const trendingContainer = document.getElementById('trending-feed-list');
    if (!trendingContainer) return;

    const likedPosts = [...posts]
      .filter(p => Number(p.likes || 0) > 0)
      .sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
      .slice(0, 5);

    if (likedPosts.length === 0) {
      trendingContainer.innerHTML = `
        <p style="font-size: 0.78rem; color: var(--text-dim);">Posts receiving likes from the community will appear here.</p>
      `;
      return;
    }

    trendingContainer.innerHTML = likedPosts.map(p => `
      <a href="#post-${escapeHtml(p.id)}" class="trending-item" data-trend-id="${escapeHtml(p.id)}">
        <span class="trending-tag">${escapeHtml(p.categoryLabel || p.category || 'Discussions')}</span>
        <span class="trending-title">${escapeHtml(p.title)}</span>
        <span class="trending-stats"><i class="fa-solid fa-thumbs-up" style="color: var(--accent-pink);"></i> ${Number(p.likes || 0)} likes &bull; @${escapeHtml(p.username || p.author)}</span>
      </a>
    `).join('');
  }

  function formatIsoWithTimezone(val) {
    if (!val) return new Date().toISOString();
    if (typeof val === 'number') {
      const ms = val > 1e11 ? val : val * 1000;
      const d = new Date(ms);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    }
    let str = String(val).trim();
    if (!str) return new Date().toISOString();
    if (/^(just now|recently|today|\d+[smhdw]\s*ago)/i.test(str)) {
      return new Date().toISOString();
    }
    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
    }
    const direct = new Date(str);
    if (!isNaN(direct.getTime())) {
      return direct.toISOString();
    }
    const withZ = new Date(str.endsWith('Z') ? str : (str + 'Z'));
    if (!isNaN(withZ.getTime())) {
      return withZ.toISOString();
    }
    return new Date().toISOString();
  }

  function formatTimeAgo(timeStr) {
    if (!timeStr) return 'Recently';
    if (timeStr === 'Recently' || timeStr === 'Just now') return timeStr;
    try {
      const norm = timeStr.includes('T') ? (timeStr.endsWith('Z') ? timeStr : timeStr + 'Z') : (timeStr.replace(' ', 'T') + 'Z');
      const d = new Date(norm);
      if (isNaN(d.getTime())) return timeStr;
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return timeStr;
    }
  }

  function injectDynamicPostsSchema(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    let tag = document.getElementById('dynamic-posts-jsonld');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'dynamic-posts-jsonld';
      document.head.appendChild(tag);
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'GTA VI Community Discussions & Leonida Map Discoveries',
      itemListElement: items.slice(0, 25).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'DiscussionForumPosting',
          '@id': `https://vicecityhub.eu/index.html#post-${p.id}`,
          url: `https://vicecityhub.eu/index.html#post-${p.id}`,
          headline: p.title,
          articleBody: p.text,
          articleSection: p.categoryLabel || p.category || 'GTA VI Discussions',
          datePublished: formatIsoWithTimezone(p.time || p.created_at),
          dateModified: formatIsoWithTimezone(p.time || p.created_at),
          image: p.media_url ? (p.media_url.startsWith('http') ? p.media_url : `https://vicecityhub.eu/${p.media_url.replace(/^\.?\//, '')}`) : 'https://vicecityhub.eu/assets/brand/og-banner.png',
          author: {
            '@type': 'Person',
            name: p.author || p.username || 'ViceCityHub Member',
            url: `https://vicecityhub.eu/profile.html?u=${encodeURIComponent(p.username || p.author || '')}`
          },
          interactionStatistic: [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/LikeAction',
              userInteractionCount: Number(p.likes || 0)
            },
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/CommentAction',
              userInteractionCount: Array.isArray(p.comments) ? p.comments.length : 0
            }
          ]
        }
      }))
    };
    tag.textContent = JSON.stringify(schema);
  }

  function renderFeed() {
    renderTrendingFeed();
    injectDynamicPostsSchema(posts);
    if (!feedContainer) return;
    const query = (searchInput?.value || '').toLowerCase().trim();
    const filtered = posts.filter(post => {
      const matchCat = currentCategory === 'all' || post.category === currentCategory;
      const matchSearch = !query ||
        post.title.toLowerCase().includes(query) ||
        post.text.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-feed-state">
          <h3 style="font-size: 1.02rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No community posts yet</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Be the first to share a discovery, map coordinate, or discussion in Vice City.</p>
          <a href="post.html" class="btn-post-submit" style="text-decoration: none;">
            <i class="fa-solid fa-plus"></i> Create New Post
          </a>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filtered.map(renderPostCard).join('');
  }

  if (filterChips.length > 0) {
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.dataset.category || 'all';
        renderFeed();
      });
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderFeed);
  if (searchBtn) searchBtn.addEventListener('click', renderFeed);

  if (feedContainer) {
    feedContainer.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('.btn-like');
      if (likeBtn) {
        const p = posts.find(item => item.id === likeBtn.dataset.id);
        if (p) {
          p.isLiked = !p.isLiked;
          p.likes = Math.max(0, (p.likes || 0) + (p.isLiked ? 1 : -1));
          saveLocalLikedPost(p.id, p.isLiked);
          renderFeed();
          fetch('/api/posts?action=like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: p.id })
          }).then(r => r.ok ? r.json() : null).then(data => {
            if (data && typeof data.liked === 'boolean') {
              p.isLiked = data.liked;
              saveLocalLikedPost(p.id, data.liked);
              renderFeed();
            }
          }).catch(() => {});
        }
        return;
      }

      const bookmarkBtn = e.target.closest('.btn-bookmark');
      if (bookmarkBtn) {
        const p = posts.find(item => item.id === bookmarkBtn.dataset.id);
        if (p) {
          p.isBookmarked = !p.isBookmarked;
          saveLocalBookmarkedPost(p.id, p.isBookmarked);
          renderFeed();
          showToast(p.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
          fetch('/api/posts?action=bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: p.id })
          }).then(r => r.ok ? r.json() : null).then(data => {
            if (data && typeof data.bookmarked === 'boolean') {
              p.isBookmarked = data.bookmarked;
              saveLocalBookmarkedPost(p.id, data.bookmarked);
              renderFeed();
            }
          }).catch(() => {});
        }
        return;
      }

      const commentsToggle = e.target.closest('.btn-comments-toggle');
      if (commentsToggle) {
        const drawer = document.getElementById(`comments-${commentsToggle.dataset.id}`);
        if (drawer) {
          const isOpen = drawer.classList.toggle('open');
          if (isOpen) {
            const input = drawer.querySelector('.comment-input-field');
            if (input) {
              setTimeout(() => {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 50);
            }
          }
        }
        return;
      }

      const moreCommentsBtn = e.target.closest('.btn-show-more-comments');
      if (moreCommentsBtn) {
        const postId = moreCommentsBtn.dataset.id;
        const extraBox = document.getElementById(`extra-comments-${postId}`);
        if (extraBox) {
          const isHidden = extraBox.style.display === 'none';
          if (isHidden) {
            extraBox.style.display = 'flex';
            moreCommentsBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Show fewer comments';
          } else {
            extraBox.style.display = 'none';
            const count = extraBox.querySelectorAll('.single-comment').length;
            moreCommentsBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> View ${count} more comments`;
          }
        }
        return;
      }

      const commentSubmit = e.target.closest('.comment-submit-btn');
      if (commentSubmit) {
        const drawer = document.getElementById(`comments-${commentSubmit.dataset.id}`);
        const input = drawer.querySelector('.comment-input-field');
        const val = (input.value || '').trim();
        if (!val) return;
        const p = posts.find(item => item.id === commentSubmit.dataset.id);
        if (p) {
          const curUser = getCurrentUser();
          const authorName = curUser ? (curUser.username || 'You') : 'You';
          p.comments.unshift({ author: authorName, time: 'Just now', text: val });
          input.value = '';
          renderFeed();
          const updatedDrawer = document.getElementById(`comments-${p.id}`);
          if (updatedDrawer) updatedDrawer.classList.add('open');
          showToast('Comment published');
          fetch('/api/posts?action=comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: p.id, text: val })
          }).catch(() => {});
        }
        return;
      }

      const shareBtn = e.target.closest('.btn-share');
      if (shareBtn) {
        const shareUrl = `${window.location.origin}/d/${shareBtn.dataset.id}`;
        const shareTitle = shareBtn.dataset.title || 'GTA VI Community Post on ViceCityHub';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }
        if (typeof window.openShareBottomPopup === 'function') {
          window.openShareBottomPopup(shareUrl, shareTitle);
        } else {
          showToast('Link copied to clipboard');
        }
        return;
      }

      const reportBtn = e.target.closest('.btn-report-post');
      if (reportBtn) {
        if (typeof window.openReportPostPopup === 'function') {
          window.openReportPostPopup(reportBtn.dataset.id, reportBtn.dataset.title || 'Post');
        }
        return;
      }

      const adminPinBtn = e.target.closest('.btn-admin-pin');
      if (adminPinBtn) {
        const pid = adminPinBtn.dataset.id;
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'pin_post', targetId: pid })
        }).then(r => r.json()).then(d => {
          if (d && d.ok) {
            const p = posts.find(item => item.id === pid);
            if (p) p.pinned = !p.pinned;
            posts.sort((a, b) => Number(b.pinned) - Number(a.pinned));
            renderFeed();
            showToast('Post pin status updated');
          }
        }).catch(() => {});
        return;
      }

      const adminDelBtn = e.target.closest('.btn-admin-delete');
      if (adminDelBtn) {
        const pid = adminDelBtn.dataset.id;
        if (!window.confirm('Delete this post permanently?')) return;
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'delete_post', targetId: pid })
        }).then(r => r.json()).then(d => {
          if (d && d.ok) {
            posts = posts.filter(item => item.id !== pid);
            renderFeed();
            showToast('Post deleted');
          }
        }).catch(() => {});
        return;
      }
    });

    localStorage.removeItem('vicecityhub_custom_posts');
    renderFeed();

    fetch('/api/posts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.posts)) {
          const localLiked = getLocalLikedPosts();
          const localBookmarked = getLocalBookmarkedPosts();
          posts = data.posts.map(p => {
            const isLiked = typeof p.isLiked === 'boolean' ? (p.isLiked || localLiked.has(p.id)) : localLiked.has(p.id);
            const isBookmarked = typeof p.isBookmarked === 'boolean' ? (p.isBookmarked || localBookmarked.has(p.id)) : localBookmarked.has(p.id);
            if (isLiked) localLiked.add(p.id);
            if (isBookmarked) localBookmarked.add(p.id);
            return {
              ...p,
              isLiked,
              isBookmarked,
              time: p.time || 'Recently',
              avatar: p.avatar || 'assets/brand/favicon-192x192.png',
              comments: Array.isArray(p.comments) ? p.comments : []
            };
          });
          try {
            localStorage.setItem('vch_liked_posts', JSON.stringify([...localLiked]));
            localStorage.setItem('vch_bookmarked_posts', JSON.stringify([...localBookmarked]));
          } catch (e) {}
          renderFeed();

          if (window.location.hash) {
            const targetId = window.location.hash.replace('#post-', '');
            if (targetId) {
              setTimeout(() => {
                const targetCard = document.querySelector(`.post-card[data-id="${targetId}"]`);
                if (targetCard) {
                  targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  const drawer = document.getElementById(`comments-${targetId}`);
                  if (drawer) {
                    drawer.classList.add('open');
                    const input = drawer.querySelector('.comment-input-field');
                    if (input) input.focus();
                  }
                }
              }, 150);
            }
          }
        }
      })
      .catch(() => {});
  }

  const dedicatedPostForm = document.getElementById('dedicated-post-form');
  const postContentInput = document.getElementById('post-content-input');
  const postCharCounter = document.getElementById('post-char-counter');
  const btnTriggerPostMedia = document.getElementById('btn-trigger-post-media');
  const btnClearPostMedia = document.getElementById('btn-clear-post-media');
  const postMediaFileInput = document.getElementById('post-media-file-input');
  const postMediaStatus = document.getElementById('post-media-status');
  const postMediaPreviewBox = document.getElementById('post-media-preview-box');

  let uploadedPostMediaUrl = '';
  let uploadedPostMediaType = 'image';
  let isUploadingPostMedia = false;

  if (postContentInput && postCharCounter) {
    postContentInput.addEventListener('input', () => {
      postCharCounter.textContent = `${postContentInput.value.length} / 2000`;
    });
  }

  function uint8ToBase64(uint8) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < uint8.length; i += step) {
      binary += String.fromCharCode.apply(null, uint8.subarray(i, i + step));
    }
    return btoa(binary);
  }

  async function uploadBinaryInChunks(uint8, mimeType, statusEl) {
    const CHUNK_BYTE_SIZE = 540 * 1024;
    const totalBytes = uint8.byteLength;
    const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_BYTE_SIZE));

    const firstSlice = uint8.subarray(0, Math.min(CHUNK_BYTE_SIZE, totalBytes));
    const firstB64 = uint8ToBase64(firstSlice);

    if (statusEl) statusEl.textContent = `Uploading (1/${totalChunks})...`;

    const initRes = await fetch('/api/media?action=init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        mime_type: mimeType,
        total_bytes: totalBytes,
        total_chunks: totalChunks,
        data_b64: firstB64
      })
    });
    const initData = await initRes.json().catch(() => ({}));
    if (!initRes.ok || !initData.media_id) {
      throw new Error(initData.error || 'Media upload initialization failed.');
    }

    const mediaId = initData.media_id;

    for (let idx = 1; idx < totalChunks; idx++) {
      if (statusEl) {
        const pct = Math.round(((idx + 1) / totalChunks) * 100);
        statusEl.textContent = `Uploading media (${pct}%)...`;
      }
      const start = idx * CHUNK_BYTE_SIZE;
      const end = Math.min(start + CHUNK_BYTE_SIZE, totalBytes);
      const sliceB64 = uint8ToBase64(uint8.subarray(start, end));

      const chunkRes = await fetch('/api/media?action=chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          media_id: mediaId,
          chunk_index: idx,
          data_b64: sliceB64
        })
      });
      if (!chunkRes.ok) {
        const errD = await chunkRes.json().catch(() => ({}));
        throw new Error(errD.error || `Failed on chunk ${idx + 1}`);
      }
    }

    return {
      mediaUrl: initData.media_url,
      mediaType: initData.media_type
    };
  }

  async function compressAndStripExifImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1440;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w >= h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Image compression failed'));
            blob.arrayBuffer().then(buf => {
              resolve({ uint8: new Uint8Array(buf), mimeType: blob.type || 'image/webp' });
            }).catch(reject);
          }, 'image/webp', 0.82);
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  if (btnTriggerPostMedia && postMediaFileInput) {
    btnTriggerPostMedia.addEventListener('click', () => postMediaFileInput.click());

    if (btnClearPostMedia) {
      btnClearPostMedia.addEventListener('click', () => {
        uploadedPostMediaUrl = '';
        uploadedPostMediaType = 'image';
        postMediaFileInput.value = '';
        btnClearPostMedia.style.display = 'none';
        if (postMediaStatus) postMediaStatus.textContent = 'No file selected';
        if (postMediaPreviewBox) {
          postMediaPreviewBox.style.display = 'none';
          postMediaPreviewBox.innerHTML = '';
        }
      });
    }

    postMediaFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const MAX_BYTES = 15 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        showToast('File exceeds the 15 MB limit. Please choose a file under 15 MB.');
        postMediaFileInput.value = '';
        return;
      }

      const isImage = /^image\/(jpeg|png|webp|gif)$/i.test(file.type);
      const isVideo = /^video\/(mp4|webm)$/i.test(file.type);

      if (!isImage && !isVideo) {
        showToast('Only JPG, PNG, WebP, GIF, MP4, or WebM files are permitted.');
        postMediaFileInput.value = '';
        return;
      }

      isUploadingPostMedia = true;
      if (postMediaStatus) postMediaStatus.textContent = isImage ? 'Optimizing & stripping EXIF...' : 'Preparing video...';

      try {
        let uint8;
        let mimeType = file.type.toLowerCase();

        if (isImage && mimeType !== 'image/gif') {
          const compressed = await compressAndStripExifImage(file);
          uint8 = compressed.uint8;
          mimeType = compressed.mimeType;
        } else {
          const buf = await file.arrayBuffer();
          uint8 = new Uint8Array(buf);
        }

        const result = await uploadBinaryInChunks(uint8, mimeType, postMediaStatus);
        uploadedPostMediaUrl = result.mediaUrl;
        uploadedPostMediaType = result.mediaType;

        if (postMediaStatus) {
          const kb = Math.max(1, Math.round(uint8.byteLength / 1024));
          postMediaStatus.textContent = `Ready (${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'})`;
        }
        if (btnClearPostMedia) btnClearPostMedia.style.display = 'inline-flex';

        if (postMediaPreviewBox) {
          postMediaPreviewBox.style.display = 'block';
          if (uploadedPostMediaType === 'video') {
            postMediaPreviewBox.innerHTML = `
              <div class="post-media-container post-video-wrap">
                <video src="${escapeHtml(uploadedPostMediaUrl)}" class="post-video-player" controls playsinline></video>
              </div>
            `;
          } else {
            postMediaPreviewBox.innerHTML = `
              <div class="post-media-container" data-full-img="${escapeHtml(uploadedPostMediaUrl)}" title="Click for Fullscreen Discord-Style Preview">
                <img src="${escapeHtml(uploadedPostMediaUrl)}" alt="Post preview">
              </div>
            `;
          }
        }
        showToast('Media uploaded and verified!');
      } catch (err) {
        uploadedPostMediaUrl = '';
        if (postMediaStatus) postMediaStatus.textContent = err.message || 'Upload failed';
        showToast(err.message || 'Media upload failed.');
      } finally {
        isUploadingPostMedia = false;
      }
    });
  }

  if (dedicatedPostForm) {
    dedicatedPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isUploadingPostMedia) {
        showToast('Please wait for the media upload to finish.');
        return;
      }
      const hp = document.getElementById('website_url_hp')?.value || '';
      if (hp.trim().length > 0) return;

      const authorRaw = (document.getElementById('post-author-input')?.value || '').trim();
      const author = authorRaw.replace(/[^\w\s-]/g, '').slice(0, 24) || 'Player_VI';
      const username = author.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'playervi';
      const title = document.getElementById('post-title-input').value.trim();
      const category = document.getElementById('post-category-select').value;
      const text = document.getElementById('post-content-input').value.trim();
      const externalMediaUrl = (document.getElementById('post-media-input')?.value || '').trim();
      const mediaUrl = uploadedPostMediaUrl || externalMediaUrl;
      const mediaType = uploadedPostMediaUrl ? uploadedPostMediaType : 'image';

      const catMap = {
        discussions: 'Discussions',
        leaks: 'Map',
        official: 'Official News'
      };

      const cachedUser = JSON.parse(localStorage.getItem('vicecityhub_user') || 'null');

      const newPost = {
        id: `post-${Date.now()}`,
        category: category,
        categoryLabel: catMap[category] || 'Discussions',
        pinned: false,
        author: (cachedUser && cachedUser.username) || author,
        username: ((cachedUser && cachedUser.username) || username).toLowerCase(),
        badge: (cachedUser && cachedUser.role === 'admin') ? 'Official' : 'Member',
        badgeClass: (cachedUser && cachedUser.role === 'admin') ? 'mod' : 'verified',
        time: 'Just now',
        avatar: (cachedUser && cachedUser.avatar_url) || 'assets/brand/favicon-192x192.png',
        title: title,
        text: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        likes: 1,
        isLiked: true,
        bookmarks: 0,
        isBookmarked: false,
        comments: []
      };

      const turnstileInput = dedicatedPostForm.querySelector('[name="cf-turnstile-response"]');
      const cfTurnstileResponse = turnstileInput ? turnstileInput.value : '';

      try {
        const res = await fetch('/api/posts?action=create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            author,
            title,
            category,
            text,
            mediaUrl,
            mediaType,
            website_url_hp: hp,
            cfTurnstileResponse
          })
        });
        if (res.status === 401) {
          window.location.href = 'login.html?tab=signup';
          return;
        }
        if (res.status === 403 || res.status === 400 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Security verification failed. Please retry.');
          if (window.turnstile) window.turnstile.reset();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.pending) {
            const modBanner = document.getElementById('post-moderation-banner');
            if (modBanner) {
              modBanner.style.display = 'block';
              modBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            dedicatedPostForm.reset();
            showToast('Waiting for the moderators approval');
            return;
          }
        }
      } catch (err) {}

      showToast('Post published! Redirecting to Feed...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    });
  }

  const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

  let discordServers = [];

  function injectDynamicDiscordsSchema(servers) {
    if (!Array.isArray(servers) || servers.length === 0) return;
    let tag = document.getElementById('dynamic-discords-jsonld');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'dynamic-discords-jsonld';
      document.head.appendChild(tag);
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Verified GTA VI Discord Servers Directory - ViceCityHub.eu',
      description: 'Directory of verified Grand Theft Auto VI (GTA 6) Discord servers for Roleplay (RP), Heists, Modding, and International communities.',
      itemListElement: servers.map((s, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Organization',
          name: s.name,
          description: s.desc,
          url: s.inviteUrl,
          sameAs: [s.inviteUrl],
          keywords: `GTA 6 Discord, GTA VI ${s.tag || 'Community'}, ${s.countryLabel || 'International'} GTA 6 Server`
        }
      }))
    };
    tag.textContent = JSON.stringify(schema);
  }

  function initSearchableCountryPicker(selectEl) {
    if (!selectEl || selectEl.dataset.enhanced === '1') return;
    selectEl.dataset.enhanced = '1';
    selectEl.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'country-picker-wrap';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'country-picker-trigger';

    const triggerLeft = document.createElement('span');
    triggerLeft.className = 'country-picker-trigger-left';

    const globeIcon = document.createElement('i');
    globeIcon.className = 'fa-solid fa-earth-americas';
    globeIcon.style.color = 'var(--accent-pink)';

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'country-picker-trigger-label';

    const chevron = document.createElement('i');
    chevron.className = 'fa-solid fa-chevron-down';
    chevron.style.fontSize = '0.72rem';
    chevron.style.color = 'var(--text-dim)';

    triggerLeft.appendChild(globeIcon);
    triggerLeft.appendChild(triggerLabel);
    trigger.appendChild(triggerLeft);
    trigger.appendChild(chevron);

    const dropdown = document.createElement('div');
    dropdown.className = 'country-picker-dropdown';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'country-picker-search-wrap';

    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-magnifying-glass';

    const searchInputEl = document.createElement('input');
    searchInputEl.type = 'text';
    searchInputEl.className = 'country-picker-search-input';
    searchInputEl.placeholder = 'Search country or language...';
    searchInputEl.autocomplete = 'off';

    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInputEl);

    const listBox = document.createElement('div');
    listBox.className = 'country-picker-list';

    dropdown.appendChild(searchWrap);
    dropdown.appendChild(listBox);

    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);
    selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);

    const optionsData = Array.from(selectEl.options).map(opt => ({
      value: opt.value,
      label: opt.textContent.trim()
    }));

    function updateTriggerText() {
      const currentOpt = optionsData.find(o => o.value === selectEl.value) || optionsData[0];
      triggerLabel.textContent = currentOpt ? currentOpt.label : 'Select Country';
    }

    function renderOptionsList(filterText = '') {
      const q = filterText.toLowerCase().trim();
      listBox.innerHTML = '';
      const matched = optionsData.filter(o =>
        !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
      );

      if (matched.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'country-picker-empty';
        emptyEl.textContent = 'No matching country found';
        listBox.appendChild(emptyEl);
        return;
      }

      matched.forEach(o => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'country-picker-option' + (o.value === selectEl.value ? ' active' : '');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = o.label;

        const codeSpan = document.createElement('span');
        codeSpan.className = 'country-picker-code';
        codeSpan.textContent = o.value === 'all' ? 'ALL' : o.value.toUpperCase();

        btn.appendChild(nameSpan);
        btn.appendChild(codeSpan);

        btn.addEventListener('click', () => {
          selectEl.value = o.value;
          updateTriggerText();
          wrap.classList.remove('open');
          searchInputEl.value = '';
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        });

        listBox.appendChild(btn);
      });
    }

    updateTriggerText();
    renderOptionsList('');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !wrap.classList.contains('open');
      document.querySelectorAll('.country-picker-wrap.open').forEach(w => w.classList.remove('open'));
      if (willOpen) {
        wrap.classList.add('open');
        searchInputEl.value = '';
        renderOptionsList('');
        setTimeout(() => searchInputEl.focus(), 30);
      }
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    searchInputEl.addEventListener('input', () => {
      renderOptionsList(searchInputEl.value);
    });

    document.addEventListener('click', () => {
      wrap.classList.remove('open');
    });
  }

  initSearchableCountryPicker(discordCountryFilter);
  initSearchableCountryPicker(document.getElementById('discord-country-select'));

  function renderDiscords() {
    if (!discordGrid) return;
    injectDynamicDiscordsSchema(discordServers);
    const query = (discordSearchInput?.value || '').toLowerCase().trim();
    const selCountry = discordCountryFilter?.value || 'all';
    const selType = discordTypeFilter?.value || 'all';

    const filtered = discordServers.filter(s => {
      const matchQuery = !query || s.name.toLowerCase().includes(query) || s.tag.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query);
      const matchCountry = selCountry === 'all' || s.country === selCountry;
      const matchType = selType === 'all' || s.category === selType;
      return matchQuery && matchCountry && matchType;
    });

    if (filtered.length === 0) {
      if (selCountry !== 'all') {
        discordGrid.innerHTML = `
          <div class="empty-feed-state">
            <h3 style="font-size: 1.08rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">:( no servers available in this country</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Be the first to share a GTA VI Discord server for this country or language.</p>
            <a href="submit-discord.html" class="btn-discord" style="height: 40px; padding: 0 18px; text-decoration: none;">
              <i class="fa-solid fa-plus"></i> Share Your Discord Server
            </a>
          </div>
        `;
      } else {
        discordGrid.innerHTML = `
          <div class="empty-feed-state">
            <h3 style="font-size: 1.02rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No Discord servers listed yet</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Have a GTA VI Roleplay, Heist, or Community server? Share it in the directory.</p>
            <a href="submit-discord.html" class="btn-discord" style="height: 40px; padding: 0 18px; text-decoration: none;">
              <i class="fa-solid fa-plus"></i> Share Your Discord Server
            </a>
          </div>
        `;
      }
      return;
    }

    discordGrid.innerHTML = filtered.map(s => {
      const rawIcon = s.iconUrl || s.icon_url || '';
      const hasValidIcon = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(rawIcon);
      const avatarContent = hasValidIcon
        ? `<img src="${escapeHtml(rawIcon)}" alt="${escapeHtml(s.name)}" class="discord-server-logo-img" loading="lazy">`
        : `<i class="fa-brands fa-discord"></i>`;

      return `
      <div class="discord-list-item">
        <div class="discord-list-left">
          <div class="discord-avatar-box">
            ${avatarContent}
          </div>
          <div class="discord-list-info">
            <div class="discord-list-title-row">
              <span class="discord-list-name">${escapeHtml(s.name)}</span>
              <span class="discord-pill-tag">${escapeHtml(s.tag)}</span>
              <span class="discord-country-tag">${escapeHtml(s.countryLabel)}</span>
            </div>
            <p class="discord-list-desc">${escapeHtml(s.desc)}</p>
          </div>
        </div>
        <div class="discord-list-right">
          <span class="discord-members-count"><i class="fa-solid fa-users"></i> ${escapeHtml(s.members)}</span>
          <a href="${escapeHtml(s.inviteUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-discord-join">
            <i class="fa-brands fa-discord"></i> Join Server
          </a>
        </div>
      </div>
    `;
    }).join('');
  }

  if (discordGrid) {
    localStorage.removeItem('vicecityhub_custom_discords');
    renderDiscords();

    fetch('/api/discords')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.servers)) {
          discordServers = data.servers;
          renderDiscords();
        }
      })
      .catch(() => {});

    if (discordSearchInput) discordSearchInput.addEventListener('input', renderDiscords);
    if (discordCountryFilter) discordCountryFilter.addEventListener('change', renderDiscords);
    if (discordTypeFilter) discordTypeFilter.addEventListener('change', renderDiscords);
  }

  let uploadedDiscordLogoDataUrl = '';
  const btnTriggerDiscordLogo = document.getElementById('btn-trigger-discord-logo');
  const btnClearDiscordLogo = document.getElementById('btn-clear-discord-logo');
  const discordLogoFileInput = document.getElementById('discord-logo-file-input');
  const discordLogoPreviewBox = document.getElementById('discord-logo-preview-box');
  const discordLogoStatus = document.getElementById('discord-logo-status');

  if (btnTriggerDiscordLogo && discordLogoFileInput) {
    btnTriggerDiscordLogo.addEventListener('click', () => discordLogoFileInput.click());

    if (btnClearDiscordLogo) {
      btnClearDiscordLogo.addEventListener('click', () => {
        uploadedDiscordLogoDataUrl = '';
        discordLogoFileInput.value = '';
        btnClearDiscordLogo.style.display = 'none';
        if (discordLogoPreviewBox) {
          discordLogoPreviewBox.innerHTML = '<i class="fa-brands fa-discord"></i>';
        }
        if (discordLogoStatus) {
          discordLogoStatus.textContent = 'Default Discord icon (160x160 square auto-crop)';
        }
      });
    }

    discordLogoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const MAX_LOGO_BYTES = 5 * 1024 * 1024;
      if (file.size > MAX_LOGO_BYTES) {
        showToast('Server logo exceeds the 5 MB limit. Please choose an image under 5 MB.');
        discordLogoFileInput.value = '';
        return;
      }

      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        showToast('Only JPG, PNG, or WebP images are permitted.');
        discordLogoFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 160;
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, SIZE, SIZE);

          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const dx = (SIZE - drawW) / 2;
          const dy = (SIZE - drawH) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, dx, dy, drawW, drawH);

          let dataUrl = canvas.toDataURL('image/webp', 0.80);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.80);
          }

          uploadedDiscordLogoDataUrl = dataUrl;
          if (discordLogoPreviewBox) {
            discordLogoPreviewBox.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Server Logo Preview" class="discord-server-logo-img">`;
          }
          if (btnClearDiscordLogo) {
            btnClearDiscordLogo.style.display = 'inline-flex';
          }
          if (discordLogoStatus) {
            const approxKb = Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));
            discordLogoStatus.textContent = `Logo optimized (~${approxKb} KB • 100% EXIF removed)`;
          }
          showToast('Server logo optimized and ready!');
        };
        img.onerror = () => {
          showToast('Invalid or corrupted image file.');
          discordLogoFileInput.value = '';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const dedicatedDiscordForm = document.getElementById('dedicated-discord-form');
  if (dedicatedDiscordForm) {
    dedicatedDiscordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = document.getElementById('discord_hp_url')?.value || '';
      if (hp.trim().length > 0) return;

      const name = document.getElementById('discord-name-input').value.trim();
      const inviteUrl = document.getElementById('discord-url-input').value.trim();
      const category = document.getElementById('discord-category-select').value;
      const countrySelectEl = document.getElementById('discord-country-select');
      const country = countrySelectEl?.value || 'intl';
      const desc = document.getElementById('discord-desc-input').value.trim();

      if (!DISCORD_REGEX.test(inviteUrl)) {
        showToast('Invalid Discord invite! Must be https://discord.gg/... or https://discord.com/invite/...');
        return;
      }

      const turnstileInput = dedicatedDiscordForm.querySelector('[name="cf-turnstile-response"]');
      const cfTurnstileResponse = turnstileInput ? turnstileInput.value : '';

      try {
        const res = await fetch('/api/discords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            inviteUrl,
            category,
            country,
            desc,
            iconUrl: uploadedDiscordLogoDataUrl,
            discord_hp_url: hp,
            cfTurnstileResponse
          })
        });
        if (res.status === 401) {
          window.location.href = 'login.html?tab=signup';
          return;
        }
        if (res.status === 403 || res.status === 400 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Security verification failed. Please retry.');
          if (window.turnstile) window.turnstile.reset();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.pending) {
            const modBanner = document.getElementById('discord-moderation-banner');
            if (modBanner) {
              modBanner.style.display = 'block';
              modBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            dedicatedDiscordForm.reset();
            if (btnClearDiscordLogo) btnClearDiscordLogo.click();
            showToast('Waiting for the moderators approval');
            return;
          }
        }
      } catch (err) {}

      showToast('Discord server listed! Redirecting to Directory...');
      setTimeout(() => {
        window.location.href = 'discords.html';
      }, 700);
    });
  }

  const cheatsData = [
    {
      id: 'cheat-p1',
      category: 'player',
      categoryLabel: 'Player',
      title: '$250,000',
      tag: 'Player \u2022 Unlock: Make $250,000 from fenced goods',
      desc: 'Instantly gives you $250,000.',
      sequence: ['Up', 'Right', 'Down', 'Left', 'Up', 'Left', 'Down', 'Right']
    },
    {
      id: 'cheat-p2',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Drunk',
      tag: 'Player \u2022 Unlock: Spend $2,500 on alcohol',
      desc: 'Instantly makes you and your partner drunk.',
      sequence: ['Up', 'Left', 'Right', 'Up', 'Up', 'Left', 'Right', 'Up', 'Left', 'Right']
    },
    {
      id: 'cheat-p3',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Raise Heat Level',
      tag: 'Player \u2022 Unlock: Story / Progression',
      desc: 'Raises your level of heat across the map.',
      sequence: ['Left', 'Down', 'Right', 'Down', 'Up', 'Down', 'Up']
    },
    {
      id: 'cheat-p4',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Unlimited Focus',
      tag: 'Player \u2022 Unlock: Story / Progression',
      desc: 'Focus never runs out.',
      sequence: ['Down', 'Up', 'Up', 'Down', 'Up', 'Down', 'Up', 'Down', 'Up', 'Right']
    },
    {
      id: 'cheat-p5',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Raise Wanted Level',
      tag: 'Player \u2022 Unlock: Lose a 3-star wanted level 50 times',
      desc: 'Raises your wanted level.',
      sequence: []
    },
    {
      id: 'cheat-p6',
      category: 'player',
      categoryLabel: 'Player',
      title: 'No Fall Damage',
      tag: 'Player \u2022 Unlock: Survive a freefall from 40 feet 20 times',
      desc: 'You are immune to fall damage.',
      sequence: []
    },
    {
      id: 'cheat-p7',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Parachute',
      tag: 'Player \u2022 Unlock: Complete 50 skydives or base jumps from 300 feet or higher',
      desc: 'Adds a parachute to your loadout.',
      sequence: []
    },
    {
      id: 'cheat-p8',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Body Armor',
      tag: 'Player \u2022 Unlock: Complete 100 workouts',
      desc: 'Adds body armor to your loadout.',
      sequence: []
    },
    {
      id: 'cheat-p9',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Repair Vehicle',
      tag: 'Player \u2022 Unlock: Get 1st place in 10 races at Gellhorn Raceway, Thrillbilly Mud Club, and Boone Speedway',
      desc: 'Fully repairs your current vehicle.',
      sequence: []
    },
    {
      id: 'cheat-p10',
      category: 'player',
      categoryLabel: 'Player',
      title: 'Unlimited Nitrous',
      tag: 'Player \u2022 Unlock: Complete 50 stunt jumps',
      desc: 'Nitrous and fuel never runs out on vehicles.',
      sequence: []
    },
    {
      id: 'cheat-c1',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Max Ammo',
      tag: 'Combat \u2022 Unlock: Earn 25 bronze medals or better at shooting ranges',
      desc: 'Refills ammunition to maximum capacity for all equipped weapons.',
      sequence: ['Down', 'Up', 'Right', 'Down', 'Left', 'Left', 'Up', 'Up', 'Down', 'Left']
    },
    {
      id: 'cheat-c2',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Infinite Ammo',
      tag: 'Combat \u2022 Unlock: Earn 25 silver medals or better at shooting ranges',
      desc: 'Grants unlimited weapon ammunition.',
      sequence: ['Down', 'Up', 'Right', 'Down', 'Left', 'Left', 'Up', 'Down', 'Down', 'Down']
    },
    {
      id: 'cheat-c3',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'No Reload',
      tag: 'Combat \u2022 Unlock: Earn 25 gold medals at shooting ranges',
      desc: 'Fire continuously without ever needing to reload.',
      sequence: ['Down', 'Up', 'Right', 'Down', 'Left', 'Left', 'Up', 'Down', 'Down', 'Up']
    },
    {
      id: 'cheat-c4',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Attack Force',
      tag: 'Combat \u2022 Unlock: Finish the main story',
      desc: 'Bullets and melee attacks blast targets away with extreme force.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Down', 'Up', 'Down']
    },
    {
      id: 'cheat-c5',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Exploding Balls',
      tag: 'Combat \u2022 Unlock: Deal explosive damage to 20 enemies',
      desc: 'Projectiles trigger explosive impact blasts.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Down', 'Up', 'Right']
    },
    {
      id: 'cheat-c6',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Vehicle Force',
      tag: 'Combat \u2022 Unlock: Kill 25 enemies using a vehicle',
      desc: 'Grants heavy ramming force to your vehicle on collision.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Left', 'Up', 'Down']
    },
    {
      id: 'cheat-c7',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'All Explosive Weapons',
      tag: 'Combat \u2022 Unlock: Throw 100 grenades',
      desc: 'Equips all explosive weapons to your arsenal.',
      sequence: []
    },
    {
      id: 'cheat-c8',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Incendiary Ammo',
      tag: 'Combat \u2022 Unlock: Burn 100 enemies with fire damage',
      desc: 'Rounds ignite targets on impact.',
      sequence: []
    },
    {
      id: 'cheat-c9',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Exploding Bottles',
      tag: 'Combat \u2022 Unlock: Throw 100 molotovs',
      desc: 'Thrown bottles detonate on impact.',
      sequence: []
    },
    {
      id: 'cheat-c10',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Explosive Shotgun',
      tag: 'Combat \u2022 Unlock: Hit 100 enemies with explosive damage',
      desc: 'Shotgun shells detonate with explosive force.',
      sequence: []
    },
    {
      id: 'cheat-c11',
      category: 'combat',
      categoryLabel: 'Combat',
      title: 'Hauners H-AT',
      tag: 'Combat \u2022 Unlock: Blow up 100 vehicles',
      desc: 'Equips the heavy anti-tank Hauners H-AT weapon.',
      sequence: []
    },
    {
      id: 'cheat-v1',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Maibatsu Boomazoom',
      tag: 'Vehicles \u2022 Unlock: Complete 5 shopping challenges',
      desc: 'Spawns the Maibatsu Boomazoom.',
      sequence: ['Left', 'Up', 'Right', 'Down', 'Left', 'Left', 'Up', 'Left']
    },
    {
      id: 'cheat-v2',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'MTL Pumper',
      tag: 'Vehicles \u2022 Unlock: Discover the MTL Pumper in the Progress menu',
      desc: 'Spawns the MTL Pumper fire truck.',
      sequence: ['Left', 'Up', 'Right', 'Down', 'Left', 'Right', 'Right', 'Up']
    },
    {
      id: 'cheat-v3',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'HVY Bulldozer',
      tag: 'Vehicles \u2022 Unlock: Discover the HVY Bulldozer in the Progress menu',
      desc: 'Spawns the heavy HVY Bulldozer.',
      sequence: ['Left', 'Up', 'Right', 'Down', 'Left', 'Right', 'Right', 'Down']
    },
    {
      id: 'cheat-v4',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Interstate Ambulance',
      tag: 'Vehicles \u2022 Unlock: Discover the Interstate Ambulance in the Progress menu',
      desc: 'Spawns the Interstate Ambulance.',
      sequence: []
    },
    {
      id: 'cheat-v5',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Airboat 09',
      tag: 'Vehicles \u2022 Unlock: Complete 5 survival challenges',
      desc: 'Spawns the Grassrivers Airboat 09.',
      sequence: []
    },
    {
      id: 'cheat-v6',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Bravado Banshee',
      tag: 'Vehicles \u2022 Unlock: Complete all combat challenges',
      desc: 'Spawns the Bravado Banshee sports car.',
      sequence: []
    },
    {
      id: 'cheat-v7',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Tuff BMX',
      tag: 'Vehicles \u2022 Unlock: Complete 5 fitness challenges',
      desc: 'Spawns the Tuff BMX bicycle.',
      sequence: []
    },
    {
      id: 'cheat-v8',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Nagasaki Carbon RS',
      tag: 'Vehicles \u2022 Unlock: Complete all exploration challenges',
      desc: 'Spawns the Nagasaki Carbon RS sport bike.',
      sequence: []
    },
    {
      id: 'cheat-v9',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: '\u201965 Vapid Dominator',
      tag: 'Vehicles \u2022 Unlock: Complete all fitness challenges',
      desc: 'Spawns the classic \u201965 Vapid Dominator muscle car.',
      sequence: []
    },
    {
      id: 'cheat-v10',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Progen Emerus',
      tag: 'Vehicles \u2022 Unlock: Complete all vehicle challenges',
      desc: 'Spawns the Progen Emerus hypercar.',
      sequence: []
    },
    {
      id: 'cheat-v11',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Inflatable Flamingo',
      tag: 'Vehicles \u2022 Unlock: Destroy 50 cocaine flamingos',
      desc: 'Spawns the Inflatable Flamingo.',
      sequence: []
    },
    {
      id: 'cheat-v12',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Vapid Stanier G2 Taxi',
      tag: 'Vehicles \u2022 Unlock: Complete 5 sports challenges',
      desc: 'Spawns the Vapid Stanier G2 Taxi.',
      sequence: []
    },
    {
      id: 'cheat-v13',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Hauners P-996 Lazer',
      tag: 'Vehicles \u2022 Unlock: Complete all challenges',
      desc: 'Spawns the Hauners P-996 Lazer fighter jet.',
      sequence: []
    },
    {
      id: 'cheat-v14',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Lapwing Mallard',
      tag: 'Vehicles \u2022 Unlock: Complete 5 vehicle challenges',
      desc: 'Spawns the Lapwing Mallard stunt plane.',
      sequence: []
    },
    {
      id: 'cheat-v15',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Brimstone Golfer',
      tag: 'Vehicles \u2022 Unlock: Complete all sports challenges',
      desc: 'Spawns the Brimstone Golfer cart.',
      sequence: []
    },
    {
      id: 'cheat-v16',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Hauners Rhino Tank',
      tag: 'Vehicles \u2022 Unlock: Complete all survival challenges',
      desc: 'Spawns the armored Hauners Rhino Tank.',
      sequence: []
    },
    {
      id: 'cheat-v17',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Maibatsu Sanchez',
      tag: 'Vehicles \u2022 Unlock: Complete 5 criminal challenges',
      desc: 'Spawns the Maibatsu Sanchez dirt bike.',
      sequence: []
    },
    {
      id: 'cheat-v18',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Nagasaki Sea Sparrow',
      tag: 'Vehicles \u2022 Unlock: Complete 5 exploration challenges',
      desc: 'Spawns the Nagasaki Sea Sparrow amphibious helicopter.',
      sequence: []
    },
    {
      id: 'cheat-v19',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Speeder 700 GT',
      tag: 'Vehicles \u2022 Unlock: Complete 5 combat challenges',
      desc: 'Spawns the Speeder 700 GT speedboat.',
      sequence: []
    },
    {
      id: 'cheat-v20',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Truffade Thrax',
      tag: 'Vehicles \u2022 Unlock: Complete all shopping challenges',
      desc: 'Spawns the Truffade Thrax supercar.',
      sequence: []
    },
    {
      id: 'cheat-v21',
      category: 'vehicles',
      categoryLabel: 'Spawn Vehicles',
      title: 'Western Zombie Bobber',
      tag: 'Vehicles \u2022 Unlock: Complete all criminal challenges',
      desc: 'Spawns the Western Zombie Bobber chopper motorcycle.',
      sequence: []
    },
    {
      id: 'cheat-e1',
      category: 'environment',
      categoryLabel: 'Environment',
      title: 'Cycle Weather',
      tag: 'Environment \u2022 Unlock: Finish the main story',
      desc: 'Cycles through weather conditions across Vice City and Leonida.',
      sequence: ['Down', 'Right', 'Up', 'Down', 'Right', 'Up', 'Right']
    },
    {
      id: 'cheat-e2',
      category: 'environment',
      categoryLabel: 'Environment',
      title: 'Move Time Forward',
      tag: 'Environment \u2022 Unlock: Find 10 collectible watches',
      desc: 'Advances the in-game time of day.',
      sequence: []
    },
    {
      id: 'cheat-e3',
      category: 'environment',
      categoryLabel: 'Environment',
      title: 'Pause Time of Day',
      tag: 'Environment \u2022 Unlock: Find 20 collectible watches',
      desc: 'Freezes the current time of day.',
      sequence: []
    },
    {
      id: 'cheat-f1',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Cataclysm',
      tag: 'Screen Filter \u2022 Unlock: Discover Martha\u2019s Vamos in the Progress menu',
      desc: 'Applies the Cataclysm visual screen filter.',
      sequence: ['Down', 'Down', 'Up', 'Right', 'Right', 'Up', 'Left', 'Left', 'Right', 'Right']
    },
    {
      id: 'cheat-f2',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Dollhouse',
      tag: 'Screen Filter \u2022 Unlock: Spend 8 hours with your partner',
      desc: 'Applies the Dollhouse visual screen filter.',
      sequence: ['Down', 'Down', 'Up', 'Right', 'Right', 'Up', 'Left', 'Left', 'Down', 'Right']
    },
    {
      id: 'cheat-f3',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Faded Glory',
      tag: 'Screen Filter \u2022 Unlock: Rob 50 stores with your partner',
      desc: 'Applies the Faded Glory visual screen filter.',
      sequence: ['Down', 'Down', 'Up', 'Right', 'Right', 'Up', 'Left', 'Left', 'Left', 'Right']
    },
    {
      id: 'cheat-f4',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Golden Hour',
      tag: 'Screen Filter \u2022 Unlock: Spend 4 hours holding hands',
      desc: 'Applies the Golden Hour sunset visual filter.',
      sequence: []
    },
    {
      id: 'cheat-f5',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Powdered Sugar',
      tag: 'Screen Filter \u2022 Unlock: Scan all space debris with WAiNK',
      desc: 'Applies the Powdered Sugar visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f6',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Pinhole',
      tag: 'Screen Filter \u2022 Unlock: Clear 25 gang operations with your partner',
      desc: 'Applies the Pinhole camera visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f7',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Neon Jungle',
      tag: 'Screen Filter \u2022 Unlock: Discover all 16 Girlypop Vehicles',
      desc: 'Applies the Neon Jungle visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f8',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Yesteryear',
      tag: 'Screen Filter \u2022 Unlock: Discover the Ridgeway',
      desc: 'Applies the retro Yesteryear visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f9',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Videotape',
      tag: 'Screen Filter \u2022 Unlock: Complete 50 activities with your partner',
      desc: 'Applies the VHS Videotape visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f10',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Dark Mirror',
      tag: 'Screen Filter \u2022 Unlock: Make $500,000 selling vehicles',
      desc: 'Applies the Dark Mirror visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f11',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Migraine',
      tag: 'Screen Filter \u2022 Unlock: Survive 6 minutes with a 6-star wanted level',
      desc: 'Applies the Migraine distortion visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f12',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Bubblegum',
      tag: 'Screen Filter \u2022 Unlock: Find all 24 collectible cards for the Vice City Flamingos',
      desc: 'Applies the Bubblegum pink visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f13',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Fast Forward',
      tag: 'Screen Filter \u2022 Unlock: Complete 50 meditations',
      desc: 'Applies the Fast Forward visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f14',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Fisheye',
      tag: 'Screen Filter \u2022 Unlock: Catch 100 fish',
      desc: 'Applies the Fisheye lens visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f15',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Pixel Art',
      tag: 'Screen Filter \u2022 Unlock: Make $250,000 selling collectibles',
      desc: 'Applies the retro 8-bit Pixel Art visual screen filter.',
      sequence: []
    },
    {
      id: 'cheat-f16',
      category: 'filters',
      categoryLabel: 'Screen Filters',
      title: 'Hellscape',
      tag: 'Screen Filter \u2022 Unlock: Steal 100 cop vehicles',
      desc: 'Applies the Hellscape visual screen filter.',
      sequence: []
    }
  ];

  let currentPlatform = 'all';
  let currentCheatCategory = 'all';

  const dpadIconMap = {
    Up: 'fa-arrow-up',
    Right: 'fa-arrow-right',
    Down: 'fa-arrow-down',
    Left: 'fa-arrow-left'
  };

  function renderPrefixBadges(platform) {
    const psBadge = `<span class="console-prefix ps-prefix"><i class="fa-brands fa-playstation"></i> PS5: Up (Phone) &rarr; Hold L1 + R1</span>`;
    const xbBadge = `<span class="console-prefix xb-prefix"><i class="fa-brands fa-xbox"></i> Xbox: Up (Phone) &rarr; Hold LB + RB</span>`;
    if (platform === 'ps5') return psBadge;
    if (platform === 'xbox') return xbBadge;
    return `${psBadge} ${xbBadge}`;
  }

  function renderCheats() {
    if (!cheatsGrid) return;
    const query = (cheatSearchInput?.value || '').toLowerCase().trim();
    const filtered = cheatsData.filter(c => {
      const matchCat = currentCheatCategory === 'all' || c.category === currentCheatCategory;
      const codeStr = c.sequence.join(', ').toLowerCase();
      const matchQuery = !query ||
        c.title.toLowerCase().includes(query) ||
        c.desc.toLowerCase().includes(query) ||
        c.tag.toLowerCase().includes(query) ||
        codeStr.includes(query);
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      cheatsGrid.innerHTML = `
        <div class="widget-card" style="text-align: center; padding: 36px 20px;">
          <p style="color: var(--text-muted); margin-bottom: 6px;">No cheat codes matching "${escapeHtml(query)}".</p>
          <span style="font-size: 0.8rem; color: var(--text-dim);">Discovered a new D-pad code? Email info@vicecityhub.eu</span>
        </div>
      `;
      return;
    }

    cheatsGrid.innerHTML = filtered.map(c => {
      const hasSequence = Array.isArray(c.sequence) && c.sequence.length > 0;
      const plainCode = hasSequence ? c.sequence.join(', ') : '';
      const dpadBadgesHtml = hasSequence
        ? c.sequence.map(dir => `
          <span class="dpad-badge dpad-${dir.toLowerCase()}">
            <i class="fa-solid ${dpadIconMap[dir] || 'fa-circle'}"></i> ${escapeHtml(dir)}
          </span>
        `).join('')
        : `<span class="cheat-unlock-tag" style="background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3);"><i class="fa-solid fa-lock"></i> Unlock via In-Game Challenge (D-Pad Sequence TBD)</span>`;

      const copyBtnHtml = hasSequence
        ? `<button class="cheat-copy-btn btn-copy-cheat" data-code="${escapeHtml(plainCode)}" title="Copy D-Pad Sequence">
            <i class="fa-solid fa-copy"></i> <span>Copy</span>
          </button>`
        : '';

      return `
        <div class="cheat-row-card">
          <div class="cheat-row-info">
            <div class="cheat-row-title-line">
              <h3 class="cheat-row-title">${escapeHtml(c.title)}</h3>
              <span class="cheat-unlock-tag">${escapeHtml(c.tag)}</span>
            </div>
            <p class="cheat-row-desc">${escapeHtml(c.desc)}</p>
            <div class="cheat-prefix-row">
              ${renderPrefixBadges(currentPlatform)}
            </div>
          </div>

          <div class="cheat-row-sequence-box">
            <div class="dpad-sequence-wrap">
              ${dpadBadgesHtml}
            </div>
            ${copyBtnHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  if (cheatsGrid) {
    renderCheats();

    if (cheatSearchInput) cheatSearchInput.addEventListener('input', renderCheats);

    document.addEventListener('click', (e) => {
      const catPill = e.target.closest('[data-cheat-cat]');
      if (catPill) {
        document.querySelectorAll('[data-cheat-cat]').forEach(p => p.classList.remove('active'));
        catPill.classList.add('active');
        currentCheatCategory = catPill.dataset.cheatCat || 'all';
        renderCheats();
        return;
      }

      const platPill = e.target.closest('[data-platform]');
      if (platPill) {
        document.querySelectorAll('[data-platform]').forEach(p => p.classList.remove('active'));
        platPill.classList.add('active');
        currentPlatform = platPill.dataset.platform || 'all';
        renderCheats();
        return;
      }
    });

    cheatsGrid.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.btn-copy-cheat');
      if (copyBtn) {
        const code = copyBtn.dataset.code;
        navigator.clipboard.writeText(code).then(() => {
          showToast('D-Pad sequence copied to clipboard!');
        });
      }
    });
  }

  if (leafletMapContainer && typeof L !== 'undefined') {

    const mapWidth = 3000;
    const mapHeight = 2200;

    const map = L.map('leonida-leaflet-map', {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 2,
      zoomSnap: 0.5,
      attributionControl: false
    });

    const bounds = [[0, 0], [mapHeight, mapWidth]];

    const mapImage = L.imageOverlay('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80', bounds).addTo(map);

    map.fitBounds(bounds);

    const pois = [
      {
        id: 'poi-1',
        title: 'Starfish Island Gated Mansion',
        category: 'easter',
        catLabel: 'Easter Egg',
        markerClass: 'marker-easter',
        icon: 'fa-skull',
        coords: [1420, 1850],
        desc: 'Reconstructed luxury mansion referencing the classic Tommy Vercetti estate, complete with helicopter pad.'
      },
      {
        id: 'poi-2',
        title: 'The Malibu Club & Strip Strip',
        category: 'nightlife',
        catLabel: 'Strip Club & Nightlife',
        markerClass: 'marker-nightlife',
        icon: 'fa-champagne-glasses',
        coords: [1260, 2180],
        desc: 'Ocean Drive premier nightlife venue, neon lighting, dance floor and VIP rooms.'
      },
      {
        id: 'poi-3',
        title: 'Vice Beach Ammu-Nation & Shooting Range',
        category: 'shops',
        catLabel: 'Stores & Ammu-Nation',
        markerClass: 'marker-shops',
        icon: 'fa-cart-shopping',
        coords: [1100, 2250],
        desc: 'Fully stocked weapon store with underground indoor firing range for weapon challenges.'
      },
      {
        id: 'poi-4',
        title: 'Grassrivers Hidden Airboat Hangar',
        category: 'secrets',
        catLabel: 'Secrets & Garages',
        markerClass: 'marker-secrets',
        icon: 'fa-crosshairs',
        coords: [800, 920],
        desc: 'Secluded wetland outpost housing specialized swamp airboats and rare weapon pickups.'
      },
      {
        id: 'poi-5',
        title: 'Port Gellhorn Industrial Strip',
        category: 'secrets',
        catLabel: 'Secrets & Garages',
        markerClass: 'marker-secrets',
        icon: 'fa-crosshairs',
        coords: [500, 600],
        desc: 'Shipping container yard and chop shop garage used in smuggling operations.'
      },
      {
        id: 'poi-6',
        title: 'Escobar International Airport (Runways & Helipad)',
        category: 'airstrips',
        catLabel: 'Airstrips & Helipads',
        markerClass: 'marker-airstrips',
        icon: 'fa-plane',
        coords: [950, 1420],
        desc: 'Dual runway international airfield with commercial jet and executive jet spawn points.'
      },
      {
        id: 'poi-7',
        title: 'Downtown Helipad Rooftop',
        category: 'airstrips',
        catLabel: 'Airstrips & Helipads',
        markerClass: 'marker-airstrips',
        icon: 'fa-plane',
        coords: [1680, 1620],
        desc: 'Skyscraper roof landing zone providing immediate high-altitude parachute and helicopter access.'
      }
    ];

    let markerLayerGroup = L.layerGroup().addTo(map);

    function renderMapMarkers(filterCat = 'all') {
      markerLayerGroup.clearLayers();

      pois.forEach(poi => {
        if (filterCat !== 'all' && poi.category !== filterCat) return;

        const iconHtml = `<div class="custom-poi-marker ${poi.markerClass}"><i class="fa-solid ${poi.icon}"></i></div>`;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-leaflet-poi',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });

        const marker = L.marker(poi.coords, { icon: customIcon });

        const popupContent = `
          <div>
            <div class="map-popup-category">${escapeHtml(poi.catLabel)}</div>
            <h4 class="map-popup-title">${escapeHtml(poi.title)}</h4>
            <p class="map-popup-desc">${escapeHtml(poi.desc)}</p>
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--text-dim); border-top: 1px solid var(--border-color); padding-top: 4px;">
              Report or update spot: info@vicecityhub.eu
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markerLayerGroup.addLayer(marker);
      });
    }

    renderMapMarkers('all');

    poiPills.forEach(pill => {
      pill.addEventListener('click', () => {
        poiPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.dataset.poi || 'all';
        renderMapMarkers(cat);
      });
    });
  }

  function renderNavbarAuthUser(user) {
    if (!user || !user.username) return;
    const navRight = document.querySelector('.header-nav-right');
    if (navRight) {
      navRight.querySelectorAll('.nav-auth-link').forEach(el => el.remove());
      if (!navRight.querySelector('.nav-user-pill')) {
        const avatarSrc = user.avatar_url || 'assets/brand/favicon-192x192.png';
        const pill = document.createElement('a');
        pill.href = 'profile.html';
        pill.className = 'nav-user-pill';
        pill.title = 'My Profile';
        pill.innerHTML = `
          <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(user.username)}" class="nav-user-avatar">
          <span class="nav-user-name">${escapeHtml(user.username)}</span>
        `;

        const settingsLink = document.createElement('a');
        settingsLink.href = 'settings.html';
        settingsLink.className = 'nav-settings-icon';
        settingsLink.title = 'Account Settings';
        settingsLink.setAttribute('aria-label', 'Account Settings');
        settingsLink.innerHTML = '<i class="fa-solid fa-gear"></i>';

        const mobileBtn = navRight.querySelector('.mobile-menu-btn');
        if (mobileBtn) {
          navRight.insertBefore(pill, mobileBtn);
          navRight.insertBefore(settingsLink, mobileBtn);
        } else {
          navRight.appendChild(pill);
          navRight.appendChild(settingsLink);
        }
      }

      if (user.role === 'admin' && !navRight.querySelector('.nav-admin-icon')) {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.className = 'nav-settings-icon nav-admin-icon';
        adminLink.title = 'Admin Panel';
        adminLink.setAttribute('aria-label', 'Admin Panel');
        adminLink.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: var(--accent-pink);"></i>';
        const mobileBtn = navRight.querySelector('.mobile-menu-btn');
        if (mobileBtn) {
          navRight.insertBefore(adminLink, mobileBtn);
        } else {
          navRight.appendChild(adminLink);
        }
      }
    }

    const postAuthorInput = document.getElementById('post-author-input');
    if (postAuthorInput && !postAuthorInput.value) {
      postAuthorInput.value = user.username;
    }
  }

  try {
    const cachedUser = JSON.parse(localStorage.getItem('vicecityhub_user') || 'null');
    if (cachedUser && cachedUser.username) {
      renderNavbarAuthUser(cachedUser);
    }
  } catch (e) {}

  fetch('/api/auth?action=me', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.authenticated && data.user) {
        localStorage.setItem('vicecityhub_user', JSON.stringify(data.user));
        renderNavbarAuthUser(data.user);
      } else if (data && data.authenticated === false) {
        localStorage.removeItem('vicecityhub_user');

        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('/post.html') || path.endsWith('/submit-discord.html') || path.endsWith('/post') || path.endsWith('/submit-discord')) {
          window.location.href = 'login.html?tab=signup';
        }
      }
    })
    .catch(() => {});

  document.addEventListener('click', (e) => {
    const postLink = e.target.closest('a[href*="post.html"], a[href*="submit-discord.html"]');
    if (postLink) {
      const cached = localStorage.getItem('vicecityhub_user');
      if (!cached) {
        e.preventDefault();
        window.location.href = 'login.html?tab=signup';
        return;
      }
    }

    const mediaBox = e.target.closest('.post-media-container[data-full-img]');
    if (mediaBox) {
      const src = mediaBox.getAttribute('data-full-img');
      if (src && typeof window.openDiscordMediaViewer === 'function') {
        e.preventDefault();
        window.openDiscordMediaViewer(src);
      }
    }
  });

  window.openDiscordMediaViewer = function(imgSrc) {
    if (!imgSrc) return;
    let viewer = document.getElementById('discord-media-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'discord-media-viewer';
      viewer.className = 'discord-media-viewer';
      viewer.innerHTML = `
        <div class="discord-viewer-topbar">
          <span class="discord-viewer-hint">
            <i class="fa-solid fa-up-down-left-right" style="color: var(--accent-pink);"></i> Hold &amp; drag to pan &bull; Scroll or pinch to zoom
          </span>
          <div class="discord-viewer-controls">
            <button type="button" class="discord-viewer-btn" id="dv-zoom-out" title="Zoom Out" aria-label="Zoom Out"><i class="fa-solid fa-minus"></i></button>
            <button type="button" class="discord-viewer-btn" id="dv-zoom-reset" title="Reset Position" aria-label="Reset">100%</button>
            <button type="button" class="discord-viewer-btn" id="dv-zoom-in" title="Zoom In" aria-label="Zoom In"><i class="fa-solid fa-plus"></i></button>
            <button type="button" class="discord-viewer-btn dv-close" id="dv-close-btn" title="Close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <div class="discord-viewer-stage" id="dv-stage">
          <img id="dv-image" class="discord-viewer-img" src="" alt="Full Screen Preview" draggable="false">
        </div>
      `;
      document.body.appendChild(viewer);
    }

    const stage = document.getElementById('dv-stage');
    const img = document.getElementById('dv-image');
    const btnIn = document.getElementById('dv-zoom-in');
    const btnOut = document.getElementById('dv-zoom-out');
    const btnReset = document.getElementById('dv-zoom-reset');
    const btnClose = document.getElementById('dv-close-btn');

    let scale = 1;
    let posX = 0;
    let posY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
      img.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
      if (btnReset) btnReset.textContent = `${Math.round(scale * 100)}%`;
    }

    img.src = imgSrc;
    scale = 1;
    posX = 0;
    posY = 0;
    updateTransform();
    viewer.classList.add('open');

    function closeViewer() {
      viewer.classList.remove('open');
      img.src = '';
    }

    btnClose.onclick = closeViewer;
    btnIn.onclick = () => { scale = Math.min(5, scale + 0.3); updateTransform(); };
    btnOut.onclick = () => { scale = Math.max(0.5, scale - 0.3); updateTransform(); };
    btnReset.onclick = () => { scale = 1; posX = 0; posY = 0; updateTransform(); };

    stage.onmousedown = (e) => {
      if (e.target === stage && scale === 1 && posX === 0 && posY === 0) {
        closeViewer();
        return;
      }
      e.preventDefault();
      isDragging = true;
      startX = e.clientX - posX;
      startY = e.clientY - posY;
      img.style.cursor = 'grabbing';
    };

    window.onmousemove = (e) => {
      if (!isDragging || !viewer.classList.contains('open')) return;
      posX = e.clientX - startX;
      posY = e.clientY - startY;
      updateTransform();
    };

    window.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        img.style.cursor = 'grab';
      }
    };

    stage.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.18 : -0.18;
      scale = Math.max(0.4, Math.min(5, scale + delta));
      updateTransform();
    };

    let pinchDist = 0;
    let pinchScale = 1;

    stage.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - posX;
        startY = e.touches[0].clientY - posY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchScale = scale;
      }
    };

    stage.ontouchmove = (e) => {
      if (isDragging && e.touches.length === 1) {
        e.preventDefault();
        posX = e.touches[0].clientX - startX;
        posY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        scale = Math.max(0.4, Math.min(5, pinchScale * (d / pinchDist)));
        updateTransform();
      }
    };

    stage.ontouchend = () => {
      isDragging = false;
      pinchDist = 0;
    };
  };

  window.openShareBottomPopup = function(shareUrl, shareTitle) {
    let sheet = document.getElementById('share-bottom-popup');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'share-bottom-popup';
      sheet.className = 'share-bottom-popup';
      sheet.innerHTML = `
        <div class="share-popup-inner">
          <div class="share-popup-head">
            <span class="share-popup-copied">
              <i class="fa-solid fa-circle-check" style="color: #34d399;"></i> Link copied! Share on:
            </span>
            <button type="button" class="share-popup-close" id="btn-close-share-popup" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="share-popup-links" id="share-popup-links"></div>
        </div>
      `;
      document.body.appendChild(sheet);
    }

    const linksBox = document.getElementById('share-popup-links');
    const closeBtn = document.getElementById('btn-close-share-popup');
    const encUrl = encodeURIComponent(shareUrl);
    const encText = encodeURIComponent(`${shareTitle} - ${shareUrl}`);
    const encTitle = encodeURIComponent(shareTitle);

    linksBox.innerHTML = `
      <a href="https://api.whatsapp.com/send?text=${encText}" target="_blank" rel="noopener noreferrer" class="share-platform-btn">
        <i class="fa-brands fa-whatsapp" style="color: #25d366;"></i> <span>WhatsApp</span>
      </a>
      <button type="button" class="share-platform-btn" id="share-btn-tiktok">
        <i class="fa-brands fa-tiktok" style="color: #ff0050;"></i> <span>TikTok</span>
      </button>
      <button type="button" class="share-platform-btn" id="share-btn-instagram">
        <i class="fa-brands fa-instagram" style="color: #e1306c;"></i> <span>Instagram</span>
      </button>
      <a href="https://x.com/intent/tweet?url=${encUrl}&text=${encTitle}" target="_blank" rel="noopener noreferrer" class="share-platform-btn">
        <i class="fa-brands fa-x-twitter"></i> <span>X / Twitter</span>
      </a>
      <a href="https://t.me/share/url?url=${encUrl}&text=${encTitle}" target="_blank" rel="noopener noreferrer" class="share-platform-btn">
        <i class="fa-brands fa-telegram" style="color: #24A1DE;"></i> <span>Telegram</span>
      </a>
      <button type="button" class="share-platform-btn" id="share-btn-discord">
        <i class="fa-brands fa-discord" style="color: #5865f2;"></i> <span>Discord</span>
      </button>
      <a href="mailto:?subject=${encTitle}&body=${encText}" class="share-platform-btn">
        <i class="fa-solid fa-envelope" style="color: var(--accent-pink);"></i> <span>Email</span>
      </a>
    `;

    const ttBtn = document.getElementById('share-btn-tiktok');
    if (ttBtn) {
      ttBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`${shareTitle} ${shareUrl} #GTA6 #GTAVI #ViceCityHub`).catch(() => {});
        }
        if (navigator.share) {
          navigator.share({ title: shareTitle, text: `${shareTitle} #GTA6 #GTAVI #ViceCityHub`, url: shareUrl }).catch(() => {});
        } else {
          showToast('Link & tags copied for TikTok!');
          window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer');
        }
      };
    }

    const igBtn = document.getElementById('share-btn-instagram');
    if (igBtn) {
      igBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
        } else {
          window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        }
      };
    }

    const dcBtn = document.getElementById('share-btn-discord');
    if (dcBtn) {
      dcBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`${shareTitle} ${shareUrl}`).catch(() => {});
        }
        showToast('Formatted link copied for Discord!');
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => sheet.classList.remove('show');
    }

    sheet.classList.add('show');
    clearTimeout(window.__sharePopupTimer);
    window.__sharePopupTimer = setTimeout(() => {
      sheet.classList.remove('show');
    }, 9000);
  };

  window.openReportPostPopup = function(postId, postTitle) {
    if (!postId) return;
    const targetPost = posts.find(p => p.id === postId);
    const currentUser = getCurrentUser();
    if (targetPost && currentUser) {
      const isOwner = (
        (currentUser.id && targetPost.user_id && currentUser.id === targetPost.user_id) ||
        (currentUser.username && targetPost.username && currentUser.username.toLowerCase() === targetPost.username.toLowerCase()) ||
        (currentUser.username && targetPost.author && currentUser.username.toLowerCase() === targetPost.author.toLowerCase())
      );
      if (isOwner) {
        showToast('You cannot report your own post.');
        return;
      }
    }

    let sheet = document.getElementById('report-bottom-popup');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'report-bottom-popup';
      sheet.className = 'share-bottom-popup';
      sheet.innerHTML = `
        <div class="share-popup-inner">
          <div class="share-popup-head">
            <span class="share-popup-copied">
              <i class="fa-solid fa-flag" style="color: #f87171;"></i> Report Post to Moderators:
            </span>
            <button type="button" class="share-popup-close" id="btn-close-report-popup" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div id="report-target-label" style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px;"></div>
          <div class="share-popup-links" id="report-reasons-box"></div>
        </div>
      `;
      document.body.appendChild(sheet);
    }

    const labelEl = document.getElementById('report-target-label');
    const reasonsBox = document.getElementById('report-reasons-box');
    const closeBtn = document.getElementById('btn-close-report-popup');
    if (labelEl) labelEl.textContent = `Select a reason for reporting "${postTitle.slice(0, 60)}":`;

    const reasons = [
      'Spam or Scam Link',
      'Fake Leak / Untagged Spoiler',
      'Harassment or Toxicity',
      'Inappropriate / NSFW Content'
    ];

    reasonsBox.innerHTML = reasons.map(r => `
      <button type="button" class="share-platform-btn" data-report-reason="${escapeHtml(r)}">
        <i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i> <span>${escapeHtml(r)}</span>
      </button>
    `).join('');

    reasonsBox.onclick = async (ev) => {
      const btn = ev.target.closest('[data-report-reason]');
      if (!btn) return;
      const reason = btn.getAttribute('data-report-reason');
      sheet.classList.remove('show');
      try {
        const res = await fetch('/api/posts?action=report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ postId, reason })
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          showToast('Report submitted to moderators. Thank you!');
        } else {
          showToast(data && data.error ? data.error : 'Could not submit report. Please try again later.');
        }
      } catch (e) {
        showToast('Network error while reporting post.');
      }
    };

    if (closeBtn) {
      closeBtn.onclick = () => sheet.classList.remove('show');
    }

    sheet.classList.add('show');
  };
});
