/*
 * publications.js — topic filtering for the publications page.
 *
 * The page is grouped into topic sections, so filtering is a matter of showing
 * one section (or one pillar's two sections) and hiding the rest. Each filter
 * button carries the topic codes it selects; the "All" button carries none.
 * Counts come from the markup, so adding a paper needs no change here, and the
 * choice is mirrored into the URL hash so a filtered view can be linked to.
 */
(function () {
  'use strict';

  var bar = document.getElementById('pubFilter');
  if (!bar) {
    return;
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll('.pub-topic-section'));
  var pillars = Array.prototype.slice.call(document.querySelectorAll('.pub-pillar'));
  var buttons = Array.prototype.slice.call(bar.querySelectorAll('[data-topics]'));
  var status = bar.querySelector('.pub-filter__status');
  if (!sections.length) {
    return;
  }

  function codesOf(el) {
    return (el.getAttribute('data-topics') || '').split(/\s+/).filter(Boolean);
  }

  function papersIn(section) {
    return section.querySelectorAll('li[data-topics]').length;
  }

  var total = sections.reduce(function (sum, s) { return sum + papersIn(s); }, 0);

  /* --- counts, straight from the markup --------------------------------- */
  buttons.forEach(function (button) {
    var slot = button.querySelector('.pub-filter__count');
    if (!slot) return;
    var wanted = codesOf(button);
    slot.textContent = wanted.length
      ? sections.reduce(function (sum, s) {
          return wanted.indexOf(s.getAttribute('data-topic')) === -1 ? sum : sum + papersIn(s);
        }, 0)
      : total;
  });

  /* --- applying a filter ------------------------------------------------ */
  function apply(button) {
    var wanted = codesOf(button);
    var shown = 0;

    sections.forEach(function (section) {
      var match = !wanted.length || wanted.indexOf(section.getAttribute('data-topic')) !== -1;
      section.hidden = !match;
      if (match) shown += papersIn(section);
    });

    /* A pillar with both of its topics hidden should take its heading with it. */
    pillars.forEach(function (pillar) {
      pillar.hidden = !pillar.querySelector('.pub-topic-section:not([hidden])');
    });

    buttons.forEach(function (other) {
      other.classList.toggle('is-active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });

    if (status) {
      status.textContent = wanted.length
        ? 'Showing ' + shown + ' of ' + total + ' publications'
        : '';
    }

    var hash = wanted.length ? '#topic=' + wanted.join('+') : '';
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () { apply(button); });
  });

  /* --- restore a linked-to filter --------------------------------------- */
  var fromHash = /^#topic=(.+)$/.exec(window.location.hash);
  var initial = buttons[0];
  if (fromHash) {
    var key = decodeURIComponent(fromHash[1]).split('+').join(' ');
    buttons.forEach(function (button) {
      if (button.getAttribute('data-topics') === key) initial = button;
    });
  }

  bar.hidden = false;      /* the controls do nothing without this script */
  apply(initial);
})();
