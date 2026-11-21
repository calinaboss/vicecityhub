(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted'
  });
  gtag('set', 'url_passthrough', true);
  gtag('js', new Date());
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

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
  window.vchOpenConsentSettings = function () {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdSenseUnits);
  } else {
    initAdSenseUnits();
  }
  window.addEventListener('load', initAdSenseUnits);
})();
