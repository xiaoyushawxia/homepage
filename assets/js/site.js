/* site.js — small progressive-enhancement helpers for the homepage. */
(function () {
  'use strict';

  /* Toggle the "earlier news" block on the home page. */
  var toggle = document.getElementById('newsToggle');
  var extra = document.getElementById('news-extra');
  var label = document.getElementById('newsToggleText');

  if (!toggle || !extra) {
    return;
  }

  toggle.addEventListener('click', function () {
    var open = extra.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    if (label) {
      label.textContent = open ? 'Hide earlier news' : 'View earlier news';
    }
  });
})();
