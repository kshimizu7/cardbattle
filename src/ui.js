/* =========================================================
   ARCANA CLASH — UI / 進行制御
   ========================================================= */
(function () {
  'use strict';
  var E = CB, AI = CBAI, ART = CBART, SAVE = CBSAVE;

  var VERSION = (function () {
    var m = document.querySelector('meta[name="app-version"]');
    return m ? m.content : '';
  })();

  var app = document.getElementById('app');
  var fxl = document.getElementById('fxlayer');

  var S = {
    screen: 'title', mode: 'cpu', diff: 'normal', speed: 1,
    hands: [null, null], teams: [[], []], draftIdx: 0, mulligan: [true, true],
    seenIds: [],
    st: null, selCard: null, selAct: null, busy: false, auto: false, sound: true, bgm: true, pool: 'tutorial',
    deal: 'shuffle', selSlot: null, hist: [[], []],
    compact: false, sideBySide: false, hintSeen: false,
    /* 全自動は陣営ごとに持つ。PvPでは P1だけ・P2だけ・両方(観戦) を選べる */
    autoSides: [false, false]
  };

  // 最初のタップでオーディオを解錠（iOS対策）
  /* ブラウザは最初のタップまで音を鳴らせない。1回目の操作で両方を起こす。 */
  document.addEventListener('pointerdown', function () {
    if (S.sound) SFX.unlock();
    if (S.bgm) syncBgm();
  }, { passive: true });
  document.addEventListener('click', function (ev) {
    if (!S.sound) return;
    var t = ev.target;
    if (t && t.closest && t.closest('button,.opt,.card,.slot')) SFX.play('ui');
  }, true);

  /* ---------- 陣営の呼び名 ----------
     CPU戦は「自軍／敵軍」で正しい（人間は必ず side0）。
     ふたり対戦は1画面を共有するため、どちらから見ても正しい
     プレイヤー名で呼ぶ。以前は side0 基準に固定されていて、
     P2 には自分の軍が「敵軍」と表示されていた。 */
  function sideName(side) {
    if (S.mode === 'cpu') return side === 0 ? '自軍' : '敵軍';
    var st = S.st;
    return (st && st.players[side] && st.players[side].name) || ('プレイヤー' + (side + 1));
  }
  /* 端末がいま横向きか。横並びレイアウトはこれで自動的に切り替わる */
  function isLandscape() {
    return window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
  }

  function sideShort(side) {
    if (S.mode === 'cpu') return side === 0 ? '自陣' : '敵陣';
    return 'P' + (side + 1);
  }

  /* ---------- BGM ----------
     画面に応じて曲を切り替える。同じ曲が鳴っているときは何もしないので、
     再描画のたびに頭から鳴り直すことはない。
     音色はオーケストラ風で固定。 */
  var BGM_FOR = { battle: 'up', title: 'mid', draft: 'mid', ready: 'mid',
                  pass: 'mid', result: 'mid' };
  var BGM_VOL = 0.3;               // 効果音より一段下げる
  function syncBgm() {
    if (typeof BGM === 'undefined') return;
    var want = S.bgm ? BGM_FOR[S.screen] : null;
    var now = BGM.current();
    if (!want) { if (now) BGM.stop(); return; }
    if (now && now.song === want) return;
    try { BGM.setVolume(BGM_VOL); BGM.play(want, 'orch'); } catch (e) {}
  }

  /* ---------- 設定の記憶 ---------- */
  function rememberSettings() {
    try {
      SAVE.setSettings({ sound: S.sound, bgm: S.bgm, speed: S.speed, pool: S.pool, deal: S.deal,
                         mode: S.mode, diff: S.diff,
                         compact: S.compact, sideBySide: S.sideBySide,
                         hintSeen: S.hintSeen });
    } catch (e) {}
  }
  function restoreSettings() {
    try {
      var g = SAVE.getSettings();
      if (typeof g.sound === 'boolean') S.sound = g.sound;
      if (g.speed === 1 || g.speed === 2 || g.speed === 4) S.speed = g.speed;
      if (E.POOLS[g.pool]) S.pool = g.pool;
      if (g.deal === 'shuffle' || g.deal === 'full') S.deal = g.deal;
      if (g.mode === 'cpu' || g.mode === 'pvp') S.mode = g.mode;
      if (g.diff === 'easy' || g.diff === 'normal' || g.diff === 'hard') S.diff = g.diff;
      if (typeof g.compact === 'boolean') S.compact = g.compact;
      if (typeof g.sideBySide === 'boolean') S.sideBySide = g.sideBySide;
      if (typeof g.hintSeen === 'boolean') S.hintSeen = g.hintSeen;
    } catch (e) {}
  }

  /* ---------- ユーティリティ ---------- */
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  /* 演出のじっくり度。1.0 が旧来の速さ、大きいほどゆっくり見せる */
  var TSCALE = 1.55;
  function spd() { return S.speed / TSCALE; }
  function wait(ms, fn) { return setTimeout(fn, Math.max(8, ms / spd())); }
  function pipRow(label, val, max, color) {
    var p = '';
    for (var i = 1; i <= max; i++) p += '<span class="pip' + (i <= val ? ' on' : '') + '"></span>';
    return '<div class="strow"><span class="lb">' + label + '</span><span class="pips" style="color:' + color + '">' + p + '</span></div>';
  }

  /* ---------- 行動順の根拠 ---------- */
  function firstSideOf(st) { return ((st.round + (st.coin || 0)) % 2 === 1) ? 0 : 1; }
  function metaOf(st, uid) {
    return (st.orderMeta && st.orderMeta[uid]) || null;
  }
  function orderRows(st) {
    var rows = [], prev = null, pm = null;
    st.order.forEach(function (uid, i) {
      var u = E.findUid(st, uid);
      if (!u) return;
      var m = metaOf(st, uid) || { spd: E.getSpd(u, st), hp: u.hp, row: u.row, col: u.col };
      var why;
      if (!prev) why = 'このラウンドで最も素早い';
      else if (pm.spd > m.spd) why = '素早さ ' + pm.spd + ' → ' + m.spd;
      else if (pm.hp !== m.hp) why = '素早さ同値（' + m.spd + '）⇒ ラウンド開始時の残HPが多い方が先（' + pm.hp + ' > ' + m.hp + '）';
      else if (pm.row !== m.row) why = '素早さ・HP同値 ⇒ 前衛が先';
      else if (Math.abs(pm.col - 1) !== Math.abs(m.col - 1)) why = '素早さ・HP同値 ⇒ 中央寄りが先';
      else why = '完全同値 ⇒ このラウンドの先攻側（' + st.players[st.orderFirstSide == null ? firstSideOf(st) : st.orderFirstSide].name + '）が先';
      rows.push({ u: u, i: i, spd: m.spd, hp0: m.hp, why: why });
      prev = u; pm = m;
    });
    return rows;
  }
  function orderIndexOf(st, uid) {
    for (var i = 0; i < st.order.length; i++) if (st.order[i] === uid) return i;
    return -1;
  }
  function showLog() {
    var st = S.st; if (!st) return;
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="box"><h3 style="color:var(--gold)">戦闘ログ</h3>' +
      '<div class="logfull">' + st.log.map(function (l) { return '<div class="' + l.cls + '">' + l.text + '</div>'; }).join('') + '</div>' +
      '<button class="btn ghost" style="width:100%;margin-top:10px">閉じる</button></div>';
    m.onclick = function (ev) { if (ev.target === m || ev.target.tagName === 'BUTTON') m.remove(); };
    document.body.appendChild(m);
    var f = m.querySelector('.logfull'); if (f) f.scrollTop = f.scrollHeight;
  }

  function showOrder() {
    var st = S.st;
    if (!st) return;
    var rows = orderRows(st);
    var cur = E.currentActor(st);
    var list = rows.map(function (r) {
      var isNow = cur && r.u.uid === cur.uid;
      var done = r.i < st.turnIdx;
      return '<div class="ordrow' + (isNow ? ' now' : '') + (done || !r.u.alive ? ' done' : '') + '">' +
        '<span class="no">' + (r.i + 1) + '</span>' +
        '<span class="pic">' + ART.portrait(r.u.defId, r.u.def.elem) + '</span>' +
        '<span class="who"><b style="color:' + (r.u.side === 0 ? 'var(--p1)' : 'var(--p2)') + '">' +
          sideName(r.u.side) + '</b> ' + r.u.def.name +
          (r.u.alive ? '' : '<span style="color:var(--bad)"> 戦闘不能</span>') +
          '<small>' + r.why + '</small></span>' +
        '<span class="spd">⚡' + r.spd + '</span></div>';
    }).join('');
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="box">' +
      '<h3 style="color:var(--gold)">ラウンド ' + st.round + ' の行動順</h3>' +
      '<div class="rules" style="font-size:11.5px;margin:6px 0 10px">' +
      '素早さ（⚡）が高い順に行動します。同じ値のときは下の順で決まります：<br>' +
      '<b>① 残りHPが多い方 → ② 前衛 → ③ 中央寄り → ④ 先攻側</b><br>' +
      '<span style="color:var(--dim)">先攻側は毎ラウンド入れ替わります（このラウンドは <b style="color:var(--gold)">' +
      st.players[st.orderFirstSide == null ? firstSideOf(st) : st.orderFirstSide].name + '</b>）。<br>' +
      '順番は<b>ラウンド開始時に一度だけ確定</b>します。途中でHPが減っても、そのラウンドの順番は変わりません。<br>' +
      '次のラウンドでは、そのときの素早さ（吟遊詩人の【戦歌】や「鈍」で増減）と残HPで組み直されます。</span>' +
      '</div>' + list +
      '<button class="btn ghost" style="width:100%;margin-top:10px">閉じる</button></div>';
    m.onclick = function (ev) { if (ev.target === m || ev.target.tagName === 'BUTTON') m.remove(); };
    document.body.appendChild(m);
  }

  /* ---------- カード表示 ---------- */
  /**
   * カードに出す「主力の一撃」を決める。
   *  回復技を持つキャラ → 一番回復量の大きい技（✚）
   *  それ以外          → 一番威力の高い攻撃技（魔法なら✦、物理なら⚔）
   * 記号・数値・射程マークをすべて同じ技から取るので、表示が食い違わない。
   */
  function tierOf(v) { var t = 1; for (var i = 1; i <= 7; i++) if (E.ATK_TIER[i] <= v) t = i; return t; }
  function atkInfo(d) {
    var heal = null;
    d.actions.forEach(function (a) {
      if (a.kind === 'heal' && (!heal || a.value > heal.value)) heal = a;
    });
    if (heal) {
      return { icon: '癒', kind: 'heal', label: '回復', val: heal.value, tier: tierOf(heal.value),
               range: heal.range, act: heal, magic: false };
    }
    var best = null, bv = -1;
    d.actions.forEach(function (a) {
      if (a.kind !== 'dmg') return;
      var v = (a.power != null) ? a.power : d.atk;
      if (v > bv) { bv = v; best = a; }
    });
    if (!best) return { icon: '力', kind: 'phys', label: '攻撃', val: d.atk, tier: d.atkT || 1,
                        range: d.actions[0].range, act: d.actions[0], magic: false };
    var isMag = best.dtype === 'magic';
    return { icon: isMag ? '魔' : '力', kind: isMag ? 'mag' : 'phys', label: isMag ? '魔力' : '攻撃',
             val: bv, tier: tierOf(bv), range: best.range, act: best, magic: isMag };
  }
  /** 戦闘中の現在値（バフ・デバフ込み） */
  function atkLive(u) {
    var st = S.st, d = u.def, info = atkInfo(d);
    var cur;
    if (info.kind === 'heal') cur = info.val + E.auraFor(u, st).healBonus;
    else if (info.act.power != null) cur = info.val + (E.getAtk(u, st) - d.atk);
    else cur = E.getAtk(u, st);
    cur = Math.max(0, Math.round(cur));
    return { icon: info.icon, kind: info.kind, val: cur, base: info.val,
             dir: cur > info.val ? 1 : cur < info.val ? -1 : 0, range: info.range };
  }
  var RANGE_MARK = {
    melee:     { mark:'近', name:'近接',   desc:'正面の敵1体だけを殴る。前が空けば奥／隣へ回り込む' },
    pierce:    { mark:'貫', name:'貫通',   desc:'正面の敵と、その真後ろの敵まで同時に貫く' },
    front_row: { mark:'列', name:'横薙ぎ', desc:'敵の前衛3体を一度に薙ぎ払う' },
    any1:      { mark:'遠', name:'遠隔',   desc:'敵陣6マスのどこでも、好きな1体を選んで攻撃' },
    weakest:   { mark:'狙', name:'必中狙撃', desc:'残HPが最も少ない敵を自動で狙う（選択不可）' },
    square:    { mark:'面', name:'範囲2×2', desc:'左寄り／右寄りを選び、その2列4マス全員に当たる' },
    row:       { mark:'横', name:'列選択', desc:'敵の前衛列か後衛列を選び、その3体全員に当たる' },
    all:       { mark:'全', name:'全体',   desc:'敵6体すべてに当たる' },
    ally1:     { mark:'単', name:'単体回復', desc:'味方1体を選んで回復' },
    all_ally:  { mark:'群', name:'全体支援', desc:'味方全員に効果' },
    dead_ally: { mark:'蘇', name:'蘇生',   desc:'倒れた味方1体を選んで復活させる' },
    random:    { mark:'乱', name:'乱れ撃ち', desc:'敵陣からランダムに何度も当たる。同じ相手に重なることもある' },
    adj_ally:  { mark:'護', name:'庇護',   desc:'自分の前または後ろの味方1体を選び、その攻撃を肩代わりする' }
  };
  /* ---------- 系統 ---------- */
  var LINES = {
    '人': { name:'人系',   c:'#cfd8ee', rule:'万能。突出した欠点がない代わり、飛び抜けた長所もない。役割の幅が最も広い' },
    '獣': { name:'獣系',   c:'#ffb07a', rule:'はっきりした欠点と、その分だけ大きい長所を必ずセットで持つ' },
    '神': { name:'神獣系', c:'#ffe08a', rule:'倒れても終わらない。復活・蘇生・再行動のどれかを必ず持つ' },
    '物': { name:'無生物系', c:'#c3cee6', rule:'回復がいっさい効かない。代わりに固定ダメージ軽減が大きい' },
    '竜': { name:'竜系',   c:'#ff8a5a', rule:'全員が竜鱗（受けるダメージ-1）を持ち、広範囲のブレスを扱う' },
    '邪': { name:'邪悪系', c:'#c08cff', rule:'相手の不幸が自分の得になる。吸血・呪詛・弱体化' },
    '精': { name:'精霊系', c:'#8fdcff', rule:'実体を持たず場に干渉する。属性魔法と、味方や敵全体に効くオーラ' }
  };
  var LINE_ORDER = ['人', '獣', '神', '物', '竜', '邪', '精'];
  function lineOf(d) { return LINES[d.line] ? d.line : '人'; }

  function rangeIcon(d) {
    var r = d.actions[0].range;
    return RANGE_MARK[r] ? RANGE_MARK[r].mark : '近';
  }
  function cardHTML(id, opts) {
    opts = opts || {};
    var d = E.BY_ID[id], ai = atkInfo(d);
    var ln = lineOf(d);
    return '<div class="card' + (d.base ? ' upper' : '') + (opts.cls || '') + '" data-card="' + id + '">' +
      (isFinite(E.costCap()) ? '<div class="cost">' + d.cost + '</div>' : '') + '<div class="rng">' + (RANGE_MARK[ai.range] ? RANGE_MARK[ai.range].mark : '近') + '</div>' +
      '<div class="lnb" style="--lc:' + LINES[ln].c + '">' + ln + '</div>' +
      '<div class="art">' + ART.portrait(d.id, d.elem) + '</div>' +
      '<div class="nm">' + d.name + (opts.en ? '<em>' + d.en + '</em>' : '') + '</div>' +
      '<div class="st"><span class="s-hp">♥<b>' + d.hp + '</b></span>' +
      '<span class="s-at ' + ai.kind + '">' + ai.icon + '<b>' + ai.val + '</b></span>' +
      '<span class="s-sp">⚡<b>' + d.spd + '</b></span></div></div>';
  }

  /** イメージ枠（まだ遊べない）カード */
  function teaserHTML(t) {
    return '<div class="card teaser" data-teaser="' + t.id + '">' +
      '<div class="tsoon">近日</div>' +
      '<div class="lnb" style="--lc:' + LINES[t.line].c + '">' + t.line + '</div>' +
      '<div class="art">' + ART.portrait(t.id, t.elem) + '<div class="sil"></div></div>' +
      '<div class="nm">' + t.name + '<em>' + t.en + '</em></div>' +
      '<div class="st"><span class="q">？</span><span class="q">？</span><span class="q">？</span></div></div>';
  }
  function openTeaser(id) {
    var t = E.TEASER_BY_ID[id];
    if (!t) return;
    var m = document.createElement('div');
    m.className = 'modal';
    var rel = t.base && (E.BY_ID[t.base] || E.TEASER_BY_ID[t.base])
      ? (E.BY_ID[t.base] || E.TEASER_BY_ID[t.base]).name + ' の上位互換' : '';
    m.innerHTML = '<div class="box tbox">' +
      '<div class="bigcard teaser">' +
        '<div class="art">' + ART.portrait(t.id, t.elem) + '<div class="sil"></div></div>' +
        '<div class="hd"><h3>' + t.name + '</h3><em>' + t.en + '</em>' +
          '<span class="badge soon" style="margin-left:auto">近日</span></div>' +
        '<div class="lineage" style="--lc:' + LINES[t.line].c + '">' +
          '<span class="lg">' + t.line + '</span><b>' + LINES[t.line].name + '</b>' +
          '<span class="rel up">Tier ' + t.tier + (rel ? '　' + rel : '') + '</span></div>' +
        '<div class="abox"><div class="an">▸ ' + t.tech + '</div>' +
          '<div class="ad">能力は調整中です</div></div>' +
        '<div class="qrow"><span>体力 ？</span><span>攻撃 ？</span><span>素早 ？</span><span>コスト ？</span></div>' +
        '<div class="flav">' + t.flavor + '</div>' +
      '</div>' +
      '<div class="tnote">このカードは<b>まだ編成に使えません</b>。名前と姿だけ先に公開しています。</div>' +
      '<button class="btn ghost" style="width:100%;margin-top:10px" id="tclose">閉じる</button></div>';
    $('#tclose', m).onclick = function () { m.remove(); };
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  function detailHTML(d) {
    var ai = atkInfo(d);
    var acts = d.actions.map(function (a, ai2) {
      var t = '';
      if (a.kind === 'dmg') t = 'ダメージ ' + (a.power != null ? a.power : d.atk) + '　範囲：' + E.RANGE_TEXT[a.range];
      else if (a.kind === 'heal') t = '回復 ' + a.value + '　対象：' + E.RANGE_TEXT[a.range];
      else if (a.kind === 'ward') t = '味方全体の被魔法ダメージ -' + a.value + '（' + (a.rounds || 1) + 'ラウンド）';
      else if (a.kind === 'revive') t = '自分を犠牲に、倒れた味方1体をHP半分で復活';
      else if (a.kind === 'cover') t = '自分の前または後ろの味方1体を指名。次の自分の手番まで、その味方が受けるダメージを自分がすべて肩代わりする';
      else if (a.kind === 'buff') t = '味方全員の' + (a.stat === 'spd' ? '素早さ' : '攻撃') + ' +' + a.value + '（' + (a.rounds || 1) + 'ラウンド）';
      var lim = [];
      if (a.hits) t += '　×' + a.hits + '回';
      if (a.cd) lim.push(a.cd + 'ラウンドに1回');
      if (a.uses) lim.push('全' + a.uses + '回まで');
      if (a.startCd) lim.push('開幕はチャージ必要');
      if (a.slow) t += '　＋対象の素早さ-' + a.slow;
      if (a.weaken) t += '　＋対象の攻撃-' + a.weaken + '(2R)';
      if (a.curse) t += '　＋呪詛' + a.curse + '(3R継続ダメージ)';
      if (a.burn) t += '　＋燃焼' + a.burn + '(2R継続ダメージ)';
      if (a.drain) t += '　＋与ダメの半分を吸収';
      if (a.backRatio != null) t += '　後方へは' + Math.round(a.backRatio * 100) + '%';
      return '<div class="abox" data-play="' + ai2 + '"><div class="an">▸ ' + a.name +
        (lim.length ? '<span class="badge">' + lim.join(' / ') + '</span>' : '') + '</div><div class="ad">' + t + '</div></div>';
    }).join('');
    var pas = d.passives.map(function (k) {
      var p = E.PASSIVES[k];
      return '<div class="pabox"><div class="an">★ ' + p.name + '</div><div class="ad">' + p.text + '</div></div>';
    }).join('');
    var ln = lineOf(d), L = LINES[ln];
    var wep = (ART.ART && ART.ART[d.id] ? ART.ART[d.id].wep : null) || 'sword';
    return '<div class="bigcard' + (d.base ? ' upper' : '') + '">' +
      '<div class="dhead">' +
        '<div class="art" data-play="0">' +
          '<div class="unit" data-wep="' + wep + '"><div class="pic">' +
            portraitTop(d.id, d.elem) + '</div></div>' +
          (isFinite(E.costCap()) ? '<div class="cost">' + d.cost + '</div>' : '') +
          '<div class="ovbox">' +
            '<div class="hd"><h3>' + d.name + '</h3><em>' + d.en + '</em></div>' +
            '<div class="chiprow">' +
              '<button class="lnchip" data-line="' + ln + '" style="--lc:' + L.c + '">' +
                '<i class="lg">' + ln + '</i>' + L.name + '<span class="ic">i</span></button>' +
              tierStripHTML(d) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="dmeta">' +
          statRow('体力', d.hp, d.hpT, '#7de8a4') +
          statRow(ai.label, ai.val, ai.tier,
            ai.kind === 'heal' ? '#7de8a4' : ai.kind === 'mag' ? '#c98cff' : '#ffb36b') +
          statRow('素早', d.spd, d.spd, '#7fd0ff') +
        '</div>' +
      '</div>' +
      '<div class="dbody">' + acts + pas +
        '<div class="flav">' + d.flavor + '</div></div>' +
      '<button class="morechip">▼ あと<b class="mc"></b>件</button></div>';
  }

  /** 立ち絵は上そろえで切り抜く。横長に潰れても頭が切れない */
  function portraitTop(id, elem) {
    return ART.portrait(id, elem)
      .replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMin slice"');
  }

  /** 詳細画面の能力1行：ラベル・数値・段階ピップ。上限（STAT_MAX）は将来7→10でも崩れない */
  var STAT_MAX = 7;
  function statRow(label, num, val, color) {
    var p = '';
    for (var i = 1; i <= STAT_MAX; i++) p += '<span class="pip' + (i <= val ? ' on' : '') + '"></span>';
    return '<div class="strow z"><span class="lb">' + label + '</span>' +
      '<span class="nv">' + num + '</span>' +
      '<span class="pips" style="color:' + color + '">' + p + '</span></div>';
  }

  /** そのキャラが属する強化ライン（Tier1→Tier2→…）を、未実装のイメージ枠も含めて並べる */
  function chainOf(d) {
    var cur = E.BY_ID[d.id] || E.TEASER_BY_ID[d.id] || d, root = d.id, g = 0;
    while (cur && cur.base && g++ < 6) {
      var b = E.BY_ID[cur.base] || E.TEASER_BY_ID[cur.base];
      if (!b) break;
      root = cur.base; cur = b;
    }
    var out = [], id = root; g = 0;
    while (id && g++ < 6) {
      var x = E.BY_ID[id] || E.TEASER_BY_ID[id];
      if (!x) break;
      out.push({ id: id, name: x.name, teaser: !E.BY_ID[id] });
      id = x.up;
    }
    return out;
  }

  /** 「Tier □■□ ⓘ」の段階表示。強化ラインが1段だけなら「Tier 独立系 ⓘ」 */
  function tierStripHTML(d) {
    var ch = chainOf(d);
    if (!ch.length) return '';
    var here = 0;
    ch.forEach(function (x, i) { if (x.id === d.id) here = i; });
    var inner = ch.length < 2
      ? '<span class="solo">独立系</span>'
      : ch.map(function (x, i) {
          return '<i class="tp' + (i === here ? ' on' : '') + (x.teaser ? ' soon' : '') + '"></i>';
        }).join('');
    return '<button class="tiers" data-tiers="' + d.id + '">' +
      '<span class="tw">Tier</span>' + inner + '<span class="ic">i</span></button>';
  }

  /** 系統の説明ポップアップ（詳細画面の「人系」タップで開く） */
  function openLinePop(ln) {
    var L = LINES[ln]; if (!L) return;
    var m = document.createElement('div');
    m.className = 'modal minipop';
    m.innerHTML = '<div class="box popbox" style="--lc:' + L.c + '">' +
      '<div class="pophd"><i class="lg">' + ln + '</i><b>' + L.name + '</b></div>' +
      '<p class="poptx">' + L.rule + '</p>' +
      '<button class="btn ghost" data-pc="1">閉じる</button></div>';
    bindPop(m);
  }

  /** 段階（Tier）の内訳ポップアップ */
  function openTierPop(id) {
    var d = E.BY_ID[id] || E.TEASER_BY_ID[id]; if (!d) return;
    var ch = chainOf(d), L = LINES[lineOf(d)];
    var m = document.createElement('div');
    m.className = 'modal minipop';
    m.innerHTML = '<div class="box popbox" style="--lc:' + L.c + '">' +
      '<div class="pophd"><i class="lg">段</i><b>強化の段階</b></div>' +
      '<div class="tlist">' + ch.map(function (x, i) {
        return '<div class="tli' + (x.id === id ? ' me' : '') + (x.teaser ? ' soon' : '') + '">' +
          '<i class="tp' + (x.id === id ? ' on' : '') + (x.teaser ? ' soon' : '') + '"></i>' +
          '<b>' + x.name + '</b><span>' + (x.teaser ? '近日' : 'Tier ' + (i + 1)) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="poptx">下にいくほど強力です。点線の枠は<b>まだ実装されていません</b>。</p>' +
      '<button class="btn ghost" data-pc="1">閉じる</button></div>';
    bindPop(m);
  }

  function bindPop(m) {
    $('[data-pc]', m).onclick = function (ev) { ev.stopPropagation(); m.remove(); };
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  /** 詳細カードの共通動作：技の欄のはみ出し表示と、タップでの技の再生 */
  function bindDetailCard(root, def) {
    var card = $('.bigcard', root), body = $('.dbody', root);
    if (!card || !body) return;

    /* 技の欄からあふれている件数を数えて、下端のチップに出す */
    var chip = $('.morechip', root), mc = $('.mc', root);
    if (chip && mc) {
      var boxes = $$('.abox,.pabox', body);
      var upd = function () {
        var br = body.getBoundingClientRect(), n = 0;
        boxes.forEach(function (x) { if (x.getBoundingClientRect().bottom > br.bottom + 4) n++; });
        mc.textContent = n;
        chip.style.display = n > 0 ? 'flex' : 'none';
        card.classList.toggle('more', n > 0);
      };
      body.addEventListener('scroll', upd, { passive: true });
      setTimeout(upd, 40); setTimeout(upd, 260);
      chip.onclick = function (ev) {
        ev.stopPropagation();
        body.scrollBy({ top: body.clientHeight * 0.85, behavior: 'smooth' });
      };
    }

    /* キャラ絵と技の欄をタップすると、その技をその場で再生する */
    if (!def || !def.actions) return;
    $$('[data-play]', root).forEach(function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        playDetailSkill(root, def, def.actions[+el.dataset.play] || def.actions[0],
                        el.classList.contains('abox') ? el : null);
      };
    });
  }

  /** 詳細画面で技を1つ再生する。戦闘中と同じモーション・音・エフェクトを使う */
  function playDetailSkill(root, d, a, boxEl) {
    if (!a) return;
    var card = $('.bigcard', root), art = $('.art', root);
    var unit = art && $('.unit', art);
    if (!card || !art || !unit) return;

    var fx = a.fx || (a.kind === 'heal' ? 'heal' : a.kind === 'ward' ? 'ward' : 'slash');
    var f = fxOf(fx);
    var isCast = (f.k === 'magic' || f.k === 'heal' || f.k === 'buff');
    var isSound = (fx === 'discord' || fx === 'screech' || fx === 'frostroar');
    if (S.sound) SFX.play(fx);

    /* 技名は「絵の下＝能力の上」に。横持ちでは右の技の欄の頭に出す（絵に被せない） */
    var land = isLandscape();
    var bd = $('.dbody', root).getBoundingClientRect();
    var dm = $('.dmeta', root).getBoundingClientRect();
    techRibbon(d.name, a.name, f.c, false, land
      ? { x: bd.left + bd.width / 2, y: bd.top + 12, w: bd.width - 18 }
      : { x: dm.left + dm.width / 2, y: dm.top - 2, w: dm.width - 14 });

    /* 再生中は、絵に重ねた文字をいったん消してアニメに集中させる */
    card.classList.add('anim');
    clearTimeout(card._animT);
    card._animT = setTimeout(function () { card.classList.remove('anim'); }, 1150);
    if (boxEl) {
      boxEl.classList.add('playing');
      setTimeout(function () { boxEl.classList.remove('playing'); }, 900);
    }

    var swing = motionPlay(unit, isCast ? 'cast' : 'attack');
    var r = art.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var tx = isCast ? cx : r.left + r.width * 0.76, ty = isCast ? cy : r.top + r.height * 0.48;
    var t = function (ms) { return ms / spd(); };

    if (isSound) {
      [0, 130, 260].forEach(function (dl, k) {
        setTimeout(function () { ringWave(cx, cy, f.c, 90 + k * 40, 4); }, t(swing + dl));
      });
      setTimeout(function () { particles(tx, ty, f.c, 8, f.p); }, t(swing + 120));
      return;
    }
    if (f.k === 'proj') {
      setTimeout(function () {
        glowBall(tx, ty, f.c, 80); burstRays(tx, ty, f.c, 9, 100); particles(tx, ty, f.c, 9, f.p);
      }, t(swing + 220));
    } else if (f.k === 'heal' || f.k === 'buff') {
      setTimeout(function () { ringWave(cx, cy, f.c, 80, 4); particles(cx, cy, f.c, 10, f.p); }, t(swing + 60));
    } else if (f.k === 'magic') {
      setTimeout(function () {
        ringWave(tx, ty, f.c, 90, 5); burstRays(tx, ty, f.c, 10, 110); particles(tx, ty, f.c, 11, f.p);
      }, t(swing + 60));
    } else {
      setTimeout(function () {
        slashArc(tx, ty, f.c); burstRays(tx, ty, '#fff', 8, 100); particles(tx, ty, f.c, 11, f.p);
      }, t(swing + 30));
    }
  }

  /** 詳細画面内の「系統チップ」「段階チップ」にタップ動作をつける */
  function bindDetailChips(root) {
    $$('[data-line]', root).forEach(function (b) {
      b.onclick = function (ev) { ev.stopPropagation(); openLinePop(b.dataset.line); };
    });
    $$('[data-tiers]', root).forEach(function (b) {
      b.onclick = function (ev) { ev.stopPropagation(); openTierPop(b.dataset.tiers); };
    });
  }

  /** 画面を広く使う。ブラウザのURL欄などを隠す（利用者のタップ内でのみ有効） */
  function tryFullscreen() {
    try {
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        var r = req.call(el);
        if (r && r.catch) r.catch(function () {});
      }
    } catch (e) {}
  }

  /** カード詳細に出す「系統」と「ノーマル⇄上位互換」の帯 */
  function lineageHTML(d) {
    var ln = lineOf(d), L = LINES[ln];
    var rel = '';
    if (d.base && E.BY_ID[d.base]) rel = '<span class="rel up">▲ ' + E.BY_ID[d.base].name + ' の上位互換</span>';
    else if (d.up && E.BY_ID[d.up]) rel = '<span class="rel dn">▼ 上位互換：' + E.BY_ID[d.up].name + '</span>';
    else rel = '<span class="rel none">上位互換なし（独立）</span>';
    return '<div class="lineage" style="--lc:' + L.c + '">' +
      '<span class="lg">' + ln + '</span><b>' + L.name + '</b>' + rel +
      '<small>' + L.rule + '</small></div>';
  }

  function openDetail(id, list) {
    list = (list && list.length) ? list.slice() : [id];
    if (list.indexOf(id) < 0) list.unshift(id);
    var idx = list.indexOf(id);
    var m = document.createElement('div');
    m.className = 'modal';
    function draw() {
      var cid = list[idx];
      m.innerHTML = '<div class="box detailbox">' +
        '<div class="cardwrap">' + detailHTML(E.BY_ID[cid]) + '</div>' +
        (list.length > 1
          ? '<div class="navrow big merged">' +
            '<button class="navb wide" data-nav="-1">◀ 前のカード</button>' +
            '<span class="navpos">' + (idx + 1) + ' / ' + list.length + '</span>' +
            '<button class="navb wide" data-nav="1">次のカード ▶</button></div>'
          : '') +
        '<button class="btn ghost" id="dclose" style="width:100%;margin-top:8px">閉じる</button></div>';
      $$('[data-nav]', m).forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          idx = (idx + (+b.dataset.nav) + list.length) % list.length;
          if (S.sound) SFX.play('select');
          draw();
        };
      });
      var cb = $('#dclose', m); if (cb) cb.onclick = function () { m.remove(); };
      bindDetailChips(m);
      bindDetailCard(m, E.BY_ID[cid]);
    }
    draw();
    tryFullscreen();
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    // 左右スワイプでも切り替え
    var sx = null;
    m.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    m.addEventListener('touchend', function (e) {
      if (sx == null || list.length < 2) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) < 45) return;
      idx = (idx + (dx < 0 ? 1 : -1) + list.length) % list.length;
      if (S.sound) SFX.play('select');
      draw();
    }, { passive: true });
    document.body.appendChild(m);
  }

  /* ---------- 戦闘中のユニット詳細 ---------- */
  function liveStatHTML(u) {
    var st = S.st;
    var d = u.def;
    var atk = E.getAtk(u, st), spd = E.getSpd(u, st);
    var pwv = atkLive(u);
    pwv.labelJP = pwv.kind === 'heal' ? '回復量' : pwv.kind === 'mag' ? '魔力' : '攻撃';
    var mods = [];
    d.passives.forEach(function (k) {
      var p = E.PASSIVES[k];
      if (!p) return;
      if (p.selfMod) { var m = p.selfMod(u, st) || {}; if (m.atk) mods.push('★' + p.name + ' 攻撃' + (m.atk > 0 ? '+' : '') + m.atk); }
    });
    var aur = E.auraFor(u, st);
    if (aur.atk) mods.push('味方の加護 攻撃+' + aur.atk);
    if (aur.spd) mods.push('味方の加護 素早+' + aur.spd);
    if (aur.physReduce) mods.push('被物理-' + aur.physReduce);
    if (aur.magicReduce) mods.push('被魔法-' + aur.magicReduce);
    var sts = u.statuses.map(function (x) {
      return ({ slow: '鈍化 素早-', weaken: '弱体 攻撃-', curse: '呪詛 継続ダメ', ward: '障壁 被魔法-', guard: '防御 被ダメ-' })[x.key] +
        x.value + '（あと' + x.rounds + 'R）';
    });
    var cds = [];
    d.actions.forEach(function (a) {
      if (u.cd[a.key] > 0) cds.push(a.name + ' あと' + u.cd[a.key] + 'R');
      if (a.uses != null && u.uses[a.key] <= 0) cds.push(a.name + ' 使用済');
    });
    return '<div class="livebox' + (u.side === 0 ? ' s0' : ' s1') + '">' +
      '<div class="lvhd"><b>' + sideName(u.side) + '</b>' +
        (u.row === 0 ? '前衛' : '後衛') + (u.col === 0 ? '左' : u.col === 1 ? '中央' : '右') +
        (u.alive ? '' : '<span style="color:var(--bad)">　戦闘不能</span>') + '</div>' +
      '<div class="lvstats">' +
        '<span><i>HP</i><b>' + Math.max(0, u.hp) + '<u>/' + u.maxHp + '</u></b></span>' +
        '<span><i>' + pwv.labelJP + '</i><b>' + pwv.val +
          (pwv.dir !== 0 ? '<u>(基本' + pwv.base + ')</u>' : '') + '</b></span>' +
        '<span><i>素早</i><b>' + spd +
          (spd !== d.spd ? '<u>(基本' + d.spd + ')</u>' : '') + '</b></span>' +
      '</div>' +
      (mods.length ? '<div class="lvtags">' + mods.map(function (t) { return '<span class="lvt good">' + t + '</span>'; }).join('') + '</div>' : '') +
      (sts.length ? '<div class="lvtags">' + sts.map(function (t) { return '<span class="lvt bad">' + t + '</span>'; }).join('') + '</div>' : '') +
      (cds.length ? '<div class="lvtags">' + cds.map(function (t) { return '<span class="lvt cd">' + t + '</span>'; }).join('') + '</div>' : '') +
      '<div class="lvrow"><span>与ダメージ / 回復 / 撃破</span><b>' + u.stats.dmg + ' / ' + u.stats.heal + ' / ' + u.stats.kills + '</b></div>' +
      '</div>';
  }

  function boardUnits(st) {
    var list = [];
    [[1, 1], [1, 0], [0, 0], [0, 1]].forEach(function (rc) {
      for (var c = 0; c < 3; c++) {
        st.players[rc[0]].units.forEach(function (v) { if (v.row === rc[1] && v.col === c) list.push(v); });
      }
    });
    return list;
  }

  function openUnitDetail(unit) {
    var st = S.st;
    if (!st) { openDetail(unit.defId); return; }
    var list = boardUnits(st);
    var idx = 0;
    list.forEach(function (v, i) { if (v.uid === unit.uid) idx = i; });
    var m = document.createElement('div');
    m.className = 'modal';
    function draw() {
      var u = list[idx];
      m.innerHTML = '<div class="box detailbox">' +
        liveStatHTML(u) +
        '<div class="cardwrap">' + detailHTML(u.def) + '</div>' +
        '<div class="navrow big merged">' +
          '<button class="navb wide" data-nav="-1">◀ 前のキャラ</button>' +
          '<span class="navpos">' + (idx + 1) + ' / ' + list.length + '</span>' +
          '<button class="navb wide" data-nav="1">次のキャラ ▶</button></div>' +
        '<button class="btn ghost" id="uclose" style="width:100%;margin-top:8px">閉じる</button></div>';
      $$('[data-nav]', m).forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          idx = (idx + (+b.dataset.nav) + list.length) % list.length;
          if (S.sound) SFX.play('select');
          draw();
        };
      });
      $('#uclose', m).onclick = function () { m.remove(); };
      bindDetailChips(m);
      bindDetailCard(m, u.def);
    }
    draw();
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    var sx = null;
    m.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    m.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) < 45) return;
      idx = (idx + (dx < 0 ? 1 : -1) + list.length) % list.length;
      if (S.sound) SFX.play('select');
      draw();
    }, { passive: true });
    document.body.appendChild(m);
  }

  /* 長押し＝詳細（タップと衝突しないように、押しっぱなしを検知したらタップは無効化） */
  function bindLongPress(sel, fn) {
    $$(sel).forEach(function (el) {
      var timer = null;
      function start() {
        cancel();
        timer = setTimeout(function () {
          timer = null;
          el._longPressed = true;
          el.classList.add('lpfire');
          setTimeout(function () { el.classList.remove('lpfire'); }, 260);
          if (S.sound) SFX.play('select');
          fn(el);
        }, 420);
      }
      function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
      el.addEventListener('touchstart', start, { passive: true });
      el.addEventListener('touchmove', cancel, { passive: true });
      el.addEventListener('touchend', cancel, { passive: true });
      el.addEventListener('touchcancel', cancel, { passive: true });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', cancel);
      el.addEventListener('mouseleave', cancel);
    });
  }
  function bindInspect() {
    bindLongPress('.unit[data-uid]', function (el) {
      var u = E.findUid(S.st, el.dataset.uid);
      if (u) openUnitDetail(u);
    });
  }

  /* =========================================================
     タイトル
     ========================================================= */
  /* =========================================================
     RPGモード（試験版）── 依頼板とダンジョンへの動線
     ========================================================= */
  var RPGQUESTS = [
    { id: 'q_beast', name: '喰らいの洞の主', dun: 'beast', rooms: 'few', coin: 30,
      lead: '村の北の洞に、家畜と人を襲う主が居着いた。洞の最奥まで進み、討ち果たせ。' },
    { id: 'q_mine', name: '黙した坑道の奥', dun: 'mine', rooms: 'some', coin: 50,
      lead: '音の絶えた坑道の奥で、いまも何かが掘り続けている。正体を確かめ、討て。' },
    { id: 'q_maze', name: '欲深き迷路の先客', dun: 'maze', rooms: 'some', coin: 60,
      lead: '財宝目当ての一団が迷路に消えて久しい。奥に巣食う主を討ち、生きて戻れ。' }
  ];
  function showRPGQuests() {
    var r = SAVE.rpg();
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="box"><div class="rules">' +
      '<h3 style="color:var(--gold)">🗺 RPGモード ── 依頼板（試験版）</h3>' +
      '<p style="font-size:12.5px;opacity:.8">所持硬貨：<b>' + r.coin + '</b> 枚。' +
        '依頼を選ぶとダンジョンに入ります。最奥の主を討てば達成、報酬の硬貨が貯まります' +
        '（硬貨の使い道＝街の武器屋・道具屋は、次の段で入ります）。</p>' +
      '<div class="opt-col">' +
      RPGQUESTS.map(function (q) {
        var c = r.clears[q.id] || 0;
        return '<div class="opt poolopt" data-quest="' + q.id + '">' +
          '<span class="pn">📜 ' + q.name + ' <b>報酬 硬貨' + q.coin + '枚</b>' +
          (c ? ' <b style="color:var(--ok)">✓達成×' + c + '</b>' : '') + '</span>' +
          '<span class="pd">' + q.lead + '</span></div>';
      }).join('') +
      '</div>' +
      '<button class="btn ghost" id="rpgqx" style="width:100%;margin-top:10px">とじる</button>' +
      '</div></div>';
    document.body.appendChild(m);
    m.onclick = function (e) { if (e.target === m) m.remove(); };
    m.querySelector('#rpgqx').onclick = function () { m.remove(); };
    [].forEach.call(m.querySelectorAll('[data-quest]'), function (b) {
      b.onclick = function () {
        var q = RPGQUESTS.filter(function (x) { return x.id === b.dataset.quest; })[0];
        m.remove(); openRPGQuest(q);
      };
    });
  }
  function openRPGQuest(q) {
    BGM.stop && BGM.stop();
    var ov = document.createElement('div');
    ov.id = 'rpgov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:400;background:#000;display:flex;flex-direction:column';
    var f = document.createElement('iframe');
    f.style.cssText = 'flex:1;border:0;width:100%;height:100%';
    f.setAttribute('scrolling', 'no');
    f.setAttribute('allow', 'fullscreen');
    f.allowFullscreen = true;
    f.name = JSON.stringify({ rpgq: 1, id: q.id, name: q.name, lead: q.lead, coin: q.coin, dun: q.dun, rooms: q.rooms });
    ov.appendChild(f);
    document.body.appendChild(ov);
    f.srcdoc = window.RPG_PAGE;
    function closeRPG() { ov.remove(); window.RPGDONE = null; syncBgm(); }
    window.RPGDONE = function (res) {
      closeRPG();
      if (!res) { renderTitle(); return; }
      if (!res.cleared) {
        if (res.coin) {
          var r3 = SAVE.rpgReward(null, res.coin);
          var m3 = document.createElement('div');
          m3.className = 'modal';
          m3.innerHTML = '<div class="box"><div class="rules" style="text-align:center">' +
            '<h3>引き上げた</h3>' +
            '<p>依頼は果たせなかったが、拾い集めた硬貨 <b>' + res.coin + '</b> 枚は持ち帰った。</p>' +
            '<p>所持硬貨：<b>' + r3.coin + '</b> 枚</p>' +
            '<button class="btn primary" id="rok3" style="width:100%">とじる</button></div></div>';
          document.body.appendChild(m3);
          m3.querySelector('#rok3').onclick = function () { m3.remove(); renderTitle(); };
        } else renderTitle();
        return;
      }
      var r2 = SAVE.rpgReward(res.id, res.coin);
      var mm = document.createElement('div');
      mm.className = 'modal';
      mm.innerHTML = '<div class="box"><div class="rules" style="text-align:center">' +
        '<h3 style="color:var(--gold)">依頼達成！</h3>' +
        '<p>「' + q.name + '」を果たした。<br>報酬として硬貨 <b>' + res.coin + '</b> 枚を受け取った。</p>' +
        (res.loot ? '<p style="font-size:12.5px;opacity:.8">（うち ' + res.loot * 10 + ' 枚は、道中で拾い集めたぶん）</p>' : '') +
        '<p>所持硬貨：<b>' + r2.coin + '</b> 枚</p>' +
        '<button class="btn primary" id="rok" style="width:100%">受け取る</button>' +
        '</div></div>';
      document.body.appendChild(mm);
      mm.querySelector('#rok').onclick = function () { mm.remove(); renderTitle(); };
    };
  }

  function renderTitle() {
    app.classList.remove('land', 'lp-bottom', 'lp-side');
    S.gen = (S.gen || 0) + 1;
    S.screen = 'title'; syncBgm();
    app.innerHTML =
      '<div id="screen-title">' +
        '<div><div class="title-logo" style="font-size:34px">ARCANA<br>CLASH</div>' +
        '<div class="sub" style="margin-top:6px">アルカナ・クラッシュ</div>' +
        '<div class="sub" style="margin-top:10px;letter-spacing:.05em;color:#6d7b99">6体編成の陣形カードバトル</div></div>' +
        '<div class="opt-group pool' + (S.pool ? '' : ' need') + '"><div class="opt-label">' +
          (S.pool ? 'カードプール' : '◆ まずカードプールを選んでください') + '</div><div class="opt-col">' +
          ['tutorial', 'starter', 'full'].map(function (k) {
            var P = E.POOLS[k];
            var ic = { tutorial: '🌱', starter: '🎓', full: '🏆' }[k];
            var sub = k === 'tutorial'
              ? '8枚すべてから6体を選ぶ・コスト制限なし'
              : 'コスト' + P.costCap + '以内で4〜6体';
            return '<div class="opt poolopt' + (S.pool === k ? ' on' : '') + '" data-pool="' + k + '">' +
              '<span class="pn">' + ic + ' ' + P.name + ' <b>' + P.size + '枚</b></span>' +
              '<span class="pd">' + P.desc + '</span>' +
              '<span class="ps">' + sub + '</span></div>';
          }).join('') +
        '</div></div>' +
        (S.pool && S.pool !== 'tutorial'
          ? '<div class="opt-group" id="dealbox">' +
            '<div class="opt-label">カードの配り方</div><div class="opt-col">' +
            [['shuffle', '🎲', 'シャッフルモード', 'プールから無作為に選ばれた候補で戦う。<b>敵味方まったく同じ候補</b>なので、引きの差が出ません'],
             ['full', '📚', 'フルカードモード', 'そのプールの<b>全カード</b>が候補。じっくり考えて組みたい人向け']
            ].map(function (o) {
              var sz = E.POOLS[S.pool].size;
              var n = o[0] === 'shuffle' ? Math.min(E.SHUFFLE_SIZE, sz) : sz;
              return '<div class="opt poolopt dealopt' + (S.deal === o[0] ? ' on' : '') + '" data-deal="' + o[0] + '">' +
                '<span class="pn">' + o[1] + ' ' + o[2] + ' <b>候補' + n + '枚</b></span>' +
                '<span class="pd">' + o[3] + '</span></div>';
            }).join('') +
          '</div></div>'
          : '') +
        '<div class="opt-group"><div class="opt-label">対戦モード</div><div class="opt-row">' +
          '<div class="opt' + (S.mode === 'pvp' ? ' on' : '') + '" data-mode="pvp">👥 ふたりで対戦<br><small style="font-weight:600;font-size:10px">1台を交代で</small></div>' +
          '<div class="opt' + (S.mode === 'cpu' ? ' on' : '') + '" data-mode="cpu">🤖 CPUと対戦<br><small style="font-weight:600;font-size:10px">ひとりで</small></div>' +
        '</div></div>' +
        '<div class="opt-group' + (S.mode === 'cpu' ? '' : ' hidden') + '" id="difbox"><div class="opt-label">CPUの強さ</div><div class="opt-row">' +
          ['easy', 'normal', 'hard'].map(function (k, i) {
            return '<div class="opt' + (S.diff === k ? ' on' : '') + '" data-diff="' + k + '">' + ['かんたん', 'ふつう', 'つよい'][i] + '</div>';
          }).join('') +
        '</div></div>' +
        '<button class="btn primary" id="go" style="width:100%;font-size:16px;padding:15px"' +
          (S.pool ? '' : ' disabled') + '>' + (S.pool ? '⚔ 戦いを始める' : '↑ カードプールを選択') + '</button>' +
        /* 2段に分ける。1段に4つ並べると幅が足りず、日本語が1文字ずつ折り返される */
        '<div style="display:flex;gap:8px">' +
          '<button class="btn ghost" id="rules" style="flex:1;white-space:nowrap">📖 ルール</button>' +
          '<button class="btn ghost" id="gallery" style="flex:1;white-space:nowrap">🗂 カード図鑑</button>' +
          '<button class="btn ghost" id="fs0" style="flex:0 0 52px" title="全画面">⛶</button>' +
        '</div>' +
        '<button class="btn ghost" id="rpg0" style="width:100%;white-space:nowrap">🗺 RPGモード（試験版）' +
          (SAVE.rpg().coin ? '<span class="rcnt">硬貨 ' + SAVE.rpg().coin + '</span>' : '') + '</button>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn ghost" id="snd0" style="flex:1;white-space:nowrap">' +
            (S.sound ? '♪ 効果音 ON' : '♪ 効果音 OFF') + '</button>' +
          '<button class="btn ghost" id="bgm0" style="flex:1;white-space:nowrap">' +
            (S.bgm ? '🎵 BGM ON' : '🎵 BGM OFF') + '</button>' +
        '</div>' +
        '<div class="opt-group"><div class="opt-label">画面表示</div><div class="opt-col">' +
          '<div class="opt poolopt tgl' + (S.compact ? ' on' : '') + '" data-tgl="compact">' +
            '<span class="pn">📐 コンパクト表示 <b>' + (S.compact ? 'ON' : 'OFF') + '</b></span>' +
            '<span class="pd">行動順バーと戦闘ログを畳んで、<b>盤面を大きく</b>します。' +
              'スクロールせずに全体が見えるようになります</span></div>' +
          '<div class="opt poolopt tgl' + (S.sideBySide ? ' on' : '') + '" data-tgl="sideBySide">' +
            '<span class="pn">🤝 横並び対戦 <b>' + (S.sideBySide ? 'ON' : 'OFF') + '</b></span>' +
            '<span class="pd">編成は<b>縦持ちで各自</b>、戦闘は<b>端末を横にして隣同士</b>で。' +
              '向きがひとつなので、どちらからも同じように読めます</span></div>' +

        '</div></div>' +
        '<button class="btn ghost" id="record" style="width:100%">📊 戦績・記録' +
          (SAVE.gameCount() ? '<span class="rcnt">' + SAVE.gameCount() + '戦</span>' : '') + '</button>' +
        (VERSION ? '<div class="verlab">ver ' + VERSION + '</div>' : '') +
      '</div>';
    $$('[data-pool]').forEach(function (b) { b.onclick = function () { S.pool = b.dataset.pool; E.setPool(S.pool); rememberSettings(); renderTitle(); }; });
    $$('[data-deal]').forEach(function (b) { b.onclick = function () { S.deal = b.dataset.deal; E.setDealMode(S.deal); rememberSettings(); renderTitle(); }; });
    $$('[data-tgl]').forEach(function (b) { b.onclick = function () {
      var k = b.dataset.tgl;
      S[k] = !S[k];
      rememberSettings(); renderTitle();
    }; });
    $$('[data-mode]').forEach(function (b) { b.onclick = function () { S.mode = b.dataset.mode; rememberSettings(); renderTitle(); }; });
    $$('[data-diff]').forEach(function (b) { b.onclick = function () { S.diff = b.dataset.diff; rememberSettings(); renderTitle(); }; });
    $('#go').onclick = startGame;
    $('#rules').onclick = showRules;
    $('#fs0').onclick = toggleFullscreen;
    $('#gallery').onclick = showGallery;
    $('#snd0').onclick = function () { S.sound = !S.sound; SFX.setEnabled(S.sound); rememberSettings(); if (S.sound) SFX.play('select'); renderTitle(); };
    $('#bgm0').onclick = function () { S.bgm = !S.bgm; rememberSettings(); syncBgm(); renderTitle(); };
    $('#record').onclick = showRecord;
    $('#rpg0').onclick = showRPGQuests;
  }

  function showRules() {
    if (S.screen === 'title') { E.setPool(S.pool || 'full'); E.setDealMode(S.deal || 'shuffle'); }
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="box"><div class="rules">' +
      '<h3 style="color:var(--gold)">ルール</h3>' +
      '<h4>1. 編成</h4><ul>' +
      (E.getDealMode() === 'full' || E.getPool() === 'tutorial'
        ? '<li>📚 <b>フルカードモード</b>：プールの<b>全' + E.handSize() + '枚</b>が候補。' +
          '敵味方まったく同じ候補から選ぶ</li>'
        : '<li>🎲 <b>シャッフルモード</b>：プールから無作為に選ばれた<b>' + E.handSize() + '枚</b>が候補。' +
          '<b>敵味方はまったく同じ' + E.handSize() + '枚</b>から選ぶので、引きの差では負けない</li>') +
      '<li>配り方はタイトル画面の「カードの配り方」で切り替えられる</li>' +
      '<li>使用中のプール：<b style="color:var(--gold)">' + E.POOLS[E.getPool()].name +
        ' ' + E.poolIds().length + '枚</b>（タイトル画面で変更できます）</li>' +
      (isFinite(E.costCap())
        ? '<li><b>' + E.minUnits() + '〜' + E.maxUnits() + '体</b>まで／<b>編成コスト合計 ' + E.costCap() + ' 以内</b></li>'
        : '<li><b>' + E.maxUnits() + '体ちょうど</b>を配置する（コスト制限なし）</li>') +
      '<li>盤面は<b>前衛3マス・後衛3マス</b>。候補をタップすると<b>前衛の左から順に</b>置かれ、' +
        '場のカードをタップすると<b>移動・入れ替え・取り外し</b>ができる</li>' +
      '<li><b>⇅ 自動整列</b>を押すと、近接を前衛・遠隔を後衛へまとめて並べ替えられる</li>' +
      (E.getPool() === 'tutorial'
        ? '<li style="color:var(--gold)">入門モードでは<b>特殊能力・状態異常・回復が一切ありません</b>。' +
          '体力・攻撃力・射程・行動順の4つだけで勝負が決まります</li>'
        : '') + '</ul>' +
      '<h4>2. 戦闘</h4><ul>' +
      '<li>両者が配置し終えると全キャラが<b>オープン</b>になる</li>' +
      '<li><b>素早さが高い順</b>に行動。同値は「残HPが多い→前衛→中央寄り」の順で、それも同じなら先攻側が毎ラウンド交代</li>' +
      '<li>近接攻撃は<b>正面の敵</b>が対象。正面が空なら奥の敵、それも空なら最寄りの敵へ回り込む</li>' +
      '<li>後衛にいる近接キャラは、自分の列の前衛が倒れると<b>自動的に前進</b>する。前進できない間は<b>防御</b>（被ダメ-2）</li>' +
      '<li>ダメージは軽減後も<b>最低1</b>は通る</li></ul>' +
      '<h4>3. 勝敗</h4><ul>' +
      '<li>相手を<b>全滅</b>させたら勝ち</li>' +
      '<li>' + E.MAX_ROUNDS + 'ラウンド経過、または2ラウンド連続で誰もダメージを与えられない場合は<b>判定</b></li>' +
      '<li>判定は上から順に <code>生存数 → 残HP合計 → 与ダメージ合計 → 編成コストの少なさ</code> で比較。決め手は結果画面に明示される</li></ul>' +
      '<h4>4. カードの数字の見かた</h4>' +
      '<div class="marklist">' +
      '<div class="markrow"><span class="mk" style="color:#ffb36b">力</span><div><b>物理の攻撃力</b>' +
        '<span>剣・爪・矢などで直接与えるダメージ</span></div></div>' +
      '<div class="markrow"><span class="mk" style="color:#c98cff">魔</span><div><b>魔法の威力</b>' +
        '<span>炎・氷・闇などの技で与えるダメージ</span></div></div>' +
      '<div class="markrow"><span class="mk" style="color:#7de8a4">癒</span><div><b>回復量</b>' +
        '<span>味方のHPを戻す量。回復技を持つキャラはこの表示になる</span></div></div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--dim);margin-top:4px">' +
      '※数字と右上の射程マークは、そのキャラの<b>一番強い技</b>のものを表示しています。' +
      '戦闘中の盤面では<b>いまの値</b>になり、素の値から変化していると ▲▼ が付きます。</div>' +
      '<h4>5. カード右上の記号（射程マーク）</h4>' +
      '<div class="marklist">' +
      ['melee','pierce','front_row','any1','weakest','square','row','all','ally1','all_ally','dead_ally']
        .filter(function (k, i, a) { return a.indexOf(k) === i; })
        .map(function (k) {
          var m = RANGE_MARK[k];
          var who = E.ROSTER.filter(function (d) {
            return E.inPool(d.id) && d.actions.some(function (a) { return a.range === k; });
          }).map(function (d) { return d.name; });
          if (!who.length) return '';
          return '<div class="markrow"><span class="mk">' + m.mark + '</span>' +
            '<div><b>' + m.name + '</b><span>' + m.desc + '</span>' +
            '<em>' + who.length + '体：' + who.join('・') + '</em></div></div>';
        }).join('') +
      '</div>' +
      '<div style="font-size:11px;color:var(--dim);margin-top:6px">※カード右上のマークは「1つ目の技」の射程です。2つ技を持つキャラは戦闘中に切り替えられます。</div>' +
      '<h4>6. コツ</h4><ul>' +
      '<li>回復役・遠隔役は<b>後衛</b>へ。ただし飛行や範囲攻撃には後衛も狙われる</li>' +
      '<li>盾騎士や吟遊詩人のように<b>いるだけで味方全体を強化</b>するカードがある</li>' +
      '<li>安いカードを6体並べるか、高コストの切り札に寄せるかが最大の駆け引き</li></ul>' +
      '</div><button class="btn ghost" style="width:100%;margin-top:10px">閉じる</button></div>';
    m.onclick = function (ev) { if (ev.target === m || ev.target.tagName === 'BUTTON') m.remove(); };
    document.body.appendChild(m);
  }

  /* =========================================================
     戦績・記録
     ========================================================= */
  function fmtDate(ms) {
    var d = new Date(ms);
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  var RES_LABEL = { win: '勝ち', lose: '負け', draw: '引き分け' };

  function showRecord() {
    var m = document.createElement('div');
    m.className = 'modal';
    var tab = 'sum';
    var openId = null;

    function poolName(k) { return (E.POOLS[k] || {}).name || k; }

    function sumHTML() {
      var st = SAVE.stats().total, byPool = SAVE.stats().byPool;
      if (!st.games) {
        return '<div class="rc-empty">まだ記録がありません。<br>1戦終えると、ここに結果が残っていきます。</div>';
      }
      var pools = Object.keys(byPool).map(function (k) {
        var P = byPool[k];
        return '<tr><td>' + poolName(k) + '</td><td>' + P.games + '戦</td>' +
          '<td>' + P.win + '勝</td><td class="hl">' + Math.round(P.win / P.games * 100) + '%</td></tr>';
      }).join('');
      return '<div class="rc-hero">' +
          '<div class="rc-rate"><b>' + st.rate + '</b><span>%</span><i>勝率</i></div>' +
          '<div class="rc-wl">' +
            '<span class="w">' + st.win + '</span>勝　' +
            '<span class="l">' + st.lose + '</span>敗' +
            (st.draw ? '　<span class="d">' + st.draw + '</span>分' : '') +
            '<i>通算 ' + st.games + ' 戦</i></div>' +
        '</div>' +
        '<div class="rc-kv">' +
          '<div><b>' + st.ko + '</b><span>全滅で決着</span></div>' +
          '<div><b>' + st.judge + '</b><span>判定で決着</span></div>' +
          '<div><b>' + st.avgRounds + '</b><span>平均ラウンド</span></div>' +
        '</div>' +
        '<h4 class="rc-h">カードプール別</h4>' +
        '<table class="rc-tab">' + pools + '</table>';
    }

    function teamStrip(rec) {
      if (!rec || !rec.units) return '';
      var us = rec.units.slice().sort(function (a, b) { return (a.row - b.row) || (a.col - b.col); });
      return '<div class="rc-strip">' + us.map(function (u) {
        var d = E.BY_ID[u.id];
        if (!d) return '';
        return '<div class="rc-u' + (u.alive ? '' : ' dead') + '">' +
          '<div class="pic">' + ART.portrait(d.id, d.elem) + '</div>' +
          '<b>' + d.name + '</b>' +
          '<span>' + [u.dmg ? '与' + u.dmg : '', u.heal ? '癒' + u.heal : '', u.kills ? '撃' + u.kills : '']
            .filter(Boolean).join(' ') + '</span></div>';
      }).join('') + '</div>';
    }

    function histHTML() {
      var gs = SAVE.games();
      if (!gs.length) return '<div class="rc-empty">まだ記録がありません。</div>';
      return gs.slice(0, 60).map(function (g, i) {
        var id = 'g' + i;
        var open = openId === id;
        var mode = g.mode === 'cpu'
          ? 'CPU・' + ({ easy: 'かんたん', normal: 'ふつう', hard: 'つよい' }[g.diff] || g.diff)
          : 'ふたりで対戦';
        return '<div class="rc-row ' + g.result + (open ? ' open' : '') + '" data-g="' + id + '">' +
          '<div class="rc-rh">' +
            '<span class="rc-res">' + RES_LABEL[g.result] + '</span>' +
            '<div class="rc-meta"><b>' + poolName(g.pool) + '</b>' +
              '<span>' + mode + '　' + (g.deal === 'full' ? 'フルカード' : 'シャッフル') + '</span></div>' +
            '<span class="rc-when">' + fmtDate(g.at) + '<i>' + g.rounds + 'R・' +
              (g.how === 'KO' ? '全滅' : '判定') + '</i></span>' +
          '</div>' +
          (open ? '<div class="rc-detail">' +
            (g.decidedBy ? '<div class="rc-dec">決め手：' + g.decidedBy.replace('（少ない方が勝ち）', '') + '</div>' : '') +
            '<div class="rc-side">自分の編成</div>' + teamStrip(g.me) +
            '<div class="rc-side foe">相手の編成</div>' + teamStrip(g.foe) +
          '</div>' : '') +
        '</div>';
      }).join('');
    }

    function charHTML() {
      var byChar = SAVE.stats().byChar;
      var list = Object.keys(byChar).map(function (k) { return byChar[k]; })
        .filter(function (c) { return E.BY_ID[c.id]; })
        .sort(function (a, b) { return b.used - a.used || b.dmg - a.dmg; });
      if (!list.length) return '<div class="rc-empty">まだ記録がありません。</div>';
      return '<div class="rc-note">自分が使ったキャラの成績です。使用回数の多い順。</div>' +
        list.map(function (c) {
          var d = E.BY_ID[c.id];
          var rate = Math.round(c.win / c.used * 100);
          return '<div class="rc-crow">' +
            '<div class="pic">' + ART.portrait(d.id, d.elem) + '</div>' +
            '<div class="rc-cmain"><b>' + d.name + '</b>' +
              '<span>' + c.used + '回使用　生存率 ' + Math.round(c.survived / c.used * 100) + '%</span>' +
              '<div class="rc-bar"><div style="width:' + rate + '%"></div></div></div>' +
            '<div class="rc-cnum"><b>' + rate + '%</b><i>勝率</i>' +
              '<span>与ダメ ' + c.dmg + '</span>' +
              (c.heal ? '<span>回復 ' + c.heal + '</span>' : '') +
              '<span>撃破 ' + c.kills + '</span></div>' +
          '</div>';
        }).join('');
    }

    function dataHTML() {
      return '<div class="rc-note">' +
          (SAVE.available()
            ? 'この端末に記録が保存されています。ブラウザのデータを消すと記録も消えます。'
            : '<b style="color:#ffb9c5">⚠ この開き方では記録を保存できません。</b><br>' +
              'ファイルを直接開いているためです。下の「書き出し」でコードを控えておくか、' +
              'Webに置いた版（https://…）で遊ぶと確実に保存されます。') +
        '</div>' +
        '<h4 class="rc-h">バックアップ・引き継ぎ</h4>' +
        '<div class="rc-note">コードを控えておけば、別の端末や新しい版に記録を引き継げます。</div>' +
        '<div class="rc-btns">' +
          '<button class="btn ghost small" id="rc-exp">📤 書き出す</button>' +
          '<button class="btn ghost small" id="rc-imp">📥 読み込む</button>' +
        '</div>' +
        '<textarea class="rc-code" id="rc-area" placeholder="ここにコードが出ます／貼り付けます" spellcheck="false"></textarea>' +
        '<h4 class="rc-h">記録の削除</h4>' +
        '<div class="rc-btns">' +
          '<button class="btn ghost small danger" id="rc-clrg">対戦履歴だけ消す</button>' +
          '<button class="btn ghost small danger" id="rc-clra">すべて消す</button>' +
        '</div>';
    }

    function repHTML() {
      var rs = [];
      try { rs = SAVE.replays(); } catch (e) {}
      if (!rs.length) {
        return '<div class="rc-empty">まだ記録がありません。<br>' +
          '1戦終えると、その対戦をあとから再現できるデータが残ります。</div>';
      }
      return '<p style="font-size:11.5px;color:var(--dim);line-height:1.85;margin:0 0 10px">' +
        'おかしな動きに気づいたら、その対戦の<b style="color:var(--gold)">コードをコピー</b>して' +
        'クロちゃんに貼ってください。<b style="color:var(--gold)">同じ戦闘をそのまま再現</b>して、' +
        '1手ずつ何が起きたかを確かめられます。直近' + rs.length + '戦ぶんを保存しています。</p>' +
        rs.map(function (r, i) {
          var d = new Date(r.at || Date.now());
          var res = r.result && r.result.w === 0 ? '勝ち' : r.result && r.result.w === 1 ? '負け' : '引分';
          return '<div class="rc-row" style="display:flex;align-items:center;gap:8px;padding:7px 2px;' +
            'border-bottom:1px solid var(--line)">' +
            '<span style="font-size:11px;color:var(--dim);white-space:nowrap">' +
              (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
              ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '</span>' +
            '<span style="font-size:11.5px;font-weight:900;flex:1;min-width:0">' + res +
              ' <span style="color:var(--dim);font-weight:400">' + (r.result ? r.result.r : '?') + 'R・' +
              poolName(r.pool) + '</span></span>' +
            '<button class="btn ghost small" data-rep="' + i + '" style="flex:0 0 auto">コピー</button>' +
          '</div>';
        }).join('');
    }

    function draw() {
      var body = tab === 'sum' ? sumHTML()
        : tab === 'hist' ? histHTML()
        : tab === 'char' ? charHTML()
        : tab === 'rep' ? repHTML() : dataHTML();
      m.innerHTML = '<div class="box">' +
        '<h3 style="color:var(--gold);margin-bottom:6px">戦績・記録</h3>' +
        '<div class="gtabs">' +
          [['sum', '📈 通算'], ['hist', '📜 履歴'], ['char', '👤 キャラ'], ['rep', '🐞 不具合'], ['data', '⚙ データ']]
            .map(function (o) {
              return '<button class="gtab' + (tab === o[0] ? ' on' : '') + '" data-rt="' + o[0] + '">' + o[1] + '</button>';
            }).join('') +
        '</div>' +
        '<div class="rc-body">' + body + '</div>' +
        '<button class="btn ghost" id="rc-close" style="width:100%;margin-top:12px">閉じる</button></div>';

      $$('[data-rt]', m).forEach(function (b) {
        b.onclick = function (ev) { ev.stopPropagation(); tab = b.dataset.rt; openId = null; draw(); };
      });
      $$('[data-g]', m).forEach(function (r) {
        r.onclick = function (ev) {
          ev.stopPropagation();
          openId = (openId === r.dataset.g) ? null : r.dataset.g;
          draw();
        };
      });
      $$('[data-rep]', m).forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          try {
            var rs = SAVE.replays();
            copyText(SAVE.replayCode(rs[+b.dataset.rep]), 'コードをコピーしました');
          } catch (e) { toast('コピーできませんでした'); }
        };
      });
      $('#rc-close', m).onclick = function () { m.remove(); renderTitle(); };

      var area = $('#rc-area', m);
      if ($('#rc-exp', m)) $('#rc-exp', m).onclick = function () {
        area.value = SAVE.exportCode();
        area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
        function fallback() {
          try {
            if (document.execCommand('copy')) { toast('コードをコピーしました'); return; }
          } catch (e) {}
          toast('コードを表示しました。長押しでコピーしてください');
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(area.value)
            .then(function () { toast('コードをコピーしました'); })
            .catch(fallback);
        } else fallback();
      };
      if ($('#rc-imp', m)) $('#rc-imp', m).onclick = function () {
        var r = SAVE.importCode(area.value);
        if (r.ok) { toast('読み込みました（' + r.games + '戦）'); draw(); }
        else toast(r.msg);
      };
      function confirmBtn(id, label, run) {
        var b = $(id, m);
        if (!b) return;
        b.onclick = function () {
          if (b.dataset.armed) { run(); return; }
          b.dataset.armed = '1';
          b.classList.add('armed');
          b.textContent = '本当に消す？（もう一度）';
          setTimeout(function () {
            if (!b.dataset.armed) return;
            delete b.dataset.armed; b.classList.remove('armed'); b.textContent = label;
          }, 4000);
        };
      }
      confirmBtn('#rc-clrg', '対戦履歴だけ消す', function () {
        SAVE.clearGames(); toast('対戦履歴を消しました'); draw();
      });
      confirmBtn('#rc-clra', 'すべて消す', function () {
        SAVE.clearAll(); toast('すべての記録を消しました'); draw();
      });
    }

    draw();
    m.onclick = function (ev) { if (ev.target === m) { m.remove(); renderTitle(); } };
    document.body.appendChild(m);
  }

  function showGallery() {
    var m = document.createElement('div');
    m.className = 'modal gallery';
    var tab = 'full';
    var sort = 'line';                                  // line / cost / atk / hp / spd

    var SORTS = [
      { k: 'line', n: '系統別', d: '系統ごとに Tier1 → Tier2 → Tier3 の順で並べます。青い「近日」カードはまだ編成に使えません' },
      { k: 'cost', n: 'コスト順', d: 'コストの安い順。編成の枠と相談するときに' },
      { k: 'atk',  n: '攻撃力順', d: '攻撃力（回復役は回復量）の高い順' },
      { k: 'hp',   n: '体力順',   d: '体力の高い順。前衛を探すときに' },
      { k: 'spd',  n: '素早さ順', d: '素早さの高い順。先に動く順番' }
    ];
    function valOf(d, k) {
      if (k === 'cost') return d.cost;
      if (k === 'hp') return d.hp;
      if (k === 'spd') return d.spd;
      return atkInfo(d).val;
    }
    function poolIds() {
      return (tab === 'full') ? E.ROSTER.map(function (x) { return x.id; }) : E.POOLS[tab].ids.slice();
    }

    function draw() {
      var ids = poolIds();
      var star = E.POOLS.starter.ids;
      var body = '';

      if (sort === 'line') {
        var showTeaser = (tab === 'full');
        LINE_ORDER.forEach(function (ln) {
          var mine = ids.filter(function (id) { return lineOf(E.BY_ID[id]) === ln; });
          if (!mine.length) return;
          var L = LINES[ln];

          // ラインの起点（Tier1）を集めて、上へ辿って並べる
          function stepOf(id) {
            var d = E.BY_ID[id] || E.TEASER_BY_ID[id];
            return d ? { id: id, name: d.name, teaser: !E.BY_ID[id], up: d.up } : null;
          }
          var chains = [], used = {};
          mine.forEach(function (id) {
            var d = E.BY_ID[id];
            if (d.base) return;                       // 途中の段は起点にしない
            if (!d.up) return;                        // 独立は後で
            var chain = [], cur = id, guard = 0;
            while (cur && guard++ < 5) {
              var st2 = stepOf(cur);
              if (!st2) break;
              if (st2.teaser && !showTeaser) break;
              chain.push(st2); used[cur] = 1; cur = st2.up;
            }
            if (chain.length > 1) chains.push(chain);
          });
          var solo = mine.filter(function (id) { return !used[id] && !E.BY_ID[id].base; });

          // この系統の欄に実際に並ぶイメージ枠の数
          var soon = 0;
          chains.forEach(function (ch) { ch.forEach(function (x) { if (x.teaser) soon++; }); });
          body += '<div class="lsec" style="--lc:' + L.c + '">' +
            '<div class="lhd"><span class="lg">' + ln + '</span><b>' + L.name + '</b>' +
            '<span class="cnt">' + mine.length + '体' + (soon ? '＋近日' + soon : '') + '</span></div>' +
            '<div class="lrule">' + L.rule + '</div>';

          chains.forEach(function (chain) {
            body += '<div class="tierrow">' + chain.map(function (st3, i) {
              var card = st3.teaser ? teaserHTML(E.TEASER_BY_ID[st3.id])
                : cardHTML(st3.id, { en: 1, cls: (tab === 'full' && star.indexOf(st3.id) < 0) ? ' expand' : '' });
              return (i ? '<div class="parrow">▶</div>' : '') +
                '<div class="pc">' + card +
                '<span class="ptag' + (i === 0 ? '' : (st3.teaser ? ' soon' : ' up')) + '">Tier ' + (i + 1) + '</span></div>';
            }).join('') + '</div>';
          });

          if (solo.length) {
            body += '<div class="solohd">上位互換なし（独立）</div><div class="ggrid">' +
              solo.map(function (id) {
                return cardHTML(id, { en: 1, cls: (tab === 'full' && star.indexOf(id) < 0) ? ' expand' : '' });
              }).join('') + '</div>';
          }
          body += '</div>';
        });
        if (showTeaser) {
          body += '<div class="lsec concepts"><div class="lhd"><span class="lg" style="background:#4a5a80">?</span>' +
            '<b>まだ見ぬ者たち</b><span class="cnt">構想中</span></div>' +
            '<div class="lrule">名前だけが決まっているライン。実装するかどうかも含めて検討中です。</div>' +
            E.CONCEPTS.map(function (c) {
              return '<div class="crow"><span class="ci">' + c.icon + '</span><b>' + c.line + '</b>' +
                '<span class="cl">' + c.low + '</span><span class="ca">▶</span><span class="ch">' + c.high + '</span></div>';
            }).join('') + '</div>';
        }
      } else {
        var sorted = ids.slice().sort(function (x, y) {
          var dx = E.BY_ID[x], dy = E.BY_ID[y];
          var vx = valOf(dx, sort), vy = valOf(dy, sort);
          if (vx !== vy) return sort === 'cost' ? vx - vy : vy - vx;
          return dx.cost - dy.cost;
        });
        var unit = { cost: 'コスト', atk: '攻撃', hp: '体力', spd: '素早' }[sort];
        var last = null;
        body += '<div class="ggrid sortgrid">';
        sorted.forEach(function (id) {
          var d = E.BY_ID[id], v = valOf(d, sort);
          if (v !== last) { last = v; }
          body += '<div class="sortcell"><div class="sortv">' + unit + ' ' + v + '</div>' +
            cardHTML(id, { en: 1, cls: (tab === 'full' && star.indexOf(id) < 0) ? ' expand' : '' }) + '</div>';
        });
        body += '</div>';
      }

      m.innerHTML = '<div class="box">' +
        '<h3 style="color:var(--gold);margin-bottom:6px">カード図鑑</h3>' +
        '<div class="gtabs">' +
          '<button class="gtab' + (tab === 'tutorial' ? ' on' : '') + '" data-tab="tutorial">🌱 入門 ' + E.POOLS.tutorial.ids.length + '</button>' +
          '<button class="gtab' + (tab === 'starter' ? ' on' : '') + '" data-tab="starter">🎓 スターター ' + E.POOLS.starter.ids.length + '</button>' +
          '<button class="gtab' + (tab === 'full' ? ' on' : '') + '" data-tab="full">🏆 ' + E.POOLS.full.name + ' ' + E.ROSTER.length + '</button>' +
        '</div>' +
        '<div class="gsorts">' + SORTS.map(function (o) {
          return '<button class="gsort' + (sort === o.k ? ' on' : '') + '" data-sort="' + o.k + '">' + o.n + '</button>';
        }).join('') + '</div>' +
        '<div class="gnote">' + (SORTS.filter(function (o) { return o.k === sort; })[0] || {}).d +
          '　カードをタップで詳細' + (tab === 'full' ? '　<span style="color:#c98cff">紫枠＝拡張</span>' : '') + '</div>' +
        body +
        '<button class="btn ghost" id="gclose" style="width:100%;margin-top:12px">閉じる</button></div>';

      $$('[data-tab]', m).forEach(function (b) {
        b.onclick = function (ev) { ev.stopPropagation(); tab = b.dataset.tab; draw(); };
      });
      $$('[data-sort]', m).forEach(function (b) {
        b.onclick = function (ev) { ev.stopPropagation(); sort = b.dataset.sort; draw(); };
      });
      $('#gclose', m).onclick = function () { m.remove(); };
      $$('[data-card]', m).forEach(function (c) {
        c.onclick = function (ev) { ev.stopPropagation(); openDetail(c.dataset.card, poolIds()); };
      });
      $$('[data-teaser]', m).forEach(function (c) {
        c.onclick = function (ev) { ev.stopPropagation(); openTeaser(c.dataset.teaser); };
      });
    }
    draw();
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  /* =========================================================
     ゲーム開始・編成
     ========================================================= */
  function startGame() {
    E.setPool(S.pool || 'full');
    E.setDealMode(S.deal || 'shuffle');
    var d = E.deal();
    S.hands = [d.hands[0].slice(), d.hands[1].slice()];
    S.teams = [[], []];
    S.mulligan = [true, true];
    S.hist = [[], []];
    S.selSlot = null; S.selCard = null;
    S.draftIdx = 0;
    if (S.mode === 'cpu') {
      S.teams[1] = AI.buildTeam(S.hands[1], S.diff, Math.random);
      renderDraft();
    } else {
      renderPass(0, function () { renderDraft(); });
    }
  }

  function renderPass(side, next) {
    app.classList.remove('land', 'lp-bottom', 'lp-side');
    S.screen = 'pass'; syncBgm();
    app.innerHTML = '<div id="screen-pass">' +
      '<div class="pass-icon">📱</div>' +
      '<h2 style="color:' + (side === 0 ? 'var(--p1)' : 'var(--p2)') + '">プレイヤー' + (side + 1) + ' の番です</h2>' +
      '<div style="color:var(--dim);font-size:13px">相手に見られないよう端末を受け取ってください</div>' +
      '<button class="btn primary" id="pgo" style="padding:16px 34px;font-size:16px">タップして開始</button></div>';
    $('#pgo').onclick = next;
  }

  /* 編成が済んだあと、端末を横にしてもらうための画面。
     横向きになるとボタンが光る。縦のままでも押せる（強制はしない）。 */
  function renderReady() {
    S.screen = 'ready'; syncBgm();
    var land = isLandscape();
    var vs = S.mode === 'cpu' ? 'CPU' : 'プレイヤー2';
    app.innerHTML =
      '<div id="screen-ready">' +
        '<div class="rd-art' + (land ? ' ok' : '') + '">' +
          '<svg viewBox="0 0 200 120" aria-hidden="true">' +
            '<rect class="dev" x="78" y="18" width="44" height="84" rx="7"/>' +
            '<rect class="dev-l" x="46" y="38" width="108" height="44" rx="7"/>' +
            '<path class="arr" d="M64 30 A46 46 0 0 1 140 30" fill="none"/>' +
            '<polygon class="arr-h" points="140,22 150,32 136,38"/>' +
            '<circle class="ppl p1" cx="34" cy="98" r="9"/>' +
            '<circle class="ppl p2" cx="60" cy="98" r="9"/>' +
          '</svg>' +
        '</div>' +
        '<h2>' + (land ? '準備できました' : '端末を横向きにしてください') + '</h2>' +
        '<p class="rd-lead">' +
          'ふたりで<b>隣に並んで</b>座り、端末を横にして置いてください。<br>' +
          '<b>左がプレイヤー1、右が' + vs + '</b>の陣地になります。' +
        '</p>' +
        '<p class="rd-note">横並びなら画面の向きがひとつなので、' +
          'どちらからも同じように数字が読めます。</p>' +
        '<button class="btn primary" id="rgo"' + (land ? ' data-ready="1"' : '') + '>' +
          (land ? '⚔ 対戦開始' : '⚔ このまま開始する') + '</button>' +
        '<button class="btn ghost small" id="rback">編成に戻る</button>' +
      '</div>';
    $('#rgo').onclick = function () {
      /* 「対戦開始」のタップは利用者の操作なので、ここでなら全画面に入れる。
         対応していない端末では黙って通常表示のまま進む。 */
      try {
        var el = document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
          var r = req.call(el);
          if (r && r.catch) r.catch(function () {});
        }
      } catch (e) {}
      beginBattle();
    };
    $('#rback').onclick = function () {
      S.draftIdx = (S.mode === 'pvp') ? 1 : 0;
      renderDraft();
    };
  }

  function teamCost(t) { return t.reduce(function (s, c) { return s + E.BY_ID[c.id].cost; }, 0); }

  /* ---------- 編成の並べ替えロジック ---------- */
  var FILL_ORDER = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]];
  /* 前衛向きの射程（近接して殴るもの）。それ以外は後衛向き */
  var FRONT_RANGE = { melee: 1, pierce: 1, front_row: 1, adj_ally: 1 };
  function unitAtSlot(team, row, col) {
    for (var i = 0; i < team.length; i++) if (team[i].row === row && team[i].col === col) return team[i];
    return null;
  }
  /* 前衛のいない列に後衛は立てない。空いた前衛マスへ繰り上げる。 */
  function compactTeam(team) {
    var out = team.map(function (c) { return { id: c.id, row: c.row, col: c.col }; });
    for (var col = 0; col < 3; col++) {
      if (out.some(function (c) { return c.row === 0 && c.col === col; })) continue;
      for (var i = 0; i < out.length; i++) {
        if (out[i].row === 1 && out[i].col === col) { out[i].row = 0; break; }
      }
    }
    return out;
  }
  /* その配置が規則を満たしているか（＝繰り上げが起きないか） */
  function legalTeam(team) {
    for (var col = 0; col < 3; col++) {
      var hasBack  = team.some(function (c) { return c.row === 1 && c.col === col; });
      var hasFront = team.some(function (c) { return c.row === 0 && c.col === col; });
      if (hasBack && !hasFront) return false;
    }
    return true;
  }
  /* sel を (row,col) へ動かした結果の配置。入れ替えも考慮する */
  function afterMove(team, sel, row, col) {
    var other = unitAtSlot(team, row, col);
    return team.map(function (c) {
      if (c === sel)  return { id: c.id, row: row, col: col };
      if (other && c === other) return { id: c.id, row: sel.row, col: sel.col };
      return { id: c.id, row: c.row, col: c.col };
    });
  }

  function firstEmpty(team) {
    for (var i = 0; i < FILL_ORDER.length; i++) {
      var f = FILL_ORDER[i];
      if (!unitAtSlot(team, f[0], f[1])) return f;
    }
    return null;
  }
  function wantsFront(id) {
    var d = E.BY_ID[id];
    return !!FRONT_RANGE[atkInfo(d).range];
  }
  /* 近接を前衛・遠隔を後衛へ。前衛は体力順、後衛は素早さ順に左から並べる */
  function autoArrange(team) {
    var fr = [], bk = [];
    team.forEach(function (c) { (wantsFront(c.id) ? fr : bk).push(c.id); });
    var byHp  = function (a, b) { return E.BY_ID[b].hp - E.BY_ID[a].hp || E.BY_ID[b].cost - E.BY_ID[a].cost; };
    var bySpd = function (a, b) { return E.BY_ID[b].spd - E.BY_ID[a].spd || E.BY_ID[b].cost - E.BY_ID[a].cost; };
    fr.sort(byHp); bk.sort(bySpd);
    while (fr.length > 3) bk.push(fr.pop());   // 前衛があふれたら、いちばん柔らかいのを後ろへ
    if (bk.length > 3) {                       // 後衛があふれたら、いちばん硬いのを前へ
      bk.sort(byHp);
      while (bk.length > 3) fr.push(bk.shift());
    }
    /* 後衛は前衛の数を超えられない（前衛のいない列に後衛は立てないため） */
    if (bk.length > fr.length) {
      bk.sort(byHp);
      while (bk.length > fr.length) fr.push(bk.shift());
    }
    fr.sort(byHp); bk.sort(bySpd);
    var out = [];
    fr.forEach(function (id, i) { out.push({ id: id, row: 0, col: i }); });
    bk.forEach(function (id, i) { out.push({ id: id, row: 1, col: i }); });
    return out;
  }
  function sameTeam(a, b) {
    if (a.length !== b.length) return false;
    var k = function (t) {
      return t.map(function (c) { return c.row + '-' + c.col + '-' + c.id; }).sort().join('|');
    };
    return k(a) === k(b);
  }

  function renderDraft() {
    app.classList.remove('land', 'lp-bottom', 'lp-side');
    S.gen = (S.gen || 0) + 1;
    S.screen = 'draft'; syncBgm();
    var side = S.draftIdx;
    var team = S.teams[side], hand = S.hands[side];
    var cap = E.costCap(), noCost = !isFinite(cap);
    var cost = teamCost(team), over = cost > cap;
    var minU = E.minUnits(), maxU = E.maxUnits();
    var used = team.map(function (c) { return c.id; });
    var full = team.length >= maxU;

    /* 選択中の場のカード */
    var sel = null;
    if (S.selSlot) {
      var sp = S.selSlot.split('-');
      sel = unitAtSlot(team, +sp[0], +sp[1]);
      if (!sel) S.selSlot = null;
    }

    /* その移動が規則（前衛のいない列に後衛は立てない）を満たすか */
    function mvOK(row, col) {
      if (!sel) return false;
      if (col < 0 || col > 2) return false;
      if (row === sel.row && col === sel.col) return false;
      return legalTeam(afterMove(team, sel, row, col));
    }

    function affordable(id) { return cost + E.BY_ID[id].cost <= cap; }
    var anyLeft = hand.some(function (id) {
      return used.indexOf(id) < 0 && affordable(id);
    });
    var manaOut = !full && !anyLeft && team.length > 0;

    /* 履歴を積んでから盤面を書き換える */
    function commit(next) {
      S.hist[side].push(team.map(function (c) { return { id: c.id, row: c.row, col: c.col }; }));
      if (S.hist[side].length > 30) S.hist[side].shift();
      S.teams[side] = compactTeam(next);
    }

    var nextCell = firstEmpty(team);
    function slotHTML(row, col) {
      var u = unitAtSlot(team, row, col);
      if (u) {
        var isSel = sel && u === sel;
        return '<div class="slot filled' + (isSel ? ' selslot' : '') + '" data-slot="' + row + '-' + col + '">' +
          cardHTML(u.id, { cls: isSel ? ' onboard sel' : ' onboard' }) + '</div>';
      }
      var isNext = !sel && !full && nextCell && nextCell[0] === row && nextCell[1] === col;
      return '<div class="slot' + (sel ? ' can' : '') + (isNext ? ' next' : '') + '" data-slot="' + row + '-' + col + '">' +
        (sel ? '↪ ここへ' : isNext ? '<span class="nx">次はここ</span>' : (row === 0 ? '前衛' : '後衛')) + '</div>';
    }
    var front = [0, 1, 2].map(function (c) { return slotHTML(0, c); }).join('');
    var back  = [0, 1, 2].map(function (c) { return slotHTML(1, c); }).join('');

    var handHTML = hand.map(function (id) {
      var isUsed = used.indexOf(id) >= 0;
      var dim = isUsed || full || !affordable(id);
      return cardHTML(id, { cls: (dim ? ' used' : '') + (isUsed ? ' picked' : '') });
    }).join('');

    /* 操作バー */
    var barHTML = '';
    if (sel) {
      var sd = E.BY_ID[sel.id];
      barHTML =
        '<div class="actbar">' +
          '<div class="ab-hd"><b>' + sd.name + '</b>' +
            '<span>' + (sel.row === 0 ? '前衛' : '後衛') + '・' + ['左', '中央', '右'][sel.col] + '</span>' +
            '<i>空きマスや他のカードを直接タップしてもOK</i></div>' +
          '<div class="ab-row">' +
            '<button class="ab" data-mv="L"' + (mvOK(sel.row, sel.col - 1) ? '' : ' disabled') + '>◀ 左へ</button>' +
            '<button class="ab" data-mv="V"' + (mvOK(1 - sel.row, sel.col) ? '' : ' disabled') + '>' +
              (sel.row === 0 ? '▼ 後衛へ' : '▲ 前衛へ') + '</button>' +
            '<button class="ab" data-mv="R"' + (mvOK(sel.row, sel.col + 1) ? '' : ' disabled') + '>右へ ▶</button>' +
          '</div>' +
          '<div class="ab-row">' +
            '<button class="ab sub" data-mv="I">ℹ 詳細を見る</button>' +
            '<button class="ab del" data-mv="X">✕ 場から外す</button>' +
          '</div>' +
        '</div>';
    }

    var tip = sel
      ? '<b style="color:var(--gold)">' + E.BY_ID[sel.id].name + '</b> を選択中 — 下のボタン、または移動先をタップ'
      : (team.length === 0
        ? '候補カードをタップすると <b style="color:var(--gold)">前衛の左から順に</b> 配置されます'
        : '場のカードをタップ＝移動・入れ替え ／ 候補を長押し＝詳細');

    app.innerHTML =
      '<div class="hdr">' +
        '<span class="t" style="color:' + (side === 0 ? 'var(--p1)' : 'var(--p2)') + '">P' + (side + 1) + ' 編成</span>' +
        (noCost ? '<span class="sp" style="flex:1"></span>'
          : '<div class="meter' + (over ? ' over' : '') + (manaOut ? ' spent' : '') + '">' +
            '<div class="lab"><span>' + (manaOut ? 'マナ使い切り' : 'コスト') + '</span><span>' + cost + ' / ' + cap + '</span></div>' +
            '<div class="bar"><div class="fill" style="width:' + Math.min(100, cost / cap * 100) + '%"></div></div></div>') +
        '<span class="badge' + (team.length >= maxU ? ' ok' : '') + '">出撃 ' + team.length + '/' + maxU + '</span>' +
      '</div>' +
      '<div class="draft-body">' +
        '<div class="rowlab">▲ 前衛（敵と切り結ぶ列）</div><div class="grid3">' + front + '</div>' +
        '<div class="rowlab">▼ 後衛（守られる列）</div><div class="grid3">' + back + '</div>' +
        barHTML +
        '<div class="draft-tools">' +
          '<button class="btn ghost small" id="arrange"' + (team.length < 2 ? ' disabled' : '') + '>⇅ 自動整列</button>' +
          '<button class="btn ghost small" id="undo"' + (S.hist[side].length ? '' : ' disabled') + '>↩ ひとつ戻す</button>' +
          '<button class="btn ghost small" id="clr"' + (team.length ? '' : ' disabled') + '>🗑 全部戻す</button>' +
        '</div>' +
        '<button class="btn primary" id="done" style="width:100%;margin-top:8px;padding:14px"' +
          (team.length >= minU && !over ? '' : ' disabled') +
          (team.length >= minU && !over && (full || manaOut) ? ' data-ready="1"' : '') + '>' +
          (team.length < minU ? 'あと' + (minU - team.length) + '体を配置してください'
            : over ? 'コスト超過'
            : '⚔ この編成で出撃' + (noCost ? '' : '（コスト ' + cost + '/' + cap + '）')) + '</button>' +
      '</div>' +
      '<div class="hand-wrap"><div class="hand-tip">' +
        '<span class="hl">' + E.POOLS[E.getPool()].name + '／' +
          (E.getDealMode() === 'full' || noCost
            ? '📚 全' + hand.length + '枚が候補'
            : '🎲 シャッフル候補 ' + hand.length + '枚（敵味方とも同じ候補）') +
          '（残り' + (hand.length - team.length) + '枚）</span>' + tip +
        '</div>' +
        (manaOut ? '<div class="manaout">マナを使い切りました。このまま出撃できます</div>'
          : full ? '<div class="manaout">出撃枠がいっぱいです（' + maxU + '体）</div>' : '') +
        '<div class="hand' + (hand.length > 12 ? ' many' : '') + '">' + handHTML + '</div></div>';

    /* ---------- 候補カード：1タップで前衛左から順に配置 ---------- */
    bindLongPress('.hand [data-card]', function (el) { openDetail(el.dataset.card, hand); });
    $$('.hand [data-card]').forEach(function (c) {
      c.onclick = function () {
        if (c._longPressed) { c._longPressed = false; return; }
        var id = c.dataset.card;
        if (used.indexOf(id) >= 0) { toast('すでに場に出ています'); return; }
        if (full) { toast('出撃は最大' + maxU + '体までです'); return; }
        if (!affordable(id)) { toast('マナ（コスト）が足りません'); return; }
        var f = firstEmpty(team);
        if (!f) { toast('空いているマスがありません'); return; }
        commit(team.concat([{ id: id, row: f[0], col: f[1] }]));
        S.selSlot = null;
        renderDraft();
      };
    });

    /* ---------- 場：タップで選択／移動／入れ替え ---------- */
    function moveTo(row, col) {
      var next = afterMove(team, sel, row, col);
      if (!legalTeam(next)) {
        toast('後衛に置けるのは、同じ列に前衛がいるときだけです');
        return;
      }
      commit(next);
      S.selSlot = row + '-' + col;
      renderDraft();
    }
    $$('[data-slot]').forEach(function (s) {
      s.onclick = function () {
        if (s._longPressed) { s._longPressed = false; return; }
        var sl = s.dataset.slot.split('-'), row = +sl[0], col = +sl[1];
        var here = unitAtSlot(team, row, col);
        if (!sel) { if (here) { S.selSlot = s.dataset.slot; renderDraft(); } return; }
        if (here === sel) { S.selSlot = null; renderDraft(); return; }
        moveTo(row, col);
      };
    });
    bindLongPress('.slot [data-card]', function (el) { openDetail(el.dataset.card, hand); });

    /* ---------- 操作バー ---------- */
    $$('[data-mv]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.stopPropagation();
        if (!sel || b.disabled) return;
        var k = b.dataset.mv;
        if (k === 'I') { openDetail(sel.id, hand); return; }
        if (k === 'X') {
          commit(team.filter(function (c) { return c !== sel; }).map(function (c) {
            return { id: c.id, row: c.row, col: c.col };
          }));
          S.selSlot = null; renderDraft(); return;
        }
        if (k === 'L') return moveTo(sel.row, sel.col - 1);
        if (k === 'R') return moveTo(sel.row, sel.col + 1);
        if (k === 'V') return moveTo(1 - sel.row, sel.col);
      };
    });

    /* ---------- ツール ---------- */
    $('#arrange').onclick = function () {
      var next = autoArrange(team);
      if (sameTeam(next, team)) { toast('すでに整っています'); return; }
      commit(next);
      S.selSlot = null; renderDraft();
      toast('近接を前衛・遠隔を後衛に並べ替えました');
    };
    $('#undo').onclick = function () {
      var prev = S.hist[side].pop();
      if (!prev) return;
      S.teams[side] = prev; S.selSlot = null; renderDraft();
    };
    $('#clr').onclick = function () {
      if (!team.length) return;
      commit([]); S.selSlot = null; renderDraft();
    };
    $('#done').onclick = function () {
      S.selSlot = null; S.selCard = null;
      if (S.mode === 'pvp' && side === 0) {
        S.draftIdx = 1;
        renderPass(1, function () { renderDraft(); });
      } else if (S.sideBySide) {
        renderReady();
      } else {
        beginBattle();
      }
    };
  }

  function toast(msg) {
    var b = document.createElement('div');
    b.className = 'banner';
    b.innerHTML = '<span style="font-size:14px;border-color:#3d4a68">' + msg + '</span>';
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 1100);
  }
  function banner(msg, cls) {
    $$('.banner').forEach(function (o) { o.remove(); });   // 前のバナーと重ならないように
    var b = document.createElement('div');
    b.className = 'banner';
    b.innerHTML = '<span' + (cls ? ' style="' + cls + '"' : '') + '>' + msg + '</span>';
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 1200 / spd() + 100);
  }

  /* =========================================================
     バトル
     ========================================================= */
  function beginBattle() {
    S._saved = false;
    S.autoSides = [false, false];
    S.st = E.createState(S.teams[0], S.teams[1], {
      nameA: 'プレイヤー1', nameB: S.mode === 'cpu' ? 'CPU' : 'プレイヤー2'
    });
    S.gen = (S.gen || 0) + 1;
    S.screen = 'battle'; syncBgm();
    renderBattle();
    SFX.play('start');
    banner('BATTLE START', 'font-size:22px');
    wait(1100, function () { SFX.play('round'); banner('ROUND 1'); wait(900, step); });
  }

  function isAI(side) { return S.mode === 'cpu' && side === 1; }

  function unitCellHTML(side, row, col) {
    var st = S.st;
    /* 万一まだ重なっていても、生存キャラを優先して描く（消えないための保険） */
    var u = null;
    st.players[side].units.forEach(function (x) {
      if (x.row !== row || x.col !== col) return;
      if (!u || (x.alive && !u.alive)) u = x;
    });
    if (!u) return '<div class="cell" data-cell="' + side + '-' + row + '-' + col + '"><div class="unit empty"></div></div>';
    return '<div class="cell" data-cell="' + side + '-' + row + '-' + col + '">' + unitHTML(u) + '</div>';
  }

  function unitHTML(u) {
    var st = S.st;
    var pct = Math.max(0, u.hp / u.maxHp * 100);
    var cls = pct <= 25 ? ' low' : pct <= 55 ? ' mid' : '';
    // 悪い効果（右上・赤系）／良い効果（右下・緑系）／待機（左・黄の丸）に分離
    var badTags = '', goodTags = '';
    [['slow', '鈍'], ['weaken', '弱'], ['curse', '呪'], ['burn', '燃']].forEach(function (x) {
      var v = E.statusVal(u, x[0]);
      if (v > 0) badTags += '<span class="tg bad ' + x[0] + '">' + x[1] + v + '</span>';
    });
    [['ward', '障'], ['guard', '守'], ['might', '力'], ['haste', '速']].forEach(function (x) {
      var v = E.statusVal(u, x[0]);
      if (v > 0) goodTags += '<span class="tg good ' + x[0] + '">' + x[1] + v + '</span>';
    });
    var cd = 0;
    for (var k2 in u.cd) if (u.cd[k2] > cd) cd = u.cd[k2];
    var cdTag = (cd > 0 && u.alive) ? '<div class="cdb">溜<b>' + cd + '</b></div>' : '';
    var pw = atkLive(u);
    var spd = E.getSpd(u, st), sdir = spd > u.def.spd ? 1 : spd < u.def.spd ? -1 : 0;
    var arrow = function (d) { return d > 0 ? '<i class="up">▲</i>' : d < 0 ? '<i class="dn">▼</i>' : ''; };
    var rm = RANGE_MARK[pw.range];
    var kd = ART.kindOf ? ART.kindOf(u.defId) : { wep: 'sword', body: 'human' };
    return '<div class="unit s' + u.side + (u.alive ? '' : ' dead') + '" data-uid="' + u.uid + '" data-side="' + u.side +
      '" data-wep="' + kd.wep + '" data-body="' + kd.body + '">' +
      '<div class="pic">' + ART.portrait(u.defId, u.def.elem) + '</div>' +
      '<div class="spb' + (sdir > 0 ? ' up' : sdir < 0 ? ' dn' : '') + '">⚡' + spd + arrow(sdir) + '</div>' +
      '<div class="atb ' + pw.kind + (pw.dir > 0 ? ' up' : pw.dir < 0 ? ' dn' : '') + '">' +
        pw.icon + pw.val + arrow(pw.dir) + '</div>' +
      (rm ? '<div class="rngb" title="' + rm.name + '">' + rm.mark + '</div>' : '') +
      cdTag +
      '<div class="fx-tags bad">' + badTags + '</div>' +
      '<div class="fx-tags good">' + goodTags + '</div>' +
      '<div class="nm">' + u.def.name + '</div>' +
      '<div class="hpb"><div class="hpf' + cls + '" style="width:' + pct + '%"></div></div>' +
      '<div class="hpn">' + Math.max(0, u.hp) + '/' + u.maxHp + '</div></div>';
  }

  /* 陣営名の横の数字（生存・HP計・与ダメ）は、盤面を見れば分かるので出さない */
  function sideStats(side) { return ''; }

  /* 戦闘中の共通バー。縦持ちでは画面上段に、横持ちでは右パネルの上部に置く。
     同じ中身を2箇所に出すため、IDではなくクラスで拾う。 */
  function battleBarHTML(st) {
    return '<span class="t">R' + st.round +
        '<small style="color:var(--dim)">/' + E.MAX_ROUNDS + '</small></span>' +
      '<span class="sp" style="flex:1"></span>' +
      '<button class="btn small ghost ico b-fs" title="全画面">⛶</button>' +
      (S.compact
        ? '<button class="btn small ghost ico b-disp" title="表示設定">⚙</button>'
        : '<button class="btn small ghost ico snd b-snd' + (S.sound ? '' : ' off') + '"' +
            ' title="' + (S.sound ? '音を消す' : '音を出す') + '">♪</button>' +
          '<button class="btn small ghost ico b-spd" title="戦闘速度">x' + S.speed + '</button>') +
      '<button class="btn small ghost ico b-quit" title="タイトルへ">✕</button>';
  }

  function bindBattleBar() {
    $$('.b-fs').forEach(function (b) { b.onclick = toggleFullscreen; });
    $$('.b-disp').forEach(function (b) { b.onclick = showDisplayMenu; });
    $$('.b-snd').forEach(function (b) {
      b.onclick = function () { S.sound = !S.sound; SFX.setEnabled(S.sound); rememberSettings(); renderBattle(); };
    });
    $$('.b-spd').forEach(function (b) {
      b.onclick = function () { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 4 : 1; rememberSettings(); renderBattle(); };
    });
    $$('.b-quit').forEach(function (b) {
      b.onclick = function () { if (confirm('タイトルに戻りますか？')) renderTitle(); };
    });
  }

  function renderBattle() {
    var st = S.st;
    var actor = E.currentActor(st);
    var order = st.order.map(function (uid, i) {
      var u = E.findUid(st, uid);
      var c = 'tk s' + u.side + (i < st.turnIdx ? ' done' : '') + (!u.alive ? ' dead' : '') + (actor && u.uid === actor.uid ? ' now' : '');
      return '<div class="' + c + '" data-order="' + uid + '" data-idx="' + i + '">' +
        ART.portrait(u.defId, u.def.elem) +
        '<span class="ord">' + (i + 1) + '</span>' +
        '<span class="sp">⚡' + ((metaOf(st, uid) || {}).spd != null ? metaOf(st, uid).spd : E.getSpd(u, st)) + '</span></div>';
    }).join('');

    var p2name = st.players[1].name, p1name = st.players[0].name;
    app.innerHTML =
      '<div class="hdr">' + battleBarHTML(st) + '</div>' +
      '<div class="orderline">' +
        '<span class="lb">行動順</span>' +
        '<span class="lg"><i class="d0"></i>' + sideName(0) + '</span>' +
        '<span class="lg"><i class="d1"></i>' + sideName(1) + '</span>' +
        '<button class="ordbtn" id="ordq">なぜこの順番？</button>' +
      '</div>' +
      '<div class="turnbar" id="turnbar">' + order + '</div>' +
      '<div class="field">' +
        '<div class="side-tag s1"><span class="dot"></span>' + p2name + ' <span class="stats">' + sideStats(1) + '</span></div>' +
        '<div class="grid3">' + [0, 1, 2].map(function (c) { return unitCellHTML(1, 1, c); }).join('') + '</div>' +
        '<div class="grid3">' + [0, 1, 2].map(function (c) { return unitCellHTML(1, 0, c); }).join('') + '</div>' +
        '<div class="warline">' +
          '<div class="wl-edge top"></div>' +
          '<div class="wl-mid"><span class="wl-flow"><i>❯</i><i>❯</i><i>❯</i><i>❯</i></span></div>' +
          '<div class="wl-edge bot"></div>' +
        '</div>' +
        '<div class="grid3">' + [0, 1, 2].map(function (c) { return unitCellHTML(0, 0, c); }).join('') + '</div>' +
        '<div class="grid3">' + [0, 1, 2].map(function (c) { return unitCellHTML(0, 1, c); }).join('') + '</div>' +
        '<div class="side-tag s0"><span class="dot"></span>' + p1name + ' <span class="stats">' + sideStats(0) + '</span></div>' +
      '</div>' +
      '<div style="flex:1;min-height:0"></div>' +
      '<div class="loglast" id="log">' + (st.log.length
        ? '<span class="' + st.log[st.log.length - 1].cls + '">' + st.log[st.log.length - 1].text + '</span>'
        : '<span style="color:var(--dim)">戦闘ログ</span>') + '<b>全ログ</b></div>' +
      '<div class="actpanel" id="actpanel"></div>';

    app.classList.toggle('compact', !!S.compact);
    var land = isLandscape();
    app.classList.toggle('land', land);
    /* いまどちらのプレイヤーが行動しているかを、陣営バー全体を光らせて示す */
    var act = E.currentActor(st);
    app.classList.toggle('turn0', !!act && act.side === 0);
    app.classList.toggle('turn1', !!act && act.side === 1);
    app.classList.toggle('lp-side', land);
    bindBattleBar();
    var ordqb = $('#ordq');
    if (ordqb) ordqb.onclick = showOrder;
    var tb = $('#turnbar'), nowtk = $('.tk.now');
    if (tb && nowtk) tb.scrollLeft = Math.max(0, nowtk.offsetLeft - tb.clientWidth / 2 + 20);
    $$('[data-order]').forEach(function (o) {
      o.onclick = function () {
        openDetail(E.findUid(st, o.dataset.order).defId,
          st.order.map(function (x) { return E.findUid(st, x).defId; }));
      };
    });
    var lb = $('#log'); if (lb) lb.onclick = showLog;
    bindInspect();
    renderActions();
  }

  /* コンパクト表示のとき、隠れた機能をここから呼べるようにする */
  function showDisplayMenu() {
    var m = document.createElement('div');
    m.className = 'modal';
    function draw() {
      m.innerHTML = '<div class="box">' +
        '<h3 style="color:var(--gold);margin-bottom:10px">表示とサウンド</h3>' +
        '<div class="dmenu">' +
          '<button class="dm" data-d="order">🔢 行動順を見る</button>' +
          '<button class="dm" data-d="log">📜 戦闘ログ</button>' +
          '<button class="dm" data-d="snd">' + (S.sound ? '♪ 音 ON' : '♪ 音 OFF') + '</button>' +
          '<button class="dm" data-d="bgm">' + (S.bgm ? '🎵 曲 ON' : '🎵 曲 OFF') + '</button>' +
          '<button class="dm" data-d="spd">⏩ 速度 x' + S.speed + '</button>' +
          '<button class="dm wide' + (S.compact ? ' on' : '') + '" data-d="compact">📐 コンパクト表示　' + (S.compact ? 'ON' : 'OFF') + '</button>' +
          '<button class="dm wide' + (S.sideBySide ? ' on' : '') + '" data-d="sidebyside">🤝 横並び対戦　' + (S.sideBySide ? 'ON' : 'OFF') + '</button>' +
        '</div>' +
        '<button class="btn ghost" id="dmclose" style="width:100%;margin-top:12px">閉じる</button></div>';
      $$('[data-d]', m).forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          var k = b.dataset.d;
          if (k === 'order') { m.remove(); showOrder(); return; }
          if (k === 'log') { m.remove(); showLog(); return; }
          if (k === 'snd') { S.sound = !S.sound; SFX.setEnabled(S.sound); }
          if (k === 'bgm') { S.bgm = !S.bgm; syncBgm(); }
          if (k === 'spd') S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 4 : 1;
          if (k === 'compact') S.compact = !S.compact;
          if (k === 'sidebyside') S.sideBySide = !S.sideBySide;
          rememberSettings();
          if (k === 'compact' || k === 'sidebyside' || k === 'spd') { m.remove(); renderBattle(); return; }
          draw();
        };
      });
      $('#dmclose', m).onclick = function () { m.remove(); };
    }
    draw();
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  /* 操作パネル内の行動順（横向きで余ったスペースに出す） */
  function orderMiniHTML(st) {
    var cur = E.currentActor(st);
    return '<div class="om-hd">行動順' +
        '<span class="autobtns">' +
          '<button class="autob" data-auto="one" title="このターンだけAIに任せる">⚡<b>1回</b></button>' +
          autoAllBtnHTML(cur ? cur.side : 0, 'autob') +
        '</span></div>' +
      '<div class="om-list">' + st.order.map(function (uid, i) {
        var v = E.findUid(st, uid);
        if (!v) return '';
        var cls = 'om s' + v.side + (i < st.turnIdx ? ' done' : '') + (!v.alive ? ' dead' : '') +
          (cur && v.uid === cur.uid ? ' now' : '');
        return '<div class="' + cls + '"><span class="n">' + (i + 1) + '</span>' +
          '<span class="pic">' + ART.portrait(v.defId, v.def.elem) + '</span>' +
          '<span class="nm">' + v.def.name + '</span>' +
          '<span class="sp">⚡' + E.getSpd(v, st) + '</span></div>';
      }).join('') + '</div>';
  }

  /* 全画面（アドレスバーを隠す）。対応していない端末では何も起きない */
  function toggleFullscreen() {
    try {
      var d = document, el = d.documentElement;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else {
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el);
        else toast('この端末では全画面にできません。ホーム画面に追加すると隠せます');
      }
    } catch (e) { toast('全画面にできませんでした'); }
  }

  /** 「🤖全部」ボタン。押した時点の手番プレイヤーの陣営に効く。
      CPU戦では自軍のみ。PvPでは P1の番に押せばP1が、P2の番に押せばP2が自動になる。
      両方ONにすれば観戦モード。 */
  function autoAllBtnHTML(side, cls) {
    var on = S.autoSides[side];
    var who = S.mode === 'pvp' ? 'P' + (side + 1) : '';
    return '<button class="' + cls + (on ? (cls.indexOf('autob') === 0 ? ' on' : ' on-gold') : '') + '"' +
      ' data-auto="all" data-side="' + side + '"' +
      ' title="' + (S.mode === 'pvp' ? 'プレイヤー' + (side + 1) : '自分') + 'の行動をすべてAIに任せる">' +
      '🤖' + (cls.indexOf('autob') === 0 ? '<b>' + who + (on ? 'ON' : '全部') + '</b>' : who + '全部') + '</button>';
  }

  /** おまかせ2種の結線。待機中も押せる（自動の解除ができるように）。 */
  function bindAutoBtns(autoOnce) {
    $$('[data-auto]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.auto;
        if (k === 'one') { if (autoOnce) autoOnce(); return; }
        if (k === 'stopall') {
          S.autoSides = [false, false];
          toast('自動を停止しました。自分で選んでください');
          renderActions(); return;
        }
        var sd = +(b.dataset.side || 0);
        S.autoSides[sd] = !S.autoSides[sd];
        var who = S.mode === 'pvp' ? 'プレイヤー' + (sd + 1) : '自分';
        if (S.autoSides[sd]) { toast(who + 'の行動をすべてAIに任せます'); if (autoOnce) autoOnce(); else renderActions(); }
        else { toast(who + 'は自分で選ぶモードに戻りました'); renderActions(); }
      };
    });
  }

  function renderActions() {
    var st = S.st, panel = $('#actpanel');
    if (!panel) return;
    /* 骨格（上段バー ＋ 中身 ＋ 行動順）を組み立てる。
       待機中も骨格は保ち、中身だけ差し替える。 */
    function shell(inner, st2) {
      return '<div class="panelbar">' + battleBarHTML(st2) + '</div>' + inner +
             '<div class="ordmini" id="ordmini">' + orderMiniHTML(st2) + '</div>';
    }
    function waitLine(v, msg) {
      var stop = (S.autoSides[0] || S.autoSides[1])
        ? '<button class="btn small ghost stopauto" data-auto="stopall">■ 自動を停止</button>' : '';
      return '<div class="actor-line"><div class="mini">' + ART.portrait(v.defId, v.def.elem) + '</div>' +
        '<div class="who">' + v.def.name + '<small>' + msg + '</small></div>' + stop + '</div>' +
        '<div class="acts waiting"><div class="waitmsg">' + msg + '</div></div>';
    }
    if (st.phase === 'ended') { panel.innerHTML = ''; return; }
    var u = E.currentActor(st);
    if (!u) {
      panel.innerHTML = shell('<div class="acts waiting"><div class="waitmsg">ラウンド終了処理中…</div></div>', st);
      bindBattleBar(); bindAutoBtns(null);
      return;
    }

    $$('.unit').forEach(function (e) { e.classList.toggle('acting', e.dataset.uid === u.uid); });
    app.classList.toggle('turn0', u.side === 0);
    app.classList.toggle('turn1', u.side === 1);

    if (S.busy || isAI(u.side)) {
      panel.innerHTML = shell(waitLine(u, S.busy ? '行動中…' : 'CPU 思考中…'), st);
      bindBattleBar(); bindAutoBtns(null);
      return;
    }

    var opts = E.getOptions(st, u);
    if (!S.selAct || !opts.some(function (o) { return o.action.key === S.selAct; })) S.selAct = opts[0].action.key;
    var cur = opts.filter(function (o) { return o.action.key === S.selAct; })[0];

    var allActs = u.def.actions.concat([]);
    var btns = allActs.map(function (a) {
      var o = opts.filter(function (x) { return x.action.key === a.key; })[0];
      var sub = '';
      if (a.kind === 'dmg') sub = '威力' + (a.power != null ? a.power : E.getAtk(u, st)) +
        (a.hits ? '×' + a.hits + '回' : '') + '・' + E.RANGE_TEXT[a.range];
      else if (a.kind === 'heal') sub = '回復' + a.value + '・' + E.RANGE_TEXT[a.range];
      else if (a.kind === 'ward') sub = '味方の被魔法-' + a.value;
      else if (a.kind === 'revive') sub = '自己犠牲で味方を蘇生';
      else if (a.kind === 'cover') sub = '前後の味方1体の攻撃を肩代わり';
      else if (a.kind === 'buff') sub = '味方全員の' + (a.stat === 'spd' ? '素早さ' : '攻撃') + '+' + a.value + '（' + (a.rounds || 1) + 'R）';
      if (!o) {
        if (u.cd[a.key] > 0) sub = 'あと' + u.cd[a.key] + 'ラウンド待機';
        else if (a.uses != null && u.uses[a.key] <= 0) sub = '使用回数切れ';
        else sub = '今は使えない';
      }
      var isSel = o && S.selAct === a.key;
      return '<button class="act' + (o ? (isSel ? ' on' : '') : ' dis') + '"' + (o ? '' : ' disabled') +
        ' data-act="' + a.key + '">' + (isSel ? '<span class="tapgo">▶</span>' : '') +
        a.name + '<small>' + sub + '</small></button>';
    }).join('');
    var guardOpt = opts.filter(function (o) { return o.action.key === 'guard'; })[0];
    if (guardOpt) btns += '<button class="act' + (S.selAct === 'guard' ? ' on' : '') + '" data-act="guard">' +
      (S.selAct === 'guard' ? '<span class="tapgo">▶</span>' : '') + '防御<small>攻撃できない・被ダメ-2</small></button>';

    panel.innerHTML = shell(
      '<div class="actor-line"><div class="mini">' + ART.portrait(u.defId, u.def.elem) + '</div>' +
      '<div class="who">' + u.def.name + '<small>' + (u.row === 0 ? '前衛' : '後衛') + (u.col === 0 ? '左' : u.col === 1 ? '中央' : '右') +
      '　HP ' + u.hp + '/' + u.maxHp + '　⚡' + E.getSpd(u, st) + '</small></div>' +
      '<button class="btn small ghost" id="info">詳細</button>' +
      '<button class="btn small ghost" id="auto" data-auto="one" title="このターンだけAIに任せる">⚡1回</button>' +
      autoAllBtnHTML(u.side, 'btn small ghost') + '</div>' +
      '<div class="acts">' + btns + '</div>' +
      '<div class="hint' + (S.hintSeen ? ' quiet' : '') + '" id="hint"></div>', st);
    bindBattleBar();

    $$('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.act;
        if (S.selAct === k) {                       // 選択中の技をもう一度タップ＝実行
          var o = null;
          opts.forEach(function (x) { if (x.action.key === k) o = x; });
          if (o && !o.targets.length) { doAction(u, k, o.auto || { type: 'auto' }); return; }
          if (o && (o.action.range === 'square' || o.action.range === 'row')) {
            doAction(u, k, o.targets[Math.min(S.selGrp || 0, o.targets.length - 1)]); return;
          }
          var h = $('#hint'); if (h) { h.classList.remove('shakeh'); void h.offsetWidth; h.classList.add('shakeh'); }
          return;
        }
        S.selAct = k; renderActions();
      };
    });
    $('#info').onclick = function () {
      openDetail(u.defId, E.aliveUnits(st, u.side).map(function (v) { return v.defId; }));
    };
    function autoOnce() {
      var ch = AI.chooseAction(st, u, 'hard');
      doAction(u, ch.actionKey, ch.target);
    }
    if ($('#auto')) $('#auto').onclick = autoOnce;
    bindAutoBtns(autoOnce);
    /* 全自動がONなら、そのまま代わりに動く */
    if (S.autoSides[u.side] && !S.busy) {
      var agen = S.gen, auid = u.uid;
      setTimeout(function () {
        /* 描き直しのたびに予約が積まれるので、
           世代・手番・実行中かどうかを見て、古い予約は捨てる */
        if (agen !== S.gen || S.busy || S.screen !== 'battle') return;
        if (!S.autoSides[u.side]) return;
        var now = E.currentActor(S.st);
        if (!now || now.uid !== auid) return;
        autoOnce();
      }, 420 / spd());
    }
    // 範囲攻撃は既定でダメージ合計が大きい方を選んでおく
    var gkey = u.uid + ':' + S.selAct;
    if (cur && (cur.action.range === 'square' || cur.action.range === 'row') && cur.targets.length) {
      if (S.grpKey !== gkey) {
        var bi = 0, bv = -1;
        cur.targets.forEach(function (t, i) {
          var v = groupCells(st, u, t).reduce(function (n, c) { return n + Math.min(c.hp, 6); }, 0);
          if (v > bv) { bv = v; bi = i; }
        });
        S.selGrp = bi; S.grpKey = gkey;
      }
    } else { S.grpKey = null; S.selGrp = 0; }

    var info = highlightTargets(u, cur, S.selGrp);
    /* 全体攻撃・全体回復・必中など「選ぶ余地がない技」は、
       わざわざマスをタップさせず、技ボタンをもう一度押すだけで実行する */
    if (info.go) {
      var sb0 = $('[data-act="' + S.selAct + '"]');
      if (sb0) sb0.onclick = info.go;
    }
    // 対象になっていないマスはタップで詳細
    $$('.unit[data-uid]').forEach(function (el) {
      if (el.onclick) return;
      el.onclick = function () {
        if (el._longPressed) { el._longPressed = false; return; }
        var v = E.findUid(S.st, el.dataset.uid);
        if (v) openUnitDetail(v);
      };
    });
    var hintEl = $('#hint');
    var selBtn = $('[data-act="' + S.selAct + '"]');
    var goTxt = '<b class="go">「' + (cur ? cur.action.name : '') + '」をもう一度タップで実行</b>';
    if (hintEl) {
      S._hintCount = (S._hintCount || 0) + 1;
      if (S._hintCount > 3 && !S.hintSeen) { S.hintSeen = true; rememberSettings(); }
      var tapTxt = '<b class="go">赤く光っているマスをタップして実行</b>';
      if (info.mode === 'fixed') {
        hintEl.innerHTML = '<span class="lgd f' + (info.heal ? ' h' : '') + '"></span>' +
          (info.random
            ? '<b>光っている' + info.count + '体からランダムに' + info.hits + '回</b>（同じ相手に重なることあり）　'
            : '<b>' + info.count + '体すべてに必ず命中</b>　') +
          (info.heal ? '<b class="go">光っているマスをタップして実行</b>' : tapTxt);
        if (selBtn) selBtn.classList.add('ready');
      } else if (info.mode === 'pick') {
        hintEl.innerHTML = '<span class="lgd p' + (info.heal ? ' h' : '') + '"></span>' +
          (info.cover ? '点滅している<b>味方をタップ</b>すると、その味方が受ける攻撃を<b>すべて肩代わり</b>します'
                      : '点滅している<b>' + info.count + '体から1体を選んでタップ</b>');
      } else if (info.mode === 'groupsel') {
        var oname = (info.options[info.gi] || {}).label || '';
        hintEl.innerHTML = '<span class="lgd f"></span>盤面の<b>Ａ／Ｂ</b>をタップで範囲を切替　' +
          '選択中＝<b>' + oname + '（' + info.count + '体・計およそ' + info.total + '）</b>　' +
          '<b class="go">もう一度タップで実行</b>';
        if (selBtn) selBtn.classList.add('ready');
      } else if (info.mode === 'self') {
        hintEl.innerHTML = '<b>真上の前衛が塞がっている</b>ため近接攻撃が届きません（前衛が倒れた瞬間に前進します）　' +
          '<b class="go">自分をタップして防御</b>';
        if (selBtn) selBtn.classList.add('ready');
      } else {
        hintEl.innerHTML = goTxt;
        if (selBtn) selBtn.classList.add('ready');
      }
      if (!S.hintSeen) hintEl.innerHTML += '<span class="subhint">キャラを長押しすると詳細（敵味方どちらでも）</span>';
    }
  }

  /**
   * 対象の見せ方を3種類に分ける
   *   fixed … 必ず当たる（選択不要）  赤の実線＋斜線＋「命中」
   *   pick  … この中から1体を選ぶ    金の破線＋点滅＋「選ぶ」
   *   group … 範囲Ａ/Ｂを選ぶ         紫/青の実線＋「範囲Ａ」「範囲Ｂ」
   */
  function clearMarks() {
    $$('.unit').forEach(function (e) {
      e.classList.remove('tgt', 'tgt-ally', 'tg-fixed', 'tg-pick', 'tg-group', 'tg-band', 'tg-g0', 'tg-g1', 'tg-heal');
      e.onclick = null;
    });
    $$('.pred,.tmark,.rmark,.rband').forEach(function (e) { e.remove(); });
    var fld = $('.field'); if (fld) fld.classList.remove('banded');
    var old = document.getElementById('marklayer');
    if (old) old.innerHTML = '';
  }

  /** 盤面のマスに直接、範囲選択マーカーを置く */
  /** 必中の対象をまとめて1つの枠で囲む（1体ずつ枠を出すより範囲が分かりやすい） */
  function drawFixedBand(units, label, onTap, heal) {
    var field = $('.field');
    if (!field || !units.length) return;
    var l = 1e9, t = 1e9, r = -1e9, b = -1e9, n = 0;
    units.forEach(function (v) {
      var el = $('[data-cell="' + v.side + '-' + v.row + '-' + v.col + '"]');
      if (!el) return;
      n++;
      l = Math.min(l, el.offsetLeft); t = Math.min(t, el.offsetTop);
      r = Math.max(r, el.offsetLeft + el.offsetWidth);
      b = Math.max(b, el.offsetTop + el.offsetHeight);
    });
    if (n < 2) return;
    field.classList.add('banded');
    var pad = 4;
    var band = document.createElement('button');
    band.className = 'rband fixed' + (heal ? ' heal' : '');
    band.style.left = (l - pad) + 'px';
    band.style.top = (t - pad) + 'px';
    band.style.width = (r - l + pad * 2) + 'px';
    band.style.height = (b - t + pad * 2) + 'px';
    band.innerHTML = '<span class="cn">' + label + 'に必中</span>';
    band.onclick = function (ev) { ev.stopPropagation(); if (S.sound) SFX.play('select'); onTap(); };
    field.appendChild(band);
  }

  function drawRangeMarkers(u, cur, gi) {
    var st = S.st, foe = 1 - u.side;
    var field = $('.field');
    if (!field) return;
    var a = cur.action;
    function box(row, col) {
      var el = $('[data-cell="' + foe + '-' + row + '-' + col + '"]');
      if (!el) return null;
      return { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    }
    /* 選択肢が占める盤面の範囲（長方形）を返す */
    function areaOf(t) {
      if (t.type === 'square') {
        var p1 = box(0, t.col), p2 = box(1, t.col + 1);
        if (!p1 || !p2) return null;
        return { l: Math.min(p1.l, p2.l), t: Math.min(p1.t, p2.t),
                 r: Math.max(p1.l + p1.w, p2.l + p2.w), b: Math.max(p1.t + p1.h, p2.t + p2.h) };
      }
      /* 縦持ちでは列＝横並び、横持ちでは列＝縦並びになる。
         両端のマスから縦横まとめて外接矩形を取れば、どちらでも正しく囲える。 */
      var q1 = box(t.row, 0), q2 = box(t.row, 2);
      if (!q1 || !q2) return null;
      return { l: Math.min(q1.l, q2.l), t: Math.min(q1.t, q2.t),
               r: Math.max(q1.l + q1.w, q2.l + q2.w),
               b: Math.max(q1.t + q1.h, q2.t + q2.h) };
    }
    var areas = cur.targets.map(areaOf);

    cur.targets.forEach(function (t, i) {
      var ar = areas[i];
      if (!ar) return;
      var cells = groupCells(st, u, t);
      var on = (i === gi);
      var tap = function (ev) {
        ev.stopPropagation();
        if (S.sound) SFX.play('select');
        if (on) { doAction(u, a.key, t); return; }        // 選択中をもう一度＝実行
        S.selGrp = i; renderActions();
      };
      if (t.type === 'square') {
        // 面（2×2）：4体の中央に丸マーカー＋斜め4方向の矢印
        var mk = document.createElement('button');
        mk.className = 'rmark sq' + (on ? ' on' : '');
        mk.dataset.grp = i;
        mk.style.left = ((ar.l + ar.r) / 2) + 'px';
        mk.style.top = ((ar.t + ar.b) / 2) + 'px';
        mk.innerHTML = '<span class="ar tl">◤</span><span class="ar tr">◥</span>' +
                       '<span class="ar bl">◣</span><span class="ar br">◢</span>' +
                       '<span class="lt">' + ['Ａ', 'Ｂ'][i] + '</span>' +
                       '<span class="cn">' + cells.length + '体</span>';
        mk.onclick = tap;
        field.appendChild(mk);
        return;
      }
      // 列（横）：列全体を長方形で囲う
      var pad = 4;
      var band = document.createElement('button');
      band.className = 'rband rw' + (on ? ' on' : '');
      band.dataset.grp = i;
      band.style.left = (ar.l - pad) + 'px';
      band.style.top = (ar.t - pad) + 'px';
      band.style.width = (ar.r - ar.l + pad * 2) + 'px';
      band.style.height = (ar.b - ar.t + pad * 2) + 'px';
      band.innerHTML = '<span class="cn"><i>' + ['Ａ', 'Ｂ'][i] + '</i>' +
                       (t.row === 0 ? '前列' : '後列') + ' ' + cells.length + '体</span>';
      band.onclick = tap;
      field.appendChild(band);
    });

    // 体数チップが上下で重ならないように、下側の帯はチップを下に出す
    var bands = $$('.field .rband');
    if (bands.length === 2) {
      var t0 = parseFloat(bands[0].style.top), t1 = parseFloat(bands[1].style.top);
      bands[t0 > t1 ? 0 : 1].classList.add('low');
    }
  }

  function markUnit(v, o) {
    var el = $('[data-uid="' + v.uid + '"]');
    if (!el) return;
    el.classList.add('tg-' + o.mode);
    if (o.group != null) el.classList.add('tg-g' + o.group);
    if (o.heal) el.classList.add('tg-heal');
    var b = document.createElement('div');
    b.className = 'tmark';
    b.innerHTML = '<span class="lb">' + o.label + '</span>' +
      (o.val != null ? '<span class="vl' + (o.heal ? ' heal' : '') + '">' + (o.heal ? '+' : '-') + o.val + '</span>' : '');
    el.appendChild(b);
    if (o.onTap) el.onclick = o.onTap;
  }

  /** 範囲攻撃の候補（Ａ/Ｂ）の中身を返す */
  function groupCells(st, u, t) {
    var foe = 1 - u.side;
    if (t.type === 'square') return E.squareCells(st, foe, t.col);
    if (t.type === 'row') return st.players[foe].units.filter(function (v) { return v.alive && v.row === t.row; });
    return [];
  }
  function groupLabel(a, t) {
    if (t.type === 'square') return t.col === 0 ? '左2列' : '右2列';
    if (t.type === 'row') return t.row === 0 ? '敵の前衛列' : '敵の後衛列';
    return '範囲';
  }

  function highlightTargets(u, cur, selGrp) {
    clearMarks();
    if (!cur) return { mode: 'none' };
    var st = S.st, a = cur.action, foe = 1 - u.side;

    function estimate(v, mul) {
      var base = a.power != null ? a.power : E.getAtk(u, st);
      if (a.dtype === 'magic' && a.power != null) base = a.power + (E.getAtk(u, st) - u.def.atk);
      if (a.dtype === 'magic' && E.hasP(u, 'resonance') &&
          E.aliveUnits(st, u.side).some(function (x) { return x.uid !== u.uid && (x.def.role === 'caster' || x.def.role === 'support'); })) base += 1;
      if (E.hasP(u, 'ambush') && st.round === 1) base += 2;
      var amt = base * (mul == null ? 1 : mul);
      if (E.hasP(u, 'snipe') && v.row === 1) amt += 3;
      if (E.hasP(u, 'decapitate') && v.hp <= v.maxHp * 0.35) return '即死';
      return E.previewDamage(st, u, v, amt, a.dtype || 'phys');
    }
    function healAmt(v) { return Math.min(v.maxHp - v.hp, a.value + E.auraFor(u, st).healBonus); }

    /* ---- ① 必ず当たる（選択不要） ---- */
    var fixed = [];
    if (a.range === 'melee' || a.range === 'pierce') {
      var pt = E.meleeChain(st, u);
      if (pt) {
        fixed.push([pt, 1]);
        if (a.range === 'pierce' && pt.row === 0) {
          var bk = E.unitAtCell(st, foe, 1, pt.col);
          if (bk) fixed.push([bk, a.backRatio == null ? 0.5 : a.backRatio]);
        }
      }
    } else if (a.range === 'front_row') {
      var r0 = st.players[foe].units.filter(function (v) { return v.alive && v.row === 0; });
      if (!r0.length) r0 = E.aliveUnits(st, foe);
      r0.forEach(function (v) { fixed.push([v, 1]); });
    } else if (a.range === 'all') {
      E.aliveUnits(st, foe).forEach(function (v) { fixed.push([v, 1]); });
    } else if (a.range === 'weakest') {
      var w = E.aliveUnits(st, foe).slice().sort(function (x, y) { return x.hp - y.hp; })[0];
      if (w) fixed.push([w, 1]);
    } else if (a.range === 'random') {
      E.aliveUnits(st, foe).forEach(function (v) { fixed.push([v, 1]); });
    }
    if (fixed.length) {
      var go = function () { doAction(u, a.key, cur.auto || { type: 'auto' }); };
      var rnd = (a.range === 'random');
      fixed.forEach(function (pr) {
        markUnit(pr[0], { mode: 'fixed', label: rnd ? 'ランダム' : '命中', val: estimate(pr[0], pr[1]), onTap: go });
      });
      /* 2体以上に必ず当たるときは、1体ずつ枠を出さずに“ぶち抜き”で囲む */
      if (fixed.length >= 2) {
        drawFixedBand(fixed.map(function (pr) { return pr[0]; }),
                      (rnd ? 'ランダム ' : '') + fixed.length + '体', go);
      }
      return { mode: 'fixed', count: fixed.length, random: rnd, hits: a.hits || 1, go: go };
    }
    if (a.range === 'all_ally') {
      var al = E.aliveUnits(st, u.side);
      var goA = function () { doAction(u, a.key, cur.auto || { type: 'auto' }); };
      al.forEach(function (v) {
        markUnit(v, { mode: 'fixed', heal: true, label: a.kind === 'heal' ? '回復' : '効果',
                      val: a.kind === 'heal' ? healAmt(v) : null, onTap: goA });
      });
      if (al.length >= 2) drawFixedBand(al, '味方' + al.length + '体', goA, true);
      return { mode: 'fixed', count: al.length, heal: true, go: goA };
    }
    if (a.kind === 'guard') {
      var goG = function () { doAction(u, a.key, { type: 'auto' }); };
      markUnit(u, { mode: 'fixed', heal: true, label: '防御', val: null, onTap: goG });
      return { mode: 'self', go: goG };
    }

    /* ---- ② 単体を選ぶ ---- */
    if (a.range === 'adj_ally') {
      var na = 0;
      cur.targets.forEach(function (t) {
        var v = E.findUid(st, t.uid);
        if (!v) return;
        na++;
        markUnit(v, { mode: 'pick', heal: true, label: '庇う', val: null,
                      onTap: function () { doAction(u, a.key, t); } });
      });
      return { mode: 'pick', count: na, heal: true, cover: true };
    }
    if (a.range === 'any1' || a.range === 'ally1' || a.range === 'dead_ally') {
      var n = 0;
      cur.targets.forEach(function (t) {
        var v = E.findUid(st, t.uid);
        if (!v) return;
        n++;
        var heal = (a.kind === 'heal' || a.kind === 'revive');
        markUnit(v, {
          mode: 'pick', heal: heal,
          label: heal ? (a.kind === 'revive' ? '蘇生' : '回復') : 'タップ',
          val: a.kind === 'heal' ? healAmt(v) : (a.kind === 'revive' ? null : estimate(v, 1)),
          onTap: function () { doAction(u, a.key, t); }
        });
      });
      return { mode: 'pick', count: n, heal: (a.kind === 'heal' || a.kind === 'revive') };
    }

    /* ---- ③ 範囲そのものを選ぶ（選択中の範囲だけを必中表示） ---- */
    if (a.range === 'square' || a.range === 'row') {
      var gi = Math.min(selGrp || 0, cur.targets.length - 1);
      var t = cur.targets[gi];
      var cells = groupCells(st, u, t);
      var tot = 0;
      var goG = function () { doAction(u, a.key, t); };
      var cellMode = (t.type === 'square') ? 'fixed' : 'band';   // 面は従来どおり1体ずつ枠を出す
      cells.forEach(function (v) {
        var d = estimate(v, 1);
        if (typeof d === 'number') tot += Math.min(d, v.hp);
        markUnit(v, { mode: cellMode, label: '命中', val: d, onTap: goG });
      });
      drawRangeMarkers(u, cur, gi);
      return { mode: 'groupsel', count: cells.length, gi: gi,
               options: cur.targets.map(function (x) {
                 var c = groupCells(st, u, x);
                 return { t: x, n: c.length, label: groupLabel(a, x) };
               }), total: tot };
    }
    return { mode: 'none' };
  }

  /* ---------- 行動実行と演出 ---------- */
  function doAction(u, key, target) {
    if (S.busy || S.screen !== 'battle') return;
    var gen = S.gen;
    S.busy = true;
    clearMarks();
    renderActions();
    var evs = E.performAction(S.st, u, key, target);
    playEvents(evs.slice(), function () {
      if (gen !== S.gen) return;
      S.busy = false;
      S.selAct = null;
      if (S.st.phase === 'ended') { showResult(); return; }
      E.nextTurn(S.st);
      if (!E.currentActor(S.st)) {
        var evs2 = E.endRound(S.st);
        renderBattle();
        playEvents(evs2.slice(), function () {
          if (S.st.phase === 'ended') { showResult(); return; }
          renderBattle();
          SFX.play('round'); banner('ROUND ' + S.st.round);
          wait(800, step);
        });
      } else { renderBattle(); step(); }
    });
  }

  function step() {
    if (!S.st || S.st.phase === 'ended' || S.screen !== 'battle') return;
    var u = E.currentActor(S.st);
    if (!u) {
      var evs2 = E.endRound(S.st);
      renderBattle();
      playEvents(evs2.slice(), function () {
        if (S.st.phase === 'ended') { showResult(); return; }
        renderBattle(); SFX.play('round'); banner('ROUND ' + S.st.round); wait(800, step);
      });
      return;
    }
    renderBattle();
    if (isAI(u.side)) {
      wait(620, function () {
        var ch = AI.chooseAction(S.st, u, S.diff);
        doAction(u, ch.actionKey, ch.target);
      });
    }
  }

  /* ---------- エフェクト ---------- */
  /* 技ごとの見た目：色・系統・揺れの強さ・粒子の形 */
  var FXS = {
    slash:  { c:'#ffffff', k:'phys',  sh:7,  p:'spark', label:'斬撃' },
    pierce: { c:'#bcd8ff', k:'phys',  sh:6,  p:'shard' },
    sweep:  { c:'#ff9aa8', k:'phys',  sh:12, p:'spark' },
    bash:   { c:'#e3ecff', k:'phys',  sh:9,  p:'ring' },
    smash:  { c:'#ffd08a', k:'phys',  sh:14, p:'rock' },
    claw:   { c:'#ff9c7a', k:'phys',  sh:7,  p:'spark' },
    arrow:  { c:'#bff2e6', k:'proj',  sh:5,  p:'shard' },
    dagger: { c:'#c9a8ff', k:'proj',  sh:5,  p:'shard' },
    wind:   { c:'#7ff0dc', k:'magic', sh:5,  p:'swirl' },
    blood:  { c:'#ff5f7a', k:'magic', sh:6,  p:'drop' },
    holy:   { c:'#ffe08a', k:'magic', sh:6,  p:'ray'  },
    fire:   { c:'#ff8a2a', k:'magic', sh:9,  p:'ember' },
    ice:    { c:'#8fdcff', k:'magic', sh:6,  p:'shard' },
    arcane: { c:'#c98cff', k:'magic', sh:7,  p:'ring' },
    shadow: { c:'#a674ff', k:'magic', sh:7,  p:'drop' },
    earth:  { c:'#b6e07a', k:'magic', sh:11, p:'rock' },
    breath: { c:'#ff6a1a', k:'magic', sh:16, p:'ember' },
    meteor: { c:'#ff4a1a', k:'magic', sh:20, p:'ember' },
    heal:   { c:'#4fe39a', k:'heal',  sh:0,  p:'plus' },
    ward:   { c:'#8fd6ff', k:'buff',  sh:0,  p:'ring' },
    revive: { c:'#ffe08a', k:'heal',  sh:0,  p:'ray'  },
    guard:  { c:'#cfd8ee', k:'buff',  sh:0,  p:'ring' },
    /* 技ごとに独立させた表現 */
    lance:  { c:'#cfe0ff', k:'phys',  sh:7,  p:'shard' },   // 長槍突き
    wallop: { c:'#ffb98a', k:'phys',  sh:13, p:'rock'  },   // 豪腕
    rock:   { c:'#d6cfae', k:'phys',  sh:15, p:'rock'  },   // 岩石打
    horn:   { c:'#ffd0a0', k:'phys',  sh:14, p:'rock'  },   // 角突き
    dclaw:  { c:'#ff8a5a', k:'phys',  sh:10, p:'spark' },   // 竜爪
    holystrike:{ c:'#ffe8a8', k:'phys', sh:9, p:'ray'   },  // 聖なる一撃
    mark:   { c:'#c9a8ff', k:'proj',  sh:8,  p:'shard' },   // 死の刻印
    spear:  { c:'#ffe08a', k:'proj',  sh:9,  p:'ray'   },   // 天翔ける槍
    screech:{ c:'#7ff0dc', k:'magic', sh:6,  p:'swirl' },   // かく乱の叫び
    hex:    { c:'#a674ff', k:'magic', sh:6,  p:'drop'  },   // 呪縛
    discord:{ c:'#c9a8ff', k:'magic', sh:6,  p:'ring'  },   // 不協和音
    doom:   { c:'#9a6bff', k:'magic', sh:9,  p:'drop'  },   // 死の宣告
    grasp:  { c:'#8e63e0', k:'magic', sh:7,  p:'drop'  },   // 亡者の手
    arcanebolt:{ c:'#c98cff', k:'proj', sh:7, p:'ring' },   // 秘術の矢
    logos:  { c:'#d8b0ff', k:'magic', sh:5,  p:'ray'   },   // 理の光
    thorn:  { c:'#b6e07a', k:'magic', sh:8,  p:'shard' },   // 茨の呪縛
    purge:  { c:'#ffb35a', k:'magic', sh:10, p:'ember' },   // 浄化の炎
    blizzard:{ c:'#8fdcff', k:'magic', sh:9, p:'shard' },   // 氷嵐
    frost:  { c:'#9be4ff', k:'magic', sh:7,  p:'shard' },   // フロストノヴァ
    aegis:  { c:'#ffd76a', k:'buff',  sh:0,  p:'ring'  },   // 王命の盾
    siege:  { c:'#d6cfae', k:'phys',  sh:15, p:'rock'  },   // 破城の一撃
    cannon: { c:'#ffc98a', k:'proj',  sh:12, p:'rock'  },   // 古代の砲
    wclaw:  { c:'#ffb07a', k:'phys',  sh:8,  p:'spark' },   // 鉤爪
    venom:  { c:'#9ee06a', k:'magic', sh:6,  p:'drop'  },   // 毒の息
    parrow: { c:'#bff2e6', k:'proj',  sh:6,  p:'shard' },   // 幻影の矢
    triple: { c:'#d8fff4', k:'proj',  sh:7,  p:'shard' },   // 三連矢
    ember:  { c:'#ff9a3c', k:'magic', sh:6,  p:'ember' },   // 火の粉
    blaze:  { c:'#ff8a2a', k:'buff',  sh:0,  p:'ember' },   // 焔纏い
    iceclub:{ c:'#9be4ff', k:'phys',  sh:12, p:'shard' },   // 氷塊叩き
    frostroar:{c:'#8fdcff',k:'magic', sh:9,  p:'shard' },   // 凍てつく咆哮
    burn:   { c:'#ff7a2a', k:'magic', sh:0,  p:'ember' }    // 燃焼
  };
  function fxOf(n) { return FXS[n] || FXS.slash; }

  /* =========================================================
     行動モーション（案D）
       ①立ち上がる → ②溜め → ③振り抜く → ④着地
       武器の種類と体型で溜め・振り抜きの形が変わる
     ========================================================= */
  function motionPlay(el, kind) {
    if (!el || S.speed >= 4) return 0;              // 4倍速のときは省略
    var fast = S.speed >= 2;
    var t = function (ms) { return ms / spd(); };
    el.classList.remove('mo-act', 'mo-chg', 'mo-stk', 'mo-cast');
    void el.offsetWidth;
    var f = el.closest('.field');
    if (f) f.classList.add('spotlight');
    el.classList.add('mo-act');
    if (kind === 'cast') {
      el.classList.add('mo-cast');
      setTimeout(function () { el.classList.remove('mo-cast'); }, t(fast ? 320 : 520));
      setTimeout(function () {
        el.classList.remove('mo-act');
        if (f && !$('.unit.mo-act')) f.classList.remove('spotlight');
      }, t(fast ? 420 : 700));
      return fast ? 200 : 300;
    }
    var chg = fast ? 40 : 70, stk = fast ? 190 : 330, back = fast ? 270 : 450, end = fast ? 420 : 700;
    setTimeout(function () { el.classList.add('mo-chg'); }, t(chg));
    setTimeout(function () { el.classList.remove('mo-chg'); el.classList.add('mo-stk'); }, t(stk));
    setTimeout(function () { el.classList.remove('mo-stk'); }, t(back));
    setTimeout(function () {
      el.classList.remove('mo-act');
      if (f && !$('.unit.mo-act')) f.classList.remove('spotlight');
    }, t(end));
    return stk;                                     // 「当たる瞬間」までの時間
  }

  function rectOf(uid) {
    var el = $('[data-uid="' + uid + '"]');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { el: el, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }

  /* --- 粒子 --- */
  function particles(x, y, color, n, kind) {
    n = Math.round(n * 1.9);
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.7;
      var dist = 38 + Math.random() * 104;
      var el = document.createElement('div');
      el.className = 'ptc p-' + (kind || 'spark');
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.background = color;
      el.style.boxShadow = '0 0 16px ' + color + ',0 0 30px ' + color;
      if (kind === 'shard') el.style.transform = 'rotate(' + (ang * 57) + 'deg)';
      fxl.appendChild(el);
      var dy = (kind === 'ember' || kind === 'plus' || kind === 'ray') ? -Math.abs(Math.sin(ang)) * dist - 20 : Math.sin(ang) * dist;
      el.animate([
        { transform: 'translate(-50%,-50%) scale(1.7)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * dist * .55) + 'px), calc(-50% + ' + (dy * .55) + 'px)) scale(1.15)', opacity: 1, offset: .42 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * dist) + 'px), calc(-50% + ' + dy + 'px)) scale(.15)', opacity: 0 }
      ], { duration: (760 + Math.random() * 420) / spd(), easing: 'cubic-bezier(.12,.8,.3,1)' });
      (function (e) { setTimeout(function () { e.remove(); }, 1250 / spd()); })(el);
    }
  }
  /** 交戦ラインに攻撃方向を流す（どちらからどちらへ攻めているかを示す） */
  function flowWarline(side) {
    var wl = $('.warline');
    if (!wl || side == null) return;
    wl.classList.remove('flow0', 'flow1');
    void wl.offsetWidth;
    wl.classList.add(side === 0 ? 'flow0' : 'flow1');
    clearTimeout(wl._ft);
    wl._ft = setTimeout(function () { wl.classList.remove('flow0', 'flow1'); }, 1200 / spd());
  }

  /** 前進の軌跡：移動元から移動先へ伸びる帯 */
  function advanceTrail(from, to) {
    var x1 = from.left + from.width / 2, y1 = from.top + from.height / 2;
    var x2 = to.left + to.width / 2, y2 = to.top + to.height / 2;
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 8) return;
    var ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var d = document.createElement('div');
    d.className = 'advtrail';
    d.style.cssText = 'left:' + x1 + 'px;top:' + y1 + 'px;width:' + len + 'px;' +
      'transform:translateY(-50%) rotate(' + ang + 'deg)';
    d.innerHTML = '<i></i>';
    fxl.appendChild(d);
    d.animate([{ opacity: 0, clipPath: 'inset(0 100% 0 0)' },
               { opacity: 1, clipPath: 'inset(0 0 0 0)', offset: .45 },
               { opacity: 0, clipPath: 'inset(0 0 0 88%)' }],
      { duration: 780 / spd(), easing: 'ease-out' });
    setTimeout(function () { d.remove(); }, 820 / spd());
  }

  /** ユニットの上に短いラベルを浮かせる */
  function floatTag(el, text, side) {
    var r = el.getBoundingClientRect();
    var d = document.createElement('div');
    d.className = 'floattag s' + (side || 0);
    d.textContent = text;
    d.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height * .16) + 'px';
    fxl.appendChild(d);
    d.animate([{ transform: 'translate(-50%,6px) scale(.7)', opacity: 0 },
               { transform: 'translate(-50%,-10px) scale(1)', opacity: 1, offset: .3 },
               { transform: 'translate(-50%,-22px) scale(1)', opacity: 1, offset: .75 },
               { transform: 'translate(-50%,-34px) scale(.95)', opacity: 0 }],
      { duration: 1100 / spd(), easing: 'ease-out' });
    setTimeout(function () { d.remove(); }, 1150 / spd());
  }

  function ringWave(x, y, color, size, thick, _sub) {
    size = size * 1.5;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size +
      'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;border-radius:50%;pointer-events:none;' +
      'border:' + Math.round((thick || 4) * 1.9) + 'px solid ' + color +
      ';box-shadow:0 0 26px ' + color + ',inset 0 0 18px ' + color + ';';
    fxl.appendChild(d);
    d.animate([{ transform: 'scale(.16)', opacity: 1 }, { transform: 'scale(2.15)', opacity: 0 }],
      { duration: 900 / spd(), easing: 'cubic-bezier(.15,.85,.3,1)' });
    setTimeout(function () { d.remove(); }, 950 / spd());
    // 追い波（二重リング）
    if (!_sub) setTimeout(function () { ringWave(x, y, color, size * 0.52, (thick || 4) * 0.6, true); }, 150 / spd());
  }
  function glowBall(x, y, color, size) {
    size = size * 1.55;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size +
      'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,#fff 0%,' + color + ' 30%,' + color + '66 52%,transparent 72%);';
    fxl.appendChild(d);
    d.animate([{ transform: 'scale(.2)', opacity: .95 },
               { transform: 'scale(1.15)', opacity: .72, offset: .3 },
               { transform: 'scale(1.95)', opacity: 0 }],
      { duration: 780 / spd(), easing: 'ease-out' });
    setTimeout(function () { d.remove(); }, 820 / spd());
  }

  /* 放射状の閃光（強い一撃で使う） */
  function burstRays(x, y, color, n, len) {
    n = n || 12; len = len || 150;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:0;height:0;pointer-events:none;';
    var h = '';
    for (var i = 0; i < n; i++) {
      var a = (360 / n) * i + Math.random() * 8;
      h += '<span style="position:absolute;left:0;top:0;width:' + (len * (0.55 + Math.random() * 0.7)) +
        'px;height:' + (3 + Math.random() * 5) + 'px;margin-top:-2px;transform-origin:0 50%;' +
        'transform:rotate(' + a + 'deg);border-radius:4px;' +
        'background:linear-gradient(90deg,#fff,' + color + ',transparent);' +
        'box-shadow:0 0 18px ' + color + '"></span>';
    }
    wrap.innerHTML = h;
    fxl.appendChild(wrap);
    wrap.animate([{ transform: 'scale(.1) rotate(0deg)', opacity: 1 },
                  { transform: 'scale(1) rotate(9deg)', opacity: 1, offset: .35 },
                  { transform: 'scale(1.5) rotate(18deg)', opacity: 0 }],
      { duration: 720 / spd(), easing: 'cubic-bezier(.1,.85,.3,1)' });
    setTimeout(function () { wrap.remove(); }, 760 / spd());
  }
  function streak(x1, y1, x2, y2, color, thick) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x1 + 'px;top:' + y1 + 'px;width:' + len + 'px;height:' + Math.round((thick || 4) * 2) +
      'px;background:linear-gradient(90deg,transparent,' + color + ',#fff);transform-origin:0 50%;' +
      'transform:rotate(' + Math.atan2(dy, dx) + 'rad);box-shadow:0 0 34px ' + color + ',0 0 60px ' + color +
      ';border-radius:5px;';
    fxl.appendChild(d);
    d.animate([{ opacity: 0, filter: 'brightness(2.8)' }, { opacity: 1, offset: .25 },
               { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 680 / spd() });
    setTimeout(function () { d.remove(); }, 700 / spd());
  }
  function projectile(x1, y1, x2, y2, color) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:26px;height:26px;border-radius:50%;background:#fff;' +
      'box-shadow:0 0 30px ' + color + ',0 0 62px ' + color + ',0 0 100px ' + color +
      ';left:' + x1 + 'px;top:' + y1 + 'px;margin:-13px 0 0 -13px;';
    fxl.appendChild(d);
    d.animate([{ transform: 'translate(0,0) scale(.6)' },
               { transform: 'translate(' + ((x2 - x1) * .5) + 'px,' + ((y2 - y1) * .5) + 'px) scale(1.25)', offset: .5 },
               { transform: 'translate(' + (x2 - x1) + 'px,' + (y2 - y1) + 'px) scale(1)' }],
      { duration: 500 / spd(), easing: 'linear' });
    setTimeout(function () { d.remove(); }, 520 / spd());
  }
  function slashArc(x, y, color) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:210px;height:210px;margin:-105px 0 0 -105px;';
    d.innerHTML = '<svg viewBox="0 0 100 100" style="width:100%;height:100%">' +
      '<path d="M4 84 Q50 -4 96 24" stroke="#fff" stroke-width="17" fill="none" stroke-linecap="round" opacity=".9"' +
      ' style="filter:drop-shadow(0 0 22px ' + color + ')"/>' +
      '<path d="M4 84 Q50 -4 96 24" stroke="' + color + '" stroke-width="9" fill="none" stroke-linecap="round"' +
      ' style="filter:drop-shadow(0 0 26px ' + color + ')"/></svg>';
    d.animate([{ transform: 'rotate(-40deg) scale(.35)', opacity: 0 },
      { transform: 'rotate(0) scale(1.1)', opacity: 1, offset: .3 },
      { transform: 'rotate(14deg) scale(1.2)', opacity: 1, offset: .6 },
      { transform: 'rotate(26deg) scale(1.55)', opacity: 0 }], { duration: 760 / spd() });
    fxl.appendChild(d);
    setTimeout(function () { d.remove(); }, 790 / spd());
  }
  function tintScreen(color, a) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;inset:0;background:' + color + ';opacity:0;mix-blend-mode:screen';
    fxl.appendChild(d);
    d.animate([{ opacity: 0 }, { opacity: a * 1.5, offset: .22 }, { opacity: a * 1.1, offset: .55 }, { opacity: 0 }],
      { duration: 720 / spd() });
    setTimeout(function () { d.remove(); }, 740 / spd());
  }
  function shakeBy(px) {
    if (!px) return;
    document.body.style.setProperty('--shk', Math.round(px * 1.6) + 'px');
    document.body.classList.remove('shake'); void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(function () { document.body.classList.remove('shake'); }, 560 / spd());
  }
  function hitStop(ms) {
    app.classList.add('hitstop');
    setTimeout(function () { app.classList.remove('hitstop'); }, ms / spd());
  }

  /* --- 大きな数字 --- */
  /* 直前に出したダメージ数字の位置を覚えておき、同じ場所に重ならないようにずらす。
     多段ヒット（メテオ・三連矢など）や、同じ相手に続けて当たったときに
     「同じ数字が2つ重なって見える」のを防ぐ。 */
  var numSlots = [];
  function offsetNum(x, y) {
    var now = Date.now();
    numSlots = numSlots.filter(function (s) { return now - s.t < 1600; });
    var n = 0;
    while (n < 6 && numSlots.some(function (s) {
      return Math.abs(s.x - x) < 26 && Math.abs(s.y - y) < 26;
    })) {
      /* 右上 → 左上 → 右下 … と順にずらす */
      x += (n % 2 ? -1 : 1) * (26 + n * 5);
      y -= 15 + n * 4;
      n++;
    }
    numSlots.push({ x: x, y: y, t: now });
    return { x: x, y: y };
  }

  function bigNumber(x, y, txt, o) {
    o = o || {};
    var pos = offsetNum(x, y); x = pos.x; y = pos.y;
    var d = document.createElement('div');
    d.className = 'bignum k-' + (o.kind || 'phys') + (o.crit ? ' crit' : '');
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.setProperty('--c', o.color || '#fff');
    d.style.fontSize = (o.size || 50) + 'px';
    d.innerHTML = (o.pre ? '<i>' + o.pre + '</i>' : '') + '<span class="n">' + txt + '</span>' +
                  (o.tag ? '<em>' + o.tag + '</em>' : '');
    fxl.appendChild(d);
    /* 2倍・4倍速でも数字が一瞬で消えないよう、下限を設ける */
    var dur = Math.max(620, (o.dur || 1750) / spd());
    var frames = (o.kind === 'heal')
      ? [{ transform: 'translate(-50%,-35%) scale(.45)', opacity: 0 },
         { transform: 'translate(-50%,-76%) scale(1.42)', opacity: 1, offset: .18 },
         { transform: 'translate(-50%,-92%) scale(1.06)', opacity: 1, offset: .32 },
         { transform: 'translate(-50%,-165%) scale(1.02)', opacity: 1, offset: .8 },
         { transform: 'translate(-50%,-225%) scale(.9)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-50%) scale(.22) rotate(-14deg)', opacity: 0 },
         { transform: 'translate(-50%,-68%) scale(1.95) rotate(5deg)', opacity: 1, offset: .12 },
         { transform: 'translate(-50%,-60%) scale(1.05) rotate(0deg)', opacity: 1, offset: .26 },
         { transform: 'translate(-50%,-64%) scale(1.14)', opacity: 1, offset: .4 },
         { transform: 'translate(-50%,-78%) scale(1.06)', opacity: 1, offset: .8 },
         { transform: 'translate(-50%,-140%) scale(.86)', opacity: 0 }];
    d.animate(frames, { duration: dur, easing: 'cubic-bezier(.18,.9,.25,1)' });
    setTimeout(function () { d.remove(); }, dur + 60);
  }

  /* --- 技名カットイン --- */
  function techRibbon(who, tech, color, big, at) {
    /* 前の技名は即座に消さず、短く溶かして消す。
       連続行動（凱歌など）や高速再生のときに「出た瞬間に消える」ように
       見えていたのを、切り替わりとして分かる動きにする。 */
    $$('.techrib').forEach(function (o) {
      if (o._fading) { o.remove(); return; }
      o._fading = true;
      try {
        o.getAnimations().forEach(function (a) { a.cancel(); });
        o.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-14px) scale(.96)' }],
          { duration: 150, fill: 'forwards' });
      } catch (e) {}
      setTimeout(function () { o.remove(); }, 160);
    });
    var d = document.createElement('div');
    d.className = 'techrib' + (big ? ' big' : '') + (at ? ' dtl' : '');
    d.style.setProperty('--c', color);
    /* at が来たときは、画面中央ではなく指定の位置に小さく出す（詳細画面用） */
    if (at) { d.style.left = at.x + 'px'; d.style.top = at.y + 'px'; d.style.maxWidth = at.w + 'px'; }
    d.innerHTML = '<span class="w">' + who + '</span><span class="t">' + tech + '</span>' +
                  '<span class="shine"></span>';
    fxl.appendChild(d);
    d.animate([
      { transform: 'translate(-50%,0) scale(.62)', opacity: 0, filter: 'blur(10px)' },
      { transform: 'translate(-50%,0) scale(1.14)', opacity: 1, filter: 'blur(0)', offset: .07 },
      { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: .14 },
      { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: .88 },
      { transform: 'translate(-50%,-20px) scale(.97)', opacity: 0 }
    ], { duration: Math.max(1000, 2600 / spd()), easing: 'cubic-bezier(.2,.9,.3,1)' });
    var sh = d.lastChild;
    sh.animate([{ transform: 'translateX(-130%) skewX(-18deg)' },
                { transform: 'translateX(130%) skewX(-18deg)' }],
      { duration: 900 / spd(), delay: 180 / spd(), easing: 'cubic-bezier(.3,.1,.2,1)' });
    setTimeout(function () { d.remove(); }, Math.max(1060, 2660 / spd()));
  }

  /* --- パッシブ（特殊能力）発動の明示 --- */
  function passiveRibbon(who, name, text, color, side) {
    $$('.passrib.s' + side).forEach(function (o) { o.remove(); });
    var d = document.createElement('div');
    d.className = 'passrib s' + side;
    d.style.setProperty('--c', color);
    d.innerHTML = '<span class="ic">★</span><span class="tx"><b>' + who + '</b> の特殊能力<br>' +
      '<em>' + name + '</em><small>' + (text || '') + '</small></span>';
    fxl.appendChild(d);
    d.animate([
      { transform: 'translate(-50%,10px)', opacity: 0 },
      { transform: 'translate(-50%,0)', opacity: 1, offset: .14 },
      { transform: 'translate(-50%,0)', opacity: 1, offset: .8 },
      { transform: 'translate(-50%,-12px)', opacity: 0 }
    ], { duration: 2200 / spd(), easing: 'cubic-bezier(.2,.9,.3,1)' });
    setTimeout(function () { d.remove(); }, 2260 / spd());
  }

  /* --- ヒット数カウンタ --- */
  function comboShow(n, total, done) {
    var el = $('#combo');
    if (!el) {
      el = document.createElement('div');
      el.id = 'combo'; el.className = 'combo';
      fxl.appendChild(el);
    }
    el.innerHTML = done
      ? '<b>合計 ' + total + '</b><span>ダメージ</span>'
      : '<b>' + n + '</b><span>HIT</span>';
    el.classList.toggle('done', !!done);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(el._t);
    el._t = setTimeout(function () { if (el.parentNode) el.remove(); }, (done ? 1700 : 2100) / spd());
  }

  function playEvents(evs, done) {
    /* 画面を離れた（タイトルに戻った・決着した・新しい戦闘を始めた）あとも
       古い再生が走り続け、勝手に盤面を描き直してしまうことがあった。
       開始時の世代番号と食い違ったら、その場で打ち切る。 */
    var gen = S.gen;
    function next() {
      if (gen !== S.gen) return;
      if (!evs.length) { done(); return; }
      var e = evs.shift();
      var delay = 60;
      /* 演出のどれか1つが失敗しても、そこで戦闘全体が止まらないようにする。
         以前は例外が出ると再生が打ち切られ、複数体攻撃の2体目以降の
         ダメージ表示が出ないまま固まることがあった。 */
      try { delay = applyEvent(e, evs); }
      catch (err) {
        if (window.console && console.warn) console.warn('演出をスキップしました:', e && e.type, err);
        delay = 60;
      }
      wait(delay, next);
    }
    next();
  }

  function applyEvent(e, rest) {
    var st = S.st;
    switch (e.type) {
      case 'turnStart': return 60;

      case 'move': {
        var mu = E.findUid(st, e.uid);
        if (!mu) return 120;
        var el = $('[data-uid="' + e.uid + '"]');
        var cell = $('[data-cell="' + mu.side + '-' + e.row + '-' + e.col + '"]');
        if (!el || !cell) return 120;
        /* 移動前の位置を控えてから差し替え、その差分ぶん戻してから動かす。
           こうすると縦持ち（下→上）でも横持ち（外→内）でも、
           実際に「奥から前線へ動いた」ように見える。 */
        /* 盤面がすでに描き直されている場合、要素は移動先に居る。
           そこで「元のマス」の位置はイベントの fromRow/fromCol から取る。 */
        var srcCell = (e.fromRow != null)
          ? $('[data-cell="' + mu.side + '-' + e.fromRow + '-' + e.fromCol + '"]') : null;
        var from = (srcCell || el).getBoundingClientRect();
        cell.innerHTML = ''; cell.appendChild(el);
        var to = el.getBoundingClientRect();
        var dx = Math.round(from.left - to.left), dy = Math.round(from.top - to.top);
        el.classList.add('advancing');
        el.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.94)', offset: 0 },
          { transform: 'translate(' + (dx * .18) + 'px,' + (dy * .18) + 'px) scale(1.12)', offset: .68 },
          { transform: 'none', offset: 1 }
        ], { duration: 620 / spd(), easing: 'cubic-bezier(.2,.85,.25,1)' });
        advanceTrail(from, to);
        floatTag(el, '前線へ！', mu.side);
        if (S.sound) SFX.play('guard');
        setTimeout(function () { el.classList.remove('advancing'); }, 900 / spd());
        /* 次も前進なら、待たずにほぼ同時に動かす（縦横同時の前進で間延びさせない） */
        return (rest && rest[0] && rest[0].type === 'move') ? 150 : 820;
      }

      case 'attack': {
        flowWarline(e.uid != null ? (E.findUid(st, e.uid) || {}).side : null);
        var f = fxOf(e.fx);
        S.fx = f; S.fxName = e.fx; S.hits = 0; S.total = 0; S.multi = e.targets.length > 1;
        SFX.play(e.fx);
        var au = E.findUid(st, e.uid);
        techRibbon(au ? au.def.name : '', e.name, f.c, S.multi || f.sh >= 12);
        var src = rectOf(e.uid);
        var swing = src ? motionPlay(src.el, 'attack') : 0;   // 振り抜くまでの時間
        var isSound = (e.fx === 'discord' || e.fx === 'screech');
        if (f.k === 'magic' && !isSound) setTimeout(function () { tintScreen(f.c, e.targets.length > 2 ? 0.34 : 0.2); }, swing / spd());
        if (isSound && src) {
          /* 音波：術者から大きな同心円を3重に放つ */
          [0, 130, 260].forEach(function (dl, k) {
            setTimeout(function () { ringWave(src.x, src.y, f.c, 150 + k * 70, 5); }, (swing + dl) / spd());
          });
        }
        e.targets.forEach(function (tid, i) {
          var t = rectOf(tid); if (!t) return;
          var d0 = swing + 30 + i * 130;                 // 振り抜いた瞬間に当たる／範囲は1体ずつ
          if (f.k === 'proj') {
            if (src) setTimeout(function () { projectile(src.x, src.y, t.x, t.y, f.c); }, (d0 - 60) / spd());
            setTimeout(function () {
              glowBall(t.x, t.y, f.c, 105); burstRays(t.x, t.y, f.c, 10, 130);
              particles(t.x, t.y, f.c, 10, f.p);
            }, (d0 + 260) / spd());
          } else if (e.fx === 'slash' || e.fx === 'sweep' || e.fx === 'claw' ||
                     e.fx === 'dclaw' || e.fx === 'wallop' || e.fx === 'holystrike') {
            setTimeout(function () {
              slashArc(t.x, t.y, f.c); burstRays(t.x, t.y, '#fff', 8, 120);
              particles(t.x, t.y, f.c, 11, f.p);
            }, d0 / spd());
          } else if (e.fx === 'pierce' || e.fx === 'lance' || e.fx === 'thorn') {
            if (src) streak(src.x, src.y, t.x, t.y, f.c, 7);
            setTimeout(function () {
              burstRays(t.x, t.y, f.c, 8, 130); particles(t.x, t.y, f.c, 9, f.p);
            }, (d0 + 80) / spd());
          } else if (e.fx === 'meteor' || e.fx === 'breath' || e.fx === 'purge' || e.fx === 'blizzard') {
            setTimeout(function () {
              glowBall(t.x, t.y, f.c, 175); ringWave(t.x, t.y, '#fff', 100, 6);
              burstRays(t.x, t.y, f.c, 16, 210);
              particles(t.x, t.y, f.c, 18, f.p);
            }, d0 / spd());
          } else if (isSound) {
            /* 音系：まぶしい玉や白閃光は使わず、波紋と音符粒子だけで当てる */
            setTimeout(function () {
              ringWave(t.x, t.y, f.c, 96, 5);
              particles(t.x, t.y, f.c, 10, f.p);
            }, d0 / spd());
          } else {
            setTimeout(function () {
              glowBall(t.x, t.y, f.c, 125); ringWave(t.x, t.y, f.c, 84, 5);
              burstRays(t.x, t.y, f.c, 12, 160);
              particles(t.x, t.y, f.c, 13, f.p);
            }, d0 / spd());
          }
        });
        setTimeout(function () { shakeBy(f.sh); }, swing / spd());
        return 700 + swing + (S.multi ? 130 * e.targets.length : 0);
      }

      case 'damage': {
        var f2 = S.fx || fxOf('slash');
        var r = rectOf(e.uid);
        var uu = E.findUid(st, e.uid);
        var ratio = uu ? e.amount / uu.maxHp : 0;
        var crit = e.amount >= 10 || ratio >= 0.4;
        SFX.impact(S.fxName, crit);
        S.hits++; S.total += e.amount;
        if (r) {
          r.el.classList.add('hitflash');
          setTimeout(function () { r.el.classList.remove('hitflash'); }, 480 / spd());
          r.el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-11px)' },
            { transform: 'translateX(9px)' }, { transform: 'translateX(-5px)' },
            { transform: 'translateX(0)' }], { duration: 420 / spd() });
          bigNumber(r.x, r.y, e.amount, {
            kind: f2.k === 'heal' ? 'heal' : (f2.k === 'magic' ? 'magic' : 'phys'),
            color: f2.c, crit: crit,
            size: Math.min(106, 50 + e.amount * 3.1),
            tag: crit ? '痛恨' : null
          });
          particles(r.x, r.y, f2.c, crit ? 16 : 9, f2.p);
          if (crit) {
            hitStop(190); shakeBy(Math.max(11, f2.sh));
            burstRays(r.x, r.y, '#fff', 16, 200);
            ringWave(r.x, r.y, f2.c, 96, 6);
            tintScreen(f2.c, 0.2);
          }
          var bar = $('.hpf', r.el), num = $('.hpn', r.el);
          if (bar && uu) {
            var pct = Math.max(0, e.hp / uu.maxHp * 100);
            bar.style.width = pct + '%';
            bar.className = 'hpf' + (pct <= 25 ? ' low' : pct <= 55 ? ' mid' : '');
          }
          if (num && uu) num.textContent = Math.max(0, e.hp) + '/' + uu.maxHp;
        }
        if (S.multi) {
          var more = rest && rest.length && rest[0].type === 'damage';
          comboShow(S.hits, S.total, !more && S.hits > 1);
        }
        return crit ? 900 : 700;
      }

      case 'heal': {
        var rh = rectOf(e.uid);
        if (e.amount > 0) SFX.play('heal');
        if (!rh || e.amount <= 0) return 90;
        var uh = E.findUid(st, e.uid);
        ringWave(rh.x, rh.y, '#4fe39a', 86, 4);
        burstRays(rh.x, rh.y, '#7dffbe', 10, 130);
        particles(rh.x, rh.y, '#7dffbe', 11, 'plus');
        bigNumber(rh.x, rh.y, e.amount, { kind: 'heal', color: '#5fe0a0', pre: '＋', size: Math.min(88, 46 + e.amount * 2.6) });
        var bh = $('.hpf', rh.el), nh = $('.hpn', rh.el);
        if (bh && uh) {
          var p2 = Math.max(0, e.hp / uh.maxHp * 100);
          bh.style.width = p2 + '%';
          bh.className = 'hpf' + (p2 <= 25 ? ' low' : p2 <= 55 ? ' mid' : '');
        }
        if (nh && uh) nh.textContent = e.hp + '/' + uh.maxHp;
        return 620;
      }

      case 'death': {
        SFX.play('death');
        var rd = rectOf(e.uid);
        if (rd) {
          glowBall(rd.x, rd.y, '#ff5f76', 160);
          burstRays(rd.x, rd.y, '#ff8f9f', 18, 230);
          ringWave(rd.x, rd.y, '#ff5f76', 110, 6);
          particles(rd.x, rd.y, '#ff8f9f', 18, 'drop');
          bigNumber(rd.x, rd.y - 6, '撃破', { kind: 'phys', color: '#ff5f76', size: 46, dur: 1500 });
          rd.el.classList.add('dying');
          setTimeout(function () { rd.el.classList.add('dead'); rd.el.classList.remove('dying'); }, 620 / spd());
        }
        shakeBy(9);
        return 1000;
      }

      case 'execute': {
        SFX.play('execute');
        var re = rectOf(e.uid);
        if (re) {
          streak(re.x - 120, re.y - 80, re.x + 120, re.y + 80, '#fff', 8);
          setTimeout(function () { streak(re.x + 120, re.y - 80, re.x - 120, re.y + 80, '#fff', 8); }, 150 / spd());
          ringWave(re.x, re.y, '#ff2d4a', 150, 7);
          burstRays(re.x, re.y, '#ff2d4a', 20, 260);
          particles(re.x, re.y, '#ff6b7d', 22, 'shard');
        }
        hitStop(220); shakeBy(18); tintScreen('#ff2d4a', 0.26);
        banner('☠ 首狩り！', 'color:#ff6b7d;border-color:#ff6b7d');
        return 1150;
      }
      case 'devotion': {
        SFX.play('holy');
        var rv = rectOf(e.uid);
        if (rv) { ringWave(rv.x, rv.y, '#ffe08a', 125, 6); burstRays(rv.x, rv.y, '#ffe08a', 14, 190);
                  particles(rv.x, rv.y, '#fff3c4', 15, 'ray'); }
        banner('✚ 献身', 'color:#ffe08a');
        return 1000;
      }
      case 'revive': {
        SFX.play('revive');
        renderBattle();
        var rr = rectOf(e.uid);
        if (rr) {
          glowBall(rr.x, rr.y, '#ffe08a', 190); ringWave(rr.x, rr.y, '#fff', 128, 6);
          burstRays(rr.x, rr.y, '#ffe08a', 20, 250);
          particles(rr.x, rr.y, '#ffe08a', 22, 'ray');
        }
        banner('✦ 復活！', 'color:#ffe08a;border-color:#ffe08a');
        return 1200;
      }
      case 'cast': {
        SFX.play(e.fx);
        var fc = fxOf(e.fx);
        var rc = rectOf(e.uid);
        if (rc) motionPlay(rc.el, 'cast');
        var ua = E.findUid(st, e.uid);
        if (ua && e.fx !== 'guard') techRibbon(ua.def.name, e.name || '詠唱', fc.c);
        if (rc) { ringWave(rc.x, rc.y, fc.c, 96, 4); burstRays(rc.x, rc.y, fc.c, 10, 140);
                  particles(rc.x, rc.y, fc.c, 11, fc.p); }
        return 620;
      }
      case 'buffFx': {
        var rb = rectOf(e.uid);
        var fb = fxOf(e.fx);
        if (rb) { ringWave(rb.x, rb.y, fb.c, 70, 4); }
        return 200;
      }
      case 'passive': {
        var pu = E.findUid(st, e.uid);
        var col = e.kind === 'bad' ? '#ff6b7d' : '#7de8a4';
        SFX.play(e.kind === 'bad' ? 'shadow' : 'ward');
        if (pu) {
          var pr = rectOf(e.uid);
          if (pr) {
            pr.el.classList.add('passiveglow');
            setTimeout(function () { pr.el.classList.remove('passiveglow'); }, 1300 / spd());
            ringWave(pr.x, pr.y, col, 82, 4);
            particles(pr.x, pr.y, col, 9, e.kind === 'bad' ? 'drop' : 'plus');
          }
          passiveRibbon(pu.def.name, e.name, e.text, col, pu.side);
        }
        return e.small ? 620 : 1150;
      }
      case 'buff': return 40;
      case 'log': {
        var lb = $('#log');
        if (lb) { lb.innerHTML = '<span class="' + (e.cls || '') + '"></span><b>全ログ</b>'; lb.firstChild.textContent = e.text; }
        return 40;
      }
      case 'roundStart': return 40;
      case 'end': return 220;
      default: return 40;
    }
  }

  /* =========================================================
     結果
     ========================================================= */
  function recordGame(st, r) {
    function sideRec(side) {
      var p = st.players[side];
      return {
        cost: p.cost,
        units: p.units.map(function (u) {
          return { id: u.defId, row: u.row, col: u.col, alive: !!u.alive, hp: u.hp,
                   dmg: u.stats.dmg, heal: u.stats.heal, kills: u.stats.kills };
        })
      };
    }
    try {
      SAVE.addGame({
        pool: E.getPool(), deal: E.getDealMode(),
        mode: S.mode, diff: S.mode === 'cpu' ? S.diff : null,
        result: r.winner === null ? 'draw' : r.winner === 0 ? 'win' : 'lose',
        how: r.how, decidedBy: r.decidedBy || null, rounds: r.round,
        me: sideRec(0), foe: sideRec(1)
      });
    } catch (e) {}
    /* 不具合を後から追えるように、再現データも残す */
    try {
      SAVE.addReplay({
        v: 1, seed: st.seed, coin: st.coin,
        pool: E.getPool(), deal: E.getDealMode(),
        mode: S.mode, diff: S.mode === 'cpu' ? S.diff : null,
        tA: S.teams[0].map(function (c) { return { id: c.id, row: c.row, col: c.col }; }),
        tB: S.teams[1].map(function (c) { return { id: c.id, row: c.row, col: c.col }; }),
        acts: (st.rec || []).slice(),
        result: { w: r.winner, r: r.round, how: r.how }
      });
    } catch (e) {}
  }

  /* 端末をまたいで貼れるように、文字列にして写す */
  function copyText(txt, okMsg) {
    var done = function () { toast(okMsg || 'コピーしました'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { fallback(); });
        return;
      }
    } catch (e) {}
    fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done();
      else showCodeBox(txt);
    }
  }
  /* コピーできない端末向けに、選んで写せる箱を出す */
  function showCodeBox(txt) {
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="box" style="max-width:420px">' +
      '<h3 style="margin:0 0 8px;font-size:15px;color:var(--gold)">不具合報告用のコード</h3>' +
      '<p style="font-size:11.5px;color:var(--dim);margin:0 0 8px;line-height:1.8">' +
      'この文字列をすべて選んでコピーし、クロちゃんに貼ってください。' +
      'その対戦をそのまま再現して中身を確かめられます。</p>' +
      '<textarea readonly style="width:100%;height:120px;font-size:11px;font-family:ui-monospace,monospace;' +
      'background:#0a0e18;color:#cfd9ec;border:1px solid #2a3550;border-radius:8px;padding:8px">' +
      txt + '</textarea>' +
      '<button class="btn ghost" id="cbclose" style="width:100%;margin-top:10px">閉じる</button></div>';
    document.body.appendChild(m);
    var ta = m.querySelector('textarea'); ta.focus(); ta.select();
    m.querySelector('#cbclose').onclick = function () { m.remove(); };
    m.onclick = function (ev) { if (ev.target === m) m.remove(); };
  }

  function showResult() {
    var st = S.st, r = st.result;
    S.gen = (S.gen || 0) + 1;
    S.screen = 'result'; syncBgm();
    /* 横並びレイアウトは戦闘画面専用。結果画面では必ず解除する
       （グリッド指定が残ると中身が置き場を失って真っ黒になる） */
    app.classList.remove('land', 'lp-bottom', 'lp-side');
    if (!S._saved) { S._saved = true; recordGame(st, r); }
    var win = r.winner;
    var names = [st.players[0].name, st.players[1].name];
    var A = r.teams[0], B = r.teams[1];

    var rows = [
      { l: '生存キャラ数', a: A.alive, b: B.alive },
      { l: '残りHP合計', a: A.hpLeft, b: B.hpLeft },
      { l: '与えたダメージ', a: A.dmg, b: B.dmg },
      { l: '回復した量', a: A.heal, b: B.heal },
      { l: '撃破数', a: A.kills, b: B.kills },
      { l: '編成コスト', a: A.cost, b: B.cost }
    ];
    var decisiveLabel = r.decidedBy ? r.decidedBy.replace('（少ない方が勝ち）', '') : null;

    var tbl = '<table class="tallytab"><tr><th></th><th style="color:var(--p1)">' + names[0] + '</th><th style="color:var(--p2)">' + names[1] + '</th></tr>' +
      rows.map(function (x) {
        var dec = decisiveLabel && x.l === decisiveLabel;
        var aw = x.l === '編成コスト' ? x.a < x.b : x.a > x.b;
        var bw = x.l === '編成コスト' ? x.b < x.a : x.b > x.a;
        return '<tr' + (dec ? ' class="decisive"' : '') + '><td>' + x.l + '</td>' +
          '<td class="' + (aw ? 'win' : '') + '">' + x.a + '</td><td class="' + (bw ? 'win' : '') + '">' + x.b + '</td></tr>';
      }).join('') + '</table>';

    function mvp(side) {
      var us = st.players[side].units.slice().sort(function (a, b) { return (b.stats.dmg + b.stats.heal) - (a.stats.dmg + a.stats.heal); })[0];
      if (!us) return '';
      return '<div class="mvp"><div class="pic">' + ART.portrait(us.defId, us.def.elem) + '</div>' +
        '<div><div style="font-weight:900;font-size:13px;color:' + (side === 0 ? 'var(--p1)' : 'var(--p2)') + '">' +
        names[side] + ' MVP：' + us.def.name + '</div>' +
        '<div style="font-size:11px;color:var(--dim)">与ダメージ ' + us.stats.dmg + '　回復 ' + us.stats.heal +
        '　撃破 ' + us.stats.kills + '　' + (us.alive ? '生存 HP' + us.hp : '戦死') + '</div></div></div>';
    }

    var headline = win === null ? '引き分け' : names[win] + ' の勝利';
    var color = win === null ? 'var(--gold)' : win === 0 ? 'var(--p1)' : 'var(--p2)';
    var why = r.how === 'KO'
      ? '<b style="color:var(--gold)">全滅勝ち</b>　' + r.message
      : '<b style="color:var(--gold)">判定勝ち</b>　' + r.message +
        (r.decidedBy ? '<br>決め手：<b style="color:var(--gold)">' + r.decidedBy + '</b> で上回った' : '<br>すべての項目が同点だったため引き分け');

    app.innerHTML =
      '<div style="padding:0 14px calc(20px + var(--safe-b))">' +
        '<div class="result-hero"><div style="font-size:12px;color:var(--dim);letter-spacing:.2em">RESULT — ' + r.round + 'ラウンドで決着</div>' +
        '<div class="win" style="color:' + color + '">' + headline + '</div>' +
        '<div style="font-size:12px;color:#c3cee6;margin-top:8px;line-height:1.7">' + why + '</div></div>' +
        tbl + mvp(0) + mvp(1) +
        '<button class="btn primary" id="again" style="width:100%;padding:14px;margin-top:10px">🔄 もう一度戦う</button>' +
        '<button class="btn ghost" id="home" style="width:100%;padding:12px;margin-top:8px">タイトルへ</button>' +
        '<button class="btn ghost" id="repcopy" style="width:100%;padding:10px;margin-top:8px;' +
          'font-size:12px;opacity:.75">🐞 この対戦のコードをコピー</button>' +
      '</div>';
    $('#again').onclick = startGame;
    $('#home').onclick = renderTitle;
    $('#repcopy').onclick = function () {
      try {
        var rs = SAVE.replays();
        if (!rs.length) { toast('記録がありません'); return; }
        copyText(SAVE.replayCode(rs[0]), 'コードをコピーしました');
      } catch (e) { toast('コピーできませんでした'); }
    };
    SFX.play(win === 0 ? 'win' : win === null ? 'round' : 'lose');
    banner(headline, 'color:' + color + ';border-color:' + color);
  }

  /* ---------- 起動 ---------- */
  // 動作確認用：好きな編成で戦闘だけを開始する（ゲーム内からは使わない）
  window.CBTEST = function (teamA, teamB, mode) {
    S.mode = mode || 'pvp'; S.teams = [teamA, teamB]; beginBattle();
  };
  /* 端末を回したらレイアウトを組み直す */
  var _reflow = null, _wasLandscape = null;
  function applyOrientClasses() {
    if (S.screen !== 'battle') return;
    var land = isLandscape();
    app.classList.toggle('land', land);
    app.classList.toggle('lp-side', land);
  }
  function onOrient() {
    /* モバイルではアドレスバーの出入りだけで resize が連発する。
       そのたびに作り直すと画面が揺れるので、まずクラスだけ付け替える。
       上段バーと右パネル内バーは常に両方描いてあり、表示はCSSが決めるので、
       これだけで縦横のレイアウトは正しく入れ替わる（演出中でも安全）。 */
    applyOrientClasses();
    var now = isLandscape();
    if (now === _wasLandscape) return;
    _wasLandscape = now;
    clearTimeout(_reflow);
    _reflow = setTimeout(function () {
      if (S.screen === 'ready') renderReady();
      else if (S.screen === 'battle' && S.st && !S.busy) renderBattle();
    }, 220);
  }
  _wasLandscape = isLandscape();
  window.addEventListener('orientationchange', onOrient);
  window.addEventListener('resize', onOrient);

  restoreSettings();
  SFX.setEnabled(S.sound);
  if (S.bgm === undefined) S.bgm = true;
  E.setPool(S.pool); E.setDealMode(S.deal);
  renderTitle();
})();
