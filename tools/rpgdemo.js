/* RPGモード ダンジョン探索画面の案。
   node tools/rpgdemo.js → rpgdemo.html ＋ standalone/rpgdemo.html
   ・マップを背景に敷く案を追加（案C・既定）
   ・語りは組み合わせで作られる。何通りあるかをその場で確かめられる
   ・パーティは6体（このゲームの根幹） */
const fs = require('fs');
const R = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');
const VARI = require('../src/vari.js');
const { EVENTS, AMBIENT } = require('./rpgevents.js');

/* # = 部屋 / . = 岩盤 / S = 入口 / B = 主の間 */
const MAP = ['..B..', '#####', '#...#', '#####', '..S..'];

const PLACED = {
  '4,2': 'start', '3,2': 'chasm', '3,0': 'water', '3,4': 'chest',
  '2,0': 'traveler', '2,4': 'merchant',
  '1,1': 'nest', '1,3': 'altar', '1,2': 'rest', '0,2': 'boss'
};

const ITEMS = {
  torch:  { name: '松明' },   rope:   { name: '縄' },     potion: { name: '傷薬' },
  key:    { name: '古い鍵' }, dagger: { name: '古い短剣' },
  bracer: { name: '赤石の腕輪' }, gem: { name: '鈍く光る石' }
};

/* 6体で1パーティ。前衛3・後衛3 */
const PARTY = [
  { id: 'shieldguard', hp: 30, max: 30, row: 0 },
  { id: 'knight',      hp: 22, max: 22, row: 0 },
  { id: 'berserker',   hp: 24, max: 24, row: 0 },
  { id: 'spearman',    hp: 24, max: 24, row: 1 },
  { id: 'archer',      hp: 14, max: 14, row: 1 },
  { id: 'priest',      hp: 15, max: 15, row: 1 }
];

/* 何通りあるかを数えておいて、ページに埋め込む */
const VN = { who: PARTY.length, hurt: PARTY.length };
const STATS = { rooms: {}, totalIntro: 0, minIntro: Infinity };
Object.keys(EVENTS).forEach(k => {
  const e = EVENTS[k];
  const intro = VARI.count(e.text, VN);
  let outs = [];
  e.choices.forEach(c => c.out.forEach(o => outs.push(VARI.count(o.t || '', VN))));
  const outAvg = Math.round(outs.reduce((a, b) => a + b, 0) / outs.length);
  STATS.rooms[k] = { title: e.title, intro: intro, out: outAvg, per: intro * outAvg };
  STATS.totalIntro += intro;
  STATS.minIntro = Math.min(STATS.minIntro, intro);
});
STATS.ambient = VARI.count(AMBIENT, VN);

const page = `<title>ダンジョン画面案</title>
<style>
:root{
  --ground:#070a10; --panel:#0c111d; --panel2:#101828;
  --line:#1c2439; --line2:#2a3550;
  --ink:#dde5f5; --ink2:#93a3c2; --ink3:#66748f;
  --gold:#f2c65c; --gold-dim:#a2822f;
  --torch:#ff9d4a; --ok:#7de8a4; --ng:#ff8f8f; --mid:#7fd4ff;
  --font:"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:#05070c;color:var(--ink);font-family:var(--font);
  font-size:14px;line-height:1.9;-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;align-items:center;padding:18px 12px 40px}

.head{width:100%;max-width:780px;margin-bottom:14px}
.head h1{font-size:19px;font-weight:900;color:var(--gold);margin:0 0 6px;letter-spacing:.02em}
.head p{font-size:12.5px;color:var(--ink2);margin:0 0 12px;line-height:1.85;max-width:66ch}
.head p b{color:#ffeec2}
.switch{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.switch button{font-family:inherit;font-size:12px;font-weight:900;padding:8px 13px;
  border-radius:9px;border:1px solid var(--line2);background:var(--panel2);color:var(--ink);cursor:pointer}
.switch button.on{border-color:var(--gold);color:var(--gold);background:rgba(242,198,92,.1)}
.switch button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.switch .sp{width:1px;height:22px;background:var(--line2);margin:0 3px}

.device{background:#000;border:1px solid #232c42;border-radius:22px;padding:9px;
  box-shadow:0 18px 50px rgba(0,0,0,.6)}
.screen{width:352px;height:680px;background:var(--ground);border-radius:15px;overflow:hidden;
  position:relative;display:flex;flex-direction:column}
body.land .screen{width:680px;height:352px}

.top{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:8px 11px;
  background:var(--panel2);border-bottom:1px solid var(--line);z-index:3}
.top .mis{flex:1;min-width:0;font-size:10.5px;font-weight:900;color:var(--gold);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top .st{font-size:10px;font-weight:900;color:var(--ink3);white-space:nowrap;
  font-variant-numeric:tabular-nums}

.body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;position:relative}
.side{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column}

/* ---- マップ ---- */
.mapwrap{flex:0 0 auto;position:relative;background:#04060b;
  border-bottom:1px solid var(--line);transition:height .32s cubic-bezier(.4,0,.2,1);
  overflow:hidden;height:238px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:9px 0 6px}
body.land .mapwrap{height:auto;flex:0 0 44%;border-bottom:0;border-right:1px solid var(--line);padding:9px 6px 6px}
.mapwrap.slim{height:76px;flex-direction:row;align-items:center;justify-content:flex-start;gap:11px;padding:0 12px}
body.land .mapwrap.slim{height:auto;flex:0 0 44%;flex-direction:column;justify-content:center;padding:9px 6px 6px}
.grid{flex:1 1 auto;min-height:0;aspect-ratio:1;display:grid;gap:3px;
  grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr)}
.mapwrap.slim .grid{flex:0 0 58px;width:58px;height:58px;gap:1.5px}
body.land .mapwrap.slim .grid{flex:1 1 auto;width:auto;height:auto;gap:3px}
.slimlab{display:none;font-size:11.5px;font-weight:900;color:var(--ink2);line-height:1.5}
.slimlab b{display:block;color:var(--torch);font-size:10px;letter-spacing:.08em}
.mapwrap.slim .slimlab{display:block}
body.land .mapwrap.slim .slimlab{display:none}

.cell{border-radius:4px;background:transparent;position:relative;display:grid;place-items:center;
  transition:background .25s,box-shadow .25s}
.cell.dark{background:#0a0e17;box-shadow:inset 0 0 0 1px #121a29}
.cell.seen{background:#16203a;box-shadow:inset 0 0 0 1px #26324f}
.cell.here{background:rgba(242,198,92,.22);box-shadow:inset 0 0 0 1.5px var(--gold),0 0 14px rgba(242,198,92,.35)}
.cell.can{cursor:pointer;background:#22314f;box-shadow:inset 0 0 0 1.5px #5772a8;
  animation:beat 1.9s ease-in-out infinite}
.cell.can:hover{background:#2d4068}
@keyframes beat{0%,100%{box-shadow:inset 0 0 0 1.5px #5772a8}
  50%{box-shadow:inset 0 0 0 1.5px #7f9ede,0 0 10px rgba(127,158,222,.35)}}
@media (prefers-reduced-motion:reduce){.cell.can{animation:none}}
.cell .ic{font-size:12px;line-height:1}
.mapwrap.slim .cell .ic{font-size:8px}
.cell.boss .ic{color:var(--ng)}
.cell.evt .ic{color:var(--torch)}
.mapleg{flex:0 0 auto;font-size:9.5px;color:var(--ink3);display:flex;gap:11px;
  justify-content:center;pointer-events:none}
.mapwrap.slim .mapleg{display:none}

/* ---- 案C：マップを背景に敷く ---- */
.mapbg{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;
  padding:12px 16px;transition:opacity .35s;background:#04060b}
.mapbg .grid{width:100%;height:auto;aspect-ratio:1;max-height:100%;flex:none}
.body.narrating .mapbg{opacity:.62;filter:blur(1.2px) saturate(.8)}
/* 背景に敷くときは、文字の下でも形が分かるように少し明るくする */
.mapbg .cell.dark{background:#0c1220;box-shadow:inset 0 0 0 1px #162033}
.mapbg .cell.seen{background:#24345c;box-shadow:inset 0 0 0 1px #3b4d78}
.mapbg .cell.here{background:rgba(242,198,92,.34);box-shadow:inset 0 0 0 2px var(--gold),0 0 18px rgba(242,198,92,.45)}
.over{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;
  pointer-events:none}
.over > *{pointer-events:auto}
.over .narr{background:linear-gradient(180deg,rgba(7,10,16,0),rgba(7,10,16,.86) 30%,rgba(7,10,16,.96));
  flex:0 1 auto;max-height:62%;padding-top:26px}
.over .acts{background:rgba(7,10,16,.97);border-top:1px solid var(--line)}
.over .movehint{margin:0 12px 10px;padding:7px 12px;border-radius:9px;
  background:rgba(7,10,16,.82);border:1px solid var(--line2);
  font-size:11.5px;color:var(--ink2);text-align:center;backdrop-filter:blur(3px)}

/* ---- 語り ---- */
.narr{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:none;padding:13px 14px;
  background:linear-gradient(180deg,#0a0f1a,#070b13)}
.narr::-webkit-scrollbar{display:none}
.narr .hd{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.narr .ttl{font-size:11px;font-weight:900;color:var(--torch);letter-spacing:.1em}
.narr .vchip{margin-left:auto;font-size:9.5px;font-weight:900;color:var(--mid);
  border:1px solid var(--mid);border-radius:999px;padding:0 8px;background:rgba(127,212,255,.08);
  cursor:pointer;font-family:inherit;white-space:nowrap}
.narr .tx{font-size:13px;line-height:2.05;color:#cfd9ec;white-space:pre-wrap}
.narr .res{margin-top:11px;padding:10px 12px;border-radius:9px;
  background:rgba(242,198,92,.09);border:1px solid #3a3320}
.narr .res .rt{font-size:12.5px;line-height:1.95;color:#f0e3c4}
.narr .eff{margin-top:7px;display:flex;flex-wrap:wrap;gap:5px}
.narr .eff span{font-size:10px;font-weight:900;padding:1px 7px;border-radius:999px;
  border:1px solid var(--line2);color:var(--ink2)}
.narr .eff span.good{color:var(--ok);border-color:#2f7a52}
.narr .eff span.bad{color:var(--ng);border-color:#7a3030}
.narr .eff span.info{color:var(--mid);border-color:#2b6285}

/* ---- 選択肢 ---- */
.acts{flex:0 0 auto;padding:9px 12px 11px;background:var(--panel);
  border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.acts button{font-family:inherit;text-align:left;font-size:12.5px;font-weight:800;
  color:var(--ink);background:var(--panel2);border:1px solid var(--line2);
  border-radius:9px;padding:9px 12px;cursor:pointer;line-height:1.6}
.acts button:hover{border-color:var(--gold-dim)}
.acts button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.acts button .req{display:block;font-size:10px;font-weight:900;color:var(--ink3);margin-top:1px}
.acts button[disabled]{opacity:.4;cursor:not-allowed}
.acts button.go{background:rgba(242,198,92,.12);border-color:var(--gold-dim);color:var(--gold)}
.acts .hint{font-size:11px;color:var(--ink3);text-align:center;padding:3px 0}

/* ---- 案B：シート ---- */
.sheet{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;
  background:rgba(3,5,10,.55);opacity:0;pointer-events:none;transition:opacity .28s;z-index:5}
.sheet.on{opacity:1;pointer-events:auto}
.sheet .inner{background:linear-gradient(180deg,#0b1120,#070b13);border-top:1px solid var(--line2);
  border-radius:16px 16px 0 0;box-shadow:0 -14px 34px rgba(0,0,0,.6);max-height:84%;
  display:flex;flex-direction:column;transform:translateY(14px);transition:transform .28s}
.sheet.on .inner{transform:translateY(0)}
.sheet .grab{flex:0 0 auto;height:16px;display:grid;place-items:center}
.sheet .grab i{width:34px;height:3px;border-radius:2px;background:#33405e;display:block}

/* ---- パーティ（6体・前衛3／後衛3） ---- */
.party{flex:0 0 auto;display:flex;gap:3px;padding:6px 8px;background:#080c15;
  border-top:1px solid var(--line);z-index:3}
.party .gap{flex:0 0 7px;position:relative}
.party .gap::after{content:"";position:absolute;left:3px;top:14%;bottom:14%;width:1px;background:var(--line2)}
.pm{flex:1;min-width:0;background:var(--panel2);border:1px solid var(--line);border-radius:6px;
  padding:2px;display:flex;flex-direction:column;align-items:center;gap:1px;position:relative}
.pm.back{border-color:#232d47;background:#0d1424}
.pm .pic{width:100%;aspect-ratio:1/0.9;border-radius:4px;overflow:hidden;background:#05070c}
.pm .pic svg{width:100%;height:100%;display:block}
.pm .nm{font-size:8px;font-weight:900;color:var(--ink2);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;max-width:100%}
.pm .bar{width:100%;height:3px;border-radius:2px;background:#2a1f24;overflow:hidden}
.pm .bar i{display:block;height:100%;background:linear-gradient(90deg,#4fd48a,#7de8a4)}
.pm.hurt .bar i{background:linear-gradient(90deg,#e0a53c,#ffd07a)}
.pm.low .bar i{background:linear-gradient(90deg,#d04a4a,#ff8f8f)}
.pm .hp{font-size:7.5px;font-weight:900;color:var(--ink3);font-variant-numeric:tabular-nums}
body.land .party{padding:4px 8px}
body.land .pm .pic{aspect-ratio:1/0.78}
body.land .pm .nm{font-size:8.5px}

.bagbar{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:5px 10px;
  background:#070a12;border-top:1px solid var(--line);overflow-x:auto;scrollbar-width:none;z-index:3}
.bagbar::-webkit-scrollbar{display:none}
.bagbar .lb{font-size:9.5px;font-weight:900;color:var(--ink3);white-space:nowrap}
.bagbar .it{font-size:10px;font-weight:900;color:var(--gold);white-space:nowrap;
  border:1px solid #3b3016;border-radius:999px;padding:0 8px;background:rgba(242,198,92,.07)}
.bagbar .none{font-size:10px;color:var(--ink3)}

/* ---- バリエーション確認 ---- */
.vpanel{position:absolute;inset:0;background:rgba(4,6,12,.94);z-index:9;
  display:none;flex-direction:column;padding:12px}
.vpanel.on{display:flex}
.vpanel .vh{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.vpanel .vh b{font-size:12.5px;color:var(--gold)}
.vpanel .vh .n{font-size:11px;color:var(--mid);font-weight:900;font-variant-numeric:tabular-nums}
.vpanel .vh button{margin-left:auto;font-family:inherit;font-size:11px;font-weight:900;
  border:1px solid var(--line2);background:var(--panel2);color:var(--ink);
  border-radius:8px;padding:4px 10px;cursor:pointer}
.vpanel .vlist{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:none;
  display:flex;flex-direction:column;gap:7px}
.vpanel .vlist::-webkit-scrollbar{display:none}
.vpanel .vi{font-size:11.5px;line-height:1.9;color:#cfd9ec;background:var(--panel);
  border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.vpanel .vi i{font-style:normal;color:var(--torch);font-weight:900;font-size:10px;
  display:block;margin-bottom:2px}
.vpanel .vfoot{flex:0 0 auto;display:flex;gap:7px;margin-top:9px}
.vpanel .vfoot button{flex:1;font-family:inherit;font-size:12px;font-weight:900;
  border:1px solid var(--line2);background:var(--panel2);color:var(--ink);
  border-radius:9px;padding:8px;cursor:pointer}
.vpanel .vfoot button.pri{border-color:var(--gold-dim);color:var(--gold);background:rgba(242,198,92,.1)}

.foot{width:100%;max-width:780px;margin-top:18px;font-size:12.5px;color:var(--ink2);line-height:1.95}
.foot h2{font-size:15px;font-weight:900;color:var(--gold);margin:22px 0 6px}
.foot ul{margin:0;padding-left:1.15em}
.foot li{margin-bottom:8px;max-width:68ch}
.foot b{color:#ffeec2}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--panel);margin:12px 0}
table{border-collapse:collapse;width:100%;min-width:440px;font-size:12px}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line)}
thead th{background:var(--panel2);color:var(--ink2);font-size:10.5px;font-weight:900;letter-spacing:.05em}
tbody tr:last-child td{border-bottom:0}
td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:900;color:var(--mid)}
td.k{font-weight:900;color:var(--ink)}
</style>

<div class="head">
  <h1>ダンジョン探索画面の案</h1>
  <p>実際に歩けます。<b>光っているマスをタップすると移動</b>し、部屋によって語りと選択肢が出ます。
  語りは<b>組み合わせで毎回組み立てられる</b>ので、同じ部屋でも文面が変わります。
  <b>語りの右上にある「◇ N通り」を押すと、その部屋の文章が何通りあるかと、実例が見られます。</b></p>
  <div class="switch">
    <button data-lay="bg" class="on">案C 背景に敷く</button>
    <button data-lay="fold">案A 畳む</button>
    <button data-lay="sheet">案B 重ねる</button>
    <span class="sp"></span>
    <button data-or="port" class="on">縦持ち</button>
    <button data-or="land">横持ち</button>
    <span class="sp"></span>
    <button id="reset">最初から</button>
  </div>
</div>

<div class="device"><div class="screen" id="screen"></div></div>

<div class="foot">
  <h2>文章のバリエーション</h2>
  <p>語りは固定の文ではなく、<b>言い換えの組み合わせ</b>で作っています。
  たとえば「{苔むした|蔦に覆われた|ひび割れた|黒く濡れた}石の門」のように書いておくと、
  実行時に1つ選ばれます。入れ子にもできるので、<b>文型そのものを2つ用意して丸ごと切り替える</b>こともできます。
  さらに <b>$who</b>（パーティの誰か）を差し込めるので、6体編成なら同じ文でも6通りに分かれます。</p>
  <div class="tw" id="vtable"></div>
  <p id="vsum"></p>

  <h2>3案のちがい</h2>
  <ul>
    <li><b>案C（背景に敷く）</b>——マップを画面いっぱいに敷き、語りの間はうっすら透かします。<b>場所を取り合わないので、マップも文章も広く使えます。</b>現在地も常に見えています。</li>
    <li><b>案A（畳む）</b>——語りが出るとマップが上の帯まで縮みます。文章がいちばん読みやすい代わりに、マップは小さくなります。</li>
    <li><b>案B（重ねる）</b>——マップは開いたまま、語りが下から重なります。<b>現在地が隠れる</b>のが難点です。</li>
    <li>横持ちはどの案でも<b>左マップ・右に語りと選択肢</b>の2列になります。</li>
  </ul>

  <h2>まだ入れていないもの</h2>
  <ul>
    <li><b>戦闘。</b>「けもののねぐら」「主の間」で戦闘になりますが、ここでは入口だけです。実際は<b>いまのバトル画面がそのまま開きます</b>。</li>
    <li><b>装備画面。</b>拾ったアイテムは下の帯に溜まるだけです。</li>
    <li>ダンジョンは<b>この14部屋で固定</b>です。自動生成はまだ入れていません。</li>
  </ul>
</div>

<script>
${R('vari.js')}
</script>
<script>
${R('engine.js')}
</script>
<script>
${R('art.js')}
</script>
<script>
var MAP = ${JSON.stringify(MAP)};
var EVENTS = ${JSON.stringify(EVENTS)};
var AMBIENT = ${JSON.stringify(AMBIENT)};
var PLACED = ${JSON.stringify(PLACED)};
var ITEMS = ${JSON.stringify(ITEMS)};
var PARTY0 = ${JSON.stringify(PARTY)};
var STATS = ${JSON.stringify(STATS)};
</script>
<script>
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  var layout = 'bg', S;

  function fresh() {
    return {
      at: [4, 2], seen: {}, done: {}, bag: [], info: [],
      party: PARTY0.map(function (p) { return { id: p.id, hp: p.hp, max: p.max, row: p.row }; }),
      mode: 'move', ev: null, evKey: null, evText: '', res: null, alert: 0, steps: 0,
      amb: '', vopen: false, vsamples: []
    };
  }

  /* 差し込む語 */
  function ctx() {
    return {
      who: function () {
        var a = S.party.filter(function (p) { return p.hp > 0; });
        return CB.BY_ID[a[Math.floor(Math.random() * a.length)].id].name;
      },
      hurt: function () {
        var a = S.party.slice().sort(function (x, y) { return x.hp / x.max - y.hp / y.max; });
        return CB.BY_ID[a[0].id].name;
      }
    };
  }
  function say(tpl) { return VARI.expand(tpl, ctx()); }

  function isRoom(r, c) { return MAP[r] && MAP[r][c] && MAP[r][c] !== '.'; }
  function key(r, c) { return r + ',' + c; }
  function evAt(r, c) { return PLACED[key(r, c)] || null; }

  function apply(eff) {
    var tags = [];
    if (eff.heal) { S.party.forEach(function (p) { p.hp = Math.min(p.max, p.hp + eff.heal); });
      tags.push(['good', '全員 体力+' + eff.heal]); }
    if (eff.dmg) { S.party.forEach(function (p) { p.hp = Math.max(1, p.hp - eff.dmg); });
      tags.push(['bad', '全員 体力-' + eff.dmg]); }
    if (eff.maxHp) { S.party.forEach(function (p) { p.max += eff.maxHp; p.hp += eff.maxHp; });
      tags.push(['good', '体力上限+' + eff.maxHp]); }
    if (eff.atkUp) tags.push(['good', '攻撃+' + eff.atkUp]);
    if (eff.bless) tags.push(['good', '加護を得た']);
    if (eff.item) { S.bag.push(eff.item); tags.push(['good', ITEMS[eff.item].name + ' を入手']); }
    if (eff.info) { S.info.push(eff.info); tags.push(['info', eff.info]); }
    if (eff.alert) { S.alert += eff.alert; tags.push(['bad', '警戒度+' + eff.alert]); }
    if (eff.ambush) tags.push(['good', '奇襲できる']);
    if (eff.bonus) tags.push(['good', '大きな隙を突ける']);
    if (eff.fight) tags.push([eff.fight === 'ambush' ? 'good' : 'bad',
      eff.fight === 'boss' ? '主との戦闘' : eff.fight === 'ambush' ? '先制して戦闘' : '戦闘']);
    return tags;
  }

  function pick(list) {
    var tot = list.reduce(function (a, o) { return a + o.w; }, 0), r = Math.random() * tot;
    for (var i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* ---------- 描画 ---------- */
  function gridHTML(interactive) {
    var out = '';
    for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
      if (!isRoom(r, c)) { out += '<div class="cell"></div>'; continue; }
      var k = key(r, c), here = (S.at[0] === r && S.at[1] === c);
      var seen = S.seen[k], id = evAt(r, c);
      var can = interactive && !here && S.mode === 'move' &&
        (Math.abs(S.at[0] - r) + Math.abs(S.at[1] - c) === 1);
      var cls = 'cell ' + (here ? 'here' : can ? 'can' : seen ? 'seen' : 'dark'), ic = '';
      if (here) ic = '<span class="ic">🔦</span>';
      else if (seen && id === 'boss') { cls += ' boss'; ic = '<span class="ic">☠</span>'; }
      else if (seen && id && id !== 'start' && !S.done[k]) { cls += ' evt'; ic = '<span class="ic">✦</span>'; }
      else if (seen && S.done[k]) ic = '<span class="ic" style="opacity:.28">·</span>';
      out += '<div class="' + cls + '"' + (can ? ' data-go="' + k + '"' : '') + '>' + ic + '</div>';
    }
    return out;
  }

  function mapPanel() {
    var slim = (layout === 'fold' && S.mode !== 'move') ? ' slim' : '';
    var lab = S.ev && S.ev.title ? S.ev.title : '探索中';
    return '<div class="mapwrap' + slim + '"><div class="grid">' + gridHTML(true) + '</div>' +
      '<div class="slimlab"><b>いまここ</b>' + lab + '</div>' +
      '<div class="mapleg"><span>🔦 現在地</span><span>✦ 未踏の出来事</span><span>☠ 主の間</span></div></div>';
  }

  function narrHTML() {
    if (S.mode === 'move') {
      return '<div class="narr"><div class="hd"><span class="ttl">探索中</span>' +
        '<button class="vchip" data-v="1">◇ ' + STATS.ambient + '通り</button></div>' +
        '<div class="tx">' + S.amb + '</div></div>';
    }
    var st = STATS.rooms[S.evKey] || { intro: 1 };
    var h = '<div class="narr"><div class="hd"><span class="ttl">' + S.ev.title + '</span>' +
      '<button class="vchip" data-v="1">◇ ' + st.intro.toLocaleString() + '通り</button></div>' +
      '<div class="tx">' + S.evText + '</div>';
    if (S.res) {
      h += '<div class="res"><div class="rt">' + S.res.t + '</div>';
      if (S.res.tags.length) h += '<div class="eff">' + S.res.tags.map(function (t) {
        return '<span class="' + t[0] + '">' + t[1] + '</span>'; }).join('') + '</div>';
      h += '</div>';
    }
    return h + '</div>';
  }

  function actsHTML() {
    if (S.mode === 'move') return '';
    if (S.res) return '<div class="acts"><button class="go" data-next="1">▶ 先へ進む</button></div>';
    var h = '<div class="acts">';
    S.ev.choices.forEach(function (ch, i) {
      var lack = ch.need === 'info' ? S.info.length === 0
        : (ch.need ? S.bag.indexOf(ch.need) < 0 : false);
      h += '<button data-ch="' + i + '"' + (lack ? ' disabled' : '') + '>' + ch.label +
        (ch.need ? '<span class="req">' +
          (ch.need === 'info' ? '手がかりが要る' : ITEMS[ch.need].name + ' が要る') +
          (lack ? '（持っていない）' : '（持っている）') + '</span>' : '') + '</button>';
    });
    return h + '</div>';
  }

  function partyHTML() {
    var cells = S.party.map(function (p, i) {
      var d = CB.BY_ID[p.id], pct = Math.max(0, p.hp / p.max * 100);
      var cls = 'pm' + (p.row ? ' back' : '') + (pct <= 30 ? ' low' : pct <= 65 ? ' hurt' : '');
      return (i === 3 ? '<div class="gap"></div>' : '') +
        '<div class="' + cls + '"><div class="pic">' + CBART.portrait(p.id, d.elem) + '</div>' +
        '<div class="nm">' + d.name + '</div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="hp">' + p.hp + '/' + p.max + '</div></div>';
    }).join('');
    return '<div class="party">' + cells + '</div>';
  }

  function bagHTML() {
    return '<div class="bagbar"><span class="lb">持ち物</span>' +
      (S.bag.length ? S.bag.map(function (k) { return '<span class="it">' + ITEMS[k].name + '</span>'; }).join('')
                    : '<span class="none">まだ何も持っていない</span>') + '</div>';
  }

  function vpanelHTML() {
    if (!S.vopen) return '';
    var isAmb = S.mode === 'move';
    var n = isAmb ? STATS.ambient : (STATS.rooms[S.evKey] || {}).intro;
    var ttl = isAmb ? '移動中の一言' : S.ev.title;
    return '<div class="vpanel on"><div class="vh"><b>' + ttl + '</b>' +
      '<span class="n">' + n.toLocaleString() + ' 通り</span>' +
      '<button data-vclose="1">閉じる</button></div>' +
      '<div class="vlist">' + S.vsamples.map(function (t, i) {
        return '<div class="vi"><i>' + (i + 1) + '</i>' + t + '</div>'; }).join('') + '</div>' +
      '<div class="vfoot"><button class="pri" data-vroll="1">↻ もう5つ出す</button></div></div>';
  }

  function render() {
    var top = '<div class="top"><span class="mis">討伐：村人を苦しめる洞窟の主</span>' +
      '<span class="st">' + S.steps + '歩　警戒 ' + S.alert + '</span></div>';
    var land = document.body.classList.contains('land');
    var body;

    if (layout === 'bg' && !land) {
      var hint = S.mode === 'move'
        ? '<div class="movehint">' + S.amb.split('\\n')[0] + '</div>' : '';
      body = '<div class="body' + (S.mode !== 'move' ? ' narrating' : '') + '">' +
        '<div class="mapbg"><div class="grid">' + gridHTML(true) + '</div></div>' +
        '<div class="over">' + (S.mode === 'move' ? hint : narrHTML() + actsHTML()) + '</div></div>';
    } else if (layout === 'sheet' && !land) {
      body = '<div class="body">' + mapPanel() +
        '<div class="sheet' + (S.mode !== 'move' ? ' on' : '') + '"><div class="inner">' +
        '<div class="grab"><i></i></div>' + narrHTML() + actsHTML() + '</div></div></div>';
    } else {
      body = '<div class="body">' + mapPanel() +
        '<div class="side">' + narrHTML() +
        (S.mode === 'move' ? '<div class="acts"><div class="hint">光っているマスを選んでください</div></div>'
                           : actsHTML()) + '</div></div>';
    }
    screen.innerHTML = top + body + partyHTML() + bagHTML() + vpanelHTML();
    bind();
  }

  function bind() {
    screen.querySelectorAll('[data-go]').forEach(function (el) {
      el.onclick = function () {
        var p = el.dataset.go.split(',').map(Number);
        S.at = p; S.steps++; S.seen[key(p[0], p[1])] = 1;
        var id = evAt(p[0], p[1]);
        if (id && !S.done[key(p[0], p[1])] && EVENTS[id]) {
          S.ev = EVENTS[id]; S.evKey = id; S.evText = say(EVENTS[id].text);
          S.mode = 'event'; S.res = null;
        } else { S.mode = 'move'; S.ev = null; S.evKey = null; S.res = null; S.amb = say(AMBIENT); }
        render();
      };
    });
    screen.querySelectorAll('[data-ch]').forEach(function (el) {
      el.onclick = function () {
        var ch = S.ev.choices[+el.dataset.ch], o = pick(ch.out);
        S.res = { t: o.t ? say(o.t) : 'ここで戦闘に入ります。', tags: apply(o.eff || {}) };
        render();
      };
    });
    var nx = screen.querySelector('[data-next]');
    if (nx) nx.onclick = function () {
      S.done[key(S.at[0], S.at[1])] = 1;
      S.mode = 'move'; S.ev = null; S.evKey = null; S.res = null; S.amb = say(AMBIENT);
      render();
    };
    var vc = screen.querySelector('[data-v]');
    if (vc) vc.onclick = function () { S.vopen = true; roll(); render(); };
    var vx = screen.querySelector('[data-vclose]');
    if (vx) vx.onclick = function () { S.vopen = false; render(); };
    var vr = screen.querySelector('[data-vroll]');
    if (vr) vr.onclick = function () { roll(); render(); };
  }

  function roll() {
    var tpl = S.mode === 'move' ? AMBIENT : S.ev.text;
    S.vsamples = [];
    for (var i = 0; i < 5; i++) S.vsamples.push(say(tpl).replace(/\\n/g, ' '));
  }

  document.querySelectorAll('[data-lay]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-lay]').forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on'); layout = b.dataset.lay; render();
    };
  });
  document.querySelectorAll('[data-or]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-or]').forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on');
      document.body.classList.toggle('land', b.dataset.or === 'land');
      render();
    };
  });
  document.getElementById('reset').onclick = function () { start(); };

  /* 下の表 */
  (function () {
    var rows = Object.keys(STATS.rooms).map(function (k) { return STATS.rooms[k]; })
      .sort(function (a, b) { return b.intro - a.intro; });
    document.getElementById('vtable').innerHTML =
      '<table><thead><tr><th>部屋</th><th style="text-align:right">導入の文</th>' +
      '<th style="text-align:right">結果の文（平均）</th><th style="text-align:right">1回ぶん</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="k">' + r.title + '</td><td class="n">' + r.intro.toLocaleString() +
          '</td><td class="n">' + r.out.toLocaleString() + '</td><td class="n">' +
          r.per.toLocaleString() + '</td></tr>';
      }).join('') + '</tbody></table>';
    var minR = rows[rows.length - 1];
    function dup(n, v) { var p = 1; for (var i = 0; i < n; i++) p *= (v - i) / v; return (1 - p) * 100; }
    document.getElementById('vsum').innerHTML =
      'いま入っている10部屋の導入文だけで <b>' + STATS.totalIntro.toLocaleString() + ' 通り</b>、' +
      '結果の文まで含めると<b>1部屋あたり数千通り</b>です。' +
      'ただし大事なのは総数より<b>「同じ文にいつ出会うか」</b>で、' +
      'いちばん少ない部屋（' + minR.title + '・' + minR.intro.toLocaleString() + '通り）でも、' +
      '<b>10回探索して同じ導入文に当たる確率は ' + dup(10, minR.intro).toFixed(1) + '%</b>、' +
      '20回で ' + dup(20, minR.intro).toFixed(1) + '% です。';
  })();

  function start() {
    S = fresh();
    S.seen[key(4, 2)] = 1;
    S.ev = EVENTS.start; S.evKey = 'start'; S.evText = say(EVENTS.start.text);
    S.mode = 'event'; S.amb = say(AMBIENT);
    render();
  }
  start();
})();
</script>
`;

fs.writeFileSync(__dirname + '/../rpgdemo.html', page);
console.log('rpgdemo.html  ' + (page.length / 1024).toFixed(1) + ' KB');

/* 配布用に、文字コード宣言を含む完全なHTMLも書き出す */
const SA = require('./standalone.js');
fs.mkdirSync(__dirname + '/../standalone', { recursive: true });
fs.writeFileSync(__dirname + '/../standalone/rpgdemo.html', SA.wrap(page, 'rpgdemo'), 'utf8');
console.log('  standalone/rpgdemo.html も書き出しました');
console.log('  導入文の合計 ' + STATS.totalIntro.toLocaleString() +
            ' 通り／最小 ' + STATS.minIntro.toLocaleString() + ' 通り');
