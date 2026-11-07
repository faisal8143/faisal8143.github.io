/*
  Renders the Contact Builder model and its detail panel.
  Author: Faisal Irfan | github.com/faisal8143
*/
(function () {
  'use strict';
  var M = window.DATA_MODEL, SVG = 'http://www.w3.org/2000/svg';
  var W = 200, H = 76;
  var cv = document.getElementById('cv');
  var G = {}; M.groups.forEach(function (g) { G[g.id] = g; });

  function el(n, a, t) {
    var e = document.createElementNS(SVG, n);
    Object.keys(a || {}).forEach(function (k) { e.setAttribute(k, a[k]); });
    if (t !== undefined) e.textContent = t;
    return e;
  }

  /* Edge between box borders, so a line never runs under a box */
  function edge(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    function port(n, ox, oy) {
      if (Math.abs(ox) > Math.abs(oy) * 1.6) return { x: n.x + (ox > 0 ? W / 2 : -W / 2), y: n.y };
      return { x: n.x, y: n.y + (oy > 0 ? H / 2 : -H / 2) };
    }
    var p1 = port(a, dx, dy), p2 = port(b, -dx, -dy);
    return { d: 'M' + p1.x + ' ' + p1.y + ' L' + p2.x + ' ' + p2.y,
             mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
  }

  function draw() {
    cv.innerHTML = '';
    M.links.forEach(function (l) {
      var e = edge(G[l.from], G[l.to]);
      var g = el('g');
      g.appendChild(el('path', { class: 'lk' + (l.card === 'build' ? ' build' : ''), d: e.d }));
      g.appendChild(el('rect', { x: e.mx - 20, y: e.my - 9, width: 40, height: 17, rx: 5,
                                 fill: '#131E33', stroke: '#27395E', 'stroke-width': 1 }));
      g.appendChild(el('text', { class: 'lkl', x: e.mx, y: e.my + 3, 'text-anchor': 'middle' },
                       l.card === 'build' ? 'built' : l.card));
      cv.appendChild(g);
    });

    M.groups.forEach(function (n) {
      var g = el('g', { class: 'grp ' + (n.kind === 'group' ? '' : n.kind), 'data-id': n.id,
                        tabindex: '0', role: 'button', 'aria-label': n.name });
      g.appendChild(el('rect', { x: n.x - W / 2, y: n.y - H / 2, width: W, height: H, rx: 12 }));
      g.appendChild(el('text', { class: 't', x: n.x, y: n.y - 6, 'text-anchor': 'middle' }, n.name));
      g.appendChild(el('text', { class: 's', x: n.x, y: n.y + 13, 'text-anchor': 'middle' },
                       n.des.length + (n.des.length === 1 ? ' data extension' : ' data extensions')));
      g.appendChild(el('text', { class: 's', x: n.x, y: n.y + 28, 'text-anchor': 'middle' },
                       n.kind === 'system' ? 'system' : n.kind === 'sendable' ? 'sendable' : 'attribute group'));
      g.addEventListener('click', function () { select(n.id); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id); }
      });
      cv.appendChild(g);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  function select(id) {
    var n = G[id];
    cv.querySelectorAll('.grp').forEach(function (g) {
      g.classList.toggle('on', g.getAttribute('data-id') === id);
    });
    document.getElementById('sideTitle').textContent = n.name;
    document.getElementById('sideBlurb').textContent = n.blurb;
    document.getElementById('sideBody').innerHTML = n.des.map(function (d) {
      var card = d.sendable ? '<span class="card c-send">Sendable</span>'
               : d.card === 'many' ? '<span class="card c-many">One contact : many rows</span>'
               : '<span class="card c-one">One contact : one row</span>';
      return '<div class="de"><h4>' + esc(d.name) + '</h4>' + card +
             '<ul>' + d.fields.map(function (f) {
               return '<li' + (/PK/.test(f) ? ' class="pk"' : '') + '>' + esc(f) + '</li>';
             }).join('') + '</ul><p>' + esc(d.note) + '</p></div>';
    }).join('');
  }

  document.getElementById('rules').innerHTML = M.rules.map(function (r) {
    return '<div><b>' + esc(r.t) + '</b><span>' + esc(r.d) + '</span></div>';
  }).join('');

  draw();
  select('identity');
})();
