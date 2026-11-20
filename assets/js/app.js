/**
 * VICECITYHUB.EU - Master Client-side Controller
 * Modular, vanilla JavaScript - OWASP compliant, zero emojis.
 * Supports: Clean text feed, Interactive Leaflet Leonida map, GTA VI Cheats, and Discord filters.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Common Elements
  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer');

  // Modals
  const postModal = document.getElementById('create-post-modal');
  const discordModal = document.getElementById('submit-discord-modal');
  const openPostModalBtns = document.querySelectorAll('.trigger-new-post');
  const openDiscordModalBtns = document.querySelectorAll('.trigger-add-discord');
  const closeModalBtns = document.querySelectorAll('.trigger-close-modal');

  // Forms
  const postForm = document.getElementById('new-post-form');
  const discordForm = document.getElementById('new-discord-form');

  // Page-specific containers
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

  // Helper Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast Function
  function showToast(message) {
    if (!toast) return;
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Modal Controllers
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

  // Mobile Drawer
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

  // ==========================================
  // 1. CLEAN TEXT-ONLY FEED (index.html - LIVE BACKEND, NO PREVIEW POSTS)
  // ==========================================
  let posts = [];

  let currentCategory = 'all';

  function renderPostCard(post) {
    const isPinnedClass = post.pinned ? 'pinned' : '';
    const pinBadge = post.pinned ? `<span class="badge-pill mod" style="margin-right: 6px;"><i class="fa-solid fa-thumbtack"></i> Pinned</span>` : '';
    const badgeHtml = post.badge ? `<span class="badge-pill ${post.badgeClass}">${post.badge}</span>` : '';

    const commentsHtml = post.comments.map(c => `
      <div class="single-comment">
        <div class="single-comment-meta">
          <span class="author">${escapeHtml(c.author)}</span> &bull; <span>${escapeHtml(c.time)}</span>
        </div>
        <p class="single-comment-text">${escapeHtml(c.text)}</p>
      </div>
    `).join('');

    return `
      <article class="post-card ${isPinnedClass}" data-id="${post.id}">
        <div class="post-header">
          <a href="profile.html?u=${encodeURIComponent(post.username || post.author)}" class="post-author-box" title="View @${escapeHtml(post.username)} profile">
            <img class="post-avatar" src="${escapeHtml(post.avatar)}" alt="${escapeHtml(post.author)}">
            <div class="post-author-info">
              <div class="author-name-row">
                ${pinBadge}
                <span class="author-username">${escapeHtml(post.author)}</span>
                ${badgeHtml}
              </div>
              <span class="post-timestamp">${escapeHtml(post.time)} &bull; @${escapeHtml(post.username)}</span>
            </div>
          </a>
          <span class="post-category-tag">${escapeHtml(post.categoryLabel)}</span>
        </div>

        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <p class="post-text">${escapeHtml(post.text)}</p>

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
            <button class="action-btn btn-share" data-id="${post.id}">
              <i class="fa-solid fa-share-nodes"></i> Share
            </button>
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
            ${commentsHtml}
          </div>
        </div>
      </article>
    `;
  }

  function renderFeed() {
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
          p.likes += p.isLiked ? 1 : -1;
          renderFeed();
          fetch('/api/posts?action=like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: p.id })
          }).catch(() => {});
        }
        return;
      }

      const bookmarkBtn = e.target.closest('.btn-bookmark');
      if (bookmarkBtn) {
        const p = posts.find(item => item.id === bookmarkBtn.dataset.id);
        if (p) {
          p.isBookmarked = !p.isBookmarked;
          renderFeed();
          showToast(p.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
          fetch('/api/posts?action=bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: p.id })
          }).catch(() => {});
        }
        return;
      }

      const commentsToggle = e.target.closest('.btn-comments-toggle');
      if (commentsToggle) {
        const drawer = document.getElementById(`comments-${commentsToggle.dataset.id}`);
        if (drawer) drawer.classList.toggle('open');
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
          p.comments.unshift({ author: 'You', time: 'Just now', text: val });
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
        navigator.clipboard.writeText(`${window.location.origin}/#${shareBtn.dataset.id}`).then(() => {
          showToast('Link copied to clipboard');
        });
        return;
      }
    });

    // Load any custom user posts from localStorage + API
    try {
      const savedPosts = JSON.parse(localStorage.getItem('vicecityhub_custom_posts') || '[]');
      if (Array.isArray(savedPosts) && savedPosts.length > 0) {
        posts = [...savedPosts, ...posts];
      }
    } catch (e) {}

    renderFeed();

    fetch('/api/posts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.posts) && data.posts.length > 0) {
          const existingIds = new Set(posts.map(p => p.id));
          const fresh = data.posts.filter(p => !existingIds.has(p.id)).map(p => ({
            ...p,
            time: p.time || 'Recently',
            avatar: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            comments: Array.isArray(p.comments) ? p.comments : []
          }));
          if (fresh.length > 0) {
            posts = [...fresh, ...posts];
            renderFeed();
          }
        }
      })
      .catch(() => {});
  }

  // Dedicated Post Creation Page (post.html)
  const dedicatedPostForm = document.getElementById('dedicated-post-form');
  const postContentInput = document.getElementById('post-content-input');
  const postCharCounter = document.getElementById('post-char-counter');

  if (postContentInput && postCharCounter) {
    postContentInput.addEventListener('input', () => {
      postCharCounter.textContent = `${postContentInput.value.length} / 2000`;
    });
  }

  if (dedicatedPostForm) {
    dedicatedPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = document.getElementById('website_url_hp')?.value || '';
      if (hp.trim().length > 0) return;

      const authorRaw = (document.getElementById('post-author-input')?.value || '').trim();
      const author = authorRaw.replace(/[^\w\s-]/g, '').slice(0, 24) || 'Player_VI';
      const username = author.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'playervi';
      const title = document.getElementById('post-title-input').value.trim();
      const category = document.getElementById('post-category-select').value;
      const text = document.getElementById('post-content-input').value.trim();
      const mediaUrl = (document.getElementById('post-media-input')?.value || '').trim();

      const catMap = {
        discussions: 'Discussions',
        leaks: 'Map',
        official: 'Official News'
      };

      const newPost = {
        id: `post-${Date.now()}`,
        category: category,
        categoryLabel: catMap[category] || 'Discussions',
        pinned: false,
        author: author,
        username: username,
        badge: 'Member',
        badgeClass: 'verified',
        time: 'Just now',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        title: title,
        text: text,
        mediaUrl: mediaUrl,
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
          body: JSON.stringify({
            author,
            title,
            category,
            text,
            mediaUrl,
            website_url_hp: hp,
            cfTurnstileResponse
          })
        });
        if (res.status === 403 || res.status === 400 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Security verification failed. Please retry.');
          if (window.turnstile) window.turnstile.reset();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.post) {
            newPost.id = data.post.id || newPost.id;
          }
        }
      } catch (err) {}

      try {
        const savedPosts = JSON.parse(localStorage.getItem('vicecityhub_custom_posts') || '[]');
        savedPosts.unshift(newPost);
        localStorage.setItem('vicecityhub_custom_posts', JSON.stringify(savedPosts.slice(0, 30)));
      } catch (err) {}

      showToast('Post published! Redirecting to Feed...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    });
  }

  // ==========================================
  // 2. DISCORD DIRECTORY & FILTERS (discords.html - LIVE BACKEND, NO PREVIEW SERVERS)
  // ==========================================
  const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

  let discordServers = [];

  function renderDiscords() {
    if (!discordGrid) return;
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
      discordGrid.innerHTML = `
        <div class="empty-feed-state">
          <h3 style="font-size: 1.02rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No Discord servers listed yet</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Have a GTA VI Roleplay, Heist, or Community server? Share it in the directory.</p>
          <a href="submit-discord.html" class="btn-discord" style="height: 40px; padding: 0 18px; text-decoration: none;">
            <i class="fa-solid fa-plus"></i> Share Your Discord Server
          </a>
        </div>
      `;
      return;
    }

    discordGrid.innerHTML = filtered.map(s => `
      <div class="discord-list-item">
        <div class="discord-list-left">
          <div class="discord-avatar-box">
            <i class="fa-brands fa-discord"></i>
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
    `).join('');
  }

  if (discordGrid) {
    try {
      const savedDiscords = JSON.parse(localStorage.getItem('vicecityhub_custom_discords') || '[]');
      if (Array.isArray(savedDiscords) && savedDiscords.length > 0) {
        discordServers = [...savedDiscords, ...discordServers];
      }
    } catch (e) {}

    renderDiscords();

    fetch('/api/discords')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.servers) && data.servers.length > 0) {
          const existingIds = new Set(discordServers.map(s => s.id));
          const fresh = data.servers.filter(s => !existingIds.has(s.id));
          if (fresh.length > 0) {
            discordServers = [...fresh, ...discordServers];
            renderDiscords();
          }
        }
      })
      .catch(() => {});

    if (discordSearchInput) discordSearchInput.addEventListener('input', renderDiscords);
    if (discordCountryFilter) discordCountryFilter.addEventListener('change', renderDiscords);
    if (discordTypeFilter) discordTypeFilter.addEventListener('change', renderDiscords);
  }

  // Dedicated Discord Server Submission Page (submit-discord.html)
  const dedicatedDiscordForm = document.getElementById('dedicated-discord-form');
  if (dedicatedDiscordForm) {
    dedicatedDiscordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hp = document.getElementById('discord_hp_url')?.value || '';
      if (hp.trim().length > 0) return;

      const name = document.getElementById('discord-name-input').value.trim();
      const inviteUrl = document.getElementById('discord-url-input').value.trim();
      const category = document.getElementById('discord-category-select').value;
      const country = document.getElementById('discord-country-select')?.value || 'intl';
      const desc = document.getElementById('discord-desc-input').value.trim();

      if (!DISCORD_REGEX.test(inviteUrl)) {
        showToast('Invalid Discord invite! Must be https://discord.gg/... or https://discord.com/invite/...');
        return;
      }

      const catMap = {
        roleplay: 'Roleplay',
        heists: 'Heists & LFG',
        general: 'General Community',
        modding: 'Modding & Mapping'
      };

      const countryMap = {
        intl: 'International',
        it: 'Italy',
        es: 'Spain / Latam',
        de: 'Germany',
        fr: 'France'
      };

      const newServer = {
        id: `dc-${Date.now()}`,
        name: name,
        tag: catMap[category] || 'Community',
        category: category,
        country: country,
        countryLabel: countryMap[country] || 'International',
        inviteUrl: inviteUrl,
        members: 'Just Added',
        desc: desc
      };

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
            discord_hp_url: hp,
            cfTurnstileResponse
          })
        });
        if (res.status === 403 || res.status === 400 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Security verification failed. Please retry.');
          if (window.turnstile) window.turnstile.reset();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.server) {
            newServer.id = data.server.id || newServer.id;
          }
        }
      } catch (err) {}

      try {
        const savedDiscords = JSON.parse(localStorage.getItem('vicecityhub_custom_discords') || '[]');
        savedDiscords.unshift(newServer);
        localStorage.setItem('vicecityhub_custom_discords', JSON.stringify(savedDiscords.slice(0, 30)));
      } catch (err) {}

      showToast('Discord server listed! Redirecting to Directory...');
      setTimeout(() => {
        window.location.href = 'discords.html';
      }, 700);
    });
  }

  // ==========================================
  // 3. GTA VI CHEAT CODES (PS5 & XBOX SERIES X/S ONLY - D-PAD SEQUENCES)
  // ==========================================
  const cheatsData = [
    {
      id: 'cheat-1',
      title: '$250,000',
      tag: 'Quick Cheat (Story Unlock)',
      desc: 'Instantly receive $250,000. Unlocked and ready to use right after completing the final story mission.',
      sequence: ['Up', 'Right', 'Down', 'Left', 'Up', 'Left', 'Down', 'Right']
    },
    {
      id: 'cheat-2',
      title: 'Unlimited Focus',
      tag: 'Quick Cheat (Story Unlock)',
      desc: 'Never run out of Focus. Unlocked and ready to use right after completing the final story mission.',
      sequence: ['Down', 'Up', 'Up', 'Down', 'Up', 'Down', 'Up', 'Down', 'Up', 'Right']
    },
    {
      id: 'cheat-3',
      title: 'Attack Force',
      tag: 'Quick Cheat (Story Unlock)',
      desc: 'Bullets and melee attacks blast targets away upon impact. Unlocked after the final story mission.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Down', 'Up', 'Down']
    },
    {
      id: 'cheat-4',
      title: 'Weather Cycle',
      tag: 'Quick Cheat (Story Unlock)',
      desc: 'Changes current weather conditions and sky colors across Vice City and Leonida.',
      sequence: ['Down', 'Right', 'Up', 'Down', 'Right', 'Up', 'Right']
    },
    {
      id: 'cheat-5',
      title: 'Exploding Balls',
      tag: 'Combat Pattern',
      desc: 'Projectiles trigger explosive impact blasts. Note: Differs from Attack Force by only the final input.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Down', 'Up', 'Up']
    },
    {
      id: 'cheat-6',
      title: 'Vehicle Force',
      tag: 'Vehicle Combat',
      desc: 'Grants heavy ramming force to your vehicle on collision. Differs from Attack Force by one command.',
      sequence: ['Down', 'Up', 'Left', 'Left', 'Right', 'Down', 'Down', 'Right', 'Down']
    },
    {
      id: 'cheat-7',
      title: 'Standard Ammo Refill',
      tag: 'Ammo Pattern',
      desc: 'Follows the universal Ammo prefix (Down, Up, Right, Down, Left, Left, Up) to restore weapon ammunition.',
      sequence: ['Down', 'Up', 'Right', 'Down', 'Left', 'Left', 'Up', 'Right', 'Down']
    },
    {
      id: 'cheat-8',
      title: 'Vehicle Spawn Pattern',
      tag: 'Vehicle Pattern',
      desc: 'All vehicle spawn cheats begin with the universal prefix: Left, Up, Right, Down.',
      sequence: ['Left', 'Up', 'Right', 'Down', 'Left', 'Up', 'Right', 'Up']
    }
  ];

  let currentPlatform = 'all';

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
      const codeStr = c.sequence.join(', ').toLowerCase();
      return !query ||
        c.title.toLowerCase().includes(query) ||
        c.desc.toLowerCase().includes(query) ||
        c.tag.toLowerCase().includes(query) ||
        codeStr.includes(query);
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
      const plainCode = c.sequence.join(', ');
      const dpadBadgesHtml = c.sequence.map(dir => `
        <span class="dpad-badge dpad-${dir.toLowerCase()}">
          <i class="fa-solid ${dpadIconMap[dir] || 'fa-circle'}"></i> ${escapeHtml(dir)}
        </span>
      `).join('');

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
            <button class="cheat-copy-btn btn-copy-cheat" data-code="${escapeHtml(plainCode)}" title="Copy D-Pad Sequence">
              <i class="fa-solid fa-copy"></i> <span>Copy</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  if (cheatsGrid) {
    renderCheats();

    if (cheatSearchInput) cheatSearchInput.addEventListener('input', renderCheats);

    platformPills.forEach(pill => {
      pill.addEventListener('click', () => {
        platformPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentPlatform = pill.dataset.platform || 'all';
        renderCheats();
      });
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

  // ==========================================
  // 4. LEAFLET INTERACTIVE LEONIDA MAP (map.html)
  // ==========================================
  if (leafletMapContainer && typeof L !== 'undefined') {
    // Coordinate dimensions
    const mapWidth = 3000;
    const mapHeight = 2200;

    // Use Leaflet Simple CRS for gaming map
    const map = L.map('leonida-leaflet-map', {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 2,
      zoomSnap: 0.5,
      attributionControl: false
    });

    const bounds = [[0, 0], [mapHeight, mapWidth]];

    // Map base background layer (Dark coordinate canvas with Leonida mapping base)
    const mapImage = L.imageOverlay('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80', bounds).addTo(map);

    map.fitBounds(bounds);

    // Points of Interest (POI) Database
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

  // ==========================================
  // 5. NAVBAR USER PROFILE & AUTH STATE SYNC
  // ==========================================
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
    }

    // Also pre-fill author input on post.html if present
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
      }
    })
    .catch(() => {});
});
