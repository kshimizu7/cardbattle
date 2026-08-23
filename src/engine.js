/* =========================================================
   ARCANA CLASH  —  ゲームエンジン（DOM非依存）
   ブラウザ / Node の両方で動作する純ロジック
   ========================================================= */
var CB = (function () {
  'use strict';

  /* ---------- パラメータ段階（1〜7）→ 実数値 ---------- */
  var HP_TIER  = [0, 8, 11, 14, 17, 21, 26, 34];
  var ATK_TIER = [0,  2,  3,  4,  5,  6,  8, 10];
  // 素早さは 1〜7 をそのまま使用

  var MAX_ROUNDS = 12;
  var COST_CAP   = 22;
  var HAND_SIZE  = 10;
  var MAX_UNITS  = 6;
  var MIN_UNITS  = 4;

  /* ---------- 乱数（シード固定可能） ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* =========================================================
     キャラクター図鑑
     tier: [体力, 攻撃, 素早さ]  ※素早さはそのままの値
     ========================================================= */
  var ROSTER = [
    /* --- 前衛・物理 --- */
    { id:'knight', name:'騎士', en:'Knight', cost:4, role:'melee', elem:'steel', line:'人', up:'paladin', tier:1,
      hpT:5, atkT:5, spd:5,
      actions:[{key:'lance', name:'刺突', kind:'dmg', range:'pierce', dtype:'phys', fx:'pierce', backRatio:0.7}],
      passives:['guardian'],
      flavor:'穂先は前の敵を貫き、後ろの敵まで届く。' },

    { id:'berserker', name:'狂戦士', en:'Berserker', cost:4, role:'melee', elem:'blood', line:'人',
      hpT:6, atkT:3, spd:1,
      actions:[{key:'sweep', name:'薙ぎ払い', kind:'dmg', range:'front_row', dtype:'phys', fx:'sweep'}],
      passives:['bloodrage','defenseless'],
      flavor:'痛みを忘れた斧は、横一列を薙ぎ払う。' },

    { id:'spearman', name:'槍兵', en:'Spearman', cost:3, role:'melee', elem:'steel', line:'人',
      hpT:5, atkT:3, spd:4,
      actions:[{key:'thrust', name:'長槍突き', kind:'dmg', range:'melee', dtype:'phys', fx:'lance'}],
      passives:['longreach','formation'],
      flavor:'長柄ゆえ、後列からでも敵に届く。' },

    { id:'shieldguard', name:'護衛兵', en:'Shield Guardian', cost:4, role:'tank', elem:'steel', line:'人', up:'royalguard', tier:1,
      hpT:5, atkT:3, spd:2,
      actions:[{key:'bash', name:'盾殴り', kind:'dmg', range:'melee', dtype:'phys', fx:'bash'}],
      passives:['bulwark'],
      flavor:'その盾があるかぎり、陣は崩れない。' },

    { id:'ogre', name:'オーク', en:'Ork', cost:4, role:'melee', elem:'earth', line:'獣',
      hpT:6, atkT:5, spd:1,
      actions:[{key:'smash', name:'叩き潰し', kind:'dmg', range:'pierce', dtype:'phys', fx:'smash', backRatio:0.75}],
      passives:['slowwit'],
      flavor:'棍棒は前の敵ごと、後ろの敵まで潰す。' },

    { id:'troll', name:'トロール', en:'Troll', cost:5, role:'tank', elem:'earth', line:'獣',
      hpT:7, atkT:5, spd:1,
      actions:[{key:'claw', name:'豪腕', kind:'dmg', range:'melee', dtype:'phys', fx:'wallop'}],
      passives:['regen3'],
      flavor:'斬っても裂いても、次の瞬間には塞がっている。' },

    { id:'golem', name:'ゴーレム', en:'Golem', cost:5, role:'tank', elem:'earth', line:'物', up:'ancient', tier:1,
      hpT:6, atkT:5, spd:1,
      actions:[{key:'crush', name:'岩石打', kind:'dmg', range:'melee', dtype:'phys', fx:'rock'}],
      passives:['ironwall','nonliving'],
      flavor:'魔術で命を与えられた岩。痛みも治癒も知らない。' },

    { id:'werewolf', name:'人狼', en:'Werewolf', cost:4, role:'melee', elem:'blood', line:'獣',
      hpT:5, atkT:5, spd:6,
      actions:[{key:'rend', name:'裂爪', kind:'dmg', range:'melee', dtype:'phys', fx:'claw'}],
      passives:['moonfury'],
      flavor:'月が高くなるほど、爪は深く食い込む。' },

    { id:'paladin', name:'聖騎士', en:'Paladin', cost:5, role:'melee', elem:'holy', line:'人', base:'knight', up:'paladinking', tier:2,
      hpT:6, atkT:6, spd:4,
      actions:[{key:'smite', name:'聖なる一撃', kind:'dmg', range:'melee', dtype:'phys', fx:'holystrike'}],
      passives:['blessing','devotion'],
      flavor:'剣は敵のため、盾は仲間のため。' },

    /* --- 遠隔・物理 --- */
    { id:'archer', name:'弓兵', en:'Archer', cost:3, role:'ranged', elem:'wind', line:'人', up:'phantom', tier:1,
      hpT:2, atkT:3, spd:6,
      actions:[{key:'shoot', name:'射抜き', kind:'dmg', range:'any1', dtype:'phys', fx:'arrow'}],
      passives:['snipe'],
      flavor:'敵陣のどこであろうと、狙った一点に届く。' },

    { id:'rogue', name:'盗賊', en:'Rogue', cost:3, role:'ranged', elem:'shadow', line:'人',
      hpT:2, atkT:3, spd:7,
      actions:[{key:'stab', name:'投げ短剣', kind:'dmg', range:'any1', dtype:'phys', fx:'dagger'}],
      passives:['ambush'],
      flavor:'開戦の一瞬だけ、影は誰よりも速い。' },

    { id:'assassin', name:'暗殺者', en:'Assassin', cost:4, role:'ranged', elem:'shadow', line:'人',
      hpT:3, atkT:4, spd:7,
      actions:[{key:'mark', name:'死の刻印', kind:'dmg', range:'weakest', dtype:'phys', fx:'mark'}],
      passives:['decapitate'],
      flavor:'最も弱った者から、順に消えていく。' },

    { id:'harpy', name:'ハーピー', en:'Harpy', cost:3, role:'ranged', elem:'wind', line:'獣',
      hpT:4, atkT:3, spd:7,
      actions:[{key:'screech', name:'かく乱の叫び', kind:'dmg', range:'any1', dtype:'phys', fx:'screech', slow:2}],
      passives:['flight'],
      flavor:'その金切り声を聞いた者は、足がもつれる。' },

    { id:'valkyrie', name:'ヴァルキリー', en:'Valkyrie', cost:5, role:'ranged', elem:'holy', line:'神', up:'odin', tier:1,
      hpT:5, atkT:5, spd:6,
      actions:[{key:'dive', name:'天翔ける槍', kind:'dmg', range:'any1', dtype:'phys', fx:'spear'}],
      passives:['flight','triumph'],
      flavor:'戦乙女は落ちた魂を数え、次の獲物へ翔ぶ。' },

    { id:'mage', name:'魔法使い', en:'Mage', cost:4, role:'caster', elem:'fire', line:'人', up:'archmage', tier:1,
      hpT:2, atkT:0, spd:2,
      actions:[
        {key:'bolt',  name:'ファイアボルト', kind:'dmg', range:'any1',   dtype:'magic', power:8, fx:'firebolt'},
        {key:'nova',  name:'フロストノヴァ', kind:'dmg', range:'square', dtype:'magic', power:4, fx:'frost'}
      ],
      passives:[],
      flavor:'一点を焼くか、面を凍らせるか。' },

    { id:'archmage', name:'大魔法使い', en:'Archmage', cost:6, role:'caster', elem:'arcane', line:'人', base:'mage', up:'grandsage', tier:2,
      hpT:4, atkT:0, spd:3,
      actions:[
        {key:'arcane', name:'秘術の矢', kind:'dmg', range:'any1', dtype:'magic', power:7, fx:'arcanebolt'},
        {key:'meteor', name:'メテオ', kind:'dmg', range:'random', dtype:'magic', power:4, hits:6, fx:'meteor', cd:3, startCd:1}
      ],
      passives:['resonance'],
      flavor:'空を裂き、星を落とす。ただし詠唱には時が要る。' },

    { id:'dragon', name:'竜', en:'Dragon', cost:6, role:'melee', elem:'fire', line:'竜', up:'elderdragon', tier:1,
      hpT:6, atkT:5, spd:3,
      actions:[
        {key:'talon',  name:'竜爪', kind:'dmg', range:'melee', dtype:'phys', fx:'dclaw'},
        {key:'breath', name:'業火のブレス', kind:'dmg', range:'row', dtype:'magic', power:7, fx:'breath', cd:2, startCd:1}
      ],
      passives:['dragonscale'],
      flavor:'炎を吐くには息を溜めねばならぬ。だがその一息が戦を決める。' },

    { id:'shaman', name:'呪術師', en:'Dark Mage', cost:3, role:'caster', elem:'wind', line:'邪', up:'necromancer', tier:1,
      hpT:3, atkT:0, spd:4,
      actions:[{key:'hex', name:'呪縛', kind:'dmg', range:'any1', dtype:'magic', power:4, fx:'hex', weaken:2}],
      passives:[],
      flavor:'呪いは刃より深く、腕を鈍らせる。' },

    { id:'priest', name:'僧侶', en:'Priest', cost:3, role:'support', elem:'holy', line:'人', up:'highpriest', tier:1,
      hpT:3, atkT:2, spd:4,
      actions:[
        {key:'light', name:'聖光', kind:'dmg',  range:'any1',  dtype:'magic', power:3, fx:'holy'},
        {key:'heal',  name:'ヒール', kind:'heal', range:'ally1', value:5, fx:'heal'}
      ],
      passives:[],
      flavor:'剣を持たぬ手が、幾人もの命を繋いできた。' },

    { id:'highpriest', name:'高僧', en:'High Priest', cost:5, role:'support', elem:'holy', line:'人', base:'priest', up:'saint', tier:2,
      hpT:6, atkT:2, spd:4,
      actions:[
        {key:'light',   name:'聖なる裁き', kind:'dmg', range:'pierce', dtype:'magic', power:5, fx:'holy', backRatio:0.6},
        {key:'mass',    name:'大治癒', kind:'heal', range:'all_ally', value:7, fx:'heal', cd:2},
        {key:'martyr',  name:'殉教', kind:'revive', range:'dead_ally', fx:'revive', uses:1}
      ],
      passives:[],
      flavor:'己の命を差し出してでも、仲間をもう一度立たせる。' },

    /* --- 精霊（下位） --- */
    { id:'salamander', name:'サラマンダー', en:'Salamander', cost:4, role:'caster', elem:'fire', line:'精', up:'phoenix', tier:1,
      hpT:3, atkT:0, spd:4,
      actions:[
        {key:'ember', name:'火の粉', kind:'dmg', range:'any1', dtype:'magic', power:4, fx:'ember', burn:1},
        {key:'blaze', name:'焔纏い', kind:'buff', range:'all_ally', stat:'atk', value:1, rounds:2, fx:'blaze', cd:2}
      ],
      passives:['emberheart'],
      flavor:'炎は燃やすためだけの力ではない。焼かれた土からしか芽は出ない。' },

    { id:'yeti', name:'イエティ', en:'Yeti', cost:5, role:'melee', elem:'ice', line:'精', up:'jotunn', tier:1,
      hpT:6, atkT:5, spd:2,
      actions:[
        {key:'smash', name:'氷塊叩き', kind:'dmg', range:'melee', dtype:'phys', fx:'iceclub', slow:2},
        {key:'roar',  name:'凍てつく咆哮', kind:'dmg', range:'square', dtype:'magic', power:3, fx:'frostroar', slow:2, cd:2}
      ],
      passives:['frostskin','frostair'],
      flavor:'その足跡が見つかった翌朝、村の井戸は必ず凍っている。' },

    { id:'bard', name:'吟遊詩人', en:'Bard', cost:5, role:'support', elem:'wind', line:'人',
      hpT:3, atkT:1, spd:5,
      actions:[{key:'chord', name:'不協和音', kind:'dmg', range:'all', dtype:'magic', power:2, fx:'discord'}],
      passives:['warsong'],
      flavor:'その歌は、味方全員の足を軽くする。' }
  ];

  /* ---- 派生値を計算 ---- */
  ROSTER.forEach(function (d) {
    d.hp  = HP_TIER[d.hpT];
    d.atk = d.atkT > 0 ? ATK_TIER[d.atkT] : 0;
    d.actions.forEach(function (a) { if (a.power == null && a.kind === 'dmg') a.power = null; });
  });
  var BY_ID = {};
  ROSTER.forEach(function (d) { BY_ID[d.id] = d; });

  /* =========================================================
     特殊能力（パッシブ）定義
     ========================================================= */
  var PASSIVES = {
    unyielding:  { name:'不屈',     text:'HPが50%以下のとき攻撃+3',
                   selfMod:function(u){ return u.hp <= u.maxHp*0.5 ? {atk:3} : {}; } },
    guardian:    { name:'守護',     text:'自分と同じ列の味方後衛の被ダメージ-2',
                   lane:function(){ return {physReduce:2, magicReduce:2}; } },
    bloodrage:   { name:'血の狂乱', text:'誰かが倒れるたび攻撃+1（最大+4）',
                   selfMod:function(u){ return {atk: Math.min(4, u.counters.rage||0)}; },
                   onAnyDeath:function(u){ u.counters.rage = Math.min(4,(u.counters.rage||0)+1); } },
    defenseless: { name:'無防備',   text:'受けるダメージ+1', takenAdd:1 },
    longreach:   { name:'長柄',     text:'後衛からでも同じ列の敵前衛を攻撃できる' },
    formation:   { name:'陣形',     text:'自分が後衛にいるとき攻撃+2',
                   selfMod:function(u){ return u.row===1 ? {atk:2} : {}; } },
    bulwark:     { name:'城壁',     text:'自分が前衛で生存中、自陣全体の被物理ダメージ-1',
                   aura:function(u){ return u.row===0 ? {physReduce:1} : {}; } },
    slowwit:     { name:'鈍重',     text:'素早さが上がる効果を受けない' },
    regen3:      { name:'再生',     text:'ラウンド終了時にHP+4', roundEndHeal:4 },
    ironwall:    { name:'鉄壁',     text:'受けるダメージ-3', flatReduce:3 },
    nonliving:   { name:'非生命',   text:'回復を受けられない' },
    charge:      { name:'猛牛',     text:'敵を倒せなかった攻撃のあと、次の攻撃+3（最大+9）',
                   selfMod:function(u){ return {atk: Math.min(9, u.counters.charge||0)}; } },
    moonfury:    { name:'月狂い',   text:'ラウンドが進むごとに攻撃+1（最大+5）',
                   selfMod:function(u,st){ return {atk: Math.min(5, st.round)}; } },
    blessing:    { name:'聖なる加護', text:'味方が受ける回復量+2', aura:function(){ return {healBonus:2}; } },
    devotion:    { name:'献身',     text:'味方1体の致死ダメージを1度だけ肩代わりし、HP1で耐えさせる' },
    snipe:       { name:'狙撃',     text:'敵後衛を狙うとダメージ+3' },
    ambush:      { name:'不意打ち', text:'第1ラウンドの攻撃ダメージ+2' },
    decapitate:  { name:'首狩り',   text:'常に敵の最も残HPが少ない敵を狙う。対象のHPが最大の35%以下なら即死させる' },
    flight:      { name:'飛行',     text:'敵陣のどのマスでも攻撃できる' },
    triumph:     { name:'凱歌',     text:'敵を倒すと即座にもう一度行動できる（1ラウンド1回）' },
    bloodsuck:   { name:'吸血',     text:'与えたダメージの半分だけ自分が回復する' },
    resonance:   { name:'魔力共鳴', text:'味方に他の魔法職がいると自分の魔法ダメージ+1' },
    undying:     { name:'不死の理', text:'倒されても次のラウンド開始時にHP半分で1度だけ復活する' },
    harvest:     { name:'死の収穫', text:'誰かが倒れるたび攻撃+1（最大+4）・最大HP+3（自分も回復）',
                   onAnyDeath:function(u){ u.counters.harvest=Math.min(4,(u.counters.harvest||0)+1); u.maxHp+=3; u.hp+=3; },
                   selfMod:function(u){ return {atk: (u.counters.harvest||0)}; } },
    frostskin:   { name:'氷の守り', text:'受ける物理ダメージ-1', physReduceSelf:1 },
    dragonscale: { name:'竜鱗',     text:'受けるダメージ-1', flatReduce:1 },
    rebirth:     { name:'不死鳥',   text:'倒されても次のラウンド開始時にHP半分で1度だけ復活し、味方全員を3回復する' },
    insight:     { name:'叡智',     text:'ラウンド終了時、味方全員の待機時間（CD）が追加で1減る' },
    naturegift:  { name:'自然の恵み', text:'ラウンド終了時、味方全員のHP+1', allyRoundEndHeal:1 },
    warsong:     { name:'戦歌',     text:'味方全員の攻撃+1',
                   aura:function(){ return {atk:1}; } },
    /* --- 追加分 --- */
    fortcore:    { name:'城壁の要', text:'生存中、自陣全体の被物理ダメージ-1（前衛でなくてもよい）',
                   aura:function(){ return {physReduce:1}; } },
    heavyarmor:  { name:'重甲',     text:'受けるダメージ-2', flatReduce:2 },
    selfrepair:  { name:'自己修復', text:'ラウンド終了時に自分だけHP+3（回復無効を無視する）',
                   selfRepair:3 },
    afterimage:  { name:'残像',     text:'受ける物理ダメージ-2', physReduceSelf:2 },
    venomfang:   { name:'毒牙',     text:'与えたダメージの1/4だけ相手に呪詛を残す' },
    emberheart:  { name:'熾火',     text:'ラウンド終了時に自分のHP+3', roundEndHeal:3 },
    frostair:    { name:'凍てつく大気', text:'敵全員の素早さ-1', foeAura:function(){ return {spd:-1}; } }
  };

  /* ---- 表示用：射程テキスト ---- */
  var RANGE_TEXT = {
    melee:'正面（近接）', pierce:'正面＋その後方', front_row:'敵前衛3体',
    any1:'敵陣6マスの任意1体', weakest:'敵の最弱1体（自動）',
    square:'敵陣2×2の4マス', row:'敵の前衛列 or 後衛列', all:'敵全体',
    ally1:'味方1体', all_ally:'味方全体', dead_ally:'倒れた味方1体',
    random:'敵陣にランダム（同じ相手に重なることあり）', adj_ally:'自分の前または後ろの味方1体'
  };

  /* =========================================================
     状態生成
     ========================================================= */
  var _uid = 1;
  function makeUnit(defId, side, row, col) {
    var d = BY_ID[defId];
    var u = {
      uid: 'u' + (_uid++), def: d, defId: defId, side: side, row: row, col: col,
      maxHp: d.hp, hp: d.hp, alive: true,
      cd: {}, uses: {}, statuses: [], counters: {},
      stats: { dmg: 0, heal: 0, kills: 0, taken: 0 },
      flags: {}
    };
    d.actions.forEach(function (a) {
      u.cd[a.key] = a.startCd || 0;
      if (a.uses) u.uses[a.key] = a.uses;
    });
    return u;
  }

  function createState(teamA, teamB, opts) {
    // team = [{id, row, col}, ...]
    opts = opts || {};
    var st = {
      round: 1, phase: 'battle', turnIdx: 0, order: [], events: [], log: [],
      coin: opts.coin != null ? opts.coin : (Math.random() < 0.5 ? 0 : 1),
      quietRounds: 0, winner: null, result: null,
      rnd: opts.rnd || Math.random,
      players: [
        { name: opts.nameA || 'プレイヤー1', units: [], cost: 0, stats:{dmg:0, heal:0, kills:0} },
        { name: opts.nameB || 'プレイヤー2', units: [], cost: 0, stats:{dmg:0, heal:0, kills:0} }
      ]
    };
    [teamA, teamB].forEach(function (team, side) {
      team.forEach(function (slot) {
        var u = makeUnit(slot.id, side, slot.row, slot.col);
        st.players[side].units.push(u);
        st.players[side].cost += u.def.cost;
      });
    });
    buildOrder(st);
    return st;
  }

  /* ---------- 盤面ヘルパー ---------- */
  function allUnits(st) { return st.players[0].units.concat(st.players[1].units); }
  function aliveUnits(st, side) { return st.players[side].units.filter(function (u) { return u.alive; }); }
  /* 生死を問わず、そのマスに居るユニット（＝死体も含む）。
     前進で生者が入るとき、先客の死体を押し出すために使う。 */
  function occupantAt(st, side, row, col) {
    var arr = st.players[side].units;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].row === row && arr[i].col === col) return arr[i];
    }
    return null;
  }

  function unitAt(st, side, row, col) {
    var arr = st.players[side].units;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].alive && arr[i].row === row && arr[i].col === col) return arr[i];
    }
    return null;
  }
  function hasP(u, key) { return u.def.passives.indexOf(key) >= 0; }
  /** 自分の前または後ろ（同じ縦列）の味方 */
  function adjacentAllies(st, u) {
    var out = [];
    var v = unitAt(st, u.side, 1 - u.row, u.col);
    if (v && v.uid !== u.uid) out.push(v);
    return out;
  }
  /** その味方を庇っている生存中のかばい手を返す */
  function coverOf(st, tgt) {
    if (!tgt.flags || !tgt.flags.coverBy) return null;
    var g = findUid(st, tgt.flags.coverBy);
    if (!g || !g.alive || g.uid === tgt.uid) { tgt.flags.coverBy = null; return null; }
    return g;
  }
  function findUid(st, uid) {
    var a = allUnits(st);
    for (var i = 0; i < a.length; i++) if (a[i].uid === uid) return a[i];
    return null;
  }

  /* ---------- ステータス ---------- */
  function statusVal(u, key) {
    var v = 0;
    u.statuses.forEach(function (s) { if (s.key === key) v += s.value; });
    return v;
  }
  function addStatus(u, key, value, rounds) {
    var ex = null;
    u.statuses.forEach(function (s) { if (s.key === key) ex = s; });
    if (ex) { ex.value = Math.max(ex.value, value); ex.rounds = Math.max(ex.rounds, rounds); }
    else u.statuses.push({ key: key, value: value, rounds: rounds });
  }

  /* ---------- オーラ集計 ---------- */
  function auraFor(u, st) {
    var acc = { atk:0, spd:0, physReduce:0, magicReduce:0, healBonus:0 };
    aliveUnits(st, u.side).forEach(function (a) {
      a.def.passives.forEach(function (pk) {
        var p = PASSIVES[pk];
        if (p && p.aura) {
          var m = p.aura(a, st) || {};
          for (var k in m) acc[k] = (acc[k] || 0) + m[k];
        }
        if (p && p.lane && a.uid !== u.uid && a.col === u.col && a.row === 0 && u.row === 1) {
          var l = p.lane(a, st) || {};
          for (var k2 in l) acc[k2] = (acc[k2] || 0) + l[k2];
        }
      });
    });
    // 敵側から掛けられるオーラ（凍てつく大気など）
    aliveUnits(st, 1 - u.side).forEach(function (e) {
      e.def.passives.forEach(function (pk) {
        var p = PASSIVES[pk];
        if (p && p.foeAura) {
          var m = p.foeAura(e, st) || {};
          for (var k3 in m) acc[k3] = (acc[k3] || 0) + m[k3];
        }
      });
    });
    return acc;
  }

  /* ---------- 有効ステータス ---------- */
  function getAtk(u, st) {
    var v = u.def.atk;
    u.def.passives.forEach(function (pk) {
      var p = PASSIVES[pk];
      if (p && p.selfMod) { var m = p.selfMod(u, st) || {}; v += (m.atk || 0); }
    });
    v += auraFor(u, st).atk;
    v += statusVal(u, 'might');
    v -= statusVal(u, 'weaken');
    return Math.max(0, v);
  }
  function getSpd(u, st) {
    var v = u.def.spd;
    u.def.passives.forEach(function (pk) {
      var p = PASSIVES[pk];
      if (p && p.selfMod) { var m = p.selfMod(u, st) || {}; v += (m.spd || 0); }
    });
    var bonus = auraFor(u, st).spd;
    if (hasP(u, 'slowwit')) bonus = Math.min(0, bonus);   // 素早さ上昇だけ無効
    v += bonus;
    v += statusVal(u, 'haste');
    v -= statusVal(u, 'slow');
    return Math.max(1, v);
  }

  /* =========================================================
     行動順
     ========================================================= */
  function buildOrder(st) {
    var list = allUnits(st).filter(function (u) { return u.alive; });
    var firstSide = ((st.round + (st.coin || 0)) % 2 === 1) ? 0 : 1; // 同値時の優先側は毎ラウンド交代
    list.sort(function (a, b) {
      var d = getSpd(b, st) - getSpd(a, st); if (d) return d;
      d = b.hp - a.hp; if (d) return d;
      d = a.row - b.row; if (d) return d;                 // 前衛優先
      d = Math.abs(a.col - 1) - Math.abs(b.col - 1); if (d) return d; // 中央優先
      if (a.side !== b.side) return a.side === firstSide ? -1 : 1;
      return a.uid < b.uid ? -1 : 1;
    });
    st.order = list.map(function (u) { return u.uid; });
    // 行動順を決めた瞬間の値を保存（ラウンド中にHPが変わっても表示がぶれないように）
    st.orderMeta = {};
    list.forEach(function (u, i) {
      st.orderMeta[u.uid] = { spd: getSpd(u, st), hp: u.hp, row: u.row, col: u.col, idx: i };
    });
    st.orderFirstSide = firstSide;
    st.turnIdx = 0;
    return st.order;
  }

  /* =========================================================
     ターゲット解決
     ========================================================= */
  function meleeChain(st, u) {
    var foe = 1 - u.side;
    var t = unitAt(st, foe, 0, u.col); if (t) return t;
    t = unitAt(st, foe, 1, u.col);     if (t) return t;
    var best = null, bd = 99;
    [0, 1].forEach(function (row) {
      if (best && best.row === 0) return;
      for (var c = 0; c < 3; c++) {
        var v = unitAt(st, foe, row, c);
        if (v) { var d = Math.abs(c - u.col); if (!best || (row < best.row) || (row === best.row && d < bd)) { best = v; bd = d; } }
      }
    });
    return best;
  }

  /* 前進のタイミング
     'death' … 既定。前衛が倒れた瞬間、真下の後衛がその場で繰り上がる
     'turn'  … 旧仕様。後衛は自分の手番が来たときに前進する
     技の対象はダメージ処理の前にまとめて確定するので、
     どちらでも「いま実行中の技」の結果は変わらない。 */
  var advanceMode = 'death';
  function setAdvanceMode(m) { advanceMode = (m === 'death') ? 'death' : 'turn'; }
  function getAdvanceMode() { return advanceMode; }

  /** 前衛が空いたマスへ、真下の後衛を繰り上げる（倒れた瞬間に呼ぶ）。
      盤面の状態はその場で書き換えるが、前進の「演出」はすぐには流さない。
      複数体に当たる技の途中で挟まると、2体目・3体目へのダメージ表示が
      前進アニメ（約0.8秒）のたびに止まって見えるため、
      技の演出がすべて終わってから flushMoves でまとめて流す。 */
  function pullUp(st, side, col) {
    if (unitAt(st, side, 0, col)) return null;         // まだ埋まっている
    var back = unitAt(st, side, 1, col);
    if (!back) return null;
    /* 前衛マスには倒れた者がそのまま残っている。
       生者が入ると同じマスに2体が重なり、描画が入れ替わって
       生きているキャラが盤面から消えてしまう。死体を後ろへ下げて入れ替える。 */
    var corpse = occupantAt(st, side, 0, col);
    back.row = 0;
    if (corpse && corpse !== back) corpse.row = 1;
    st._mvq = st._mvq || [];
    st._mvq.push({ type: 'move', uid: back.uid, row: 0, col: col, fromRow: 1, fromCol: col,
                   name: back.def.name });
    return back;
  }

  /** 溜めておいた前進の演出を流す。技の締め・ラウンド処理の締めで必ず呼ぶ */
  function flushMoves(st) {
    if (!st._mvq || !st._mvq.length) return;
    st._mvq.forEach(function (ev) {
      push(st, ev);
      logMsg(st, ev.name + ' が前線へ進み出た！');
    });
    st._mvq = [];
  }

  /** 近接ユニットが行動可能か。必要なら前進する */
  function meleeReady(st, u, doMove) {
    if (u.row === 0) return true;
    if (hasP(u, 'longreach')) return true;
    var frontMate = unitAt(st, u.side, 0, u.col);
    if (!frontMate) {
      if (doMove) {
        var corpse2 = occupantAt(st, u.side, 0, u.col);
        u.row = 0;
        if (corpse2 && corpse2 !== u) corpse2.row = 1;
        push(st, { type: 'move', uid: u.uid, row: 0, col: u.col, fromRow: 1, fromCol: u.col });
        /* こちらは自分の手番での前進（単独イベント）なので、その場で流してよい */
        logMsg(st, u.def.name + ' が前線へ進み出た！');
      }
      return true;
    }
    return false;
  }

  /**
   * 行動候補を返す
   * → [{action, needTarget, options:[targetSpec...], auto:targetSpec}]
   */
  function getOptions(st, u) {
    var out = [];
    var foe = 1 - u.side;
    u.def.actions.forEach(function (a) {
      if (u.cd[a.key] > 0) return;
      if (a.uses != null && u.uses[a.key] <= 0) return;
      var entry = { action: a, targets: [], auto: null, label: a.name };

      switch (a.range) {
        case 'melee':
        case 'pierce':
          if (!meleeReady(st, u, false)) return;
          var t = meleeChain(st, u);
          if (!t) return;
          entry.auto = { type: 'auto' };
          break;
        case 'front_row':
          if (!meleeReady(st, u, false)) return;
          if (aliveUnits(st, foe).length === 0) return;
          entry.auto = { type: 'auto' };
          break;
        case 'any1':
          aliveUnits(st, foe).forEach(function (v) { entry.targets.push({ type: 'unit', uid: v.uid }); });
          if (!entry.targets.length) return;
          break;
        case 'weakest':
          if (!aliveUnits(st, foe).length) return;
          entry.auto = { type: 'auto' };
          break;
        case 'square':
          [0, 1].forEach(function (c) {
            var hit = squareCells(st, foe, c);
            if (hit.length) entry.targets.push({ type: 'square', col: c });
          });
          if (!entry.targets.length) return;
          break;
        case 'row':
          [0, 1].forEach(function (r) {
            if (st.players[foe].units.some(function (v) { return v.alive && v.row === r; }))
              entry.targets.push({ type: 'row', row: r });
          });
          if (!entry.targets.length) return;
          break;
        case 'all':
        case 'random':
          if (!aliveUnits(st, foe).length) return;
          entry.auto = { type: 'auto' };
          break;
        case 'adj_ally':
          adjacentAllies(st, u).forEach(function (v) { entry.targets.push({ type: 'unit', uid: v.uid }); });
          if (!entry.targets.length) return;
          break;
        case 'ally1':
          aliveUnits(st, u.side).forEach(function (v) {
            if (hasP(v, 'nonliving')) return;
            entry.targets.push({ type: 'unit', uid: v.uid });
          });
          if (!entry.targets.length) return;
          break;
        case 'all_ally':
          entry.auto = { type: 'auto' };
          break;
        case 'self_aura':
          entry.auto = { type: 'auto' };
          break;
        case 'dead_ally':
          st.players[u.side].units.forEach(function (v) {
            if (!v.alive && !v.flags.removed) entry.targets.push({ type: 'unit', uid: v.uid });
          });
          if (!entry.targets.length) return;
          break;
      }
      out.push(entry);
    });

    if (!out.length) {
      out.push({ action: { key: 'guard', name: '防御', kind: 'guard', range: 'self', fx: 'guard' }, targets: [], auto: { type: 'auto' }, label: '防御' });
    }
    return out;
  }

  function squareCells(st, side, colStart) {
    var res = [];
    for (var r = 0; r < 2; r++) for (var c = colStart; c <= colStart + 1; c++) {
      var v = unitAt(st, side, r, c); if (v) res.push(v);
    }
    return res;
  }

  /* =========================================================
     ダメージ処理
     ========================================================= */
  function push(st, ev) { st.events.push(ev); }
  function logMsg(st, text, cls) { st.log.push({ text: text, cls: cls || '' }); push(st, { type: 'log', text: text, cls: cls || '' }); }

  function previewDamage(st, src, tgt, amount, dtype) {
    if (!tgt.alive || amount <= 0) return 0;
    var cg = coverOf(st, tgt);
    if (cg && cg.uid !== tgt.uid && statusVal(tgt, 'covered') > 0) tgt = cg;
    var aura = auraFor(tgt, st);
    var red = 0;
    tgt.def.passives.forEach(function (pk) {
      var p = PASSIVES[pk];
      if (!p) return;
      if (p.flatReduce) red += p.flatReduce;
      if (p.physReduceSelf && dtype === 'phys') red += p.physReduceSelf;
      if (p.takenAdd) red -= p.takenAdd;
    });
    if (dtype === 'phys') red += aura.physReduce; else red += aura.magicReduce;
    red += statusVal(tgt, 'guard');
    red += statusVal(tgt, 'ward');
    return Math.max(1, Math.round(amount - red));
  }

  function dealDamage(st, src, tgt, amount, dtype) {
    if (!tgt.alive || amount <= 0) return 0;
    // 王命の盾：庇い手が生きていれば、その味方の代わりに受ける
    var guard = coverOf(st, tgt);
    if (guard && guard.uid !== tgt.uid && statusVal(tgt, 'covered') > 0) {
      push(st, { type: 'passive', uid: guard.uid, name: '王命の盾', text: tgt.def.name + ' を庇った', kind: 'good', small: true });
      logMsg(st, guard.def.name + ' が ' + tgt.def.name + ' を庇った！', 'good');
      return dealDamage(st, src, guard, amount, dtype);
    }
    var dmg = previewDamage(st, src, tgt, amount, dtype);

    tgt.hp -= dmg;
    tgt.stats.taken += dmg;
    if (src) { src.stats.dmg += dmg; st.players[src.side].stats.dmg += dmg; }
    st.roundDamage = (st.roundDamage || 0) + dmg;
    push(st, { type: 'damage', uid: tgt.uid, amount: dmg, hp: Math.max(0, tgt.hp), src: src ? src.uid : null, dtype: dtype });

    // 吸血
    if (src && hasP(src, 'bloodsuck')) {
      var g = Math.max(1, Math.floor(dmg / 2));
      healUnit(st, src, src, g, true);
    }
    if (tgt.hp <= 0) killUnit(st, tgt, src);
    return dmg;
  }

  function healUnit(st, src, tgt, amount, silent) {
    if (!tgt.alive) return 0;
    if (hasP(tgt, 'nonliving')) {
      if (!silent) logMsg(st, tgt.def.name + ' は非生命のため回復できない');
      return 0;
    }
    var bonus = src ? auraFor(src, st).healBonus : 0;
    var amt = amount + bonus;
    var real = Math.min(amt, tgt.maxHp - tgt.hp);
    if (real <= 0) real = 0;
    tgt.hp += real;
    if (src) { src.stats.heal += real; st.players[src.side].stats.heal += real; }
    push(st, { type: 'heal', uid: tgt.uid, amount: real, hp: tgt.hp });
    return real;
  }

  function killUnit(st, tgt, src) {
    allUnits(st).forEach(function (v) { if (v.flags.coverBy === tgt.uid) v.flags.coverBy = null; });
    // 献身（パラディン）
    var savior = null;
    aliveUnits(st, tgt.side).forEach(function (a) {
      if (!savior && hasP(a, 'devotion') && !a.flags.devotionUsed && a.uid !== tgt.uid) savior = a;
    });
    if (savior) {
      savior.flags.devotionUsed = true;
      push(st, { type: 'passive', uid: savior.uid, name: '献身', text: '致死ダメージを肩代わり', kind: 'good' });
      tgt.hp = 1;
      push(st, { type: 'devotion', uid: tgt.uid, by: savior.uid });
      logMsg(st, savior.def.name + ' の【献身】！ ' + tgt.def.name + ' はHP1で持ちこたえた', 'good');
      return;
    }
    tgt.hp = 0; tgt.alive = false;
    push(st, { type: 'death', uid: tgt.uid });
    logMsg(st, tgt.def.name + ' は倒れた…', 'bad');
    /* 倒れた瞬間に繰り上げる方式のとき、その場で後衛を前へ出す。
       いま実行中の技の対象はすでに確定しているので、この技の結果は変わらない。 */
    if (advanceMode === 'death' && tgt.row === 0) pullUp(st, tgt.side, tgt.col);
    if (src) { src.stats.kills++; st.players[src.side].stats.kills++; }

    // 復活予約
    if ((hasP(tgt, 'undying') || hasP(tgt, 'rebirth')) && !tgt.flags.revived) {
      tgt.flags.reviveQueued = true;
    }
    // onAnyDeath
    allUnits(st).forEach(function (a) {
      if (!a.alive) return;
      a.def.passives.forEach(function (pk) {
        var p = PASSIVES[pk];
        if (p && p.onAnyDeath) {
          p.onAnyDeath(a, tgt, st);
          push(st, { type: 'passive', uid: a.uid, name: p.name, text: '発動', kind: 'good', small: true });
          logMsg(st, a.def.name + ' の【' + p.name + '】が発動', 'good');
        }
      });
    });
    // 凱歌
    if (src && hasP(src, 'triumph') && !src.flags.triumphUsed && src.alive) {
      src.flags.triumphUsed = true;
      src.flags.extraTurn = true;
      logMsg(st, src.def.name + ' の【凱歌】！ 続けてもう一度行動する', 'good');
    }
  }

  /* =========================================================
     行動実行
     ========================================================= */
  function performAction(st, u, actionKey, target) {
    st.events = [];
    var opts = getOptions(st, u);
    var entry = null;
    opts.forEach(function (o) { if (o.action.key === actionKey) entry = o; });
    if (!entry) entry = opts[0];
    var a = entry.action;
    var foe = 1 - u.side;
    var atk = getAtk(u, st);

    push(st, { type: 'turnStart', uid: u.uid });

    if (a.kind === 'guard') {
      addStatus(u, 'guard', 2, 1);
      push(st, { type: 'cast', uid: u.uid, fx: 'guard' });
      logMsg(st, u.def.name + ' は身構えた（次の被ダメージ-2）');
      return finishAction(st, u, a);
    }

    if (a.kind === 'cover') {
      var ally = findUid(st, target && target.uid);
      if (!ally || !ally.alive) ally = adjacentAllies(st, u)[0];
      push(st, { type: 'cast', uid: u.uid, fx: a.fx || 'aegis' });
      if (ally) {
        // 同時に庇えるのは1人だけ
        allUnits(st).forEach(function (v) { if (v.flags.coverBy === u.uid) v.flags.coverBy = null; });
        ally.flags.coverBy = u.uid;
        addStatus(ally, 'covered', 1, (a.rounds || 1) + 1);
        push(st, { type: 'buffFx', uid: ally.uid, fx: a.fx || 'aegis' });
        push(st, { type: 'passive', uid: u.uid, name: a.name, text: ally.def.name + ' を庇う', kind: 'good' });
        logMsg(st, u.def.name + ' の【' + a.name + '】！ ' + ally.def.name + ' への攻撃を肩代わりする', 'good');
      }
      return finishAction(st, u, a);
    }

    if (a.kind === 'buff') {
      push(st, { type: 'cast', uid: u.uid, fx: a.fx || 'ward' });
      var key = a.stat === 'spd' ? 'haste' : 'might';
      aliveUnits(st, u.side).forEach(function (v) {
        addStatus(v, key, a.value, (a.rounds || 1) + 1);
        push(st, { type: 'buffFx', uid: v.uid, fx: a.fx || 'ward' });
      });
      logMsg(st, u.def.name + ' の【' + a.name + '】！ 味方全体の' +
        (a.stat === 'spd' ? '素早さ' : '攻撃') + '+' + a.value + '（' + (a.rounds || 1) + 'ラウンド）', 'good');
      return finishAction(st, u, a);
    }

    if (a.kind === 'ward') {
      push(st, { type: 'cast', uid: u.uid, fx: 'ward' });
      aliveUnits(st, u.side).forEach(function (v) {
        addStatus(v, 'ward', a.value, a.rounds || 1);
        push(st, { type: 'buffFx', uid: v.uid, fx: 'ward' });
      });
      logMsg(st, u.def.name + ' の【' + a.name + '】！ 味方全体の被魔法ダメージ-' + a.value, 'good');
      return finishAction(st, u, a);
    }

    if (a.kind === 'heal') {
      push(st, { type: 'cast', uid: u.uid, fx: 'heal' });
      var tgts = [];
      if (a.range === 'ally1') { var t = findUid(st, target.uid); if (t) tgts = [t]; }
      else tgts = aliveUnits(st, u.side);
      var total = 0;
      tgts.forEach(function (t) { total += healUnit(st, u, t, a.value); });
      logMsg(st, u.def.name + ' の【' + a.name + '】！ 合計' + total + '回復', 'good');
      return finishAction(st, u, a);
    }

    if (a.kind === 'revive') {
      var dead = findUid(st, target.uid);
      push(st, { type: 'cast', uid: u.uid, fx: 'revive' });
      if (dead) {
        dead.alive = true;
        dead.hp = Math.max(1, Math.floor(dead.maxHp / 2));
        dead.flags.reviveQueued = false;
        push(st, { type: 'revive', uid: dead.uid, hp: dead.hp });
        logMsg(st, u.def.name + ' の【殉教】！ ' + dead.def.name + ' が蘇った', 'good');
      }
      u.alive = false; u.hp = 0;
      push(st, { type: 'death', uid: u.uid });
      logMsg(st, u.def.name + ' は自らの命を捧げた…', 'bad');
      return finishAction(st, u, a);
    }

    /* ---- 攻撃系 ---- */
    var base = (a.power != null) ? a.power : atk;
    if (a.dtype === 'magic') {
      if (a.power != null) {
        // 魔法職の攻撃力補正（バフ/デバフを魔力にも反映）
        base = a.power + (getAtk(u, st) - u.def.atk);
      }
      if (hasP(u, 'resonance')) {
        var others = aliveUnits(st, u.side).filter(function (v) { return v.uid !== u.uid && (v.def.role === 'caster' || v.def.role === 'support'); });
        if (others.length) base += 1;
      }
    }
    if (hasP(u, 'ambush') && st.round === 1) base += 2;

    var victims = [];
    if (a.range === 'melee' || a.range === 'pierce') {
      meleeReady(st, u, true);
      var pt = meleeChain(st, u);
      if (!pt) return finishAction(st, u, a);
      victims.push({ u: pt, mul: 1 });
      if (a.range === 'pierce' && pt.row === 0) {
        var behind = unitAt(st, foe, 1, pt.col);
        if (behind) victims.push({ u: behind, mul: a.backRatio == null ? 0.5 : a.backRatio });
      }
    } else if (a.range === 'front_row') {
      meleeReady(st, u, true);
      var row0 = st.players[foe].units.filter(function (v) { return v.alive && v.row === 0; });
      if (!row0.length) row0 = aliveUnits(st, foe);
      row0.forEach(function (v) { victims.push({ u: v, mul: 1 }); });
    } else if (a.range === 'any1') {
      var t2 = findUid(st, target.uid);
      if (!t2 || !t2.alive) t2 = aliveUnits(st, foe)[0];
      if (!t2) return finishAction(st, u, a);
      victims.push({ u: t2, mul: 1 });
    } else if (a.range === 'weakest') {
      var cand = aliveUnits(st, foe).slice().sort(function (x, y) { return x.hp - y.hp || threat(y, st) - threat(x, st); });
      if (!cand.length) return finishAction(st, u, a);
      victims.push({ u: cand[0], mul: 1 });
    } else if (a.range === 'square') {
      squareCells(st, foe, target.col).forEach(function (v) { victims.push({ u: v, mul: 1 }); });
    } else if (a.range === 'row') {
      st.players[foe].units.filter(function (v) { return v.alive && v.row === target.row; })
        .forEach(function (v) { victims.push({ u: v, mul: 1 }); });
    } else if (a.range === 'all') {
      aliveUnits(st, foe).forEach(function (v) { victims.push({ u: v, mul: 1 }); });
    } else if (a.range === 'random') {
      var pool = aliveUnits(st, foe);
      if (!pool.length) return finishAction(st, u, a);
      var n = a.hits || 1;
      for (var ri = 0; ri < n; ri++) {
        var alive = pool.filter(function (v) { return v.alive; });
        if (!alive.length) break;
        victims.push({ u: alive[Math.floor(st.rnd() * alive.length)], mul: 1 });
      }
    }
    // 同じ相手に複数回当てる技（三連矢など）
    if (a.hits && a.range !== 'random' && victims.length) {
      var one = victims.slice();
      for (var hi = 1; hi < a.hits; hi++) one.forEach(function (v) { victims.push({ u: v.u, mul: v.mul }); });
    }

    push(st, { type: 'attack', uid: u.uid, fx: a.fx, targets: victims.map(function (v) { return v.u.uid; }), name: a.name });

    var killedAny = false, totalDmg = 0;
    victims.forEach(function (v) {
      if (!v.u.alive) return;
      var amt = base * v.mul;
      if (hasP(u, 'snipe') && v.u.row === 1) amt += 3;
      // 首狩り
      if (hasP(u, 'decapitate') && v.u.hp <= v.u.maxHp * 0.35) {
        push(st, { type: 'execute', uid: v.u.uid });
        logMsg(st, u.def.name + ' の【首狩り】が炸裂！ ' + v.u.def.name + ' を一撃で葬った', 'bad');
        var hpLeft = v.u.hp;
        v.u.hp = 0;
        u.stats.dmg += hpLeft; st.players[u.side].stats.dmg += hpLeft;
        killUnit(st, v.u, u);
        killedAny = true;
        return;
      }
      var d = dealDamage(st, u, v.u, amt, a.dtype || 'phys');
      totalDmg += d;
      if (a.slow) addStatus(v.u, 'slow', a.slow, 1);
      if (a.weaken) addStatus(v.u, 'weaken', a.weaken, 2);
      if (a.curse) { addStatus(v.u, 'curse', a.curse, 3); push(st, { type: 'buffFx', uid: v.u.uid, fx: 'curse' }); }
      if (a.burn)  { addStatus(v.u, 'burn', a.burn, 3);   push(st, { type: 'buffFx', uid: v.u.uid, fx: 'burn' }); }
      if (a.drain) healUnit(st, u, u, Math.max(1, Math.floor(d * a.drain)), true);
      if (!v.u.alive) killedAny = true;
    });

    logMsg(st, u.def.name + ' の【' + a.name + '】！ ' + totalDmg + 'ダメージ');

    // 猛牛（倒せなかったら次の攻撃+2）
    if (hasP(u, 'charge')) {
      if (killedAny) u.counters.charge = 0;
      else u.counters.charge = Math.min(9, (u.counters.charge || 0) + 3);
    }
    return finishAction(st, u, a);
  }

  function finishAction(st, u, a) {
    flushMoves(st);
    if (a.cd) u.cd[a.key] = a.cd;
    if (a.uses != null) u.uses[a.key] = (u.uses[a.key] || 0) - 1;
    checkEnd(st);
    return st.events;
  }

  /* =========================================================
     ターン進行
     ========================================================= */
  function currentActor(st) {
    while (st.turnIdx < st.order.length) {
      var u = findUid(st, st.order[st.turnIdx]);
      if (u && u.alive) return u;
      st.turnIdx++;
    }
    return null;
  }

  function nextTurn(st) {
    var u = findUid(st, st.order[st.turnIdx]);
    if (u && u.flags.extraTurn) { u.flags.extraTurn = false; return currentActor(st); }
    st.turnIdx++;
    return currentActor(st);
  }

  function endRound(st) {
    st.events = [];
    var evs = st.events;
    // 継続効果
    allUnits(st).forEach(function (u) {
      if (!u.alive) return;
      // 呪詛
      var curse = statusVal(u, 'curse');
      if (curse > 0) {
        push(st, { type: 'passive', uid: u.uid, name: '呪詛', text: '継続ダメージ ' + curse, kind: 'bad' });
        dealDamage(st, null, u, curse, 'magic');
        logMsg(st, u.def.name + ' は呪詛で' + curse + 'ダメージ', 'bad');
      }
      var burn = statusVal(u, 'burn');
      if (burn > 0 && u.alive) {
        push(st, { type: 'passive', uid: u.uid, name: '燃焼', text: '継続ダメージ ' + burn, kind: 'bad' });
        dealDamage(st, null, u, burn, 'magic');
        logMsg(st, u.def.name + ' は炎に焼かれて' + burn + 'ダメージ', 'bad');
      }
      // 再生
      u.def.passives.forEach(function (pk) {
        var p = PASSIVES[pk];
        if (p && p.roundEndHeal && u.hp < u.maxHp) {
          push(st, { type: 'passive', uid: u.uid, name: p.name, text: 'ラウンド終了時 HP回復', kind: 'good' });
          var h = healUnit(st, u, u, p.roundEndHeal, true);
          if (h > 0) logMsg(st, u.def.name + ' の【' + p.name + '】でHP+' + h, 'good');
        }
        if (p && p.selfRepair && u.hp < u.maxHp) {
          push(st, { type: 'passive', uid: u.uid, name: p.name, text: 'ラウンド終了時 自己修復', kind: 'good' });
          var r = Math.min(p.selfRepair, u.maxHp - u.hp);
          u.hp += r; u.stats.healed = (u.stats.healed || 0) + r;
          push(st, { type: 'heal', uid: u.uid, amount: r, hp: u.hp });
          logMsg(st, u.def.name + ' の【' + p.name + '】でHP+' + r, 'good');
        }
        if (p && p.allyRoundEndHeal) {
          var wounded = aliveUnits(st, u.side).filter(function (v) { return v.hp < v.maxHp && !hasP(v, 'nonliving'); });
          if (wounded.length) {
            push(st, { type: 'passive', uid: u.uid, name: p.name, text: '味方全体を回復', kind: 'good' });
            var tot = 0;
            aliveUnits(st, u.side).forEach(function (v) { tot += healUnit(st, u, v, p.allyRoundEndHeal, true); });
            if (tot > 0) logMsg(st, u.def.name + ' の【' + p.name + '】で味方が計' + tot + '回復', 'good');
          }
        }
      });
    });
    // 継続ダメージで倒れた分の前進を、ここでまとめて流す
    flushMoves(st);
    // ステータス経過
    allUnits(st).forEach(function (u) {
      u.statuses = u.statuses.filter(function (s) { s.rounds--; return s.rounds > 0; });
      u.flags.triumphUsed = false;
    });
    // CD経過（叡智で追加短縮）
    [0, 1].forEach(function (side) {
      var extra = aliveUnits(st, side).some(function (v) { return hasP(v, 'insight'); }) ? 1 : 0;
      st.players[side].units.forEach(function (u) {
        for (var k in u.cd) u.cd[k] = Math.max(0, u.cd[k] - 1 - extra);
      });
    });

    if (!st.roundDamage) st.quietRounds++; else st.quietRounds = 0;
    st.roundDamage = 0;

    checkEnd(st);
    if (st.phase === 'ended') return st.events;

    if (st.round >= MAX_ROUNDS) { judge(st, 'ラウンド上限'); return st.events; }
    if (st.quietRounds >= 2) { judge(st, '両者行動不能'); return st.events; }

    st.round++;
    // 復活処理
    allUnits(st).forEach(function (u) {
      if (u.flags.reviveQueued && !u.flags.revived) {
        u.flags.reviveQueued = false; u.flags.revived = true;
        push(st, { type: 'passive', uid: u.uid, name: hasP(u, 'rebirth') ? '不死鳥' : '不死の理', text: 'HP半分で復活', kind: 'good' });
        u.alive = true; u.hp = Math.max(1, Math.floor(u.maxHp / 2));
        u.statuses = [];
        push(st, { type: 'revive', uid: u.uid, hp: u.hp });
        logMsg(st, '✦ ' + u.def.name + ' が灰の中から蘇った！', 'good');
        if (hasP(u, 'rebirth')) {
          aliveUnits(st, u.side).forEach(function (v) { healUnit(st, u, v, 3); });
          logMsg(st, '不死鳥の炎が味方全体を癒した', 'good');
        }
      }
    });
    buildOrder(st);
    push(st, { type: 'roundStart', round: st.round });
    return st.events;
  }

  /* =========================================================
     勝敗判定
     ========================================================= */
  function checkEnd(st) {
    if (st.phase === 'ended') return;
    var a = aliveUnits(st, 0).length, b = aliveUnits(st, 1).length;
    var aRev = st.players[0].units.some(function (u) { return u.flags.reviveQueued; });
    var bRev = st.players[1].units.some(function (u) { return u.flags.reviveQueued; });
    if (a === 0 && !aRev && b === 0 && !bRev) { judge(st, '相打ち'); return; }
    if (a === 0 && !aRev) { finish(st, 1, 'KO', st.players[1].name + ' が敵を全滅させた！'); return; }
    if (b === 0 && !bRev) { finish(st, 0, 'KO', st.players[0].name + ' が敵を全滅させた！'); return; }
  }

  function tally(st, side) {
    var p = st.players[side];
    return {
      alive: aliveUnits(st, side).length,
      hpLeft: aliveUnits(st, side).reduce(function (s, u) { return s + u.hp; }, 0),
      dmg: p.stats.dmg, heal: p.stats.heal, kills: p.stats.kills, cost: p.cost
    };
  }

  function judge(st, reason) {
    var A = tally(st, 0), B = tally(st, 1);
    var steps = [
      { label: '生存キャラ数',   a: A.alive,  b: B.alive },
      { label: '残りHP合計',     a: A.hpLeft, b: B.hpLeft },
      { label: '与えたダメージ', a: A.dmg,    b: B.dmg },
      { label: '編成コスト（少ない方が勝ち）', a: -A.cost, b: -B.cost }
    ];
    var winner = null, decidedBy = null;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].a !== steps[i].b) { winner = steps[i].a > steps[i].b ? 0 : 1; decidedBy = steps[i].label; break; }
    }
    finish(st, winner, '判定', reason + 'のため判定に持ち込まれた', steps, decidedBy);
  }

  function finish(st, winner, how, msg, steps, decidedBy) {
    st.phase = 'ended';
    st.winner = winner;
    st.result = {
      winner: winner, how: how, message: msg,
      steps: steps || null, decidedBy: decidedBy || null,
      round: st.round,
      teams: [tally(st, 0), tally(st, 1)]
    };
    push(st, { type: 'end' });
    logMsg(st, '=== 決着 === ' + msg, 'end');
  }

  /* =========================================================
     評価関数（AI・表示用）
     ========================================================= */
  function threat(u, st) {
    var v = getAtk(u, st) * 2 + getSpd(u, st);
    var r = u.def.role;
    if (r === 'support') v += 10;
    if (r === 'caster') v += 8;
    if (hasP(u, 'warsong') || hasP(u, 'blessing') || hasP(u, 'bulwark')) v += 6;
    return v;
  }

  // 1000戦×30種の強制編成シミュレーションで実測した採用時勝率(%)＝AIの編成評価値
  /* =========================================================
     イメージ枠（まだ遊べない・図鑑に姿だけ出るカード）
     ========================================================= */
  var TEASERS = [
    { id:'paladinking', name:'聖騎士王', en:'Paladin King', line:'人', tier:3, base:'paladin',
      art:{ body:'human', head:'crown', wep:'greatsword', deco:'rays' }, elem:'holy',
      tech:'栄光の宣誓', flavor:'玉座を捨て、自ら最前線に立った王。' },
    { id:'grandsage', name:'大賢者', en:'Grand Sage', line:'人', tier:3, base:'archmage',
      art:{ body:'robe', head:'crown', wep:'orb', deco:'runes' }, elem:'arcane',
      tech:'終焉の一節', flavor:'万象の理を読み切った者。もう詠唱を必要としない。' },
    { id:'saint', name:'聖者', en:'Saint', line:'人', tier:3, base:'highpriest',
      art:{ body:'robe', head:'circlet', wep:'staff', deco:'rays' }, elem:'holy',
      tech:'万人の赦し', flavor:'死者でさえ、その祈りの前では順番を待つ。' },
    { id:'phantom', name:'幻弓士', en:'Phantom Archer', line:'人', tier:2, base:'archer', up:'divinearcher',
      art:{ body:'human', head:'hood', wep:'bow', deco:'wings' }, elem:'wind',
      tech:'三連矢', flavor:'放たれた矢が三本に見えるのは、目の錯覚ではない。' },
    { id:'divinearcher', name:'神弓士', en:'Divine Archer', line:'人', tier:3, base:'phantom',
      art:{ body:'human', head:'winghelm', wep:'bow', deco:'rays' }, elem:'holy',
      tech:'天穿ち', flavor:'その矢は、放たれた瞬間にはもう当たっている。' },
    { id:'royalguard', name:'王宮護衛', en:'Royal Guard', line:'人', tier:2, base:'shieldguard', up:'kingshield',
      art:{ body:'bulk', head:'greathelm', wep:'shield', deco:'runes' }, elem:'steel',
      tech:'鉄壁の陣', flavor:'一歩も退かぬことだけを、生涯かけて訓練する。' },
    { id:'kingshield', name:'王の盾', en:"King's Shield", line:'人', tier:3, base:'royalguard',
      art:{ body:'bulk', head:'crown', wep:'shield', deco:'rays' }, elem:'steel',
      tech:'不落', flavor:'この盾が退いたという記録は、まだ無い。' },
    { id:'ancient', name:'古代兵', en:'Ancient Guardian', line:'物', tier:2, base:'golem', up:'colossus',
      art:{ body:'bulk', head:'greathelm', wep:'mace', deco:'runes' }, elem:'earth',
      tech:'古代の砲', flavor:'誰の命令かも忘れ、それでもなお門を守り続けている。' },
    { id:'colossus', name:'古代巨神', en:'Ancient Colossus', line:'物', tier:3, base:'ancient',
      art:{ body:'bulk', head:'mask', wep:'mace', deco:'runes' }, elem:'steel',
      tech:'創世の一撃', flavor:'動き出すのに千年、倒れるのにもう千年。' },
    { id:'elderdragon', name:'古竜', en:'Elder Dragon', line:'竜', tier:2, base:'dragon', up:'dragonlord',
      art:{ body:'drake', head:'dragon', wep:'dwing', deco:'embers' }, elem:'fire',
      tech:'千年の吐息', flavor:'若い竜たちが頭を垂れる、最後の生き証人。' },
    { id:'dragonlord', name:'竜王', en:'Dragon Lord', line:'竜', tier:3, base:'elderdragon',
      art:{ body:'drake', head:'dragon', wep:'dwing', deco:'rays' }, elem:'holy',
      tech:'天蓋崩し', flavor:'空を統べる者。地上に降りたことは一度もない。' },
    { id:'necromancer', name:'死霊術師', en:'Necromancer', line:'邪', tier:2, base:'shaman', up:'lich',
      art:{ body:'robe', head:'hood', wep:'scythe', deco:'mist' }, elem:'shadow',
      tech:'亡者の手', flavor:'倒れた者が増えるほど、その力は膨れ上がる。' },
    { id:'lich', name:'リッチ', en:'Lich', line:'邪', tier:3, base:'necromancer',
      art:{ body:'robe', head:'skull', wep:'scythe', deco:'runes' }, elem:'shadow',
      tech:'魂の徴収', flavor:'死を捨てた代償に、自分の名前を忘れた。' },
    { id:'phoenix', name:'フェニックス', en:'Phoenix', line:'神', tier:2, base:'salamander',
      art:{ body:'wisp', head:'flame', wep:'wings', deco:'embers' }, elem:'fire',
      tech:'業火の玉座', flavor:'灰になるたび、前より熱くなって還ってくる。' },
    { id:'jotunn', name:'ヨトゥン', en:'Jötunn', line:'神', tier:2, base:'yeti',
      art:{ body:'bulk', head:'horns', wep:'axe', deco:'flakes' }, elem:'ice',
      tech:'永久凍土', flavor:'霜の巨人。ひと息で季節が変わる。' },
    { id:'odin', name:'オーディン', en:'Odin', line:'神', tier:2, base:'valkyrie',
      art:{ body:'robe', head:'crown', wep:'spear', deco:'runes' }, elem:'holy',
      tech:'グングニル', flavor:'片目と引き換えに、すべての結末を見た。' }
  ];
  var TEASER_BY_ID = {};
  TEASERS.forEach(function (t) { TEASER_BY_ID[t.id] = t; });

  /* 構想中のライン（図鑑の末尾に1行ずつ並べるだけ） */
  var CONCEPTS = [
    { icon:'🌪️', line:'風', low:'シルフ / Sylph',        high:'アイオロス / Aeolus' },
    { icon:'🌊', line:'水', low:'ウンディーネ / Undine',   high:'リヴァイアサン / Leviathan' },
    { icon:'⚡', line:'雷', low:'インプンドゥル / Impundulu', high:'トール / Thor' },
    { icon:'🌳', line:'木', low:'ドライアド / Dryad',      high:'エント / Ent' }
  ];

  /* =========================================================
     カードプール（入門8 / スターター15 / エクステンション23）
     ========================================================= */
  var POOLS = {
    tutorial: {
      name: '入門', size: 8, hand: 8, costCap: Infinity, units: [6, 6],
      ids: ['rogue', 'knight', 'archer', 'spearman', 'shieldguard', 'mage', 'berserker', 'troll'],
      desc: '特殊能力なしの8枚。体力・攻撃力・射程・行動順だけで戦う'
    },
    starter: {
      name: 'スターター', size: 15, hand: 8,
      ids: ['knight','berserker','spearman','shieldguard','troll','werewolf',
            'archer','rogue','harpy','mage','dragon','priest','highpriest','bard','salamander'],
      desc: '基礎ルールを覚えるための15枚。Tier1と、クセの分かりやすい独立キャラだけ'
    },
    full: { name: 'エクステンション', size: 23, hand: 10, ids: null,
      desc: '上位互換・蘇生・処刑・精霊を加えた拡張パック（今後さらに増えます）' }
  };
  POOLS.starter.costCap = COST_CAP; POOLS.starter.units = [MIN_UNITS, MAX_UNITS];
  POOLS.full.costCap    = COST_CAP; POOLS.full.units    = [MIN_UNITS, MAX_UNITS];

  /* 入門モードだけの調整（役割の重複を消し、因果を数字で読めるようにする） */
  var TUTORIAL_TWEAK = {
    rogue:       { hp: 8,  hpT: 1, atk: 3, atkT: 2 },
    spearman:    { hp: 24, hpT: 6, atk: 8, atkT: 6 },           // 基準の前衛。硬さと火力の両立
    archer:      { hp: 14, hpT: 3, atk: 4, atkT: 3, spd: 4 },  // 盗賊と役割を分ける
    mage:        { power: { bolt: 4, nova: 2 } },               // 遠隔の火力を抑え、前衛の意味を残す
    shieldguard: { hp: 30, hpT: 7, atk: 5, atkT: 4 },           // 第2の壁として明確に硬く
    berserker:   { atk: 3, atkT: 2 },                           // 3体同時なので単発は控えめに                           // 壁でもちゃんと殴れる
    knight:      { backRatio: 0.5 }                             // 貫通の後方は「半分」
  };
  var _pristine = null;
  function snapshotDefs() {
    if (_pristine) return;
    _pristine = {};
    ROSTER.forEach(function (d) {
      _pristine[d.id] = {
        hp: d.hp, hpT: d.hpT, atk: d.atk, atkT: d.atkT, spd: d.spd,
        passives: d.passives.slice(),
        back: d.actions.map(function (a) { return a.backRatio; }),
        pow: d.actions.map(function (a) { return a.power; })
      };
    });
  }
  function applyPoolTweaks() {
    snapshotDefs();
    ROSTER.forEach(function (d) {                        // まず必ず素の値へ戻す
      var o = _pristine[d.id];
      d.hp = o.hp; d.hpT = o.hpT; d.atk = o.atk; d.atkT = o.atkT; d.spd = o.spd;
      d.passives = o.passives.slice();
      d.actions.forEach(function (a, i) { a.backRatio = o.back[i]; a.power = o.pow[i]; });
    });
    if (activePool !== 'tutorial') return;
    ROSTER.forEach(function (d) { d.passives = []; });   // 入門は特殊能力を一切持たない
    Object.keys(TUTORIAL_TWEAK).forEach(function (id) {
      var t = TUTORIAL_TWEAK[id], d = BY_ID[id];
      if (!d) return;
      if (t.hp != null)  { d.hp = t.hp; d.hpT = t.hpT; }
      if (t.atk != null) { d.atk = t.atk; d.atkT = t.atkT; }
      if (t.spd != null) d.spd = t.spd;
      if (t.backRatio != null) d.actions.forEach(function (a) { if (a.backRatio != null) a.backRatio = t.backRatio; });
      if (t.power) d.actions.forEach(function (a) { if (t.power[a.key] != null) a.power = t.power[a.key]; });
    });
  }
  var activePool = 'full';
  /* 候補カードの配り方
     shuffle … プールから9枚を無作為に選び、敵味方とも同じ9枚から選ぶ
     full    … プールのカード全部が候補になる                        */
  var dealMode = 'shuffle';
  var SHUFFLE_SIZE = 9;
  function setDealMode(m) { dealMode = (m === 'full') ? 'full' : 'shuffle'; }
  function getDealMode() { return dealMode; }
  function setPool(n) { activePool = POOLS[n] ? n : 'full'; applyPoolTweaks(); }
  function costCap()  { var P = POOLS[activePool]; return P && P.costCap != null ? P.costCap : COST_CAP; }
  function minUnits() { var P = POOLS[activePool]; return P && P.units ? P.units[0] : MIN_UNITS; }
  function maxUnits() { var P = POOLS[activePool]; return P && P.units ? P.units[1] : MAX_UNITS; }
  function getPool() { return activePool; }
  function poolIds() {
    return activePool === 'full' ? ROSTER.map(function (d) { return d.id; }) : POOLS[activePool].ids.slice();
  }
  function inPool(id) { return poolIds().indexOf(id) >= 0; }
  function handSize() {
    var pool = poolIds();
    if (activePool === 'tutorial') return pool.length;      // 入門は常に全8枚
    if (dealMode === 'full') return pool.length;
    return Math.min(SHUFFLE_SIZE, pool.length);
  }

  var RATING = {
    knight:50, berserker:50, spearman:50, shieldguard:50, ogre:50, troll:50,
    golem:50, werewolf:50, paladin:50, archer:50, rogue:50, assassin:50,
    harpy:50, valkyrie:50, mage:50, archmage:50, dragon:50, shaman:50,
    priest:50, highpriest:50, salamander:50, yeti:50, bard:50
  };
  // スターター15枚だけで戦ったときの実測勝率（AIの編成評価に使用）
  var RATING_STARTER = {
    knight:50, berserker:50, spearman:50, shieldguard:50, troll:50, werewolf:50,
    archer:50, rogue:50, harpy:50, mage:50, dragon:50, priest:50,
    highpriest:50, bard:50, salamander:50
  };
  var RATING_TUTORIAL = {
    rogue:50, knight:50, archer:50, spearman:50, shieldguard:50, mage:50, berserker:50, troll:50
  };
  function cardPower(d) {
    if (activePool === 'tutorial' && RATING_TUTORIAL[d.id] != null) return RATING_TUTORIAL[d.id];
    if (activePool === 'starter' && RATING_STARTER[d.id] != null) return RATING_STARTER[d.id];
    return RATING[d.id] || 50;
  }

  /* =========================================================
     手札配布
     ========================================================= */
  function deal(seed) {
    var rnd = mulberry32(seed == null ? Math.floor(Math.random() * 1e9) : seed);
    var pool = poolIds(), hs = handSize();
    // フルカード（および入門）＝プール全部が候補。敵味方まったく同じ条件
    if (pool.length <= hs) return { hands: [pool.slice(), pool.slice()], rnd: rnd, mirror: true, fixed: true };
    // シャッフル＝無作為に選んだ9枚を、敵味方が共有する
    for (var tries = 0; tries < 300; tries++) {
      var h = shuffle(pool, rnd).slice(0, hs);
      if (playable(h)) return { hands: [h, h.slice()], rnd: rnd, mirror: true };
    }
    return { hands: [pool.slice(0, hs), pool.slice(0, hs)], rnd: rnd, mirror: true };
  }
  function playable(hand) {
    var costs = hand.map(function (id) { return BY_ID[id].cost; }).sort(function (a, b) { return a - b; });
    var s = 0, n = Math.min(minUnits(), costs.length);
    for (var i = 0; i < n; i++) s += costs[i];
    return s <= costCap();
  }
  function redraw(own, other, rnd) {
    var pool = poolIds(), hs = handSize();
    var independent = pool.length < hs * 2;
    var avail = pool.filter(function (id) {
      return own.indexOf(id) < 0 && (independent || other.indexOf(id) < 0);
    });
    var t, h;
    if (avail.length >= hs) {
      for (t = 0; t < 200; t++) { h = shuffle(avail, rnd).slice(0, hs); if (playable(h)) return h; }
    }
    var base = pool.filter(function (id) { return independent || other.indexOf(id) < 0; });
    for (t = 0; t < 200; t++) { h = shuffle(base, rnd).slice(0, hs); if (playable(h)) return h; }
    return own;
  }

  /* =========================================================
     公開API
     ========================================================= */
  return {
    ROSTER: ROSTER, BY_ID: BY_ID, PASSIVES: PASSIVES, RANGE_TEXT: RANGE_TEXT,
    TEASERS: TEASERS, TEASER_BY_ID: TEASER_BY_ID, CONCEPTS: CONCEPTS,
    HP_TIER: HP_TIER, ATK_TIER: ATK_TIER,
    MAX_ROUNDS: MAX_ROUNDS, COST_CAP: COST_CAP, HAND_SIZE: HAND_SIZE,
    MAX_UNITS: MAX_UNITS, MIN_UNITS: MIN_UNITS,
    createState: createState, buildOrder: buildOrder, getOptions: getOptions,
    performAction: performAction, currentActor: currentActor, nextTurn: nextTurn,
    endRound: endRound, aliveUnits: aliveUnits, allUnits: allUnits, unitAt: unitAt,
    findUid: findUid, getAtk: getAtk, getSpd: getSpd, hasP: hasP, threat: threat,
    cardPower: cardPower, RATING: RATING, meleeChain: meleeChain, meleeReady: meleeReady,
    squareCells: squareCells, tally: tally, deal: deal, redraw: redraw,
    setAdvanceMode: setAdvanceMode, getAdvanceMode: getAdvanceMode,
    playable: playable, mulberry32: mulberry32, shuffle: shuffle, statusVal: statusVal,
    adjacentAllies: adjacentAllies, coverOf: coverOf,
    POOLS: POOLS, setPool: setPool, getPool: getPool, poolIds: poolIds, inPool: inPool, handSize: handSize,
    setDealMode: setDealMode, getDealMode: getDealMode, SHUFFLE_SIZE: SHUFFLE_SIZE,
    costCap: costCap, minUnits: minUnits, maxUnits: maxUnits,
    previewDamage: previewDamage, auraFor: auraFor, unitAtCell: unitAt
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CB;
