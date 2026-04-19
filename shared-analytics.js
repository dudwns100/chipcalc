(function () {
  var GA_ID = 'G-XXXXXXXXXX';

  if (!GA_ID || /X{4,}/.test(GA_ID)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    dataLayer.push(arguments);
  };

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', GA_ID);
})();
