/* =========================================================
   ARCANA CLASH — キャラクターアート（SVG手続き生成）
   ヒロイックプロポーションのシルエット＋属性発光背景
   ========================================================= */
var CBART = (function () {
  'use strict';

  var PAL = {
    steel:  { a:'#93a9d0', b:'#111827', c:'#e8f1ff', g:'#2b3a5c' },
    blood:  { a:'#e0475f', b:'#1d0710', c:'#ffc2cd', g:'#7a1128' },
    earth:  { a:'#a8c96a', b:'#141d0f', c:'#eaffb4', g:'#3f5a22' },
    holy:   { a:'#ffd268', b:'#2c1e05', c:'#fff4cd', g:'#8a6410' },
    shadow: { a:'#a674ff', b:'#0e0820', c:'#e2ceff', g:'#3d1d7a' },
    wind:   { a:'#63e0c6', b:'#06231f', c:'#c9fff2', g:'#14655a' },
    fire:   { a:'#ff9a3c', b:'#240800', c:'#ffdcaa', g:'#8a2f06' },
    ice:    { a:'#79cffc', b:'#061c2f', c:'#dff3ff', g:'#0f5b8f' },
    arcane: { a:'#c98cff', b:'#150a2b', c:'#f0dcff', g:'#5a1fa8' }
  };

  /* ================= 体パーツ ================= */
  function bodyOf(t) {
    switch (t) {

      case 'bulk': return {
        head: { x:50, y:24, r:8.4 },
        hand: { x:75, y:52 },
        svg:
        // 足
        '<path d="M42 74 l-4 20 h10 l2-18z"/><path d="M58 74 l4 20 h-10 l-2-18z"/>' +
        '<path d="M35 92 h14 l1 5 h-17z"/><path d="M65 92 h-14 l-1 5 h17z"/>' +
        // 胴（怒り肩・前傾）
        '<path d="M50 28 c-11 0-19 4-22 11 l-3 11 c-1 4 2 7 5 6 l2-7 1 13 c0 8 7 12 17 12 s17-4 17-12 l1-13 2 7 c3 1 6-2 5-6 l-3-11 c-3-7-11-11-22-11z"/>' +
        // 腕（肩から連続）
        '<path d="M30 35 c-9 3-14 11-14 21 l1 16 c0 5 7 5 8 0 l1-16 c0-7 3-13 8-16z"/>' +
        '<path d="M70 35 c9 3 14 11 14 21 l-1 16 c0 5-7 5-8 0 l-1-16 c0-7-3-13-8-16z"/>' +
        '<path d="M28 34 q10-7 14 1 q-8 3-12 8z"/><path d="M72 34 q-10-7-14 1 q8 3 12 8z"/>' +
        // 腰布
        '<path d="M35 66 h30 l-3 12 h-24z"/>',
        hi: '<path d="M32 34 c-3 6-4 12-4 18 l3 0 c0-6 1-12 4-17z"/>'
      };

      case 'beast': return {
        head: { x:52, y:22, r:7.6 },
        hand: { x:76, y:66 },
        svg:
        // 後脚（デジチグレード）
        '<path d="M38 66 c-6 6-6 12-12 16 l4 6 c9-4 13-9 16-16z"/>' +
        '<path d="M60 66 c4 8 8 12 15 15 l-3 7 c-11-3-17-10-19-18z"/>' +
        '<path d="M22 88 h13 l1 5 h-16z"/><path d="M78 90 h-13 l-1 5 h16z"/>' +
        // 前傾胴＋尻尾
        '<path d="M52 27 c-12 0-19 6-21 13 l-3 12 c-1 5 3 7 6 6 l2-8 1 12 c0 8 7 12 15 12 s15-4 15-12 l1-12 2 8 c3 1 7-1 6-6 l-3-12 c-2-7-9-13-21-13z"/>' +
        '<path d="M32 58 c-10 2-16 8-19 16 c-1 3 3 5 5 2 c4-6 9-10 15-11z"/>' +
        // 長い腕
        '<path d="M31 39 c-6 4-9 11-8 18 l2 13 c1 4 6 3 6-1 l1-14z"/>' +
        '<path d="M73 39 c6 4 9 11 8 18 l-2 13 c-1 4-6 3-6-1 l-1-14z"/>',
        hi: '<path d="M34 33 c-3 6-4 11-4 16 l3 0 c0-5 1-10 4-15z"/>'
      };

      case 'robe': return {
        head: { x:50, y:19, r:7.2 },
        hand: { x:73, y:50 },
        svg:
        // ローブ裾
        '<path d="M50 25 c-8 0-13 4-14 10 l-3 12 -9 43 c11 5 41 5 52 0 l-9-43 -3-12 c-1-6-6-10-14-10z"/>' +
        // 袖
        '<path d="M35 33 c-7 4-11 11-12 19 l-1 12 c0 4 5 5 6 1 l4-16z"/>' +
        '<path d="M65 33 c7 4 11 11 12 19 l1 12 c0 4-5 5-6 1 l-4-16z"/>' +
        // 襟・前あわせ・帯
        '<path d="M42 27 l8 9 8-9 3 4 -11 12 -11-12z" opacity=".85"/>' +
        '<path d="M50 39 l3 6 -3 42 -3-42z" opacity=".5"/>' +
        '<path d="M36 52 h28 l1 5 h-30z" opacity=".85"/>',
        hi: '<path d="M38 34 c-4 10-7 25-8 40 l3 1 c1-15 4-30 8-40z"/>'
      };

      case 'wisp': return {
        head: { x:50, y:22, r:8 },
        hand: { x:75, y:48 },
        svg:
        '<path d="M50 26 c-11 0-17 6-18 14 l-2 12 c-1 6 4 10 10 12 l-4 12 c-3 9 2 18 7 22 c-2-9-1-16 3-22 l4-6 4 6 c4 6 5 13 3 22 c5-4 10-13 7-22 l-4-12 c6-2 11-6 10-12 l-2-12 c-1-8-7-14-18-14z"/>' +
        '<path d="M33 38 c-8 4-12 11-13 19 l0 9 c0 5 6 5 7 0 l2-14z"/>' +
        '<path d="M67 38 c8 4 12 11 13 19 l0 9 c0 5-6 5-7 0 l-2-14z"/>',
        hi: '<path d="M37 34 c-4 8-5 16-5 24 l3 0 c0-8 1-16 5-23z"/>'
      };

      case 'drake': return {
        head: { x:64, y:22, r:0 },
        hand: { x:24, y:56 },
        svg:
        // 尻尾
        '<path d="M40 68 c-14 4-22 12-27 24 c-1 3 4 5 6 2 c6-10 13-16 23-18z"/>' +
        // 胴
        '<path d="M50 42 c-14 0-22 8-24 17 l-2 12 c-1 8 6 14 14 15 l3 8 h20 l3-8 c8-1 15-7 14-15 l-2-12 c-2-9-10-17-24-17z"/>' +
        // 首
        '<path d="M56 44 c0-10 3-17 8-22 l7 5 c-4 5-7 10-7 17z"/>' +
        // 脚
        '<path d="M38 78 l-5 14 h10 l3-12z"/><path d="M62 78 l5 14 h-10 l-3-12z"/>' +
        '<path d="M30 90 h14 l1 5 h-17z"/><path d="M70 90 h-14 l-1 5 h17z"/>',
        hi: '<path d="M31 52 c-3 7-4 14-4 20 l3 0 c0-6 1-13 4-19z"/>'
      };

      default: /* human */ return {
        head: { x:50, y:19, r:7.2 },
        hand: { x:74, y:52 },
        svg:
        // 脚
        '<path d="M44 72 l-3 21 h9 l1-19z"/><path d="M56 72 l3 21 h-9 l-1-19z"/>' +
        '<path d="M37 91 h13 l1 5 h-16z"/><path d="M63 91 h-13 l-1 5 h16z"/>' +
        // 胴（広い肩→細い腰）
        '<path d="M50 25 c-9 0-15 4-17 10 l-3 12 c-1 5 3 7 6 6 l2-8 0 11 c0 4 2 7 5 8 l-1 12 c0 4 4 6 8 6 s8-2 8-6 l-1-12 c3-1 5-4 5-8 l0-11 2 8 c3 1 7-1 6-6 l-3-12 c-2-6-8-10-17-10z"/>' +
        // 腕
        '<path d="M31 36 c-5 4-8 10-8 16 l1 13 c0 4 5 4 6 0 l2-14z"/>' +
        '<path d="M69 36 c5 4 8 10 8 16 l-1 13 c0 4-5 4-6 0 l-2-14z"/>' +
        // マント
        '<path d="M34 30 c-5 12-7 30-7 48 l7 2 c-1-18 1-36 5-48z" opacity=".7"/>' +
        '<path d="M66 30 c5 12 7 30 7 48 l-7 2 c1-18-1-36-5-48z" opacity=".7"/>',
        hi: '<path d="M35 31 c-4 8-6 17-6 25 l3 0 c0-8 2-17 5-24z"/>'
      };
    }
  }

  /* ================= 頭部 ================= */
  function headOf(kind, p, h) {
    var x = h.x, y = h.y, r = h.r;
    var C = p.c, A = p.a;
    var eyes = function (dy, w, sep) {
      dy = dy || 1; w = w || 2.4; sep = sep || 3.2;
      return '<g fill="' + C + '"><ellipse cx="' + (x - sep) + '" cy="' + (y + dy) + '" rx="' + w + '" ry="' + (w * 0.62) + '" transform="rotate(-12 ' + (x - sep) + ' ' + (y + dy) + ')"/>' +
             '<ellipse cx="' + (x + sep) + '" cy="' + (y + dy) + '" rx="' + w + '" ry="' + (w * 0.62) + '" transform="rotate(12 ' + (x + sep) + ' ' + (y + dy) + ')"/></g>';
    };
    var skull = '<path d="M' + x + ' ' + (y - r - 2) + ' c' + (-r * 1.15) + ' 0 ' + (-r * 1.25) + ' ' + (r * 0.95) + ' ' + (-r * 1.25) + ' ' + (r * 1.5) +
      ' c0 ' + (r * 0.9) + ' ' + (r * 0.55) + ' ' + (r * 1.25) + ' ' + (r * 1.25) + ' ' + (r * 1.25) +
      ' s' + (r * 1.25) + ' ' + (-r * 0.35) + ' ' + (r * 1.25) + ' ' + (-r * 1.25) +
      ' c0 ' + (-r * 0.55) + ' ' + (-r * 0.1) + ' ' + (-r * 1.5) + ' ' + (-r * 1.25) + ' ' + (-r * 1.5) + 'z"/>';

    switch (kind) {
      case 'greathelm':
        return skull +
          '<path d="M' + (x - r) + ' ' + (y - r + 1) + ' h' + (r * 2) + ' l-1.5 4 h-' + (r * 2 - 3) + 'z" fill="' + A + '"/>' +
          '<path d="M' + x + ' ' + (y - r - 9) + ' l3 8 h-6z" fill="' + C + '"/>' +
          '<g fill="' + C + '"><rect x="' + (x - 6) + '" y="' + (y - 0.5) + '" width="4.5" height="2.4" rx="1.2"/><rect x="' + (x + 1.5) + '" y="' + (y - 0.5) + '" width="4.5" height="2.4" rx="1.2"/></g>';
      case 'helm':
        return skull +
          '<path d="M' + (x - r - 1) + ' ' + (y - 1) + ' q' + (r + 1) + ' -5 ' + (r * 2 + 2) + ' 0 l-1 2.6 q-' + (r) + ' -4 -' + (r * 2) + ' 0z" fill="' + A + '"/>' +
          '<path d="M' + (x - 1.4) + ' ' + (y - r - 1) + ' h2.8 v' + (r + 5) + ' h-2.8z" fill="' + A + '" opacity=".9"/>' +
          eyes(2.4, 2.1, 3.6);
      case 'winghelm':
        return skull +
          '<path d="M' + (x - r) + ' ' + (y - 2) + ' c-7-1-11-5-13-9 c7-1 12 1 15 6z" fill="' + A + '"/>' +
          '<path d="M' + (x + r) + ' ' + (y - 2) + ' c7-1 11-5 13-9 c-7-1-12 1-15 6z" fill="' + A + '"/>' +
          '<path d="M' + (x - 1.3) + ' ' + (y - r - 1) + ' h2.6 v' + (r + 4) + ' h-2.6z" fill="' + A + '"/>' +
          eyes(2.2, 2, 3.6);
      case 'hood':
        return '<path d="M' + x + ' ' + (y - r - 4) + ' c-' + (r * 1.5) + ' 0 -' + (r * 1.7) + ' ' + (r * 1.5) + ' -' + (r * 1.5) + ' ' + (r * 2.4) +
          ' c0.3 ' + (r * 1.1) + ' ' + (r * 0.8) + ' ' + (r * 1.3) + ' ' + (r * 1.5) + ' ' + (r * 1.3) +
          ' s' + (r * 1.4) + ' -' + (r * 0.2) + ' ' + (r * 1.5) + ' -' + (r * 1.3) +
          ' c0.2 -' + (r * 0.9) + ' 0 -' + (r * 2.4) + ' -' + (r * 1.5) + ' -' + (r * 2.4) + 'z"/>' +
          '<path d="M' + (x - r * 0.95) + ' ' + (y - 1) + ' q' + (r * 0.95) + ' ' + (r * 0.8) + ' ' + (r * 1.9) + ' 0 q-' + (r * 0.4) + ' ' + (r * 1.4) + ' -' + (r * 0.95) + ' ' + (r * 1.5) +
          ' q-' + (r * 0.55) + ' -0.1 -' + (r * 0.95) + ' -' + (r * 1.5) + 'z" fill="#01030a"/>' +
          eyes(2.2, 2.1, 3.3);
      case 'crown':
        return skull +
          '<path d="M' + (x - r - 1) + ' ' + (y - r - 1) + ' l2.5 -7 2.5 5 3 -8 3 8 3-5 3 8 3-5 2.5 7z" fill="' + A + '"/>' +
          '<circle cx="' + x + '" cy="' + (y - r - 6) + '" r="2" fill="' + C + '"/>' + eyes(1.6, 2.1, 3.3);
      case 'circlet':
        return skull +
          '<path d="M' + (x - r - 0.5) + ' ' + (y - 2.5) + ' q' + (r + 0.5) + ' -4.5 ' + (r * 2 + 1) + ' 0 l-1 2.4 q-' + r + ' -3.6 -' + (r * 2) + ' 0z" fill="' + A + '"/>' +
          '<path d="M' + x + ' ' + (y - 9) + ' l2.6 4.5 -2.6 3 -2.6-3z" fill="' + C + '"/>' + eyes(2, 2.1, 3.3);
      case 'horns':
        return skull +
          '<path d="M' + (x - 4) + ' ' + (y - r + 1) + ' Q' + (x - 14) + ' ' + (y - r - 3) + ' ' + (x - 18) + ' ' + (y - r - 13) +
            ' Q' + (x - 13) + ' ' + (y - r - 5) + ' ' + (x - 1) + ' ' + (y - r - 3) + 'z"/>' +
          '<path d="M' + (x + 4) + ' ' + (y - r + 1) + ' Q' + (x + 14) + ' ' + (y - r - 3) + ' ' + (x + 18) + ' ' + (y - r - 13) +
            ' Q' + (x + 13) + ' ' + (y - r - 5) + ' ' + (x + 1) + ' ' + (y - r - 3) + 'z"/>' +
          eyes(1.6, 2.3, 3.4);
      case 'bull':
        return skull +
          '<path d="M' + (x - r + 1) + ' ' + (y - 6) + ' Q' + (x - 16) + ' ' + (y - 6) + ' ' + (x - 23) + ' ' + (y - 14) +
            ' Q' + (x - 18) + ' ' + (y - 3) + ' ' + (x - r + 2) + ' ' + (y - 1) + 'z"/>' +
          '<path d="M' + (x + r - 1) + ' ' + (y - 6) + ' Q' + (x + 16) + ' ' + (y - 6) + ' ' + (x + 23) + ' ' + (y - 14) +
            ' Q' + (x + 18) + ' ' + (y - 3) + ' ' + (x + r - 2) + ' ' + (y - 1) + 'z"/>' +
          '<ellipse cx="' + x + '" cy="' + (y + r) + '" rx="5.5" ry="3.6" fill="' + A + '" opacity=".55"/>' +
          eyes(0.5, 2.5, 4);
      case 'wolf':
        return '<path d="M' + (x - 6) + ' ' + (y - 5) + ' l-4-11 9 6z"/><path d="M' + (x + 6) + ' ' + (y - 5) + ' l4-11 -9 6z"/>' + skull +
          '<path d="M' + (x + r - 2) + ' ' + (y + 1) + ' l9 3 -9 4z"/>' +
          '<path d="M' + (x + r + 1) + ' ' + (y + 3.4) + ' l5 0.6 -5 1.2z" fill="' + A + '"/>' +
          '<g fill="' + C + '"><path d="M' + (x - 5) + ' ' + (y - 1) + ' l5 2 -5 2z"/><path d="M' + (x + 3) + ' ' + (y - 1.5) + ' l4 1.6 -4 1.6z"/></g>';
      case 'bird':
        return skull + '<path d="M' + (x + r - 1) + ' ' + (y + 1) + ' l13 4 -13 3.5z" fill="' + A + '"/>' +
          '<path d="M' + (x - 4) + ' ' + (y - r - 2) + ' q4-7 8 0 q-4-2 -8 0z" fill="' + A + '"/>' +
          '<g fill="' + C + '"><circle cx="' + (x - 3) + '" cy="' + (y - 1) + '" r="1.9"/><circle cx="' + (x + 4) + '" cy="' + (y - 1) + '" r="1.9"/></g>';
      case 'skull':
        return skull +
          '<g fill="' + C + '"><ellipse cx="' + (x - 3.2) + '" cy="' + (y - 0.5) + '" rx="2.9" ry="3.4"/><ellipse cx="' + (x + 3.2) + '" cy="' + (y - 0.5) + '" rx="2.9" ry="3.4"/>' +
          '<path d="M' + (x - 2.4) + ' ' + (y + 5) + ' h1.6 v4 h-1.6z M' + (x + 0.8) + ' ' + (y + 5) + ' h1.6 v4 h-1.6z"/></g>';
      case 'dragon':
        return '<path d="M' + (x - 12) + ' ' + (y + 2) + ' c0-8 7-14 16-14 c11 0 20 5 24 9 l-6 3 5 3 -8 4 c-4 4-11 7-17 7 c-9 0-14-5-14-12z"/>' +
          '<path d="M' + (x - 6) + ' ' + (y - 11) + ' c-2-8 2-12 6-13 c-1 5 0 9 3 12z"/>' +
          '<path d="M' + (x + 1) + ' ' + (y - 13) + ' c0-8 4-11 9-11 c-3 4-3 8-2 11z"/>' +
          '<path d="M' + (x + 14) + ' ' + (y + 6) + ' l10 2 -10 2z" fill="' + A + '"/>' +
          '<ellipse cx="' + (x + 7) + '" cy="' + (y + 1) + '" rx="4" ry="2.4" fill="' + C + '" transform="rotate(-14 ' + (x + 7) + ' ' + (y + 1) + ')"/>';
      case 'flame':
        return '<path d="M' + x + ' ' + (y - r - 12) + ' c9 12 ' + (r + 6) + ' 16 ' + (r + 6) + ' ' + (r + 4) +
          ' c0 ' + (r * 1.1) + ' -6 ' + (r * 1.3) + ' -' + (r + 6) + ' ' + (r * 1.3) +
          ' s-' + (r + 6) + ' -' + (r * 0.3) + ' -' + (r + 6) + ' -' + (r * 1.3) + ' c0-' + (r - 2) + ' 5-' + (r + 2) + ' ' + (r + 6) + ' -' + (r + 4) + 'z"/>' +
          '<path d="M' + x + ' ' + (y - 6) + ' c4 6 6 9 6 12 c0 4-3 6-6 6 s-6-2-6-6 c0-3 2-6 6-12z" fill="' + A + '"/>' +
          eyes(1.6, 2, 3.4);
      case 'wisp':
        return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.6) + '" fill="' + A + '" opacity=".45"/>' +
          eyes(0, 2.6, 3.6);
      case 'mask':
        return skull +
          '<path d="M' + (x - r) + ' ' + (y - 3) + ' h' + (r * 2) + ' v7 q-' + r + ' 6 -' + (r * 2) + ' 0z" fill="#01030a"/>' +
          '<g fill="' + C + '"><path d="M' + (x - 5.5) + ' ' + (y) + ' l5-1.8 v3.6z"/><path d="M' + (x + 5.5) + ' ' + y + ' l-5-1.8 v3.6z"/></g>';
      default:
        return skull + '<path d="M' + (x - r) + ' ' + (y - 2) + ' q' + r + ' -8 ' + (r * 2) + ' 0 q-1-9 -' + r + ' -9 q-' + (r - 1) + ' 0 -' + r + ' 9z"/>' + eyes(1.6, 2.2, 3.3);
    }
  }

  /* ================= 武器 ================= */
  function weaponOf(kind, p, hand) {
    var A = p.a, C = p.c, hx = hand.x, hy = hand.y;
    function g(inner, rot) { return '<g transform="translate(' + hx + ' ' + hy + ') rotate(' + (rot || 0) + ')">' + inner + '</g>'; }
    switch (kind) {
      case 'sword':
        return g('<rect x="-2.4" y="-46" width="4.8" height="38" rx="1.4" fill="' + C + '"/>' +
                 '<path d="M-2.4 -46 l2.4 -7 2.4 7z" fill="' + C + '"/>' +
                 '<rect x="-9" y="-9" width="18" height="3.6" rx="1.8" fill="' + A + '"/>' +
                 '<rect x="-1.8" y="-5.4" width="3.6" height="10" rx="1.6" fill="' + A + '"/>' +
                 '<circle cx="0" cy="6" r="2.2" fill="' + C + '"/>', 16);
      case 'greatsword':
        return g('<rect x="-4.5" y="-56" width="9" height="46" rx="2" fill="' + C + '"/>' +
                 '<path d="M-4.5 -56 l4.5 -9 4.5 9z" fill="' + C + '"/>' +
                 '<rect x="-13" y="-11" width="26" height="4.5" rx="2" fill="' + A + '"/>' +
                 '<rect x="-2.6" y="-6" width="5.2" height="14" rx="2.4" fill="' + A + '"/>', 22);
      case 'axe':
        return g('<rect x="-2.2" y="-40" width="4.4" height="60" rx="2" fill="' + A + '"/>' +
                 '<path d="M2 -38 c15 2 22 11 22 20 c-9 5-18 3-22-2z" fill="' + C + '"/>' +
                 '<path d="M-2 -38 c-15 2-22 11-22 20 c9 5 18 3 22-2z" fill="' + C + '" opacity=".65"/>', -12);
      case 'lance':
        return g('<rect x="-2" y="-44" width="4" height="72" rx="2" fill="' + A + '"/>' +
                 '<path d="M0 -56 l7 14 -7 4 -7-4z" fill="' + C + '"/>' +
                 '<path d="M-5 -40 h10 l-1 5 h-8z" fill="' + C + '"/>', 26);
      case 'spear':
        return g('<rect x="-1.8" y="-48" width="3.6" height="80" rx="1.8" fill="' + A + '"/>' +
                 '<path d="M0 -60 l6 13 -6 4 -6-4z" fill="' + C + '"/>' +
                 '<rect x="-7" y="-43" width="14" height="2.4" rx="1.2" fill="' + C + '"/>', -8);
      case 'bow':
        return g('<path d="M0 -38 q17 38 0 76" stroke="' + C + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
                 '<path d="M0 -38 L-5 0 L0 38" stroke="' + A + '" stroke-width="1.5" fill="none"/>' +
                 '<rect x="-30" y="-1.3" width="34" height="2.6" rx="1.3" fill="' + C + '"/>' +
                 '<path d="M4 0 l8 -3 v6z" fill="' + C + '"/>', 0);
      case 'dagger':
        return g('<path d="M-2.6 -26 h5.2 l1 22 -3.6 5 -3.6-5z" fill="' + C + '"/>' +
                 '<rect x="-6.5" y="-28" width="13" height="3" rx="1.5" fill="' + A + '"/>', 30) +
               '<g transform="translate(' + (100 - hx) + ' ' + (hy + 4) + ') rotate(-30)">' +
                 '<path d="M-2.6 -22 h5.2 l1 19 -3.6 4 -3.6-4z" fill="' + C + '"/>' +
                 '<rect x="-6" y="-24" width="12" height="2.8" rx="1.4" fill="' + A + '"/></g>';
      case 'staff':
        return g('<rect x="-2" y="-42" width="4" height="76" rx="2" fill="' + A + '"/>' +
                 '<circle cx="0" cy="-46" r="8.5" fill="' + C + '" opacity=".55"/>' +
                 '<circle cx="0" cy="-46" r="4.5" fill="#ffffff" opacity=".9"/>' +
                 '<path d="M-7 -40 q7 -6 14 0" stroke="' + C + '" stroke-width="1.6" fill="none"/>', 9);
      case 'scythe':
        return g('<rect x="-2" y="-44" width="4" height="78" rx="2" fill="' + A + '"/>' +
                 '<path d="M0 -44 c-22 1-33 12-35 24 c15-10 28-13 35-10z" fill="' + C + '"/>' +
                 '<path d="M0 -44 c-18 2-27 11-30 20 c13-9 24-11 30-9z" fill="' + p.b + '" opacity=".35"/>', 12);
      case 'orb':
        return '<g><circle cx="' + hx + '" cy="' + (hy - 12) + '" r="10" fill="' + C + '" opacity=".45"/>' +
               '<circle cx="' + hx + '" cy="' + (hy - 12) + '" r="5.5" fill="#fff" opacity=".85"/>' +
               '<circle cx="' + (100 - hx) + '" cy="' + (hy + 6) + '" r="5.5" fill="' + C + '" opacity=".35"/>' +
               '<circle cx="' + (100 - hx - 6) + '" cy="' + (hy - 14) + '" r="3" fill="' + C + '" opacity=".3"/></g>';
      case 'shield':
        return '<g><path d="M' + (100 - hx - 12) + ' ' + (hy - 22) + ' h24 v22 c0 11-12 17-12 17 s-12-6-12-17z" fill="' + A + '"/>' +
               '<path d="M' + (100 - hx - 8) + ' ' + (hy - 18) + ' h16 v18 c0 8-8 12-8 12 s-8-4-8-12z" fill="' + C + '" opacity=".5"/>' +
               '<path d="M' + (100 - hx) + ' ' + (hy - 14) + ' v20 M' + (100 - hx - 6) + ' ' + (hy - 6) + ' h12" stroke="' + p.b + '" stroke-width="2"/></g>' +
               g('<rect x="-2.2" y="-30" width="4.4" height="30" rx="1.6" fill="' + C + '"/>' +
                 '<rect x="-8" y="0" width="16" height="3.4" rx="1.7" fill="' + A + '"/>', 8);
      case 'mace':
        return g('<rect x="-2.2" y="-14" width="4.4" height="34" rx="2" fill="' + A + '"/>' +
                 '<circle cx="0" cy="-19" r="7" fill="' + C + '"/>' +
                 '<path d="M0 -29 v4.5 M0 -13.5 v4.5 M-10 -19 h4.5 M5.5 -19 h4.5 M-7 -26 l3 3 M7 -26 l-3 3" stroke="' + C + '" stroke-width="2.6" stroke-linecap="round"/>', -14);
      case 'harp':
        return '<g transform="translate(' + (hx - 8) + ' ' + (hy - 6) + ')">' +
               '<path d="M0 -30 q18 22 6 50 l-15 0 q11-26 -1-48z" fill="' + A + '" opacity=".9"/>' +
               '<path d="M-2 -22 v40 M2 -18 v36 M6 -12 v30 M-7 -26 v44" stroke="' + C + '" stroke-width="1.3"/></g>';
      case 'claw':
        return '<g fill="' + C + '"><path d="M' + hx + ' ' + hy + ' c9 3 13 10 14 17 l-4 1 c-2-7-6-12-12-14z"/>' +
               '<path d="M' + (hx + 5) + ' ' + (hy - 5) + ' c10 4 14 12 15 20 l-4 1 c-2-8-6-14-13-17z"/>' +
               '<path d="M' + (100 - hx) + ' ' + hy + ' c-9 3-13 10-14 17 l4 1 c2-7 6-12 12-14z"/>' +
               '<path d="M' + (100 - hx - 5) + ' ' + (hy - 5) + ' c-10 4-14 12-15 20 l4 1 c2-8 6-14 13-17z"/></g>';
      case 'wings':
        return '<g fill="' + A + '" opacity=".8"><path d="M36 30 c-20 3-30 16-33 30 c11-6 16-3 21-8 c-2 8-9 11-14 18 c17-3 26-16 30-30z"/>' +
               '<path d="M64 30 c20 3 30 16 33 30 c-11-6-16-3-21-8 c2 8 9 11 14 18 c-17-3-26-16-30-30z"/></g>';
      case 'dwing':
        return '<g fill="' + A + '" opacity=".85"><path d="M42 36 c-24-9-39 2-44 16 c10-1 15 4 20 4 c-5 5-12 4-17 11 c19 6 35-4 43-21z"/>' +
               '<path d="M58 36 c24-9 39 2 44 16 c-10-1-15 4-20 4 c5 5 12 4 17 11 c-19 6-35-4-43-21z"/></g>' +
               '<g stroke="' + p.b + '" stroke-width="1" opacity=".45" fill="none">' +
               '<path d="M42 38 l-20 8 M42 42 l-16 14 M58 38 l20 8 M58 42 l16 14"/></g>';
      default: return '';
    }
  }

  /* ================= 背景装飾 ================= */
  function decoOf(kind, p) {
    var out = '', i;
    switch (kind) {
      case 'rays':
        for (i = 0; i < 14; i++)
          out += '<path d="M50 48 l-2.6 -60 5.2 0z" fill="' + p.c + '" opacity=".13" transform="rotate(' + (i * 25.7) + ' 50 48)"/>';
        return out;
      case 'embers':
        for (i = 0; i < 22; i++) {
          var x = 6 + (i * 37) % 88, y = 6 + (i * 53) % 86, r = 0.7 + (i % 4) * 0.7;
          out += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + p.c + '" opacity="' + (0.14 + (i % 5) * 0.11).toFixed(2) + '"/>';
        }
        return out;
      case 'flakes':
        for (i = 0; i < 12; i++) {
          var fx = 8 + (i * 29) % 84, fy = 8 + (i * 41) % 82, sc = (0.6 + (i % 3) * 0.4).toFixed(2);
          out += '<g transform="translate(' + fx + ' ' + fy + ') rotate(' + (i * 21) + ') scale(' + sc + ')" opacity=".3"><path d="M0 -5 v10 M-4.3 -2.5 l8.6 5 M-4.3 2.5 l8.6 -5" stroke="' + p.c + '" stroke-width="1.1"/></g>';
        }
        return out;
      case 'runes':
        for (i = 0; i < 4; i++)
          out += '<circle cx="50" cy="52" r="' + (16 + i * 13) + '" fill="none" stroke="' + p.c + '" stroke-width="0.9" opacity="' + (0.26 - i * 0.05).toFixed(2) + '" stroke-dasharray="' + (4 + i * 4) + ' ' + (4 + i * 2) + '"/>';
        return out;
      case 'moon':
        return '<circle cx="70" cy="22" r="17" fill="' + p.c + '" opacity=".26"/><circle cx="63" cy="17" r="16" fill="' + p.b + '" opacity=".9"/>';
      case 'mist':
        return '<ellipse cx="50" cy="86" rx="50" ry="16" fill="' + p.c + '" opacity=".13"/>' +
               '<ellipse cx="30" cy="72" rx="28" ry="9" fill="' + p.c + '" opacity=".1"/>' +
               '<ellipse cx="72" cy="64" rx="26" ry="8" fill="' + p.c + '" opacity=".08"/>';
      case 'leaves':
        for (i = 0; i < 12; i++) {
          var lx = 8 + (i * 31) % 84, ly = 8 + (i * 47) % 80;
          out += '<ellipse cx="' + lx + '" cy="' + ly + '" rx="4.2" ry="1.9" fill="' + p.c + '" opacity=".2" transform="rotate(' + (i * 37) + ' ' + lx + ' ' + ly + ')"/>';
        }
        return out;
      case 'bolts':
        return '<path d="M16 2 l9 24 -8-2 7 22 -16-26 8 2z" fill="' + p.c + '" opacity=".22"/>' +
               '<path d="M86 6 l-8 22 7-2 -6 20 14-24 -7 2z" fill="' + p.c + '" opacity=".18"/>' +
               '<path d="M50 0 l4 12 -3-1 3 10 -7-12 3 1z" fill="' + p.c + '" opacity=".12"/>';
      case 'blades':
        for (i = 0; i < 7; i++)
          out += '<path d="M' + (7 + i * 14) + ' 100 l3.4 -' + (26 + (i % 3) * 10) + ' 3.4 ' + (26 + (i % 3) * 10) + 'z" fill="' + p.c + '" opacity=".11"/>';
        return out;
      default: return '';
    }
  }

  /* ================= キャラ別定義 ================= */
  var ART = {
    warrior:     { body:'human', head:'helm',      wep:'sword',      deco:'blades' },
    knight:      { body:'human', head:'greathelm', wep:'lance',      deco:'rays' },
    berserker:   { body:'bulk',  head:'horns',     wep:'axe',        deco:'embers' },
    spearman:    { body:'human', head:'helm',      wep:'spear',      deco:'blades' },
    shieldguard: { body:'bulk',  head:'greathelm', wep:'shield',     deco:'runes' },
    ogre:        { body:'bulk',  head:'bare',      wep:'mace',       deco:'mist' },
    troll:       { body:'bulk',  head:'horns',     wep:'claw',       deco:'leaves' },
    golem:       { body:'bulk',  head:'mask',      wep:'mace',       deco:'runes' },
    minotaur:    { body:'bulk',  head:'bull',      wep:'axe',        deco:'mist' },
    werewolf:    { body:'beast', head:'wolf',      wep:'claw',       deco:'moon' },
    paladin:     { body:'human', head:'winghelm',  wep:'greatsword', deco:'rays' },
    archer:      { body:'human', head:'hood',      wep:'bow',        deco:'leaves' },
    rogue:       { body:'human', head:'hood',      wep:'dagger',     deco:'mist' },
    assassin:    { body:'human', head:'mask',      wep:'dagger',     deco:'mist' },
    harpy:       { body:'beast', head:'bird',      wep:'wings',      deco:'bolts' },
    valkyrie:    { body:'human', head:'winghelm',  wep:'spear',      deco:'wings' },
    vampire:     { body:'robe',  head:'bare',      wep:'wings',      deco:'moon' },
    mage:        { body:'robe',  head:'hood',      wep:'staff',      deco:'embers' },
    archmage:    { body:'robe',  head:'crown',     wep:'staff',      deco:'runes' },
    necromancer: { body:'robe',  head:'hood',      wep:'scythe',     deco:'mist' },
    frost:       { body:'wisp',  head:'wisp',      wep:'orb',        deco:'flakes' },
    dragon:      { body:'drake', head:'dragon',    wep:'dwing',      deco:'embers' },
    phoenix:     { body:'wisp',  head:'flame',     wep:'wings',      deco:'embers' },
    shaman:      { body:'robe',  head:'mask',      wep:'staff',      deco:'bolts' },
    sage:        { body:'robe',  head:'circlet',   wep:'orb',        deco:'runes' },
    priest:      { body:'robe',  head:'circlet',   wep:'mace',       deco:'rays' },
    highpriest:  { body:'robe',  head:'crown',     wep:'staff',      deco:'rays' },
    druid:       { body:'robe',  head:'horns',     wep:'staff',      deco:'leaves' },
    bard:        { body:'human', head:'bare',      wep:'harp',       deco:'bolts' },
    /* --- 追加キャラ --- */
    kingshield:  { body:'bulk',  head:'crown',     wep:'shield',     deco:'rays' },
    ancient:     { body:'bulk',  head:'greathelm', wep:'mace',       deco:'runes' },
    wyvern:      { body:'drake', head:'dragon',    wep:'wings',      deco:'embers' },
    phantom:     { body:'human', head:'hood',      wep:'bow',        deco:'wings' },
    salamander:  { body:'wisp',  head:'flame',     wep:'orb',        deco:'embers' },
    yeti:        { body:'bulk',  head:'horns',     wep:'claw',       deco:'flakes' },
    /* --- イメージ枠（図鑑にだけ出る） --- */
    paladinking: { body:'human', head:'crown',     wep:'greatsword', deco:'rays' },
    grandsage:   { body:'robe',  head:'crown',     wep:'orb',        deco:'runes' },
    saint:       { body:'robe',  head:'circlet',   wep:'staff',      deco:'rays' },
    divinearcher:{ body:'human', head:'winghelm',  wep:'bow',        deco:'rays' },
    royalguard:  { body:'bulk',  head:'greathelm', wep:'shield',     deco:'runes' },
    colossus:    { body:'bulk',  head:'mask',      wep:'mace',       deco:'runes' },
    elderdragon: { body:'drake', head:'dragon',    wep:'dwing',      deco:'embers' },
    dragonlord:  { body:'drake', head:'dragon',    wep:'dwing',      deco:'rays' },
    lich:        { body:'robe',  head:'skull',     wep:'scythe',     deco:'runes' },
    jotunn:      { body:'bulk',  head:'horns',     wep:'axe',        deco:'flakes' },
    odin:        { body:'robe',  head:'crown',     wep:'spear',      deco:'runes' }
  };

  var cache = {};

  function portrait(defId, elem) {
    if (cache[defId]) return cache[defId];
    var a = ART[defId] || { body:'human', head:'bare', wep:'sword', deco:'rays' };
    var p = PAL[elem] || PAL.steel;
    var B = bodyOf(a.body);
    var id = 'x' + defId;
    var behind = (a.wep === 'wings' || a.wep === 'dwing');

    var svg =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<radialGradient id="' + id + 'bg" cx="50%" cy="34%" r="78%">' +
          '<stop offset="0%" stop-color="' + p.a + '"/><stop offset="42%" stop-color="' + p.g + '"/>' +
          '<stop offset="100%" stop-color="' + p.b + '"/></radialGradient>' +
        '<linearGradient id="' + id + 'ink" x1="0" y1="0" x2="0.3" y2="1">' +
          '<stop offset="0%" stop-color="#1b2233"/><stop offset="60%" stop-color="#0a0e18"/>' +
          '<stop offset="100%" stop-color="#04060c"/></linearGradient>' +
        '<radialGradient id="' + id + 'vig" cx="50%" cy="45%" r="70%">' +
          '<stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".65"/></radialGradient>' +
        '<filter id="' + id + 'rim" x="-25%" y="-25%" width="150%" height="150%">' +
          '<feMorphology in="SourceAlpha" operator="dilate" radius="1.15" result="d"/>' +
          '<feFlood flood-color="' + p.c + '" flood-opacity="0.95" result="f"/>' +
          '<feComposite in="f" in2="d" operator="in" result="rim"/>' +
          '<feGaussianBlur in="rim" stdDeviation="0.35" result="rimb"/>' +
          '<feMerge><feMergeNode in="rimb"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>' +
      '</defs>' +
      '<rect width="100" height="100" fill="url(#' + id + 'bg)"/>' +
      '<g class="p-deco">' + decoOf(a.deco, p) + '</g>' +
      '<ellipse cx="50" cy="50" rx="33" ry="38" fill="' + p.c + '" opacity=".18"/>' +
      '<ellipse class="p-shadow" cx="50" cy="95" rx="30" ry="6" fill="#000" opacity=".38"/>' +
      (behind ? '<g class="p-wep p-behind" style="--hx:' + B.hand.x + ';--hy:' + B.hand.y + '">' + weaponOf(a.wep, p, B.hand) + '</g>' : '') +
      '<g class="p-fig" filter="url(#' + id + 'rim)">' +
        '<g class="p-body" fill="url(#' + id + 'ink)">' + B.svg + '</g>' +
        '<g class="p-head" fill="url(#' + id + 'ink)" style="--hdx:' + B.head.x + ';--hdy:' + B.head.y + '">' + headOf(a.head, p, B.head) + '</g>' +
      '</g>' +
      (behind ? '' : '<g class="p-wep" style="--hx:' + B.hand.x + ';--hy:' + B.hand.y + '">' + weaponOf(a.wep, p, B.hand) + '</g>') +
      '<rect class="p-vig" width="100" height="100" fill="url(#' + id + 'vig)"/>' +
      '</svg>';
    cache[defId] = svg;
    return svg;
  }

  return { parts: function (defId) {
             var a = ART[defId] || { body:'human', head:'bare', wep:'sword', deco:'rays' };
             var B = bodyOf(a.body);
             return { def: a, body: B.svg, hi: B.hi, head: headOf(a.head, PAL.steel, B.head),
                      wepOf: function (p) { return weaponOf(a.wep, p, B.hand); },
                      headOf: function (p) { return headOf(a.head, p, B.head); },
                      hand: B.hand, headPos: B.head, pal: PAL };
           },
           PAL: PAL,
           kindOf: function (defId) {
             var a = ART[defId] || { body:'human', head:'bare', wep:'sword', deco:'rays' };
             return { wep: a.wep, body: a.body };
           },
           portrait: portrait, PAL: PAL, ART: ART };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CBART;
