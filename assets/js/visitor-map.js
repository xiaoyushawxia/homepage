/*
 * visitor-map.js — renders the "Visitors" bubble map and ranking.
 *
 * Data sources (both static files in this repo, no third-party requests):
 *   stats.json                  — refreshed daily from Google Analytics by
 *                                 .github/workflows/update_stats.yml
 *   assets/data/world-map.json  — pre-projected world geometry and one
 *                                 pre-projected x/y point per country, so the
 *                                 browser never has to do projection maths.
 */
(function () {
  'use strict';

  var root = document.getElementById('visitorMap');
  if (!root || !window.fetch) {
    return;
  }

  var MIN_R = 3.5;
  var MAX_R = 22;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function radius(value, max) {
    if (max <= 0) return MIN_R;
    return MIN_R + (MAX_R - MIN_R) * Math.sqrt(value / max);
  }

  /*
   * Country names are matched against the pre-projected lookup table. The table
   * already carries the official name and the common alternative spellings for
   * every country; this last-resort pass folds away punctuation, accents and
   * "and"/"&" differences so a stray spelling still finds its point.
   */
  function locator(points) {
    var loose = {};
    var simplify = function (name) {
      return String(name)
        .toLowerCase()
        .normalize ? String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/ ?& ?/g, ' and ').replace(/[^a-z0-9]+/g, '')
          : String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
    };

    Object.keys(points).forEach(function (name) {
      var key = simplify(name);
      if (!loose[key]) loose[key] = points[name];
    });

    return function (name) {
      return points[name] || loose[simplify(name)] || null;
    };
  }

  function getJSON(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error(url + ' -> ' + response.status);
      return response.json();
    });
  }

  function renderMap(world, countries, max) {
    /* Largest bubbles first so the small ones stay clickable on top. */
    var plotted = countries.filter(function (c) { return c.point; });

    var bubbles = plotted.map(function (c) {
      var p = c.point;
      return '<circle class="visitor-map__bubble" data-country="' + escapeHtml(c.name) + '"' +
        ' cx="' + p[0] + '" cy="' + p[1] + '" r="' + radius(c.value, max).toFixed(1) + '"' +
        ' tabindex="0" role="img"' +
        ' aria-label="' + escapeHtml(c.name) + ': ' + c.value + ' visitors">' +
        '<title>' + escapeHtml(c.name) + ' — ' + c.value + '</title></circle>';
    }).join('');

    var viewBox = world.viewBox || ('0 0 ' + world.width + ' ' + world.height);

    return '<svg class="visitor-map__svg" viewBox="' + viewBox + '"' +
      ' role="img" aria-label="World map of visitor locations" preserveAspectRatio="xMidYMid meet">' +
      '<path class="visitor-map__land" d="' + world.land + '"/>' +
      '<path class="visitor-map__borders" d="' + world.borders + '"/>' +
      bubbles +
      '</svg>';
  }

  function renderRanking(countries, max) {
    return countries.slice(0, 10).map(function (c) {
      var share = max > 0 ? Math.max(2, Math.round((c.value / max) * 100)) : 0;
      var code = c.point ? c.point[2] : null;
      var flag = code
        ? '<img class="visitor-map__flag" src="./assets/flags/' + code + '.png"' +
          ' alt="" width="20" height="15" loading="lazy" decoding="async">'
        : '<span class="visitor-map__flag visitor-map__flag--blank" aria-hidden="true"></span>';

      return '<li class="visitor-map__row" data-country="' + escapeHtml(c.name) + '">' +
        flag +
        '<span class="visitor-map__country" title="' + escapeHtml(c.name) + '">' +
        escapeHtml(c.name) + '</span>' +
        '<span class="visitor-map__value">' + c.value.toLocaleString() + '</span>' +
        '<span class="visitor-map__bar" aria-hidden="true">' +
        '<span class="visitor-map__bar-fill" style="width:' + share + '%"></span></span>' +
        '</li>';
    }).join('');
  }

  function link(root) {
    /* Hovering a ranking row highlights the matching bubble, and vice versa. */
    function highlight(name, on) {
      var selector = '[data-country="' + (window.CSS && CSS.escape ? CSS.escape(name) : name) + '"]';
      Array.prototype.forEach.call(root.querySelectorAll(selector), function (el) {
        el.classList.toggle('is-active', on);
      });
    }

    Array.prototype.forEach.call(root.querySelectorAll('[data-country]'), function (el) {
      var name = el.getAttribute('data-country');
      ['mouseenter', 'focus'].forEach(function (evt) {
        el.addEventListener(evt, function () { highlight(name, true); });
      });
      ['mouseleave', 'blur'].forEach(function (evt) {
        el.addEventListener(evt, function () { highlight(name, false); });
      });
    });
  }

  Promise.all([
    getJSON('./stats.json'),
    getJSON('./assets/data/world-map.json')
  ]).then(function (results) {
    var stats = results[0];
    var world = results[1];

    var locate = locator(world.points);

    var countries = (stats.countries || [])
      .filter(function (c) { return c && c.name && c.name !== '(not set)' && c.value > 0; })
      .map(function (c) { return { name: c.name, value: c.value, point: locate(c.name) }; })
      .sort(function (a, b) { return b.value - a.value; });

    var max = countries.length ? countries[0].value : 0;

    root.querySelector('[data-visitor-total]').textContent =
      Number(stats.visitors || 0).toLocaleString();
    root.querySelector('[data-visitor-countries]').textContent =
      countries.length.toLocaleString();

    root.querySelector('[data-visitor-canvas]').innerHTML = renderMap(world, countries, max);
    root.querySelector('[data-visitor-ranking]').innerHTML = renderRanking(countries, max);

    link(root);
    root.hidden = false;
  }).catch(function (error) {
    console.error('Visitor map unavailable:', error);

    /*
     * Browsers refuse fetch() on file:// URLs, so opening index.html straight
     * from disk can never load stats.json. That is a local-preview problem,
     * not a broken page — say so here rather than leaving a silent gap, but
     * only ever on file://; served pages just stay hidden.
     */
    if (window.location.protocol === 'file:') {
      root.querySelector('[data-visitor-canvas]').innerHTML =
        '<p class="visitor-map__note">The visitor map reads stats.json over HTTP, which a ' +
        'page opened directly from disk cannot do. Serve the folder instead &mdash; for ' +
        'example <code>python3 -m http.server</code>, then open ' +
        '<code>http://localhost:8000/</code>.</p>';
      root.hidden = false;
    }
  });
})();
