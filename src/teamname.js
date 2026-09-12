/* =========================================================
   チーム名の自動生成（v116）

   考え方：
   ・名前は「編成の中身」から決める。陣営（青／赤）では決めない。
     聖騎士だらけの編成なら、自軍でも敵軍でも「黎明の誓約」を名乗る。
   ・同じ6体なら、置いた順番に関係なく必ず同じ候補が同じ順番で出る（決定的）。
     1体入れ替えれば変わり、戻せば元に戻る。
   ・候補は適合度の高い順に5つ持つ。⟳ を押すと 1→2→3→4→5→1 と巡回する。
   ・修飾語（属性・役割・段から）＋ 核（陣形から）の2語で作る。
     同じ修飾語・同じ核が3回以上出ないように間引くので、5つは見て違いが分かる。
   ========================================================= */
var TEAMNAME = (function () {
  'use strict';

  /* ---------- 編成の性格を数える ---------- */
  function profile(team, BY_ID) {
    var p = { n: 0, elem: {}, role: {}, line: {}, tier: {}, front: 0, back: 0,
              cost: 0, spd: 0, hp: 0 };
    (team || []).forEach(function (c) {
      var d = BY_ID[c.id]; if (!d) return;
      p.n++;
      p.elem[d.elem] = (p.elem[d.elem] || 0) + 1;
      p.role[d.role] = (p.role[d.role] || 0) + 1;
      p.line[d.line] = (p.line[d.line] || 0) + 1;
      p.tier[d.tier || 1] = (p.tier[d.tier || 1] || 0) + 1;
      if (c.row === 0) p.front++; else p.back++;
      p.cost += d.cost || 0;
      p.spd += d.spd || 0;
      p.hp += d.hp || 0;
    });
    p.avgCost = p.n ? p.cost / p.n : 0;
    p.avgSpd = p.n ? p.spd / p.n : 0;
    return p;
  }
  function e(p, k) { return p.elem[k] || 0; }
  function r(p, k) { return p.role[k] || 0; }
  function l(p, k) { return p.line[k] || 0; }
  function t(p, k) { return p.tier[k] || 0; }

  /* ---------- 修飾語（前半）----------
     f は適合度。0 でも候補には残る（どれも当てはまらない編成のため） */
  var PRE = [
    /* 属性・系統から。強く尖った編成ほど高い点になる */
    { w: '黎明', f: function (p) { return e(p, 'holy') * 3.2 + l(p, '神') * 2; } },
    { w: '白銀', f: function (p) { return e(p, 'holy') * 2 + e(p, 'steel') * 2.2; } },
    { w: '聖灰', f: function (p) { return e(p, 'holy') * 2 + r(p, 'support') * 2.4; } },
    { w: '灰燼', f: function (p) { return e(p, 'shadow') * 3.2 + l(p, '邪') * 2.4; } },
    { w: '黒衣', f: function (p) { return e(p, 'shadow') * 2.6 + e(p, 'blood') * 2; } },
    { w: '終焉', f: function (p) { return l(p, '邪') * 3.4 + e(p, 'shadow') * 1.2; } },
    { w: '焦土', f: function (p) { return e(p, 'fire') * 3.2; } },
    { w: '烈火', f: function (p) { return e(p, 'fire') * 2.4 + r(p, 'melee') * 0.8; } },
    { w: '凍土', f: function (p) { return e(p, 'ice') * 3.4; } },
    { w: '氷牙', f: function (p) { return e(p, 'ice') * 2.4 + l(p, '獣') * 1.6; } },
    { w: '鋼鉄', f: function (p) { return e(p, 'steel') * 2.2 + r(p, 'tank') * 2.6; } },
    { w: '不動', f: function (p) { return r(p, 'tank') * 3.4 + (p.front >= 4 ? 2 : 0); } },
    { w: '疾風', f: function (p) { return e(p, 'wind') * 2.4 + (p.avgSpd >= 5 ? 3 : 0); } },
    { w: '瞬影', f: function (p) { return e(p, 'shadow') * 1.8 + (p.avgSpd >= 5.5 ? 4 : 0); } },
    { w: '盤石', f: function (p) { return e(p, 'earth') * 3.2 + r(p, 'tank') * 1.2; } },
    { w: '深淵', f: function (p) { return e(p, 'arcane') * 3.4 + r(p, 'caster') * 1.2; } },
    { w: '秘文', f: function (p) { return r(p, 'caster') * 2.4 + e(p, 'arcane') * 2; } },
    { w: '竜血', f: function (p) { return l(p, '竜') * 4; } },
    { w: '天啓', f: function (p) { return l(p, '神') * 3.6 + e(p, 'holy') * 1.2; } },
    { w: '野牙', f: function (p) { return l(p, '獣') * 3 + e(p, 'blood') * 1.6; } },
    { w: '妖精', f: function (p) { return l(p, '精') * 3.2; } },
    { w: '王旗', f: function (p) { return t(p, 3) * 3 + t(p, 2) * 1.4 + (p.avgCost >= 5 ? 2.5 : 0); } },
    { w: '黄金', f: function (p) { return t(p, 3) * 2.4 + (p.avgCost >= 4.6 ? 2.5 : 0); } },
    /* どれにも尖っていない編成のための、中立でそれなりに格好のつく語 */
    { w: '暁',   f: function () { return 3.6; } },
    { w: '蒼天', f: function () { return 3.5; } },
    { w: '朔月', f: function () { return 3.4; } },
    { w: '久遠', f: function () { return 3.3; } },
    { w: '無銘', f: function (p) { return p.n && t(p, 1) === p.n ? 3.8 : 0; } },
    { w: '流浪', f: function (p) { return p.n <= 3 ? 4.2 : 0; } }
  ];

  /* ---------- 核（後半）----------
     偏った陣形ほど専用の語が勝ち、まっすぐな編成では中立の語が勝つ */
  var CORE = [
    { w: '誓約', f: function (p) { return 4.2 + e(p, 'holy') * 1.4; } },
    { w: '盟約', f: function (p) { return 4.1 + (p.front === p.back ? 1.4 : 0); } },
    { w: '旅団', f: function () { return 4.3; } },
    { w: '軍団', f: function (p) { return p.front > p.back ? p.front * 1.6 : p.front * 0.5; } },
    { w: '陣',   f: function (p) { return (p.front >= 4 ? p.front * 1.4 : 0) + r(p, 'tank') * 1.4; } },
    { w: '結社', f: function (p) { return p.back > p.front ? p.back * 1.8 : p.back * 0.4; } },
    { w: '詠唱団', f: function (p) { return r(p, 'caster') >= 2 ? r(p, 'caster') * 2.3 : 0; } },
    { w: '狩人隊', f: function (p) { return r(p, 'ranged') >= 3 ? r(p, 'ranged') * 2 : 0; } },
    { w: '遊撃隊', f: function (p) { return p.n <= 4 ? 8 - p.n * 0.5 : 0; } },
    { w: '一党', f: function (p) { return p.n <= 3 ? 7 - p.n * 0.5 : 0; } },
    { w: '牙',   f: function (p) { return l(p, '獣') * 2.2 + e(p, 'blood') * 2; } },
    { w: '葬列', f: function (p) { return l(p, '邪') * 2.6 + e(p, 'shadow') * 1.8; } },
    { w: '聖団', f: function (p) { return e(p, 'holy') * 2.2 + r(p, 'support') * 1.6; } }
  ];

  /* 同じ編成なら必ず同じ順番になるよう、IDを並べ替えてから種を作る */
  function seedOf(team) {
    var ids = (team || []).map(function (c) { return c.id; }).sort().join(',');
    var h = 2166136261;
    for (var i = 0; i < ids.length; i++) { h ^= ids.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function jitter(seed, word) {
    var h = seed;
    for (var i = 0; i < word.length; i++) { h ^= word.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return (h % 100) / 300;   /* 0〜0.33。同点のときの並び順だけを決める */
  }

  /* 候補を適合度の高い順に n 個。修飾語・核が3回以上は出ないよう間引く */
  function candidates(team, BY_ID, n) {
    n = n || 5;
    if (!team || !team.length) return [];
    var p = profile(team, BY_ID), seed = seedOf(team);
    function rank(list) {
      return list.map(function (o) {
        return { w: o.w, s: o.f(p) + jitter(seed, o.w) };
      }).sort(function (a, b) { return b.s - a.s; });
    }
    var pre = rank(PRE).slice(0, 6), core = rank(CORE).slice(0, 6);
    var combo = [];
    pre.forEach(function (a) {
      core.forEach(function (b) {
        combo.push({ pre: a.w, core: b.w, s: a.s * 1.15 + b.s });
      });
    });
    combo.sort(function (x, y) { return y.s - x.s; });
    var out = [], usedPre = {}, usedCore = {};
    for (var i = 0; i < combo.length && out.length < n; i++) {
      var c = combo[i];
      if ((usedPre[c.pre] || 0) >= 2 || (usedCore[c.core] || 0) >= 2) continue;
      usedPre[c.pre] = (usedPre[c.pre] || 0) + 1;
      usedCore[c.core] = (usedCore[c.core] || 0) + 1;
      out.push(c.pre + 'の' + c.core);
    }
    /* 間引きすぎて足りなくなったら、制限なしで埋める */
    for (var j = 0; j < combo.length && out.length < n; j++) {
      var nm = combo[j].pre + 'の' + combo[j].core;
      if (out.indexOf(nm) < 0) out.push(nm);
    }
    return out;
  }

  /* idx 番目の候補。avoid と同じ名前は黙って飛ばす。
     ミラー編成（候補がそっくり同じ）のときは、核ではなく修飾語をずらす。
     「黎明の誓約」と「鋼鉄の誓約」のように、末尾がそろっている方が対決らしく見えるため */
  function pick(team, BY_ID, idx, avoid) {
    var list = candidates(team, BY_ID, 5);
    if (!list.length) return '';
    var use = list;
    if (avoid && list.indexOf(avoid) >= 0) {
      var ap = avoid.split('の')[0];
      var diff = list.filter(function (x) { return x.split('の')[0] !== ap; });
      use = diff.length ? diff : list.filter(function (x) { return x !== avoid; });
      if (!use.length) use = list;
    } else if (avoid) {
      use = list.filter(function (x) { return x !== avoid; });
      if (!use.length) use = list;
    }
    var i = ((idx || 0) % use.length + use.length) % use.length;
    return use[i];
  }

  return { candidates: candidates, pick: pick, profile: profile, MAXLEN: 9 };
})();
