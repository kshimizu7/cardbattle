/* ダンジョン生成（Phase 1）。
   仕様どおり「解錠の連鎖を先に決めて、そのあとで区画に部屋を配る」順で作る。

     ① 何本の関門を置くかを決め、キーイベントを選ぶ
     ② 区画 Z0 → Z1 → … → ZL を一本の背骨として並べる
     ③ 区画ごとに部屋を撒き、隣接する部屋どうしを通路でつなぐ
     ④ 区画のあいだは、必ず関門の通路ひとつだけで繋ぐ
     ⑤ ヒントと種（条件を満たせる出来事）を、その関門より手前の区画にだけ置く

   ⑤を守る限り、詰みは構造として起きない。最後に必ず検算する。         */

const VARI = require('../src/vari.js');
const { DUNGEONS } = require('./rpgdungeons.js');
const { KEYS } = require('./rpgkeys.js');
const { SHAPES, FEATURES } = require('./rpgrooms.js');

/* ---------- 種つき乱数（同じ種なら同じダンジョン） ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
function shuffle(rnd, a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- 部屋の名前 ---------- */
const NAME_BY_TAG = {
  nature: '{滴りの|骨の|苔むした|風の抜ける|狭まった|奥まった}{窪み|広間|岩室|裂け目|洞}',
  made:   '{朽ちた|崩れた|打ち捨てられた|低い|広い}{広間|作業場|詰所|坑口|貯蔵}',
  human:  '{住まいの|かまどの|寝床の|子どもの}{跡|間|名残}',
  holy:   '{祈りの|供物の|沈黙の|灯明の|封じの}{間|回廊|祭室|前室}',
  trap:   '{仕掛けの|軋む|傾いだ|抜けた床の}{間|廊|部屋}',
  loot:   '{隠しの|欲の|数えの|重ねの}{間|蔵|窪み}',
  dragon: '{鱗の|長き眠りの|翼の|誓いの}{間|回廊|祭室}'
};

/* ---------- 生成本体 ---------- */
function generate(opts) {
  opts = opts || {};
  const dun = DUNGEONS[opts.dungeon || 'beast'];
  const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2147483647);
  const rnd = mulberry32(seed);
  const nRooms = Math.max(6, Math.min(40, opts.rooms || 12));

  /* ── ① 関門の本数とキーイベント ── */
  const nGates = opts.gates != null ? opts.gates
    : nRooms <= 12 ? 1 : nRooms <= 20 ? 2 : nRooms <= 28 ? 3 : 4;

  const fits = k => k.tags.indexOf('*') >= 0 || k.tags.some(t => dun.tags.indexOf(t) >= 0);
  const pool = shuffle(rnd, Object.keys(KEYS).filter(id => fits(KEYS[id])));
  const chosen = [];
  const usedKind = {};
  for (const id of pool) {
    if (chosen.length >= nGates) break;
    if (usedKind[KEYS[id].kind]) continue;      /* 同じ型を重ねない */
    usedKind[KEYS[id].kind] = 1; chosen.push(KEYS[id]);
  }
  while (chosen.length < nGates) chosen.push(KEYS[pick(rnd, pool)]);
  /* 「一体も倒さずに」「無傷で」は、奥に置くと詰みに近くなる。必ず手前に寄せる */
  const early = { spare: 1, hurtless: 1 };
  chosen.sort((a, b) => (early[a.kind] ? 0 : 1) - (early[b.kind] ? 0 : 1));

  /* ── ② 区画に部屋数を割る ── */
  const nZones = nGates + 1;
  const share = new Array(nZones).fill(0);
  for (let i = 0; i < nRooms; i++) share[i % nZones]++;
  /* ヒントと種を置く余地を必ず残す。区画は最低3室 */
  for (let z = 0; z < nZones; z++) if (share[z] < 3) share[z] = 3;

  /* ── ③④ 格子の上に部屋を撒く ── */
  const G = 13;
  const cellOf = (x, y) => y * G + x;
  const occupied = {};
  const nodes = [], edges = [];
  let nid = 0;
  const newRoom = (x, y, zone) => {
    const r = { id: 'r' + (nid++), kind: 'room', zone, gx: x, gy: y, links: [], name: null, ev: null };
    occupied[cellOf(x, y)] = r; nodes.push(r); return r;
  };
  const neighbors = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .filter(([a, b]) => a >= 0 && b >= 0 && a < G && b < G);

  const cx = Math.floor(G / 2), cy = G - 2;
  const zoneRooms = [];
  let entry = newRoom(cx, cy, 0);
  entry.entrance = true;

  for (let z = 0; z < nZones; z++) {
    const list = [entry];
    let frontier = [entry];
    while (list.length < share[z] && frontier.length) {
      const from = pick(rnd, frontier);
      const free = neighbors(from.gx, from.gy).filter(([a, b]) => !occupied[cellOf(a, b)]);
      if (!free.length) { frontier = frontier.filter(f => f !== from); continue; }
      const [a, b] = pick(rnd, free);
      const r = newRoom(a, b, z);
      list.push(r); frontier.push(r);
    }
    zoneRooms.push(list);

    /* 区画の中で、隣り合う部屋を通路でつなぐ（行き止まりを減らす） */
    for (const r of list)
      for (const [a, b] of neighbors(r.gx, r.gy)) {
        const o = occupied[cellOf(a, b)];
        if (o && o.zone === z && o.id > r.id) edges.push({ a: r.id, b: o.id, gate: null });
      }

    /* 次の区画の入口を、この区画の部屋の隣の空きに置く */
    if (z < nZones - 1) {
      const cands = shuffle(rnd, list).map(r => {
        const free = neighbors(r.gx, r.gy).filter(([a, b]) => !occupied[cellOf(a, b)]);
        return free.length ? { from: r, at: pick(rnd, free) } : null;
      }).filter(Boolean);
      if (!cands.length) { share.length = z + 1; list[list.length - 1].goal = true; break; }
      const c = cands[0];
      const next = newRoom(c.at[0], c.at[1], z + 1);
      edges.push({ a: c.from.id, b: next.id, gate: 'g' + z });
      entry = next;
    } else {
      list[list.length - 1].goal = true;
    }
  }

  /* ── 通路を、部屋と部屋のあいだの節として立てる ── */
  const corridors = [];
  edges.forEach((e, i) => {
    const A = nodes.find(n => n.id === e.a), B = nodes.find(n => n.id === e.b);
    const c = {
      id: 'c' + i, kind: 'corridor', zone: Math.min(A.zone, B.zone),
      from: A.id, to: B.id, gate: e.gate, open: !e.gate,
      gx: (A.gx + B.gx) / 2, gy: (A.gy + B.gy) / 2, links: [A.id, B.id], name: null, ev: null
    };
    corridors.push(c); A.links.push(c.id); B.links.push(c.id);
  });
  const all = nodes.concat(corridors);
  const byId = {}; all.forEach(n => { byId[n.id] = n; });

  /* ── 関門の中身 ── */
  const gates = {};
  chosen.slice(0, Math.max(0, share.length - 1)).forEach((key, z) => {
    gates['g' + z] = { id: 'g' + z, key: key.id, cond: key.cond, look: key.look, state: 'shut', zone: z };
  });

  /* ── ⑤ ヒントと種を、関門より手前の区画にだけ置く ── */
  Object.keys(gates).forEach(gid => {
    const g = gates[gid], key = KEYS[g.key];
    const before = [];
    for (let z = 0; z <= g.zone; z++) (zoneRooms[z] || []).forEach(r => { if (!r.entrance && !r.ev) before.push(r); });
    const bag = shuffle(rnd, before);
    if (key.hint && bag.length) { const r = bag.pop(); r.ev = { t: 'hint', gate: gid, key: key.id }; }
    if (key.seed && bag.length) { const r = bag.pop(); r.ev = { t: 'seed', gate: gid, key: key.id }; }
    /* 「倒すと開く」型は、倒すべき相手そのものを手前の区画に置く */
    if (key.cond.t === 'slay' && bag.length) { const r = bag.pop(); r.ev = { t: 'foe', gate: gid, key: key.id }; }
  });

  /* ── 部屋の中身を決める。描写・選択肢・地図は全部ここから引く ── */

  /* 形と通り名（alias）。入った瞬間のキャプションになる */
  const usedAlias = {};
  nodes.forEach(r => {
    r.shape = rnd() < 0.14 ? 'round' : rnd() < 0.3 ? 'big' : rnd() < 0.5 ? 'long' : 'small';
    if (r.entrance) { r.shape = 'big'; r.alias = '入口の間'; return; }
    if (r.goal) { r.shape = 'round'; r.alias = '最奥の間'; return; }
    for (let t = 0; t < 10; t++) {
      const a = VARI.expand(SHAPES[r.shape].alias, {}, rnd);
      if (!usedAlias[a] || t === 9) { usedAlias[a] = 1; r.alias = a; return; }
    }
  });

  /* 真名。ヒント・種の置かれた部屋に優先して付け、出来事を解くと明かされる */
  const tmpl = dun.tags.map(t => NAME_BY_TAG[t]).filter(Boolean);
  const usedName = {};
  const giveName = r => {
    if (!tmpl.length || r.name) return;
    for (let t = 0; t < 12; t++) {
      const nm = VARI.expand(pick(rnd, tmpl), {}, rnd);
      if (!usedName[nm]) { usedName[nm] = 1; r.name = nm; return; }
    }
  };
  nodes.forEach(r => { if (r.ev) giveName(r); });
  nodes.forEach(r => { if (!r.ev && !r.entrance && !r.goal && rnd() < 0.25) giveName(r); });

  /* 特徴。ダンジョンの性格に合うものだけ。1つの特徴は1つの場所に2回まで */
  const fpool = Object.keys(FEATURES).filter(id =>
    FEATURES[id].tags.some(t => dun.tags.indexOf(t) >= 0));
  const fused = {};
  nodes.forEach(r => {
    r.features = [];
    if (r.entrance || !fpool.length) return;
    const n = rnd() < 0.5 ? 1 : rnd() < 0.24 ? 2 : 0;
    const cand = shuffle(rnd, fpool.filter(id => (fused[id] || 0) < 2));
    for (let i = 0; i < n && i < cand.length; i++) {
      if (r.features.indexOf(cand[i]) >= 0) continue;
      r.features.push(cand[i]); fused[cand[i]] = (fused[cand[i]] || 0) + 1;
    }
  });

  return {
    seed, dungeon: dun.id, rooms: nodes.length, zones: share.length,
    nodes: all, byId, gates, start: nodes[0].id,
    goal: (nodes.find(n => n.goal) || nodes[nodes.length - 1]).id,
    keys: chosen.slice(0, Math.max(0, share.length - 1)).map(k => k.id)
  };
}

/* ---------- 検算：詰みが無いか ---------- */
/* 振る舞いだけで満たせる型（何も置かなくてよい） */
const FREE = { spare: 1, hurtless: 1, light: 1, party: 1, word: 1 };

function verify(map) {
  const seen = {}, satisfied = {};
  let changed = true, steps = 0;
  const walk = () => {
    const q = [map.start]; const vis = { [map.start]: 1 };
    while (q.length) {
      const n = map.byId[q.shift()];
      seen[n.id] = 1;
      for (const lid of n.links) {
        const l = map.byId[lid];
        if (!l) continue;
        if (l.kind === 'corridor' && l.gate && !satisfied[l.gate]) continue;
        if (!vis[l.id]) { vis[l.id] = 1; q.push(l.id); }
      }
    }
  };
  while (changed && steps++ < 20) {
    changed = false;
    walk();
    /* 見えた部屋に置かれた種／相手にたどり着ければ、その関門は開けられる */
    for (const id in seen) {
      const n = map.byId[id];
      if (n && n.ev && (n.ev.t === 'seed' || n.ev.t === 'foe') && !satisfied[n.ev.gate]) {
        satisfied[n.ev.gate] = 1; changed = true;
      }
    }
    for (const gid in map.gates) {
      if (satisfied[gid]) continue;
      if (FREE[map.gates[gid].cond.t]) { satisfied[gid] = 1; changed = true; }
    }
  }
  const reachable = !!seen[map.goal];
  const orphan = map.nodes.filter(n => !seen[n.id]).map(n => n.id);

  /* 置き忘れの検算 */
  const placed = {};
  map.nodes.forEach(n => { if (n.ev) placed[n.ev.gate + ':' + n.ev.t] = 1; });
  const missing = [];
  for (const gid in map.gates) {
    const k = KEYS[map.gates[gid].key];
    if (k.hint && !placed[gid + ':hint']) missing.push(gid + ' のヒント');
    if (k.seed && !placed[gid + ':seed']) missing.push(gid + ' の種');
    if (k.cond.t === 'slay' && !placed[gid + ':foe']) missing.push(gid + ' の相手');
    if (!FREE[k.cond.t] && !k.seed && k.cond.t !== 'slay') missing.push(gid + ' の手立て');
  }
  return { ok: reachable && !missing.length, reachable, orphan, satisfied, missing };
}

module.exports = { generate, verify, mulberry32 };

if (require.main === module) {
  const n = +(process.argv[2] || 400);
  const sizes = [10, 16, 22, 30];
  let bad = 0, orphSum = 0, total = 0, missCount = 0;
  const kindUse = {};
  for (let i = 0; i < n; i++) {
    const d = ['beast', 'mine', 'maze', 'shrine'][i % 4];
    const map = generate({ dungeon: d, rooms: sizes[Math.floor(i / 4) % 4], seed: i * 7919 + 13 });
    const v = verify(map);
    total++;
    if (!v.reachable) { bad++; if (bad < 4) console.log('詰み: ', d, map.seed); }
    if (v.missing.length) { missCount++; if (missCount < 4) console.log('置き忘れ: ', d, map.seed, v.missing.join('／')); }
    orphSum += v.orphan.filter(id => map.byId[id].kind === 'room').length;
    map.keys.forEach(k => { kindUse[k] = (kindUse[k] || 0) + 1; });
  }
  console.log(total + ' 本生成 ／ 到達できないもの ' + bad + ' 本 ／ 置き忘れ ' + missCount + ' 本');
  console.log('平均で切り離された部屋 ' + (orphSum / total).toFixed(2) + ' 室');
  console.log('使われたキーイベント:');
  Object.keys(kindUse).sort((a, b) => kindUse[b] - kindUse[a])
    .forEach(k => console.log('   ' + KEYS[k].name.padEnd(12, '　') + kindUse[k]));
}
