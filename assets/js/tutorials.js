document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tutorials-container');
  const loading = document.getElementById('tutorials-loading');
  const empty = document.getElementById('tutorials-empty');
  const searchInput = document.getElementById('tutorial-search');
  const filterChips = document.querySelectorAll('.filter-chip[data-category]');

  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category');
  const initialQ = urlParams.get('q');
  const targetId = urlParams.get('id');

  let activeCategory = initialCategory || 'all';
  let searchQuery = initialQ || '';
  let searchTimeout = null;
  let allItemsCache = [];

  if (initialCategory) {
    filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-category') === activeCategory);
    });
  }

  if (initialQ && searchInput) {
    searchInput.value = initialQ;
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

  function getPlatformIcon(platform) {
    if (platform === 'youtube') return '<i class="fa-brands fa-youtube"></i> YouTube';
    if (platform === 'tiktok') return '<i class="fa-brands fa-tiktok"></i> TikTok';
    if (platform === 'instagram') return '<i class="fa-brands fa-instagram"></i> Instagram';
    return '<i class="fa-solid fa-video"></i> Video';
  }

  function updateCategoryCounts(items) {
    const counts = {
      all: items.length,
      free_cars: 0,
      easter_eggs: 0,
      robberies: 0,
      weapons: 0,
      money: 0,
      map_secrets: 0,
      missions: 0,
      cheats: 0,
      collectibles: 0,
      tuning: 0,
      police: 0
    };

    items.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });

    Object.keys(counts).forEach(cat => {
      const el = document.getElementById(`count-${cat}`);
      if (el) el.textContent = counts[cat];
    });
  }

  function updateVideoSchema(items) {
    let scriptEl = document.getElementById('dynamic-tutorials-video-schema');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'dynamic-tutorials-video-schema';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": (items || []).slice(0, 50).map((tut, idx) => {
        let rawDate = tut.created_at || new Date().toISOString();
        if (!rawDate.includes('T')) rawDate = rawDate.replace(' ', 'T');
        if (!rawDate.endsWith('Z') && !rawDate.includes('+')) rawDate += '+00:00';
        return {
          "@type": "ListItem",
          "position": idx + 1,
          "item": {
            "@type": "VideoObject",
            "name": tut.title,
            "description": tut.description || tut.title,
            "thumbnailUrl": [tut.thumbnail_url && tut.thumbnail_url !== '/assets/brand/vicecityhub-og.jpg' ? tut.thumbnail_url : (tut.platform === 'instagram' && tut.video_url ? `https://www.instagram.com/p/${(tut.video_url.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i) || [])[1] || ''}/media/?size=l` : 'https://vicecityhub.eu/assets/brand/og-banner.png')],
            "uploadDate": rawDate,
            "contentUrl": tut.video_url,
            "embedUrl": tut.embed_url || tut.video_url,
            "publisher": {
              "@type": "Organization",
              "name": "ViceCityHub",
              "logo": {
                "@type": "ImageObject",
                "url": "https://vicecityhub.eu/assets/brand/logo.png"
              }
            }
          }
        };
      })
    };
    scriptEl.textContent = JSON.stringify(schemaData);
  }

  function renderTutorials(items) {
    if (loading) loading.style.display = 'none';

    if (!items || items.length === 0) {
      if (container) container.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (container) {
      container.style.display = 'grid';
      container.innerHTML = items.map(tut => {
        const platform = (tut.platform || 'youtube').toLowerCase();
        const videoUrl = tut.video_url || '#';
        let thumbUrl = tut.thumbnail_url || '';
        if (platform === 'instagram') {
          thumbUrl = '/assets/brand/instagram-fallback.webp';
        } else if (!thumbUrl || thumbUrl === '/assets/brand/vicecityhub-og.jpg') {
          if (platform === 'youtube') {
            const ym = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            if (ym && ym[1]) thumbUrl = `https://img.youtube.com/vi/${ym[1]}/hqdefault.jpg`;
          }
        }
        if (!thumbUrl) thumbUrl = platform === 'instagram' ? '/assets/brand/instagram-fallback.webp' : '/assets/brand/vicecityhub-og.jpg';
        const dateStr = tut.created_at ? tut.created_at.slice(0, 10) : '';

        let mediaHtml = '';

        if (platform === 'tiktok') {
          let tiktokEmbed = tut.embed_url;
          if (!tiktokEmbed) {
            const m = videoUrl.match(/\/video\/(\d+)/) || videoUrl.match(/\/v1\/(\d+)/) || videoUrl.match(/[?&]item_id=(\d+)/);
            if (m && m[1]) {
              tiktokEmbed = `https://www.tiktok.com/player/v1/${m[1]}?embed_from=webapp_share&music_info=1&description=1&autoplay=0&muted=0`;
            }
          }
          if (tiktokEmbed) {
            mediaHtml = `
              <div class="tutorial-media-frame tiktok-frame">
                <iframe
                  src="${escapeHtml(tiktokEmbed)}"
                  class="tutorial-tiktok-iframe"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  loading="lazy"
                  title="${escapeHtml(tut.title)}"
                ></iframe>
              </div>
            `;
          } else {
            mediaHtml = `
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-phone-preview" data-view-id="${escapeHtml(tut.id)}" aria-label="Play video tutorial">
                <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(tut.title)}" class="tutorial-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/assets/brand/vicecityhub-og.jpg'">
                <div class="tutorial-play-center"><i class="fa-solid fa-play"></i></div>
              </a>
            `;
          }
        } else if (platform === 'youtube') {
          let ytEmbed = tut.embed_url;
          if (!ytEmbed) {
            const m = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            if (m && m[1]) {
              ytEmbed = `https://www.youtube-nocookie.com/embed/${m[1]}`;
            }
          }
          if (ytEmbed) {
            mediaHtml = `
              <div class="tutorial-media-frame youtube-frame">
                <iframe
                  src="${escapeHtml(ytEmbed)}"
                  class="tutorial-youtube-iframe"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  loading="lazy"
                  title="${escapeHtml(tut.title)}"
                ></iframe>
              </div>
            `;
          } else {
            mediaHtml = `
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-phone-preview" data-view-id="${escapeHtml(tut.id)}" aria-label="Play video tutorial">
                <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(tut.title)}" class="tutorial-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/assets/brand/vicecityhub-og.jpg'">
                <div class="tutorial-play-center"><i class="fa-solid fa-play"></i></div>
              </a>
            `;
          }
        } else if (platform === 'instagram') {
          mediaHtml = `
            <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-phone-preview instagram-phone-preview" data-view-id="${escapeHtml(tut.id)}" aria-label="Play video tutorial">
              <img src="/assets/brand/instagram-fallback.webp" alt="${escapeHtml(tut.title)}" class="tutorial-thumb-img" loading="lazy">
              <div class="tutorial-play-center"><i class="fa-solid fa-play"></i></div>
            </a>
          `;
        } else {
          mediaHtml = `
            <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-phone-preview" data-view-id="${escapeHtml(tut.id)}" aria-label="Play video tutorial">
              <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(tut.title)}" class="tutorial-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/assets/brand/vicecityhub-og.jpg'">
              <div class="tutorial-play-center"><i class="fa-solid fa-play"></i></div>
            </a>
          `;
        }

        return `
          <article id="tutorial-${escapeHtml(tut.id)}" class="tutorial-card">
            <div class="tutorial-header-row">
              <div class="tutorial-badges-group">
                <span class="tutorial-category-tag">${escapeHtml(tut.category_label || tut.category)}</span>
                <span class="tutorial-platform-badge ${escapeHtml(platform)}">${getPlatformIcon(platform)}</span>
              </div>
              <div class="tutorial-meta-time">
                <i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}
              </div>
            </div>

            ${mediaHtml}

            <div class="tutorial-info-block">
              <h2 class="tutorial-title">${escapeHtml(tut.title)}</h2>
              <p class="tutorial-desc">${escapeHtml(tut.description)}</p>
            </div>

            <div class="tutorial-action-bar">
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-watch-btn" data-view-id="${escapeHtml(tut.id)}">
                <i class="fa-solid fa-circle-play"></i> Watch Tutorial <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.74rem;"></i>
              </a>
            </div>
          </article>
        `;
      }).join('');

      updateVideoSchema(items);

      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(`tutorial-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'box-shadow 0.3s ease, border-radius 0.3s ease';
            el.style.boxShadow = '0 0 24px var(--accent-pink)';
            el.style.borderRadius = '16px';
            setTimeout(() => {
              el.style.boxShadow = 'none';
            }, 2500);
          }
        }, 150);
      }
    }
  }

  async function fetchTutorials() {
    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';

    try {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== 'all') {
        params.append('category', activeCategory);
      }
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      params.append('limit', '60');

      const res = await fetch(`/api/tutorials?${params.toString()}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      if (data && data.ok) {
        if (!searchQuery && activeCategory === 'all') {
          allItemsCache = data.tutorials || [];
          updateCategoryCounts(allItemsCache);
        } else if (allItemsCache.length === 0 && (data.tutorials || []).length > 0) {
          fetch('/api/tutorials?limit=60')
            .then(r => r.json())
            .then(allData => {
              if (allData && allData.ok) {
                allItemsCache = allData.tutorials || [];
                updateCategoryCounts(allItemsCache);
              }
            })
            .catch(() => {});
        }

        renderTutorials(data.tutorials || []);
      } else {
        renderTutorials([]);
      }
    } catch (err) {
      renderTutorials([]);
    }
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-category') || 'all';

      const newUrl = new URL(window.location);
      if (activeCategory === 'all') {
        newUrl.searchParams.delete('category');
      } else {
        newUrl.searchParams.set('category', activeCategory);
      }
      window.history.replaceState({}, '', newUrl);

      fetchTutorials();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        const newUrl = new URL(window.location);
        if (searchQuery) {
          newUrl.searchParams.set('q', searchQuery);
        } else {
          newUrl.searchParams.delete('q');
        }
        window.history.replaceState({}, '', newUrl);

        fetchTutorials();
      }, 300);
    });
  }

  document.body.addEventListener('click', (e) => {
    const watchBtn = e.target.closest('.tutorial-watch-btn');
    if (watchBtn) {
      watchBtn.classList.add('btn-clicked');
    }
    const preview = e.target.closest('.tutorial-phone-preview');
    if (preview) {
      preview.classList.add('preview-clicked');
    }
    const link = e.target.closest('[data-view-id]');
    if (link) {
      const id = link.getAttribute('data-view-id');
      if (id) {
        fetch('/api/tutorials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'track_view', id })
        }).catch(() => {});
      }
    }
  });

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

  fetchTutorials();
});
