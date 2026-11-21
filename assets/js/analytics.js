(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var STORAGE_KEY = 'vch_cookie_consent';
  var stored = null;
  try { stored = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}

  gtag('consent', 'default', {
    ad_storage: stored === 'granted' ? 'granted' : 'denied',
    ad_user_data: stored === 'granted' ? 'granted' : 'denied',
    ad_personalization: stored === 'granted' ? 'granted' : 'denied',
    analytics_storage: stored === 'granted' ? 'granted' : 'denied',
    wait_for_update: 500
  });
  gtag('set', 'url_passthrough', true);
  gtag('js', new Date());
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  function applyChoice(choice) {
    try { window.localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
    gtag('consent', 'update', {
      analytics_storage: choice === 'granted' ? 'granted' : 'denied',
      ad_storage: choice === 'granted' ? 'granted' : 'denied',
      ad_user_data: choice === 'granted' ? 'granted' : 'denied',
      ad_personalization: choice === 'granted' ? 'granted' : 'denied'
    });
  }

  function initAdSenseUnits() {
    try {
      var units = document.querySelectorAll('ins.adsbygoogle');
      if (!units.length) return;
      window.adsbygoogle = window.adsbygoogle || [];
      units.forEach(function (unit) {
        if (!unit.getAttribute('data-adsbygoogle-status') && !unit.dataset.vchAdReady) {
          unit.dataset.vchAdReady = '1';
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (pushErr) {}
        }
      });
    } catch (e) {}
  }
  window.vchInitAds = initAdSenseUnits;

  function buildBanner(forceShow) {
    initAdSenseUnits();
    if (!forceShow && (stored === 'granted' || stored === 'denied')) return;
    var existing = document.getElementById('vch-consent-banner');
    if (existing) existing.remove();

    if (!document.getElementById('vch-consent-style')) {
      var style = document.createElement('style');
      style.id = 'vch-consent-style';
      style.textContent =
        '#vch-consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:2100;background:rgba(13,17,23,0.98);border-top:2px solid #ff2a85;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-family:inherit;box-shadow:0 -4px 20px rgba(0,0,0,0.6)}' +
        '#vch-consent-banner p{margin:0;font-size:0.8rem;line-height:1.45;color:#c9d1d9;max-width:740px}' +
        '#vch-consent-banner a{color:#ff2a85;font-weight:700;text-decoration:underline}' +
        '#vch-consent-banner .vch-consent-actions{display:flex;gap:8px;flex-shrink:0}' +
        '#vch-consent-banner button{height:34px;padding:0 14px;font-size:0.78rem;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.22);background:transparent;color:#f0f6fc;font-family:inherit}' +
        '#vch-consent-banner button.vch-accept{background:#ff2a85;border-color:#ff2a85;color:#fff}' +
        '@media (max-width:768px){#vch-consent-banner{bottom:60px;padding:10px 12px;gap:8px}#vch-consent-banner p{font-size:0.74rem}#vch-consent-banner .vch-consent-actions{width:100%}#vch-consent-banner button{flex:1}}';
      document.head.appendChild(style);
    }

    var banner = document.createElement('div');
    banner.id = 'vch-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Privacy & Cookie Preferences');

    var text = document.createElement('p');
    text.appendChild(document.createTextNode('We and our partners (including Google AdSense) use cookies to personalize content and ads, provide social features, and analyze traffic (GDPR, UK, CCPA/CPRA & Global). '));
    var linkPrivacy = document.createElement('a');
    linkPrivacy.href = '/privacy.html';
    linkPrivacy.textContent = 'Privacy Policy';
    text.appendChild(linkPrivacy);
    text.appendChild(document.createTextNode(' \u2022 '));
    var link = document.createElement('a');
    link.href = '/cookies.html';
    link.textContent = 'Cookie Policy';
    text.appendChild(link);

    var actions = document.createElement('div');
    actions.className = 'vch-consent-actions';

    var decline = document.createElement('button');
    decline.type = 'button';
    decline.textContent = 'Decline / Do Not Sell';
    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'vch-accept';
    accept.textContent = 'Accept All';

    function close(choice) {
      stored = choice;
      applyChoice(choice);
      banner.remove();
    }
    decline.addEventListener('click', function () { close('denied'); });
    accept.addEventListener('click', function () { close('granted'); });

    actions.appendChild(decline);
    actions.appendChild(accept);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
  }

  window.vchOpenConsentSettings = function () {
    buildBanner(true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { buildBanner(false); });
  } else {
    buildBanner(false);
  }
  window.addEventListener('load', initAdSenseUnits);
})();
