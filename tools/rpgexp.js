/* Phase 1 の探索画面を1枚のHTMLに焼く。
   node tools/rpgexp.js  →  rpgexp.html ＋ docs/rpgexp.html（本文のみ）

   設計の芯：部屋の「中身」（形・特徴・出口）がひとつのデータで、
   描写も選択肢も地図も、全部そこから引く。
   説明に出ていないものが選択肢に並ぶことは、構造的に起きない。          */

const fs = require('fs');
const path = require('path');
const { wrap } = require('./standalone.js');

const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const strip = s => s
  .replace(/^\s*const \{?[^=]*\}? *= *require\([^)]*\);?\s*$/gm, '')
  .replace(/^\s*module\.exports.*$/gm, '')
  .replace(/\nif \(require\.main === module\) \{[\s\S]*$/m, '\n');

const DATA = [
  R('../src/vari.js'),
  strip(R('./rpgdungeons.js')),
  strip(R('./rpgwalk.js')),
  strip(R('./rpgkeys.js')),
  strip(R('./rpgrooms.js')),
  strip(R('./rpggen.js'))
].join('\n');

const CSS = `
:root{
  --ground:#080b12; --panel:#0d1220; --panel2:#111a2c;
  --line:#1e2740; --line2:#2b3752;
  --ink:#dde5f5; --ink2:#94a4c4; --ink3:#6c7b9c;
  --gold:#f2c65c; --ok:#7de8a4; --mid:#7fd4ff; --ng:#ff8f8f; --warn:#ffc06a;
  --font:"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif;
}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--font);
  font-size:14px;line-height:1.75;-webkit-text-size-adjust:100%;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100svh;max-width:1100px;margin:0 auto}
.top{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:8px 10px;
  flex-wrap:nowrap;overflow:hidden;
  border-bottom:1px solid var(--line);background:var(--panel)}
.top b{color:var(--gold);font-size:14px;white-space:nowrap;flex:0 1 auto;
  min-width:3.2em;overflow:hidden;text-overflow:ellipsis}
.top .sp{flex:1}
.top .spot{font-size:12px;color:var(--ink2);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;max-width:11em}
.top .spot:before{content:"／ ";color:var(--ink3)}
.chip{flex:0 0 auto;font-size:11px;color:var(--ink2);border:1px solid var(--line2);
  border-radius:999px;padding:2px 9px;white-space:nowrap;background:var(--panel2)}
@media (max-width:392px){ .top .spot{display:none} .chip{padding:2px 7px;font-size:10.5px} }
.chip.on{color:var(--gold);border-color:var(--gold)}
.body{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.mapwrap{flex:0 0 auto;padding:8px 10px 0;display:flex;justify-content:center}
.mapwrap svg{width:100%;max-width:min(100%,30svh);height:auto;display:block;
  background:#e6dfca;border:2px solid #241f14;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.side{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:8px 10px 0}
.narr{flex:1 1 0;overflow-y:auto;min-height:7.5em;padding:10px 12px;
  background:var(--panel);border:1px solid var(--line);border-radius:10px;
  -webkit-overflow-scrolling:touch}
.narr p{margin:0 0 10px}
.narr p:last-child{margin-bottom:0}
.narr .cap{color:var(--gold);font-weight:700;font-size:15px;margin:4px 0 8px;
  padding-top:10px;border-top:1px dashed var(--line2)}
.narr .cap:first-child{border-top:0;padding-top:0}
.narr .em{color:var(--gold)}
.narr .sys{color:var(--mid);font-size:12.5px}
.narr .bad{color:var(--ng);font-size:12.5px}
.choices{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;gap:6px;padding:8px 0 0;
  max-height:min(212px,34svh);overflow-y:auto;-webkit-overflow-scrolling:touch}
.choices .btn{flex:0 0 auto}
.btn{appearance:none;width:100%;text-align:left;font:inherit;font-size:13.5px;
  color:var(--ink);background:var(--panel2);border:1px solid var(--line2);
  border-radius:9px;padding:9px 12px;cursor:pointer}
.btn:active{background:#18233a}
.btn .k{color:var(--ink3);font-size:11.5px;margin-left:6px}
.btn.go{border-color:#33507a}
.btn.act{border-color:var(--gold);color:var(--gold)}
.party{flex:0 0 auto;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px 10px}
.pm{background:var(--panel);border:1px solid var(--line);border-radius:8px;
  padding:5px 3px;text-align:center;min-width:0}
.pm .n{font-size:10.5px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm .h{font-size:12px;color:var(--ok);font-variant-numeric:tabular-nums}
.pm.back{opacity:.72}
.pm.back .n:before{content:"後 ";color:var(--ink3)}
body.land .body{flex-direction:row;gap:8px}
body.land .mapwrap{flex:0 0 42%;padding:8px 0 8px 10px;align-items:flex-start}
body.land .mapwrap svg{max-width:100%;max-height:calc(100svh - 96px)}
body.land .side{padding:8px 10px 0 0}
.setup{position:fixed;inset:0;background:rgba(4,6,11,.94);display:flex;
  align-items:center;justify-content:center;padding:18px;z-index:9}
.card{width:100%;max-width:460px;max-height:88svh;overflow-y:auto;background:var(--panel);
  border:1px solid var(--line2);border-radius:14px;padding:16px}
.card h1{margin:0 0 4px;font-size:17px;color:var(--gold)}
.card .lead{margin:0 0 14px;color:var(--ink2);font-size:12.5px}
.card h2{margin:14px 0 6px;font-size:12px;color:var(--ink3);font-weight:600;letter-spacing:.06em}
.opts{display:flex;flex-wrap:wrap;gap:6px}
.opt{font:inherit;font-size:12.5px;color:var(--ink2);background:var(--panel2);
  border:1px solid var(--line2);border-radius:8px;padding:7px 11px;cursor:pointer}
.opt.on{color:var(--gold);border-color:var(--gold);background:#181d2c}
.card .dsub{color:var(--ink3);font-size:11.5px;margin-top:8px;line-height:1.6}
.start{margin-top:16px;width:100%;font:inherit;font-size:14px;color:#1a1305;
  background:var(--gold);border:0;border-radius:10px;padding:11px;cursor:pointer;font-weight:700}
.vrow{display:flex;align-items:flex-start;gap:8px;margin:7px 0}
.vrow .vlab{flex:0 0 5.4em;font-size:11.5px;color:var(--ink3);padding-top:8px}
.vrow .opts{flex:1}
.vrow .opt{padding:5px 9px;font-size:11.5px}
body.mapzoom .mapwrap{position:fixed;inset:0;z-index:8;background:rgba(4,6,11,.92);
  display:block;overflow:auto;padding:20px;-webkit-overflow-scrolling:touch}
body.mapzoom .mapwrap svg{margin:0 auto;display:block}
.mapctl{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9}
.mapctl button{font:inherit;font-size:18px;width:42px;height:42px;border-radius:10px;
  border:1px solid var(--line2);background:var(--panel);color:var(--ink);cursor:pointer}
.maphint{position:absolute;right:16px;bottom:6px;font-size:10px;color:#8a8264;pointer-events:none}
.mapwrap{position:relative}
`;

const APP = String.raw`
/* ================= 状態 ================= */
var PARTY = [
  { n:'聖騎士', hp:14, mx:14, row:0 }, { n:'狂戦士', hp:12, mx:12, row:0 },
  { n:'槍兵',   hp:11, mx:11, row:0 }, { n:'高僧',   hp:9,  mx:9,  row:1 },
  { n:'魔術師', hp:8,  mx:8,  row:1 }, { n:'狩人',   hp:10, mx:10, row:1 }
];
var S = null;

function rnd(){ return Math.random(); }
function ctxOf(dun){
  var d = DUNGEONS[dun], c = {};
  for (var k in d.V) (function(k){ c[k] = function(){ return VARI.expand(d.V[k], c, rnd); }; })(k);
  c.who  = function(){ var a=PARTY.filter(function(p){return p.hp>0;}); return (a[Math.floor(rnd()*a.length)]||PARTY[0]).n; };
  c.hurt = function(){
    var a = PARTY.filter(function(p){ return p.hp>0 && p.hp < p.mx; });
    if (!a.length) a = PARTY.filter(function(p){ return p.hp>0; });
    return (a[Math.floor(rnd()*a.length)]||PARTY[0]).n;
  };
  return c;
}
function tidy(s){
  return s.replace(/([^\x00-\x7F]) +/g, '$1').replace(/ +([^\x00-\x7F])/g, '$1')
          .replace(/。+/g, '。').replace(/、。/g, '。');
}
function narrBox(){ return document.getElementById('narr'); }
function say(t, cls, ctx2){
  var box = narrBox();
  var p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = tidy(VARI.expand(t, ctx2 || S.ctx, rnd));
  box.appendChild(p);
  while (box.children.length > 60) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
  return p;
}
function caption(txt){
  var box = narrBox();
  var p = document.createElement('p');
  p.className = 'cap';
  p.textContent = '◆ ' + txt;
  box.appendChild(p);
  return p;
}

/* ================= 場所の名前 ================= */
function labelOf(n){
  if (n.kind === 'corridor') return '通路';
  return (n.revealed && n.name) ? n.name : (n.alias || '名の無い部屋');
}

/* ================= 方角と出口 ================= */
function exitsOf(n){
  var out = [];
  n.links.forEach(function(cid){
    var c = S.map.byId[cid];
    if (!c) return;
    if (n.kind === 'corridor'){
      var f0 = S.map.byId[cid];       /* corridor の links は部屋 */
      var dx0 = f0.gx - n.gx, dy0 = f0.gy - n.gy;
      out.push({ via:null, far:f0,
        dir: Math.abs(dx0) > Math.abs(dy0) ? (dx0 > 0 ? '東' : '西') : (dy0 > 0 ? '南' : '北') });
    } else {
      var far = S.map.byId[c.from === n.id ? c.to : c.from];
      var dx = c.gx - n.gx, dy = c.gy - n.gy;
      out.push({ via:c, far:far,
        dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '東' : '西') : (dy > 0 ? '南' : '北') });
    }
  });
  var ord = { '北':0, '東':1, '西':2, '南':3 };
  out.sort(function(a,b){ return ord[a.dir] - ord[b.dir]; });
  return out;
}
function exitState(e){
  if (e.via && e.via.gate && !S.open[e.via.gate]) return 'gate';
  if (S.been[e.far.id]) return 'been';
  if (S.seen[e.far.id]) return 'seen';
  return 'unseen';
}

/* ================= 灯り =================
   光はマス単位で届く。届いたマスだけが地図に描かれ、
   その先は闇に呑まれて途切れる（＝部屋の輪郭が先に分かってしまわない）。
   灯りなし: 2マス ／ 松明: 5マス ／ 魔術師のトーチ: 9マス（6歩つづく） */
/* ================= 灯り =================
   A案：部屋に入る＝一行が松明を掲げてひと巡りする。輪郭は地図に記録される。
   「いま見えている光」は、立ち位置を中心にした本物の円（縁はやわらかく）。
   壁と閉ざされた扉の向こうへは光は届かない。
   灯りなし: 半径1.5マス ／ 松明: 半径3.2マス                          */
function lightRadius(){ return S.torch ? 3.2 : 1.5; }

function cellIndex(){
  if (S.cellIdx) return S.cellIdx;
  var idx = {};
  S.map.nodes.forEach(function(n){
    if (n.kind === 'room') n.rects.forEach(function(q){
      for (var b2 = q.y; b2 < q.y + q.h; b2++)
        for (var a2 = q.x; a2 < q.x + q.w; a2++) idx[a2 + ',' + b2] = n;
    });
    else n.cells.forEach(function(c){ idx[c[0] + ',' + c[1]] = n; });
  });
  S.cellIdx = idx;
  return idx;
}

function partyCell(){
  var cur = S.map.byId[S.at];
  if (cur.kind === 'corridor'){ var mid = cur.cells[cur.cells.length >> 1]; return [mid[0] + 0.5, mid[1] + 0.5]; }
  return [cur.gx + (S.pos ? S.pos.ox : 0) * cur.w, cur.gy + (S.pos ? S.pos.oy : 0) * cur.h];
}

function reveal(){
  var idx = cellIndex();
  var cur = S.map.byId[S.at];

  /* ── いま光が触れている場所（壁ごしには届かない）。描画と語りに使う ── */
  var pc = partyCell(), pcx = pc[0], pcy = pc[1];
  var R = lightRadius();
  var sx = Math.floor(pcx), sy = Math.floor(pcy);
  S.lightNow = {};
  var q = [[sx, sy]], vis = {}; vis[sx + ',' + sy] = 1;
  while (q.length){
    var it = q.shift(), x = it[0], y = it[1];
    var n = idx[x + ',' + y];
    if (!n) continue;
    S.lightNow[n.id] = 1;
    S.seen[n.id] = 1;
    if (n.kind === 'corridor' && n.gate && !S.open[n.gate]) continue;   /* 扉で光は途切れる */
    [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(function(t){
      var k2 = t[0] + ',' + t[1];
      if (vis[k2] || !idx[k2]) return;
      var dx3 = t[0] + 0.5 - pcx, dy3 = t[1] + 0.5 - pcy;
      if (dx3 * dx3 + dy3 * dy3 > R * R) return;
      vis[k2] = 1; q.push(t);
    });
  }

  /* ── 魔術師のトーチ：光の精霊が2部屋先まで飛び、輪郭だけを探ってくる ── */
  if (S.spellLeft > 0){
    var nq = [[cur.id, 0]], nvis = {}; nvis[cur.id] = 1;
    while (nq.length){
      var e2 = nq.shift(), n2 = S.map.byId[e2[0]], d2 = e2[1];
      S.sensed[n2.id] = 1;
      n2.links.forEach(function(lid){
        var l = S.map.byId[lid];
        if (!l || nvis[l.id]) return;
        if (l.kind === 'corridor' && l.gate && !S.open[l.gate]){
          nvis[l.id] = 1; S.sensed[l.id] = 1; return;
        }
        var nd = l.kind === 'room' ? d2 + 1 : d2;
        if (nd > 2) return;
        nvis[l.id] = 1; nq.push([l.id, nd]);
      });
    }
  }
}

/* ================= 地図の絵 =================
   ・踏破した部屋と通路 … 完全な形＋方眼（地図の記憶）
   ・精霊が探った場所   … 輪郭だけ（うすい床）
   ・いまの光の円       … 未踏の床が、円の中だけ浮かび上がって縁で闇に溶ける
   ふだんは現在地まわりの窓表示。タップで全体（＋／－で拡大縮小）。   */
var CELL = 40;
var CORW = { narrow: 16, wide: 26 };
var INK = '#241f14';
var VIEW = 13;
function knownFull(n){ return S.been[n.id] || S.sensed[n.id]; }
function drawMap(){
  var ns = S.map.nodes;
  var corw = CORW[S.map.profile.corWidth] || 16;
  var zoomed = document.body.classList.contains('mapzoom');
  var pc = partyCell(), pcx = pc[0], pcy = pc[1];
  var R = lightRadius();

  /* 枠：記憶している形＋いまの光の円 */
  var f = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  var eat = function(x, y){ f.x0 = Math.min(f.x0, x); f.y0 = Math.min(f.y0, y);
    f.x1 = Math.max(f.x1, x + 1); f.y1 = Math.max(f.y1, y + 1); };
  ns.forEach(function(n){
    if (!knownFull(n)) return;
    if (n.kind === 'room') n.rects.forEach(function(q2){ eat(q2.x, q2.y); eat(q2.x + q2.w - 1, q2.y + q2.h - 1); });
    else n.cells.forEach(function(c){ eat(c[0], c[1]); });
  });
  eat(Math.floor(pcx - R), Math.floor(pcy - R));
  eat(Math.floor(pcx + R), Math.floor(pcy + R));

  var bx0 = Math.floor(f.x0) - 1, by0 = Math.floor(f.y0) - 1;
  var bw = Math.ceil(f.x1) - bx0 + 1, bh = Math.ceil(f.y1) - by0 + 1;
  var side = Math.max(bw, bh);
  var x0, y0;
  if (!zoomed && side > VIEW){
    var cn = S.map.byId[S.at];
    var ccx = Math.floor(cn.gx), ccy = Math.floor(cn.gy);
    side = VIEW;
    x0 = Math.max(bx0, Math.min(ccx - (VIEW >> 1), bx0 + bw - VIEW));
    y0 = Math.max(by0, Math.min(ccy - (VIEW >> 1), by0 + bh - VIEW));
  } else {
    x0 = bx0 - Math.floor((side - bw) / 2);
    y0 = by0 - Math.floor((side - bh) / 2);
  }
  var W = Math.round(side * CELL);
  var px = function(x){ return (x - x0) * CELL; }, py = function(y){ return (y - y0) * CELL; };
  var LX = px(pcx), LY = py(pcy), LR = R * CELL;

  var s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="ダンジョンの地図">';
  s += '<defs>'
    + '<filter id="rgh" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="'
    + (S.map.seed % 97) + '" result="n"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="n" scale="' + (S.map.roughPx || 0) + '"/></filter>'
    + '<pattern id="gp" width="' + CELL + '" height="' + CELL + '" patternUnits="userSpaceOnUse">'
    + '<rect width="' + CELL + '" height="' + CELL + '" fill="#f0ead9"/>'
    + '<path d="M' + CELL + ' 0H0V' + CELL + '" fill="none" stroke="#ccc1a1" stroke-width="1.6"/></pattern>'
    + '<pattern id="dots" width="' + CELL + '" height="' + CELL + '" patternUnits="userSpaceOnUse">'
    + '<rect width="' + CELL + '" height="' + CELL + '" fill="#e6dfca"/>'
    + '<circle cx="' + (CELL / 2) + '" cy="' + (CELL / 2) + '" r="1.2" fill="#c7bd9f"/></pattern>'
    + '<radialGradient id="pg">'
    + '<stop offset="0" stop-color="#c33a2e" stop-opacity="0.5"/>'
    + '<stop offset="0.7" stop-color="#c33a2e" stop-opacity="0.18"/>'
    + '<stop offset="1" stop-color="#c33a2e" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="lg">'
    + '<stop offset="0" stop-color="#fff" stop-opacity="1"/>'
    + '<stop offset="0.72" stop-color="#fff" stop-opacity="1"/>'
    + '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    + '<mask id="lm"><rect x="0" y="0" width="' + W + '" height="' + W + '" fill="#000"/>'
    + '<circle cx="' + LX + '" cy="' + LY + '" r="' + LR + '" fill="url(#lg)"/></mask>'
    + '<radialGradient id="dkg">'
    + '<stop offset="0" stop-color="#000"/>'
    + '<stop offset="0.7" stop-color="#000"/>'
    + '<stop offset="1" stop-color="#fff"/></radialGradient>'
    + '<radialGradient id="warm">'
    + '<stop offset="0" stop-color="#ffd98a" stop-opacity="0.28"/>'
    + '<stop offset="0.75" stop-color="#ffd98a" stop-opacity="0.1"/>'
    + '<stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>'
    + '</defs>';
  s += '<rect x="0" y="0" width="' + W + '" height="' + W + '" fill="url(#dots)"/>';

  /* 図形をつくる。known = 記憶（踏破・探知）、spill = いまの光だけで見えている未踏 */
  var mkPrims = function(filter){
    var out = [];
    ns.forEach(function(n){
      if (!filter(n)) return;
      if (n.kind === 'room'){
        if (n.shape === 'round') out.push({ n: n, k: 'c', cx: px(n.gx), cy: py(n.gy), r: n.w * CELL / 2 });
        else n.rects.forEach(function(q2){
          out.push({ n: n, k: 'r', x: px(q2.x), y: py(q2.y), w: q2.w * CELL, h: q2.h * CELL });
        });
      } else {
        var xs = n.cells.map(function(c){ return c[0]; }), ys2 = n.cells.map(function(c){ return c[1]; });
        var mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs);
        var mny = Math.min.apply(null, ys2), mxy = Math.max.apply(null, ys2);
        var A2 = S.map.byId[n.from], B2 = S.map.byId[n.to];
        var dig = function(r2){ return (r2 && r2.shape === 'round') ? CELL * 0.7 : 10; };
        var e0b, e1b;
        if (n.horiz){
          var leftIsFrom = A2 && A2.gx < (B2 ? B2.gx : 1e9);
          e0b = dig(leftIsFrom ? A2 : B2); e1b = dig(leftIsFrom ? B2 : A2);
          out.push({ n: n, k: 'r', x: px(mnx) - e0b, y: py(mny) + (CELL - corw) / 2,
            w: (mxx - mnx + 1) * CELL + e0b + e1b, h: corw, cor: 1 });
        } else {
          var topIsFrom = A2 && A2.gy < (B2 ? B2.gy : 1e9);
          e0b = dig(topIsFrom ? A2 : B2); e1b = dig(topIsFrom ? B2 : A2);
          out.push({ n: n, k: 'r', x: px(mnx) + (CELL - corw) / 2, y: py(mny) - e0b,
            w: corw, h: (mxy - mny + 1) * CELL + e0b + e1b, cor: 1 });
        }
      }
    });
    return out;
  };
  var geom = function(p2, grow){
    grow = grow || 0;
    return p2.k === 'c'
      ? '<circle cx="' + p2.cx + '" cy="' + p2.cy + '" r="' + (p2.r + grow) + '"'
      : '<rect x="' + (p2.x - grow) + '" y="' + (p2.y - grow) + '" width="' + (p2.w + grow * 2) + '" height="' + (p2.h + grow * 2) + '" rx="' + (4 + grow) + '"';
  };

  var known = mkPrims(function(n){ return knownFull(n); });
  var spill = mkPrims(function(n){ return !knownFull(n) && S.lightNow && S.lightNow[n.id]; });

  /* 記憶している形：荒れた外周 → 黒壁 → 床 */
  if (S.map.roughPx){
    s += '<g filter="url(#rgh)">';
    known.forEach(function(p2){ s += geom(p2, 12) + ' fill="#57503b" opacity="0.85"/>'; });
    s += '</g>';
  } else {
    known.forEach(function(p2){ s += geom(p2, 10) + ' fill="#57503b" opacity="0.35"/>'; });
  }
  known.forEach(function(p2){ s += geom(p2, 4) + ' fill="' + INK + '"/>'; });
  known.forEach(function(p2){
    s += geom(p2, 0) + ' fill="' + (S.been[p2.n.id] ? 'url(#gp)' : '#d8d0b6') + '"/>';
  });

  /* いまの光だけで見えている未踏の床：本物の円で切り抜き、縁は闇に溶ける */
  if (spill.length){
    s += '<g mask="url(#lm)">';
    spill.forEach(function(p2){ s += geom(p2, 4) + ' fill="' + INK + '"/>'; });
    spill.forEach(function(p2){ s += geom(p2, 0) + ' fill="#ddd5bc"/>'; });
    s += '</g>';
  }

  /* 入口：南の壁を外へ開ける */
  var ent = null;
  ns.forEach(function(n){ if (n.entrance) ent = n; });
  if (ent && knownFull(ent)){
    var m = ent.rects[0];
    var ox = px(m.x + m.w / 2) - CELL * 0.4, oy = py(m.y + m.h) - 6;
    s += '<rect x="' + ox + '" y="' + oy + '" width="' + (CELL * 0.8) + '" height="' + (CELL * 0.72) + '" fill="'
      + (S.been[ent.id] ? 'url(#gp)' : '#d8d0b6') + '"/>'
      + '<rect x="' + (ox - 5) + '" y="' + oy + '" width="5" height="' + (CELL * 0.72) + '" fill="' + INK + '"/>'
      + '<rect x="' + (ox + CELL * 0.8) + '" y="' + oy + '" width="5" height="' + (CELL * 0.72) + '" fill="' + INK + '"/>';
  }

  /* 踏んだ部屋の出口：まだ歩いていない通路は「先の途切れた口」として輪郭に刻む
     （入口の開口と同じ作り。先はぶった切れていて、どうなっているかは分からない） */
  var idx2 = cellIndex();
  ns.forEach(function(n){
    if (n.kind !== 'room' || !S.been[n.id]) return;
    n.links.forEach(function(lid){
      var c = S.map.byId[lid];
      if (!c || c.kind !== 'corridor' || knownFull(c)) return;
      var cs2 = c.cells, e0 = cs2[0], e1 = cs2[cs2.length - 1];
      var d0 = Math.pow(e0[0] + 0.5 - n.gx, 2) + Math.pow(e0[1] + 0.5 - n.gy, 2);
      var d1 = Math.pow(e1[0] + 0.5 - n.gx, 2) + Math.pow(e1[1] + 0.5 - n.gy, 2);
      var e = d0 <= d1 ? e0 : e1;
      var sd = null;
      if ((idx2[(e[0] + 1) + ',' + e[1]] || {}).id === n.id) sd = 'W';
      else if ((idx2[(e[0] - 1) + ',' + e[1]] || {}).id === n.id) sd = 'E';
      else if ((idx2[e[0] + ',' + (e[1] + 1)] || {}).id === n.id) sd = 'N';
      else if ((idx2[e[0] + ',' + (e[1] - 1)] || {}).id === n.id) sd = 'S';
      if (!sd){
        sd = e[0] < n.x ? 'W' : e[0] >= n.x + n.w ? 'E' : e[1] < n.y ? 'N' : 'S';
      }
      var rr = n.shape === 'round';
      var inn = rr ? CELL * 0.7 : 6;      /* 壁を破って部屋側へ食い込む量 */
      var out2 = CELL * 0.7;              /* 外へ伸びる長さ。その先は闇 */
      var wp = 5;
      if (sd === 'E' || sd === 'W'){
        var wx = sd === 'E' ? px(e[0]) : px(e[0] + 1);
        var fy = py(e[1]) + (CELL - corw) / 2;
        var fx = sd === 'E' ? wx - inn : wx - out2;
        var wxs = sd === 'E' ? wx - (rr ? 0 : 6) : wx - out2;
        var ww = out2 + (rr ? 0 : 6);
        s += '<rect x="' + wxs + '" y="' + (fy - wp) + '" width="' + ww + '" height="' + wp + '" fill="' + INK + '"/>'
           + '<rect x="' + wxs + '" y="' + (fy + corw) + '" width="' + ww + '" height="' + wp + '" fill="' + INK + '"/>'
           + '<rect x="' + fx + '" y="' + fy + '" width="' + (inn + out2) + '" height="' + corw + '" fill="url(#gp)"/>';
      } else {
        var wy = sd === 'S' ? py(e[1]) : py(e[1] + 1);
        var fx2 = px(e[0]) + (CELL - corw) / 2;
        var fy2 = sd === 'S' ? wy - inn : wy - out2;
        var wys = sd === 'S' ? wy - (rr ? 0 : 6) : wy - out2;
        var wh = out2 + (rr ? 0 : 6);
        s += '<rect x="' + (fx2 - wp) + '" y="' + wys + '" width="' + wp + '" height="' + wh + '" fill="' + INK + '"/>'
           + '<rect x="' + (fx2 + corw) + '" y="' + wys + '" width="' + wp + '" height="' + wh + '" fill="' + INK + '"/>'
           + '<rect x="' + fx2 + '" y="' + fy2 + '" width="' + corw + '" height="' + (inn + out2) + '" fill="url(#gp)"/>';
      }
    });
  });

  /* 関門の閂（前に立って知ったものだけ）と、部屋の名前 */
  ns.forEach(function(n){
    if (n.kind === 'corridor'){
      if (n.gate && !S.open[n.gate] && S.been[n.id]){
        var gx2 = px(n.gx), gy2 = py(n.gy);
        s += n.horiz
          ? '<rect x="' + (gx2 - 5) + '" y="' + (gy2 - corw / 2 - 8) + '" width="10" height="' + (corw + 16) + '" rx="3" fill="#a03434"/>'
          : '<rect x="' + (gx2 - corw / 2 - 8) + '" y="' + (gy2 - 5) + '" width="' + (corw + 16) + '" height="10" rx="3" fill="#a03434"/>';
      }
      return;
    }
    if (!S.been[n.id]) return;
    var cx = px(n.gx), cy = py(n.gy);
    var icon = '', ic = '';
    if (n.goal){ icon = '奥'; ic = '#8a6a1a'; }
    if (icon) s += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="22" font-weight="700" fill="' + ic + '">' + icon + '</text>';
    var nm = labelOf(n);
    var fpx = Math.min(13, Math.max(8.5, (n.w * CELL - 8) / Math.max(1, nm.length)));
    if (fpx <= 8.6 && nm.length > 9) nm = nm.slice(0, 9);
    s += '<text x="' + cx + '" y="' + (cy + (icon ? 17 : 5)) + '" text-anchor="middle" font-size="' + fpx.toFixed(1) + '" font-weight="600" fill="'
      + (n.revealed ? '#7a5a12' : '#5a5340') + '">' + nm + '</text>';
  });

  /* 闇のとばり：円の外は、記録済みの場所も影に沈む（見えているのは円の中だけ）。
     魔術師のトーチが灯っている間は、精霊が探った範囲がまるごと明るい（安心の光） */
  var dkm = '<mask id="dk"><rect x="0" y="0" width="' + W + '" height="' + W + '" fill="#fff"/>'
    + '<circle cx="' + LX + '" cy="' + LY + '" r="' + LR + '" fill="url(#dkg)"/>';
  if (S.spellLeft > 0){
    mkPrims(function(n){ return S.sensed[n.id]; }).forEach(function(p2){
      dkm += geom(p2, 16) + ' fill="#000"/>';
    });
  }
  dkm += '</mask>';
  s += '<defs>' + dkm + '</defs>';
  s += '<rect x="0" y="0" width="' + W + '" height="' + W + '" fill="#241c10" opacity="0.52" mask="url(#dk)"/>';

  /* 松明のあたたかい輪（トーチの間は輪を出さない）と、パーティの赤点 */
  if (S.spellLeft <= 0) s += '<circle cx="' + LX + '" cy="' + LY + '" r="' + LR + '" fill="url(#warm)"/>';
  s += '<circle cx="' + LX + '" cy="' + LY + '" r="20" fill="url(#pg)"/>'
    + '<circle cx="' + LX + '" cy="' + LY + '" r="7" fill="#b5372e" stroke="#f6f1e2" stroke-width="2"/>';
  s += '</svg>';

  var wrap2 = document.getElementById('mapwrap');
  wrap2.innerHTML = s + (zoomed
    ? '<div class="mapctl"><button id="mz_in">＋</button><button id="mz_out">－</button><button id="mz_x">✕</button></div>'
    : '<div class="maphint">タップで全体</div>');
  if (zoomed){
    var svg = wrap2.querySelector('svg');
    var base = Math.min(innerWidth * 0.94, innerHeight * 0.88);
    svg.style.width = Math.round(base * (S.z || 1)) + 'px';
    svg.style.maxWidth = 'none'; svg.style.maxHeight = 'none';
    var stop = function(fn){ return function(ev){ ev.stopPropagation(); fn(); }; };
    wrap2.querySelector('#mz_in').onclick = stop(function(){ S.z = Math.min(4, (S.z || 1) * 1.4); drawMap(); });
    wrap2.querySelector('#mz_out').onclick = stop(function(){ S.z = Math.max(1, (S.z || 1) / 1.4); drawMap(); });
    wrap2.querySelector('#mz_x').onclick = stop(function(){ document.body.classList.remove('mapzoom'); S.z = 1; drawMap(); });
  }
}

/* ================= 判定 ================= */
function meets(gid){
  var c = S.map.gates[gid].cond;
  switch (c.t){
    case 'carry':    return !!S.bag[c.item];
    case 'mark':     return (S.marks[c.key]||0) >= c.n;
    case 'slay':     return !!S.did['slay:'+gid];
    case 'favor':    return !!S.did['favor:'+gid];
    case 'offer':    return !!S.bag[c.item];
    case 'lever':    return !!S.did['lever:'+gid];
    case 'word':     return !!S.did['word:'+gid];
    case 'deal':     return !!S.did['deal:'+gid];
    case 'spare':    return S.kills === 0;
    case 'hurtless': return S.hurt === 0;
    case 'light':    return c.state === 'off' ? !S.torch : S.torch;
    case 'party':    return !!S.did['single:'+gid];
    default:         return false;
  }
}
var NEED = {
  carry:'持ち物が要る', mark:'印が揃っていない', slay:'倒すべき相手がいる',
  favor:'まだ、誰にも借りを作っていない', offer:'捧げるものがない', lever:'どこかで何かを動かす',
  word:'言うべき言葉を知らない', deal:'話がついていない', spare:'すでに血を見ている',
  hurtless:'傷を負っている', light:'灯りの扱いが違う', party:'進みかたが違う'
};

/* ================= 真名の開示 ================= */
function revealName(n){
  if (!n || !n.name || n.revealed) return;
  n.revealed = 1;
  say('——ここは『' + n.name + '』と呼ばれていた場所らしい。', 'sys');
}

/* ================= 場面の描写 ================= */
function describeRoom(n, first){
  var ctx = S.ctx;
  /* ── 語りの順番 ──
     ① 部屋の情景　② 部屋の中の特殊な状況（特徴・書きつけ・種）
     ③ 方角ごとの「その先」の示唆（気になる内容があるときだけ）
     ④ モンスター・大きな出来事の予感（最後。この先は語らず、選択肢へ落とす） */

  /* ① 情景 */
  if (first) say(SHAPES[n.cls].d);
  else say(REVISIT);

  /* ② 部屋の中の特殊な状況 */
  (n.features||[]).forEach(function(fid){
    if (S.fx[n.id+':'+fid]) return;
    if (first) say(FEATURES[fid].desc);
    else if (rnd() < 0.35){
      var fp2 = n.fpos && n.fpos[fid];
      say((fp2 ? fp2.w + '側の' : '') + FEATURES[fid].noun +
        '{は、そのままそこにある|は、変わらずそこにある|が、黙って同じ場所にある|には、まだ手を付けていない}。');
    }
  });
  var pendingFoe = false;
  if (n.ev && !S.evDone[n.id]){
    var k2 = KEYS[n.ev.key];
    if (n.ev.t === 'hint'){
      /* 自動では読まない。まず「そこに在る」ことだけを描き、
         読むかどうかはプレイヤーの選択（行動が先、出来事はその結果） */
      if (first)
        say('{部屋の一隅に|壁際に|灯りの届く端に}、'
          + '{何かを記した跡|残された書きつけらしきもの|文字の刻まれた面}がある。'
          + '{近づけば、確かめられそうだ|読めるかどうかは、寄ってみないと分からない|'
          + '$who が、それに目を留めた}。');
      else if (rnd() < 0.4)
        say('記されたものは、まだ読んでいない。');
    } else if (n.ev.t === 'seed' && first){
      say(k2.seed);
    } else if (n.ev.t === 'foe' && first){
      pendingFoe = true;                    /* ④で最後に語る */
    }
  }

  /* ③ 方角の示唆。危機が迫っているときは語らない（緊張を切らさない） */
  if (!pendingFoe){
    var parts = [];
    exitsOf(n).forEach(function(e){
      var st = exitState(e);
      /* 関門も、前に立つまでは普通の闇として語る（先に特別だと分からせない） */
      if (st === 'gate'){ if (e.via && S.been[e.via.id]) return; st = 'unseen'; }
      if (st !== 'unseen') return;
      var ctx2 = Object.assign({}, S.ctx, { dir: e.dir });
      parts.push(tidy(VARI.expand(EXIT_TXT.unseen, ctx2, rnd)));
    });
    if (parts.length > 2) parts = parts.slice(0, 2);   /* 語りすぎない */
    if (parts.length){
      var p = document.createElement('p');
      p.textContent = parts.join('。') + '。';
      narrBox().appendChild(p);
    }
  }

  /* ④ 危機。ここで説明を止め、選択肢に落とす */
  if (pendingFoe){
    say('{$placeの奥から|部屋の中央に|灯りの輪の縁に}、{ひときわ大きいものが|'
      + '他とは明らかに違う影が|$lordではないが、それに近いものが}{立ち上がった|こちらを向いた|'
      + '身を起こした}。{ここを通るなら、これを越えるしかない|'
      + '避けて通れる位置ではない|$who が、無言で武器を握り直した}。');
    S.enc = { gate: n.ev.gate, room: n.id };
  }
}

/* ================= 部屋に入る ================= */
function enter(id){
  var n = S.map.byId[id], first = !S.been[id];
  S.at = id; S.been[id] = 1; S.steps++;
  if (S.spellLeft > 0){ S.spellLeft--; if (S.spellLeft === 0) say('トーチの光が、静かに消えた。', 'sys'); }
  S.pos = { ox: 0, oy: 0.24 };
  S.noise = (!S.enc && rnd() < 0.22) ? 1 : 0;
  reveal();

  var anchor = null;
  if (n.kind === 'corridor'){
    if (n.gate){
      anchor = caption('関門の前');
      var gid = n.gate, key = KEYS[S.map.gates[gid].key];
      if (S.open[gid]) say(PASS + key.again);
      else if (meets(gid)){
        S.open[gid] = 1; say(key.open, 'em');
        say('── ' + key.name + '：道が通じた', 'sys');
        reveal();
      } else {
        say(key.blocked);
        say('── ' + NEED[S.map.gates[gid].cond.t], 'bad');
      }
    } else {
      if (first) anchor = caption('通路');
      say(WALK.corridor);
    }
    /* 通路の先も、気になる内容があるときだけ */
    var parts = [];
    exitsOf(n).forEach(function(e){
      if (S.been[e.far.id] || S.seen[e.far.id]) return;
      var ctx2 = Object.assign({}, S.ctx, { dir: e.dir });
      parts.push(tidy(VARI.expand(EXIT_TXT.unseen, ctx2, rnd)));
    });
    if (parts.length > 2) parts = parts.slice(0, 2);
    if (parts.length) say(parts.join('。') + '。');
  } else {
    if (first){
      anchor = caption(labelOf(n));
      if (n.goal) say('{探していたものは、この奥にある|ここが最奥だ|——ここまで来た}。', 'em');
    }
    describeRoom(n, first);
  }
  render();
  if (anchor) narrBox().scrollTop = Math.max(0, anchor.offsetTop - 8);
}

/* ================= 特徴を調べる ================= */
function useFeature(n, fid){
  var f = FEATURES[fid];
  S.fx[n.id+':'+fid] = 1;
  var fp = n.fpos && n.fpos[fid];
  if (fp){ S.pos = { ox: fp.dx, oy: fp.dy }; reveal(); }
  var tot = f.out.reduce(function(a,o){ return a+o.w; }, 0);
  var roll = rnd()*tot, sel = f.out[0];
  for (var i=0;i<f.out.length;i++){ roll -= f.out[i].w; if (roll <= 0){ sel = f.out[i]; break; } }
  say(sel.t, 'em');
  var e = sel.eff || {};
  if (e.heal){
    var hurt = PARTY.filter(function(p){return p.hp>0 && p.hp<p.mx;})
      .sort(function(a,b){return (a.hp/a.mx)-(b.hp/b.mx);})[0];
    if (hurt){ hurt.hp = Math.min(hurt.mx, hurt.hp + e.heal);
      say('── ' + hurt.n + ' の傷が少し塞がった', 'sys'); }
  }
  if (e.dmg){
    var v = PARTY.filter(function(p){return p.hp>0;});
    var t2 = v[Math.floor(rnd()*v.length)];
    t2.hp = Math.max(1, t2.hp - e.dmg); S.hurt++;
    say('── ' + t2.n + ' が傷を負った', 'bad');
  }
  if (e.noise) S.noise = 1;
  if (n.ev && n.ev.t !== 'foe') revealName(n);
  render();
}

/* ================= 種の行動 ================= */
function seedActs(n){
  if (!n.ev || n.ev.t !== 'seed' || S.evDone[n.id]) return [];
  var gid = n.ev.gate, c = S.map.gates[gid].cond, out = [];
  var done = function(){ S.evDone[n.id]=1; revealName(n); };
  if (meets(gid)) return [];
  if (c.t === 'favor') out.push({ l:'手を貸す', k:'借りを作る', f:function(){
    S.did['favor:'+gid]=1; done();
    say('{$who が、黙って手を貸した|時間は食った。それだけのことだ|'+
      '$hurt が、自分の水を分けた}。{相手は、何も言わなかった|礼らしい礼は、無かった}。','em'); } });
  if (c.t === 'carry' || c.t === 'offer') out.push({ l:'持っていく', k:'荷が一つ増える', f:function(){
    S.bag[c.item]=1; done();
    say('{$who が、それを荷に収めた|重いが、置いていく気にはならない|'+
      '使い道は、そのうち分かる}。','em'); } });
  if (c.t === 'mark') out.push({ l:'触れる', k:'印 '+((S.marks[c.key]||0)+1)+'/'+c.n, f:function(){
    S.marks[c.key]=(S.marks[c.key]||0)+1;
    say('{指先が温かい|$soundが、遠くで一度鳴った|$traceが、$lightを弾いた}。','em');
    say('── 印 '+S.marks[c.key]+'/'+c.n,'sys');
    if (S.marks[c.key] >= c.n) done(); else revealName(n); } });
  if (c.t === 'lever') out.push({ l:'動かす', k:'どこかが変わる', f:function(){
    S.did['lever:'+gid]=1; done();
    say('{軋みながら、それは動いた|$placeの奥で、重いものが動く音がした|'+
      '$soundとは違う音が、長く尾を引いた}。','em'); } });
  if (c.t === 'deal') out.push({ l:'話をつける', k:'刃を抜かない', f:function(){
    S.did['deal:'+gid]=1; done();
    say('{話は、思ったより早くついた|互いに、損のない形に落ち着いた}。','em'); } });
  return out;
}

/* 記されたものを読む。読んだ結果として、言葉や真名を得る */
function readHint(n){
  var k2 = KEYS[n.ev.key];
  say(k2.hint);
  say('── 覚え書きを写した（' + k2.name + '）', 'sys');
  S.notes[n.ev.key] = 1; S.evDone[n.id] = 1;
  if (k2.cond.t === 'word'){
    S.did['word:'+n.ev.gate] = 1;
    say('── 書かれていた言葉を覚えた。どこかの扉の前で、唱えられる', 'sys');
  }
  revealName(n);
  render();
}

function encounter(){
  say('{$soundに混じって|灯りの輪の外で|前方の闇で}、{何かが動いた|気配が立ち上がった|'+
      '$lordではない、小さいものがこちらを向いた}。');
  S.enc = {}; render();
}

/* ================= 描画 ================= */
function render(){
  drawMap();
  var n = S.map.byId[S.at], box = document.getElementById('choices');
  box.innerHTML = '';

  document.getElementById('spot').textContent = labelOf(n);
  document.getElementById('pos').textContent =
    '踏破 ' + Object.keys(S.been).filter(function(k){return S.map.byId[k].kind==='room';}).length +
    '/' + S.map.nodes.filter(function(x){return x.kind==='room';}).length + ' 室';
  document.getElementById('kil').textContent = '討 ' + S.kills;
  document.getElementById('hrt').textContent = '傷 ' + S.hurt;
  var tc = document.getElementById('tor');
  tc.textContent = S.torch ? '松明 ON' : '松明 OFF';
  tc.className = 'chip' + (S.torch ? ' on' : '');
  document.getElementById('party').innerHTML = PARTY.map(function(p){
    return '<div class="pm'+(p.row?' back':'')+'"><div class="n">'+p.n+'</div><div class="h">'+p.hp+'</div></div>';
  }).join('');

  var add = function(label, key, cls, fn){
    var b = document.createElement('button');
    b.className = 'btn ' + (cls||'');
    b.innerHTML = label + (key ? '<span class="k">' + key + '</span>' : '');
    b.onclick = fn; box.appendChild(b);
  };

  if (S.enc){
    var gid0 = S.enc.gate;
    add('斬りかかる', gid0 ? '倒せば、道が変わる' : '倒せば、不殺の条件は消える', 'act', function(){
      S.kills++; if (gid0) S.did['slay:'+gid0] = 1;
      if (S.enc.room){ S.evDone[S.enc.room]=1; revealName(S.map.byId[S.enc.room]); }
      S.enc = 0;
      say('{短い戦いだった|数を頼みに押し切った|$who が、先に動いた}。','em');
      say('── 倒した数 '+S.kills, 'sys'); render(); });
    add('やり過ごす', '刃を抜かない', 'act', function(){
      S.enc = 0;
      if (rnd()<0.4){ S.hurt++; say('{擦れ違いざま、$hurt が浅く裂かれた|通り抜けたが、無傷とはいかない}。','bad'); }
      else say('{息を殺して、やり過ごした|向こうは、こちらに関心を示さなかった}。','em');
      render(); });
    return;
  }

  /* 関門の前でだけ出せる行動 */
  if (n.kind === 'corridor' && n.gate && !S.open[n.gate]){
    var gc = S.map.gates[n.gate].cond, gid = n.gate;
    if (gc.t === 'party' && !S.did['single:'+gid])
      add('一人ずつ渡る', '列を解く', 'act', function(){
        S.did['single:'+gid] = 1;
        say('{隊列を解き、間を空けて並んだ|$who が「一人ずつだ」と短く言った}。','em');
        enter(n.id); });
    if (gc.t === 'light' && ((gc.state === 'off') === S.torch))
      add(S.torch ? '火を伏せる' : '松明を掲げる', 'ここでは、灯りの扱いが鍵になる', 'act', function(){
        S.torch = !S.torch; reveal(); enter(n.id); });
  }

  if (n.kind === 'room' && n.ev && n.ev.t === 'hint' && !S.evDone[n.id])
    add('記されたものを確かめる', '読む', 'act', function(){ readHint(n); });

  seedActs(n).forEach(function(a){ add(a.l, a.k, 'act', function(){ a.f(); render(); }); });

  /* 特徴を調べる。描写に出たものだけがここに並ぶ */
  (n.features||[]).forEach(function(fid){
    if (S.fx[n.id+':'+fid]) return;
    var fp = n.fpos && n.fpos[fid];
    add((fp ? fp.w + '側の' : '') + FEATURES[fid].act, '調べる', 'act', function(){ useFeature(n, fid); });
  });

  /* 移動。方角＋行き先の様子 */
  exitsOf(n).forEach(function(e){
    var shut = e.via && e.via.gate && !S.open[e.via.gate];
    var note;
    if (shut && S.been[e.via.id]) note = '閉ざされた道';          /* 一度立って知ったあとだけ */
    else if (S.been[e.far.id]) note = '来た道——' + labelOf(e.far);
    else if (S.seen[e.far.id] || (e.via && S.seen[e.via.id])) note = '未踏——床が先へ続いている';
    else note = '未踏——闇の先';
    add(e.dir + 'へ進む', note, 'go', function(){ enter(e.via ? e.via.id : e.far.id); });
  });

  if (S.kills || S.hurt) add('入口まで引き返して、出直す', '敵は生き返る／条件はやり直せる', '', function(){
    S.kills = 0; S.hurt = 0; S.enc = 0; S.noise = 0;
    PARTY.forEach(function(p){ p.hp = p.mx; });
    say('{一行は、いったん外へ出た|来た道を戻り、$placeの外の空気を吸った|'
      + '$who が「出直す」と言った。誰も反対しなかった}。'
      + '{戻ってみれば、$traceは新しくなっている|'
      + '倒したはずのものが、また$soundを立てている|'
      + '$placeは、こちらを覚えていないらしい}。', 'sys');
    say('── 討った数と傷は、帳消しになった。開いた道は、開いたまま。', 'sys');
    enter(S.map.start); });

  add((S.torch ? '松明を伏せる' : '松明を掲げる'), (S.torch ? '光の輪 大 → 小' : '光の輪 小 → 大'), '', function(){
    S.torch = !S.torch;
    say(S.torch ? '{松明に火を移した|$lightが、闇を押し戻す}。' : '{火を伏せた|$lightは、足元だけになった}。','sys');
    reveal(); render(); });
  if (!S.spellUsed) add('魔術師のトーチ', '一度だけ・光の精霊が2部屋先まで形を探る（6歩つづく）', '', function(){
    S.spellLeft = 6; S.spellUsed = 1;
    say('{魔術師が短く唱えると、青白い小さな光が指先から離れた|'+
        '詠唱の終わりに、ちいさな光がふわりと浮いた}。'+
        '{光は先へ飛び、壁をなぞって、部屋の形だけを知らせてくる|'+
        '灯りではない。だが、あれが触れた場所の輪郭が、頭に浮かぶ}。','em');
    reveal(); render(); });
  else if (S.spellLeft > 0) add('（精霊の光）', 'あと ' + S.spellLeft + ' 歩', '', function(){});
  if (S.noise) add('物音のする方をうかがう', '遭遇するかもしれない', '', function(){ S.noise = 0; encounter(); });
}

/* ================= 入口の前 ================= */
function preEntry(){
  document.getElementById('narr').innerHTML='';
  var d = DUNGEONS[S.dun];
  caption(d.name + ' ── 入口の前');
  say(d.open);
  say('{口を開けた闇の前に、一行は立った|入口の前で、誰からともなく足が止まった|'
    + '$smellが、中から流れてくる}。'
    + '{ここから先は、$lightだけが頼りになる|引き返すなら、いまのうちだ}。');
  var box = document.getElementById('choices');
  box.innerHTML = '';
  var add = function(label, key, cls, fn){
    var b=document.createElement('button'); b.className='btn '+(cls||'');
    b.innerHTML=label+(key?'<span class="k">'+key+'</span>':''); b.onclick=fn; box.appendChild(b);
  };
  add('入る', '', 'act', function(){ enter(S.map.start); });
  add('装備を整える', 'Phase 2 で追加予定', '', function(){
    say('（装備は Phase 2 で。いまは身ひとつでもぐる）', 'sys'); });
  add('引き返す', 'ダンジョン選択へ戻る', '', function(){
    document.getElementById('setup').style.display='flex'; });
  drawMap();
  narrBox().scrollTop = 0;
}

/* ================= 開始 ================= */
var SETUP = { dun:'beast', rooms:'few',
  roomSize:'', corLen:'', corWidth:'', layout:'', shapes:'', rough:'', loops:'' };
/* 生成の変数。'' は「その場所の流儀」に従う */
var VARDEFS = [
  ['roomSize','部屋の広さ', [['流儀',''],['狭め','cramped'],['標準','standard'],['広め','spacious']]],
  ['corLen',  '廊下の長さ', [['流儀',''],['短い','compact'],['ふつう','normal'],['長い','sprawling']]],
  ['corWidth','廊下の幅',   [['流儀',''],['狭い','narrow'],['広い','wide']]],
  ['layout',  '道の形',     [['流儀',''],['一本道','straight'],['枝分かれ','forking'],['折衷','balanced'],['曲がりくねる','winding']]],
  ['shapes',  '部屋の形',   [['流儀',''],['四角','square'],['不規則','irregular'],['丸','round'],['混合','mix']]],
  ['rough',   '外周の粗さ', [['流儀',''],['なし','none'],['弱','light'],['中','medium'],['強','heavy']]],
  ['loops',   '回廊',       [['流儀',''],['少ない','few'],['そこそこ','some'],['多い','many']]]
];
function goFullscreen(){
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen().catch(function(){});
  } catch (e) {}
}
function begin(){
  goFullscreen();
  var g = { dungeon: SETUP.dun, rooms: SETUP.rooms };
  ['roomSize','corLen','corWidth','layout','rough','loops'].forEach(function(k){
    if (SETUP[k]) g[k] = SETUP[k];
  });
  if (SETUP.shapes === 'mix') g.shapes = ['square','irregular','round'];
  else if (SETUP.shapes) g.shapes = [SETUP.shapes];
  var map = generate(g);
  verify(map);
  S = { map:map, dun:SETUP.dun, at:map.start, been:{}, seen:{}, open:{}, bag:{}, marks:{},
        did:{}, notes:{}, fx:{}, evDone:{}, litCells:{}, cellIdx:null, sensed:{},
        kills:0, hurt:0, steps:0, torch:false, spellLeft:0, spellUsed:0, enc:0, noise:0, z:1,
        ctx:ctxOf(SETUP.dun) };
  PARTY.forEach(function(p){ p.hp = p.mx; });
  document.getElementById('setup').style.display='none';
  document.getElementById('dun').textContent = DUNGEONS[SETUP.dun].name;
  document.getElementById('spot').textContent = '入口の前';
  S.seen[map.start] = 1;
  preEntry();
}
function relayout(){ document.body.classList.toggle('land', innerWidth > innerHeight * 1.15); }
addEventListener('resize', relayout);

document.addEventListener('DOMContentLoaded', function(){
  relayout();
  var ds = document.getElementById('dopts'), rs = document.getElementById('ropts');
  Object.keys(DUNGEONS).forEach(function(k){
    var b=document.createElement('button'); b.className='opt'+(k===SETUP.dun?' on':'');
    b.textContent=DUNGEONS[k].name;
    b.onclick=function(){ SETUP.dun=k; [].forEach.call(ds.children,function(c){c.classList.remove('on');});
      b.classList.add('on'); document.getElementById('dsub').textContent=DUNGEONS[k].sub+'／'+DUNGEONS[k].open; };
    ds.appendChild(b);
  });
  document.getElementById('dsub').textContent=DUNGEONS[SETUP.dun].sub+'／'+DUNGEONS[SETUP.dun].open;
  [['序盤','few'],['中盤','some'],['後半','many'],['最奥','lots']].forEach(function(p){
    var b=document.createElement('button'); b.className='opt'+(p[1]===SETUP.rooms?' on':'');
    b.textContent=p[0];
    b.onclick=function(){ SETUP.rooms=p[1]; [].forEach.call(rs.children,function(c){c.classList.remove('on');});
      b.classList.add('on'); };
    rs.appendChild(b);
  });
  /* 生成の変数 */
  var vbox = document.getElementById('vopts');
  VARDEFS.forEach(function(def){
    var key=def[0], row=document.createElement('div'); row.className='vrow';
    var lab=document.createElement('div'); lab.className='vlab'; lab.textContent=def[1];
    var opts=document.createElement('div'); opts.className='opts';
    def[2].forEach(function(o){
      var b=document.createElement('button'); b.className='opt'+(SETUP[key]===o[1]?' on':'');
      b.textContent=o[0];
      b.onclick=function(){ SETUP[key]=o[1];
        [].forEach.call(opts.children,function(c){c.classList.remove('on');});
        b.classList.add('on'); };
      opts.appendChild(b);
    });
    row.appendChild(lab); row.appendChild(opts); vbox.appendChild(row);
  });
  document.getElementById('vtog').onclick=function(){
    var v=document.getElementById('vwrap');
    v.style.display = v.style.display==='none' ? 'block' : 'none';
  };
  /* 地図をタップで拡大 */
  document.getElementById('mapwrap').addEventListener('click', function(ev){
    if (ev.target && /^mz_/.test(ev.target.id || '')) return;
    document.body.classList.toggle('mapzoom');
    if (S) { S.z = 1; drawMap(); }
  });
  document.getElementById('go').onclick=begin;
});
`;

const BODY = `
<div class="wrap">
  <div class="top">
    <b id="dun">—</b>
    <span class="spot" id="spot"></span>
    <span class="sp"></span>
    <span class="chip" id="pos">—</span>
    <span class="chip" id="kil">討 0</span>
    <span class="chip" id="hrt">傷 0</span>
    <span class="chip" id="tor">松明 OFF</span>
  </div>
  <div class="body">
    <div class="mapwrap" id="mapwrap"></div>
    <div class="side">
      <div class="narr" id="narr"></div>
      <div class="choices" id="choices"></div>
    </div>
  </div>
  <div class="party" id="party"></div>
</div>

<div class="setup" id="setup"><div class="card">
  <h1>RPGモード ── 探索（Phase 1）</h1>
  <p class="lead">部屋と通路の単位で歩きます。部屋に入ると、その場所の名前と情景が語られ、
    描写に出てきたものだけが選択肢に並びます。灯りの届く範囲だけ地図に形が描かれます。</p>
  <h2>ダンジョン</h2>
  <div class="opts" id="dopts"></div>
  <div class="dsub" id="dsub"></div>
  <h2>広さ</h2>
  <div class="opts" id="ropts"></div>
  <div class="dsub">物語が進むほど、深く、長くなります。</div>
  <h2 id="vtog" style="cursor:pointer">生成の変数 ▾（ふだんは、その場所の流儀のまま）</h2>
  <div id="vwrap" style="display:none"><div id="vopts"></div>
  <div class="dsub">流儀＝その場所らしい地形。喰らいの洞は曲がりくねった洞窟、黙した坑道は長い直線の坑道、欲深き迷路は枝分かれと回廊、護りの神域は広く丸い間。</div></div>
  <button class="start" id="go">ダンジョンの前に立つ</button>
</div></div>

<style>${CSS}</style>
<script>${DATA}
${APP}
</script>
`;

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'rpgexp.html'), wrap(BODY, 'RPGモード 探索'));
fs.writeFileSync(path.join(root, 'docs', 'rpgexp.html'), '<title>RPGモード 探索</title>\n' + BODY);
console.log('rpgexp.html と docs/rpgexp.html を書きました（' + (BODY.length / 1024).toFixed(0) + ' KB）');
