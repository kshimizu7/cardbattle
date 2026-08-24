/* Phase 1 の探索画面を1枚のHTMLに焼く。
   node tools/rpgexp.js  →  rpgexp.html ＋ docs/rpgexp.html（本文のみ）
   ・部屋と通路の単位で歩く
   ・灯りの届く範囲だけ形が見える。中身は入るまで分からない
   ・関門は、ヒントを読み、種を拾い、条件を満たすと開く
   ・語りと選択肢は VARI で毎回組み立てる                              */

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
  font-size:14px;line-height:1.7;-webkit-text-size-adjust:100%;overflow:hidden}
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
.mapwrap svg{width:100%;max-width:min(100%,38svh);height:auto;display:block;
  background:#05070c;border:1px solid var(--line);border-radius:10px}
.side{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:8px 10px 0}
.narr{flex:1 1 0;overflow-y:auto;min-height:60px;padding:10px 12px;
  background:var(--panel);border:1px solid var(--line);border-radius:10px;
  -webkit-overflow-scrolling:touch}
.narr p{margin:0 0 10px}
.narr p:last-child{margin-bottom:0}
.narr .em{color:var(--gold)}
.narr .sys{color:var(--mid);font-size:12.5px}
.narr .bad{color:var(--ng);font-size:12.5px}
.choices{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;gap:6px;padding:8px 0 0;
  max-height:min(252px,46svh);overflow-y:auto;-webkit-overflow-scrolling:touch}
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
body.land .mapwrap{flex:0 0 44%;padding:8px 0 8px 10px;align-items:flex-start}
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
/* 差し込んだ語の前後に半角の隙間が残ると「狩人 が、」になる。ここで潰す。 */
function tidy(s){
  return s.replace(/([^\x00-\x7F]) +/g, '$1').replace(/ +([^\x00-\x7F])/g, '$1')
          .replace(/。+/g, '。').replace(/、。/g, '。');
}
function say(t, cls){
  var box = document.getElementById('narr');
  var p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = tidy(VARI.expand(t, S.ctx, rnd));
  box.appendChild(p);
  while (box.children.length > 40) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

/* ================= 灯り ================= */
function lightHops(){ return S.spell ? 6 : S.torch ? 4 : 2; }   /* 部屋1つ＝2ホップ */
function reveal(){
  var lim = lightHops(), q = [[S.at,0]], vis = {}; vis[S.at]=1;
  while (q.length){
    var it = q.shift(), n = S.map.byId[it[0]], d = it[1];
    S.seen[n.id] = 1;
    if (d >= lim) continue;
    if (n.kind === 'corridor' && n.gate && !S.open[n.gate]) continue;  /* 閉じた扉の先は照らせない */
    for (var i=0;i<n.links.length;i++){
      var l = n.links[i];
      if (!vis[l]) { vis[l]=1; q.push([l, d+1]); }
    }
  }
}

/* ================= 地図の絵 ================= */
function drawMap(){
  var U=100, ns=S.map.nodes, xs=[], ys=[];
  ns.forEach(function(n){ if (S.seen[n.id]) { xs.push(n.gx); ys.push(n.gy); } });
  if (!xs.length) { xs=[S.map.byId[S.at].gx]; ys=[S.map.byId[S.at].gy]; }
  /* 見えた範囲に合わせる。ただし一度広がった枠は縮めない（地図が跳ねると読みにくい） */
  var f = S.frame || (S.frame = { x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity });
  f.x0=Math.min(f.x0, Math.min.apply(null,xs)); f.x1=Math.max(f.x1, Math.max.apply(null,xs));
  f.y0=Math.min(f.y0, Math.min.apply(null,ys)); f.y1=Math.max(f.y1, Math.max.apply(null,ys));
  var side = Math.max(f.x1-f.x0, f.y1-f.y0) + 1.8;
  var x0 = (f.x0+f.x1)/2 - side/2, y0 = (f.y0+f.y1)/2 - side/2;
  var w = side*U, h = side*U;
  var s='<svg viewBox="0 0 '+Math.round(w)+' '+Math.round(h)+'" role="img" aria-label="ダンジョンの地図">';
  var cxOf=function(n){ return (n.gx-x0)*U; }, cyOf=function(n){ return (n.gy-y0)*U; };

  ns.forEach(function(n){
    if (n.kind!=='corridor' || !S.seen[n.id]) return;
    var A=S.map.byId[n.from], B=S.map.byId[n.to];
    var horiz = A.gy===B.gy, ax=cxOf(A), ay=cyOf(A), bx=cxOf(B), by=cyOf(B);
    var t=26, x=Math.min(ax,bx)-(horiz?0:t/2), y=Math.min(ay,by)-(horiz?t/2:0);
    var ww=horiz?Math.abs(bx-ax):t, hh=horiz?t:Math.abs(by-ay);
    var shut = n.gate && !S.open[n.gate];
    s+='<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" rx="4" fill="'+
       (S.been[n.id]?'#1b2438':'#131a29')+'" stroke="'+(shut?'#8a4a4a':'#2b3752')+'" stroke-width="3"/>';
    if (shut){
      var mx=(ax+bx)/2, my=(ay+by)/2;
      s+= horiz
        ? '<rect x="'+(mx-5)+'" y="'+(my-22)+'" width="10" height="44" rx="3" fill="#c96a6a"/>'
        : '<rect x="'+(mx-22)+'" y="'+(my-5)+'" width="44" height="10" rx="3" fill="#c96a6a"/>';
    }
  });

  ns.forEach(function(n){
    if (n.kind!=='room' || !S.seen[n.id]) return;
    var cx=cxOf(n), cy=cyOf(n), sz=n.entrance||n.goal?78:70;
    var here = n.id===S.at, been=S.been[n.id];
    s+='<rect x="'+(cx-sz/2)+'" y="'+(cy-sz/2)+'" width="'+sz+'" height="'+sz+'" rx="8" fill="'+
       (here?'#3a3115':been?'#1c2740':'#0f1522')+'" stroke="'+
       (here?'#f2c65c':been?'#3d4c6e':'#243049')+'" stroke-width="'+(here?5:3)+'"/>';
    if (n.entrance) s+='<text x="'+cx+'" y="'+(cy+6)+'" text-anchor="middle" font-size="26" fill="#94a4c4">入</text>';
    else if (n.goal && been) s+='<text x="'+cx+'" y="'+(cy+7)+'" text-anchor="middle" font-size="26" fill="#f2c65c">奥</text>';
    else if (been && n.ev) s+='<text x="'+cx+'" y="'+(cy+7)+'" text-anchor="middle" font-size="24" fill="'+
       (n.ev.t==='hint'?'#7fd4ff':n.ev.t==='foe'?'#ff8f8f':'#7de8a4')+'">'+
       (n.ev.t==='hint'?'書':n.ev.t==='foe'?'敵':'品')+'</text>';
    else if (here) s+='<circle cx="'+cx+'" cy="'+cy+'" r="9" fill="#f2c65c"/>';
    /* 名前は地図に書かない（狭い画面では潰れる）。上の帯に出す。
       名前のある部屋だけ、小さな印を付けておく */
    else if (been && n.name) s+='<circle cx="'+(cx+sz/2-11)+'" cy="'+(cy-sz/2+11)+'" r="4" fill="#6c7b9c"/>';
  });
  s+='</svg>';
  document.getElementById('mapwrap').innerHTML = s;
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

/* ================= 出来事 ================= */
function enter(id){
  var n = S.map.byId[id], first = !S.been[id];
  S.at = id; S.been[id] = 1; S.steps++;
  S.noise = (!S.enc && rnd() < 0.26) ? 1 : 0;    /* その場に着いた時点で決める */
  reveal();

  if (n.kind === 'corridor' && n.gate){
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
  } else if (n.kind === 'room' && n.ev && first){
    var k2 = KEYS[n.ev.key];
    if (n.ev.t === 'hint'){
      say(k2.hint); say('── 覚え書きを写した（' + k2.name + '）', 'sys'); S.notes[n.ev.key]=1;
      if (k2.cond.t === 'word') S.did['word:'+n.ev.gate] = 1;   /* 読むことが、そのまま知ること */
    }
    else if (n.ev.t === 'foe'){
      say('{$placeの奥から|部屋の中央に|$lightの輪の縁に}、{ひときわ大きいものが|'
        + '他とは明らかに違う影が|$lordではないが、それに近いものが}{立ち上がった|こちらを向いた|'
        + '身を起こした}。{ここを通るなら、これを越えるしかない|'
        + '避けて通れる位置ではない|$who が、無言で武器を握り直した}。');
      S.enc = { gate: n.ev.gate };
    }
    else say(k2.seed);
  } else if (n.kind === 'room'){
    if (first && n.name && !n.entrance)
      say('{ここが|この場所が|$who が言うには、ここが|框の彫りが読める——ここが}' +
          n.name + '{だ|らしい|、と伝わる場所だろう}。', 'sys');
    say(WALK.room);
  } else {
    say(WALK.corridor);
  }
  if (n.goal && first) say('{探していたものは、この奥にある|ここが最奥だ|——ここまで来た}。', 'em');
  render();
}

/* 種のある部屋で出せる行動 */
function seedActs(n){
  if (!n.ev || n.ev.t !== 'seed') return [];
  var gid = n.ev.gate, c = S.map.gates[gid].cond, out = [];
  if (meets(gid)) return [];
  if (c.t === 'favor') out.push({ l:'手を貸す', k:'借りを作る', f:function(){
    S.did['favor:'+gid]=1; say('{$who が、黙って手を貸した|時間は食った。それだけのことだ|'+
      '$hurt が、自分の水を分けた}。{相手は、何も言わなかった|礼らしい礼は、無かった}。','em'); } });
  if (c.t === 'carry' || c.t === 'offer') out.push({ l:'持っていく', k:'荷が一つ増える', f:function(){
    S.bag[c.item]=1; say('{$who が、それを荷に収めた|重いが、置いていく気にはならない|'+
      '使い道は、そのうち分かる}。','em'); } });
  if (c.t === 'mark') out.push({ l:'触れる', k:'印 '+((S.marks[c.key]||0)+1)+'/'+c.n, f:function(){
    S.marks[c.key]=(S.marks[c.key]||0)+1;
    say('{指先が温かい|$soundが、遠くで一度鳴った|$traceが、$lightを弾いた}。','em');
    say('── 印 '+S.marks[c.key]+'/'+c.n,'sys'); } });
  if (c.t === 'lever') out.push({ l:'動かす', k:'どこかが変わる', f:function(){
    S.did['lever:'+gid]=1; say('{軋みながら、それは動いた|$placeの奥で、重いものが動く音がした|'+
      '$soundとは違う音が、長く尾を引いた}。','em'); } });
  if (c.t === 'deal') out.push({ l:'話をつける', k:'刃を抜かない', f:function(){
    S.did['deal:'+gid]=1; say('{話は、思ったより早くついた|互いに、損のない形に落ち着いた}。','em'); } });
  return out;
}

/* 仮の遭遇（Phase 2 で本物の戦闘につなぐ） */
function encounter(){
  say('{$soundに混じって|$lightの輪の外で|前方の闇で}、{何かが動いた|気配が立ち上がった|'+
      '$lordではない、小さいものがこちらを向いた}。');
  S.enc = {}; render();
}

/* ================= 描画 ================= */
function render(){
  drawMap();
  var n = S.map.byId[S.at], box = document.getElementById('choices');
  box.innerHTML = '';

  /* 帯と手札は、どの分岐でも先に更新しておく */
  document.getElementById('spot').textContent =
    n.kind === 'corridor' ? (n.gate ? '関門の前' : '通路') : (n.name || '名の無い部屋');
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
      S.kills++; if (gid0) S.did['slay:'+gid0] = 1; S.enc = 0;
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

  seedActs(n).forEach(function(a){ add(a.l, a.k, 'act', function(){ a.f(); render(); }); });

  /* 移動先 */
  var here = n, opts = [];
  here.links.forEach(function(lid){
    var l = S.map.byId[lid];
    if (here.kind === 'corridor' && here.gate && !S.open[here.gate] && l.zone > here.zone) return;
    opts.push(l);
  });
  opts.forEach(function(l){
    var label, note = '';
    if (l.kind === 'corridor'){
      var far = S.map.byId[l.from === here.id ? l.to : l.from];
      label = far.name ? far.name + 'の方へ' : (S.been[far.id] ? '来た道を戻る' : '通路の先へ');
      if (l.gate && !S.open[l.gate]) note = '関門';
      else if (!S.seen[far.id]) note = '灯りが届いていない';
      else if (!S.been[far.id]) note = '未踏';
    } else {
      label = l.name ? l.name + 'へ' : (S.been[l.id] ? '戻る' : 'その先の部屋へ');
      if (!S.been[l.id]) note = '未踏';
    }
    add(label, note, 'go', function(){ enter(l.id); });
  });

  /* 出直す。倒した敵は生き返り、不殺・無傷の条件はやり直せる。
     いっぽう構造として開いた道（橋・瓦礫・扉）は開いたまま。 */
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

  add((S.torch ? '松明を伏せる' : '松明を掲げる'), (S.torch ? '灯り 2部屋 → 1部屋' : '灯り 1部屋 → 2部屋'), '', function(){
    S.torch = !S.torch;
    say(S.torch ? '{松明に火を移した|$lightが、闇を一歩ぶん押し戻す}。' : '{火を伏せた|$lightは、足元だけになった}。','sys');
    reveal(); render(); });
  if (!S.spellUsed) add('魔術師のトーチ', '一度だけ 3部屋ぶん', '', function(){
    S.spell = 1; S.spellUsed = 1;
    say('{魔術師が短く唱えた|詠唱は、思ったより短かった}。{$placeが、奥まで見えた|'+
        '$lightが、届くはずのない先まで伸びる}。','em');
    reveal(); S.spell = 0; render(); });
  if (S.noise) add('物音のする方をうかがう', '遭遇するかもしれない', '', function(){ S.noise = 0; encounter(); });
}

/* ================= 開始 ================= */
var SETUP = { dun:'beast', rooms:10 };
function begin(){
  var map = generate({ dungeon: SETUP.dun, rooms: SETUP.rooms });
  var v = verify(map);
  S = { map:map, at:map.start, been:{}, seen:{}, open:{}, bag:{}, marks:{}, did:{}, notes:{},
        kills:0, hurt:0, steps:0, torch:false, spell:0, spellUsed:0, enc:0, noise:0, ctx:ctxOf(SETUP.dun) };
  PARTY.forEach(function(p){ p.hp = p.mx; });
  document.getElementById('setup').style.display='none';
  document.getElementById('dun').textContent = DUNGEONS[SETUP.dun].name;
  document.getElementById('narr').innerHTML='';
  say(DUNGEONS[SETUP.dun].open);
  say('── 部屋 ' + map.nodes.filter(function(x){return x.kind==='room';}).length +
      '／関門 ' + Object.keys(map.gates).length + '（' +
      map.keys.map(function(k){return KEYS[k].name;}).join('・') + '）' +
      '／種 ' + map.seed + (v.ok ? '' : ' ※要確認'), 'sys');
  enter(map.start);
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
  [['序盤',10],['中盤',18],['後半',26],['最奥',32]].forEach(function(p){
    var b=document.createElement('button'); b.className='opt'+(p[1]===SETUP.rooms?' on':'');
    b.textContent=p[0]+' '+p[1]+'室';
    b.onclick=function(){ SETUP.rooms=p[1]; [].forEach.call(rs.children,function(c){c.classList.remove('on');});
      b.classList.add('on'); };
    rs.appendChild(b);
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
  <p class="lead">部屋と通路の単位で歩きます。灯りの届く範囲だけ形が見え、
    中に何があるかは入るまで分かりません。関門は、ヒントを読み、条件を満たすと開きます。</p>
  <h2>ダンジョン</h2>
  <div class="opts" id="dopts"></div>
  <div class="dsub" id="dsub"></div>
  <h2>広さ</h2>
  <div class="opts" id="ropts"></div>
  <div class="dsub">物語が進むほど、深く、長くなります。</div>
  <button class="start" id="go">もぐる</button>
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
