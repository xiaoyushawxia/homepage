/*
 * theme.js — the light/dark switch in the navigation bar.
 *
 * With no stored choice the site simply follows the operating system, which is
 * handled entirely in CSS. Clicking the button pins an explicit theme by
 * setting data-theme on <html>; the inline script in each page's <head> reads
 * it back on the next visit before anything is painted.
 */
(function () {
  'use strict';

  var button = document.getElementById('themeToggle');
  if (!button) {
    return;
  }

  var root = document.documentElement;
  var system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function activeTheme() {
    return root.getAttribute('data-theme') || (system && system.matches ? 'dark' : 'light');
  }

  function describe() {
    var next = activeTheme() === 'dark' ? 'light' : 'dark';
    var text = 'Switch to ' + next + ' theme';
    button.setAttribute('aria-label', text);
    button.setAttribute('title', text);
  }

  button.addEventListener('click', function () {
    var next = activeTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (err) { /* storage blocked — the choice just won't outlive the page */ }
    describe();
  });

  /* Keep the label honest if the OS flips while no explicit choice is pinned. */
  if (system && system.addEventListener) {
    system.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) {
        describe();
      }
    });
  }

  describe();
  button.hidden = false;   /* the control is useless without this script */
})();
