/* ダンジョン生成 v2。
   「解錠の連鎖を先に決めて、区画に部屋を配る」背骨はそのまま、
   置き方をマス単位の矩形（複数マスの部屋＋長さのある廊下）に拡張した。

   ── 生成の変数（PROFILE）──
     rooms    部屋数        few(8) / some(14) / many(22) / lots(32)
     roomSize 部屋の広さ    cramped / standard / spacious
     corLen   廊下の長さ    compact(1) / normal(1-2) / sprawling(2-4)
     corWidth 廊下の幅      narrow / wide
     layout   道の形        straight / forking / balanced / winding
     shapes   部屋の形      square / irregular / round から1つ以上
     rough    外周の粗さ    none / light / medium / heavy
     loops    回廊          few / some / many …行き止まりを減らし、環を作る
     landmark 大広間        true なら、ひときわ大きい広間を1つ保証する

   ダンジョンごとに「流儀」（既定のPROFILE）を持ち、場所の性格が
   そのまま地形に出る。ユーザーはどの変数も上書きできる。            */

const VARI = require('../src/vari.js');
const { DUNGEONS } = require('./rpgdungeons.js');
const { KEYS } = require('./rpgkeys.js');
const { SHAPES, FEATURES } = require('./rpgrooms.js');

/* ---------- 乱数 ---------- */
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

/* ---------- 変数の値 ---------- */
const ROOMS_N   = { few: 8, some: 14, many: 22, lots: 32 };
const COR_LEN   = { compact: [1, 1], normal: [1, 2], sprawling: [2, 4] };
const ROUGH_PX  = { none: 0, light: 8, medium: 16, heavy: 26 };
const LOOP_R    = { few: 0.05, some: 0.14, many: 0.3 };

/* 部屋の寸法（マス）。[w,h] の候補 */
const SIZES = {
  cramped:  [[2,2],[2,2],[3,2],[2,3]],
  standard: [[2,2],[3,2],[2,3],[3,3],[4,2]],
  spacious: [[3,3],[4,3],[3,4],[4,4],[5,3],[5,4]]
};
const ROUND_D = { cramped: [3], standard: [3,4], spacious: [4,5] };

/* ダンジョンの流儀 */
const STYLES = {
  beast:  { roomSize:'standard', corLen:'sprawling', corWidth:'narrow',
            layout:'winding',  shapes:['irregular','round'], rough:'heavy',  loops:'few',  landmark:false },
  mine:   { roomSize:'cramped',  corLen:'sprawling', corWidth:'narrow',
            layout:'straight', shapes:['square'],            rough:'light',  loops:'some', landmark:false },
  maze:   { roomSize:'cramped',  corLen:'compact',   corWidth:'narrow',
            layout:'forking',  shapes:['square','irregular'],rough:'medium', loops:'many', landmark:false },
  shrine: { roomSize:'spacious', corLen:'normal',    corWidth:'wide',
            layout:'balanced', shapes:['square','round'],    rough:'none',   loops:'few',  landmark:true }
};

/* ---------- 部屋の名前（真名） ---------- */
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

  /* 変数：流儀 → 呼び出し側の上書き */
  const P = Object.assign({}, STYLES[dun.id] || STYLES.beast);
  ['roomSize','corLen','corWidth','layout','rough','loops'].forEach(k => {
    if (opts[k]) P[k] = opts[k];
  });
  if (opts.shapes && opts.shapes.length) P.shapes = opts.shapes.slice();
  if (opts.landmark != null) P.landmark = opts.landmark;
  const nRooms = Math.max(6, Math.min(40,
    opts.rooms ? (ROOMS_N[opts.rooms] || +opts.rooms || 12) : 12));

  /* ── ① 関門の本数とキーイベント ── */
  const nGates = opts.gates != null ? opts.gates
    : nRooms <= 10 ? 1 : nRooms <= 16 ? 2 : nRooms <= 26 ? 3 : 4;
  const fits = k => k.tags.indexOf('*') >= 0 || k.tags.some(t => dun.tags.indexOf(t) >= 0);
  const kpool = shuffle(rnd, Object.keys(KEYS).filter(id => fits(KEYS[id])));
  const chosen = [];
  const usedKind = {};
  for (const id of kpool) {
    if (chosen.length >= nGates) break;
    if (usedKind[KEYS[id].kind]) continue;
    usedKind[KEYS[id].kind] = 1; chosen.push(KEYS[id]);
  }
  while (chosen.length < nGates) chosen.push(KEYS[pick(rnd, kpool)]);
  const early = { spare: 1, hurtless: 1 };
  chosen.sort((a, b) => (early[a.kind] ? 0 : 1) - (early[b.kind] ? 0 : 1));

  /* ── ② 区画に部屋数を割る ── */
  const nZones = nGates + 1;
  const share = new Array(nZones).fill(0);
  for (let i = 0; i < nRooms; i++) share[i % nZones]++;
  for (let z = 0; z < nZones; z++) if (share[z] < 3) share[z] = 3;

  /* ── ③ マス格子に、矩形の部屋と長さのある廊下を置く ── */
  const G = nRooms >= 28 ? 60 : nRooms >= 18 ? 52 : 46;   /* 格子の一辺（マス） */
  const occ = new Array(G * G).fill(0);
  const at = (x, y) => (x >= 0 && y >= 0 && x < G && y < G) ? occ[y * G + x] : 9;
  const mark = (x, y, w, h, v) => { for (let b = y; b < y + h; b++) for (let a = x; a < x + w; a++) occ[b * G + a] = v; };
  const freeRect = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w > G - 1 || y + h > G - 1) return false;
    for (let b = y; b < y + h; b++) for (let a = x; a < x + w; a++) if (at(a, b)) return false;
    return true;
  };
  /* 部屋どうしが壁を接して融合しないよう、1マスの余白も見る */
  const clearAround = (x, y, w, h, allow) => {
    for (let b = y - 1; b < y + h + 1; b++) for (let a = x - 1; a < x + w + 1; a++) {
      if (a >= x && a < x + w && b >= y && b < y + h) continue;
      const v = at(a, b);
      if (v && v !== allow) return false;
    }
    return true;
  };

  const nodes = [], corridors = [];
  let nid = 0, cid = 0;
  const entryRow = G - 2;

  const footprint = () => {
    const shape = pick(rnd, P.shapes);
    if (shape === 'round') { const d = pick(rnd, ROUND_D[P.roomSize]); return { shape, w: d, h: d }; }
    const [w, h] = pick(rnd, SIZES[P.roomSize]);
    return { shape, w, h };
  };
  const newRoom = (x, y, w, h, shape, zone) => {
    const r = { id: 'r' + (nid++), kind: 'room', zone, x, y, w, h, shape,
      gx: x + w / 2, gy: y + h / 2, links: [], name: null, ev: null, rects: [{ x, y, w, h }] };
    mark(x, y, w, h, r.id); nodes.push(r);
    /* 不規則形：側面にひと塊り足す */
    if (shape === 'irregular' && rnd() < 0.85) {
      for (let t = 0; t < 8; t++) {
        const side = Math.floor(rnd() * 4);
        const ew = 1 + Math.floor(rnd() * 2), eh = 1 + Math.floor(rnd() * 2);
        let ex, ey;
        if (side === 0) { ex = x + Math.floor(rnd() * Math.max(1, w - ew + 1)); ey = y - eh; }
        else if (side === 1) { ex = x + Math.floor(rnd() * Math.max(1, w - ew + 1)); ey = y + h; }
        else if (side === 2) { ex = x - ew; ey = y + Math.floor(rnd() * Math.max(1, h - eh + 1)); }
        else { ex = x + w; ey = y + Math.floor(rnd() * Math.max(1, h - eh + 1)); }
        if (ey + eh - 1 <= entryRow && freeRect(ex, ey, ew, eh) && clearAround(ex, ey, ew, eh, r.id)) {
          mark(ex, ey, ew, eh, r.id); r.rects.push({ x: ex, y: ey, w: ew, h: eh }); break;
        }
      }
    }
    return r;
  };

  /* 廊下：部屋の縁のマスから方角 dir へ L マス。先に次の部屋 */
  const DIRS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  function tryGrow(from, zone, prefDir) {
    const [L0, L1] = COR_LEN[P.corLen];
    const dirs = prefDir != null
      ? [DIRS[prefDir]].concat(shuffle(rnd, DIRS.filter((d, i) => i !== prefDir)))
      : shuffle(rnd, DIRS);
    for (const d of dirs) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const L = L0 + Math.floor(rnd() * (L1 - L0 + 1));
        const m = from.rects[0];
        let sx, sy;
        if (d.dy === -1) { sx = m.x + Math.floor(rnd() * m.w); sy = m.y - 1; }
        else if (d.dy === 1) { sx = m.x + Math.floor(rnd() * m.w); sy = m.y + m.h; }
        else if (d.dx === -1) { sx = m.x - 1; sy = m.y + Math.floor(rnd() * m.h); }
        else { sx = m.x + m.w; sy = m.y + Math.floor(rnd() * m.h); }
        const cells = [];
        let ok = true;
        for (let i = 0; i < L; i++) {
          const cx2 = sx + d.dx * i, cy2 = sy + d.dy * i;
          if (at(cx2, cy2)) { ok = false; break; }
          cells.push([cx2, cy2]);
        }
        if (!ok) continue;
        const f = footprint();
        let rx, ry;
        const ex = sx + d.dx * L, ey = sy + d.dy * L;
        if (d.dy === -1) { rx = ex - Math.floor(rnd() * f.w); ry = ey - f.h + 1; }
        else if (d.dy === 1) { rx = ex - Math.floor(rnd() * f.w); ry = ey; }
        else if (d.dx === -1) { rx = ex - f.w + 1; ry = ey - Math.floor(rnd() * f.h); }
        else { rx = ex; ry = ey - Math.floor(rnd() * f.h); }
        if (ry + f.h - 1 > entryRow) continue;      /* 入口より外（南）に部屋を置かない */
        if (!freeRect(rx, ry, f.w, f.h)) continue;
        const c = { id: 'c' + (cid++), kind: 'corridor', zone,
          cells, horiz: d.dy === 0, gate: null,
          gx: cells.reduce((s2, p2) => s2 + p2[0], 0) / cells.length + 0.5,
          gy: cells.reduce((s2, p2) => s2 + p2[1], 0) / cells.length + 0.5,
          from: from.id, to: null, links: [], name: null, ev: null };
        cells.forEach(([a, b]) => mark(a, b, 1, 1, c.id));
        const r = newRoom(rx, ry, f.w, f.h, f.shape, zone);
        c.to = r.id; c.links = [from.id, r.id];
        from.links.push(c.id); r.links.push(c.id);
        corridors.push(c);
        return { room: r, cor: c, dirIndex: DIRS.indexOf(d) };
      }
    }
    return null;
  }

  /* 既存の部屋どうしを短い廊下で繋ぐ（回廊。新しい部屋は作らない） */
  function tryLink(A, zone) {
    const d = pick(rnd, DIRS);
    const m = A.rects[0];
    let sx, sy;
    if (d.dy === -1) { sx = m.x + Math.floor(rnd() * m.w); sy = m.y - 1; }
    else if (d.dy === 1) { sx = m.x + Math.floor(rnd() * m.w); sy = m.y + m.h; }
    else if (d.dx === -1) { sx = m.x - 1; sy = m.y + Math.floor(rnd() * m.h); }
    else { sx = m.x + m.w; sy = m.y + Math.floor(rnd() * m.h); }
    const cells = [];
    for (let i = 0; i < 5; i++) {
      const a = sx + d.dx * i, b = sy + d.dy * i;
      const v = at(a, b);
      if (!v) { cells.push([a, b]); continue; }
      if (String(v)[0] === 'r' && cells.length > 0) {
        const B = nodes.find(n => n.id === v);
        if (!B || B.zone !== zone || B === A) return null;
        if (A.links.some(l => { const c = corridors.find(x2 => x2.id === l);
          return c && (c.from === B.id || c.to === B.id); })) return null;
        const c = { id: 'c' + (cid++), kind: 'corridor', zone, cells, horiz: d.dy === 0, gate: null,
          gx: cells.reduce((s2, p2) => s2 + p2[0], 0) / cells.length + 0.5,
          gy: cells.reduce((s2, p2) => s2 + p2[1], 0) / cells.length + 0.5,
          from: A.id, to: B.id, links: [A.id, B.id], name: null, ev: null };
        cells.forEach(([a2, b2]) => mark(a2, b2, 1, 1, c.id));
        A.links.push(c.id); B.links.push(c.id);
        corridors.push(c);
        return c;
      }
      return null;
    }
    return null;
  }

  /* 入口：最下段の縁。外へ開く（描画側で南の壁を開ける） */
  const f0 = footprint();
  const ex0 = Math.floor(G / 2 - f0.w / 2);
  const entry = newRoom(ex0, entryRow - f0.h + 1, f0.w, f0.h,
    f0.shape === 'round' ? 'square' : f0.shape, 0);
  entry.entrance = true;

  /* 区画ごとに成長 */
  const zoneRooms = [];
  let seedRoom = entry, lastDir = 0;
  let truncated = false;
  for (let z = 0; z < nZones && !truncated; z++) {
    const list = [seedRoom];
    let last = seedRoom;
    let guard = 0;
    while (list.length < share[z] && guard++ < 240) {
      let from, pref = null;
      if (P.layout === 'straight') { from = last; pref = rnd() < 0.7 ? lastDir : null; }
      else if (P.layout === 'winding') {
        from = last;
        pref = rnd() < 0.65 ? (lastDir < 2 ? pick(rnd, [2, 3]) : pick(rnd, [0, 1])) : null;
      }
      else if (P.layout === 'forking') { from = pick(rnd, list); }
      else { from = rnd() < 0.5 ? last : pick(rnd, list); }
      const got = tryGrow(from, z, pref);
      if (got) { list.push(got.room); last = got.room; lastDir = got.dirIndex; }
      else { last = pick(rnd, list); }
    }
    zoneRooms.push(list);

    /* 回廊 */
    const wantLoops = Math.round(list.length * LOOP_R[P.loops]);
    let made = 0;
    for (let t = 0; t < 40 && made < wantLoops; t++) {
      if (tryLink(pick(rnd, list), z)) made++;
    }

    /* 次の区画：関門つきの廊下で */
    if (z < nZones - 1) {
      let got = null;
      for (const from of shuffle(rnd, list)) { got = tryGrow(from, z + 1, null); if (got) break; }
      if (!got) { share.length = z + 1; truncated = true; break; }
      got.cor.gate = 'g' + z; got.cor.zone = z;
      seedRoom = got.room;
    } else {
      list[list.length - 1].goal = true;
    }
  }
  if (truncated) {
    const zl = zoneRooms[zoneRooms.length - 1];
    zl[zl.length - 1].goal = true;
  }

  /* 大広間：いちばん広い部屋に印（名前と特徴が寄る） */
  if (P.landmark) {
    let big = null;
    nodes.forEach(r => {
      if (r.entrance || r.goal) return;
      const area = r.rects.reduce((s2, q) => s2 + q.w * q.h, 0);
      if (!big || area > big.a) big = { r, a: area };
    });
    if (big) big.r.landmark = true;
  }

  const all = nodes.concat(corridors);
  const byId = {}; all.forEach(n => { byId[n.id] = n; });

  /* ── 関門 ── */
  const gates = {};
  chosen.slice(0, Math.max(0, share.length - 1)).forEach((key, z) => {
    gates['g' + z] = { id: 'g' + z, key: key.id, cond: key.cond, look: key.look, state: 'shut', zone: z };
  });

  /* ── ヒントと種：関門より手前の区画にだけ ── */
  Object.keys(gates).forEach(gid => {
    const g = gates[gid], key = KEYS[g.key];
    const before = [];
    for (let z = 0; z <= g.zone; z++) (zoneRooms[z] || []).forEach(r => { if (!r.entrance && !r.ev) before.push(r); });
    const bag = shuffle(rnd, before);
    if (key.hint && bag.length) { const r = bag.pop(); r.ev = { t: 'hint', gate: gid, key: key.id }; }
    if (key.seed && bag.length) { const r = bag.pop(); r.ev = { t: 'seed', gate: gid, key: key.id }; }
    if (key.cond.t === 'slay' && bag.length) { const r = bag.pop(); r.ev = { t: 'foe', gate: gid, key: key.id }; }
  });

  /* ── 形クラス（描写・通り名用）── */
  nodes.forEach(r => {
    const area = r.rects.reduce((s2, q) => s2 + q.w * q.h, 0);
    const asp = Math.max(r.w / r.h, r.h / r.w);
    r.cls = r.shape === 'round' ? 'round' : (area >= 12 || r.landmark) ? 'big' : asp >= 1.9 ? 'long' : 'small';
  });

  /* ── 通り名と真名 ── */
  const usedAlias = {};
  nodes.forEach(r => {
    if (r.entrance) { r.alias = '入口の間'; return; }
    if (r.goal) { r.alias = '最奥の間'; return; }
    if (r.landmark) { r.alias = '大広間'; return; }
    for (let t = 0; t < 10; t++) {
      const a = VARI.expand(SHAPES[r.cls].alias, {}, rnd);
      if (!usedAlias[a] || t === 9) { usedAlias[a] = 1; r.alias = a; return; }
    }
  });
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

  /* ── 特徴と、部屋の中の配置 ── */
  const fpool = Object.keys(FEATURES).filter(id =>
    FEATURES[id].tags.some(t => dun.tags.indexOf(t) >= 0));
  const fused = {};
  nodes.forEach(r => {
    r.features = [];
    if (r.entrance || !fpool.length) return;
    const n2 = (r.landmark ? 1 : 0) + (rnd() < 0.5 ? 1 : rnd() < 0.24 ? 2 : 0);
    const cand = shuffle(rnd, fpool.filter(id => (fused[id] || 0) < 2));
    for (let i = 0; i < n2 && i < cand.length; i++) {
      if (r.features.indexOf(cand[i]) >= 0) continue;
      r.features.push(cand[i]); fused[cand[i]] = (fused[cand[i]] || 0) + 1;
    }
  });
  const SLOTS = [
    { dx: -0.27, dy: 0.02, w: '西' }, { dx: 0.27, dy: 0.02, w: '東' },
    { dx: 0, dy: -0.26, w: '北' },   { dx: 0, dy: 0.26, w: '南' }
  ];
  nodes.forEach(r => {
    r.fpos = {};
    const sl = shuffle(rnd, SLOTS);
    (r.features || []).forEach((fid, i) => { r.fpos[fid] = sl[i % sl.length]; });
  });

  return {
    seed, dungeon: dun.id, profile: P,
    rooms: nodes.length, zones: share.length,
    nodes: all, byId, gates, start: nodes[0].id,
    goal: (nodes.find(n => n.goal) || nodes[nodes.length - 1]).id,
    keys: chosen.slice(0, Math.max(0, share.length - 1)).map(k => k.id),
    grid: G, roughPx: ROUGH_PX[P.rough]
  };
}

/* ---------- 検算 ---------- */
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

module.exports = { generate, verify, mulberry32, STYLES, ROOMS_N };

if (require.main === module) {
  const n = +(process.argv[2] || 400);
  let bad = 0, miss = 0, orph = 0, total = 0, roomSum = 0, short = 0;
  const sizes = ['few', 'some', 'many', 'lots'];
  for (let i = 0; i < n; i++) {
    const d = ['beast', 'mine', 'maze', 'shrine'][i % 4];
    const want = sizes[Math.floor(i / 4) % 4];
    const map = generate({ dungeon: d, rooms: want, seed: i * 7919 + 13 });
    const v = verify(map);
    const nr = map.nodes.filter(x => x.kind === 'room').length;
    total++; roomSum += nr;
    if (nr < ROOMS_N[want] * 0.7) short++;
    if (!v.reachable) { bad++; if (bad < 4) console.log('詰み:', d, want, map.seed); }
    if (v.missing.length) { miss++; if (miss < 4) console.log('置き忘れ:', d, want, map.seed, v.missing.join('／')); }
    orph += v.orphan.filter(id => map.byId[id].kind === 'room').length;
  }
  console.log(total + ' 本生成 ／ 到達できない ' + bad + ' ／ 置き忘れ ' + miss +
    ' ／ 孤立部屋 平均 ' + (orph / total).toFixed(2) +
    ' ／ 部屋数 平均 ' + (roomSum / total).toFixed(1) +
    ' ／ 目標の7割未満 ' + short);
}
