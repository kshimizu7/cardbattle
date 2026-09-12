const fs = require('fs');
const R = f => fs.readFileSync(__dirname + '/src/' + f, 'utf8');

/* ★ 版番号。中身を変えたらここを上げる。Driveには 版/ArcanaClash_v○○.html として残す */
const VERSION = process.env.CBVER || '21';

/* RPGモード：探索ページをまるごと文字列として埋め込み、iframe（srcdoc）で開く */
require('child_process').execSync('node ' + __dirname + '/tools/rpgexp.js', { stdio: 'inherit' });
const ART_FILES = { title: 'title_vot', beast: 'entry_beast', mine: 'entry_mine',
                    maze: 'entry_maze', shrine: 'entry_shrine',
                    /* 闘技場の帯。開くたびに3枚から1枚を選ぶ */
                    arena1: 'arena_bright', arena2: 'arena_ruin', arena3: 'arena_sky' };
/* 描き下ろしのキャラ絵。art/cut/<id>.webp（マゼンタを抜いた切り抜き、RGBA）を置くだけで差し替わる。
   置いていない者は、いままでの線画のまま。
   v92: 背景込みの art/char から、切り抜きの art/cut に切り替え（地・枠・縁の光はCSSで重ねる） */
const CHARDIR = __dirname + '/art/cut';
const CHARJS = (function () {
  let files = [];
  try { files = fs.readdirSync(CHARDIR).filter(f => /\.webp$/i.test(f)); } catch (e) { return 'window.VOT_CHAR = {};'; }
  const body = files.map(f =>
    JSON.stringify(f.replace(/\.webp$/i, '')) + ':"data:image/webp;base64,' +
    fs.readFileSync(CHARDIR + '/' + f).toString('base64') + '"').join(',');
  console.log('キャラ絵 ' + files.length + ' 体を埋め込みます（' +
    files.map(f => f.replace(/\.webp$/i, '')).join('・') + '）');
  return 'window.VOT_CHAR = {' + body + '};';
})();

/* v92: 段の枠（3段）と、系譜ごとの背景色 */
const UIJS = 'window.VOT_UI = {' + [1, 2, 3].map(t =>
  '"frame' + t + '":"data:image/webp;base64,' +
  fs.readFileSync(__dirname + '/art/ui/frame_t' + t + '.webp').toString('base64') + '"'
).join(',') + '};\n' +
  'window.VOT_BG = ' + fs.readFileSync(__dirname + '/art/bg_colours.json', 'utf8') + ';\n' +
  /* v95: 盤面での切り出し（top＝膝上から上を大きく／big＝全身のまま大きく） */
  'window.VOT_VIEW = ' + fs.readFileSync(__dirname + '/art/board_view.json', 'utf8') + ';\n' +
  /* v101: 顔の中心（絵の中の割合 x,y）。紹介の札で顔を決まった位置に置くため */
  'window.VOT_FACE = ' + fs.readFileSync(__dirname + '/art/face.json', 'utf8') + ';';

const ARTJS = 'window.VOT_ART = {' + Object.keys(ART_FILES).map(k =>
  JSON.stringify(k) + ':"data:image/webp;base64,' +
  fs.readFileSync(__dirname + '/art/' + ART_FILES[k] + '.webp').toString('base64') + '"'
).join(',') + '};';

const RPGJS = 'window.RPG_PAGE = '
  + JSON.stringify(fs.readFileSync(__dirname + '/rpgexp.html', 'utf8')).replace(/<\//g, '<\\/')
  + ';';

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#070910">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="ARCANA CLASH — 6体編成の陣形カードバトル。スマホ1台でふたり対戦、またはCPU対戦。">
<meta name="app-version" content="${VERSION}">
<title>ARCANA CLASH ─ アルカナ・クラッシュ</title>
<style>
${R('style.css')}
</style>
</head>
<body>
<div id="app"></div>
<div id="fxlayer"></div>
<div id="marklayer"></div>
<script>
${R('engine.js')}
</script>
<script>
${R('ai.js')}
</script>
<script>
${R('gear.js')}
</script>
<script>
${R('save.js')}
</script>
<script>
${R('sfx.js')}
</script>
<script>
${R('bgm.js')}
</script>
<script>
${R('art.js')}
</script>
<script>
${R('teamname.js')}
</script>
<script>
${CHARJS}
${UIJS}
${ARTJS}
</script>
<script>
${RPGJS}
</script>
<script>
${R('ui.js')}
</script>
</body>
</html>`;

/* index.html … GitHub Pages が配信する本体（リポジトリに入る）
   ArcanaClash.html / dist … Drive 配布用のコピー（.gitignore 済み） */
fs.writeFileSync(__dirname + '/index.html', html);
fs.writeFileSync(__dirname + '/ArcanaClash.html', html);
fs.mkdirSync(__dirname + '/dist', { recursive: true });
fs.writeFileSync(__dirname + '/dist/ArcanaClash_v' + VERSION + '.html', html);
console.log('built v' + VERSION + '  ' + (html.length / 1024).toFixed(1) + ' KB');
console.log('  index.html            … GitHub Pages 用');
console.log('  ArcanaClash.html      … Drive 最新版用');
console.log('  dist/ArcanaClash_v' + VERSION + '.html … Drive 版フォルダ用');
