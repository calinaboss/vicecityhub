(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var STORAGE_KEY = 'vch_cookie_consent';
  var stored = null;
  try { stored = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
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
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function buildBanner() {
    if (stored === 'granted' || stored === 'denied') return;
    if (document.getElementById('vch-consent-banner')) return;

    var style = document.createElement('style');
    style.textContent =
      '#vch-consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:2100;background:rgba(13,17,23,0.97);border-top:2px solid #ff2a85;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-family:inherit}' +
      '#vch-consent-banner p{margin:0;font-size:0.8rem;line-height:1.45;color:#c9d1d9;max-width:680px}' +
      '#vch-consent-banner a{color:#ff2a85;font-weight:700}' +
      '#vch-consent-banner .vch-consent-actions{display:flex;gap:8px;flex-shrink:0}' +
      '#vch-consent-banner button{height:34px;padding:0 14px;font-size:0.78rem;font-weight:700;border-radius:3px;cursor:pointer;border:1px solid rgba(255,255,255,0.22);background:transparent;color:#f0f6fc;font-family:inherit}' +
      '#vch-consent-banner button.vch-accept{background:#ff2a85;border-color:#ff2a85;color:#fff}' +
      '@media (max-width:768px){#vch-consent-banner{bottom:60px;padding:10px 12px;gap:8px}#vch-consent-banner p{font-size:0.74rem}#vch-consent-banner .vch-consent-actions{width:100%}#vch-consent-banner button{flex:1}}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.id = 'vch-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');

    var text = document.createElement('p');
    text.appendChild(document.createTextNode('We use privacy-friendly analytics cookies to improve ViceCityHub. You can accept or decline. '));
    var link = document.createElement('a');
    link.href = '/cookies.html';
    link.textContent = 'Cookie policy';
    text.appendChild(link);

    var actions = document.createElement('div');
    actions.className = 'vch-consent-actions';

    var decline = document.createElement('button');
    decline.type = 'button';
    decline.textContent = 'Decline';
    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'vch-accept';
    accept.textContent = 'Accept';

    function close(choice) {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBanner);
  } else {
    buildBanner();
  }
})();
