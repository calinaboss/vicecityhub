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
  // 1. CLEAN TEXT-ONLY FEED (index.html)
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
      title: 'Grand Theft Auto VI is live worldwide. Welcome to Vice City & Leonida!',
      text: 'The journey begins across Ocean Drive, Grassrivers, and Port Gellhorn. Share your discoveries, map coordinates, and find active community Discord servers. For submissions, contact info@vicecityhub.eu.',
      likes: 1248,
      isLiked: false,
      bookmarks: 342,
      isBookmarked: false,
      comments: [
        { author: 'TommyV_86', time: '45m ago', text: 'Ocean Beach lighting at sunset is unbelievable.' },
        { author: 'Lucia_Driver', time: '20m ago', text: 'Handling model on sports cars feels super responsive.' }
      ]
    },
    {
      id: 'post-2',
      category: 'leaks',
      categoryLabel: 'Map',
      pinned: false,
      author: 'Cartographer_VC',
      username: 'vice_carto',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '2 hours ago',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: 'Leonida State Map Breakdown: Supercar Spawns & Heliports',
      text: 'We are mapping all confirmed private airstrips and vehicle garages across the state. Check out the new interactive map on our site to explore the locations.',
      likes: 673,
      isLiked: false,
      bookmarks: 189,
      isBookmarked: false,
      comments: [
        { author: 'SpeedDemon99', time: '1h ago', text: 'Confirmed the helicopter spawn on Starfish Island.' }
      ]
    },
    {
      id: 'post-3',
      category: 'discussions',
      categoryLabel: 'Discussions',
      pinned: false,
      author: 'RetroGamer88',
      username: 'retrogamer',
      badge: '',
      badgeClass: '',
      time: '3 hours ago',
      avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
      title: 'What radio station is everyone listening to on your first roadtrip?',
      text: 'Flash FM returns along with Wave 103 and several brand new synth, rap, and Latin radio stations. Share your favorite tracks so far!',
      likes: 421,
      isLiked: false,
      bookmarks: 67,
      isBookmarked: false,
      comments: [
        { author: 'FlashFM_Fan', time: '2h ago', text: 'Flash FM 80s pop tracks hit just as good today.' }
      ]
    },
    {
      id: 'post-4',
      category: 'discussions',
      categoryLabel: 'Discussions',
      pinned: false,
      author: 'NeonRacer_XX',
      username: 'neon_racer',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '4 hours ago',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
      title: 'Night drift down Ocean Beach during a heavy thunderstorm',
      text: 'The wet asphalt reflections and dynamic lightning strikes make nighttime pursuits in Vice City look like a cinematic movie.',
      likes: 894,
      isLiked: false,
      bookmarks: 211,
      isBookmarked: false,
      comments: [
        { author: 'RayTracer', time: '3h ago', text: 'Weather engine is next level.' }
      ]
    },
    {
      id: 'post-5',
      category: 'official',
      categoryLabel: 'Official News',
      pinned: false,
      author: 'ViceCityHub Staff',
      username: 'admin',
      badge: 'Official',
      badgeClass: 'mod',
      time: '5 hours ago',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
      title: 'Title Update 1.02 Overview: Performance Optimizations & Bug Fixes',
      text: 'Rockstar has released hotfix 1.02 addressing framerate drops near Ocean Drive neon districts and improving server matchmaking for heist squads. Full patch notes verified on our news thread.',
      likes: 1102,
      isLiked: false,
      bookmarks: 310,
      isBookmarked: false,
      comments: [
        { author: 'Techie_Dan', time: '4h ago', text: 'DLSS 3.5 frame gen is buttery smooth now.' }
      ]
    },
    {
      id: 'post-6',
      category: 'leaks',
      categoryLabel: 'Map',
      pinned: false,
      author: 'LeonidaScout',
      username: 'scout_leonida',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '6 hours ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      title: 'Everglades Swamp Outpost Hidden Cache Coordinates',
      text: 'Found a sunken patrol boat at coordinates [25.7617, -80.1918] containing body armor, an assault rifle, and 5000 cash. Open map.vicecityhub.eu to check the exact marker.',
      likes: 745,
      isLiked: false,
      bookmarks: 412,
      isBookmarked: false,
      comments: [
        { author: 'SwampRat', time: '5h ago', text: 'Confirmed, watch out for the gators around the hull.' }
      ]
    },
    {
      id: 'post-7',
      category: 'discussions',
      categoryLabel: 'Discussions',
      pinned: false,
      author: 'ViceResident',
      username: 'vicelocal',
      badge: '',
      badgeClass: '',
      time: '8 hours ago',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      title: 'What property or safehouse are you saving up for first?',
      text: 'Starfish Island villas have private docks for speedboats, while Downtown penthouses have private helipads. Which one are you planning to buy first once your bank balance allows?',
      likes: 588,
      isLiked: false,
      bookmarks: 140,
      isBookmarked: false,
      comments: [
        { author: 'BoatKing', time: '6h ago', text: 'Villas on Starfish Island for sure.' },
        { author: 'SkyscraperFan', time: '7h ago', text: 'Helipad penthouse is unbeatable for fast travel.' }
      ]
    },
    {
      id: 'post-8',
      category: 'official',
      categoryLabel: 'Official News',
      pinned: false,
      author: 'ViceCityHub Staff',
      username: 'admin',
      badge: 'Official',
      badgeClass: 'mod',
      time: '12 hours ago',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
      title: 'Weekly Community Spotlight: Top Roleplay Servers and Heist Crews',
      text: 'Check out the refreshed GTA VI Discords directory to join verified roleplay servers, modding hubs, and heist teams with active voice channels.',
      likes: 820,
      isLiked: false,
      bookmarks: 230,
      isBookmarked: false,
      comments: [
        { author: 'HeistLeader', time: '10h ago', text: 'Found our 4th player within 10 minutes on the directory.' }
      ]
    }
  ];

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
        author: 'Player_VI',
        username: 'playervi',
        badge: 'Member',
        badgeClass: 'verified',
        time: 'Just now',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        title: title,
        text: text,
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
  // 2. DISCORD DIRECTORY & FILTERS (discords.html)
  // ==========================================
  const DISCORD_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

  let discordServers = [
    {
      id: 'dc-1',
      name: 'Vice City Roleplay (VCRP)',
      tag: 'Roleplay',
      category: 'roleplay',
      country: 'intl',
      countryLabel: 'International',
      inviteUrl: 'https://discord.gg/viceroleplay',
      members: '14,800 Members',
      desc: 'The premier text and voice roleplay server set in Vice City & Leonida. Whitelisted police, cartel, and civilian careers.'
    },
    {
      id: 'dc-2',
      name: 'GTA VI Italian Community',
      tag: 'Italian Community',
      category: 'roleplay',
      country: 'it',
      countryLabel: 'Italy',
      inviteUrl: 'https://discord.gg/gta6italia',
      members: '8,450 Members',
      desc: 'Il principale server Discord italiano dedicato a GTA VI. Organizzazione sessioni serali, ritrovi e canali vocali dedicati.'
    },
    {
      id: 'dc-3',
      name: 'Leonida Heists & Speedruns',
      tag: 'Heists & LFG',
      category: 'heists',
      country: 'intl',
      countryLabel: 'International',
      inviteUrl: 'https://discord.gg/leonidaheists',
      members: '6,200 Members',
      desc: 'Coordinated heist groups, speedrun routes, and verified high-tier players.'
    },
    {
      id: 'dc-4',
      name: 'GTA 6 Espana & Latam',
      tag: 'Spanish Community',
      category: 'general',
      country: 'es',
      countryLabel: 'Spain / Latam',
      inviteUrl: 'https://discord.gg/gta6es',
      members: '5,300 Members',
      desc: 'Comunidad hispanohablante de GTA 6 para organizar partidas, noticias y servidores de rol.'
    },
    {
      id: 'dc-5',
      name: 'Vice City Modding & Tools',
      tag: 'Modding & Mapping',
      category: 'modding',
      country: 'intl',
      countryLabel: 'International',
      inviteUrl: 'https://discord.gg/vicemodding',
      members: '9,120 Members',
      desc: 'Technical hub for engine research, coordinate tracking, asset datamining, and map development.'
    },
    {
      id: 'dc-6',
      name: 'GTA VI Deutschland',
      tag: 'German Community',
      category: 'general',
      country: 'de',
      countryLabel: 'Germany',
      inviteUrl: 'https://discord.gg/gta6de',
      members: '3,800 Members',
      desc: 'Die deutsche GTA 6 Community fuer Crews, Heists und Rollenspiel.'
    },
    {
      id: 'dc-7',
      name: 'Vice City RP Italia - Leonida Life',
      tag: 'Italian RP',
      category: 'roleplay',
      country: 'it',
      countryLabel: 'Italy',
      inviteUrl: 'https://discord.gg/leonidalife',
      members: '11,200 Members',
      desc: 'Server Roleplay italiano con script personalizzati, whitelist attiva e oltre 40 fazioni tra polizia, mafie e cittadini.'
    },
    {
      id: 'dc-8',
      name: 'GTA VI France & Francophonie',
      tag: 'French Community',
      category: 'general',
      country: 'fr',
      countryLabel: 'France',
      inviteUrl: 'https://discord.gg/gta6fr',
      members: '4,100 Members',
      desc: 'Communaute francophone active pour suivre les actualites, trouver des joueurs et rejoindre des crews.'
    }
  ];

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
        <div class="widget-card" style="text-align: center; padding: 40px 20px;">
          <p style="color: var(--text-muted); margin-bottom: 12px;">No Discord servers matching your search.</p>
          <button class="btn-discord trigger-add-discord"><i class="fa-solid fa-plus"></i> Submit Your Discord</button>
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
    renderDiscords();
    if (discordSearchInput) discordSearchInput.addEventListener('input', renderDiscords);
    if (discordCountryFilter) discordCountryFilter.addEventListener('change', renderDiscords);
    if (discordTypeFilter) discordTypeFilter.addEventListener('change', renderDiscords);
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
        category: category,
        country: category === 'italian' ? 'it' : 'intl',
        countryLabel: category === 'italian' ? 'Italy' : 'International',
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
});
