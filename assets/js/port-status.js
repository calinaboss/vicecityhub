(function () {
  'use strict';

  const DROP_TIME = new Date('2026-11-23T14:36:00Z').getTime();
  let portData = null;
  let activeFilter = 'all';

  function updateTimer() {
    const now = Date.now();
    const diff = Math.max(0, now - DROP_TIME);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const dEl = document.getElementById('timer-days');
    const hEl = document.getElementById('timer-hours');
    const mEl = document.getElementById('timer-mins');
    const sEl = document.getElementById('timer-secs');

    if (dEl) dEl.textContent = String(days).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
    if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
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

  function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const d = Math.floor(hr / 24);
    return d + 'd ago';
  }

  function renderStatusLists(data) {
    const worksList = document.getElementById('works-list');
    const blockingList = document.getElementById('blocking-list');

    if (worksList && data.whatWorks) {
      worksList.innerHTML = data.whatWorks.map(function (item) {
        return '<li class="status-item">' +
          '<i class="fa-solid fa-circle-check status-bullet success"></i>' +
          '<span>' + escapeHtml(item) + '</span>' +
          '</li>';
      }).join('');
    }

    if (blockingList && data.whatBlocking) {
      blockingList.innerHTML = data.whatBlocking.map(function (item) {
        return '<li class="status-item">' +
          '<i class="fa-solid fa-triangle-exclamation status-bullet warning"></i>' +
          '<span>' + escapeHtml(item) + '</span>' +
          '</li>';
      }).join('');
    }
  }

  function renderEfforts(efforts) {
    const grid = document.getElementById('efforts-grid');
    if (!grid || !efforts) return;

    grid.innerHTML = efforts.map(function (eff) {
      return '<div class="effort-card">' +
        '<div class="effort-header">' +
          '<h3 class="effort-name">' + escapeHtml(eff.name) + '</h3>' +
          '<span class="effort-score">' + (eff.score ? eff.score.toFixed(1) + '%' : 'Active') + '</span>' +
        '</div>' +
        '<p class="effort-headline">' + escapeHtml(eff.headline || eff.status || '') + '</p>' +
        '<div class="effort-footer">' +
          '<span>Lead: <strong>' + escapeHtml(eff.leader || 'Community') + '</strong></span>' +
          '<span class="effort-stack">' + escapeHtml(eff.stack || 'C++ / DX12') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderNewsItems() {
    const list = document.getElementById('news-feed-list');
    if (!list || !portData) return;

    let items = [];

    if (activeFilter === 'headlines') {
      items = (portData.headlines || []).map(function (h) {
        return {
          title: h.title,
          url: h.link || '#',
          source: h.outlet || 'News',
          date: h.date,
          category: 'headline',
          summary: 'Live syndicated coverage regarding GTA 6 leaked code and community decompilation.'
        };
      });
    } else {
      const allArticles = (portData.news || []).map(function (n) {
        return {
          title: n.title,
          url: n.sources && n.sources[0] ? n.sources[0].url : '#',
          source: n.sources && n.sources[0] ? n.sources[0].label : 'ViceCityHub Wire',
          date: n.publishedAt || n.date,
          category: n.category || 'port',
          summary: n.lead || n.summary || ''
        };
      });

      if (activeFilter === 'all') {
        items = allArticles;
      } else {
        items = allArticles.filter(function (n) {
          return n.category === activeFilter;
        });
      }
    }

    if (items.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);padding:24px;text-align:center;">No recent news in this category.</div>';
      return;
    }

    list.innerHTML = items.map(function (item) {
      const catClass = item.category === 'takedown' ? 'takedown' :
                       item.category === 'legal' ? 'legal' : 'port';
      return '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer nofollow" class="news-card-item">' +
        '<div class="news-meta-row">' +
          '<span class="news-category-badge ' + catClass + '">' + escapeHtml(item.category) + '</span>' +
          '<span>&bull;</span>' +
          '<span>' + escapeHtml(item.source) + '</span>' +
          '<span>&bull;</span>' +
          '<time>' + escapeHtml(formatTimeAgo(item.date)) + '</time>' +
        '</div>' +
        '<h4 class="news-item-title">' + escapeHtml(item.title) + '</h4>' +
        (item.summary ? '<p class="news-item-snippet">' + escapeHtml(item.summary) + '</p>' : '') +
        '<div class="news-item-footer">' +
          '<span>Read full article</span>' +
          '<span class="news-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function fetchLiveHeadlines() {
    const rssQuery = 'https://news.google.com/rss/search?q=GTA+6+PC+port+OR+recomp+when:7d&hl=en-US&gl=US&ceid=US:en';
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(rssQuery);

    fetch(proxyUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Proxy error');
        return res.text();
      })
      .then(function (xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const items = doc.querySelectorAll('item');
        if (items && items.length > 0 && portData) {
          const freshHeadlines = [];
          items.forEach(function (el) {
            const title = el.querySelector('title')?.textContent || '';
            const link = el.querySelector('link')?.textContent || '';
            const pubDate = el.querySelector('pubDate')?.textContent || '';
            const source = el.querySelector('source')?.textContent || 'Google News';
            if (title && link) {
              freshHeadlines.push({
                title: title,
                link: link,
                outlet: source,
                date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
              });
            }
          });
          if (freshHeadlines.length > 0) {
            portData.headlines = freshHeadlines.slice(0, 15);
            if (activeFilter === 'headlines') {
              renderNewsItems();
            }
          }
        }
      })
      .catch(function () {});
  }

  function initData() {
    fetch('assets/data/port-status.json')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        portData = data;
        renderStatusLists(data);
        renderEfforts(data.efforts);
        renderNewsItems();
        fetchLiveHeadlines();
      })
      .catch(function (err) {
        console.error('Failed to load port status:', err);
      });
  }

  function setupFilters() {
    const filterBtns = document.querySelectorAll('.news-filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        renderNewsItems();
      });
    });
  }

  function setupMobileDrawer() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const closeBtn = document.getElementById('close-drawer');

    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        drawer.classList.add('open');
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', function () {
        drawer.classList.remove('open');
      });
    }

    if (drawer) {
      drawer.addEventListener('click', function (e) {
        if (e.target === drawer) {
          drawer.classList.remove('open');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateTimer();
    setInterval(updateTimer, 1000);
    initData();
    setupFilters();
    setupMobileDrawer();
  });
})();