(function () {
  'use strict';

  const DROP_TIME = new Date('2026-11-23T14:36:00Z').getTime();
  const ALLOWED_HEADLINE_RE = /(gta ?(vi|6)|grand theft auto (vi|6)).*(leak|pc\b|port|emulat|recomp|dmca|take-two|takedown|lawsuit|rockstar|cyberle+k|hack|executable|source code|reverse)|(leak|pc\b|port|emulat|recomp|dmca|take-two|takedown|lawsuit|cyberle+k|hack|executable|source code|reverse).*(gta ?(vi|6)|grand theft auto (vi|6))/i;
  const SCAM_FILTER_RE = /(free download|crack download|full game torrent|download keygen|activation key|direct download link|password\.txt|unlock full)/i;

  function updateTimer() {
    const now = Date.now();
    const diff = Math.max(0, now - DROP_TIME);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const timerEl = document.getElementById('port-timer-val');
    if (timerEl) {
      timerEl.textContent = days + 'd ' +
        String(hours).padStart(2, '0') + 'h ' +
        String(minutes).padStart(2, '0') + 'm ' +
        String(seconds).padStart(2, '0') + 's';
    }
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

  function sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '#';
    const trimmed = rawUrl.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch (e) {
      return '#';
    }
    return '#';
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
          '<i class="fa-solid fa-check status-bullet success"></i>' +
          '<span>' + escapeHtml(item) + '</span>' +
          '</li>';
      }).join('');
    }

    if (blockingList && data.whatBlocking) {
      blockingList.innerHTML = data.whatBlocking.map(function (item) {
        return '<li class="status-item">' +
          '<i class="fa-solid fa-xmark status-bullet warning"></i>' +
          '<span>' + escapeHtml(item) + '</span>' +
          '</li>';
      }).join('');
    }
  }

  function renderProjects(efforts) {
    const container = document.getElementById('projects-list');
    if (!container || !efforts) return;

    container.innerHTML = efforts.map(function (p) {
      const pctDisplay = p.score ? p.score.toFixed(1) + '%' : '';
      const safeUrl = sanitizeUrl(p.url);
      return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer nofollow" class="project-item-link">' +
        '<div class="project-top-row">' +
          '<div class="project-title-area">' +
            '<h3 class="project-name">' + escapeHtml(p.name) + '</h3>' +
            '<span class="project-repo-path">' + escapeHtml(p.repo) + '</span>' +
          '</div>' +
          '<div class="project-badges">' +
            (pctDisplay ? '<span class="project-pct-badge">' + escapeHtml(pctDisplay) + '</span>' : '') +
            '<span class="project-status-badge">' + escapeHtml(p.status || 'Active') + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="project-summary">' + escapeHtml(p.summary || '') + '</p>' +
        '<div class="project-bottom-row">' +
          '<span class="project-stack-text">' + escapeHtml(p.stack || '') + '</span>' +
          '<span class="project-github-btn"><i class="fa-brands fa-github"></i> View GitHub Repo</span>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function renderNews(items) {
    const container = document.getElementById('news-list');
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem;padding:16px 0;">No new reports at this time.</div>';
      return;
    }

    container.innerHTML = items.slice(0, 6).map(function (item) {
      const safeLink = sanitizeUrl(item.link || item.url);
      return '<a href="' + escapeHtml(safeLink) + '" target="_blank" rel="noopener noreferrer nofollow" class="news-item-row">' +
        '<div class="news-item-main">' +
          '<span class="news-item-headline">' + escapeHtml(item.title) + '</span>' +
          '<div class="news-item-sub">' +
            '<span>' + escapeHtml(item.outlet || item.source || 'Verified Source') + '</span>' +
            '<span>&bull;</span>' +
            '<time>' + escapeHtml(formatTimeAgo(item.date || item.publishedAt)) + '</time>' +
          '</div>' +
        '</div>' +
        '<i class="fa-solid fa-arrow-up-right-from-square news-link-icon"></i>' +
      '</a>';
    }).join('');
  }

  function fetchLiveHeadlines(fallbackNews) {
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
        const xmlItems = doc.querySelectorAll('item');
        if (xmlItems && xmlItems.length > 0) {
          const verified = [];
          xmlItems.forEach(function (el) {
            const title = el.querySelector('title')?.textContent || '';
            const link = el.querySelector('link')?.textContent || '';
            const pubDate = el.querySelector('pubDate')?.textContent || '';
            const source = el.querySelector('source')?.textContent || 'Google News';

            if (title && link && ALLOWED_HEADLINE_RE.test(title) && !SCAM_FILTER_RE.test(title)) {
              verified.push({
                title: title,
                link: link,
                outlet: source,
                date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
              });
            }
          });

          if (verified.length > 0) {
            renderNews(verified);
            return;
          }
        }
        if (fallbackNews) renderNews(fallbackNews);
      })
      .catch(function () {
        if (fallbackNews) renderNews(fallbackNews);
      });
  }

  function loadData() {
    fetch('assets/data/port-status.json')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        renderStatusLists(data);
        renderProjects(data.efforts);
        fetchLiveHeadlines(data.news || []);
      })
      .catch(function (err) {
        console.error('Failed to load port status:', err);
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
    loadData();
    setupMobileDrawer();
  });
})();