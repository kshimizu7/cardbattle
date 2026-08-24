/* BGM の試聴ページを組み立てる。 node tools/bgmdemo.js → bgm.html */
const fs = require('fs');
const BGMJS = fs.readFileSync(__dirname + '/../src/bgm.js', 'utf8');

const page = `<title>BGM試聴</title>
<style>
:root{
  --ground:#080b12; --panel:#0d1220; --panel2:#111a2c;
  --line:#1e2740; --line2:#2b3752;
  --ink:#dde5f5; --ink2:#94a4c4; --ink3:#6c7b9c;
  --gold:#f2c65c; --gold-dim:#a98a34;
  --up:#ff8f6a; --up-dim:#8a4526;
  --mid:#7fd4ff; --mid-dim:#2b6285;
  --font:"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;padding:0 0 80px;background:var(--ground);color:var(--ink);
  font-family:var(--font);font-size:14.5px;line-height:1.95;-webkit-font-smoothing:antialiased}
.w{max-width:820px;margin:0 auto;padding:30px 18px 0}
.eyebrow{font-size:10.5px;font-weight:900;letter-spacing:.18em;color:var(--gold-dim);margin:0 0 6px}
h1{font-size:25px;font-weight:900;margin:0 0 10px;color:var(--gold);line-height:1.4;text-wrap:balance}
h2{font-size:16.5px;font-weight:900;color:var(--gold);margin:46px 0 6px;padding-top:22px;
  border-top:1px solid var(--line)}
p{margin:0 0 14px;max-width:64ch}
p.sub{font-size:13px;color:var(--ink2);max-width:62ch}
b{color:#ffeec2;font-weight:900}

/* 音量 */
.volbar{display:flex;align-items:center;gap:12px;margin:20px 0 0;
  background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px}
.volbar label{font-size:11.5px;font-weight:900;color:var(--ink3);letter-spacing:.05em;white-space:nowrap}
.volbar input{flex:1;accent-color:var(--gold);min-width:0}
.volbar .pct{font-size:12px;font-weight:900;color:var(--gold);
  font-variant-numeric:tabular-nums;min-width:3.4em;text-align:right}

/* 曲カード */
.song{background:var(--panel);border:1px solid var(--line);border-radius:14px;
  padding:18px 20px;margin:16px 0;position:relative;overflow:hidden}
.song.up{border-left:3px solid var(--up)}
.song.mid{border-left:3px solid var(--mid)}
.song .hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:2px}
.song .hd h3{font-size:17px;font-weight:900;margin:0;color:var(--ink)}
.song.up .hd h3{color:var(--up)}
.song.mid .hd h3{color:var(--mid)}
.song .hd .use{font-size:11px;font-weight:900;letter-spacing:.04em;color:var(--ink3);
  border:1px solid var(--line2);border-radius:999px;padding:1px 9px}
.song .spec{font-size:11.5px;color:var(--ink3);margin:0 0 14px;
  font-variant-numeric:tabular-nums;letter-spacing:.02em}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.pb{flex:1 1 190px;display:flex;align-items:center;gap:11px;cursor:pointer;
  font-family:inherit;font-size:13.5px;font-weight:900;color:var(--ink);
  background:var(--panel2);border:1px solid var(--line2);border-radius:11px;
  padding:11px 14px;text-align:left;transition:border-color .15s,background .15s}
.pb:hover{border-color:var(--gold-dim)}
.pb:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.pb .ic{width:26px;height:26px;flex:0 0 26px;border-radius:50%;display:grid;place-items:center;
  background:var(--gold);color:#0a0d16;font-size:11px;line-height:1}
.pb small{display:block;font-size:10.5px;font-weight:800;color:var(--ink3);margin-top:1px}
.song.up .pb.on{border-color:var(--up);background:rgba(255,143,106,.1)}
.song.mid .pb.on{border-color:var(--mid);background:rgba(127,212,255,.1)}
.song.up .pb.on .ic{background:var(--up)}
.song.mid .pb.on .ic{background:var(--mid)}

/* 波形 */
.viz{height:44px;margin-top:15px;display:flex;align-items:flex-end;gap:2px;opacity:.25;
  transition:opacity .3s}
.viz.on{opacity:1}
.viz i{flex:1;background:linear-gradient(180deg,var(--gold),var(--gold-dim));
  border-radius:1.5px;height:2px;transition:height .07s linear}
.song.up .viz i{background:linear-gradient(180deg,var(--up),var(--up-dim))}
.song.mid .viz i{background:linear-gradient(180deg,var(--mid),var(--mid-dim))}

/* 表・注記 */
.tw{overflow-x:auto;margin:16px 0 6px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:12.5px}
th,td{text-align:left;padding:9px 13px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:var(--panel2);color:var(--ink2);font-size:11px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
td.k{font-weight:900;color:var(--ink);white-space:nowrap}
td.ch{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--gold);letter-spacing:.04em}
ul.pl{margin:0 0 14px;padding-left:1.15em}
ul.pl li{margin-bottom:8px;font-size:13px;color:var(--ink2);max-width:62ch}
ul.pl b{color:#ffeec2}
.note{font-size:11.5px;color:var(--ink3);line-height:1.85;margin:8px 0 0}
</style>

<div class="w">
<p class="eyebrow">ARCANA CLASH ／ 音楽</p>
<h1>BGMの試作</h1>
<p class="sub">アップテンポとミドルテンポを1曲ずつ作りました。それぞれ<b>オーケストラ風</b>と<b>チップチューン風</b>の2つの音色で聴けます。<b>音声ファイルではなく、効果音と同じくその場で合成しています</b>ので、ゲームに入れても<b>容量はほぼ増えません</b>。</p>

<div class="volbar">
  <label for="vol">音量</label>
  <input id="vol" type="range" min="0" max="100" value="50">
  <span class="pct" id="volp">50%</span>
</div>

<div class="song up" data-song="up">
  <div class="hd"><h3>アップテンポ</h3><span class="use">戦闘中</span></div>
  <p class="spec">148 BPM ／ イ短調 ／ 8小節ループ</p>
  <div class="btns">
    <button class="pb" data-tone="orch"><span class="ic">▶</span><span>オーケストラ風<small>弦と金管、残響あり</small></span></button>
    <button class="pb" data-tone="chip"><span class="ic">▶</span><span>チップチューン風<small>矩形波、レトロRPG寄り</small></span></button>
  </div>
  <div class="viz"></div>
</div>

<div class="song mid" data-song="mid">
  <div class="hd"><h3>ミドルテンポ</h3><span class="use">タイトル／編成</span></div>
  <p class="spec">92 BPM ／ イ短調 ／ 8小節ループ</p>
  <div class="btns">
    <button class="pb" data-tone="orch"><span class="ic">▶</span><span>オーケストラ風<small>ハープと笛、太鼓</small></span></button>
    <button class="pb" data-tone="chip"><span class="ic">▶</span><span>チップチューン風<small>矩形波、レトロRPG寄り</small></span></button>
  </div>
  <div class="viz"></div>
</div>

<p class="note">最初の8小節は伴奏だけで、<b>2周目から旋律が乗ります。</b>ループの継ぎ目が分かりにくくなるようにしてあるので、1分ほど流したままにして聴いてみてください。</p>

<h2>中身</h2>
<div class="tw">
<table>
<thead><tr><th></th><th>アップテンポ</th><th>ミドルテンポ</th></tr></thead>
<tbody>
<tr><td class="k">用途</td><td>戦闘中</td><td>タイトル／編成</td></tr>
<tr><td class="k">速さ</td><td>148 BPM</td><td>92 BPM</td></tr>
<tr><td class="k">コード進行</td><td class="ch">Am F G Em<br>Am F C E</td><td class="ch">Am C F G<br>Dm Am E Am</td></tr>
<tr><td class="k">低音</td><td>8分刻み、4つ目でオクターブ跳ね</td><td>長く伸ばす、途中で5度へ</td></tr>
<tr><td class="k">刻み</td><td>16分の分散和音</td><td>8分のハープ</td></tr>
<tr><td class="k">打楽器</td><td>キック・スネア・ハイハット</td><td>太鼓と鈴のみ（2周目から）</td></tr>
<tr><td class="k">旋律</td><td>2周目から、跳ねる動き</td><td>2周目から、間を多めに</td></tr>
</tbody>
</table>
</div>
<p class="note">どちらもイ短調で、最後の小節だけ<b>ホ長調（和声的短音階のドミナント）</b>に寄せています。ここが「次の周へ戻りたくなる」引っぱりを作っていて、ファンタジーらしさの正体でもあります。</p>

<h2>この方式にした理由</h2>
<ul class="pl">
  <li><b>容量がほぼゼロ。</b>ゲームは1ファイル完結で、いまの <code>index.html</code> は464KBです。MP3を2曲入れると<b>それだけで2MB前後</b>増えます（埋め込むと約1.33倍になるため）。合成なら<b>コードの数KBだけ</b>で済みます。</li>
  <li><b>権利がきれい。</b>私が組んだ音の設計なので、素材サイトのライセンスも、AI生成物の著作権の問題も発生しません。</li>
  <li><b>後から変えられる。</b>テンポ、調、楽器、音量バランスを数値で持っているので、「もう少し速く」「打楽器を減らして」が数字の変更だけで済みます。書き出した音声ファイルだと作り直しになります。</li>
  <li><b>状況で変化させられる。</b>同じ仕組みなので、たとえば<b>HPが減ったらテンポを上げる／楽器を足す</b>といったことが後からできます。今回は入れていません。</li>
</ul>

<h2>気になっているところ</h2>
<ul class="pl">
  <li><b>合成音なので、生楽器の質感は出ません。</b>矩形波と鋸波を加工して作っているぶん、市販ゲームのオーケストラ音源のような厚みはありません。チップチューン風のほうは、むしろその制約が持ち味になっています。</li>
  <li><b>ループが8小節と短めです。</b>長時間流すと繰り返しに気づかれます。伸ばすことは簡単にできるので、必要なら言ってください。</li>
  <li><b>効果音と同時に鳴ったときの音量バランスは、まだ調整していません。</b>実際にゲームへ入れてから合わせる必要があります。</li>
</ul>

<script>
${BGMJS}
</script>
<script>
(function () {
  var BARS = 24, cur = null, raf = null;
  var songs = Array.prototype.slice.call(document.querySelectorAll('.song'));

  songs.forEach(function (sec) {
    var viz = sec.querySelector('.viz');
    for (var i = 0; i < 28; i++) viz.appendChild(document.createElement('i'));

    sec.querySelectorAll('.pb').forEach(function (btn) {
      btn.onclick = function () {
        var id = sec.dataset.song, tone = btn.dataset.tone;
        var same = cur && cur.id === id && cur.tone === tone;
        clearAll();
        if (same) { BGM.stop(); cur = null; return; }
        BGM.play(id, tone);
        cur = { id: id, tone: tone };
        btn.classList.add('on');
        btn.querySelector('.ic').textContent = '■';
        sec.querySelector('.viz').classList.add('on');
        loop();
      };
    });
  });

  function clearAll() {
    document.querySelectorAll('.pb.on').forEach(function (b) {
      b.classList.remove('on'); b.querySelector('.ic').textContent = '▶';
    });
    document.querySelectorAll('.viz.on').forEach(function (v) { v.classList.remove('on'); });
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    document.querySelectorAll('.viz i').forEach(function (b) { b.style.height = '2px'; });
  }

  function loop() {
    var an = BGM.analyser();
    var data = new Uint8Array(an.frequencyBinCount);
    var bars = null;
    (function step() {
      if (!cur) return;
      if (!bars) {
        var sec = document.querySelector('.song[data-song="' + cur.id + '"]');
        bars = Array.prototype.slice.call(sec.querySelectorAll('.viz i'));
      }
      an.getByteFrequencyData(data);
      for (var i = 0; i < bars.length; i++) {
        /* 低域を細かく、高域をまとめて見せる */
        var lo = Math.floor(Math.pow(i / bars.length, 2) * 200) + 1;
        var hi = Math.floor(Math.pow((i + 1) / bars.length, 2) * 200) + 2;
        var m = 0;
        for (var k = lo; k < hi && k < data.length; k++) if (data[k] > m) m = data[k];
        bars[i].style.height = Math.max(2, m / 255 * 44) + 'px';
      }
      raf = requestAnimationFrame(step);
    })();
  }

  var vol = document.getElementById('vol'), volp = document.getElementById('volp');
  vol.oninput = function () {
    volp.textContent = vol.value + '%';
    BGM.setVolume(vol.value / 100);
  };
})();
</script>
</div>
`;

fs.writeFileSync(__dirname + '/../bgm.html', page);
console.log('bgm.html  ' + (page.length / 1024).toFixed(1) + ' KB');

/* 配布用に、文字コード宣言を含む完全なHTMLも書き出す */
const SA = require('./standalone.js');
fs.mkdirSync(__dirname + '/../standalone', { recursive: true });
fs.writeFileSync(__dirname + '/../standalone/bgm.html',
  SA.wrap(page, 'bgm'), 'utf8');
console.log('  standalone/bgm.html も書き出しました');
