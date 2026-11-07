/*
  ==========================================================================
  MINI AMPSCRIPT EVALUATOR  (browser, dependency-free)
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  Evaluates the subset of AMPscript used by the demo template so the page can
  render a real Marketing Cloud email against different subscriber rows
  without a Marketing Cloud login.

  Supported
    blocks        %%[ ... ]%%            statement block
    inline        %%=v(@x)=%%            output an expression
    statements    SET, IF / ELSEIF / ELSE / ENDIF, FOR / NEXT
    operators     == != <> > >= < <= AND OR NOT, string concat via Concat()
    literals      "double" 'single' numbers true/false
    functions     Lookup, LookupRows, LookupOrderedRows, Row, Field, RowCount,
                  Empty, Trim, ProperCase, Uppercase, Lowercase, Concat,
                  Length, Substring, IndexOf, Replace, IIF,
                  FormatDate, FormatNumber, Now, DateDiff, DateAdd,
                  Add, Subtract, Multiply, Divide, Mod, AttributeValue,
                  URLEncode, RedirectTo, ProperCase

  Not a Marketing Cloud emulator. It covers the documented behaviour of these
  functions closely enough to preview personalisation logic, including the
  fallbacks that decide what a subscriber actually sees.
  ==========================================================================
*/
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- lexer */
  function tokenize(src) {
    var t = [], i = 0, n = src.length;
    var two = ['==', '!=', '<>', '>=', '<='];
    while (i < n) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '*') { var e = src.indexOf('*/', i); i = e === -1 ? n : e + 2; continue; }
      if (c === '"' || c === "'") {
        var q = c, s = ''; i++;
        while (i < n && src[i] !== q) { s += src[i++]; }
        i++; t.push({ k: 'str', v: s }); continue;
      }
      if (/[0-9]/.test(c)) {
        var num = ''; while (i < n && /[0-9.]/.test(src[i])) num += src[i++];
        t.push({ k: 'num', v: parseFloat(num) }); continue;
      }
      if (c === '@' || /[A-Za-z_]/.test(c)) {
        var w = ''; if (c === '@') { w = '@'; i++; }
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) w += src[i++];
        t.push({ k: w[0] === '@' ? 'var' : 'word', v: w }); continue;
      }
      var pair = src.substr(i, 2);
      if (two.indexOf(pair) !== -1) { t.push({ k: 'op', v: pair }); i += 2; continue; }
      t.push({ k: 'op', v: c }); i++;
    }
    return t;
  }

  /* --------------------------------------------------------------- parser */
  function Parser(tokens) { this.t = tokens; this.i = 0; }
  Parser.prototype.peek = function (o) { return this.t[this.i + (o || 0)]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.isWord = function (w) {
    var p = this.peek();
    return p && p.k === 'word' && p.v.toUpperCase() === w;
  };
  Parser.prototype.eatOp = function (v) {
    var p = this.peek();
    if (p && p.k === 'op' && p.v === v) { this.i++; return true; }
    return false;
  };

  Parser.prototype.parseBlock = function (stops) {
    var out = [];
    while (this.i < this.t.length) {
      var p = this.peek();
      if (p.k === 'word' && stops.indexOf(p.v.toUpperCase()) !== -1) break;
      out.push(this.parseStatement());
    }
    return out;
  };

  Parser.prototype.parseStatement = function () {
    var p = this.peek();
    if (p.k === 'word') {
      var w = p.v.toUpperCase();
      if (w === 'SET') {
        this.next();
        var target = this.next();            // @var
        this.eatOp('=');
        return { t: 'set', name: target.v, expr: this.parseExpr() };
      }
      if (w === 'IF') {
        this.next();
        var branches = [], cond = this.parseExpr();
        if (this.isWord('THEN')) this.next();
        branches.push({ cond: cond, body: this.parseBlock(['ELSEIF', 'ELSE', 'ENDIF']) });
        while (this.isWord('ELSEIF')) {
          this.next();
          var c2 = this.parseExpr();
          if (this.isWord('THEN')) this.next();
          branches.push({ cond: c2, body: this.parseBlock(['ELSEIF', 'ELSE', 'ENDIF']) });
        }
        var els = null;
        if (this.isWord('ELSE')) { this.next(); els = this.parseBlock(['ENDIF']); }
        if (this.isWord('ENDIF')) this.next();
        return { t: 'if', branches: branches, els: els };
      }
      if (w === 'FOR') {
        this.next();
        var v = this.next().v;
        this.eatOp('=');
        var from = this.parseExpr();
        var dir = 'TO';
        if (this.isWord('TO')) this.next(); else if (this.isWord('DOWNTO')) { this.next(); dir = 'DOWNTO'; }
        var to = this.parseExpr();
        if (this.isWord('DO')) this.next();
        var body = this.parseBlock(['NEXT']);
        if (this.isWord('NEXT')) { this.next(); if (this.peek() && this.peek().k === 'var') this.next(); }
        return { t: 'for', v: v, from: from, to: to, dir: dir, body: body };
      }
    }
    return { t: 'expr', expr: this.parseExpr() };    // bare call, e.g. OutputLine
  };

  /* expressions: OR < AND < compare < concat/add < unary < primary */
  Parser.prototype.parseExpr = function () { return this.parseOr(); };
  Parser.prototype.parseOr = function () {
    var l = this.parseAnd();
    while (this.isWord('OR')) { this.next(); l = { t: 'bin', op: 'OR', l: l, r: this.parseAnd() }; }
    return l;
  };
  Parser.prototype.parseAnd = function () {
    var l = this.parseCmp();
    while (this.isWord('AND')) { this.next(); l = { t: 'bin', op: 'AND', l: l, r: this.parseCmp() }; }
    return l;
  };
  Parser.prototype.parseCmp = function () {
    var l = this.parseAdd(), p = this.peek();
    while (p && p.k === 'op' && ['==', '!=', '<>', '>', '>=', '<', '<='].indexOf(p.v) !== -1) {
      this.next();
      l = { t: 'bin', op: p.v, l: l, r: this.parseAdd() };
      p = this.peek();
    }
    return l;
  };
  Parser.prototype.parseAdd = function () {
    var l = this.parseUnary(), p = this.peek();
    while (p && p.k === 'op' && (p.v === '+' || p.v === '-')) {
      this.next();
      l = { t: 'bin', op: p.v, l: l, r: this.parseUnary() };
      p = this.peek();
    }
    return l;
  };
  Parser.prototype.parseUnary = function () {
    if (this.isWord('NOT')) { this.next(); return { t: 'not', e: this.parseUnary() }; }
    return this.parsePrimary();
  };
  Parser.prototype.parsePrimary = function () {
    var p = this.next();
    if (!p) return { t: 'lit', v: '' };
    if (p.k === 'str') return { t: 'lit', v: p.v };
    if (p.k === 'num') return { t: 'lit', v: p.v };
    if (p.k === 'var') return { t: 'ref', name: p.v };
    if (p.k === 'op' && p.v === '(') { var e = this.parseExpr(); this.eatOp(')'); return e; }
    if (p.k === 'word') {
      var up = p.v.toUpperCase();
      if (up === 'TRUE') return { t: 'lit', v: true };
      if (up === 'FALSE') return { t: 'lit', v: false };
      if (this.peek() && this.peek().k === 'op' && this.peek().v === '(') {
        this.next();
        var args = [];
        if (!(this.peek() && this.peek().k === 'op' && this.peek().v === ')')) {
          args.push(this.parseExpr());
          while (this.eatOp(',')) args.push(this.parseExpr());
        }
        this.eatOp(')');
        return { t: 'call', name: p.v, args: args };
      }
      return { t: 'lit', v: p.v };
    }
    return { t: 'lit', v: '' };
  };

  /* ------------------------------------------------------------ functions */
  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

  function toStr(v) { return v === null || v === undefined ? '' : String(v); }
  function toNum(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function truthy(v) {
    if (v === true) return true;
    if (v === false || v === null || v === undefined) return false;
    var s = String(v).toLowerCase();
    return !(s === '' || s === 'false' || s === '0');
  }
  function parseDate(v) {
    if (v instanceof Date) return v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  function fmtDate(d, pattern) {
    d = parseDate(d);
    var pad = function (x) { return x < 10 ? '0' + x : '' + x; };
    var map = {
      'yyyy': d.getFullYear(), 'yy': String(d.getFullYear()).slice(-2),
      'MMMM': MONTHS[d.getMonth()], 'MMM': MONTHS[d.getMonth()].slice(0, 3),
      'MM': pad(d.getMonth() + 1), 'M': d.getMonth() + 1,
      'dddd': ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()],
      'dd': pad(d.getDate()), 'd': d.getDate(),
      'HH': pad(d.getHours()), 'mm': pad(d.getMinutes())
    };
    return String(pattern || 'M/d/yyyy').replace(
      /yyyy|yy|MMMM|MMM|MM|M|dddd|dd|d|HH|mm/g, function (m) { return map[m]; });
  }

  function makeFns(ctx) {
    var F = {};
    F.lookup = function (de, col, k1, v1, k2, v2) {
      var rows = F.lookuprows(de, k1, v1, k2, v2);
      return rows.length ? toStr(rows[0][col]) : '';
    };
    F.lookuprows = function (de, k1, v1, k2, v2) {
      var tbl = ctx.data[de] || [];
      return tbl.filter(function (r) {
        if (k1 !== undefined && String(r[k1]) !== String(v1)) return false;
        if (k2 !== undefined && String(r[k2]) !== String(v2)) return false;
        return true;
      });
    };
    F.lookuporderedrows = function (de, count, orderBy, k1, v1) {
      var rows = F.lookuprows(de, k1, v1).slice();
      if (orderBy) {
        var parts = String(orderBy).trim().split(/\s+/);
        var col = parts[0], desc = (parts[1] || '').toUpperCase() === 'DESC';
        rows.sort(function (a, b) {
          var x = a[col], y = b[col];
          if (x === y) return 0;
          return (x > y ? 1 : -1) * (desc ? -1 : 1);
        });
      }
      return count > 0 ? rows.slice(0, count) : rows;
    };
    F.row = function (rows, i) { return (rows || [])[(i || 1) - 1] || {}; };
    F.field = function (row, name) { return row && row[name] !== undefined ? row[name] : ''; };
    F.rowcount = function (rows) { return (rows || []).length; };
    F.empty = function (v) { return v === null || v === undefined || String(v) === ''; };
    F.trim = function (v) { return toStr(v).trim(); };
    F.propercase = function (v) {
      return toStr(v).toLowerCase().replace(/(^|[\s'-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    };
    F.uppercase = function (v) { return toStr(v).toUpperCase(); };
    F.lowercase = function (v) { return toStr(v).toLowerCase(); };
    F.concat = function () { return [].map.call(arguments, toStr).join(''); };
    F.length = function (v) { return toStr(v).length; };
    F.substring = function (v, start, len) {
      var s = toStr(v), i = Math.max(0, (start || 1) - 1);
      return len === undefined ? s.substring(i) : s.substr(i, len);
    };
    F.indexof = function (hay, needle) { return toStr(hay).indexOf(toStr(needle)) + 1; };
    F.replace = function (s, a, b) { return toStr(s).split(toStr(a)).join(toStr(b)); };
    F.iif = function (c, a, b) { return truthy(c) ? a : b; };
    F.formatdate = function (d, pattern) { return fmtDate(d, pattern); };
    F.formatnumber = function (v, pattern) {
      var n = toNum(v), p = String(pattern || '');
      if (/^N0$/i.test(p)) return Math.round(n).toLocaleString('en-US');
      if (/^N2$/i.test(p)) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (/^C$/i.test(p)) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (/^P/i.test(p)) return (n * 100).toFixed(0) + '%';
      return String(n);
    };
    F.now = function () { return ctx.now; };
    F.datediff = function (a, b, part) {
      var d1 = parseDate(a), d2 = parseDate(b), ms = d2 - d1;
      var p = String(part || 'D').toUpperCase();
      if (p === 'Y') return d2.getFullYear() - d1.getFullYear();
      if (p === 'M') return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      if (p === 'H') return Math.floor(ms / 3600000);
      if (p === 'MI') return Math.floor(ms / 60000);
      return Math.floor(ms / 86400000);
    };
    F.dateadd = function (d, amount, part) {
      var x = new Date(parseDate(d).getTime()), p = String(part || 'D').toUpperCase(), a = toNum(amount);
      if (p === 'Y') x.setFullYear(x.getFullYear() + a);
      else if (p === 'M') x.setMonth(x.getMonth() + a);
      else if (p === 'H') x.setHours(x.getHours() + a);
      else x.setDate(x.getDate() + a);
      return x;
    };
    F.add = function (a, b) { return toNum(a) + toNum(b); };
    F.subtract = function (a, b) { return toNum(a) - toNum(b); };
    F.multiply = function (a, b) { return toNum(a) * toNum(b); };
    F.divide = function (a, b) { return toNum(b) === 0 ? 0 : toNum(a) / toNum(b); };
    F.mod = function (a, b) { return toNum(b) === 0 ? 0 : toNum(a) % toNum(b); };
    F.attributevalue = function (name) {
      var v = ctx.subscriber[name];
      return v === undefined ? '' : v;
    };
    F.urlencode = function (v) { return encodeURIComponent(toStr(v)); };
    F.redirectto = function (v) { return toStr(v); };
    return F;
  }

  /* ----------------------------------------------------------- evaluator */
  function Interp(ctx) {
    this.ctx = ctx;
    this.vars = {};
    this.fns = makeFns(ctx);
    this.trace = [];
  }
  /* Keys are stored without the leading @ and lower-cased, so @FirstName,
     @firstname and a later read of vars.firstname all reach the same slot. */
  function vkey(name) { return String(name).replace(/^@/, '').toLowerCase(); }

  Interp.prototype.get = function (name) {
    var v = this.vars[vkey(name)];
    return v === undefined ? '' : v;
  };
  Interp.prototype.set = function (name, val) {
    this.vars[vkey(name)] = val;
    this.trace.push({ name: name, value: val });
  };

  Interp.prototype.evalExpr = function (n) {
    switch (n.t) {
      case 'lit': return n.v;
      case 'ref': return this.get(n.name);
      case 'not': return !truthy(this.evalExpr(n.e));
      case 'bin': {
        var op = n.op;
        if (op === 'AND') return truthy(this.evalExpr(n.l)) && truthy(this.evalExpr(n.r));
        if (op === 'OR') return truthy(this.evalExpr(n.l)) || truthy(this.evalExpr(n.r));
        var a = this.evalExpr(n.l), b = this.evalExpr(n.r);
        switch (op) {
          case '==': return String(a) === String(b);
          case '!=': case '<>': return String(a) !== String(b);
          case '>': return toNum(a) > toNum(b);
          case '>=': return toNum(a) >= toNum(b);
          case '<': return toNum(a) < toNum(b);
          case '<=': return toNum(a) <= toNum(b);
          case '+': return (typeof a === 'number' && typeof b === 'number') ? a + b : toStr(a) + toStr(b);
          case '-': return toNum(a) - toNum(b);
        }
        return '';
      }
      case 'call': {
        var f = this.fns[n.name.toLowerCase()];
        var args = n.args.map(this.evalExpr, this);
        if (!f) throw new Error('Unsupported function: ' + n.name + '()');
        return f.apply(null, args);
      }
    }
    return '';
  };

  Interp.prototype.run = function (stmts) {
    for (var i = 0; i < stmts.length; i++) {
      var s = stmts[i];
      if (s.t === 'set') { this.set(s.name, this.evalExpr(s.expr)); }
      else if (s.t === 'expr') { this.evalExpr(s.expr); }
      else if (s.t === 'if') {
        var done = false;
        for (var b = 0; b < s.branches.length; b++) {
          if (truthy(this.evalExpr(s.branches[b].cond))) { this.run(s.branches[b].body); done = true; break; }
        }
        if (!done && s.els) this.run(s.els);
      }
      else if (s.t === 'for') {
        var from = toNum(this.evalExpr(s.from)), to = toNum(this.evalExpr(s.to));
        var step = s.dir === 'DOWNTO' ? -1 : 1, guard = 0;
        for (var v = from; step > 0 ? v <= to : v >= to; v += step) {
          this.set(s.v, v);
          this.run(s.body);
          if (++guard > 1000) break;
        }
      }
    }
  };

  /* ------------------------------------------------------------- template */
  /*
    AMPscript control flow wraps HTML: an IF opened in one %%[ ]%% block
    closes in a later one, and the markup between them is what gets gated.
    So the template is not evaluated block by block. It is first flattened
    into ONE program -- literal HTML becomes __emit(n), %%=expr=%% becomes
    __out(expr), and block code is spliced in as-is -- then parsed and run
    as a single statement tree. That is what makes
        %%[ IF @x THEN ]%% <p>A</p> %%[ ELSE ]%% <p>B</p> %%[ ENDIF ]%%
    emit one paragraph instead of both.
  */
  function flatten(template) {
    var parts = [], src = '', i = 0;

    function emitText(txt) {
      if (!txt) return;
      parts.push(txt);
      src += '\n__emit(' + (parts.length - 1) + ')\n';
    }

    while (i < template.length) {
      var b = template.indexOf('%%[', i);
      var n = template.indexOf('%%=', i);
      if (b === -1 && n === -1) { emitText(template.slice(i)); break; }

      var isBlock = b !== -1 && (n === -1 || b < n);
      var start = isBlock ? b : n;
      emitText(template.slice(i, start));

      if (isBlock) {
        var e = template.indexOf(']%%', start);
        if (e === -1) { emitText(template.slice(start)); break; }
        src += '\n' + template.slice(start + 3, e) + '\n';
        i = e + 3;
      } else {
        var e2 = template.indexOf('=%%', start);
        if (e2 === -1) { emitText(template.slice(start)); break; }
        var expr = template.slice(start + 3, e2).trim();
        if (/^v\s*\(/i.test(expr)) expr = expr.replace(/^v\s*\(/i, '(');
        src += '\n__out(' + expr + ')\n';
        i = e2 + 3;
      }
    }
    return { src: src, parts: parts };
  }

  function render(template, ctx) {
    var flat = flatten(template);
    var interp = new Interp(ctx);
    var buf = [];

    interp.fns.__emit = function (idx) { buf.push(flat.parts[idx]); return ''; };
    interp.fns.__out  = function (v) { buf.push(toStr(v)); return ''; };

    var errors = [];
    try {
      interp.run(new Parser(tokenize(flat.src)).parseBlock([]));
    } catch (e) {
      errors.push(e.message);
    }
    return { html: buf.join(''), vars: interp.vars, trace: interp.trace, errors: errors };
  }

  global.MiniAmp = { render: render, tokenize: tokenize, Parser: Parser };
})(window);
