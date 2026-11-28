(function () {
  'use strict';

  const DROP_TIME = new Date('2026-11-23T14:36:00Z').getTime();

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
      return '<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer nofollow" class="project-item-link">' +
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

  function loadData() {
    fetch('assets/data/port-status.json')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        renderStatusLists(data);
        renderProjects(data.efforts);
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