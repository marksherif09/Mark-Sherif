(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-gg-menu-toggle]');
    if (!toggle) return;

    var hero = toggle.closest('.gg-hero');
    if (!hero) return;

    var panel = hero.querySelector('[data-gg-mobile-panel]');
    if (!panel) return;

    var isOpen = toggle.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      toggle.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-open');
      panel.hidden = true;
    } else {
      toggle.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      // allow the browser to register hidden=false before animating in
      requestAnimationFrame(function () {
        panel.classList.add('is-open');
      });
    }
  });
})();
