/**
 * VICECITYHUB.EU - Community Hub & Discord Directory Controller
 * Modern vanilla JS - zero dependencies, zero emojis, OWASP secured.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const filterChips = document.querySelectorAll('.filter-chip');
  const feedContainer = document.getElementById('community-feed');
  const discordSection = document.getElementById('discord-servers-section');
  const discordGrid = document.getElementById('discord-servers-grid');
  const searchInput = document.getElementById('search-input');
  
  // Modals
  const newPostModal = document.getElementById('create-post-modal');
  const newDiscordModal = document.getElementById('submit-discord-modal');
  const openPostModalBtns = document.querySelectorAll('.trigger-new-post');
  const openDiscordModalBtns = document.querySelectorAll('.trigger-add-discord');
  const closeModalBtns = document.querySelectorAll('.trigger-close-modal');
  
  // Forms
  const postForm = document.getElementById('new-post-form');
  const discordForm = document.getElementById('new-discord-form');
  
  // Toast & Lightbox
  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeLightboxBtn = document.getElementById('close-lightbox');
  
  // Mobile Drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer');

  // OWASP URL Sanitizer & Validator for Discord Invites
  const DISCORD_INVITE_REGEX = /^https:\/\/(discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord\.com\/invite\/[a-zA-Z0-9_-]{2,32})$/;

  function isValidDiscordInvite(url) {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim();
    if (cleanUrl.length > 80) return false;
    return DISCORD_INVITE_REGEX.test(cleanUrl);
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

  // Initial Curated GTA VI Discord Servers
  let discordServers = [
    {
      id: 'dc-1',
      name: 'Vice City Roleplay (VCRP)',
      tag: 'Roleplay',
      category: 'roleplay',
      inviteUrl: 'https://discord.gg/viceroleplay',
      members: '14,800 Members',
      iconClass: 'fa-masks-theater',
      desc: 'The premier text and voice roleplay server set in Vice City & Leonida. Whitelisted police, emergency, cartel, and civilian careers.'
    },
    {
      id: 'dc-2',
      name: 'GTA VI Italian Community',
      tag: 'Italian Community',
      category: 'italian',
      inviteUrl: 'https://discord.gg/gta6italia',
      members: '8,450 Members',
      iconClass: 'fa-globe',
      desc: 'Il principale server Discord italiano dedicato a Grand Theft Auto VI. Organizzazione sessioni serali, trucchi, ritrovi e canali vocali dedicati.'
    },
    {
      id: 'dc-3',
      name: 'Leonida Heists & Speedruns',
      tag: 'Heists & LFG',
      category: 'heists',
      inviteUrl: 'https://discord.gg/leonidaheists',
      members: '6,200 Members',
      iconClass: 'fa-crosshairs',
      desc: 'Competitive group for high-stakes raid coordination, world-record speedrunning routes, and finding experienced co-op teammates.'
    },
    {
      id: 'dc-4',
      name: 'Vice City Modding & Mapping',
      tag: 'Modding & Tools',
      category: 'modding',
      inviteUrl: 'https://discord.gg/vicemodding',
      members: '9,120 Members',
      iconClass: 'fa-screwdriver-wrench',
      desc: 'Technical hub for engine research, coordinate tracking, asset datamining, and collaborative interactive map development.'
    }
  ];

  // Initial Posts Data (No Crews, Authentic Discussions)
  let posts = [
    {
      id: 'post-1',
      category: 'official',
      categoryLabel: 'Official Hub',
      categoryIcon: 'fa-bullhorn',
      pinned: true,
      author: 'ViceCityHub Staff',
      username: 'admin',
      badge: 'Official Staff',
      badgeClass: 'mod',
      time: '1 hour ago',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
      title: 'Grand Theft Auto VI is officially released worldwide. Welcome to Vice City!',
      text: 'The wait is finally over! Vice City and Leonida are live. Use ViceCityHub to discuss locations, share your favorite moments, and discover GTA VI Discord servers. Please read the community guidelines before posting.',
      media: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'Launch Showcase',
      likes: 1248,
      isLiked: false,
      bookmarks: 342,
      isBookmarked: false,
      comments: [
        { author: 'TommyV_86', time: '45m ago', text: 'Lighting across Ocean Drive at sunset looks incredible.' },
        { author: 'Lucia_Driver', time: '20m ago', text: 'Handling model on classic sports cars feels so responsive.' }
      ]
    },
    {
      id: 'post-2',
      category: 'leaks',
      categoryLabel: 'Map & Guides',
      categoryIcon: 'fa-map-location-dot',
      pinned: false,
      author: 'Cartographer_VC',
      username: 'vice_carto',
      badge: 'Verified Guide',
      badgeClass: 'verified',
      time: '2 hours ago',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: 'Full Leonida State Map Breakdown: High-End Vehicle Spawns & Heliports',
      text: 'Here is our consolidated map guide covering Port Gellhorn, Vice Beach, and Grassrivers. We are compiling confirmed supercar garages and private airstrips for fast travel across the state.',
      media: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'Map Overlay Preview',
      likes: 673,
      isLiked: false,
      bookmarks: 189,
      isBookmarked: false,
      comments: [
        { author: 'SpeedDemon99', time: '1h ago', text: 'Can confirm the helicopter spawn on the Starfish Island helipad.' }
      ]
    },
    {
      id: 'post-3',
      category: 'clips',
      categoryLabel: 'Clips & Media',
      categoryIcon: 'fa-film',
      pinned: false,
      author: 'NeonRacer_XX',
      username: 'neon_racer',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '3 hours ago',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
      title: 'Cruising Ocean Drive at 3 AM during a thunderstorm',
      text: 'The wet asphalt puddles and neon light bounce along the strip are mind-blowing. Check out this still capture from my 4K stream.',
      media: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
      mediaType: '4K Ultra Quality Capture',
      likes: 894,
      isLiked: false,
      bookmarks: 211,
      isBookmarked: false,
      comments: [
        { author: 'RayTracer', time: '2h ago', text: 'Best looking weather engine in gaming history.' }
      ]
    },
    {
      id: 'post-4',
      category: 'discussions',
      categoryLabel: 'Discussions',
      categoryIcon: 'fa-comments',
      pinned: false,
      author: 'RetroGamer88',
      username: 'retrogamer',
      badge: '',
      badgeClass: '',
      time: '4 hours ago',
      avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
      title: 'What radio station is everyone listening to on your first roadtrip?',
      text: 'Flash FM returns along with Wave 103 and several brand new hip hop, synth, and Latin radio stations. Share your favorite tracks and DJ moments so far.',
      media: null,
      likes: 421,
      isLiked: false,
      bookmarks: 67,
      isBookmarked: false,
      comments: [
        { author: 'FlashFM_Fan', time: '3h ago', text: 'Flash FM forever. The 80s pop tracks hit just as good today.' }
      ]
    }
  ];

  let currentCategory = 'all';

  // Render Post Card HTML
  function renderPostCard(post) {
    const isPinnedClass = post.pinned ? 'pinned' : '';
    const pinBadge = post.pinned ? `
      <span class="badge-pill mod" style="margin-right: 6px;">
        <i class="fa-solid fa-thumbtack"></i> Pinned
      </span>
    ` : '';

    const badgeHtml = post.badge ? `
      <span class="badge-pill ${post.badgeClass}">${post.badge}</span>
    ` : '';

    const mediaHtml = post.media ? `
      <div class="post-media-container" data-src="${escapeHtml(post.media)}">
        <img src="${escapeHtml(post.media)}" alt="${escapeHtml(post.title)}" loading="lazy">
        <div class="media-badge-overlay">
          <i class="fa-solid fa-expand"></i> ${escapeHtml(post.mediaType || 'View Media')}
        </div>
      </div>
    ` : '';

    const commentsHtml = post.comments.map(c => `
      <div class="single-comment">
        <div class="single-comment-meta">
          <span class="author">${escapeHtml(c.author)}</span>
          <span class="time">${escapeHtml(c.time)}</span>
        </div>
        <p class="single-comment-text">${escapeHtml(c.text)}</p>
      </div>
    `).join('');

    return `
      <article class="post-card ${isPinnedClass}" data-id="${post.id}" data-category="${post.category}">
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
          <span class="post-category-tag">
            <i class="fa-solid ${post.categoryIcon}"></i> ${escapeHtml(post.categoryLabel)}
          </span>
        </div>

        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <p class="post-text">${escapeHtml(post.text)}</p>

        ${mediaHtml}

        <div class="post-footer">
          <div class="post-actions-group">
            <button class="action-btn btn-like ${post.isLiked ? 'active-like' : ''}" data-id="${post.id}">
              <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
              <span class="like-count">${post.likes}</span>
            </button>
            <button class="action-btn btn-comments-toggle" data-id="${post.id}">
              <i class="fa-regular fa-comment"></i>
              <span class="comment-count">${post.comments.length}</span>
            </button>
            <button class="action-btn btn-share" data-id="${post.id}">
              <i class="fa-solid fa-share-nodes"></i>
              <span>Share</span>
            </button>
          </div>
          <button class="action-btn btn-bookmark ${post.isBookmarked ? 'active-bookmark' : ''}" data-id="${post.id}">
            <i class="${post.isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
        </div>

        <!-- Comments Drawer -->
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

  // Render Discord Server Card HTML (Secured with rel and strict escaping)
  function renderDiscordCard(server) {
    return `
      <div class="discord-card">
        <div class="discord-card-top">
          <div class="discord-server-icon">
            <i class="fa-solid ${server.iconClass || 'fa-users'}"></i>
          </div>
          <div class="discord-server-meta">
            <h3 class="discord-server-name">${escapeHtml(server.name)}</h3>
            <span class="discord-server-tag">${escapeHtml(server.tag)}</span>
          </div>
        </div>
        <p class="discord-server-desc">${escapeHtml(server.desc)}</p>
        <div class="discord-card-footer">
          <span class="discord-members-count">
            <i class="fa-solid fa-user-group"></i> ${escapeHtml(server.members)}
          </span>
          <a href="${escapeHtml(server.inviteUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-join-discord">
            <i class="fa-brands fa-discord"></i> Join
          </a>
        </div>
      </div>
    `;
  }

  // Render Discord Servers
  function renderDiscordGrid() {
    if (!discordGrid) return;
    const query = (searchInput.value || '').toLowerCase().trim();
    const filtered = discordServers.filter(s => {
      return !query || 
        s.name.toLowerCase().includes(query) || 
        s.tag.toLowerCase().includes(query) || 
        s.desc.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      discordGrid.innerHTML = `
        <div class="widget-card" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
          <i class="fa-brands fa-discord" style="font-size: 2.2rem; color: var(--color-discord); margin-bottom: 12px;"></i>
          <h4 style="font-size: 1.05rem; margin-bottom: 6px;">No Discord servers found</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
            Be the first to list your GTA VI Discord community!
          </p>
          <button class="btn-discord trigger-add-discord">
            <i class="fa-solid fa-plus"></i> Submit Discord Server
          </button>
        </div>
      `;
      return;
    }

    discordGrid.innerHTML = filtered.map(renderDiscordCard).join('');
  }

  // Render Feed
  function renderFeed() {
    if (!feedContainer) return;
    const searchQuery = (searchInput.value || '').toLowerCase().trim();
    const filtered = posts.filter(post => {
      const matchCat = currentCategory === 'all' || post.category === currentCategory;
      const matchSearch = !searchQuery || 
        post.title.toLowerCase().includes(searchQuery) || 
        post.text.toLowerCase().includes(searchQuery) ||
        post.author.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      feedContainer.innerHTML = `
        <div class="widget-card" style="text-align: center; padding: 48px 20px;">
          <i class="fa-solid fa-comments" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 12px;"></i>
          <h3 style="font-size: 1.1rem; margin-bottom: 6px;">No discussions found</h3>
          <p style="color: var(--text-muted); font-size: 0.86rem; max-width: 340px; margin: 0 auto 16px;">
            Try another search term or start a new discussion.
          </p>
          <button class="btn-primary trigger-new-post">
            <i class="fa-solid fa-plus"></i> New Post
          </button>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filtered.map(renderPostCard).join('');
  }

  // Switch View between Feed & Discord Section
  function updateView(category) {
    currentCategory = category;
    if (category === 'discords') {
      if (feedContainer) feedContainer.parentElement.style.display = 'none';
      if (discordSection) {
        discordSection.style.display = 'flex';
        renderDiscordGrid();
      }
    } else {
      if (feedContainer) {
        feedContainer.parentElement.style.display = 'block';
        renderFeed();
      }
      if (discordSection) discordSection.style.display = 'none';
    }
  }

  // Filter Chips Switching
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.dataset.category || 'all';
      updateView(cat);
    });
  });

  // Global Search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (currentCategory === 'discords') {
        renderDiscordGrid();
      } else {
        renderFeed();
      }
    });
  }

  // Feed Interaction Delegation
  if (feedContainer) {
    feedContainer.addEventListener('click', (e) => {
      // Like / Upvote
      const likeBtn = e.target.closest('.btn-like');
      if (likeBtn) {
        const postId = likeBtn.dataset.id;
        const targetPost = posts.find(p => p.id === postId);
        if (targetPost) {
          targetPost.isLiked = !targetPost.isLiked;
          targetPost.likes += targetPost.isLiked ? 1 : -1;
          renderFeed();
          showToast(targetPost.isLiked ? 'Upvoted discussion' : 'Upvote removed');
        }
        return;
      }

      // Bookmark
      const bookmarkBtn = e.target.closest('.btn-bookmark');
      if (bookmarkBtn) {
        const postId = bookmarkBtn.dataset.id;
        const targetPost = posts.find(p => p.id === postId);
        if (targetPost) {
          targetPost.isBookmarked = !targetPost.isBookmarked;
          renderFeed();
          showToast(targetPost.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
        }
        return;
      }

      // Toggle Comments
      const commentsToggleBtn = e.target.closest('.btn-comments-toggle');
      if (commentsToggleBtn) {
        const postId = commentsToggleBtn.dataset.id;
        const drawer = document.getElementById(`comments-${postId}`);
        if (drawer) drawer.classList.toggle('open');
        return;
      }

      // Post Comment
      const commentSubmitBtn = e.target.closest('.comment-submit-btn');
      if (commentSubmitBtn) {
        const postId = commentSubmitBtn.dataset.id;
        const drawer = document.getElementById(`comments-${postId}`);
        const input = drawer.querySelector('.comment-input-field');
        const text = (input.value || '').trim();
        if (!text) return;

        const targetPost = posts.find(p => p.id === postId);
        if (targetPost) {
          targetPost.comments.unshift({
            author: 'You',
            time: 'Just now',
            text: text
          });
          input.value = '';
          renderFeed();
          const updatedDrawer = document.getElementById(`comments-${postId}`);
          if (updatedDrawer) updatedDrawer.classList.add('open');
          showToast('Comment published');
        }
        return;
      }

      // Share Link
      const shareBtn = e.target.closest('.btn-share');
      if (shareBtn) {
        const postId = shareBtn.dataset.id;
        const shareUrl = `${window.location.origin}/#${postId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Link copied to clipboard');
        }).catch(() => {
          showToast('Link ready to share');
        });
        return;
      }

      // Media Lightbox
      const mediaContainer = e.target.closest('.post-media-container');
      if (mediaContainer) {
        const src = mediaContainer.dataset.src;
        if (src) {
          lightboxImg.src = src;
          lightbox.classList.add('open');
        }
        return;
      }
    });
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

  // Modals Open/Close
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openPostModalBtns.forEach(btn => btn.addEventListener('click', () => openModal(newPostModal)));
  openDiscordModalBtns.forEach(btn => btn.addEventListener('click', () => openModal(newDiscordModal)));

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(newPostModal);
      closeModal(newDiscordModal);
    });
  });

  [newPostModal, newDiscordModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(newPostModal);
      closeModal(newDiscordModal);
      if (lightbox && lightbox.classList.contains('open')) closeLightbox();
      if (mobileDrawer && mobileDrawer.classList.contains('open')) closeDrawer();
    }
  });

  // Lightbox
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  // Mobile Drawer
  function openDrawer() {
    mobileDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) closeDrawer();
    });
  }

  // New Post Submission
  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('post-title-input').value.trim();
      const category = document.getElementById('post-category-select').value;
      const text = document.getElementById('post-content-input').value.trim();
      const media = document.getElementById('post-media-input').value.trim();

      if (!title || !text) {
        showToast('Please provide a title and content.');
        return;
      }

      const catMap = {
        discussions: { label: 'Discussions', icon: 'fa-comments' },
        official: { label: 'Official Hub', icon: 'fa-bullhorn' },
        leaks: { label: 'Map & Guides', icon: 'fa-map-location-dot' },
        clips: { label: 'Clips & Media', icon: 'fa-film' }
      };

      const newPostObj = {
        id: `post-${Date.now()}`,
        category: category,
        categoryLabel: catMap[category]?.label || 'Discussions',
        categoryIcon: catMap[category]?.icon || 'fa-comments',
        pinned: false,
        author: 'ViceResident',
        username: 'viceresident',
        badge: 'Member',
        badgeClass: 'verified',
        time: 'Just now',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        title: title,
        text: text,
        media: media || null,
        mediaType: media ? 'Community Image' : null,
        likes: 1,
        isLiked: true,
        bookmarks: 0,
        isBookmarked: false,
        comments: []
      };

      posts.unshift(newPostObj);
      closeModal(newPostModal);
      postForm.reset();
      updateView('all');
      showToast('Discussion published successfully!');
    });
  }

  // Submit Discord Server (OWASP Validated)
  if (discordForm) {
    discordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('discord-name-input').value.trim();
      const inviteUrl = document.getElementById('discord-url-input').value.trim();
      const category = document.getElementById('discord-category-select').value;
      const desc = document.getElementById('discord-desc-input').value.trim();

      // OWASP Strict Validation
      if (!name || name.length > 60) {
        showToast('Server name is required (max 60 characters).');
        return;
      }

      if (!isValidDiscordInvite(inviteUrl)) {
        showToast('Invalid invite link! Must be https://discord.gg/... or https://discord.com/invite/...');
        return;
      }

      if (!desc || desc.length > 280) {
        showToast('Description is required (max 280 characters).');
        return;
      }

      const catLabelMap = {
        roleplay: { tag: 'Roleplay', icon: 'fa-masks-theater' },
        italian: { tag: 'Italian Community', icon: 'fa-globe' },
        heists: { tag: 'Heists & LFG', icon: 'fa-crosshairs' },
        general: { tag: 'General Community', icon: 'fa-users' },
        modding: { tag: 'Modding & Tools', icon: 'fa-screwdriver-wrench' }
      };

      const newServer = {
        id: `dc-${Date.now()}`,
        name: name,
        tag: catLabelMap[category]?.tag || 'Community',
        category: category,
        inviteUrl: inviteUrl,
        members: 'Just Added',
        iconClass: catLabelMap[category]?.icon || 'fa-users',
        desc: desc
      };

      discordServers.unshift(newServer);
      closeModal(newDiscordModal);
      discordForm.reset();
      
      // Switch to discords view and toast
      filterChips.forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'discords');
      });
      updateView('discords');
      showToast('Discord server submitted successfully!');
    });
  }

  // Handle Hash Navigation
  function handleHash() {
    const hash = window.location.hash;
    if (hash === '#discord-servers') {
      filterChips.forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'discords');
      });
      updateView('discords');
    }
  }
  window.addEventListener('hashchange', handleHash);
  if (window.location.hash === '#discord-servers') handleHash();

  // Initial Render
  renderFeed();
  renderDiscordGrid();
});
