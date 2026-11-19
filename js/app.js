/**
 * VICECITYHUB.EU - Community Hub Frontend Controller
 * Modern vanilla JS - zero dependencies, zero emojis.
 * Interactive feed, filters, search, modal, likes, and comments.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const filterChips = document.querySelectorAll('.filter-chip');
  const feedContainer = document.getElementById('community-feed');
  const searchInput = document.getElementById('search-input');
  const newPostModal = document.getElementById('create-post-modal');
  const openModalBtns = document.querySelectorAll('.trigger-new-post');
  const closeModalBtns = document.querySelectorAll('.trigger-close-modal');
  const postForm = document.getElementById('new-post-form');
  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeLightboxBtn = document.getElementById('close-lightbox');
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer');

  // Initial Posts Data
  const samplePosts = [
    {
      id: 'post-1',
      category: 'official',
      categoryLabel: 'Official News',
      categoryIcon: 'fa-bullhorn',
      pinned: true,
      author: 'ViceCityHub Staff',
      username: 'admin',
      badge: 'Official Staff',
      badgeClass: 'mod',
      time: '1 hour ago',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
      title: 'Grand Theft Auto VI has officially launched worldwide. Welcome to Vice City!',
      text: 'The wait is finally over! Vice City is live across all platforms. Use ViceCityHub to organize your crews, discover hidden map locations, and discuss the latest updates with fellow players. Keep discussions respectful and abide by the community guidelines.',
      media: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'Official Launch Showcase',
      likes: 1248,
      isLiked: false,
      bookmarks: 342,
      isBookmarked: false,
      comments: [
        { author: 'TommyV_86', time: '45m ago', text: 'Graphics and volumetric lighting in Ocean Beach are utterly unreal!' },
        { author: 'Lucia_Driver', time: '20m ago', text: 'Already mapped the southern keys highway. Physics feel so tight.' }
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
      text: 'Here is our consolidated map guide covering Port Gellhorn, Vice Beach, and Grassrivers. In this thread we are compiling all confirmed supercar garages and private airstrips for fast travel across the state.',
      media: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      mediaType: 'Map Overlay Preview',
      likes: 673,
      isLiked: false,
      bookmarks: 189,
      isBookmarked: false,
      comments: [
        { author: 'SpeedDemon99', time: '1h ago', text: 'Can confirm the helicopter on the Starfish Island helipad!' }
      ]
    },
    {
      id: 'post-3',
      category: 'crews',
      categoryLabel: 'Clans & Crews',
      categoryIcon: 'fa-users',
      pinned: false,
      author: 'Sunset Syndicate',
      username: 'syndicate_lead',
      badge: 'Crew Leader',
      badgeClass: 'crew',
      time: '3 hours ago',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      title: 'Sunset Syndicate [SUNS] is recruiting high-rank drivers & heisters',
      text: 'Recruiting mature players (PC / Next-Gen) for coordinated night raids, crew races, and real estate domination in Downtown Vice. We operate with high tactical discipline, a custom Discord bot, and weekly scheduled crew sessions.',
      media: null,
      likes: 312,
      isLiked: false,
      bookmarks: 45,
      isBookmarked: false,
      comments: [
        { author: 'MiamiOutlaw', time: '2h ago', text: 'Just sent a join request via Social Club. Level 120 veteran.' }
      ]
    },
    {
      id: 'post-4',
      category: 'clips',
      categoryLabel: 'Clips & Media',
      categoryIcon: 'fa-film',
      pinned: false,
      author: 'NeonRacer_XX',
      username: 'neon_racer',
      badge: 'Verified',
      badgeClass: 'verified',
      time: '4 hours ago',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
      title: 'Cruising Ocean Drive at 3 AM with thunderstorm reflections',
      text: 'The wet asphalt puddles and neon light bounce along the strip are mind-blowing. Check out this still capture from my 4K stream.',
      media: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
      mediaType: '4K Ultra Quality Capture',
      likes: 894,
      isLiked: false,
      bookmarks: 211,
      isBookmarked: false,
      comments: [
        { author: 'RayTracer', time: '3h ago', text: 'Best looking weather engine in gaming history hands down.' }
      ]
    },
    {
      id: 'post-5',
      category: 'discussions',
      categoryLabel: 'Discussions',
      categoryIcon: 'fa-comments',
      pinned: false,
      author: 'RetroGamer88',
      username: 'retrogamer',
      badge: '',
      badgeClass: '',
      time: '5 hours ago',
      avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
      title: 'What radio station is everyone listening to on your first roadtrip?',
      text: 'Flash FM returns along with Wave 103 and several brand new hip hop, synth, and Latin radio stations. Share your favorite tracks and DJ moments so far.',
      media: null,
      likes: 421,
      isLiked: false,
      bookmarks: 67,
      isBookmarked: false,
      comments: [
        { author: 'FlashFM_Fan', time: '4h ago', text: 'Flash FM forever. The 80s pop tracks hit just as good today.' }
      ]
    }
  ];

  let currentCategory = 'all';
  let posts = [...samplePosts];

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
      <div class="post-media-container" data-src="${post.media}">
        <img src="${post.media}" alt="${post.title}" loading="lazy">
        <div class="media-badge-overlay">
          <i class="fa-solid fa-expand"></i> ${post.mediaType || 'View Media'}
        </div>
      </div>
    ` : '';

    const commentsHtml = post.comments.map(c => `
      <div class="single-comment">
        <div class="single-comment-content">
          <div class="single-comment-meta">
            <span class="author">${escapeHtml(c.author)}</span>
            <span class="time">${escapeHtml(c.time)}</span>
          </div>
          <p class="single-comment-text">${escapeHtml(c.text)}</p>
        </div>
      </div>
    `).join('');

    return `
      <article class="post-card ${isPinnedClass}" data-id="${post.id}" data-category="${post.category}">
        <div class="post-header">
          <div class="post-author-box">
            <img class="post-avatar" src="${post.avatar}" alt="${post.author}">
            <div class="post-author-info">
              <div class="author-name-row">
                ${pinBadge}
                <span class="author-username">${escapeHtml(post.author)}</span>
                ${badgeHtml}
              </div>
              <span class="post-timestamp">${post.time} &bull; @${escapeHtml(post.username)}</span>
            </div>
          </div>
          <span class="post-category-tag">
            <i class="fa-solid ${post.categoryIcon}"></i> ${post.categoryLabel}
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
            <button class="action-btn btn-share" data-id="${post.id}" data-title="${escapeHtml(post.title)}">
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

  // Render Feed
  function renderFeed() {
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
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 14px;"></i>
          <h3 style="font-size: 1.1rem; margin-bottom: 8px;">No discussions found</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 360px; margin: 0 auto 18px;">
            Try switching categories or submit the first post in this section.
          </p>
          <button class="btn-primary trigger-new-post">
            <i class="fa-solid fa-plus"></i> Create Post
          </button>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filtered.map(renderPostCard).join('');
  }

  // Event Delegation for Feed Interactions
  feedContainer.addEventListener('click', (e) => {
    // Like / Upvote Button
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

    // Bookmark Button
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

    // Toggle Comments Drawer
    const commentsToggleBtn = e.target.closest('.btn-comments-toggle');
    if (commentsToggleBtn) {
      const postId = commentsToggleBtn.dataset.id;
      const drawer = document.getElementById(`comments-${postId}`);
      if (drawer) {
        drawer.classList.toggle('open');
      }
      return;
    }

    // Post a Comment
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

    // Share Button
    const shareBtn = e.target.closest('.btn-share');
    if (shareBtn) {
      const postId = shareBtn.dataset.id;
      const shareUrl = `${window.location.origin}/#${postId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Discussion link copied to clipboard');
      }).catch(() => {
        showToast('Discussion link ready');
      });
      return;
    }

    // Media Lightbox Trigger
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

  // Category Filter Switching
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category || 'all';
      renderFeed();
    });
  });

  // Real-time Search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFeed();
    });
  }

  // Toast Notification Function
  function showToast(message) {
    if (!toast) return;
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Modal Open/Close Controls
  function openModal() {
    newPostModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    newPostModal.classList.remove('open');
    document.body.style.overflow = '';
    postForm.reset();
  }

  openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
  closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));

  newPostModal.addEventListener('click', (e) => {
    if (e.target === newPostModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (newPostModal.classList.contains('open')) closeModal();
      if (lightbox.classList.contains('open')) closeLightbox();
      if (mobileDrawer.classList.contains('open')) closeDrawer();
    }
  });

  // Lightbox Close
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

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
  mobileDrawer.addEventListener('click', (e) => {
    if (e.target === mobileDrawer) closeDrawer();
  });

  // New Post Submission
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
      official: { label: 'Official News', icon: 'fa-bullhorn' },
      leaks: { label: 'Map & Guides', icon: 'fa-map-location-dot' },
      clips: { label: 'Clips & Media', icon: 'fa-film' },
      crews: { label: 'Clans & Crews', icon: 'fa-users' }
    };

    const newPostObj = {
      id: `post-${Date.now()}`,
      category: category,
      categoryLabel: catMap[category]?.label || 'Discussions',
      categoryIcon: catMap[category]?.icon || 'fa-comments',
      pinned: false,
      author: 'ViceResident',
      username: 'viceresident',
      badge: 'New Member',
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
    closeModal();
    renderFeed();
    showToast('New discussion posted successfully!');
    window.scrollTo({ top: 380, behavior: 'smooth' });
  });

  // Simulated Live Ping Variation for Server Status
  function updateServerPings() {
    const pingVice = document.getElementById('ping-vice');
    const pingSocial = document.getElementById('ping-social');
    const pingRockstar = document.getElementById('ping-rockstar');

    if (pingVice) pingVice.textContent = `${Math.floor(20 + Math.random() * 8)}ms`;
    if (pingSocial) pingSocial.textContent = `${Math.floor(28 + Math.random() * 10)}ms`;
    if (pingRockstar) pingRockstar.textContent = `${Math.floor(32 + Math.random() * 12)}ms`;
  }
  setInterval(updateServerPings, 6000);

  // Helper Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Render
  renderFeed();
});
