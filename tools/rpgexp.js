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
html,body{overscroll-behavior:none}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--font);
  font-size:13.5px;line-height:1.62;-webkit-text-size-adjust:100%;
  position:fixed;inset:0;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100svh}
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
.mapwrap{flex:0 0 42svh;position:relative;overflow:hidden;background:#7f7866;
  border-top:2px solid #241f14;touch-action:none;user-select:none;-webkit-user-select:none}
#mapsvg{position:absolute;inset:0}
#mapsvg svg{position:absolute;display:block;will-change:left,top,width}
/* 入口の前：地図の代わりに、その場所の情景を出す */
.entryart{position:absolute;inset:0;z-index:7;display:none;background:#0b0a08 center/cover no-repeat}
.entryart.on{display:block}
.entryart:before{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(8,6,4,.15) 0%,rgba(8,6,4,0) 34%,rgba(8,6,4,.72) 82%,rgba(8,6,4,.92) 100%)}
.ea_btns{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;align-items:stretch;
  padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))}
.ea_btns button{font:inherit;border-radius:11px;cursor:pointer;padding:11px 8px;
  background:rgba(18,14,8,.78);color:#e6dcc4;border:1px solid #6b5a30;font-size:13px;
  backdrop-filter:blur(3px);flex:1 1 0}
.ea_btns button.main{flex:1.9 1 0;font-size:17px;font-weight:700;color:#1a1305;letter-spacing:.16em;
  background:linear-gradient(180deg,#f0d489,#c69a3c);border-color:#f4e2a8;
  box-shadow:0 4px 16px rgba(0,0,0,.5)}
.ea_btns button:active{transform:translateY(1px)}
.mapbig{position:absolute;top:6px;right:6px;z-index:5;width:34px;height:34px;border-radius:9px;
  border:1px solid rgba(201,162,74,.4);background:rgba(22,17,9,.6);color:#f6efd9;
  font-size:15px;cursor:pointer;padding:0}
body.mapbig .mapwrap{position:fixed;inset:0;z-index:12;flex:none;border:0}
body.mapbig .mapbig{background:rgba(22,17,9,.8)}
/* 全画面は「地図を見るだけ」。操作盤と行動シートは伏せる */
body.mapbig .pad,body.mapbig .sheet{display:none!important}
.pad{position:absolute;right:2px;bottom:2px;z-index:5;width:152px;height:152px;
  transition:opacity .2s}
.pad.away{opacity:0;pointer-events:none}
.pad svg{width:100%;height:100%;overflow:visible}
.pd{cursor:pointer}
.pd .plate{fill:url(#brs);fill-opacity:.62;stroke:#c9a24a;stroke-opacity:.32;stroke-width:1.6;
  stroke-linejoin:round}
.pd .ar{fill:#efe9dc}
.pd.unex .ar{fill:#fff;filter:drop-shadow(0 0 3px rgba(255,255,255,.4))}
.pd.unex .plate{stroke-opacity:.8;fill-opacity:.72}
.pd.shut .ar{fill:#d08a7a}
.pd.shut .plate{stroke:#a03434;stroke-opacity:.85}
.pd.off{opacity:.22;pointer-events:none}
.pd:active .plate{fill-opacity:.95}
.pd.c .gr,.pd.c .gt{stroke:#6f6a58;stroke-width:3.4;fill:none;stroke-linecap:round}
.pd.c .gr2{fill:#6f6a58}
.pd.c.has .plate{fill-opacity:.8;stroke-opacity:.95}
.pd.c.has .gr,.pd.c.has .gt{stroke:#f2c65c}
.pd.c.has .gr2{fill:#f2c65c}
.pd.c.has{animation:cglow 1.9s infinite}
@keyframes cglow{50%{filter:drop-shadow(0 0 8px rgba(242,198,92,.5))}}
.pd.k .fl{fill:#efe9dc}
.pd.k.has .fl{fill:#fff;filter:drop-shadow(0 0 4px rgba(255,255,255,.4))}
.pd.k.off{opacity:.22;pointer-events:none}
.entrybar{flex:0 0 auto;display:none;gap:8px;align-items:stretch;padding:8px 10px 4px}
.entrybar.on{display:flex}
.entrybar button{font:inherit;border-radius:11px;cursor:pointer;padding:10px 6px;
  border:1px solid var(--line2);background:var(--panel2);color:var(--ink2);font-size:12.5px;flex:1 1 0}
.entrybar button.main{flex:1.7 1 0;font-size:16px;font-weight:700;color:#1a1305;
  background:var(--gold);border-color:var(--gold)}
.pad.lockpad .pd:not(.c){opacity:.16;pointer-events:none}
.topbar{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:7px 10px;
  background:var(--panel);border-bottom:1px solid var(--line)}
.topbar b{color:var(--gold);font-size:13.5px;white-space:nowrap;flex:0 1 auto;
  min-width:3.2em;overflow:hidden;text-overflow:ellipsis}
.topbar .spot{font-size:11.5px;color:var(--ink2);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;max-width:9em}
.topbar .spot:before{content:"／ ";color:var(--ink3)}
.topbar .sp{flex:1}
.tb{flex:0 0 auto;font:inherit;font-size:11.5px;color:var(--ink2);background:var(--panel2);
  border:1px solid var(--line2);border-radius:999px;padding:4px 11px;cursor:pointer;white-space:nowrap}
.sheet{position:absolute;left:8px;right:8px;bottom:8px;max-height:calc(100% - 52px);z-index:6;
  touch-action:pan-y;
  background:var(--panel);border:1px solid var(--line2);border-radius:12px;
  display:none;flex-direction:column;box-shadow:0 -8px 28px rgba(0,0,0,.55)}
.sheet.on{display:flex}
.sheethead{display:flex;justify-content:space-between;align-items:center;
  padding:8px 12px 4px;color:var(--ink3);font-size:11.5px;flex:0 0 auto}
.sheethead button{font:inherit;font-size:13px;width:30px;height:30px;border-radius:8px;
  border:1px solid var(--line2);background:var(--panel2);color:var(--ink2);cursor:pointer}
#sheetbody{overflow-y:auto;overscroll-behavior:contain;padding:2px 8px 8px;display:flex;flex-direction:column;gap:6px;
  -webkit-overflow-scrolling:touch}
.statline{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--ink3);
  padding:5px 4px 2px;flex-wrap:wrap}
.statline .on{color:var(--gold)}
.statline button{font:inherit;font-size:11px;color:var(--ink2);background:var(--panel2);
  border:1px solid var(--line2);border-radius:999px;padding:2px 10px;cursor:pointer}
.side{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:8px 10px 0;
  position:relative}
.narr{flex:1 1 0;overflow-y:auto;overscroll-behavior:contain;min-height:7.5em;padding:9px 12px;
  background:var(--panel);border:1px solid var(--line);border-radius:10px;
  -webkit-overflow-scrolling:touch}
.narr p{margin:0 0 7px}
.narr p:last-child{margin-bottom:0}
.side{position:relative}
.more{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:4;
  display:none;align-items:center;gap:5px;font:inherit;font-size:11px;color:#1a1305;
  background:var(--gold);border:0;border-radius:999px;padding:3px 12px;cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.5)}
.more.on{display:inline-flex}
.more .mchev{display:inline-block;animation:mbob 1.5s infinite}
@keyframes mbob{50%{transform:translateY(3px)}}
.fade{position:absolute;left:10px;right:10px;bottom:0;height:44px;z-index:3;pointer-events:none;
  border-radius:0 0 10px 10px;opacity:0;transition:opacity .2s;
  background:linear-gradient(to bottom,rgba(13,18,32,0),rgba(13,18,32,.96))}
.fade.on{opacity:1}
.narr .cap{color:var(--gold);font-weight:700;font-size:14.5px;margin:0 0 6px;
  padding-top:6px;border-top:1px dashed var(--line2)}
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
.party{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:7px 10px 8px}
.pm{background:var(--panel);border:1px solid var(--line);border-radius:8px;
  padding:6px 5px;min-width:0;display:flex;align-items:baseline;justify-content:center;gap:6px}
.pm .n{font-size:11.5px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm .h{font-size:13.5px;font-variant-numeric:tabular-nums;color:var(--ink3)}
.pm .h b{font-weight:700;color:var(--ok)}
.pm .h b.mid{color:var(--warn)}
.pm .h b.low{color:var(--ng)}
.pm.back{background:#0b101c}

body.land .wrap{display:grid;grid-template-columns:46% 1fr;grid-template-rows:1fr auto}
body.land .mapwrap{grid-column:1;grid-row:1/3;height:100svh;flex:none;border-top:0;border-right:2px solid #241f14}
body.land .side{grid-column:2;grid-row:1;min-height:0}
body.land .party{grid-column:2;grid-row:2}
.askrow{display:flex;justify-content:space-between;gap:10px;margin:5px 0;font-size:12.5px}
.askrow span{color:var(--ink3)}
.askrow b{color:var(--ink);text-align:right}
.askrow b.ok{color:var(--ok)}
.askrow b.ng{color:var(--warn)}
.askbtns{display:flex;gap:8px;align-items:center;margin:16px 0 0}
.pd.out .ar{fill:#9fe6c0}
.pd.out .plate{stroke:#7de8a4;stroke-opacity:.75}
.bookov{display:none !important}
.bookov.on{display:flex !important}
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
`;

const APP = String.raw`
/* ================= 状態 ================= */
var PARTY = [
  { n:'聖騎士',   id:'paladin',    hp:26, mx:26, base:26, row:0, eq:{} },
  { n:'狂戦士',   id:'berserker',  hp:26, mx:26, base:26, row:0, eq:{} },
  { n:'槍兵',     id:'spearman',   hp:21, mx:21, base:21, row:0, eq:{} },
  { n:'高僧',     id:'highpriest', hp:26, mx:26, base:26, row:1, eq:{} },
  { n:'魔法使い', id:'mage',       hp:11, mx:11, base:11, row:1, eq:{} },
  { n:'弓兵',     id:'archer',     hp:11, mx:11, base:11, row:1, eq:{} }
];
/* 本編のカードと同じ体力にそろえる（親アプリがあれば、そこから受け取る） */
function syncPartyStats(){
  try {
    if (parent === window || !parent.RPGSTATS) return;
    var st = parent.RPGSTATS(PARTY.map(function(p){ return p.id; }));
    PARTY.forEach(function(p){
      var d = st[p.id];
      if (d && d.hp){ p.base = d.hp; p.mx = d.hp; p.hp = d.hp; if (d.name) p.n = d.name; }
    });
  } catch (e) {}
}
var S = null;

/* ================= 装備 =================
   宝箱から出るのは武器・防具・装身具。同じ品でも出来には幅があり（＋0〜＋3）、
   稀に呪われている。拾った時点では正体が分からず、身につけてはじめて分かる。 */
var GEAR = {
  weapon: [
    { b:'club',   n:'木の棍棒',     t:1, atk:1 },
    { b:'sword',  n:'鉄の剣',       t:1, atk:1 },
    { b:'axe',    n:'戦斧',         t:2, atk:2, spd:-1 },
    { b:'long',   n:'鋼の長剣',     t:2, atk:2 },
    { b:'silver', n:'銀の刃',       t:3, atk:3, spd:1 },
    { b:'fang',   n:'竜牙の剣',     t:4, atk:4 }
  ],
  armor: [
    { b:'leather',n:'革の胴',       t:1, hp:3 },
    { b:'chain',  n:'鎖帷子',       t:2, hp:5 },
    { b:'plate',  n:'鋼の胸当て',   t:3, hp:8, spd:-1 },
    { b:'mith',   n:'聖銀の鎧',     t:4, hp:11 }
  ],
  trinket: [
    { b:'ring',   n:'銅の環',       t:1, spd:1 },
    { b:'charm',  n:'木彫りの護符', t:1, hp:2 },
    { b:'pow',    n:'力の指輪',     t:2, atk:1 },
    { b:'boots',  n:'俊足の靴',     t:2, spd:2 },
    { b:'life',   n:'生命の護符',   t:3, hp:5 },
    { b:'sign',   n:'古びた聖印',   t:3, atk:1, hp:3 }
  ]
};
/* 呪い。品そのものは腕が立つことが多い。身につけるまで分からず、
   一度つけたらその探索のあいだ外せない（街での解呪は次の段） */
var CURSES = {
  drain: { n:'蝕む',   t:'戦いのたび、持ち主が削られる（戦闘後 -2）', atk:1 },
  heavy: { n:'重い',   t:'身体が思うように動かない（素早さ -3）',     spd:-3 },
  greed: { n:'貪る',   t:'傷薬の効きが半分になる',                    atk:1 },
  frail: { n:'脆い',   t:'守りが薄くなる（HP -4）',                   hp:-4 }
};
var SLOTNAME = { weapon:'武器', armor:'防具', t1:'装身具', t2:'装身具' };
var VAGUE = { weapon:'刃物のような何か', armor:'身を守る何か', trinket:'小さな品' };
var _gid = 1;
function rollGear(rar){
  var ks = ['weapon','armor','trinket'];
  var k = ks[Math.floor(rnd() * 3)];
  var top = rar === 3 ? 4 : rar === 2 ? 3 : 2;
  var cand = GEAR[k].filter(function(g){ return g.t <= top; });
  var pick = cand[Math.min(cand.length - 1,
    Math.floor(Math.pow(rnd(), rar === 3 ? 0.6 : rar === 2 ? 0.85 : 1.35) * cand.length))];
  var plus = 0, r2 = rnd();
  if (rar === 1) plus = r2 < 0.62 ? 0 : r2 < 0.92 ? 1 : 2;
  else if (rar === 2) plus = r2 < 0.34 ? 0 : r2 < 0.74 ? 1 : r2 < 0.94 ? 2 : 3;
  else plus = r2 < 0.16 ? 1 : r2 < 0.62 ? 2 : 3;
  var curse = null;
  if (rnd() < (rar === 3 ? 0.28 : rar === 2 ? 0.16 : 0.08)){
    var cks = Object.keys(CURSES);
    curse = cks[Math.floor(rnd() * cks.length)];
    plus = Math.max(plus, rar === 1 ? 1 : 2);
  }
  return { u:'g' + (_gid++), k:k, b:pick.b, plus:plus, curse:curse, idd:0 };
}
function gearDef(it){
  var pool = GEAR[it.k];
  for (var i = 0; i < pool.length; i++) if (pool[i].b === it.b) return pool[i];
  return pool[0];
}
function gearStats(it){
  var d = gearDef(it), c = it.curse ? CURSES[it.curse] : null;
  var atk = d.atk || 0, hp = d.hp || 0, spd = d.spd || 0;
  /* ＋値は、その品がいちばん得意な数字に乗る */
  if (it.plus){
    if (d.atk) atk += it.plus;
    else if (d.hp) hp += it.plus;
    else if (d.spd) spd += it.plus;
  }
  return {
    atk: atk + ((c && c.atk) || 0),
    hp:  hp  + ((c && c.hp)  || 0),
    spd: spd + ((c && c.spd) || 0)
  };
}
function gearName(it){
  if (!it.idd) return VAGUE[it.k] + '？';
  return (it.curse ? CURSES[it.curse].n : '') + gearDef(it).n + (it.plus ? '＋' + it.plus : '');
}
function gearLine(it){
  if (!it.idd) return '正体は、身につけてみるまで分からない';
  var s = gearStats(it), out = [];
  if (s.atk) out.push('攻撃 ' + (s.atk > 0 ? '+' : '') + s.atk);
  if (s.hp)  out.push('HP ' + (s.hp > 0 ? '+' : '') + s.hp);
  if (s.spd) out.push('素早さ ' + (s.spd > 0 ? '+' : '') + s.spd);
  if (it.curse) out.push('呪：' + CURSES[it.curse].t);
  return out.join('／') || 'これといった効き目はない';
}
function gearBonus(p){
  var b = { atk:0, hp:0, spd:0 };
  ['weapon','armor','t1','t2'].forEach(function(sl){
    var it = p.eq && p.eq[sl];
    if (!it) return;
    var s = gearStats(it);
    b.atk += s.atk; b.hp += s.hp; b.spd += s.spd;
  });
  return b;
}
/* 装備が変わると最大HPも変わる。増えた分は、そのまま体力になる */
function applyGear(p){
  var was = p.mx;
  p.mx = Math.max(1, (p.base || p.mx) + gearBonus(p).hp);
  if (p.mx > was) p.hp += (p.mx - was);
  p.hp = Math.max(0, Math.min(p.mx, p.hp));
}
function hasCurse(p, ck){
  return ['weapon','armor','t1','t2'].some(function(sl){
    var it = p.eq && p.eq[sl];
    return it && it.idd && it.curse === ck;
  });
}

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
function KNUM(v){
  var K = '〇一二三四五六七八九';
  if (v <= 9) return K[v];
  if (v === 10) return '十';
  return v < 20 ? '十' + K[v - 10] : String(v);
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
  if (window.syncMore) setTimeout(syncMore, 20);
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
   灯りなし: 2マス ／ 松明: 5マス ／ 魔法使いのトーチ: 9マス（6歩つづく） */
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

  /* ── 魔法使いのトーチ：光の精霊が2部屋先まで飛び、輪郭だけを探ってくる ── */
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

  var x0 = Math.floor(f.x0) - 1, y0 = Math.floor(f.y0) - 1;
  var W = Math.round((Math.ceil(f.x1) - x0 + 1) * CELL);
  var H = Math.round((Math.ceil(f.y1) - y0 + 1) * CELL);
  var px = function(x){ return (x - x0) * CELL; }, py = function(y){ return (y - y0) * CELL; };
  var LX = px(pcx), LY = py(pcy), LR = R * CELL;
  S.mapW = W; S.mapH = H; S.px0 = LX; S.py0 = LY;

  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="ダンジョンの地図">';
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
    + '<mask id="lm"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#000"/>'
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
  s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#dots)"/>';

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
    /* 既知の床を描き直して、通路の端の墨が部屋の中に「蓋」を作らないようにする */
    known.forEach(function(p2){
      s += geom(p2, 0) + ' fill="' + (S.been[p2.n.id] ? 'url(#gp)' : '#d8d0b6') + '"/>';
    });
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

  /* 踏んだ場所の縁：まだ知らない隣を、実際の地図から少しだけ見せる
     ・踏んだ部屋 → 未知の通路 … 実物の通路を半マスだけ（先はぶった切り。部屋へは食い込まない）
     ・踏んだ通路 → 未知の部屋 … つながる口のまわりだけチラ見せ（行き止まりに見せない） */
  var idx2 = cellIndex();
  var clipN = 0;
  var dirTo = function(e, node){
    if ((idx2[(e[0] + 1) + ',' + e[1]] || {}).id === node.id) return 'E';
    if ((idx2[(e[0] - 1) + ',' + e[1]] || {}).id === node.id) return 'W';
    if ((idx2[e[0] + ',' + (e[1] + 1)] || {}).id === node.id) return 'S';
    if ((idx2[e[0] + ',' + (e[1] - 1)] || {}).id === node.id) return 'N';
    return null;
  };
  var endCell = function(c, n){
    var e0 = c.cells[0], e1 = c.cells[c.cells.length - 1];
    var d0 = Math.pow(e0[0] + 0.5 - n.gx, 2) + Math.pow(e0[1] + 0.5 - n.gy, 2);
    var d1 = Math.pow(e1[0] + 0.5 - n.gx, 2) + Math.pow(e1[1] + 0.5 - n.gy, 2);
    return d0 <= d1 ? e0 : e1;
  };
  var wallAt = function(e, nd){
    return nd === 'E' ? px(e[0] + 1) : nd === 'W' ? px(e[0])
         : nd === 'S' ? py(e[1] + 1) : py(e[1]);
  };
  var latOf = function(e, nd){
    return (nd === 'E' || nd === 'W')
      ? py(e[1]) + (CELL - corw) / 2
      : px(e[0]) + (CELL - corw) / 2;
  };
  var rectOf = function(nd, a0, a1, l0, l1){
    return (nd === 'E' || nd === 'W')
      ? { x: a0, y: l0, w: a1 - a0, h: l1 - l0 }
      : { x: l0, y: a0, w: l1 - l0, h: a1 - a0 };
  };
  var clipOpen = function(r2){
    var cid = 'pk' + (clipN++);
    s += '<clipPath id="' + cid + '"><rect x="' + r2.x + '" y="' + r2.y
      + '" width="' + r2.w + '" height="' + r2.h + '"/></clipPath>'
      + '<g clip-path="url(#' + cid + ')">';
  };
  var prims1 = function(node){ return mkPrims(function(z){ return z.id === node.id; }); };
  var drawPiece = function(ps, floorFill){
    if (S.map.roughPx){
      s += '<g filter="url(#rgh)">';
      ps.forEach(function(p2){ s += geom(p2, 12) + ' fill="#57503b" opacity="0.85"/>'; });
      s += '</g>';
    }
    ps.forEach(function(p2){ s += geom(p2, 4) + ' fill="' + INK + '"/>'; });
    ps.forEach(function(p2){ s += geom(p2, 0) + ' fill="' + floorFill + '"/>'; });
  };
  ns.forEach(function(n){
    if (!knownFull(n)) return;
    if (n.kind === 'room'){
      n.links.forEach(function(lid){
        var c = S.map.byId[lid];
        if (!c || c.kind !== 'corridor' || knownFull(c)) return;
        var e = endCell(c, n);
        var nd = dirTo(e, n); if (!nd) return;
        var wall = wallAt(e, nd), lat = latOf(e, nd);
        var L2 = CELL * 0.5;                    /* 見せるのは半マスだけ */
        var far2 = (nd === 'E' || nd === 'S');  /* 部屋が奥側 → 通路は手前側 */
        clipOpen(rectOf(nd, far2 ? wall - L2 : wall, far2 ? wall : wall + L2,
                        lat - 18, lat + corw + 18));
        drawPiece(prims1(c), '#d8d0b6');
        s += '</g>';
        if (n.shape === 'round'){
          /* 丸い部屋は壁が弧なので、床だけ内側へ通して口をあける */
          var rin = CELL * 0.55;
          clipOpen(rectOf(nd, far2 ? wall : wall - rin, far2 ? wall + rin : wall,
                          lat - 2, lat + corw + 2));
          prims1(c).forEach(function(p2){ s += geom(p2, 0) + ' fill="#d8d0b6"/>'; });
          var rf = S.been[n.id] ? 'url(#gp)' : '#d8d0b6';
          prims1(n).forEach(function(p2){ s += geom(p2, 0) + ' fill="' + rf + '"/>'; });
          s += '</g>';
        }
      });
      return;
    }
    /* 輪郭を知っている通路の先が未知の部屋なら、口だけ見せる（行き止まりに見せない）。
       ただし閉ざされた関門の先は、光もここを通れないので見せない */
    if (n.gate && !S.open[n.gate]) return;
    [n.from, n.to].forEach(function(rid){
      var r = S.map.byId[rid];
      if (!r || knownFull(r)) return;
      var e = endCell(n, r);
      var nd = dirTo(e, r); if (!nd) return;
      var wall = wallAt(e, nd), lat = latOf(e, nd);
      var D2 = CELL * 0.45;
      var far2 = (nd === 'E' || nd === 'S');    /* 部屋が奥側 */
      clipOpen(rectOf(nd, far2 ? wall - 8 : wall - D2, far2 ? wall + D2 : wall + 8,
                      lat - 22, lat + corw + 22));
      drawPiece(prims1(r), '#d8d0b6');
      /* 口：通路の床で壁を破り、部屋へ続いていることを示す */
      var md = r.shape === 'round' ? CELL * 0.5 : 6;
      var mr = rectOf(nd, far2 ? wall - 8 : wall - md, far2 ? wall + md : wall + 8,
                      lat, lat + corw);
      s += '<rect x="' + mr.x + '" y="' + mr.y + '" width="' + mr.w + '" height="' + mr.h
        + '" fill="' + (S.been[n.id] ? 'url(#gp)' : '#d8d0b6') + '"/>';
      s += '</g>';
    });
  });

  /* 部屋の特徴：地図職人の注記として、踏んだ部屋にだけ描く（インクの線画） */
  var frnd = function(rid, fid){
    var h = ((S.map.seed >>> 0) ^ 2166136261) >>> 0;
    var s3 = rid + '|' + fid;
    for (var i = 0; i < s3.length; i++) h = Math.imul(h ^ s3.charCodeAt(i), 16777619);
    h = (h >>> 0) || 1;
    return function(){ h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; if (!h) h = 1; return h / 4294967296; };
  };
  var fglyph = function(n, fid){
    var fp = n.fpos && n.fpos[fid];
    var mag = (n.fmag && n.fmag[fid]) || 2;
    var form = n.fform && n.fform[fid];
    var cx = px(n.gx + (fp ? fp.dx : 0) * n.w), cy = py(n.gy + (fp ? fp.dy : 0) * n.h);
    var r2 = frnd(n.id, fid);
    var side = fp ? fp.w : '北';
    var hw = (side === '北' || side === '南');   /* 壁沿いのものの向き */
    var x0e = px(n.gx) - n.w * CELL / 2, y0e = py(n.gy) - n.h * CELL / 2;
    var g = '', i2, a2, t2;
    if (fid === 'statue'){
      var one = function(x, y, sc){
        return '<rect x="' + (x - 4 * sc).toFixed(1) + '" y="' + (y - 4 * sc).toFixed(1)
          + '" width="' + (8 * sc) + '" height="' + (8 * sc) + '" rx="1"/>'
          + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (2.1 * sc) + '" fill="' + INK + '" stroke="none"/>';
      };
      if (form){
        var gw = n.w * CELL * 0.6, gh = n.h * CELL * 0.6;
        for (var rI = 0; rI < form.rows; rI++)
          for (var cI = 0; cI < form.cols; cI++)
            g += one(px(n.gx) - gw / 2 + (form.cols === 1 ? gw / 2 : gw * cI / (form.cols - 1)),
                     py(n.gy) - gh / 2 + (form.rows === 1 ? gh / 2 : gh * rI / (form.rows - 1)), 0.78);
      } else g += one(cx, cy, 1);
    } else if (fid === 'pool'){
      var prx, pry, pcx = cx, pcy = cy;
      if (mag === 3){
        prx = n.w * CELL * 0.4; pry = n.h * CELL * 0.3;
        pcx = px(n.gx) + (fp ? fp.dx : 0) * n.w * CELL * 0.35;
        pcy = py(n.gy) + (fp ? fp.dy : 0) * n.h * CELL * 0.35;
      } else if (mag === 2){ prx = CELL * 0.55; pry = CELL * 0.42; }
      else { prx = CELL * 0.28; pry = CELL * 0.22; }
      var pts = [];
      for (a2 = 0; a2 < 11; a2++){
        var th = a2 / 11 * Math.PI * 2, rj = 0.82 + r2() * 0.3;
        pts.push((pcx + Math.cos(th) * prx * rj).toFixed(1) + ' ' + (pcy + Math.sin(th) * pry * rj).toFixed(1));
      }
      g += '<path d="M' + pts.join('L') + 'Z" fill="' + INK + '" fill-opacity="0.09"/>'
        + '<path d="M' + (pcx - prx * 0.35).toFixed(1) + ' ' + pcy.toFixed(1) + ' q ' + (prx * 0.2).toFixed(1) + ' 3 ' + (prx * 0.45).toFixed(1) + ' 0" fill="none"/>'
        + '<path d="M' + (pcx - prx * 0.1).toFixed(1) + ' ' + (pcy + pry * 0.35).toFixed(1) + ' q ' + (prx * 0.18).toFixed(1) + ' 3 ' + (prx * 0.4).toFixed(1) + ' 0" fill="none"/>';
    } else if (fid === 'moss'){
      var dots = mag === 3 ? 46 : mag === 2 ? 14 : 7;
      for (i2 = 0; i2 < dots; i2++){
        var mx2, my2;
        if (mag === 3){
          if (r2() < 0.7){
            var edge = Math.floor(r2() * 4), along = r2(), ins = 4 + r2() * 9;
            if (edge === 0){ mx2 = x0e + along * n.w * CELL; my2 = y0e + ins; }
            else if (edge === 1){ mx2 = x0e + along * n.w * CELL; my2 = y0e + n.h * CELL - ins; }
            else if (edge === 2){ mx2 = x0e + ins; my2 = y0e + along * n.h * CELL; }
            else { mx2 = x0e + n.w * CELL - ins; my2 = y0e + along * n.h * CELL; }
          } else { mx2 = px(n.gx) + (r2() - 0.5) * n.w * CELL * 0.8; my2 = py(n.gy) + (r2() - 0.5) * n.h * CELL * 0.8; }
        } else {
          var rad = mag === 2 ? 15 : 9;
          mx2 = cx + (r2() - 0.5) * 2 * rad; my2 = cy + (r2() - 0.5) * 2 * rad;
        }
        g += '<circle cx="' + mx2.toFixed(1) + '" cy="' + my2.toFixed(1) + '" r="' + (0.8 + r2() * 0.7).toFixed(1) + '" fill="' + INK + '" fill-opacity="0.5" stroke="none"/>';
      }
    } else if (fid === 'bones'){
      var bn = mag === 3 ? 22 : mag === 2 ? 9 : 5;
      for (i2 = 0; i2 < bn; i2++){
        var bx, by;
        if (mag === 3){
          var alo = 0.06 + r2() * 0.88, dep = 5 + r2() * CELL * 0.55;
          if (side === '北'){ bx = x0e + alo * n.w * CELL; by = y0e + dep; }
          else if (side === '南'){ bx = x0e + alo * n.w * CELL; by = y0e + n.h * CELL - dep; }
          else if (side === '西'){ bx = x0e + dep; by = y0e + alo * n.h * CELL; }
          else { bx = x0e + n.w * CELL - dep; by = y0e + alo * n.h * CELL; }
        } else { var br = mag === 2 ? 13 : 8; bx = cx + (r2() - 0.5) * 2 * br; by = cy + (r2() - 0.5) * 2 * br; }
        var an = r2() * Math.PI, ln = 3.5 + r2() * 4;
        g += '<line x1="' + (bx - Math.cos(an) * ln).toFixed(1) + '" y1="' + (by - Math.sin(an) * ln).toFixed(1)
          + '" x2="' + (bx + Math.cos(an) * ln).toFixed(1) + '" y2="' + (by + Math.sin(an) * ln).toFixed(1) + '"/>';
        if (r2() < 0.3) g += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="1.6"/>';
      }
    } else if (fid === 'hearth'){
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" stroke-dasharray="3 2.4"/>'
        + '<line x1="' + (cx - 3) + '" y1="' + (cy + 1.5) + '" x2="' + (cx + 3) + '" y2="' + (cy - 1.5) + '"/>'
        + '<line x1="' + (cx - 3) + '" y1="' + (cy - 1.5) + '" x2="' + (cx + 3) + '" y2="' + (cy + 1.5) + '"/>';
    } else if (fid === 'well'){
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5"/>'
        + '<circle cx="' + cx + '" cy="' + cy + '" r="3.2" fill="' + INK + '" fill-opacity="0.35" stroke="none"/>';
    } else if (fid === 'altar'){
      g += '<rect x="' + (cx - 6) + '" y="' + (cy - 4) + '" width="12" height="8" rx="1"/>'
        + '<line x1="' + (cx - 8.5) + '" y1="' + (cy + 6.5) + '" x2="' + (cx + 8.5) + '" y2="' + (cy + 6.5) + '"/>';
    } else if (fid === 'camp'){
      for (i2 = 0; i2 < 6; i2++){
        var thc = i2 / 6 * Math.PI * 2 + r2() * 0.5;
        g += '<circle cx="' + (cx + Math.cos(thc) * 6).toFixed(1) + '" cy="' + (cy + Math.sin(thc) * 6).toFixed(1) + '" r="1.3" fill="' + INK + '" stroke="none"/>';
      }
      g += '<line x1="' + (cx - 3) + '" y1="' + (cy + 2) + '" x2="' + (cx + 3) + '" y2="' + (cy - 2) + '"/>'
        + '<line x1="' + (cx - 3) + '" y1="' + (cy - 2) + '" x2="' + (cx + 3) + '" y2="' + (cy + 2) + '"/>';
    } else if (fid === 'mural'){
      for (i2 = 0; i2 < 5; i2++){
        var off = (i2 - 2) * 4.2, hh = 4 + r2() * 3.5;
        g += hw
          ? '<line x1="' + (cx + off).toFixed(1) + '" y1="' + (cy - hh / 2).toFixed(1) + '" x2="' + (cx + off).toFixed(1) + '" y2="' + (cy + hh / 2).toFixed(1) + '"/>'
          : '<line x1="' + (cx - hh / 2).toFixed(1) + '" y1="' + (cy + off).toFixed(1) + '" x2="' + (cx + hh / 2).toFixed(1) + '" y2="' + (cy + off).toFixed(1) + '"/>';
      }
    } else if (fid === 'gap'){
      var zz = 'M';
      for (i2 = 0; i2 < 6; i2++){
        var zt = (i2 - 2.5) * 4.5, zj = (r2() - 0.5) * 6;
        zz += (hw ? (cx + zt).toFixed(1) + ' ' + (cy + zj).toFixed(1)
                  : (cx + zj).toFixed(1) + ' ' + (cy + zt).toFixed(1)) + (i2 < 5 ? 'L' : '');
      }
      g += '<path d="' + zz + '" fill="none"/>';
    } else if (fid === 'shelf'){
      if (hw){
        g += '<line x1="' + (cx - 8) + '" y1="' + (cy - 2.4) + '" x2="' + (cx + 8) + '" y2="' + (cy - 2.4) + '"/>'
          + '<line x1="' + (cx - 8) + '" y1="' + (cy + 2.4) + '" x2="' + (cx + 8) + '" y2="' + (cy + 2.4) + '"/>';
        for (i2 = -1; i2 <= 1; i2++) g += '<line x1="' + (cx + i2 * 6) + '" y1="' + (cy - 2.4) + '" x2="' + (cx + i2 * 6) + '" y2="' + (cy + 2.4) + '"/>';
      } else {
        g += '<line x1="' + (cx - 2.4) + '" y1="' + (cy - 8) + '" x2="' + (cx - 2.4) + '" y2="' + (cy + 8) + '"/>'
          + '<line x1="' + (cx + 2.4) + '" y1="' + (cy - 8) + '" x2="' + (cx + 2.4) + '" y2="' + (cy + 8) + '"/>';
        for (i2 = -1; i2 <= 1; i2++) g += '<line x1="' + (cx - 2.4) + '" y1="' + (cy + i2 * 6) + '" x2="' + (cx + 2.4) + '" y2="' + (cy + i2 * 6) + '"/>';
      }
    } else if (fid === 'chains'){
      for (i2 = 0; i2 < 4; i2++){
        var lo = (i2 - 1.5) * 5.4, sag = Math.abs(i2 - 1.5) < 1 ? 2.2 : 0.6;
        g += '<ellipse cx="' + (cx + lo).toFixed(1) + '" cy="' + (cy + sag).toFixed(1) + '" rx="2.6" ry="1.7"/>';
      }
    }
    return g;
  };
  ns.forEach(function(n){
    if (n.kind !== 'room' || !S.been[n.id] || !(n.features || []).length) return;
    var cidf = 'fg' + n.id;
    s += '<clipPath id="' + cidf + '">';
    prims1(n).forEach(function(p2){ s += geom(p2, 0) + '/>'; });
    s += '</clipPath><g clip-path="url(#' + cidf + ')" stroke="' + INK
      + '" fill="none" stroke-width="1.5" stroke-linecap="round" opacity="0.62">';
    n.features.forEach(function(fid){ s += fglyph(n, fid); });
    s += '</g>';
  });

  /* 関門の閂（前に立って知ったものだけ）と、部屋の名前 */
  ns.forEach(function(n){
    if (n.kind === 'corridor'){
      if (n.gate && !S.open[n.gate] && (S.been[n.id] || S.sensed[n.id])){
        var gx2 = px(n.gx), gy2 = py(n.gy);
        s += n.horiz
          ? '<rect x="' + (gx2 - 5) + '" y="' + (gy2 - corw / 2 - 8) + '" width="10" height="' + (corw + 16) + '" rx="3" fill="#a03434"/>'
          : '<rect x="' + (gx2 - corw / 2 - 8) + '" y="' + (gy2 - 5) + '" width="' + (corw + 16) + '" height="10" rx="3" fill="#a03434"/>';
      }
      return;
    }
    if (!S.been[n.id]) return;
    var cx = px(n.gx), cy = py(n.gy);
    /* 手つかずの宝箱は、部屋の隅に小さな箱の印で残す（開ければ消える） */
    if (n.chest && !S.chests[chestKey(n)]){
      var bx = px(n.gx + n.w * 0.30), by = py(n.gy - n.h * 0.28);
      s += '<g stroke="' + INK + '" stroke-width="1.4" fill="#c9a13a" opacity="0.9">'
        + '<rect x="' + (bx - 7) + '" y="' + (by - 5) + '" width="14" height="10" rx="2"/>'
        + '<line x1="' + (bx - 7) + '" y1="' + (by - 1) + '" x2="' + (bx + 7) + '" y2="' + (by - 1) + '"/>'
        + '<line x1="' + bx + '" y1="' + (by - 1) + '" x2="' + bx + '" y2="' + (by + 3) + '"/></g>';
    }
    var icon = '';
    var nm = labelOf(n);
    var fpx = Math.min(13, Math.max(8.5, (n.w * CELL - 8) / Math.max(1, nm.length)));
    if (fpx <= 8.6 && nm.length > 9) nm = nm.slice(0, 9);
    /* 絵とぶつかるなら、空いている上下へ名前をずらす */
    var ly = cy + (icon ? 17 : 5);
    var occ = [];
    (n.features || []).forEach(function(fid){
      var fp3 = n.fpos && n.fpos[fid];
      occ.push({ x: px(n.gx + (fp3 ? fp3.dx : 0) * n.w), y: py(n.gy + (fp3 ? fp3.dy : 0) * n.h) });
    });
    if (n.fform && Object.keys(n.fform).length) occ.push({ x: cx, y: cy });
    var halfW = Math.min(n.w * CELL * 0.45, nm.length * fpx * 0.55);
    if (occ.some(function(o){ return Math.abs(o.y - ly) < 16 && Math.abs(o.x - cx) < halfW + 10; })){
      var upBusy = occ.some(function(o){ return o.y < cy - 6; });
      var dnBusy = occ.some(function(o){ return o.y > cy + 6; });
      var sh = Math.max(12, n.h * CELL * 0.30);
      if (!dnBusy) ly = cy + sh + 4;
      else if (!upBusy) ly = cy - sh + 6;
    }
    s += '<text x="' + cx + '" y="' + ly + '" text-anchor="middle" font-size="' + fpx.toFixed(1)
      + '" font-weight="600" stroke="#efe8d6" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round" fill="'
      + (n.revealed ? '#7a5a12' : '#5a5340') + '">' + nm + '</text>';
  });

  /* 闇のとばり：円の外は、記録済みの場所も影に沈む（見えているのは円の中だけ）。
     魔法使いのトーチが灯っている間は、精霊が探った範囲がまるごと明るい（安心の光） */
  var dkm = '<mask id="dk"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>'
    + '<circle cx="' + LX + '" cy="' + LY + '" r="' + LR + '" fill="url(#dkg)"/>';
  if (S.spellLeft > 0){
    mkPrims(function(n){ return S.sensed[n.id]; }).forEach(function(p2){
      dkm += geom(p2, 16) + ' fill="#000"/>';
    });
  }
  dkm += '</mask>';
  s += '<defs>' + dkm + '</defs>';
  s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#241c10" opacity="0.52" mask="url(#dk)"/>';

  /* 松明のあたたかい輪（トーチの間は輪を出さない）と、パーティの赤点 */
  if (S.spellLeft <= 0) s += '<circle cx="' + LX + '" cy="' + LY + '" r="' + LR + '" fill="url(#warm)"/>';
  s += '<circle cx="' + LX + '" cy="' + LY + '" r="20" fill="url(#pg)"/>'
    + '<circle cx="' + LX + '" cy="' + LY + '" r="7" fill="#b5372e" stroke="#f6f1e2" stroke-width="2"/>';
  s += '</svg>';

  document.getElementById('mapsvg').innerHTML = s;
  camApply();
}

/* ================= 地図カメラ =================
   縮尺は勝手に変えない。中心は常に自分（赤丸）。
   パン＝ドラッグ、ズーム＝＋−とピンチ、「全体」で全図。 */
function camApply(){
  if (!S) return;
  var wrapEl = document.getElementById('mapwrap');
  var svg = document.querySelector('#mapsvg svg');
  if (!svg) return;
  var ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
  var z = S.cam.fit ? Math.min(ww / S.mapW, wh / S.mapH) * 0.94 : S.cam.z;
  svg.style.width  = (S.mapW * z) + 'px';
  svg.style.height = (S.mapH * z) + 'px';
  var cx = S.cam.fit ? S.mapW / 2 : S.px0;
  var cy = S.cam.fit ? S.mapH / 2 : S.py0;
  svg.style.left = (ww / 2 - cx * z + S.cam.panx) + 'px';
  svg.style.top  = (wh / 2 - cy * z + S.cam.pany) + 'px';
}
function camReset(){ if (S && S.cam){ S.cam.panx = 0; S.cam.pany = 0; S.cam.fit = false; } }
/* 操作盤を呼び戻す。呼び戻した一叩きが、そのままボタンを押すことのないように待つ */
var padWake = 0;
function showPad(){
  var pad = document.getElementById('pad');
  if (!pad) return;
  var was = pad.classList.contains('away');
  pad.classList.remove('away');
  if (!was) return;
  pad.style.pointerEvents = 'none';
  clearTimeout(padWake);
  padWake = setTimeout(function(){ pad.style.pointerEvents = ''; }, 450);
}
function camInit(){
  var el = document.getElementById('mapwrap');
  var ptrs = {};
  var pinch0 = 0, z0 = 1;
  el.addEventListener('pointerdown', function(ev){
    if (ev.target.closest && ev.target.closest('.pad, .sheet, .mapui, .entryart')) return;
    el.setPointerCapture(ev.pointerId);
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ks = Object.keys(ptrs);
    if (ks.length === 2){
      var a = ptrs[ks[0]], b2 = ptrs[ks[1]];
      pinch0 = Math.hypot(a.x - b2.x, a.y - b2.y);
      z0 = S && S.cam ? (S.cam.fit ? 0 : S.cam.z) : 1;
    }
  });
  el.addEventListener('pointermove', function(ev){
    if (!ptrs[ev.pointerId] || !S) return;
    var ks = Object.keys(ptrs);
    if (ks.length === 1){
      S.cam.panx += ev.clientX - ptrs[ev.pointerId].x;
      S.cam.pany += ev.clientY - ptrs[ev.pointerId].y;
      ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      camApply();
    } else if (ks.length === 2){
      ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var a = ptrs[ks[0]], b2 = ptrs[ks[1]];
      var d = Math.hypot(a.x - b2.x, a.y - b2.y);
      if (pinch0 > 0){
        if (S.cam.fit){ S.cam.fit = false; S.cam.z = 0.5; z0 = 0.5; }
        S.cam.z = Math.max(0.4, Math.min(2.6, (z0 || 1) * d / pinch0));
        camApply();
      }
    }
  });
  var down0 = null;
  el.addEventListener('pointerdown', function(ev){
    if (ev.target.closest && ev.target.closest('.pad, .sheet, .mapui, .entryart')) { down0 = null; return; }
    down0 = { x: ev.clientX, y: ev.clientY, t: 1 };
  });
  var up = function(ev){
    delete ptrs[ev.pointerId]; pinch0 = 0;
    if (down0 && Math.hypot(ev.clientX - down0.x, ev.clientY - down0.y) < 8){
      /* 地図をよく見たいときは、軽く叩けば操作盤が消える。
         消えているときの一叩きは「呼び戻すだけ」。そのまま下のボタンを押してしまわないよう、
         呼び戻した直後のひと呼吸は操作盤を受け付けにしない */
      var pad = document.getElementById('pad');
      if (pad.classList.contains('away')) showPad();
      else pad.classList.add('away');
    }
    down0 = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', function(ev){ delete ptrs[ev.pointerId]; pinch0 = 0; down0 = null; });
  el.addEventListener('wheel', function(ev){
    if (!S) return;
    if (ev.target.closest && ev.target.closest('.sheet')) return;   /* シートのスクロールを妨げない */
    ev.preventDefault();
    if (S.cam.fit){ S.cam.fit = false; }
    S.cam.z = Math.max(0.4, Math.min(2.6, S.cam.z * (ev.deltaY < 0 ? 1.12 : 0.9)));
    camApply();
  }, { passive: false });
  addEventListener('resize', function(){ camApply(); });
}

/* ================= 判定 ================= */
var MARKS = ['三つ叉の紋','蛇の紋','雫の紋','双つ星の紋','鎌の紋','環の紋','裂けた輪の紋','枯れ枝の紋'];
function markOf(gid){
  var i = Object.keys(S.map.gates).indexOf(gid);
  return MARKS[(i < 0 ? 0 : i) % MARKS.length];
}
function meets(gid){
  var c = S.map.gates[gid].cond;
  switch (c.t){
    case 'carry':    return !!S.bag[c.item + ':' + gid];
    case 'mark':     return (S.marks[c.key]||0) >= c.n;
    case 'slay':     return !!S.did['slay:'+gid];
    case 'favor':    return !!S.did['favor:'+gid];
    case 'offer':    return !!S.bag[c.item + ':' + gid];
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
    if (first){
      var F2 = FEATURES[fid], tD = F2.desc;
      var mg = n.fmag && n.fmag[fid];
      if (mg && F2.descMag && F2.descMag[mg]) tD = F2.descMag[mg];
      var fm = n.fform && n.fform[fid];
      if (fm && F2.descForm) tD = F2.descForm;
      var fpD = n.fpos && n.fpos[fid];
      say(tD, null, Object.assign({}, S.ctx, {
        fw: fpD ? fpD.w : '奥',
        fcount: KNUM(fm ? fm.rows * fm.cols : 1),
        frows: KNUM(fm ? fm.rows : 1)
      }));
    }
    else if (rnd() < 0.35){
      var fp2 = n.fpos && n.fpos[fid];
      say((fp2 ? fp2.w + '側の' : '') + FEATURES[fid].noun +
        '{は、そのままそこにある|は、変わらずそこにある|が、黙って同じ場所にある|には、まだ手を付けていない}。');
    }
  });
  var pendingFoe = false, seedText = null;
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
      if (k2.npcs){
        if (n.evNpc == null) n.evNpc = Math.floor(rnd() * k2.npcs.length);
        seedText = k2.npcs[n.evNpc].look;   /* 人物の風貌と様子。話すかどうかは選択肢で */
      } else seedText = k2.seed;            /* ③のあと、選択肢の直前で語る */
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

  /* ③のあと：見つけたもの。ひと呼吸おいて足す（最初の画面を短く保つ） */
  if (seedText) setTimeout(function(){ say(seedText); }, 900);

  /* 宝箱は、ひと呼吸おいてから目に入る */
  if (n.chest && !S.chests[chestKey(n)]) setTimeout(function(){
    if (S.at !== n.id || S.ui.lock) return;
    say(CHESTRAR[n.chest.rar].look + '。'
      + '{手つかずに見える|誰かが開けた跡はない|長いこと、誰の手も触れていない}。', 'em');
    render();
  }, 1100);

  /* ④ 危機。ここで説明を止め、選択肢に落とす */
  if (pendingFoe){
    say('{$placeの奥から|部屋の中央に|灯りの輪の縁に}、{ひときわ大きいものが|'
      + '他とは明らかに違う影が|$lordを思わせる影が}{立ち上がった|こちらを向いた|'
      + '身を起こした}。{ここを通るなら、これを越えるしかない|'
      + '避けて通れる位置ではない|$who が、無言で武器を握り直した}。');
    S.enc = { gate: n.ev.gate, room: n.id };
  }
}

/* ================= 部屋に入る ================= */
function enter(id){
  var n = S.map.byId[id], first = !S.been[id];
  S.at = id; S.been[id] = 1; S.steps++;
  camReset();
  showPad();                       /* 部屋に入ったら、操作盤は必ず出ている */
  /* 前の場所の話は畳む。新しい場所の話が、いつも頭から読める */
  narrBox().innerHTML = '';
  if (S.spellLeft > 0){ S.spellLeft--; if (S.spellLeft === 0) say('トーチの光が、静かに消えた。', 'sys'); }
  S.pos = { ox: 0, oy: 0.24 };
  S.noise = (!S.enc && rnd() < 0.22) ? 1 : 0;
  reveal();

  var anchor = null;
  if (n.kind === 'corridor'){
    if (n.gate){
      anchor = caption('関門の前');
      var gid = n.gate, key = KEYS[S.map.gates[gid].key];
      if (!S.open[gid]){
        var bn = S.book.filter(function(b){ return b.gate === gid && !b.used; })[0];
        if (bn){ bn.used = 1; say('── 帳面の書きつけは、ここのことだ', 'sys'); }
      }
      if (S.open[gid]) say(PASS + key.again);
      else if (meets(gid)){
        S.open[gid] = 1; say(key.open, 'em');
        say('── ' + key.name + '：道が通じた', 'sys');
        reveal();
      } else {
        say(key.blocked);
        var ct = S.map.gates[gid].cond.t;
        if (ct === 'carry' || ct === 'offer')
          say('── 錠には ' + markOf(gid) + ' が彫られている。合う品が要る', 'bad');
        else say('── ' + NEED[ct], 'bad');
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
      if (n.goal){
        say('{探していたものは、この奥にある|ここが最奥だ|——ここまで来た}。', 'em');
        var bg = S.book.filter(function(b){ return b.goal && !b.used; })[0];
        if (bg){ bg.used = 1; say('── 帳面に写した話は、本当だったということだ', 'sys'); }
        if (RPGQ && !S.qdone && !S.bossDown){
          say('部屋の最奥で、ひときわ大きな影が、ゆっくりと身を起こした。——主だ。'
            + 'こちらを認めて、もう目を離さない。', 'em');
          S.boss = 1;
        }
      }
    }
    describeRoom(n, first);
  }
  /* 物音: 危機と重なるときは立てない。立てたら必ず文で語ってから選択肢に出す */
  if (S.enc) S.noise = 0;
  if (S.noise) setTimeout(function(){
    if (!S.noise) return;
    say('{……どこかで、低い物音がした|……短い音がした。石が転がるような音だ|'
      + '……何かが動く気配が、壁越しに伝わってきた}。{遠くない|方角の見当は、つく}。');
  }, 1400);
  render();
  if (anchor) narrBox().scrollTop = Math.max(0, anchor.offsetTop - 8);
  if (window.syncMore) setTimeout(syncMore, 40);
}

/* ================= 戦い =================
   遭遇も主も、本編のカードバトルで決着をつける。
   パーティのHPは戦闘のあとも持ち越し、倒れた者はその探索のあいだ戦えない。 */
var FOES = {
  beast:  { small: ['werewolf','ogre','harpy'],   big: ['troll','yeti','werewolf'] },
  mine:   { small: ['ogre','golem','shaman'],     big: ['golem','troll','ogre'] },
  maze:   { small: ['rogue','assassin','harpy'],  big: ['assassin','valkyrie','rogue'] },
  shrine: { small: ['shieldguard','knight','priest'], big: ['dragon','paladin','knight'] }
};
var SLOTS6 = [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]];
function foeTeam(kind){
  var pool = (FOES[S.dun] || FOES.beast)[kind === 'boss' ? 'big' : 'small'];
  var n = kind === 'boss' ? 4 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 2);
  var out = [];
  for (var i = 0; i < n; i++){
    var id = pool[Math.floor(rnd() * pool.length)];
    if (kind === 'boss' && i === 0) id = pool[0];              /* 主は、その場所の一番大きな個体 */
    out.push({ id: id, row: SLOTS6[i][0], col: SLOTS6[i][1] });
  }
  return out;
}
function partyTeam(){
  return PARTY.map(function(p, i){
    return { id: p.id, row: p.row, col: SLOTS6[i][1], hp: p.hp, gear: gearBonus(p) };
  });
}
/* 戦えるかどうか。全員倒れていたら、そこで終わり */
function anyAlive(){ return PARTY.some(function(p){ return p.hp > 0; }); }

function startBattle(kind, after){
  var cfg = { allies: partyTeam(), foes: foeTeam(kind), tag: kind,
              diff: kind === 'boss' ? 'hard' : 'normal' };
  window.RPGBATTLE_DONE = function(res){
    window.RPGBATTLE_DONE = null;
    /* 生き残りのHPを持ち帰る */
    res.survivors.forEach(function(sv, i){ if (PARTY[i]) PARTY[i].hp = sv.alive ? sv.hp : 0; });
    /* 「蝕む」呪い：戦いのたび、持ち主が削られる */
    PARTY.forEach(function(p){
      if (p.hp > 0 && hasCurse(p, 'drain')){
        p.hp = Math.max(1, p.hp - 2);
        say('── ' + p.n + ' の得物が、持ち主から力を吸っている（-2）', 'bad');
      }
    });
    if (!res.won || !anyAlive()){ wipeOut(); return; }
    /* 拾いものは、戦闘結果の画面で受け取り済み（そこで荷に入っている） */
    after(res);
  };
  var ok = false;
  try { if (parent !== window && parent.RPGBATTLE){ parent.RPGBATTLE(cfg); ok = true; } } catch (e) {}
  if (!ok){
    /* 単体デモ（本編の外）では、これまでどおり文章で決着をつける */
    window.RPGBATTLE_DONE = null;
    var hurt = PARTY.filter(function(p){ return p.hp > 0; });
    if (hurt.length) hurt[Math.floor(rnd() * hurt.length)].hp -= 2;
    say('{短い戦いだった|数を頼みに押し切った|$who が、先に動いた}。', 'em');
    battleSpoils(kind);
    after({ won: true, survivors: [] });
  }
}
/* 戦いのあとの拾いもの。雑魚は運次第、主は必ず何かを遺す */
var BAGCAP = 9;
function gainItem(kind, n){
  n = n || 1;
  var cur = (kind === 'coin') ? (S.loot || 0) : (S.bag[kind] || 0);
  var room = Math.max(0, BAGCAP - cur);
  var got = Math.min(n, room);
  var over = n - got;
  if (kind === 'coin'){ S.loot = (S.loot || 0) + got; }
  else if (got) S.bag[kind] = cur + got;
  return { got: got, over: over };
}
var DROPNAME = { salve: '傷薬', coin: '古い硬貨のひと握り', oil: '使いさしの油' };
function rollDrops(kind){
  var drops = [];
  if (kind === 'boss'){
    drops.push(['salve', 2], ['coin', 2]);
    if (rnd() < 0.45) drops.push(['oil', 1]);
  } else {
    if (rnd() >= 0.45) return [];                 /* 何も遺さないこともある */
    var r = rnd();
    drops.push(r < 0.5 ? ['salve', 1] : r < 0.82 ? ['coin', 1] : ['oil', 1]);
  }
  return drops;
}
/* 拾いものを荷に入れ、何が手に入ったかの一覧を返す */
function takeDrops(kind){
  return rollDrops(kind).map(function(d){
    var res = gainItem(d[0], d[1]);
    return { key: d[0], name: DROPNAME[d[0]], n: res.got, over: res.over,
             have: d[0] === 'coin' ? (S.loot || 0) : (S.bag[d[0]] || 0) };
  });
}
/* 本編から呼ばれる。戦闘結果の画面に「手に入れたもの」として並べてもらう */
window.RPGSPOILS = function(kind){
  try { return takeDrops(kind); } catch (e){ return []; }
};
/* 単体デモ（本編の外）では、これまでどおり文章で伝える */
function battleSpoils(kind){
  var list = takeDrops(kind);
  if (!list.length) return;
  say('{——骸のそばに、布に包まれたものが落ちていた|'
    + '倒れたものの傍らに、持ち物が散っている|'
    + '$who が、こぼれ落ちたものを拾い上げた}。', 'em');
  list.forEach(function(d){
    if (!d.n){ say('── ' + d.name + 'は、もう荷に入らない', 'sys'); return; }
    say('── ' + d.name + (d.n > 1 ? ' ×' + d.n : '') + ' を手に入れた（' + d.have + '）', 'sys');
  });
}

/* ================= 宝箱 =================
   置かれ方は二通り。最奥の間の「主を討った者への報い」と、
   道の行き止まりや関門の先に、依頼とは関わりなく置かれているもの。
   開ければ中身は必ず手に入る。危ういのは開け方のほうで、
   仕掛けを見落とせば傷を負う。そして中身が呪われていることもある。 */
var CHESTRAR = {
  1: { n:'宝箱',     trap:0.25, coin:[1,2], look:'木の箱が、埃をかぶって置かれている' },
  2: { n:'至宝',     trap:0.42, coin:[2,3], look:'鉄の帯で締めた櫃が、壁ぎわに据えられている' },
  3: { n:'古代遺物', trap:0.60, coin:[3,4], look:'見たことのない意匠の匣が、床から生えるように据わっている' }
};
function chestKey(n){
  return (RPGQ ? RPGQ.id : S.dun) + ':' + n.chest.id;
}
function openChest(n, careful){
  var ch = n.chest, CR = CHESTRAR[ch.rar];
  S.chests[chestKey(n)] = 1;
  S.ui.lock = 1; S.ui.sheet = 0; S.ui.forced = false; syncSheet();

  var trapped = rnd() < CR.trap;
  var spotted = false;
  if (careful){
    say('{$who が手を上げ、みなを下がらせた|'
      + '$who が箱の縁を指でなぞり、蓋の合わせ目を確かめる}。'
      + '{埃の積もり方、板の反り、金具の当たり——ひとつずつ見ていく|'
      + '息を詰めて、ゆっくりと調べる}。', 'em');
    if (trapped){
      spotted = rnd() < 0.72;
      say(spotted
        ? '{蓋の裏に、糸が張ってある|針が仕込まれている——蓋を上げれば飛ぶ仕掛けだ|'
          + '底板の下で、何かが押さえつけられている}。'
          + '{$who は、それを丁寧に外した|手を伸ばし、静かに殺した}。'
        : '{何も見つからなかった|外から見るかぎり、仕掛けはない}。', spotted ? 'em' : 'sys');
    } else {
      say('{仕掛けはない。ただの箱だ|見たかぎり、何も仕込まれてはいない}。', 'sys');
    }
    if (rnd() < 0.3 && !S.enc){ S.noise = 1; }        /* 手間取れば、音を呼ぶ */
  }

  setTimeout(function(){
    if (trapped && !spotted) chestTrap(ch.rar);
    setTimeout(function(){
      var it = rollGear(ch.rar);
      S.gear.push(it);
      var c = CHESTRAR[ch.rar].coin;
      var coins = c[0] + Math.floor(rnd() * (c[1] - c[0] + 1));
      gainItem('coin', coins);
      say('{蓋が、重い音を立てて開いた|中を検める|布をほどくと、それが出てきた}。', 'em');
      say('── ' + VAGUE[it.k] + 'を手に入れた（正体は、身につけてみるまで分からない）', 'sys');
      if (coins) say('── 古い硬貨 ×' + coins + '（持ち帰れば ' + (S.loot * 10) + ' 枚）', 'sys');
      if (rnd() < 0.45 && gainItem('salve', 1).got) say('── 傷薬 ×1 も入っていた', 'sys');
      S.ui.lock = 0;
      render();
    }, trapped && !spotted ? 1500 : 500);
  }, careful ? 1200 : 300);
}
/* 罠。小さいものは一人の擦り傷、大きいものは一行をまとめて薙ぐ */
function chestTrap(rar){
  var living = PARTY.filter(function(p){ return p.hp > 0; });
  if (!living.length) return;
  var one = living[Math.floor(rnd() * living.length)];
  var big = rnd() < (rar === 3 ? 0.5 : rar === 2 ? 0.3 : 0.15);
  var dmg;
  if (!big){
    dmg = rar + 2 + Math.floor(rnd() * 3);
    one.hp = Math.max(1, one.hp - dmg);
    S.hurt++;
    say('{蓋を上げた指に、鋭い痛みが走った——針だ|'
      + '合わせ目から、細い針が跳ねた|刃が仕込まれていた}。'
      + one.n + ' が傷を負った（-' + dmg + '）。', 'bad');
  } else {
    dmg = rar + 3 + Math.floor(rnd() * 3);
    living.forEach(function(p){ p.hp = Math.max(1, p.hp - dmg); });
    S.hurt++;
    say('{蓋が跳ね、中の空気が破裂した|'
      + '箱の底が焼け、炎が噴き上がった|'
      + '白い粉が舞い、息が詰まった}。'
      + '一行がまとめて傷を負った（それぞれ -' + dmg + '）。', 'bad');
  }
}

function wipeOut(){
  S.ui.lock = 1; S.ui.sheet = 0; S.ui.forced = false; syncSheet();
  say('——立っている者は、もういない。', 'bad');
  setTimeout(function(){
    say('気がつけば、外の光の下にいた。誰が運んだのかは、分からない。'
      + '荷は軽くなっている。持っていたものは、闇の底に置いてきたらしい。', 'em');
  }, 1800);
  setTimeout(function(){
    try { parent.RPGDONE && parent.RPGDONE({ id: RPGQ ? RPGQ.id : null, cleared: false,
      wiped: true, coin: 0, loot: 0, bag: { salve: 0 }, gear: { eq:{}, bag:[] }, chests: S.chests,
      kills: S.kills, hurt: S.hurt, steps: S.steps }); } catch (e) {}
  }, 3800);
}

/* ================= 依頼：主との対決と脱出 =================
   文字を一度に流さず、間を置いて達成を味わえるようにする */
function bossFight(){
  S.boss = 0;
  S.ui.lock = 1; S.ui.sheet = 0; S.ui.forced = false; syncSheet();
  say('得物が抜かれる。誰も、口をきかなかった。', 'em');
  startBattle('boss', function(){
    S.bossDown = 1; S.kills++;
    say('——終わった。それは、二度と動かなかった。', 'em');
    setTimeout(function(){
      say('── 依頼達成：' + RPGQ.name, 'sys');
    }, 1200);
    setTimeout(function(){
      S.qdone = 1; S.ui.lock = 0;
      say('あとは、来た道を戻るだけだ。生きて、外の光を見る。', 'em');
      render();
    }, 2400);
  });
}
function exitDungeon(){
  S.ui.lock = 1; S.ui.sheet = 0; S.ui.forced = false; syncSheet();
  say('南の口から、外の光が差し込んでいる。', 'em');
  setTimeout(function(){
    say(S.qdone
      ? '外に出ると、風の匂いが変わった。誰かが大きく息を吐き——それから、ようやく誰かが笑った。'
      : '外の光は、まぶしかった。今回は、ここまでだ。', 'em');
  }, 1500);
  setTimeout(function(){
    var leftovers = dungeonItems().length;
    try { parent.RPGDONE && parent.RPGDONE({ id: RPGQ.id, cleared: !!S.qdone,
      coin: (S.qdone ? (RPGQ.coin || 0) : 0) + (S.loot || 0) * 10 + leftovers * 3,
      loot: S.loot || 0, sold: leftovers,
      bag: { salve: S.bag.salve || 0, oil: S.bag.oil || 0 }, gear: gearHome(),
      chests: S.chests, kills: S.kills, hurt: S.hurt, steps: S.steps }); } catch (e) {}
  }, 3400);
}

/* ================= 帳面 =================
   書き留めたことは、必ずどこかで回収される。 */
function makeNote(){
  var gids = Object.keys(S.map.gates).filter(function(g){ return !S.open[g]; });
  var noted = {}; S.book.forEach(function(b){ if (b.gate) noted[b.gate] = 1; });
  var fresh = gids.filter(function(g){ return !noted[g]; });
  if (fresh.length){
    var gid = fresh[Math.floor(rnd() * fresh.length)];
    var k2 = KEYS[S.map.gates[gid].key];
    return { t: tidy(VARI.expand(k2.gist || '……読み取れたのは、断片だけだ。', S.ctx, rnd)), gate: gid };
  }
  var LORE = [
    '奥にいる$lordは、ひとつところから動かない——そう読める',
    'この$placeの最も深いところに、探しものはあるらしい',
    '「引き返した者だけが、生きて語った」と結ばれている',
    '書き手は、$lordを見たまま戻らなかったようだ'
  ];
  return { t: tidy(VARI.expand(LORE[Math.floor(rnd() * LORE.length)], S.ctx, rnd)) + '。', goal: 1 };
}
/* その迷宮の品（鍵・鱗・石板・供物）。外へ出ると失う。使い終えた分は数えない */
function dungeonItems(){
  var out = [];
  Object.keys(S.bag).forEach(function(k){
    var i = k.indexOf(':');
    if (i < 0) return;                       /* 道具（salve など）は別 */
    var gid = k.slice(i + 1);
    if (S.open[gid]) return;                 /* もう開いた扉の鍵は用済み */
    out.push({ kind: k.slice(0, i), gid: gid, mark: S.bag[k] });
  });
  return out;
}
function showExitAsk(){
  var ov = document.getElementById('askov');
  var bd = document.getElementById('askbody');
  var rooms = S.map.nodes.filter(function(x){ return x.kind === 'room'; }).length;
  var been = Object.keys(S.been).filter(function(k){ return S.map.byId[k].kind === 'room'; }).length;
  var rows = [];
  if (RPGQ) rows.push(S.qdone
    ? ['依頼', '達成——' + RPGQ.name + '（報酬 硬貨 ' + RPGQ.coin + ' 枚）', 'ok']
    : ['依頼', 'まだ果たしていない。奥の主は生きている', 'ng']);
  rows.push(['踏破', been + ' / ' + rooms + ' 室', '']);
  rows.push(['討った数', String(S.kills), '']);
  rows.push(['傷', String(S.hurt), '']);
  rows.push(['拾った硬貨', S.loot ? (S.loot + ' 束（' + (S.loot * 10) + ' 枚）') : 'なし', '']);
  if (S.bag.salve) rows.push(['傷薬（持ち帰る）', S.bag.salve + ' つ', 'ok']);
  if (S.bag.oil) rows.push(['使いさしの油（持ち帰る）', S.bag.oil + ' つ', 'ok']);
  var worn = 0;
  PARTY.forEach(function(p2){ ['weapon','armor','t1','t2'].forEach(function(sl){ if (p2.eq[sl]) worn++; }); });
  if (worn || S.gear.length) rows.push(['装備（持ち帰る）',
    (worn ? '身につけている ' + worn + ' 点' : '') + (worn && S.gear.length ? '／' : '') +
    (S.gear.length ? '荷の中 ' + S.gear.length + ' 点' : ''), 'ok']);
  var lost = dungeonItems();
  if (lost.length) rows.push(['置いていく品', lost.length + ' つ——銘の合う扉は、この先にない（売れば ' +
    (lost.length * 3) + ' 枚）', 'ng']);
  bd.innerHTML = '<p class="lead">南の口から、外の光が差している。ここから出られる。</p>'
    + rows.map(function(r){
        return '<p class="askrow"><span>' + r[0] + '</span><b class="' + r[2] + '">' + r[1] + '</b></p>';
      }).join('')
    + '<p class="lead">' + (S.qdone
        ? '外へ出れば、依頼は完了し、報酬を受け取る。'
        : '外へ出れば、今回の探索はここまで。拾ったものは持ち帰れる。')
    + '</p>';
  ov.classList.add('on');
  document.getElementById('ask_yes').textContent = S.qdone ? '外へ出る（依頼を果たす）' : '外へ出る';
  document.getElementById('ask_yes').onclick = function(){ ov.classList.remove('on'); exitDungeon(); };
  document.getElementById('ask_no').onclick = function(){ ov.classList.remove('on'); };
}
function showInfo(){
  var d = DUNGEONS[S ? S.dun : SETUP.dun];
  var bd = document.getElementById('bookbody');
  document.querySelector('#bookov h1').textContent = RPGQ ? '依頼：' + RPGQ.name : d.name;
  bd.innerHTML = '';
  var p1 = document.createElement('p');
  p1.className = 'lead';
  p1.textContent = RPGQ ? RPGQ.lead + '（報酬：硬貨 ' + RPGQ.coin + ' 枚）' : d.sub;
  bd.appendChild(p1);
  var p2 = document.createElement('p');
  p2.textContent = d.open;
  bd.appendChild(p2);
  if (S){
    var p3 = document.createElement('p');
    p3.className = 'lead';
    var rooms3 = S.map.nodes.filter(function(x){ return x.kind === 'room'; }).length;
    var been3 = Object.keys(S.been).filter(function(k){ return S.map.byId[k].kind === 'room'; }).length;
    p3.textContent = '踏破 ' + been3 + '/' + rooms3 + ' 室　討った数 ' + S.kills
      + '　傷 ' + S.hurt + (S.qdone ? '　── 主は討ち果たした。あとは帰るだけだ' : '');
    bd.appendChild(p3);
  }
  document.getElementById('bookov').classList.add('on');
}
function showBook(){
  var ov = document.getElementById('bookov');
  var bd = document.getElementById('bookbody');
  document.querySelector('#bookov h1').textContent = '帳面';
  bd.innerHTML = '';
  if (!S.book.length){
    var p0 = document.createElement('p'); p0.className = 'lead';
    p0.textContent = 'まだ何も書き留めていない。壁画や書きつけを調べると、ここに残る。';
    bd.appendChild(p0);
  }
  S.book.forEach(function(b){
    var p2 = document.createElement('p');
    p2.textContent = '・「' + b.t.replace(/。$/, '') + '」' + (b.used ? '　──回収済み' : '');
    bd.appendChild(p2);
  });
  ov.classList.add('on');
}

/* ================= 特徴を調べる ================= */
function useFeature(n, fid){
  var f = FEATURES[fid];
  var firstFx = true;
  for (var k3 in S.fx){ firstFx = false; break; }
  S.fx[n.id+':'+fid] = 1;
  var fp = n.fpos && n.fpos[fid];
  if (fp){ S.pos = { ox: fp.dx, oy: fp.dy }; reveal(); }
  /* このダンジョンで最初に調べたものでは、けがはしない */
  var cand = f.out;
  if (firstFx){
    var safe = f.out.filter(function(o){ return !(o.eff && o.eff.dmg); });
    if (safe.length) cand = safe;
  }
  var tot = cand.reduce(function(a,o){ return a+o.w; }, 0);
  var roll = rnd()*tot, sel = cand[0];
  for (var i=0;i<cand.length;i++){ roll -= cand[i].w; if (roll <= 0){ sel = cand[i]; break; } }
  /* 行動 → 結果を、ひとつづきの文で */
  say((fp ? fp.w + '側の' : '') + (f.echo || '') + sel.t, 'em');
  var e = sel.eff || {};
  if (e.heal){
    var hurt = PARTY.filter(function(p){return p.hp>0 && p.hp<p.mx;})
      .sort(function(a,b){return (a.hp/a.mx)-(b.hp/b.mx);})[0];
    if (hurt){ hurt.hp = Math.min(hurt.mx, hurt.hp + e.heal * 3);
      say('── ' + hurt.n + ' の傷が少し塞がった', 'sys'); }
  }
  if (e.dmg){
    var v = PARTY.filter(function(p){return p.hp>0;});
    var t2 = v[Math.floor(rnd()*v.length)];
    t2.hp = Math.max(1, t2.hp - e.dmg * 3); S.hurt++;
    say('── ' + t2.n + ' が傷を負った', 'bad');
  }
  if (e.get){
    var giveSalve = function(pre){
      if (!gainItem('salve', 1).got){ say('── ' + pre + '傷薬だった。だが、もう荷に入らない', 'sys'); return; }
      say('── ' + pre + '傷薬だった。荷に加えた（傷薬 ' + S.bag.salve + '）', 'sys');
    };
    var giveCoin = function(pre){
      if (!gainItem('coin', 1).got){ say('── ' + pre + '硬貨だったが、もう持てない', 'sys'); return; }
      say('── ' + pre + '古い硬貨がひと握り。荷の底に収めた（戦利品 ' + S.loot + '）', 'sys');
    };
    if (e.get === 'note'){
      var nb = makeNote();
      S.book.push(nb);
      say('── 帳面に書き留めた：「' + nb.t.replace(/。$/, '') + '」', 'sys');
    }
    else if (e.get === 'food'){ S.bag.food = 1; say('── 保存の効く食料を、荷に加えた', 'sys'); }
    else if (e.get === 'salve') giveSalve('中身は');
    else if (e.get === 'coin') giveCoin('');
    else if (e.get === 'pack'){
      if (rnd() < 0.5) giveSalve('包みを開けた。中身は');
      else giveCoin('包みを開けた。');
    }
  }
  if (e.noise) S.noise = 1;
  if (n.ev && n.ev.t !== 'foe') revealName(n);
  render();
}

/* ================= 種の行動 ================= */
function seedActs(n){
  if (!n.ev || n.ev.t !== 'seed' || S.evDone[n.id]) return [];
  var gid = n.ev.gate, c = S.map.gates[gid].cond, out = [];
  var k2 = KEYS[n.ev.key];
  /* 真名の開示は、行動の結果を語り終えてから */
  var done = function(){ S.evDone[n.id]=1; revealName(n); };
  if (meets(gid)) return [];
  if (c.t === 'favor') out.push({ l: k2.actLabel || '手を貸す', k:'借りを作る', f:function(){
    S.did['favor:'+gid]=1;
    say('{$who が、黙って手を貸した|時間は食った。それだけのことだ|'+
      '$hurt が、自分の水を分けた}。{相手は、何も言わなかった|礼らしい礼は、無かった}。','em');
    done(); } });
  var NOUN = { key:'鍵', scale:'鱗', tablet:'石板', food:'食料' };
  var nn = NOUN[c.item];
  if (c.t === 'carry' || c.t === 'offer') out.push({ l: nn ? nn + 'を、持っていく' : '持っていく', k:'荷が一つ増える', f:function(){
    var mk = markOf(gid);
    S.bag[c.item + ':' + gid] = mk;
    say('{$who が、それを荷に収めた|重いが、置いていく気にはならない|'+
      '使い道は、そのうち分かる}。','em');
    say('── ' + (nn || '品') + 'には、' + mk + 'が入っている。合う扉が、この' +
      tidy(VARI.expand('$place', S.ctx, rnd)) + 'のどこかにある', 'sys');
    done(); } });
  if (c.t === 'mark') out.push({ l: k2.actLabel || '触れる', k:'印 '+((S.marks[c.key]||0)+1)+'/'+c.n, f:function(){
    S.marks[c.key]=(S.marks[c.key]||0)+1;
    say('{指先が温かい|$soundが、遠くで一度鳴った|$traceが、$lightを弾いた}。','em');
    say('── 印 '+S.marks[c.key]+'/'+c.n,'sys');
    if (S.marks[c.key] >= c.n) done(); else revealName(n); } });
  if (c.t === 'lever') out.push({ l: k2.actLabel || '動かす', k:'どこかが変わる', f:function(){
    S.did['lever:'+gid]=1;
    say('{軋みながら、それは動いた|$placeの奥で、重いものが動く音がした|'+
      '$soundとは違う音が、長く尾を引いた}。','em');
    done(); } });
  if (c.t === 'deal') out.push({ l:'話しかける', k:'刃を抜かない', f:function(){
    S.did['deal:'+gid]=1;
    var npc = k2.npcs && n.evNpc != null ? k2.npcs[n.evNpc] : null;
    say(npc ? npc.talk : '{話は、思ったより早くついた|互いに、損のない形に落ち着いた}。','em');
    done(); } });
  return out;
}

/* 記されたものを読む。読んだ結果として、言葉や真名を得る */
function readHint(n){
  var k2 = KEYS[n.ev.key];
  say('{近寄って、灯りを寄せる|膝をついて、指先で埃を払う|$who が身をかがめ、文字をたどる}。——読める。');
  say(k2.hint);
  say('── 覚え書きを写した。' + (k2.gist || ''), 'sys');
  S.book.push({ t: tidy(VARI.expand(k2.gist || '', S.ctx, rnd)), gate: n.ev.gate });
  S.notes[n.ev.key] = 1; S.evDone[n.id] = 1;
  if (k2.cond.t === 'word'){
    S.did['word:'+n.ev.gate] = 1;
    say('── 書かれていた言葉を覚えた。どこかの扉の前で、唱えられる', 'sys');
  }
  revealName(n);
  render();
}

function encounter(){
  say('{$soundに混じって|灯りの輪の外れの暗がりで|前方の闇で}、'+
      '{何かが動いた|こちらを凝視する何かが、身じろぎした|'+
      '気配がひとつ、ゆっくりと立ち上がった}。{正体は、光の届く前に分かるだろう|'+
      '人か、そうでないか——まだ分からない|$who が、得物に手を掛けた}。');
  S.enc = {}; render();
}

/* ================= 描画 ================= */
function render(){
  drawMap();
  var n = S.map.byId[S.at];
  document.getElementById('dunname').textContent = DUNGEONS[S.dun].name;
  document.getElementById('spot').textContent = S.pre ? '入口の前' : labelOf(n);
  document.getElementById('bookx').onclick = function(){ document.getElementById('bookov').classList.remove('on'); };
  document.getElementById('party').innerHTML = PARTY.map(function(p){
    var pct = Math.max(0, Math.round(p.hp / p.mx * 100));
    var cl = pct <= 30 ? ' class="low"' : pct <= 60 ? ' class="mid"' : '';
    return '<div class="pm'+(p.row?' back':'')+'">'
      + '<span class="n">'+p.n+'</span>'
      + '<span class="h"><b'+cl+'>'+p.hp+'</b>/'+p.mx+'</span></div>';
  }).join('');

  var notable = 0;
  S.ui.acts = []; S.ui.skills = [];
  var mkbtn = function(label, key, cls, fn){
    var b = document.createElement('button');
    b.className = 'btn ' + (cls || '');
    b.innerHTML = label + (key ? '<span class="k">' + key + '</span>' : '');
    b.onclick = function(){ S.ui.sheet = 0; fn(); };
    return b;
  };
  var add = function(label, key, cls, fn){
    if (cls === 'act') notable++;
    S.ui.acts.push(mkbtn(label, key, cls, fn));
  };
  var addSkill = function(label, key, cls, fn){
    S.ui.skills.push(mkbtn(label, key, cls, fn));
  };

  var forced = false;
  if (RPGQ && S.boss && !S.bossDown){
    forced = true;
    add('討ちかかる', '退路はない', 'act', bossFight);
  } else if (S.enc){
    forced = true;
    var gid0 = S.enc.gate;
    add('斬りかかる', gid0 ? '倒せば、道が変わる' : '倒せば、不殺の条件は消える', 'act', function(){
      var room0 = S.enc.room;
      S.enc = 0;
      S.ui.lock = 1; S.ui.sheet = 0; S.ui.forced = false; syncSheet();
      startBattle('mob', function(){
        S.kills++; if (gid0) S.did['slay:'+gid0] = 1;
        if (room0){ S.evDone[room0]=1; revealName(S.map.byId[room0]); }
        S.ui.lock = 0;
        say('── 倒した数 '+S.kills, 'sys');
        render();
      }); });
    add('やり過ごす', '刃を抜かない', 'act', function(){
      S.enc = 0;
      if (rnd()<0.4){ S.hurt++; say('{擦れ違いざま、$hurt が浅く裂かれた|通り抜けたが、無傷とはいかない}。','bad'); }
      else say('{息を殺して、やり過ごした|向こうは、こちらに関心を示さなかった}。','em');
      render(); });
  } else if (S.pre){
    /* 入口の前だけは、最下段の一列に大きく */
  } else {

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
    add((fp ? fp.w + '側の' : '') + FEATURES[fid].act, '', 'act', function(){ useFeature(n, fid); });
  });

  /* 宝箱。開ければ必ず中身は手に入る。危ないのは、開け方のほう */
  if (n.chest && !S.chests[chestKey(n)]){
    var CR = CHESTRAR[n.chest.rar];
    add(CR.n + 'を、そのまま開ける', '早いが、仕掛けは分からないまま', 'act',
      function(){ openChest(n, false); });
    add(CR.n + 'を、まず調べる', '罠を探す。手間はかかる', 'act',
      function(){ openChest(n, true); });
  }

  if (S.noise) add('物音のする方をうかがう', '遭遇するかもしれない', 'act', function(){ S.noise = 0; encounter(); });

  addSkill((S.torch ? '松明を伏せる' : '松明を掲げる'), (S.torch ? '光の輪 大 → 小' : '光の輪 小 → 大'), 'act', function(){
    S.torch = !S.torch;
    say(S.torch ? '{松明に火を移した|$lightが、闇を押し戻す}。' : '{火を伏せた|$lightは、足元だけになった}。','sys');
    reveal(); render(); });
  if (!S.spellUsed) addSkill('魔法使いのトーチ', '一度だけ・光の精霊が2部屋先まで形を探る（6歩つづく）', 'act', function(){
    S.spellLeft = 6; S.spellUsed = 1;
    say('{魔法使いが短く唱えると、青白い小さな光が指先から離れた|'+
        '詠唱の終わりに、ちいさな光がふわりと浮いた}。'+
        '{光は先へ飛び、壁をなぞって、部屋の形だけを知らせてくる|'+
        '灯りではない。だが、あれが触れた場所の輪郭が、頭に浮かぶ}。','em');
    reveal(); render(); });
  else if (S.spellLeft > 0) addSkill('（精霊の光）', 'あと ' + S.spellLeft + ' 歩', '', function(){});

  /* ── 荷 ── */
  var hurtOne = PARTY.filter(function(p){ return p.hp > 0 && p.hp < p.mx; })
    .sort(function(a,b){ return (a.hp/a.mx) - (b.hp/b.mx); })[0];
  if (S.bag.salve > 0) addSkill('傷薬をつかう　×' + S.bag.salve,
    hurtOne ? hurtOne.n + ' の傷が塞がる' : '傷を負った者がいない', hurtOne ? 'act' : '', function(){
      if (!hurtOne){ say('── いまは、使うまでもない', 'sys'); render(); return; }
      S.bag.salve--;
      var amt = hasCurse(hurtOne, 'greed') ? 4 : 8;      /* 「貪る」呪いは効きを半分にする */
      hurtOne.hp = Math.min(hurtOne.mx, hurtOne.hp + amt);
      say('{布を裂いて、傷に当てる|$who が、手早く手当てをした}。'
        + hurtOne.n + ' の傷が塞がった'
        + (amt < 8 ? '——が、思ったほど効かない。呪いのせいだ' : '') + '。', 'em');
      say('── 傷薬 のこり ' + S.bag.salve, 'sys');
      render(); });
  if (S.bag.oil > 0) addSkill('使いさしの油　×' + S.bag.oil,
    S.spellUsed ? '魔法使いのトーチを、もう一度' : 'いまは、まだ要らない',
    S.spellUsed ? 'act' : '', function(){
      if (!S.spellUsed){ say('── トーチはまだ使っていない。油の出番ではない', 'sys'); render(); return; }
      S.bag.oil--;
      S.spellUsed = 0;
      say('{魔法使いが、瓶の底に残った油を杖の先へ落とした|'
        + '油の匂いが、ひととき闇を押しのけた}。'
        + '{もう一度、あの光を呼べる|精霊は、また応えてくれるだろう}。', 'em');
      say('── 使いさしの油 のこり ' + S.bag.oil, 'sys');
      render(); });
  var INAME = { key:'錆びた鍵', scale:'厚い鱗', tablet:'石板', food:'保存の効く食料' };
  var dItems = dungeonItems();
  dItems.forEach(function(it){
    addSkill(INAME[it.kind] || '品', '銘：' + it.mark + '／この' +
      tidy(VARI.expand('$place', S.ctx, rnd)) + 'を出ると失う', '', function(){
      say('── ' + (INAME[it.kind] || '品') + 'は、' + it.mark + 'の扉の前で自然と出番が来る', 'sys');
      render(); });
  });
  if (S.loot) addSkill('拾った硬貨　×' + S.loot, '持ち帰れば ' + (S.loot * 10) + ' 枚', '', function(){});
  var unworn = S.gear.length;
  addSkill('一行の装い' + (unworn ? '　（手つかず ' + unworn + '）' : ''),
    unworn ? '拾った品を、誰かに持たせる' : '身につけているものを、あらためる',
    unworn ? 'act' : '', function(){ S.ui.sheet = 'gear'; S.ui.gearAt = null; syncSheet(); });
  if (!S.bag.salve && !S.bag.oil && !S.loot && !dItems.length && !unworn)
    addSkill('（荷は、軽いままだ）', '', '', function(){});

  }

  /* ステータス行（シートの底） */
  var st2 = document.createElement('div');
  st2.className = 'statline';
  st2.id = 'statline';
  var rooms2 = S.map.nodes.filter(function(x){ return x.kind === 'room'; }).length;
  var been2 = Object.keys(S.been).filter(function(k){ return S.map.byId[k].kind === 'room'; }).length;
  st2.innerHTML = '<span>踏破 ' + been2 + '/' + rooms2 + '</span>'
    + '<span>討 ' + S.kills + '</span><span>傷 ' + S.hurt + '</span>'
    + '<span class="' + (S.torch ? 'on' : '') + '">' + (S.torch ? '松明 ON' : '松明 OFF') + '</span>'
    + '<button id="bok2">帳面 ' + S.book.length + '</button>';
  S.ui.acts.push(st2);

  /* 十字キー：矢印の色で行き先の状態を伝える（金＝未踏／薄い＝来た道／赤＝閉ざされた） */
  var dirId = { '北':'pd_n', '南':'pd_s', '西':'pd_w', '東':'pd_e' };
  var pads = { pd_n:null, pd_s:null, pd_w:null, pd_e:null };
  if (!forced && !S.pre && !S.ui.lock)
    exitsOf(n).forEach(function(e){ pads[dirId[e.dir]] = e; });
  Object.keys(pads).forEach(function(id){
    var b = document.getElementById(id), e = pads[id];
    var cls = 'off';
    if (e){
      var shut = e.via && e.via.gate && !S.open[e.via.gate];
      cls = (shut && S.been[e.via.id]) ? 'shut' : 'unex';   /* 動けるなら一律で点灯 */
    }
    b.setAttribute('class', 'pd ' + cls);
    b.onclick = e ? (function(e2){ return function(){ enter(e2.via ? e2.via.id : e2.far.id); }; })(e) : null;
    b.style.display = '';
  });
  /* 入口の部屋の南は「外」。押すと、出るかどうかを尋ねる */
  if (!forced && !S.pre && !S.ui.lock && n.entrance && n.kind === 'room' && !pads.pd_s){
    var sb = document.getElementById('pd_s');
    sb.setAttribute('class', 'pd out');
    sb.onclick = showExitAsk;
  }

  var pc2 = document.getElementById('pd_c');
  pc2.setAttribute('class', 'pd c' + (notable && !forced ? ' has' : ''));
  pc2.onclick = function(){ S.ui.sheet = (S.ui.sheet === 'act') ? 0 : 'act'; syncSheet(); };
  var pk = document.getElementById('pd_k');
  var skillOK = S.ui.skills.length && !forced && !S.ui.lock;
  pk.setAttribute('class', 'pd k' + (skillOK ? ' has' : ' off'));
  pk.onclick = skillOK ? function(){ S.ui.sheet = (S.ui.sheet === 'skill') ? 0 : 'skill'; syncSheet(); } : null;
  document.getElementById('sheetx').onclick = function(){ S.ui.sheet = 0; syncSheet(); };

  /* 入口の前：地図の代わりに情景画を出し、その上に「入る」を重ねる。
     絵が手に入らないとき（単体デモ）は、これまでどおり最下段の一列で出す */
  var art = S.pre ? entryArt() : '';
  var ea = document.getElementById('entryart');
  var eb = document.getElementById('entrybar');
  var goIn = function(){ S.pre = 0; enter(S.map.start); };
  var goBack = function(){
    if (RPGQ){ try { parent.RPGDONE && parent.RPGDONE({ id: RPGQ.id, cleared: false }); } catch (e) {} return; }
    document.getElementById('setup').style.display='flex'; };
  ea.classList.toggle('on', !!(S.pre && art));
  eb.classList.toggle('on', !!(S.pre && !art));
  if (S.pre){
    var host = art ? document.getElementById('ea_btns') : eb;
    if (art) ea.style.backgroundImage = 'url(' + art + ')';
    host.innerHTML = '';
    var mk2 = function(label, cls, fn){
      var b = document.createElement('button');
      if (cls) b.className = cls;
      b.textContent = label; b.onclick = fn; host.appendChild(b);
    };
    mk2(RPGQ ? '戻る' : '選び直す', '', goBack);
    mk2('入 る', 'main', goIn);
    mk2('装備を整える', '', function(){
      say('（装備は Phase 2 で。いまは身ひとつでもぐる）', 'sys'); });
  }
  document.getElementById('pad').style.display = S.pre ? 'none' : '';
  var mzf = document.getElementById('mz_full');
  if (mzf) mzf.style.display = (S.pre && art) ? 'none' : '';

  S.ui.forced = forced;
  syncSheet();
  if (window.syncMore) setTimeout(syncMore, 30);
}

/* シートの開閉と、強制場面（遭遇・対峙・入口の前）の扱い */
function syncSheet(){
  var mode = S.pre ? 0 : (S.ui.forced ? 'act' : S.ui.sheet);
  var sh = document.getElementById('sheet');
  var body2 = document.getElementById('sheetbody');
  body2.innerHTML = '';
  if (mode === 'gear') gearSheet(body2);
  else if (mode){
    (mode === 'skill' ? S.ui.skills : S.ui.acts).forEach(function(el){ body2.appendChild(el); });
    var bk2 = document.getElementById('bok2');
    if (bk2) bk2.onclick = showBook;
  }
  sh.classList.toggle('on', !!mode && !S.ui.lock);
  document.getElementById('sheetx').style.display = S.ui.forced ? 'none' : '';
  document.getElementById('sheettl').textContent =
    S.ui.forced ? (S.enc ? '——どうする' : '決断のとき')
    : mode === 'gear' ? '一行の装い'
    : mode === 'skill' ? '灯りと術' : '行動';
  document.getElementById('pad').classList.toggle('lockpad', !!S.ui.forced || !!S.ui.lock);
}

/* 街から持ち込んだ装備を、前回のまま身につけ直す */
function restoreGear(){
  PARTY.forEach(function(p){ p.eq = {}; });
  var g = RPGQ && RPGQ.gear;
  if (!g) return;
  (g.bag || []).forEach(function(it){ S.gear.push(it); if (it.u) _gid = Math.max(_gid, 1 + (+String(it.u).slice(1) || 0)); });
  PARTY.forEach(function(p){
    var e = (g.eq || {})[p.id];
    if (!e) return;
    ['weapon','armor','t1','t2'].forEach(function(sl){ if (e[sl]) p.eq[sl] = e[sl]; });
  });
}
/* 持ち帰る装備。呪われた品も、そのまま街へ運ばれる */
function gearHome(){
  var eq = {};
  PARTY.forEach(function(p){
    var e = {};
    ['weapon','armor','t1','t2'].forEach(function(sl){ if (p.eq[sl]) e[sl] = p.eq[sl]; });
    if (Object.keys(e).length) eq[p.id] = e;
  });
  return { eq: eq, bag: S.gear.slice(0, 12) };
}

/* ================= 装いのシート =================
   一覧 → 一人を選ぶ → その者の4枠と、持たせられる品。
   身につけた瞬間に正体が分かる。呪われていれば、その探索のあいだ外せない。 */
function gearSheet(box){
  var mk = function(label, key, cls, fn){
    var b = document.createElement('button');
    b.className = 'btn ' + (cls || '');
    b.innerHTML = label + (key ? '<span class="k">' + key + '</span>' : '');
    b.onclick = fn;
    return b;
  };
  var at = S.ui.gearAt;
  if (at == null){
    PARTY.forEach(function(p, i){
      var b = gearBonus(p);
      var worn = ['weapon','armor','t1','t2'].filter(function(sl){ return p.eq[sl]; }).length;
      var sum = [];
      if (b.atk) sum.push('攻撃 ' + (b.atk > 0 ? '+' : '') + b.atk);
      if (b.hp)  sum.push('HP ' + (b.hp > 0 ? '+' : '') + b.hp);
      if (b.spd) sum.push('素早さ ' + (b.spd > 0 ? '+' : '') + b.spd);
      box.appendChild(mk(p.n + '　<i style="font-style:normal;opacity:.6">' + worn + '/4</i>',
        sum.length ? sum.join('／') : '身ひとつ', worn ? 'act' : '',
        function(){ S.ui.gearAt = i; syncSheet(); }));
    });
    if (S.gear.length){
      var head = document.createElement('div');
      head.className = 'statline';
      head.innerHTML = '<span>まだ誰も身につけていない品　' + S.gear.length + '</span>';
      box.appendChild(head);
      S.gear.forEach(function(it){
        box.appendChild(mk('　' + gearName(it), gearLine(it) + '　［' + SLOTNAME[it.k === 'trinket' ? 't1' : it.k] + '］', '', function(){}));
      });
    }
    return;
  }
  var p = PARTY[at];
  box.appendChild(mk('← 一行へ戻る', '', '', function(){ S.ui.gearAt = null; syncSheet(); }));
  ['weapon','armor','t1','t2'].forEach(function(sl){
    var it = p.eq[sl];
    if (it){
      var locked = it.idd && it.curse;
      box.appendChild(mk(SLOTNAME[sl] + '：' + gearName(it),
        gearLine(it) + (locked ? '　／外せない' : '　／外す'), locked ? '' : 'act',
        function(){
          if (locked){
            say('── ' + p.n + 'の手から、' + gearName(it) + 'は離れない。呪われている', 'bad');
            render(); return;
          }
          p.eq[sl] = null; S.gear.push(it); applyGear(p);
          say('── ' + p.n + ' が ' + gearName(it) + ' を外した', 'sys');
          render();
        }));
    } else {
      box.appendChild(mk(SLOTNAME[sl] + '：——', '空いている', '', function(){}));
    }
  });
  var fits = S.gear.filter(function(it){
    return it.k === 'trinket' ? (!p.eq.t1 || !p.eq.t2) : !p.eq[it.k];
  });
  var head2 = document.createElement('div');
  head2.className = 'statline';
  head2.innerHTML = '<span>' + (fits.length ? p.n + ' に持たせる' : '持たせられる品がない') + '</span>';
  box.appendChild(head2);
  fits.forEach(function(it){
    box.appendChild(mk('　' + gearName(it), gearLine(it), 'act', function(){ equipTo(p, it); }));
  });
}
function equipTo(p, it){
  var sl = it.k === 'trinket' ? (p.eq.t1 ? 't2' : 't1') : it.k;
  var i = S.gear.indexOf(it);
  if (i >= 0) S.gear.splice(i, 1);
  p.eq[sl] = it;
  var first = !it.idd;
  it.idd = 1;
  applyGear(p);
  if (first){
    say('{' + p.n + ' が、それを手に取った|' + p.n + ' が身につける}。'
      + '{手になじむのが分かる|重さで、正体が知れた|布をほどくと、正体が現れた}。', 'em');
    say('── ' + gearName(it) + '（' + gearLine(it) + '）', it.curse ? 'bad' : 'sys');
    if (it.curse)
      say('{持ち主の手から離れない——呪われている|'
        + '外そうとしたが、外れない。呪いだ}。街の者に頼るほかない。', 'bad');
  } else {
    say('── ' + p.n + ' が ' + gearName(it) + ' を身につけた', 'sys');
  }
  render();
}

/* ================= 入口の前 ================= */
/* 情景画は本編アプリが持っている。単体デモでは手に入らない */
var ARTCACHE = {};
function entryArt(){
  var k = S.dun;
  if (ARTCACHE[k] !== undefined) return ARTCACHE[k];
  var url = '';
  try { if (parent !== window && parent.RPGART) url = parent.RPGART(k) || ''; } catch (e) {}
  ARTCACHE[k] = url;
  return url;
}
function preEntry(){
  document.getElementById('narr').innerHTML='';
  var d = DUNGEONS[S.dun];
  caption(d.name + ' ── 入口の前');
  say(d.open);
  say('{口を開けた闇の前に、一行は立った|入口の前で、誰からともなく足が止まった|'
    + '$smellが、中から流れてくる}。'
    + '{ここから先は、$lightだけが頼りになる|引き返すなら、いまのうちだ}。');
  S.pre = 1; S.ui.sheet = 0;
  render();
  narrBox().scrollTop = 0;
}

/* ================= 開始 ================= */
/* クエストモード：本編アプリの iframe から window.name 経由で依頼を受け取る */
var RPGQ = null;
try {
  var _wn = JSON.parse(window.name || 'null');
  if (_wn && _wn.rpgq) RPGQ = _wn;
} catch (e) {}

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
  /* iframe の中からより、親ページごと全画面にするほうが確実に効く */
  try { if (parent !== window && parent.RPGFULL){ parent.RPGFULL(); return; } } catch (e) {}
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
  if (RPGQ && RPGQ.seed != null) g.seed = RPGQ.seed;   /* 依頼ごとに地形は同じ */
  var map = generate(g);
  verify(map);
  var carry = {};
  if (RPGQ && RPGQ.bag){                                   /* 街から持ち込んだ道具 */
    if (RPGQ.bag.salve) carry.salve = RPGQ.bag.salve;
    if (RPGQ.bag.oil) carry.oil = RPGQ.bag.oil;
  }
  S = { map:map, dun:SETUP.dun, at:map.start, been:{}, seen:{}, open:{}, bag:carry, marks:{},
        did:{}, notes:{}, book:[], fx:{}, evDone:{}, litCells:{}, cellIdx:null, sensed:{},
        chests:(RPGQ && RPGQ.chests) || {}, gear:[],
        kills:0, hurt:0, steps:0, torch:false, spellLeft:0, spellUsed:0, enc:0, noise:0,
        cam:{ z:1, panx:0, pany:0, fit:false },
        ui:{ sheet:0, forced:false, lock:0, acts:[], skills:[], gearAt:null }, pre:0,
        ctx:ctxOf(SETUP.dun) };
  syncPartyStats();
  restoreGear();
  PARTY.forEach(function(p){ applyGear(p); p.hp = p.mx; });
  document.getElementById('setup').style.display='none';
  document.getElementById('dunname').textContent = DUNGEONS[SETUP.dun].name;
  document.getElementById('spot').textContent = '入口の前';

  S.seen[map.start] = 1;
  preEntry();
}
function relayout(){ document.body.classList.toggle('land', innerWidth > innerHeight * 1.15); }
addEventListener('resize', relayout);

document.addEventListener('DOMContentLoaded', function(){
  relayout();
  if (RPGQ){
    SETUP.dun = RPGQ.dun || SETUP.dun;
    SETUP.rooms = RPGQ.rooms || SETUP.rooms;
    var qcard = document.querySelector('#setup .card');
    qcard.querySelector('h1').textContent = '依頼：' + RPGQ.name;
    qcard.querySelector('.lead').textContent = RPGQ.lead + '（報酬：硬貨 ' + RPGQ.coin + ' 枚）';
    [].forEach.call(qcard.querySelectorAll('h2'), function(h){ h.style.display = 'none'; });
    [].forEach.call(qcard.querySelectorAll('.dsub'), function(d){ d.style.display = 'none'; });
    ['dopts','ropts','vwrap'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    document.getElementById('go').textContent = '依頼を受けて、出立する';
  }
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
  camInit();
  /* 全画面が解けても、次のタップで静かに取り直す（対応していない端末では何もしない） */
  document.addEventListener('click', function(){
    if (S && !document.fullscreenElement) goFullscreen();
  }, true);
  /* 文章の続きがあることを知らせる（下端のぼかし＋「続きがある」） */
  var nEl = document.getElementById('narr'), fEl = document.getElementById('nfade'),
      mEl = document.getElementById('nmore');
  window.syncMore = function(){
    var more = nEl.scrollHeight - nEl.scrollTop - nEl.clientHeight > 12;
    fEl.classList.toggle('on', more);
    mEl.classList.toggle('on', more);
  };
  nEl.addEventListener('scroll', syncMore, { passive: true });
  mEl.onclick = function(){ nEl.scrollTo({ top: nEl.scrollHeight, behavior: 'smooth' }); };
  addEventListener('resize', function(){ setTimeout(syncMore, 60); });

  /* 地図の全画面：見るためだけの構え。全図が入る縮尺まで引き、操作盤は伏せる。
     もう一度押すと、説明文つきの画面と、いつもの縮尺に戻る */
  document.getElementById('mz_full').onclick = function(){
    var on = !document.body.classList.contains('mapbig');
    document.body.classList.toggle('mapbig', on);
    if (S && S.cam){
      if (on){
        if (!S.cam.fit) S.cam.zBack = S.cam.z;       /* いつもの縮尺を覚えておく */
        S.cam.fit = true;
      } else {
        S.cam.fit = false;
        if (S.cam.zBack) S.cam.z = S.cam.zBack;
      }
      S.cam.panx = 0; S.cam.pany = 0;
    }
    if (on && S){ S.ui.sheet = 0; syncSheet(); }
    try { if (on && parent !== window && parent.RPGFULL) parent.RPGFULL(); } catch (e) {}
    setTimeout(function(){ if (S) camApply(); }, 30);
  };
  document.getElementById('tb_info').onclick = showInfo;
  document.getElementById('mapx').onclick = function(){
    if (RPGQ){
      if (confirm('依頼を中断して街へ戻りますか？（報酬・拾いものはありません）')){
        try { parent.RPGDONE && parent.RPGDONE({ id: RPGQ.id, cleared: false }); } catch (e) {}
      }
    } else if (S){
      if (confirm('ダンジョン選択へ戻りますか？')) document.getElementById('setup').style.display = 'flex';
    }
  };
  document.getElementById('go').onclick=begin;
});
`;

const BODY = `
<div class="wrap">
  <div class="topbar">
    <b id="dunname">—</b>
    <span class="spot" id="spot"></span>
    <span class="sp"></span>
    <button class="tb" id="tb_info">📜 依頼</button>
    <button class="tb" id="mapx">✕ 中断</button>
  </div>
  <div class="side">
    <div class="narr" id="narr"></div>
    <div class="fade" id="nfade"></div>
    <button class="more" id="nmore"><span class="mchev">▼</span> 続きがある</button>
  </div>
  <div class="mapwrap" id="mapwrap">
    <div id="mapsvg"></div>
    <div class="entryart" id="entryart"><div class="ea_btns" id="ea_btns"></div></div>
    <button class="mapbig mapui" id="mz_full" title="地図を大きく">⛶</button>
    <div class="pad" id="pad">
      <svg viewBox="20 20 154 154" aria-label="操作盤">
        <defs><linearGradient id="brs" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#7a6334"/><stop offset="0.5" stop-color="#4a3a1a"/><stop offset="1" stop-color="#2a2110"/></linearGradient></defs>
        <g id="pd_n" class="pd"><path class="plate" d="M70 64 V44 H77 V33 L86 23 H104 L113 33 V44 H120 V64 L112 64 L104 66 L95 76 L86 66 L78 64 Z"/><path class="ar" d="M83.5 57 L95 43 L106.5 57 L101 61 L95 53.5 L89 61 Z"/></g>
        <g id="pd_e" class="pd" transform="rotate(90 95 95)"><path class="plate" d="M70 64 V44 H77 V33 L86 23 H104 L113 33 V44 H120 V64 L112 64 L104 66 L95 76 L86 66 L78 64 Z"/><path class="ar" d="M83.5 57 L95 43 L106.5 57 L101 61 L95 53.5 L89 61 Z"/></g>
        <g id="pd_s" class="pd" transform="rotate(180 95 95)"><path class="plate" d="M70 64 V44 H77 V33 L86 23 H104 L113 33 V44 H120 V64 L112 64 L104 66 L95 76 L86 66 L78 64 Z"/><path class="ar" d="M83.5 57 L95 43 L106.5 57 L101 61 L95 53.5 L89 61 Z"/></g>
        <g id="pd_w" class="pd" transform="rotate(270 95 95)"><path class="plate" d="M70 64 V44 H77 V33 L86 23 H104 L113 33 V44 H120 V64 L112 64 L104 66 L95 76 L86 66 L78 64 Z"/><path class="ar" d="M83.5 57 L95 43 L106.5 57 L101 61 L95 53.5 L89 61 Z"/></g>
        <g id="pd_c" class="pd c">
          <path class="plate" d="M95 68 L112 75 L122 95 L112 115 L95 122 L78 115 L68 95 L78 75 Z"/>
          <g class="gt"><path d="M95 70v-7M95 120v7M70 95h-7M120 95h7M78 78l-5-5M112 112l5 5M112 78l5-5M78 112l-5 5"/></g>
          <circle class="gr" cx="95" cy="95" r="16" fill="none"/>
          <circle class="gr2" cx="95" cy="95" r="6.5"/>
        </g>
        <g id="pd_k" class="pd k" transform="translate(143,47) scale(0.86)">
          <path class="plate" d="M0 -26 L18 -18 L26 0 L18 18 L0 26 L-18 18 L-26 0 L-18 -18 Z"/>
          <path class="fl" d="M0 -13c5.5 6.5 8.5 10.5 8.5 15.5 0 5.2-3.8 9.2-8.5 9.2s-8.5-4-8.5-9.2c0-5 3-9 8.5-15.5z"/>
        </g>
      </svg>
    </div>
    <div class="sheet" id="sheet">
      <div class="sheethead"><span id="sheettl">行動</span><button id="sheetx">✕</button></div>
      <div id="sheetbody"></div>
    </div>
  </div>
  <div class="entrybar" id="entrybar"></div>
  <div class="party" id="party"></div>
</div>

<div class="setup bookov" id="askov"><div class="card">
  <h1>ダンジョンから出ますか？</h1>
  <div id="askbody"></div>
  <p class="askbtns"><button class="opt" id="ask_no">まだ戻らない</button>
    <button class="start" id="ask_yes" style="margin:0;width:auto;flex:1">外へ出る</button></p>
</div></div>

<div class="setup bookov" id="bookov"><div class="card">
  <h1>帳面</h1>
  <div id="bookbody"></div>
  <p style="margin:14px 0 0"><button class="opt" id="bookx">とじる</button></p>
</div></div>

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
