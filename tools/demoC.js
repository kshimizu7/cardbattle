/* 案C の追加提案（①技のはみ出し表示／②絵タップで技を再生）を、実際に触れる形で見せるページ。
   node tools/demoC.js → /root/cardbattle/demoC.html */
const fs = require('fs');
const R = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');

/* ui.js から FXS の定義だけを抜き出して、デモでもゲームと同じ色・粒子を使う */
const ui = R('ui.js');
const FXS_SRC = ui.slice(ui.indexOf('  var FXS = {'), ui.indexOf('  function fxOf(n)'));

const page = `<title>案C 追加提案デモ</title>
<style>
${R('style.css')}

/* ===== 案C 本体（縦持ち・キャラ絵全幅・名前を絵に重ねる） ===== */
.card-c .box.detailbox{display:flex;flex-direction:column;max-height:none;overflow:hidden;
  background:transparent;border:0;padding:0;max-width:none}
.card-c .cardwrap{flex:0 1 auto;min-height:0;position:relative;display:flex;flex-direction:column}
.card-c .cardwrap > .bigcard{flex:0 1 auto;min-height:0;overflow:hidden;
  display:flex;flex-direction:column;
  box-shadow:0 20px 46px rgba(0,0,0,.8),0 0 26px rgba(242,198,92,.13)}
/* キャラ絵・名前・能力は固定。動くのは技の欄だけ */
.card-c .dhead,.card-c .toc,.card-c .cnthd{flex:0 0 auto}
.card-c .dbody{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:none;
  -webkit-overflow-scrolling:touch;padding-bottom:2px}
.card-c .dbody::-webkit-scrollbar{display:none}
.card-c .box.detailbox > .navrow,.card-c .box.detailbox > .btn{flex:0 0 auto}
.card-c .navrow.big{margin-top:12px;display:flex;align-items:center;gap:8px}
.card-c .navrow.big .navb{flex:1 1 0;min-width:0}
.card-c .navrow.big .navpos{flex:0 0 auto;font-size:12px;font-weight:900;color:#8fa0c0;
  min-width:52px;text-align:center}

.card-c .dhead{display:block;position:relative}
.card-c .dhead .art{flex:none;width:100%;aspect-ratio:1/0.86;border-radius:12px 12px 0 0;
  overflow:hidden;position:relative;cursor:pointer}
.card-c .dhead .art::after{content:"";position:absolute;left:0;right:0;bottom:0;height:58%;
  background:linear-gradient(transparent,rgba(6,9,17,.55) 42%,rgba(6,9,17,.94));pointer-events:none;z-index:1}
/* 名前は「絵」の底に貼る（.dhead の底だと能力欄に重なる） */
.card-c .art .ovbox{position:absolute;left:0;right:0;bottom:0;padding:0 11px 8px;z-index:2;
  pointer-events:none}
.card-c .art .ovbox .lnchip,.card-c .art .ovbox .tierline{pointer-events:auto}
.card-c .art .ovbox .hd{display:flex;align-items:baseline;gap:7px;padding:0}
.card-c .art .ovbox .hd h3{font-size:19px;text-shadow:0 2px 8px rgba(0,0,0,.9)}
.card-c .art .ovbox .hd em{display:inline;font-size:12px;font-style:normal;font-weight:800;
  color:#9fb0d0;text-shadow:0 2px 6px rgba(0,0,0,.9)}
.card-c .art .ovbox .chiprow{margin:5px 0 0;display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.card-c .dhead .dmeta{padding:6px 11px 6px;display:flex;flex-direction:column;gap:0}
.card-c .strow.z{display:flex;align-items:center;gap:7px;padding:0;font-size:11px;font-weight:800;
  line-height:1.2}
.card-c .strow.z > *{line-height:1.2}
.card-c .strow.z .lb{width:34px;flex:0 0 auto;color:var(--dim);white-space:nowrap}
.card-c .strow.z .nv{min-width:20px;text-align:right;font-size:11.5px;font-weight:900;color:#dbe4f5;
  font-variant-numeric:tabular-nums;flex:0 0 auto}
.card-c .pips{flex:1 1 auto;min-width:0;gap:2px}
.card-c .pips{align-items:center}
.card-c .pips .pip{flex:1 1 0;width:auto;height:auto;aspect-ratio:1;max-width:11px;min-width:3px}

/* 系統チップ ⓘ ／ Tier 行 */
.lnchip::after{content:none}
.lnchip .ic,.tierline .ic{font-size:9px;font-weight:900;font-style:italic;
  width:13px;height:13px;border-radius:50%;border:1.2px solid currentColor;opacity:.8;
  display:flex;align-items:center;justify-content:center;margin-left:2px;flex:0 0 auto}
.tierline{display:inline-flex;align-items:center;gap:5px;padding:2px 8px 2px 7px;border-radius:999px;
  background:rgba(4,7,14,.7);border:1px solid #3c4762;font-family:inherit;cursor:pointer}
.tierline .tw{font-size:9.5px;font-weight:900;color:#8fa0c0;letter-spacing:.08em}
.tierline .solo{font-size:10.5px;font-weight:900;color:#a8b6d4;white-space:nowrap}
.tierline .ic{color:#8fa0c0;border-color:#56628a;opacity:1}

/* キャラ絵の中で行動モーションを再生できるようにする */
.card-c .dhead .art .unit{position:static;width:100%;height:100%;display:block;
  transform-origin:50% 78%}
.card-c .dhead .art .unit .pic,.card-c .dhead .art .unit .pic svg{width:100%;height:100%;display:block}
.card-c .dhead .art .taphint{position:absolute;left:8px;top:8px;z-index:3;
  font-size:9.5px;font-weight:900;color:#0a0d16;background:rgba(242,198,92,.92);
  padding:3px 8px;border-radius:999px;pointer-events:none;
  box-shadow:0 2px 10px rgba(0,0,0,.5);animation:hintPulse 2.4s ease-in-out infinite}
@keyframes hintPulse{0%,100%{opacity:.55}50%{opacity:1}}
.card-c .abox{cursor:pointer}
.card-c .abox.playing,.card-c .pabox.playing{border-color:var(--gold);
  box-shadow:0 0 0 1px rgba(242,198,92,.4),0 0 18px rgba(242,198,92,.18)}

/* ===== ① 再生中は、絵に重ねた文字をいったん消してアニメに集中させる ===== */
.card-c .art .ovbox,.card-c .art .cost,.card-c .art .taphint,
.card-c .art::after,.card-c .art::before{transition:opacity .16s ease}
.card-c.anim .art .ovbox,.card-c.anim .art .cost{opacity:0}
.card-c.anim .art .taphint{opacity:0;animation:none}
.card-c.anim .art::after,.card-c.anim .art::before{opacity:0}
.card-c .dmeta{transition:opacity .16s ease}
.card-c.anim .dmeta{opacity:.18}
.card-c.land.anim .dmeta{opacity:0}

/* ===== ② 技名カットインは、キャラに被らない位置に小さく出す ===== */
.techrib.dtl{min-width:0;padding:8px 16px;gap:4px;border-top-width:2px;border-bottom-width:2px;
  box-shadow:0 0 24px rgba(0,0,0,.75),0 0 26px var(--c);z-index:90}
.techrib.dtl .w{font-size:10px;letter-spacing:.16em}
.techrib.dtl .t{font-size:19px;letter-spacing:.06em;
  text-shadow:0 0 10px var(--c),0 0 22px var(--c),0 3px 8px #000}

/* ===== ① はみ出しを伝えるUI：4案 ===== */
.ov1 .dbody{mask-image:linear-gradient(#000 calc(100% - 34px),transparent);
  -webkit-mask-image:linear-gradient(#000 calc(100% - 34px),transparent)}
.ov1 .morechip{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:6;
  font-size:11px;font-weight:900;color:#0a0d16;background:var(--gold);
  padding:5px 13px;border-radius:999px;box-shadow:0 3px 14px rgba(0,0,0,.6);
  border:0;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px}
.ov2 .toc{display:flex;flex-wrap:wrap;gap:4px;padding:6px 11px 2px}
.ov2 .toc span{font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;
  border:1px solid #2f3a55;background:#0f1424;color:#a8b6d4}
.ov2 .toc span.pa{border-color:#4a3570;background:rgba(201,140,255,.1);color:#d9c2ff}
.ov3 .dbody{padding-right:6px}
.ov3 .rail{position:absolute;right:4px;width:3px;border-radius:2px;
  background:rgba(255,255,255,.07);z-index:6}
.ov3 .rail b{position:absolute;left:0;right:0;border-radius:2px;background:var(--gold);
  opacity:.85;box-shadow:0 0 8px rgba(242,198,92,.5)}
.ov4 .cnthd{display:flex;align-items:center;gap:7px;padding:5px 11px 1px;font-size:10px;
  font-weight:900;color:#8fa0c0;letter-spacing:.06em}
.ov4 .cnthd i{flex:1 1 auto;height:1px;background:#263049;font-style:normal}
.ov4 .cnthd b{color:var(--gold)}

/* ===== 横持ちの姿（デモではクラスで切り替え。実装時は @media (orientation:landscape)） ===== */
.card-c.land .box.detailbox{height:100%}
.card-c.land .cardwrap > .bigcard{display:grid;grid-template-columns:minmax(0,40%) minmax(0,1fr);
  align-items:stretch;flex:1 1 auto}
/* 左列は「絵だけ」。名前は上、能力は下に重ねるので、絵が縦をぜんぶ使える＝空きが出ない。
   絵の縦横比も正方形に近いままなので、技を再生したときに武器の振りが切れない */
.card-c.land .dhead{display:grid;grid-template-areas:"a";min-height:0;
  border-right:1px solid #263049;overflow:hidden}
.card-c.land .dhead .art{grid-area:a;min-height:90px;aspect-ratio:auto;
  border-radius:12px 0 0 0;height:100%}
.card-c.land .dhead .dmeta{grid-area:a;align-self:end;z-index:3;position:relative;
  padding:14px 11px 9px;gap:0;
  background:linear-gradient(transparent,rgba(6,9,17,.72) 34%,rgba(6,9,17,.95))}
/* 名前は上に置く（下は能力に譲る） */
.card-c.land .art::after{height:34%}
.card-c.land .art::before{content:"";position:absolute;left:0;right:0;top:0;height:44%;
  background:linear-gradient(rgba(6,9,17,.9),rgba(6,9,17,.5) 55%,transparent);
  pointer-events:none;z-index:1}
.card-c.land .art .ovbox{top:0;bottom:auto;padding:8px 11px 0}
.card-c.land .art .taphint{left:auto;right:8px;top:auto;bottom:8px}
/* コストの丸は名前と重なるので、横持ちでは右上へ */
.card-c.land .art .cost{left:auto;right:8px;top:8px;z-index:4}
.card-c.land .dbody{min-height:0;overflow-y:auto;padding:6px 0 4px}
.card-c.land .dbody .abox,.card-c.land .dbody .pabox{margin:5px 9px}
.card-c.land .dbody .flav{margin:7px 9px 6px}
.card-c.land .morechip{left:70%}
.card-c.land .art .ovbox .hd h3{font-size:17px}
.card-c.land .navrow.big{margin-top:9px}

/* 横持ちを実寸で見せるための枠（幅に合わせて縮小表示する） */
.landframe{margin-top:16px;overflow:hidden;border:1px solid #1e2740;border-radius:16px;
  background:#04060c;position:relative}
.landinner{width:820px;height:380px;transform-origin:top left;padding:11px 14px;
  display:flex;align-items:center;justify-content:center}
.landinner .card-c{width:100%;height:100%}
.landnote{font-size:10.5px;color:#7686a6;text-align:center;padding:6px 0 0;font-weight:800}

/* ④ 言い換え案の並べ方 */
.nrow{border:1px solid #263049;border-radius:12px;background:#0a0e1a;padding:11px 13px;margin-top:10px}
.nrow .nh{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.nrow .nh b{font-size:12.5px;font-weight:900;color:#f2c65c}
.nrow .nh span{font-size:10.5px;font-weight:800;color:#8fa0c0;border:1px solid #3c4762;
  padding:2px 8px;border-radius:999px}
.nrow .nchips{display:flex;gap:10px;flex-wrap:wrap;align-items:center;
  background:#04060c;border-radius:9px;padding:11px 12px}
.nrow .ndsc{font-size:11px;color:#8fa0c0;line-height:1.75;margin-top:9px}
.nrow .ndsc b{color:#ffeec2}

/* ① コスト表示の案 */
.card-c.c1 .art .cost{width:auto;height:auto;border-radius:999px;padding:3px 10px 3px 8px;
  display:flex;align-items:center;gap:5px;font-size:14px}
.card-c.c1 .art .cost::before{content:"コスト";font-size:9.5px;font-weight:900;letter-spacing:.08em;
  opacity:.8}
.card-c.c2 .art .cost{width:auto;height:auto;border-radius:10px;padding:3px 9px;font-size:14px;
  display:flex;align-items:center;gap:4px}
.card-c.c2 .art .cost::before{content:"コスト";font-size:9.5px;font-weight:900;letter-spacing:.06em;
  opacity:.8}
.card-c.c3 .art .cost{border-radius:50%;overflow:visible}
.card-c.c3 .art .cost::after{content:"コスト";position:absolute;left:50%;top:100%;
  transform:translateX(-50%);margin-top:3px;font-size:8.5px;font-weight:900;letter-spacing:.08em;
  color:var(--gold);text-shadow:0 1px 4px #000;white-space:nowrap}
.card-c.c4 .art .cost{width:auto;height:auto;border-radius:10px;padding:2px 9px 4px;
  flex-direction:column;display:flex;align-items:center;gap:0;line-height:1.05}
.card-c.c4 .art .cost::before{content:"コスト";font-size:8.5px;font-weight:900;letter-spacing:.06em;
  opacity:.85}
.card-c.c4 .art .cost{font-size:16px}

.costrow{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:14px}
.costcell{width:180px}
.costcell .cap2{font-size:11px;font-weight:900;color:#f2c65c;text-align:center;margin-bottom:6px}
.costcell .cap2 em{font-style:normal;color:#8fa0c0;font-weight:800;display:block;font-size:10px;
  margin-top:2px}
.costcell .bigcard{border:0;background:none;border-radius:12px;overflow:hidden}
.costcell .miniart{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1/0.72;
  border:1px solid #2f3a55}
.costcell .miniart svg{width:100%;height:100%;display:block}

/* ===== ページの体裁 ===== */
body{background:#06080f;color:#dbe4f5;margin:0;padding:0 0 60px;user-select:text;
  -webkit-user-select:text;overflow-y:auto;line-height:1.6;font-size:14px}
.w{max-width:900px;margin:0 auto;padding:20px 14px 0;text-align:left}
.w h1{font-size:20px;font-weight:900;color:#f2c65c;letter-spacing:.05em;margin:4px 0 6px}
.w h2{font-size:16px;font-weight:900;color:#f2c65c;margin:0 0 5px}
.w p.lead{font-size:12.5px;color:#8fa0c0;line-height:1.85;margin:0 0 10px}
.w p.lead b{color:#dbe4f5}
.sec{margin-top:34px}
.phones{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.ph{width:330px;flex:0 0 auto}
.ph .scr{background:#04060c;border:1px solid #1e2740;border-radius:18px;padding:13px;
  position:relative;overflow:hidden}
.ph .lb{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.ph .lb .k{width:24px;height:24px;border-radius:7px;background:rgba(242,198,92,.14);color:#f2c65c;
  font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.ph .lb .t{font-size:12.5px;font-weight:900}
.ph .dsc{font-size:11px;color:#8fa0c0;line-height:1.7;margin-top:8px}
.ph .dsc b{color:#ffeec2}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0 0}
.bar button{font-family:inherit;font-size:12px;font-weight:900;padding:8px 14px;border-radius:10px;
  border:1px solid #3c4762;background:#121a2c;color:#dbe4f5;cursor:pointer}
.bar button.on{border-color:#f2c65c;color:#f2c65c;background:rgba(242,198,92,.1)}
.note{margin-top:24px;border:1px dashed #2f3a55;border-radius:12px;padding:14px 16px;
  font-size:12px;color:#a8b6d4;line-height:1.9;background:rgba(255,255,255,.02)}
.note b{color:#ffeec2}
.note code{font-size:11px;background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px}
/* このページでは横長ウィンドウでも縦持ちの姿を見せる（前回の反省） */
@media (orientation: landscape){
  .card-c .bigcard{display:block}
  .card-c .dhead{display:block;border-right:0;height:auto}
  .card-c .dbody{overflow:visible;max-height:none;padding:0}
  .card-c .bigcard > .flav{margin:8px 10px 10px;padding:0}
}
</style>

<div id="fxlayer"></div>
<div class="w">
<h1>案C 追加提案</h1>
<p class="lead">案Cをベースに、いただいた2つのお題を実際に動く形にしました。<b>画面のどこでも触れます。</b>横長のウィンドウで開いても縦持ちの姿のまま表示されます。</p>

<div class="sec">
<h2>② キャラ絵をタップして技を再生</h2>
<p class="lead">結論から言うと、<b>新しく作るものはほとんどありません。</b>戦闘中に使っている「立ち上がる→溜め→振り抜く」のモーション、技名カットイン、効果音、着弾エフェクトは全部そのまま流用できます。下のカードで <b>キャラ絵をタップ</b>してみてください。<b>技の欄をタップ</b>すると、その技が再生されます。</p>
<p class="lead"><b>キャラ絵は固定にしました。</b>スクロールするのは技の欄だけなので、いちばん下の技をタップしても絵は見えたままです。下のカードは技を6件に水増ししてあるので、スクロールして下の技をタップして確かめてみてください。</p>
<p class="lead"><b>再生中は、絵に重ねた文字（名前・系統・コスト）がすっと消えます。</b>技名のカットインも、キャラに被らないよう<b>絵の下</b>（横持ちでは右の技の欄の上）に小さく出します。</p>
<div class="bar">
  <button id="sndb">♪ 音を出す</button>
  <button data-ch="knight">騎士（斬る）</button>
  <button data-ch="yeti" class="on">イエティ（叩く・咆哮）</button>
  <button data-ch="archmage">大魔法使い（詠唱・メテオ）</button>
  <button data-ch="priest">僧侶（癒す）</button>
  <button data-ch="harpy">ハーピー（叫ぶ）</button>
</div>
<div class="phones"><div class="ph"><div class="scr" id="demo"></div></div></div>
</div>

<div class="sec">
<h2>① 表示しきれない技があることを伝えるUI</h2>
<p class="lead">技＋特殊能力が7件ある想定のイエティで、4案を並べました。<b>それぞれ実際にスクロールできます</b>ので、触って比べてください。</p>
<div class="phones" id="ovs"></div>
</div>

<div class="sec">
<h2>③ 横持ちのとき</h2>
<p class="lead">左＝キャラ絵と能力／右＝技 の2段組です。<b>前回ご指摘の「絵の下の空きスペース」は、絵が縦の余りを吸う形にして解消しました。</b>右の技の欄だけがスクロールし、絵とボタンは動きません。案1の「あと◯件」も右の欄に出ます。</p>
<div class="bar">
  <button data-lch="yeti" class="on">イエティ</button>
  <button data-lch="highpriest">高僧</button>
  <button data-lch="harpy">ハーピー（技1つ）</button>
  <button data-lch="knight">騎士</button>
</div>
<div class="landframe" id="landframe"><div class="landinner" id="landinner"></div></div>
<div class="landnote">実機の横持ち（820×380相当）を、画面幅に合わせて縮小表示しています。タップも効きます。</div>
</div>

<div class="sec">
<h2>④ コストの表示案</h2>
<p class="lead">いまは金色の丸に数字だけです。「コスト」と分かるように、4案。<b>キャラ絵の左上に置いた実物</b>で並べました。</p>
<div class="costrow" id="costs"></div>
</div>

<div class="sec">
<h2>⑤ 「Tier」の言い換え案</h2>
<p class="lead">おっしゃるとおり Tier は日本語だとピンときません。5案を実物のチップで並べました。<b>3段のキャラ（騎士＝1段目）と、1種類しかないキャラ（ハーピー）の両方</b>で見てください。</p>
<div id="names"></div>
</div>

<div class="note" id="conc"></div>
</div>

<script>
${R('engine.js')}
</script>
<script>
${R('art.js')}
</script>
<script>
${R('sfx.js')}
</script>
<script>
(function () {
  var E = CB, ART = CBART;
  E.setPool('full');
  var fxl = document.getElementById('fxlayer');
  var sound = false;
  function spd() { return 1; }

${FXS_SRC}
  function fxOf(n) { return FXS[n] || FXS.slash; }

  /* ---- ゲームと同じ見た目の効果を、デモ用に小さく作り直したもの ---- */
  function particles(x, y, color, n, kind) {
    n = Math.round(n * 1.6);
    for (var i = 0; i < n; i++) {
      (function (i) {
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.7;
        var dist = 30 + Math.random() * 80;
        var el = document.createElement('div');
        el.className = 'ptc p-' + (kind || 'spark');
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.style.background = color;
        el.style.boxShadow = '0 0 16px ' + color + ',0 0 30px ' + color;
        fxl.appendChild(el);
        var dy = (kind === 'ember' || kind === 'plus' || kind === 'ray')
          ? -Math.abs(Math.sin(ang)) * dist - 18 : Math.sin(ang) * dist;
        el.animate([{ transform:'translate(0,0) scale(1.1)', opacity:1 },
                    { transform:'translate(' + (Math.cos(ang) * dist) + 'px,' + dy + 'px) scale(.2)', opacity:0 }],
          { duration:720, easing:'cubic-bezier(.15,.8,.3,1)' });
        setTimeout(function () { el.remove(); }, 740);
      })(i);
    }
  }
  function ringWave(x, y, color, size, thick, sub) {
    size = size * 1.5;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size +
      'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;border-radius:50%;pointer-events:none;' +
      'border:' + Math.round((thick || 4) * 1.7) + 'px solid ' + color +
      ';box-shadow:0 0 26px ' + color + ',inset 0 0 18px ' + color + ';';
    fxl.appendChild(d);
    d.animate([{ transform:'scale(.16)', opacity:1 }, { transform:'scale(2.1)', opacity:0 }],
      { duration:880, easing:'cubic-bezier(.15,.85,.3,1)' });
    setTimeout(function () { d.remove(); }, 900);
    if (!sub) setTimeout(function () { ringWave(x, y, color, size * 0.5 / 1.5, (thick || 4) * .6, 1); }, 150);
  }
  function burstRays(x, y, color, n, len) {
    n = n || 10; len = len || 120;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:0;height:0;pointer-events:none;';
    var h = '';
    for (var i = 0; i < n; i++) {
      var a = (360 / n) * i + Math.random() * 8;
      h += '<span style="position:absolute;left:0;top:0;width:' + (len * (0.55 + Math.random() * 0.7)) +
        'px;height:' + (3 + Math.random() * 4) + 'px;margin-top:-2px;transform-origin:0 50%;' +
        'transform:rotate(' + a + 'deg);border-radius:4px;' +
        'background:linear-gradient(90deg,#fff,' + color + ',transparent);' +
        'box-shadow:0 0 18px ' + color + '"></span>';
    }
    wrap.innerHTML = h; fxl.appendChild(wrap);
    wrap.animate([{ transform:'scale(.2)', opacity:1 }, { transform:'scale(1.15)', opacity:0 }],
      { duration:520, easing:'cubic-bezier(.1,.8,.3,1)' });
    setTimeout(function () { wrap.remove(); }, 540);
  }
  function glowBall(x, y, color, size) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size +
      'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,#fff,' + color + ' 45%,transparent 70%);';
    fxl.appendChild(d);
    d.animate([{ transform:'scale(.3)', opacity:1 }, { transform:'scale(1.3)', opacity:0 }], { duration:460 });
    setTimeout(function () { d.remove(); }, 480);
  }
  function slashArc(x, y, color) {
    var d = document.createElement('div'), s = 150;
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + s + 'px;height:' + s +
      'px;margin:' + (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px;border-radius:50%;pointer-events:none;' +
      'border:6px solid transparent;border-top-color:' + color + ';border-right-color:' + color +
      ';box-shadow:0 0 22px ' + color + ';';
    fxl.appendChild(d);
    d.animate([{ transform:'rotate(-60deg) scale(.5)', opacity:1 },
               { transform:'rotate(70deg) scale(1.15)', opacity:0 }],
      { duration:400, easing:'cubic-bezier(.2,.8,.3,1)' });
    setTimeout(function () { d.remove(); }, 420);
  }
  function techRibbon(who, tech, color, big, at) {
    Array.prototype.forEach.call(document.querySelectorAll('.techrib'), function (o) { o.remove(); });
    var d = document.createElement('div');
    d.className = 'techrib' + (big ? ' big' : '') + (at ? ' dtl' : '');
    d.style.setProperty('--c', color);
    if (at) { d.style.left = at.x + 'px'; d.style.top = at.y + 'px'; d.style.maxWidth = at.w + 'px'; }
    d.innerHTML = '<span class="w">' + who + '</span><span class="t">' + tech + '</span><span class="shine"></span>';
    fxl.appendChild(d);
    d.animate([
      { transform:'translate(-50%,0) scale(.62)', opacity:0, filter:'blur(10px)' },
      { transform:'translate(-50%,0) scale(1.14)', opacity:1, filter:'blur(0)', offset:.09 },
      { transform:'translate(-50%,0) scale(1)', opacity:1, offset:.18 },
      { transform:'translate(-50%,0) scale(1)', opacity:1, offset:.82 },
      { transform:'translate(-50%,-20px) scale(.97)', opacity:0 }
    ], { duration:2000, easing:'cubic-bezier(.2,.9,.3,1)' });
    var sh = d.lastChild;
    sh.animate([{ transform:'translateX(-130%) skewX(-18deg)' }, { transform:'translateX(130%) skewX(-18deg)' }],
      { duration:900, delay:180, easing:'cubic-bezier(.3,.1,.2,1)' });
    setTimeout(function () { d.remove(); }, 2060);
  }

  /* ---- ゲーム本体の motionPlay をそのまま持ってきたもの ---- */
  function motionPlay(el, kind) {
    if (!el) return 0;
    el.classList.remove('mo-act', 'mo-chg', 'mo-stk', 'mo-cast');
    void el.offsetWidth;
    el.classList.add('mo-act');
    if (kind === 'cast') {
      el.classList.add('mo-cast');
      setTimeout(function () { el.classList.remove('mo-cast'); }, 520);
      setTimeout(function () { el.classList.remove('mo-act'); }, 700);
      return 300;
    }
    setTimeout(function () { el.classList.add('mo-chg'); }, 70);
    setTimeout(function () { el.classList.remove('mo-chg'); el.classList.add('mo-stk'); }, 330);
    setTimeout(function () { el.classList.remove('mo-stk'); }, 450);
    setTimeout(function () { el.classList.remove('mo-act'); }, 700);
    return 330;
  }

  /* ---- 技を1つ再生する ---- */
  function playSkill(cardEl, d, a, boxEl) {
    var unit = cardEl.querySelector('.art .unit'), art = cardEl.querySelector('.art');
    if (!unit || !art) return;
    var fx = a.fx || (a.kind === 'heal' ? 'heal' : a.kind === 'ward' ? 'ward' : 'slash');
    var f = fxOf(fx);
    var isCast = (f.k === 'magic' || f.k === 'heal' || f.k === 'buff');
    var isSound = (fx === 'discord' || fx === 'screech' || fx === 'frostroar');
    if (sound) { try { SFX.play(fx); } catch (e) {} }

    /* 技名の出し場所：縦持ちは絵の下、横持ちは右の技の欄の上。どちらもキャラに被らない */
    var land = cardEl.classList.contains('land');
    var bd0 = cardEl.querySelector('.dbody').getBoundingClientRect();
    var dm0 = cardEl.querySelector('.dmeta').getBoundingClientRect();
    var at = land
      ? { x: bd0.left + bd0.width / 2, y: bd0.top + 12, w: bd0.width - 18 }
      /* 縦持ちは、キャラ絵のすぐ下＝能力3行の上にかぶせる */
      : { x: dm0.left + dm0.width / 2, y: dm0.top - 2, w: dm0.width - 14 };
    techRibbon(d.name, a.name, f.c, false, at);

    /* 再生中は絵の上の文字を消す */
    cardEl.classList.add('anim');
    clearTimeout(cardEl._animT);
    cardEl._animT = setTimeout(function () { cardEl.classList.remove('anim'); }, 1150);
    if (boxEl) { boxEl.classList.add('playing'); setTimeout(function () { boxEl.classList.remove('playing'); }, 900); }
    var swing = motionPlay(unit, isCast ? 'cast' : 'attack');

    var r = art.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var tx = isCast ? cx : r.left + r.width * 0.76, ty = isCast ? cy : r.top + r.height * 0.48;

    if (isSound) {
      [0, 130, 260].forEach(function (dl, k) {
        setTimeout(function () { ringWave(cx, cy, f.c, 90 + k * 40, 4); }, swing + dl);
      });
      setTimeout(function () { particles(tx, ty, f.c, 8, f.p); }, swing + 120);
      return;
    }
    if (f.k === 'proj') {
      setTimeout(function () {
        glowBall(tx, ty, f.c, 80); burstRays(tx, ty, f.c, 9, 100); particles(tx, ty, f.c, 9, f.p);
      }, swing + 220);
    } else if (f.k === 'heal' || f.k === 'buff') {
      setTimeout(function () { ringWave(cx, cy, f.c, 80, 4); particles(cx, cy, f.c, 10, f.p); }, swing + 60);
    } else if (f.k === 'magic') {
      setTimeout(function () {
        ringWave(tx, ty, f.c, 90, 5); burstRays(tx, ty, f.c, 10, 110); particles(tx, ty, f.c, 11, f.p);
      }, swing + 60);
    } else {
      setTimeout(function () {
        slashArc(tx, ty, f.c); burstRays(tx, ty, '#fff', 8, 100); particles(tx, ty, f.c, 11, f.p);
      }, swing + 30);
    }
    if (f.sh >= 9) setTimeout(function () {
      art.animate([{ transform:'translateX(0)' }, { transform:'translateX(' + (f.sh / 3) + 'px)' },
                   { transform:'translateX(' + (-f.sh / 3) + 'px)' }, { transform:'translateX(0)' }],
        { duration:220 });
    }, swing + 40);
  }

  /* ---- カードを組み立てる ---- */
  var LINES = { '人':{name:'人系',c:'#cfd8ee'}, '獣':{name:'獣系',c:'#ffb07a'}, '神':{name:'神獣系',c:'#ffe08a'},
    '物':{name:'無生物系',c:'#c3cee6'}, '竜':{name:'竜系',c:'#ff8a5a'}, '邪':{name:'邪悪系',c:'#c08cff'},
    '精':{name:'精霊系',c:'#8fdcff'} };
  function chainOf(d) {
    var cur = d, root = d.id, g = 0;
    while (cur && cur.base && g++ < 6) { var b = E.BY_ID[cur.base] || E.TEASER_BY_ID[cur.base]; if (!b) break; root = cur.base; cur = b; }
    var out = [], id = root; g = 0;
    while (id && g++ < 6) { var x = E.BY_ID[id] || E.TEASER_BY_ID[id]; if (!x) break;
      out.push({ id:id, name:x.name, teaser:!E.BY_ID[id] }); id = x.up; }
    return out;
  }
  function atkInfo(d) {
    var a = d.actions[0];
    if (a.kind === 'heal') return { label:'回復', val:a.value, tier:d.atkT, kind:'heal' };
    if (a.dtype === 'mag') return { label:'魔力', val:(a.power != null ? a.power : d.atk), tier:d.atkT, kind:'mag' };
    return { label:'攻撃', val:(a.power != null ? a.power : d.atk), tier:d.atkT, kind:'phys' };
  }
  function actText(d, a) {
    var t = '';
    if (a.kind === 'dmg') t = 'ダメージ ' + (a.power != null ? a.power : d.atk) + '　範囲：' + E.RANGE_TEXT[a.range];
    else if (a.kind === 'heal') t = '回復 ' + a.value + '　対象：' + E.RANGE_TEXT[a.range];
    else if (a.kind === 'revive') t = '自分を犠牲に、倒れた味方1体をHP半分で復活';
    else if (a.kind === 'ward') t = '味方全体の被魔法ダメージ -' + a.value;
    else if (a.kind === 'cover') t = '前後の味方1体の攻撃を肩代わりする';
    else if (a.kind === 'buff') t = '味方全員の' + (a.stat === 'spd' ? '素早さ' : '攻撃') + ' +' + a.value;
    if (a.hits) t += '　×' + a.hits + '回';
    if (a.slow) t += '　＋対象の素早さ-' + a.slow;
    if (a.burn) t += '　＋燃焼' + a.burn;
    return t;
  }

  /* 立ち絵は上を基準に切り抜く。横長に潰れても頭が切れない */
  function portraitTop(id, elem) {
    return ART.portrait(id, elem).replace('preserveAspectRatio="xMidYMid slice"',
                                          'preserveAspectRatio="xMidYMin slice"');
  }
  function buildCard(id, o) {
    o = o || {};
    var d = E.BY_ID[id], ai = atkInfo(d), ln = LINES[d.line] ? d.line : '人', L = LINES[ln];
    var wep = (ART.ART[id] || {}).wep || 'sword';
    var ch = chainOf(d), here = 0;
    ch.forEach(function (x, i) { if (x.id === d.id) here = i; });
    var tierEl = ch.length < 2
      ? '<button class="tierline"><span class="tw">Tier</span><span class="solo">独立系</span><span class="ic">i</span></button>'
      : '<button class="tierline"><span class="tw">Tier</span>' + ch.map(function (x, i) {
          return '<i class="tp' + (i === here ? ' on' : '') + (x.teaser ? ' soon' : '') + '"></i>'; }).join('') +
        '<span class="ic">i</span></button>';

    function stat(lb, num, val, color) {
      var p = '';
      for (var i = 1; i <= 7; i++) p += '<span class="pip' + (i <= val ? ' on' : '') + '"></span>';
      return '<div class="strow z"><span class="lb">' + lb + '</span><span class="nv">' + num + '</span>' +
        '<span class="pips" style="color:' + color + '">' + p + '</span></div>';
    }
    var items = d.actions.map(function (a) { return { kind:'act', a:a }; })
      .concat(d.passives.map(function (k) { return { kind:'pas', p:E.PASSIVES[k] }; })
        .filter(function (x) { return x.p; }));
    var n0 = items.length;
    while (o.pad && items.length < o.pad) {
      items.push({ kind:'act', a:{ key:'x' + items.length, name:'追加の技' + (items.length - n0 + 1),
        kind:'dmg', power:5, range:'any1', fx:'arcanebolt' } });
    }
    var boxes = items.map(function (it, i) {
      return it.kind === 'act'
        ? '<div class="abox" data-act="' + i + '"><div class="an">▸ ' + it.a.name +
          (it.a.cd ? '<span class="badge">' + it.a.cd + 'ラウンドに1回</span>' : '') +
          '</div><div class="ad">' + actText(d, it.a) + '</div></div>'
        : '<div class="pabox"><div class="an">★ ' + it.p.name + '</div><div class="ad">' + it.p.text + '</div></div>';
    }).join('');

    var toc = o.ov === 2 ? '<div class="toc">' + items.map(function (it) {
      return it.kind === 'act' ? '<span>' + it.a.name + '</span>' : '<span class="pa">★' + it.p.name + '</span>';
    }).join('') + '</div>' : '';
    var cnthd = o.ov === 4 ? '<div class="cnthd">技と特殊能力 ぜんぶで <b>' + items.length + '</b> 件<i></i></div>' : '';

    var el = document.createElement('div');
    el.className = 'card-c' + (o.ov ? ' ov' + o.ov : '');
    el.innerHTML =
      '<div class="box detailbox">' +
        '<div class="cardwrap">' +
        '<div class="bigcard' + (d.base ? ' upper' : '') + '">' +
          '<div class="dhead">' +
            '<div class="art"><div class="unit" data-wep="' + wep + '"><div class="pic">' +
              portraitTop(d.id, d.elem) + '</div></div>' +
              '<div class="cost">' + d.cost + '</div>' +
              (o.hint ? '<span class="taphint">タップで再生</span>' : '') +
              '<div class="ovbox"><div class="hd"><h3>' + d.name + '</h3><em>' + d.en + '</em></div>' +
                '<div class="chiprow"><button class="lnchip" style="--lc:' + L.c + '">' +
                  '<i class="lg">' + ln + '</i>' + L.name + '<span class="ic">i</span></button>' +
                  tierEl + '</div></div>' +
            '</div>' +
            '<div class="dmeta">' +
              stat('体力', d.hp, d.hpT, '#7de8a4') +
              stat(ai.label, ai.val, ai.tier, ai.kind === 'heal' ? '#7de8a4' : ai.kind === 'mag' ? '#c98cff' : '#ffb36b') +
              stat('素早', d.spd, d.spd, '#7fd0ff') +
            '</div>' +
          '</div>' + toc + cnthd +
          '<div class="dbody">' + boxes +
            '<div class="flav">' + d.flavor + '</div></div>' +
        '</div>' +
        (o.ov === 1 ? '<button class="morechip">▼ あと<b class="mc"></b>件</button>' : '') +
        (o.ov === 3 ? '<div class="rail"><b></b></div>' : '') +
        '</div>' +
        '<div class="navrow big"><button class="navb wide">◀ 前のカード</button>' +
          '<span class="navpos">13 / 23</span><button class="navb wide">次のカード ▶</button></div>' +
        '<button class="btn ghost" style="width:100%;margin-top:8px">閉じる</button>' +
      '</div>';

    var play = function (idx) {
      var it = items[idx];
      if (!it || it.kind !== 'act') return;
      playSkill(el, d, it.a, el.querySelectorAll('.abox')[
        items.slice(0, idx).filter(function (x) { return x.kind === 'act'; }).length]);
    };
    el.querySelector('.art').onclick = function () { play(0); };
    Array.prototype.forEach.call(el.querySelectorAll('[data-act]'), function (b) {
      b.onclick = function () { play(+b.dataset.act); };
    });
    return { el:el, items:items, card:el.querySelector('.bigcard'),
             body:el.querySelector('.dbody') };
  }

  /* ---- ② デモ ---- */
  var demo = document.getElementById('demo');
  function showChar(id) {
    demo.innerHTML = '';
    var b = buildCard(id, { hint:1, pad:6, ov:1 });
    b.card.style.maxHeight = '560px';
    demo.appendChild(b.el);
    var chip = b.el.querySelector('.morechip'), mc = b.el.querySelector('.mc'), body = b.body;
    var boxes = body.querySelectorAll('.abox,.pabox');
    var upd = function () {
      var br = body.getBoundingClientRect(), n = 0;
      Array.prototype.forEach.call(boxes, function (x) {
        if (x.getBoundingClientRect().bottom > br.bottom + 4) n++; });
      mc.textContent = n;
      chip.style.display = n > 0 ? 'flex' : 'none';
      b.el.classList.toggle('ov1', n > 0);
    };
    body.addEventListener('scroll', upd); setTimeout(upd, 60);
    chip.onclick = function () { body.scrollBy({ top: body.clientHeight * 0.85, behavior:'smooth' }); };
  }
  showChar('yeti');
  Array.prototype.forEach.call(document.querySelectorAll('[data-ch]'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-ch]'), function (o) { o.classList.remove('on'); });
      b.classList.add('on'); showChar(b.dataset.ch);
    };
  });
  document.getElementById('sndb').onclick = function () {
    sound = !sound;
    try { SFX.setEnabled(sound); if (sound) SFX.play('select'); } catch (e) {}
    this.classList.toggle('on', sound);
    this.textContent = sound ? '♪ 音 ON' : '♪ 音を出す';
  };

  /* ---- ① 4案 ---- */
  var OV = [
    [1, '下端に「あと◯件」', '技の欄が続いているときだけ、下端に件数つきのボタンが浮きます。タップすると続きまでスクロールします。<b>何件隠れているかが数字で分かる</b>のが強みです。<b>キャラ絵は固定</b>で、動くのは技の欄だけ。'],
    [2, '技の目次を上に出す', '能力のすぐ下に技名のチップを全件並べます。<b>スクロールしなくても「何を持っているか」は全部見えます。</b>下は各技の詳しい説明。'],
    [3, '右端に残量バー', '細いインジケータで、いまどのあたりを見ていて、あとどれくらい残っているかを示します。<b>いちばん場所を取りません</b>が、件数は分かりません。'],
    [4, '件数の見出し', '技欄の頭に「ぜんぶで◯件」と書くだけ。<b>作るのがいちばん簡単</b>で、下に続くことも同時に伝わります。'],
  ];
  var ovs = document.getElementById('ovs');
  OV.forEach(function (o) {
    var wrap = document.createElement('div');
    wrap.className = 'ph';
    wrap.innerHTML = '<div class="lb"><span class="k">' + o[0] + '</span><span class="t">' + o[1] + '</span></div>' +
      '<div class="scr"></div><div class="dsc">' + o[2] + '</div>';
    var b = buildCard('yeti', { ov:o[0], pad:7 });
    b.card.style.maxHeight = '470px';
    wrap.querySelector('.scr').appendChild(b.el);
    ovs.appendChild(wrap);

    var card = b.card;
    if (o[0] === 1) {
      var chip = b.el.querySelector('.morechip'), mc = b.el.querySelector('.mc');
      var body = b.body, boxes = body.querySelectorAll('.abox,.pabox');
      var upd = function () {
        var br = body.getBoundingClientRect(), n = 0;
        Array.prototype.forEach.call(boxes, function (x) {
          if (x.getBoundingClientRect().bottom > br.bottom + 4) n++; });
        mc.textContent = n;
        chip.style.display = n > 0 ? 'flex' : 'none';
        b.el.classList.toggle('ov1', n > 0);
      };
      body.addEventListener('scroll', upd); setTimeout(upd, 60);
      chip.onclick = function () { body.scrollBy({ top: body.clientHeight * 0.8, behavior:'smooth' }); };
    }
    if (o[0] === 3) {
      var rail = b.el.querySelector('.rail'), railB = rail.querySelector('b'), body3 = b.body;
      var upd3 = function () {
        var r = body3.getBoundingClientRect(), w = b.el.querySelector('.cardwrap').getBoundingClientRect();
        rail.style.top = (r.top - w.top + 4) + 'px';
        rail.style.height = (r.height - 8) + 'px';
        railB.style.height = Math.max(14, body3.clientHeight / body3.scrollHeight * 100) + '%';
        railB.style.top = (body3.scrollTop / body3.scrollHeight * 100) + '%';
      };
      body3.addEventListener('scroll', upd3); setTimeout(upd3, 80);
    }
  });

  /* ---- ③ 横持ち ---- */
  var li = document.getElementById('landinner'), lf = document.getElementById('landframe');
  function showLand(id) {
    li.innerHTML = '';
    var b = buildCard(id, { hint:1, pad:6, ov:1 });
    b.el.classList.add('land');
    li.appendChild(b.el);
    var chip = b.el.querySelector('.morechip'), mc = b.el.querySelector('.mc'), body = b.body;
    var boxes = body.querySelectorAll('.abox,.pabox');
    var upd = function () {
      var br = body.getBoundingClientRect(), n = 0;
      Array.prototype.forEach.call(boxes, function (x) {
        if (x.getBoundingClientRect().bottom > br.bottom + 4) n++; });
      mc.textContent = n;
      chip.style.display = n > 0 ? 'flex' : 'none';
      b.el.classList.toggle('ov1', n > 0);
    };
    body.addEventListener('scroll', upd); setTimeout(upd, 80);
    chip.onclick = function () { body.scrollBy({ top: body.clientHeight * 0.85, behavior:'smooth' }); };
  }
  function fitLand() {
    var s = Math.min(1, lf.clientWidth / 820);
    li.style.transform = 'scale(' + s + ')';
    lf.style.height = (380 * s) + 'px';
  }
  showLand('yeti'); fitLand();
  window.addEventListener('resize', fitLand);
  Array.prototype.forEach.call(document.querySelectorAll('[data-lch]'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-lch]'), function (o) { o.classList.remove('on'); });
      b.classList.add('on'); showLand(b.dataset.lch); fitLand();
    };
  });

  /* ---- ④ コスト表示案 ---- */
  var COSTS = [
    ['', '現行', '数字だけ。何の数字か分からない'],
    ['c1', '案A 丸ごと横長に', '「コスト 5」を1つの丸みのある帯に。いちばん素直'],
    ['c2', '案B 角丸の札', '同じ内容を角丸の札で。カードの他の表示と揃う'],
    ['c3', '案C 丸の下に小さく', '丸はそのまま残し、下に小さくラベル。今の見た目を保てる'],
    ['c4', '案D 上下2段', 'ラベルを上、数字を下に。数字がいちばん大きく見える'],
  ];
  var cr = document.getElementById('costs');
  COSTS.forEach(function (c) {
    var cell = document.createElement('div');
    cell.className = 'costcell';
    cell.innerHTML = '<div class="cap2">' + c[1] + '<em>' + c[2] + '</em></div>' +
      '<div class="card-c ' + c[0] + '"><div class="bigcard"><div class="miniart art">' +
        portraitTop('yeti', 'ice') + '<div class="cost">5</div></div></div></div>';
    cr.appendChild(cell);
  });

  /* ---- ⑤ 言い換え案 ---- */
  var NAMES = [
    ['Tier', '独立系', '現行', 'ゲーム好きには通じるが、日本語としては意味が取りにくい。'],
    ['ランク', '単独', '案A', 'いちばん一般的で短い。ただし「強さの評価」に聞こえ、強化の段階という意味は少し薄い。'],
    ['段位', '単独', '案B（おすすめ）', '初段・二段と同じ言い方。<b>「強さの階段の何段目か」がそのまま伝わる</b>。和風ファンタジーとも相性が良い。'],
    ['クラス', 'なし', '案C', 'ご提案の案。ただしRPGでは「クラス＝職業（戦士・魔法使い）」の意味が強く、<b>すでにある「系統（人系・獣系）」と紛らわしい</b>のが心配。'],
    ['進化', 'なし', '案D', 'いちばん直感的。ただし騎士→聖騎士は「同じ個体が進化した」わけではなく別キャラなので、意味が少しずれる。'],
  ];
  var nb = document.getElementById('names');
  NAMES.forEach(function (n) {
    var row = document.createElement('div');
    row.className = 'nrow';
    row.innerHTML = '<div class="nh"><b>' + n[2] + '</b><span>' + n[0] + '</span></div>' +
      '<div class="nchips">' +
        '<button class="tierline"><span class="tw">' + n[0] + '</span>' +
          '<i class="tp on"></i><i class="tp"></i><i class="tp soon"></i>' +
          '<span class="ic">i</span></button>' +
        '<button class="tierline"><span class="tw">' + n[0] + '</span>' +
          '<span class="solo">' + n[1] + '</span><span class="ic">i</span></button>' +
      '</div><div class="ndsc">' + n[3] + '</div>';
    nb.appendChild(row);
  });

  document.getElementById('conc').innerHTML =
    '<b>調べた結果</b><br>' +
    '<b>② は作り直しがほぼ不要です。</b>いま戦闘で使っている行動モーション（<code>motionPlay</code>）、技名カットイン、効果音、着弾エフェクトは、すべて詳細画面にそのまま持ち込めます。' +
    'このデモも、モーションのCSSと効果音はゲーム本体のファイルをそのまま読み込んで動かしています。' +
    '必要な変更は「キャラ絵を <code>.unit</code> として包む」ことだけで、実装量は小さいです。<br><br>' +
    '<b>ひとつ判断が要る点。</b>戦闘中は効果が「相手」に飛びますが、詳細画面には相手がいません。' +
    'このデモでは、物理技は絵の前方（右寄り）に、魔法・回復は自分の中心に効果を出しています。' +
    '「素振り」として見せるか、的になる影を置くか、好みが分かれるところです。<br><br>' +
    '<b>① は4案とも実装できます。</b>私の推しは <b>案2（技の目次）</b>です。' +
    '「隠れていることを伝える」だけでなく<b>「隠れていても中身は分かる」</b>ところまで解決できるからです。' +
    '案1は件数がはっきり分かるので次点。案4はいちばん簡単なので、まず案4を入れて様子を見るのも手です。' +
    '案2と案1・案4は同時に入れても喧嘩しません。';
})();
</script>
`;

fs.writeFileSync(__dirname + '/../demoC.html', page);
console.log('demoC.html  ' + (page.length / 1024).toFixed(0) + ' KB');
