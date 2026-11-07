/*
  Draws the journey canvas and drives the stepper.
  Author: Faisal Irfan | github.com/faisal8143
*/
(function () {
  'use strict';
  var J = window.JOURNEY, NODE = window.JOURNEY_NODE, fmt = window.journeyFmtHour;
  var SVG = 'http://www.w3.org/2000/svg';
  var W = 108, H = 54;   // node box

  var ICON = { entry: '▶', wait: '⏱', email: '✉', engagement: '✦',
               decision: '✧', update: '⚑' };

  var cv = document.getElementById('cv');
  var state = { contact: J.contacts[0], steps: [], at: -1, timer: null };

  /* ------------------------------------------------------------ drawing */
  function el(name, attrs, text) {
    var e = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* Orthogonal connector: out of the right edge, vertical, into the left edge */
  function pathBetween(a, b) {
    var x1 = a.x + W / 2, y1 = a.y, x2 = b.x - W / 2, y2 = b.y;
    if (Math.abs(y1 - y2) < 2) return 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
    var mid = x1 + (x2 - x1) / 2;
    var r = 10, dir = y2 > y1 ? 1 : -1;
    return 'M' + x1 + ' ' + y1 +
           ' L' + (mid - r) + ' ' + y1 +
           ' Q' + mid + ' ' + y1 + ' ' + mid + ' ' + (y1 + r * dir) +
           ' L' + mid + ' ' + (y2 - r * dir) +
           ' Q' + mid + ' ' + y2 + ' ' + (mid + r) + ' ' + y2 +
           ' L' + x2 + ' ' + y2;
  }

  function draw() {
    cv.innerHTML = '';

    var defs = el('defs');
    [['ah', '#2F4470'], ['aht', '#5EEAD4']].forEach(function (d) {
      var m = el('marker', { id: d[0], viewBox: '0 0 10 10', refX: '9', refY: '5',
                             markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
      m.appendChild(el('path', { d: 'M0 0 L10 5 L0 10 z', fill: d[1] }));
      defs.appendChild(m);
    });
    cv.appendChild(defs);

    J.edges.forEach(function (e) {
      var a = NODE[e.from], b = NODE[e.to];
      var g = el('g', { 'data-edge': e.from + '>' + e.to });
      g.appendChild(el('path', { class: 'ed', d: pathBetween(a, b), 'marker-end': 'url(#ah)' }));
      if (e.label) {
        /* A branch with a big vertical drop has almost no horizontal room for
           its label, so label the vertical segment instead of the gap. */
        var mx = a.x + W / 2 + (b.x - W / 2 - (a.x + W / 2)) / 2;
        var steep = Math.abs(b.y - a.y) > 40;
        g.appendChild(el('text', {
          class: 'el',
          x: steep ? mx + 9 : mx,
          y: steep ? (a.y + b.y) / 2 + 4 : a.y - 9,
          'text-anchor': steep ? 'start' : 'middle'
        }, e.label));
      }
      cv.appendChild(g);
    });

    J.nodes.forEach(function (n) {
      var g = el('g', { class: 'nd', 'data-node': n.id });
      g.appendChild(el('rect', { x: n.x - W / 2, y: n.y - H / 2, width: W, height: H, rx: 11 }));
      g.appendChild(el('text', { class: 'ic', x: n.x - W / 2 + 11, y: n.y - 10, fill: '#7D8CA8' },
                       ICON[n.type] || ''));
      g.appendChild(el('text', { class: 't', x: n.x, y: n.y + 3, 'text-anchor': 'middle' },
                       clip(n.label, 17)));
      g.appendChild(el('text', { class: 's', x: n.x, y: n.y + 18, 'text-anchor': 'middle' },
                       clip(n.sub.split('·')[0].trim(), 20)));
      cv.appendChild(g);
    });
  }

  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ------------------------------------------------------------- stepper */
  function reset(keepContact) {
    stop();
    if (!keepContact) state.contact = state.contact;
    state.steps = window.simulateJourney(state.contact);
    state.at = -1;
    renderSteps();
    paint();
  }

  function renderSteps() {
    var out = state.steps.map(function (s, i) {
      var n = NODE[s.node];
      var title = n ? n.label : (s.status === 'goal' ? 'Goal met' : s.status === 'exit' ? 'Exited journey' : 'Journey end');
      return '<div class="st ' + s.status + '" data-i="' + i + '">' +
               '<time>' + fmt(s.hour) + '</time>' +
               '<div><b>' + esc(title) + '</b><p>' + esc(s.reason) + '</p></div>' +
             '</div>';
    }).join('');
    document.getElementById('steps').innerHTML = out;
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  function paint() {
    var seen = {}, takenEdges = {}, prev = null, ended = null;

    for (var i = 0; i <= state.at; i++) {
      var s = state.steps[i];
      if (s.status === 'goal' || s.status === 'exit' || s.status === 'end') { ended = s; continue; }
      seen[s.node] = s.status;
      if (prev) takenEdges[prev + '>' + s.node] = 1;
      prev = s.node;
    }

    cv.querySelectorAll('.nd').forEach(function (g) {
      var id = g.getAttribute('data-node');
      g.setAttribute('class', 'nd');
      if (seen[id] === undefined) {
        if (state.at >= 0) g.setAttribute('class', 'nd skip');
        return;
      }
      var isLast = (id === prev);
      var cls = 'nd ' + (isLast ? (ended && ended.status === 'goal' ? 'goal'
                                 : ended && ended.status === 'exit' ? 'exit' : 'active') : 'done');
      g.setAttribute('class', cls);
    });

    cv.querySelectorAll('[data-edge]').forEach(function (g) {
      var k = g.getAttribute('data-edge');
      var p = g.querySelector('path'), t = g.querySelector('text');
      if (takenEdges[k]) {
        p.setAttribute('class', 'ed taken');
        p.setAttribute('marker-end', 'url(#aht)');
        if (t) t.setAttribute('class', 'el taken');
      } else {
        p.setAttribute('class', state.at >= 0 ? 'ed skip' : 'ed');
        p.setAttribute('marker-end', 'url(#ah)');
        if (t) t.setAttribute('class', state.at >= 0 ? 'el skip' : 'el');
      }
    });

    document.querySelectorAll('.st').forEach(function (d) {
      d.classList.toggle('on', parseInt(d.getAttribute('data-i'), 10) <= state.at);
    });

    var cur = state.steps[Math.max(0, state.at)];
    var clock = document.getElementById('clock');
    if (state.at < 0) clock.innerHTML = 'Not started · <b>' + state.contact.name + '</b>';
    else clock.innerHTML = 'Journey time <b>' + fmt(cur.hour) + '</b> · step ' +
                           (state.at + 1) + ' of ' + state.steps.length;

    document.getElementById('step').disabled = state.at >= state.steps.length - 1;

    if (state.at >= 0) {
      var row = document.querySelector('.st[data-i="' + state.at + '"]');
      if (row) row.scrollIntoView({ block: 'nearest' });
    }
  }

  function step() {
    if (state.at >= state.steps.length - 1) { stop(); return false; }
    state.at++;
    paint();
    return true;
  }

  function play() {
    if (state.timer) { stop(); return; }
    if (state.at >= state.steps.length - 1) state.at = -1;
    document.getElementById('play').innerHTML = '&#10073;&#10073;&nbsp; Pause';
    state.timer = setInterval(function () { if (!step()) stop(); }, 950);
    step();
  }

  function stop() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    document.getElementById('play').innerHTML = '&#9654;&nbsp; Play';
  }

  /* ---------------------------------------------------------------- init */
  var people = document.querySelector('.people');
  people.innerHTML = J.contacts.map(function (c, i) {
    return '<button type="button" class="person" aria-pressed="' + (i === 0) + '" data-i="' + i + '">' +
           '<b>' + esc(c.name) + '</b><span>' + esc(c.blurb) + '</span></button>';
  }).join('');

  people.addEventListener('click', function (e) {
    var b = e.target.closest('.person');
    if (!b) return;
    people.querySelectorAll('.person').forEach(function (x) {
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    state.contact = J.contacts[parseInt(b.getAttribute('data-i'), 10)];
    reset(true);
  });

  document.getElementById('step').addEventListener('click', function () { stop(); step(); });
  document.getElementById('play').addEventListener('click', play);
  document.getElementById('reset').addEventListener('click', function () { reset(true); });

  draw();
  reset(true);
})();
