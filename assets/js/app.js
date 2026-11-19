/**
 * VICECITYHUB.EU - Master Client-side Controller
 * Modular, vanilla JavaScript - OWASP compliant, zero emojis.
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
  const clipModal = document.getElementById('post-clip-modal');
  const openPostModalBtns = document.querySelectorAll('.trigger-new-post');
  const openDiscordModalBtns = document.querySelectorAll('.trigger-add-discord');
  const openClipModalBtns = document.querySelectorAll('.trigger-post-clip');
  const closeModalBtns = document.querySelectorAll('.trigger-close-modal');

  // Forms
  const postForm = document.getElementById('new-post-form');
  const discordForm = document.getElementById('new-discord-form');
  const clipForm = document.getElementById('new-clip-form');

  // Page Specific Elements
  const feedContainer = document.getElementById('community-feed');
  const filterChips = document.querySelectorAll('.filter-chip');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const discordGrid = document.getElementById('discords-page-grid');
  const discordSearchInput = document.getElementById('discord-search-input');
  const clipsGrid = document.getElementById('clips-page-grid');

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
  openClipModalBtns.forEach(btn => btn.addEventListener('click', () => openModal(clipModal)));

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(postModal);
      closeModal(discordModal);
      closeModal(clipModal);
    });
  });

  [postModal, discordModal, clipModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(postModal);
      closeModal(discordModal);
      closeModal(clipModal);
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
  // FEED & DISCUSSIONS (index.html)
  // ==========================================
  let posts = [
    {
      id: 'post-1',
      category: 'official',
      categoryLabel: 'Official News',
      pinned: true,
      author: 'ViceCityHub Staff',
      username: 'admin',
      badge: 'Official',
      badgeClass: 'mod',
      time: '1 hour ago',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
      title: 'Grand Theft Auto VI is live worldwide. Welcome to Vice City!',
      text: 'Vice City and the state of Leonida are officially open. Share your map routes, hidden weapon caches, and discover community Discord servers below.',
      media: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200&auto=format&fit=crop&q=80',
      likes: 1248,
      isLiked: false,
      bookmarks: 342,
      isBookmarked: false,
      comments: [
        { author: 'TommyV_86', time: '45m ago', text: 'Ocean Beach lighting at sunset is unbelievable.' },
        { author: 'Lucia_Driver', time: '20m ago', text: 'Physics and car handling feel super grounded.' }
      ]
    },
    {
      id: 'post-2',
      category: 'leaks',
      categoryLabel: 'Map & Guides',
      pinned: false,
      author: 'Cartographer_VC',
      username: 'vice_carto',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '2 hours ago',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: 'Full Leonida State Map Breakdown: High-End Vehicle Spawns & Heliports',
      text: 'Consolidated map guide covering Port Gellhorn, Vice Beach, and Grassrivers. In this thread we are compiling all confirmed supercar garages and private airstrips.',
      media: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      likes: 673,
      isLiked: false,
      bookmarks: 189,
      isBookmarked: false,
      comments: [
        { author: 'SpeedDemon99', time: '1h ago', text: 'Confirmed helicopter spawn on the Starfish Island helipad.' }
      ]
    },
    {
      id: 'post-3',
      category: 'clips',
      categoryLabel: 'Clips & Media',
      pinned: false,
      author: 'NeonRacer_XX',
      username: 'neon_racer',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '3 hours ago',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
      title: 'Cruising Ocean Drive at 3 AM with thunderstorm reflections',
      text: 'The wet asphalt puddles and neon light reflections along the strip look incredible in 4K.',
      media: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
      likes: 894,
      isLiked: false,
      bookmarks: 211,
      isBookmarked: false,
      comments: [
        { author: 'RayTracer', time: '2h ago', text: 'Weather engine is top tier.' }
      ]
    },
    {
      id: 'post-4',
      category: 'discussions',
      categoryLabel: 'Discussions',
      pinned: false,
      author: 'RetroGamer88',
      username: 'retrogamer',
      badge: '',
      badgeClass: '',
      time: '4 hours ago',
      avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
      title: 'What radio station is everyone listening to on your first roadtrip?',
      text: 'Flash FM returns along with Wave 103 and brand new hip hop, synth, and Latin radio stations. What are your favorite tracks so far?',
      media: null,
      likes: 421,
      isLiked: false,
      bookmarks: 67,
      isBookmarked: false,
      comments: [
        { author: 'FlashFM_Fan', time: '3h ago', text: 'Flash FM 80s pop tracks hit just as good today.' }
      ]
    }
  ];

  let currentCategory = 'all';

  function renderPostCard(post) {
    const isPinnedClass = post.pinned ? 'pinned' : '';
    const pinBadge = post.pinned ? `<span class="badge-pill mod" style="margin-right: 6px;"><i class="fa-solid fa-thumbtack"></i> Pinned</span>` : '';
    const badgeHtml = post.badge ? `<span class="badge-pill ${post.badgeClass}">${post.badge}</span>` : '';
    const mediaHtml = post.media ? `
      <div class="post-media-container">
        <img src="${escapeHtml(post.media)}" alt="${escapeHtml(post.title)}" loading="lazy">
      </div>
    ` : '';

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
          <div class="post-author-box">
            <img class="post-avatar" src="${escapeHtml(post.avatar)}" alt="${escapeHtml(post.author)}">
            <div class="post-author-info">
              <div class="author-name-row">
                ${pinBadge}
                <span class="author-username">${escapeHtml(post.author)}</span>
                ${badgeHtml}
              </div>
              <span class="post-timestamp">${escapeHtml(post.time)} &bull; @${escapeHtml(post.username)}</span>
            </div>
          </div>
          <span class="post-category-tag">${escapeHtml(post.categoryLabel)}</span>
        </div>

        <h2 class="post-title">${escapeHtml(post.title)}</h2>
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
        <div class="widget-card" style="text-align: center; padding: 40px 20px;">
          <h3 style="font-size: 1.05rem; margin-bottom: 6px;">No discussions found</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">Try searching for another topic or create a new discussion.</p>
          <button class="btn-post trigger-new-post">Create Discussion</button>
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

  if (searchInput) {
    searchInput.addEventListener('input', renderFeed);
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', renderFeed);
  }

  if (feedContainer) {
    feedContainer.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('.btn-like');
      if (likeBtn) {
        const p = posts.find(item => item.id === likeBtn.dataset.id);
        if (p) {
          p.isLiked = !p.isLiked;
          p.likes += p.isLiked ? 1 : -1;
          renderFeed();
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

    renderFeed();
  }

  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('post-title-input').value.trim();
      const category = document.getElementById('post-category-select').value;
      const text = document.getElementById('post-content-input').value.trim();
      const media = document.getElementById('post-media-input').value.trim();

      const catMap = {
        discussions: 'Discussions',
        leaks: 'Map & Guides',
        clips: 'Clips & Media',
        official: 'Official News'
      };

      const newPost = {
        id: `post-${Date.now()}`,
        category: category,
        categoryLabel: catMap[category] || 'Discussions',
        pinned: false,
        author: 'Player_VI',
        username: 'playervi',
        badge: 'Member',
        badgeClass: 'verified',
        time: 'Just now',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        title: title,
        text: text,
        media: media || null,
        likes: 1,
        isLiked: true,
        bookmarks: 0,
        isBookmarked: false,
        comments: []
      };

      posts.unshift(newPost);
      closeModal(postModal);
      postForm.reset();
      renderFeed();
      showToast('Discussion published successfully!');
    });
  }

  // ==========================================
  // DISCORD DIRECTORY (discords.html)
  // ==========================================
  const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

  let discordServers = [
    {
      id: 'dc-1',
      name: 'Vice City Roleplay (VCRP)',
      tag: 'Roleplay',
      inviteUrl: 'https://discord.gg/viceroleplay',
      members: '14,800 Members',
      desc: 'The premier text and voice roleplay server set in Vice City & Leonida. Whitelisted police, cartel, and civilian careers.'
    },
    {
      id: 'dc-2',
      name: 'GTA VI Italian Community',
      tag: 'Italian Community',
      inviteUrl: 'https://discord.gg/gta6italia',
      members: '8,450 Members',
      desc: 'Il principale server Discord italiano dedicato a GTA VI. Organizzazione sessioni serali, ritrovi e canali vocali dedicati.'
    },
    {
      id: 'dc-3',
      name: 'Leonida Heists & Speedruns',
      tag: 'Heists & LFG',
      inviteUrl: 'https://discord.gg/leonidaheists',
      members: '6,200 Members',
      desc: 'Coordinated heist groups, speedrun routes, and verified high-tier players.'
    },
    {
      id: 'dc-4',
      name: 'Vice City Modding & Tools',
      tag: 'Modding & Mapping',
      inviteUrl: 'https://discord.gg/vicemodding',
      members: '9,120 Members',
      desc: 'Technical hub for engine research, coordinate tracking, asset datamining, and map development.'
    }
  ];

  function renderDiscords() {
    if (!discordGrid) return;
    const query = (discordSearchInput?.value || '').toLowerCase().trim();
    const filtered = discordServers.filter(s => {
      return !query || s.name.toLowerCase().includes(query) || s.tag.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      discordGrid.innerHTML = `
        <div class="widget-card" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
          <p style="color: var(--text-muted); margin-bottom: 12px;">No Discord servers matching your query.</p>
          <button class="btn-discord trigger-add-discord">Submit Your Discord</button>
        </div>
      `;
      return;
    }

    discordGrid.innerHTML = filtered.map(s => `
      <div class="discord-item-card">
        <div>
          <div class="discord-item-header">
            <div class="discord-avatar-box">
              <i class="fa-brands fa-discord"></i>
            </div>
            <div>
              <h3 class="discord-name">${escapeHtml(s.name)}</h3>
              <span class="discord-tag">${escapeHtml(s.tag)}</span>
            </div>
          </div>
          <p class="discord-desc">${escapeHtml(s.desc)}</p>
        </div>
        <div class="discord-footer">
          <span class="discord-count"><i class="fa-solid fa-users"></i> ${escapeHtml(s.members)}</span>
          <a href="${escapeHtml(s.inviteUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-discord" style="height: 34px; padding: 0 12px; font-size: 0.8rem;">
            Join Server
          </a>
        </div>
      </div>
    `).join('');
  }

  if (discordGrid) {
    renderDiscords();
    if (discordSearchInput) discordSearchInput.addEventListener('input', renderDiscords);
  }

  if (discordForm) {
    discordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('discord-name-input').value.trim();
      const inviteUrl = document.getElementById('discord-url-input').value.trim();
      const category = document.getElementById('discord-category-select').value;
      const desc = document.getElementById('discord-desc-input').value.trim();

      if (!DISCORD_REGEX.test(inviteUrl)) {
        showToast('Invalid Discord invite! Must be https://discord.gg/... or https://discord.com/invite/...');
        return;
      }

      const catMap = {
        roleplay: 'Roleplay',
        italian: 'Italian Community',
        heists: 'Heists & LFG',
        general: 'General Community',
        modding: 'Modding & Mapping'
      };

      discordServers.unshift({
        id: `dc-${Date.now()}`,
        name: name,
        tag: catMap[category] || 'Community',
        inviteUrl: inviteUrl,
        members: 'Just Added',
        desc: desc
      });

      closeModal(discordModal);
      discordForm.reset();
      renderDiscords();
      showToast('Discord server listed successfully!');
    });
  }

  // ==========================================
  // CLIPS SHOWCASE (clips.html)
  // ==========================================
  let clips = [
    {
      id: 'clip-1',
      title: 'Night Drift down Ocean Beach in 4K',
      author: 'Speedy_VC',
      views: '3.4k views',
      thumb: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1000&auto=format&fit=crop&q=80',
      time: '2 hours ago'
    },
    {
      id: 'clip-2',
      title: 'Helicopter Escape from Grassrivers Swamp Outpost',
      author: 'TacticalPilot',
      views: '1.8k views',
      thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
      time: '5 hours ago'
    },
    {
      id: 'clip-3',
      title: 'Insane Stunt Jump off the Downtown Highway Ramp',
      author: 'ViceJumper',
      views: '5.1k views',
      thumb: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1000&auto=format&fit=crop&q=80',
      time: '1 day ago'
    }
  ];

  function renderClips() {
    if (!clipsGrid) return;
    clipsGrid.innerHTML = clips.map(c => `
      <div class="clip-card">
        <div class="clip-thumb-wrap" onclick="alert('Viewing clip: ${escapeHtml(c.title)}')">
          <img src="${escapeHtml(c.thumb)}" alt="${escapeHtml(c.title)}" loading="lazy">
          <div class="clip-play-badge"><i class="fa-solid fa-play"></i></div>
        </div>
        <div class="clip-body">
          <h3 class="clip-title">${escapeHtml(c.title)}</h3>
          <div class="clip-meta">
            <span>By @${escapeHtml(c.author)}</span>
            <span>${escapeHtml(c.views)} &bull; ${escapeHtml(c.time)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (clipsGrid) {
    renderClips();
  }

  if (clipForm) {
    clipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('clip-title-input').value.trim();
      const thumb = document.getElementById('clip-thumb-input').value.trim();

      clips.unshift({
        id: `clip-${Date.now()}`,
        title: title,
        author: 'You',
        views: '1 view',
        thumb: thumb || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1000&auto=format&fit=crop&q=80',
        time: 'Just now'
      });

      closeModal(clipModal);
      clipForm.reset();
      renderClips();
      showToast('Clip posted to community!');
    });
  }
});
