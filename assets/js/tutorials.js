document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tutorials-container');
  const loading = document.getElementById('tutorials-loading');
  const empty = document.getElementById('tutorials-empty');
  const searchInput = document.getElementById('tutorial-search');
  const filterChips = document.querySelectorAll('.filter-chip[data-category]');

  let activeCategory = 'all';
  let searchQuery = '';
  let searchTimeout = null;
  let allItemsCache = [];

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
      map_secrets: 0
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
        const thumbUrl = tut.thumbnail_url || '/assets/brand/vicecityhub-og.jpg';
        const dateStr = tut.created_at ? tut.created_at.slice(0, 10) : '';

        return `
          <article class="tutorial-card">
            <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="tutorial-thumb-container" data-view-id="${escapeHtml(tut.id)}">
              <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(tut.title)}" class="tutorial-thumb-img" loading="lazy" onerror="this.src='/assets/brand/vicecityhub-og.jpg'">
              <span class="tutorial-category-tag">${escapeHtml(tut.category_label || tut.category)}</span>
              <span class="tutorial-platform-badge ${escapeHtml(platform)}">${getPlatformIcon(platform)}</span>
              <div class="tutorial-play-overlay">
                <span class="tutorial-watch-btn">
                  <i class="fa-solid fa-play"></i> Guarda il tutorial <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.72rem; margin-left: 2px;"></i>
                </span>
              </div>
            </a>
            <div class="tutorial-content">
              <h2 class="tutorial-title">${escapeHtml(tut.title)}</h2>
              <p class="tutorial-desc">${escapeHtml(tut.description)}</p>
              <div class="tutorial-footer">
                <span><i class="fa-solid fa-eye"></i> ${Number(tut.views_count || 0).toLocaleString()} views</span>
                <span><i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}</span>
              </div>
            </div>
          </article>
        `;
      }).join('');
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
      const tutorials = data.tutorials || [];

      if (!searchQuery && activeCategory === 'all') {
        allItemsCache = tutorials;
        updateCategoryCounts(tutorials);
      }

      renderTutorials(tutorials);
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (empty) {
        empty.style.display = 'block';
        empty.innerHTML = `<i class="fa-solid fa-triangle-exclamation fa-2x" style="color: #f87171; margin-bottom: 8px;"></i><p style="color: var(--text-muted);">Failed to load tutorials. Please try again later.</p>`;
      }
    }
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-category') || 'all';
      fetchTutorials();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        fetchTutorials();
      }, 300);
    });
  }

  document.body.addEventListener('click', (e) => {
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
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const navLeft = document.querySelector('.header-nav-left');
      if (navLeft) {
        navLeft.classList.toggle('mobile-open');
      }
    });
  }

  fetchTutorials();
});
