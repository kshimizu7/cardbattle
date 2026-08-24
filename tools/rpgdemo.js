/* RPGモード ダンジョン探索画面の案。
   node tools/rpgdemo.js → rpgdemo.html
   ・縦持ちのマップの出し方を2案、その場で切り替えて比べられる
   ・語りと選択肢は実際に遊べる（結果は重み付き抽選）
   ・戦闘は既存のバトル画面に入る想定なので、ここでは入口だけ */
const fs = require('fs');
const R = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');

/* ============ ダンジョン ============
   # = 部屋 / . = 岩盤 / S = 入口 / B = 主の間                       */
const MAP = [
  '..B..',
  '#####',
  '#...#',
  '#####',
  '..S..'
];

/* ============ 語りと選択肢 ============
   w = 重み（抽選の出やすさ）。eff = 結果に起きること。               */
const EVENTS = {
  start: {
    title: '洞窟の入口',
    text: '苔むした石の門の前に立っている。奥から流れ出る空気は湿っていて、獣の匂いが混じっている。'
        + '背筋が凍るが、引き返すには村人たちの顔が浮かびすぎた。',
    choices: [
      { label: 'そのまま踏み込む', out: [
        { w: 70, t: '一行は静かに闇へ入った。足音は思ったより響かない。', eff: {} },
        { w: 30, t: '踏み込んだ瞬間、天井から砂がこぼれ落ちた。何かが、こちらに気づいている。', eff: { alert: 1 } }
      ]},
      { label: '鬨の声を上げる', out: [
        { w: 40, t: '声は洞を巡って返ってきた。腹の底が据わる。全員の体力の上限が1上がった。', eff: { maxHp: 1, hp: 1 } },
        { w: 35, t: '声はむなしく吸い込まれ、何も返ってこなかった。', eff: {} },
        { w: 25, t: '返ってきたのは、こちらより遥かに大きな咆哮だった。奥のものが目を覚ました。', eff: { alert: 2 } }
      ]},
      { label: '松明を掲げて中をうかがう', need: 'torch', out: [
        { w: 60, t: '足元に、落とし穴の縁が浮かび上がった。危ういところだった。', eff: { info: '落とし穴の位置を覚えた' } },
        { w: 40, t: '照らし出されたのは、壁一面に刻まれた古い文字だけだった。', eff: { info: '壁の文字を書き写した' } }
      ]}
    ]
  },

  water: {
    title: '水の滴る広間',
    text: '天井から絶え間なく水が落ち、床に浅い池をつくっている。水は驚くほど澄んでいて、'
        + '底に何かが沈んでいるのが見える。だが、この深さの洞窟に湧く水がただの水であるはずもない。',
    choices: [
      { label: '水を飲んで喉を潤す', out: [
        { w: 55, t: '冷たい水が体に染みわたる。傷が少し塞がった。', eff: { heal: 4 } },
        { w: 45, t: '飲んだ直後、喉の奥が焼けるように痛んだ。鉄の味がする。', eff: { dmg: 3 } }
      ]},
      { label: '池の底を探る', out: [
        { w: 50, t: '指先が硬いものに触れた。泥を落とすと、古い短剣が現れた。', eff: { item: 'dagger' } },
        { w: 30, t: '掴んだのは、water に沈んだ誰かの手だった。慌てて引き上げる。何も得られない。', eff: {} },
        { w: 20, t: '池の底が抜けた。落ちながら、水面が遠ざかるのを見た。', eff: { dmg: 5 } }
      ]},
      { label: '触れずに通り過ぎる', out: [
        { w: 100, t: '賢明だった、と思うことにした。一行は池を迂回して先へ進む。', eff: {} }
      ]}
    ]
  },

  traveler: {
    title: '朽ちた旅人',
    text: '壁に背を預けたまま動かない人影がある。装備は上等だが、もう長いことここにいるらしい。'
        + '——と思ったところで、その指がわずかに動いた。',
    choices: [
      { label: '声をかける', out: [
        { w: 65, t: '「……奥へ、行くな」それだけ言って、旅人は息を引き取った。'
               + '握られていた鍵が、手のひらから落ちる。', eff: { item: 'key', info: '奥に扉があるらしい' } },
        { w: 35, t: '旅人は薄く目を開け、笑ったように見えた。次の瞬間には、もう冷たくなっていた。', eff: {} }
      ]},
      { label: '荷を漁る', out: [
        { w: 60, t: '革袋から、まだ使える薬がひと瓶。旅人は最後まで手放さなかったらしい。', eff: { item: 'potion' } },
        { w: 40, t: '荷はとうに誰かが漁った後だった。残っていたのは、濡れた手紙が一通。', eff: { info: '手紙：「三つ目の広間に近づくな」' } }
      ]},
      { label: '弔ってから進む', out: [
        { w: 100, t: '石を積み、名も知らぬ旅人に手を合わせた。'
               + '不思議と、一行の足取りは軽くなった。', eff: { heal: 2, bless: 1 } }
      ]}
    ]
  },

  altar: {
    title: '石の祭壇',
    text: '広間の中央に、黒い石を削り出した祭壇がある。表面には血とも錆ともつかない染みが'
        + '幾重にも重なっていて、その上に、まだ新しいものもある。',
    choices: [
      { label: '血を一滴、捧げる', out: [
        { w: 55, t: '祭壇が低く鳴った。体は軽くなり、拳に力がこもる。', eff: { dmg: 2, atkUp: 1 } },
        { w: 45, t: '祭壇は何も応えなかった。傷だけが残る。', eff: { dmg: 2 } }
      ]},
      { label: '祭壇を打ち壊す', out: [
        { w: 45, t: '石が割れ、中から鈍く光る石が転がり出た。', eff: { item: 'gem' } },
        { w: 55, t: '砕けた瞬間、冷たいものが背を這った。奥から、何かが近づいてくる。', eff: { alert: 2 } }
      ]},
      { label: '何もせず立ち去る', out: [
        { w: 100, t: '触れないという判断もまた、判断である。一行は祭壇に背を向けた。', eff: {} }
      ]}
    ]
  },

  chasm: {
    title: '地割れ',
    text: '通路を断ち切るように、幅3歩ほどの裂け目が口を開けている。底は見えない。'
        + '向こう側には、明らかに人の手が入った石畳が続いている。',
    choices: [
      { label: '走って飛び越える', out: [
        { w: 65, t: '全員、危なげなく渡りきった。', eff: {} },
        { w: 35, t: '最後の一人が縁を踏み外し、片腕でぶら下がった。引き上げたが、痛手を負った。', eff: { dmg: 4 } }
      ]},
      { label: '縄を渡して慎重に進む', need: 'rope', out: [
        { w: 100, t: '縄を岩に結び、一人ずつ渡る。時間はかかったが、誰も傷つかなかった。', eff: {} }
      ]},
      { label: '遠回りの道を探す', out: [
        { w: 70, t: '遠回りは正解だった。ただし、それだけ長く洞窟の中にいたことになる。', eff: { alert: 1 } },
        { w: 30, t: '回り道の途中、崩れた壁の隙間に小袋を見つけた。', eff: { item: 'potion', alert: 1 } }
      ]}
    ]
  },

  nest: {
    title: 'けもののねぐら',
    text: '骨が敷き詰められた窪みに、獣が数頭、身を寄せて眠っている。'
        + 'まだこちらには気づいていない。奥へ抜けるには、この部屋を通るしかない。',
    choices: [
      { label: '足音を殺して抜ける', out: [
        { w: 55, t: '息を止めて壁づたいに進む。獣は身じろぎひとつしなかった。', eff: {} },
        { w: 45, t: '骨が、乾いた音を立てて折れた。目が、一斉にこちらを向く。', eff: { fight: 'normal' } }
      ]},
      { label: '先手を打って襲いかかる', out: [
        { w: 100, t: '眠っているうちに斬りかかった。この戦いは、こちらが先に動ける。', eff: { fight: 'ambush' } }
      ]},
      { label: '火を投げ込む', need: 'torch', out: [
        { w: 60, t: '骨が燃え上がり、獣は悲鳴を上げて奥へ逃げた。道が開けた。', eff: { info: '獣を追い払った' } },
        { w: 40, t: '火は燃え広がり、煙が充満した。獣は逃げたが、こちらも咳き込んでいる。', eff: { dmg: 2, info: '獣を追い払った' } }
      ]}
    ]
  },

  merchant: {
    title: '洞窟の商人',
    text: 'ランタンをひとつ提げた小男が、岩に腰かけて待っていた。'
        + '「こんなところで商売とは、と思うだろう。だが、こんなところだからこそ売れるのさ」',
    choices: [
      { label: '薬を買う', out: [
        { w: 100, t: '「賢い買い物だ」小男は薬を三本、無造作に投げてよこした。', eff: { item: 'potion' } }
      ]},
      { label: '縄を買う', out: [
        { w: 100, t: '「地割れがあるからな。誰もが後で買いに戻ってくる」', eff: { item: 'rope' } }
      ]},
      { label: '奥のことを尋ねる', out: [
        { w: 70, t: '「主か。……あれは、もとは人だったよ」小男はそれ以上言わなかった。',
          eff: { info: '主はもと人間らしい' } },
        { w: 30, t: '「金にならん話はしない主義でね」にべもなかった。', eff: {} }
      ]}
    ]
  },

  chest: {
    title: '宝箱',
    text: '崩れた石積みの陰に、鉄の帯を巻いた箱がひとつ。埃の積もり方からして、'
        + '長いこと誰も触れていない。あるいは、触れた者が戻ってこなかったのか。',
    choices: [
      { label: 'そのまま開ける', out: [
        { w: 55, t: '蓋が軋みながら開いた。中には、赤い石をはめた腕輪。', eff: { item: 'bracer' } },
        { w: 45, t: '開けた瞬間、細い針が飛び出した。手の甲が、じんと痺れる。', eff: { dmg: 4 } }
      ]},
      { label: '罠を調べてから開ける', out: [
        { w: 75, t: '蓋の裏に仕掛けを見つけ、針を折ってから開けた。中身は無事に手に入った。', eff: { item: 'bracer' } },
        { w: 25, t: '慎重にやりすぎた。仕掛けを外そうとして、箱ごと崩してしまった。', eff: {} }
      ]},
      { label: '放っておく', out: [
        { w: 100, t: '触らぬ神に祟りなし。一行は箱に背を向けた。', eff: {} }
      ]}
    ]
  },

  rest: {
    title: '主の間の手前',
    text: '扉の向こうから、規則正しい低い音が響いてくる。息づかいのようにも、'
        + '何かを引きずる音のようにも聞こえる。ここが最後の休める場所になる。',
    choices: [
      { label: '腰を下ろして休む', out: [
        { w: 100, t: '交代で見張りを立て、傷を手当てした。'
               + '——ただし、扉の向こうの音は、その間に少し大きくなった気がする。',
          eff: { heal: 8, alert: 1 } }
      ]},
      { label: 'このまま踏み込む', out: [
        { w: 100, t: '休めば、向こうも備える。一行は息を整えただけで扉に手をかけた。', eff: { ambush: 1 } }
      ]},
      { label: '扉に耳を当てる', out: [
        { w: 60, t: '足音は二つ。主のほかに、もう一体いる。', eff: { info: '主のほかにもう一体いる' } },
        { w: 40, t: '耳を当てた瞬間、扉の向こうで音が止んだ。気づかれた。', eff: { alert: 2 } }
      ]}
    ]
  },

  boss: {
    title: '主の間',
    text: 'かつて人であったものが、玉座に沈み込むように座っている。'
        + 'こちらを見たそれは、ゆっくりと立ち上がった。村人たちを苦しめてきたものが、ここにいる。',
    choices: [
      { label: '斬りかかる', out: [ { w: 100, t: '', eff: { fight: 'boss' } } ] },
      { label: '名を呼ぶ', need: 'info', out: [
        { w: 60, t: 'それは一瞬、動きを止めた。目に、人だったころの色が戻る。この隙は大きい。',
          eff: { fight: 'boss', bonus: 1 } },
        { w: 40, t: '応えは咆哮だった。もう、人の名は届かない。', eff: { fight: 'boss' } }
      ]}
    ]
  },

  empty: {
    title: null,
    text: null,
    choices: null
  }
};

/* 部屋の配置：'r,c': イベントID */
const PLACED = {
  '4,2': 'start',      // 入口
  '3,2': 'chasm',      // 入ってすぐの地割れ
  '3,0': 'water',      // 左まわり
  '3,4': 'chest',      // 右まわり
  '2,0': 'traveler',
  '2,4': 'merchant',
  '1,1': 'nest',       // 奥の手前
  '1,3': 'altar',
  '1,2': 'rest',       // 主の間のすぐ手前
  '0,2': 'boss'
};

const ITEMS = {
  torch:   { name: '松明',   kind: '道具',   text: '暗がりを照らす' },
  rope:    { name: '縄',     kind: '道具',   text: '地割れを安全に渡れる' },
  potion:  { name: '傷薬',   kind: '道具',   text: '使うと体力が回復する' },
  key:     { name: '古い鍵', kind: '道具',   text: '奥の扉が開くらしい' },
  dagger:  { name: '古い短剣', kind: '武器', text: '攻撃 +1' },
  bracer:  { name: '赤石の腕輪', kind: '装飾', text: '体力上限 +3' },
  gem:     { name: '鈍く光る石', kind: '宝', text: '持ち帰れば村が潤う' }
};

const PARTY = [
  { id: 'knight',   hp: 22, max: 22 },
  { id: 'archer',   hp: 14, max: 14 },
  { id: 'priest',   hp: 15, max: 15 },
  { id: 'berserker',hp: 24, max: 24 }
];

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
html,body{height:100%}
body{margin:0;background:#05070c;color:var(--ink);font-family:var(--font);
  font-size:14px;line-height:1.9;-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;align-items:center;padding:18px 12px 40px}

/* ---- 上の説明と切り替え ---- */
.head{width:100%;max-width:760px;margin-bottom:14px}
.head h1{font-size:19px;font-weight:900;color:var(--gold);margin:0 0 6px;letter-spacing:.02em}
.head p{font-size:12.5px;color:var(--ink2);margin:0 0 12px;line-height:1.85;max-width:64ch}
.head p b{color:#ffeec2}
.switch{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.switch button{font-family:inherit;font-size:12px;font-weight:900;padding:8px 14px;
  border-radius:9px;border:1px solid var(--line2);background:var(--panel2);color:var(--ink);cursor:pointer}
.switch button.on{border-color:var(--gold);color:var(--gold);background:rgba(242,198,92,.1)}
.switch button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.switch .sp{width:1px;height:22px;background:var(--line2);margin:0 4px}

/* ---- 端末の枠 ---- */
.device{background:#000;border:1px solid #232c42;border-radius:22px;padding:9px;
  box-shadow:0 18px 50px rgba(0,0,0,.6)}
.screen{width:352px;height:660px;background:var(--ground);border-radius:15px;overflow:hidden;
  position:relative;display:flex;flex-direction:column}
body.land .screen{width:660px;height:352px}

/* ---- 上部バー ---- */
.top{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:8px 11px;
  background:var(--panel2);border-bottom:1px solid var(--line)}
.top .mis{flex:1;min-width:0;font-size:10.5px;font-weight:900;color:var(--gold);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top .st{font-size:10px;font-weight:900;color:var(--ink3);white-space:nowrap;
  font-variant-numeric:tabular-nums}

/* ---- 本体（縦持ち＝縦に3段 / 横持ち＝左右2列） ---- */
.body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;position:relative}
.side{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column}
body.land .body{flex-direction:row}

/* マップ */
.mapwrap{flex:0 0 auto;position:relative;background:#04060b;
  border-bottom:1px solid var(--line);transition:height .32s cubic-bezier(.4,0,.2,1);
  overflow:hidden;height:238px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:9px 0 6px}
body.land .mapwrap{height:auto;flex:0 0 44%;border-bottom:0;border-right:1px solid var(--line);
  padding:9px 6px 6px}
.mapwrap.slim{height:76px}
body.land .mapwrap.slim{height:auto;flex:0 0 44%}
.grid{flex:1 1 auto;min-height:0;aspect-ratio:1;display:grid;gap:3px;
  grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr)}
.mapwrap.slim{flex-direction:row;align-items:center;justify-content:flex-start;gap:11px;padding:0 12px}
.mapwrap.slim .grid{position:static;margin:0;flex:0 0 58px;width:58px;height:58px;
  max-width:none;max-height:none;gap:1.5px}
.slimlab{display:none;font-size:11.5px;font-weight:900;color:var(--ink2);line-height:1.5}
.slimlab b{display:block;color:var(--torch);font-size:10px;letter-spacing:.08em}
.mapwrap.slim .slimlab{display:block}
.cell{border-radius:4px;background:transparent;position:relative;display:grid;place-items:center;
  font-size:11px;transition:background .25s,box-shadow .25s}
.cell.rock{background:transparent}
.cell.dark{background:#0a0e17;box-shadow:inset 0 0 0 1px #121a29}
.cell.seen{background:#16203a;box-shadow:inset 0 0 0 1px #26324f}
.cell.here{background:rgba(242,198,92,.22);box-shadow:inset 0 0 0 1.5px var(--gold),
  0 0 14px rgba(242,198,92,.35)}
.cell.can{cursor:pointer;background:#22314f;box-shadow:inset 0 0 0 1.5px #5772a8;
  animation:beat 1.9s ease-in-out infinite}
.cell.can:hover{background:#2d4068}
@keyframes beat{0%,100%{box-shadow:inset 0 0 0 1.5px #5772a8}
  50%{box-shadow:inset 0 0 0 1.5px #7f9ede,0 0 10px rgba(127,158,222,.35)}}
@media (prefers-reduced-motion:reduce){.cell.can{animation:none}}
.cell .ic{font-size:12px;line-height:1;opacity:.95}
.mapwrap.slim .cell .ic{font-size:9px}
.cell.boss .ic{color:var(--ng)}
.cell.evt .ic{color:var(--torch)}
.mapleg{flex:0 0 auto;font-size:9.5px;color:var(--ink3);
  display:flex;gap:11px;justify-content:center;pointer-events:none}
.mapwrap.slim .mapleg{display:none}

/* 語り */
.narr{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:none;
  padding:13px 14px;background:linear-gradient(180deg,#0a0f1a,#070b13);
  -webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 22px),transparent);
  mask-image:linear-gradient(180deg,#000 calc(100% - 22px),transparent)}
.narr::-webkit-scrollbar{display:none}
.narr .ttl{font-size:11px;font-weight:900;color:var(--torch);letter-spacing:.1em;margin-bottom:5px}
.narr .tx{font-size:13px;line-height:2.05;color:#cfd9ec;white-space:pre-wrap}
.narr .tx em{font-style:normal;color:var(--gold);font-weight:800}
.narr .res{margin-top:11px;padding:10px 12px;border-radius:9px;
  background:rgba(242,198,92,.07);border:1px solid #3a3320}
.narr .res .rt{font-size:12.5px;line-height:1.95;color:#f0e3c4}
.narr .eff{margin-top:7px;display:flex;flex-wrap:wrap;gap:5px}
.narr .eff span{font-size:10px;font-weight:900;padding:1px 7px;border-radius:999px;
  border:1px solid var(--line2);color:var(--ink2)}
.narr .eff span.good{color:var(--ok);border-color:#2f7a52}
.narr .eff span.bad{color:var(--ng);border-color:#7a3030}
.narr .eff span.info{color:var(--mid);border-color:#2b6285}

/* 選択肢 */
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

/* 案B：語りを重ねるシート */
.sheet{position:absolute;left:0;right:0;bottom:0;top:0;display:flex;flex-direction:column;
  justify-content:flex-end;background:rgba(3,5,10,.55);
  opacity:0;pointer-events:none;transition:opacity .28s;z-index:5}
.sheet.on{opacity:1;pointer-events:auto}
.sheet .inner{background:linear-gradient(180deg,#0b1120,#070b13);
  border-top:1px solid var(--line2);border-radius:16px 16px 0 0;
  box-shadow:0 -14px 34px rgba(0,0,0,.6);max-height:82%;display:flex;flex-direction:column;
  transform:translateY(14px);transition:transform .28s}
.sheet.on .inner{transform:translateY(0)}
.sheet .grab{flex:0 0 auto;height:16px;display:grid;place-items:center}
.sheet .grab i{width:34px;height:3px;border-radius:2px;background:#33405e;display:block}

/* パーティ */
.party{flex:0 0 auto;display:flex;gap:5px;padding:6px 10px;background:#080c15;
  border-top:1px solid var(--line)}
.pm{flex:1;min-width:0;background:var(--panel2);border:1px solid var(--line);border-radius:7px;
  padding:3px;display:flex;flex-direction:column;align-items:center;gap:2px}
.pm .pic{width:100%;aspect-ratio:1/0.92;border-radius:5px;overflow:hidden;background:#05070c}
.pm .pic svg{width:100%;height:100%;display:block}
.pm .nm{font-size:8.5px;font-weight:900;color:var(--ink2);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;max-width:100%}
.pm .bar{width:100%;height:3px;border-radius:2px;background:#2a1f24;overflow:hidden}
.pm .bar i{display:block;height:100%;background:linear-gradient(90deg,#4fd48a,#7de8a4)}
.pm.hurt .bar i{background:linear-gradient(90deg,#e0a53c,#ffd07a)}
.pm.low .bar i{background:linear-gradient(90deg,#d04a4a,#ff8f8f)}
.pm .hp{font-size:8px;font-weight:900;color:var(--ink3);font-variant-numeric:tabular-nums}

/* 持ち物 */
.bagbar{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:5px 10px;
  background:#070a12;border-top:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.bagbar::-webkit-scrollbar{display:none}
.bagbar .lb{font-size:9.5px;font-weight:900;color:var(--ink3);white-space:nowrap}
.bagbar .it{font-size:10px;font-weight:900;color:var(--gold);white-space:nowrap;
  border:1px solid #3b3016;border-radius:999px;padding:0 8px;background:rgba(242,198,92,.07)}
.bagbar .none{font-size:10px;color:var(--ink3)}

/* 横持ちの詰め方 */
body.land .party{padding:4px 8px;gap:4px}
body.land .pm{flex-direction:row;align-items:center;gap:6px;padding:3px 7px}
body.land .pm .pic{width:26px;flex:0 0 26px;aspect-ratio:1;border-radius:4px}
body.land .pm .nm{font-size:9.5px;flex:0 0 auto}
body.land .pm .bar{flex:1 1 auto;width:auto;min-width:18px}
body.land .pm .hp{font-size:8.5px;flex:0 0 auto}
body.land .bagbar{padding:3px 10px}
body.land .top{padding:5px 11px}
body.land .acts{padding:7px 10px 9px;gap:5px}
body.land .narr{padding:11px 13px}

.foot{width:100%;max-width:760px;margin-top:18px;font-size:12px;color:var(--ink2);line-height:1.95}
.foot h2{font-size:14px;font-weight:900;color:var(--gold);margin:20px 0 6px}
.foot ul{margin:0;padding-left:1.15em}
.foot li{margin-bottom:7px;max-width:66ch}
.foot b{color:#ffeec2}
</style>

<div class="head">
  <h1>ダンジョン探索画面の案</h1>
  <p>実際に歩けます。<b>光っているマスをタップすると移動</b>し、部屋によっては語りと選択肢が出ます。結果は重み付きの抽選なので、同じ選択でも毎回同じにはなりません。<b>縦持ちのマップの出し方を2案、その場で切り替えて比べてください。</b></p>
  <div class="switch">
    <button data-lay="fold" class="on">案A マップを畳む</button>
    <button data-lay="sheet">案B 語りを重ねる</button>
    <span class="sp"></span>
    <button data-or="port" class="on">縦持ち</button>
    <button data-or="land">横持ち</button>
    <span class="sp"></span>
    <button id="reset">最初から</button>
  </div>
</div>

<div class="device"><div class="screen" id="screen"></div></div>

<div class="foot">
  <h2>2案のちがい</h2>
  <ul>
    <li><b>案A（畳む）</b>——語りが出ると、マップが上の帯まで縮みます。<b>現在地は常に見えたまま</b>で、語りと選択肢に広さを渡せます。移動に戻るとマップが開きます。</li>
    <li><b>案B（重ねる）</b>——マップはそのままで、語りが下から重なります。<b>マップ全体は見えますが、下半分は隠れます。</b>選択肢の下が窮屈になりやすい。</li>
    <li>横持ちはどちらの案でも<b>左マップ・右語り</b>の2列になるので、差は出ません。</li>
  </ul>
  <h2>まだ入れていないもの</h2>
  <ul>
    <li><b>戦闘。</b>「けものの巣」「主の間」で戦闘になりますが、ここでは入口だけです。実際は<b>いまのバトル画面がそのまま開きます</b>。</li>
    <li><b>装備画面。</b>拾ったアイテムは下の帯に溜まるだけです。誰に着けるかを選ぶ画面は別に要ります。</li>
    <li>ダンジョンは<b>この14部屋で固定</b>です。中央が塞がっているので、主の間へは左右どちらかを回る必要があります。自動生成はPhase 2の話なので、まだ入れていません。</li>
  </ul>
</div>

<script>
${R('engine.js')}
</script>
<script>
${R('art.js')}
</script>
<script>
var MAP = ${JSON.stringify(MAP)};
var EVENTS = ${JSON.stringify(EVENTS)};
var PLACED = ${JSON.stringify(PLACED)};
var ITEMS = ${JSON.stringify(ITEMS)};
var PARTY0 = ${JSON.stringify(PARTY)};
</script>
<script>
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  var layout = 'fold', S;

  function fresh() {
    return {
      at: [4, 2], seen: {}, done: {}, bag: [], info: [],
      party: PARTY0.map(function (p) { return { id: p.id, hp: p.hp, max: p.max }; }),
      mode: 'move',      // move / event / result
      ev: null, res: null, alert: 0, steps: 0
    };
  }

  function isRoom(r, c) {
    return MAP[r] && MAP[r][c] && MAP[r][c] !== '.';
  }
  function key(r, c) { return r + ',' + c; }
  function evAt(r, c) { return PLACED[key(r, c)] || null; }

  /* ---------- 効果の適用 ---------- */
  function apply(eff) {
    var tags = [];
    if (eff.heal) {
      S.party.forEach(function (p) { p.hp = Math.min(p.max, p.hp + eff.heal); });
      tags.push(['good', '全員 体力+' + eff.heal]);
    }
    if (eff.dmg) {
      S.party.forEach(function (p) { p.hp = Math.max(1, p.hp - eff.dmg); });
      tags.push(['bad', '全員 体力-' + eff.dmg]);
    }
    if (eff.maxHp) {
      S.party.forEach(function (p) { p.max += eff.maxHp; p.hp += eff.maxHp; });
      tags.push(['good', '体力上限+' + eff.maxHp]);
    }
    if (eff.atkUp) tags.push(['good', '攻撃+' + eff.atkUp]);
    if (eff.bless) tags.push(['good', '加護を得た']);
    if (eff.item) { S.bag.push(eff.item); tags.push(['good', ITEMS[eff.item].name + ' を入手']); }
    if (eff.info) { S.info.push(eff.info); tags.push(['info', eff.info]); }
    if (eff.alert) { S.alert += eff.alert; tags.push(['bad', '警戒度+' + eff.alert]); }
    if (eff.ambush) tags.push(['good', '奇襲できる']);
    if (eff.bonus) tags.push(['good', '大きな隙を突ける']);
    if (eff.fight) {
      tags.push([eff.fight === 'ambush' ? 'good' : 'bad',
        eff.fight === 'boss' ? '主との戦闘' : eff.fight === 'ambush' ? '先制して戦闘' : '戦闘']);
    }
    return tags;
  }

  function pick(list) {
    var tot = list.reduce(function (a, o) { return a + o.w; }, 0);
    var r = Math.random() * tot;
    for (var i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* ---------- 描画 ---------- */
  function mapHTML() {
    var slim = (layout === 'fold' && S.mode !== 'move') ? ' slim' : '';
    var cells = '';
    for (var r = 0; r < 5; r++) {
      for (var c = 0; c < 5; c++) {
        if (!isRoom(r, c)) { cells += '<div class="cell rock"></div>'; continue; }
        var k = key(r, c), here = (S.at[0] === r && S.at[1] === c);
        var seen = S.seen[k], id = evAt(r, c);
        var can = !here && S.mode === 'move' &&
          (Math.abs(S.at[0] - r) + Math.abs(S.at[1] - c) === 1);
        var cls = 'cell ' + (here ? 'here' : can ? 'can' : seen ? 'seen' : 'dark');
        var ic = '';
        if (here) ic = '<span class="ic">🔦</span>';
        else if (seen && id === 'boss') { cls += ' boss'; ic = '<span class="ic">☠</span>'; }
        else if (seen && id && id !== 'start' && !S.done[k]) { cls += ' evt'; ic = '<span class="ic">✦</span>'; }
        else if (seen && S.done[k]) ic = '<span class="ic" style="opacity:.3">·</span>';
        cells += '<div class="' + cls + '"' + (can ? ' data-go="' + k + '"' : '') + '>' + ic + '</div>';
      }
    }
    var lab = S.ev && S.ev.title ? S.ev.title : '探索中';
    return '<div class="mapwrap' + slim + '"><div class="grid">' + cells + '</div>' +
      '<div class="slimlab"><b>いまここ</b>' + lab + '　（' + S.steps + '歩め）</div>' +
      '<div class="mapleg"><span>🔦 現在地</span><span>✦ 未踏の出来事</span><span>☠ 主の間</span></div></div>';
  }

  function narrHTML() {
    if (S.mode === 'move') {
      return '<div class="narr"><div class="ttl">探索中</div>' +
        '<div class="tx">松明の輪の外は、何も見えない。' +
        (S.alert ? '\\n遠くで、何かが動く音がする。（警戒度 ' + S.alert + '）' : '') +
        '\\n\\n光っているマスをタップすると、そちらへ進む。</div></div>';
    }
    var e = S.ev, h = '<div class="narr"><div class="ttl">' + e.title + '</div>' +
      '<div class="tx">' + e.text + '</div>';
    if (S.res) {
      h += '<div class="res"><div class="rt">' + S.res.t + '</div>';
      if (S.res.tags.length) {
        h += '<div class="eff">' + S.res.tags.map(function (t) {
          return '<span class="' + t[0] + '">' + t[1] + '</span>';
        }).join('') + '</div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function actsHTML() {
    if (S.mode === 'move') {
      return '<div class="acts"><div class="hint">マップの光っているマスを選んでください</div></div>';
    }
    if (S.res) {
      return '<div class="acts"><button class="go" data-next="1">▶ 先へ進む</button></div>';
    }
    var h = '<div class="acts">';
    S.ev.choices.forEach(function (ch, i) {
      var lack = ch.need && ch.need !== 'info' && S.bag.indexOf(ch.need) < 0;
      if (ch.need === 'info') lack = S.info.length === 0;
      h += '<button data-ch="' + i + '"' + (lack ? ' disabled' : '') + '>' + ch.label +
        (ch.need ? '<span class="req">' +
          (ch.need === 'info' ? '手がかりが要る' : ITEMS[ch.need].name + ' が要る') +
          (lack ? '（持っていない）' : '（持っている）') + '</span>' : '') + '</button>';
    });
    return h + '</div>';
  }

  function partyHTML() {
    return '<div class="party">' + S.party.map(function (p) {
      var d = CB.BY_ID[p.id], pct = Math.max(0, p.hp / p.max * 100);
      var cls = pct <= 30 ? ' low' : pct <= 65 ? ' hurt' : '';
      return '<div class="pm' + cls + '"><div class="pic">' + CBART.portrait(p.id, d.elem) + '</div>' +
        '<div class="nm">' + d.name + '</div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="hp">' + p.hp + '/' + p.max + '</div></div>';
    }).join('') + '</div>';
  }

  function bagHTML() {
    return '<div class="bagbar"><span class="lb">持ち物</span>' +
      (S.bag.length
        ? S.bag.map(function (k) { return '<span class="it">' + ITEMS[k].name + '</span>'; }).join('')
        : '<span class="none">まだ何も持っていない</span>') + '</div>';
  }

  function render() {
    var top = '<div class="top"><span class="mis">討伐：村人を苦しめる洞窟の主</span>' +
      '<span class="st">' + S.steps + '歩　警戒 ' + S.alert + '</span></div>';
    var body;
    if (layout === 'sheet' && S.mode !== 'move' && !document.body.classList.contains('land')) {
      /* 案B：マップは開いたまま、語りを重ねる */
      body = '<div class="body">' + mapHTML() +
        '<div class="sheet on"><div class="inner"><div class="grab"><i></i></div>' +
        narrHTML() + actsHTML() + '</div></div></div>';
    } else {
      body = '<div class="body">' + mapHTML() +
        '<div class="side">' + narrHTML() + actsHTML() + '</div></div>';
    }
    screen.innerHTML = top + body + partyHTML() + bagHTML();
    bind();
  }

  function bind() {
    screen.querySelectorAll('[data-go]').forEach(function (el) {
      el.onclick = function () {
        var p = el.dataset.go.split(',').map(Number);
        S.at = p; S.steps++;
        S.seen[key(p[0], p[1])] = 1;
        var id = evAt(p[0], p[1]);
        if (id && !S.done[key(p[0], p[1])] && EVENTS[id] && EVENTS[id].choices) {
          S.ev = EVENTS[id]; S.mode = 'event'; S.res = null;
        } else { S.mode = 'move'; S.ev = null; S.res = null; }
        render();
      };
    });
    screen.querySelectorAll('[data-ch]').forEach(function (el) {
      el.onclick = function () {
        var ch = S.ev.choices[+el.dataset.ch];
        var o = pick(ch.out);
        S.res = { t: o.t || 'ここで戦闘に入ります。', tags: apply(o.eff || {}) };
        render();
      };
    });
    var nx = screen.querySelector('[data-next]');
    if (nx) nx.onclick = function () {
      S.done[key(S.at[0], S.at[1])] = 1;
      S.mode = 'move'; S.ev = null; S.res = null;
      render();
    };
  }

  /* ---------- 切り替え ---------- */
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

  function start() {
    S = fresh();
    S.seen[key(4, 2)] = 1;
    S.ev = EVENTS.start; S.mode = 'event'; S.res = null;
    render();
  }
  start();
})();
</script>
`;

fs.writeFileSync(__dirname + '/../rpgdemo.html', page);
console.log('rpgdemo.html  ' + (page.length / 1024).toFixed(1) + ' KB');
