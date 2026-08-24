/* 文章の組み合わせエンジン。
   {a|b|c} で言い換え（入れ子OK）、$name で状況に応じた語を差し込む。
   ・expand() … 1つ選んで文章にする
   ・count()  … 何通りあるかを数える
   ブラウザにもそのまま載せるので、依存は持たない。                     */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VARI = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- 解析 ---------- */
  function parse(str) {
    var pos = 0;
    function seq(stop) {
      var items = [], buf = '';
      function flush() { if (buf) { items.push({ t: 'lit', v: buf }); buf = ''; } }
      while (pos < str.length) {
        var ch = str[pos];
        if (stop && (ch === '|' || ch === '}')) break;
        if (ch === '{') { pos++; flush(); items.push(alt()); continue; }
        if (ch === '$') {
          var m = /^\$([a-zA-Z_][a-zA-Z0-9_]*)/.exec(str.slice(pos));
          if (m) { pos += m[0].length; flush(); items.push({ t: 'var', v: m[1] }); continue; }
        }
        buf += ch; pos++;
      }
      flush();
      return { t: 'seq', v: items };
    }
    function alt() {
      var opts = [seq(true)];
      while (str[pos] === '|') { pos++; opts.push(seq(true)); }
      if (str[pos] === '}') pos++;
      return { t: 'alt', v: opts };
    }
    return seq(false);
  }

  /* ---------- 数える ---------- */
  function count(node, vars) {
    if (typeof node === 'string') node = parse(node);
    switch (node.t) {
      case 'lit': return 1;
      case 'var': return (vars && vars[node.v]) || 1;
      case 'seq': return node.v.reduce(function (a, n) { return a * count(n, vars); }, 1);
      case 'alt': return node.v.reduce(function (a, n) { return a + count(n, vars); }, 0);
    }
    return 1;
  }

  /* ---------- 1つ選ぶ ---------- */
  function expand(node, ctx, rnd) {
    rnd = rnd || Math.random;
    if (typeof node === 'string') node = parse(node);
    switch (node.t) {
      case 'lit': return node.v;
      case 'var':
        var f = ctx && ctx[node.v];
        return typeof f === 'function' ? f() : (f == null ? '' : String(f));
      case 'seq': return node.v.map(function (n) { return expand(n, ctx, rnd); }).join('');
      case 'alt': return expand(node.v[Math.floor(rnd() * node.v.length)], ctx, rnd);
    }
    return '';
  }

  return { parse: parse, count: count, expand: expand };
});
