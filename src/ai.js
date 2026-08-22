/* =========================================================
   ARCANA CLASH — CPU思考ルーチン
   ========================================================= */
var CBAI = (function () {
  'use strict';
  var E = (typeof CB !== 'undefined') ? CB : require('./engine.js');

  /* ---------- 編成AI ---------- */
  function buildTeam(hand, difficulty, rnd, forceId) {
    rnd = rnd || Math.random;
    difficulty = difficulty || 'normal';
    var cards = hand.map(function (id) { return E.BY_ID[id]; });

    // 実測レーティングを温度付きソフトマックスで重み付け抽選し、
    // 強い順を基本にしつつ編成に多様性を持たせる
    var temp = difficulty === 'easy' ? 9 : difficulty === 'normal' ? 4 : 2;
    var pool = cards.map(function (d) { return { d: d, eff: E.cardPower(d) - d.cost * 0.25 }; });
    var top = Math.max.apply(null, pool.map(function (x) { return x.eff; }));
    var scored = [];
    while (pool.length) {
      var ws = pool.map(function (x) { return Math.exp((x.eff - top) / temp); });
      var sum = ws.reduce(function (a, b) { return a + b; }, 0);
      var r = rnd() * sum, k = 0;
      while (k < ws.length - 1 && r > ws[k]) { r -= ws[k]; k++; }
      scored.push(pool[k]); pool.splice(k, 1);
    }

    var picked = [], cost = 0;
    function tryAdd(d) {
      if (picked.length >= E.maxUnits()) return false;
      if (cost + d.cost > E.costCap()) return false;
      if (picked.indexOf(d) >= 0) return false;
      picked.push(d); cost += d.cost; return true;
    }
    if (forceId && E.BY_ID[forceId] && hand.indexOf(forceId) >= 0) tryAdd(E.BY_ID[forceId]);
    // 役割保証：回復役1体・前衛2体を優先確保（normal以上）
    if (difficulty !== 'easy') {
      var healer = scored.filter(function (x) { return x.d.actions.some(function (a) { return a.kind === 'heal'; }); })[0];
      if (healer) tryAdd(healer.d);
      var fronts = scored.filter(function (x) { return x.d.role === 'melee' || x.d.role === 'tank'; });
      for (var i = 0; i < fronts.length && countFront(picked) < 2; i++) tryAdd(fronts[i].d);
    }
    scored.forEach(function (x) { tryAdd(x.d); });
    // 安い順で6体に近づける
    var rest = cards.filter(function (d) { return picked.indexOf(d) < 0; })
      .sort(function (a, b) { return a.cost - b.cost; });
    rest.forEach(function (d) { tryAdd(d); });

    return place(picked);
  }
  function countFront(list) {
    return list.filter(function (d) { return d.role === 'melee' || d.role === 'tank'; }).length;
  }

  function place(picked) {
    var front = [], back = [];
    var sorted = picked.slice().sort(function (a, b) { return frontScore(b) - frontScore(a); });
    sorted.forEach(function (d) {
      if (front.length < 3 && frontScore(d) > 0) front.push(d); else back.push(d);
    });
    while (front.length < 3 && back.length > 3) front.push(back.pop());
    while (back.length > 3) front.push(back.pop());
    // 前衛は硬い順に中央→左→右
    front.sort(function (a, b) { return b.hpT - a.hpT; });
    var fOrder = [1, 0, 2], bOrder = [1, 0, 2];
    var team = [];
    front.slice(0, 3).forEach(function (d, i) { team.push({ id: d.id, row: 0, col: fOrder[i] }); });
    back.slice(0, 3).forEach(function (d, i) { team.push({ id: d.id, row: 1, col: bOrder[i] }); });
    return team;
  }
  function frontScore(d) {
    if (d.id === 'spearman') return -1;               // 長柄は後衛が強い
    if (d.role === 'tank') return 100 + d.hpT;
    if (d.role === 'melee') return 50 + d.hpT;
    return -10 + d.hpT;
  }

  /* ---------- 戦闘AI ---------- */
  function actionBase(st, u, a) {
    var atk = E.getAtk(u, st);
    var base = (a.power != null) ? a.power : atk;
    if (a.dtype === 'magic' && a.power != null) base = a.power + (atk - u.def.atk);
    if (a.dtype === 'magic' && E.hasP(u, 'resonance')) {
      var others = E.aliveUnits(st, u.side).filter(function (v) {
        return v.uid !== u.uid && (v.def.role === 'caster' || v.def.role === 'support');
      });
      if (others.length) base += 1;
    }
    if (E.hasP(u, 'ambush') && st.round === 1) base += 2;
    return base;
  }

  function victimsOf(st, u, a, target) {
    var foe = 1 - u.side, out = [];
    if (a.range === 'melee' || a.range === 'pierce') {
      var pt = E.meleeChain(st, u);
      if (!pt) return out;
      out.push({ u: pt, mul: 1 });
      if (a.range === 'pierce' && pt.row === 0) {
        var b = E.unitAtCell(st, foe, 1, pt.col);
        if (b) out.push({ u: b, mul: a.backRatio == null ? 0.5 : a.backRatio });
      }
    } else if (a.range === 'front_row') {
      var r0 = st.players[foe].units.filter(function (v) { return v.alive && v.row === 0; });
      if (!r0.length) r0 = E.aliveUnits(st, foe);
      r0.forEach(function (v) { out.push({ u: v, mul: 1 }); });
    } else if (a.range === 'any1') {
      var t = E.findUid(st, target.uid); if (t) out.push({ u: t, mul: 1 });
    } else if (a.range === 'weakest') {
      var c = E.aliveUnits(st, foe).slice().sort(function (x, y) { return x.hp - y.hp; })[0];
      if (c) out.push({ u: c, mul: 1 });
    } else if (a.range === 'square') {
      E.squareCells(st, foe, target.col).forEach(function (v) { out.push({ u: v, mul: 1 }); });
    } else if (a.range === 'row') {
      st.players[foe].units.filter(function (v) { return v.alive && v.row === target.row; })
        .forEach(function (v) { out.push({ u: v, mul: 1 }); });
    } else if (a.range === 'all') {
      E.aliveUnits(st, foe).forEach(function (v) { out.push({ u: v, mul: 1 }); });
    } else if (a.range === 'random') {
      // ランダムn回：全員に「n/人数」回ぶん当たると見積もる
      var alive = E.aliveUnits(st, foe);
      var share = alive.length ? (a.hits || 1) / alive.length : 0;
      alive.forEach(function (v) { out.push({ u: v, mul: share }); });
      return out;
    }
    if (a.hits && a.range !== 'random') {
      var base = out.slice();
      for (var h = 1; h < a.hits; h++) base.forEach(function (v) { out.push({ u: v.u, mul: v.mul }); });
    }
    return out;
  }

  function scoreDamage(st, u, a, target) {
    var base = actionBase(st, u, a);
    var vs = victimsOf(st, u, a, target);
    var score = 0;
    vs.forEach(function (v) {
      var amt = base * v.mul;
      if (E.hasP(u, 'snipe') && v.u.row === 1) amt += 3;
      if (E.hasP(u, 'decapitate') && v.u.hp <= v.u.maxHp * 0.35) {
        score += v.u.hp * 1.0 + E.threat(v.u, st) * 2.2; return;
      }
      var d = E.previewDamage(st, u, v.u, amt, a.dtype || 'phys');
      var eff = Math.min(d, v.u.hp);
      score += eff * (1 + E.threat(v.u, st) / 60);
      if (d >= v.u.hp) score += E.threat(v.u, st) * 1.6 + 8;
      if (a.slow) score += 2;
      if (a.weaken) score += 3;
      if (a.curse) score += 3;
      if (a.burn) score += a.burn * 2.4;
      if (a.drain) score += eff * 0.3;
    });
    if (E.hasP(u, 'bloodsuck')) score += Math.min(u.maxHp - u.hp, base / 2) * 0.4;
    return score;
  }

  function chooseAction(st, u, difficulty) {
    var opts = E.getOptions(st, u);
    var best = null;
    opts.forEach(function (o) {
      var a = o.action;
      var candidates = o.targets.length ? o.targets : [o.auto || { type: 'auto' }];
      candidates.forEach(function (t) {
        var s = 0;
        if (a.kind === 'dmg') s = scoreDamage(st, u, a, t);
        else if (a.kind === 'heal') {
          if (a.range === 'ally1') {
            var tg = E.findUid(st, t.uid);
            var miss = tg.maxHp - tg.hp;
            var real = Math.min(miss, a.value + E.auraFor(u, st).healBonus);
            s = real * (1.15 + E.threat(tg, st) / 70);
            if (tg.hp <= tg.maxHp * 0.35) s += 10;
            if (real < 3) s = 1;
          } else {
            var tot = 0, low = 0;
            E.aliveUnits(st, u.side).forEach(function (v) {
              if (E.hasP(v, 'nonliving')) return;
              var r = Math.min(v.maxHp - v.hp, a.value + E.auraFor(u, st).healBonus);
              tot += r; if (v.hp <= v.maxHp * 0.4) low++;
            });
            s = tot * 1.25 + low * 6;
            if (tot < 6) s = 2;
          }
        } else if (a.kind === 'ward') {
          var casters = E.aliveUnits(st, 1 - u.side).filter(function (v) {
            return v.def.actions.some(function (x) { return x.dtype === 'magic'; });
          }).length;
          s = casters * E.aliveUnits(st, u.side).length * 1.6;
        } else if (a.kind === 'revive') {
          var dead = E.findUid(st, t.uid);
          s = (E.threat(dead, st) - E.threat(u, st)) * 1.0 + dead.maxHp * 0.5;
          if (u.hp <= u.maxHp * 0.34) s += 12;
          if (st.round < 3) s -= 20;
        } else if (a.kind === 'buff') {
          // 全体強化：攻撃役が多いほど価値が高い。かけ直しはしない
          var mates = E.aliveUnits(st, u.side);
          var hitters = mates.filter(function (v) { return v.def.actions.some(function (x) { return x.kind === 'dmg'; }); });
          s = hitters.length * (a.value || 1) * 4.5;
          if (E.statusVal(u, a.stat === 'spd' ? 'haste' : 'might') > 0) s = 0;
          if (st.round === 1) s += 6;
        } else if (a.kind === 'cover') {
          // 庇護：庇う相手が強く・自分が硬いほど価値が高い
          var pal = E.findUid(st, t.uid);
          if (!pal) { s = 0; }
          else {
            var tough = E.previewDamage(st, null, u, 10, 'phys');      // 自分が10を何点に減らせるか
            var raw = E.previewDamage(st, null, pal, 10, 'phys');
            s = (raw - tough) * 1.6 + E.threat(pal, st) * 0.5 + (pal.hp <= pal.maxHp * 0.4 ? 12 : 0);
            if (u.hp <= u.maxHp * 0.3) s -= 14;                        // 自分が瀕死なら庇わない
            if (pal.flags && pal.flags.coverBy === u.uid) s -= 20;     // すでに庇っている
          }
        } else if (a.kind === 'guard') s = 1;

        if (difficulty === 'easy') s += (Math.random() - 0.5) * 30;
        else if (difficulty === 'normal') s += (Math.random() - 0.5) * 8;

        if (!best || s > best.score) best = { score: s, actionKey: a.key, target: t };
      });
    });
    return best || { actionKey: opts[0].action.key, target: opts[0].auto || { type: 'auto' } };
  }

  return { buildTeam: buildTeam, chooseAction: chooseAction, place: place };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CBAI;
