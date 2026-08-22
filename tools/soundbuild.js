/* 効果音だけを試聴できる単体ページを作る */
const fs = require('fs');
const sfx = fs.readFileSync(__dirname + '/../src/sfx.js', 'utf8');

const GROUPS = [
  ['剣・槍', [['slash', '斬撃／戦士'], ['pierce', '刺突／騎士'], ['lance', '長槍突き／槍兵'],
             ['sweep', '薙ぎ払い／狂戦士'], ['holystrike', '聖なる一撃／パラディン']]],
  ['打撃・爪', [['bash', '盾殴り／盾騎士'], ['smash', '叩き潰し／オーガ'], ['rock', '岩石打／ゴーレム'],
               ['horn', '角突き／ミノタウロス'], ['wallop', '豪腕／トロール'],
               ['claw', '裂爪／人狼'], ['dclaw', '竜爪／ドラゴン'], ['guard', '防御']]],
  ['射る・投げる', [['arrow', '射抜き／弓使い'], ['spear', '天翔ける槍／ヴァルキリー'],
                   ['dagger', '投げ短剣／盗賊'], ['mark', '死の刻印／暗殺者']]],
  ['炎', [['firebolt', 'ファイアボルト／魔法使い'], ['breath', '業火のブレス／ドラゴン'],
          ['purge', '浄化の炎／フェニックス'], ['meteor', 'メテオ／アークメイジ'], ['fire', '炎（汎用）']]],
  ['氷', [['frost', 'フロストノヴァ／魔法使い'], ['blizzard', '氷嵐／氷精霊'], ['ice', '氷（汎用）']]],
  ['闇・呪い', [['doom', '死の宣告／リッチ'], ['grasp', '亡者の手／ネクロマンサー'],
               ['hex', '呪縛／シャーマン'], ['shadow', '闇（汎用）']]],
  ['光・自然・音', [['holy', '聖光／僧侶'], ['logos', '理の光／賢者'], ['arcanebolt', '秘術の矢／アークメイジ'],
                   ['thorn', '茨の呪縛／ドルイド'], ['screech', 'かく乱の叫び／ハーピー'],
                   ['discord', '不協和音／吟遊詩人'], ['wind', '風（汎用）'], ['blood', '吸血の牙／ヴァンパイア'],
                   ['earth', '大地（汎用）'], ['arcane', '秘術（汎用）']]],
  ['命中音（当たった瞬間）', [['i_cut', '斬られる'], ['i_stab', '突き刺さる'], ['i_arrow', '矢が刺さる'],
                             ['i_rip', '引き裂かれる'], ['i_crush', '打ち砕かれる'], ['i_ice', '凍りつく'],
                             ['i_fire', '燃える'], ['i_arcane', '魔力が弾ける'], ['i_dark', '呪いが染みる'],
                             ['i_light', '光に灼かれる'], ['i_wet', '湿った衝撃'], ['i_gust', '突風'],
                             ['i_thorn', '棘が刺さる'], ['critboom', '痛恨（重ねる音）']]],
  ['支援・進行', [['heal', '回復'], ['ward', '結界'], ['revive', '蘇生'],
                 ['death', '撃破'], ['execute', '首狩り'],
                 ['round', 'ラウンド開始'], ['start', '戦闘開始'], ['win', '勝利'], ['lose', '敗北'],
                 ['select', '選択'], ['ui', 'ボタン']]]
];

const body = GROUPS.map(([g, list]) =>
  '<section><h2>' + g + '</h2><div class="grid">' +
  list.map(([k, n]) => '<button data-s="' + k + '"><b>' + n + '</b><small>' + k + '</small></button>').join('') +
  '</div></section>').join('');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#070910">
<title>ARCANA CLASH ─ サウンド確認</title>
<style>
:root{--gold:#f0c040}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:radial-gradient(120% 90% at 50% 0%,#131a2c 0%,#070910 70%);
  color:#e8eefc;font-family:"Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif;
  padding:18px 14px 60px;max-width:620px;margin:0 auto}
h1{font-size:19px;letter-spacing:.12em;margin:0 0 4px}
p.lead{font-size:12px;color:#8fa0c0;line-height:1.7;margin:0 0 18px}
h2{font-size:12px;letter-spacing:.18em;color:var(--gold);margin:22px 0 9px;
  border-left:3px solid var(--gold);padding-left:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:9px}
button{appearance:none;cursor:pointer;text-align:left;padding:11px 12px;border-radius:12px;
  background:linear-gradient(180deg,#161d31,#0d1322);border:1px solid #2c3854;color:#e8eefc;
  font-family:inherit;transition:transform .08s,border-color .15s,box-shadow .15s}
button b{display:block;font-size:13.5px;font-weight:800}
button small{display:block;font-size:10px;color:#7686a6;margin-top:2px;letter-spacing:.06em}
button:active{transform:scale(.96)}
button.on{border-color:var(--gold);box-shadow:0 0 18px rgba(240,192,64,.35)}
.note{margin-top:26px;font-size:11px;color:#66748f;line-height:1.8}
</style>
</head>
<body>
<h1>ARCANA CLASH ─ サウンド確認</h1>
<p class="lead">ゲーム本体と同じ合成音です。タップすると鳴ります（端末の消音スイッチにご注意ください）。</p>
${body}
<p class="note">すべて WebAudio でその場から合成しているため、音声ファイルは1つも入っていません。<br>
技ごとに音を作り分けています。たとえば「射抜き」は弓のしなり→弦のビィン→頭上を過ぎるヒュンッで、当たった瞬間は「矢が刺さる」（ドスッ＋矢柄の震え）が鳴ります。<br>「フロストノヴァ」は冷気を吸い込んでから凍りつき、当たった瞬間は「凍りつく」（氷が割れるパキンッ＋こぼれる破片）です。</p>
<script>
${sfx}
</script>
<script>
document.addEventListener('pointerdown', function once(){ SFX.unlock(); document.removeEventListener('pointerdown', once); });
document.querySelectorAll('[data-s]').forEach(function (b) {
  b.onclick = function () {
    SFX.unlock(); SFX.play(b.dataset.s);
    b.classList.add('on'); setTimeout(function(){ b.classList.remove('on'); }, 260);
  };
});
</script>
</body>
</html>`;

fs.writeFileSync(__dirname + '/../サウンド確認.html', html);
console.log('built サウンド確認.html', (html.length / 1024).toFixed(1) + ' KB');
