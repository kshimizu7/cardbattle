/* 生成の幾何検査。
   A) 意味のない1マスの出っ張りが無い（壁沿い2マス以上）
   B) 円形の部屋の廊下は、中央の行・列に付いている
   C) 部屋どうしが接していない（廊下以外で隣接ゼロ）
   D) 1つの辺に廊下は1本まで
   E) 廊下は、繋がっていない部屋の壁に沿って走らない                  */
const { generate } = require('./rpggen.js');

function check(map) {
  const bad = [];
  const rooms = map.nodes.filter(n => n.kind === 'room');
  const cors = map.nodes.filter(n => n.kind === 'corridor');
  const cellOwner = {};
  rooms.forEach(r => r.rects.forEach(q => {
    for (let b = q.y; b < q.y + q.h; b++) for (let a = q.x; a < q.x + q.w; a++)
      cellOwner[b * 1000 + a] = r.id;
  }));
  const corOwner = {};
  cors.forEach(c => c.cells.forEach(([a, b]) => { corOwner[b * 1000 + a] = c.id; }));

  /* A: 出っ張りは壁沿い2マス以上 */
  rooms.forEach(r => r.rects.slice(1).forEach(e => {
    const m = r.rects[0];
    const horizAttach = e.y + e.h === m.y || e.y === m.y + m.h;   /* 上下に付く */
    const span = horizAttach ? e.w : e.h;
    if (span < 2) bad.push('A:' + r.id);
  }));

  /* B: 円形×廊下の位置、E: 廊下の横腹 */
  cors.forEach(c => {
    [c.from, c.to].forEach(rid => {
      const r = map.byId[rid];
      if (r.shape !== 'round') return;
      const m = r.rects[0];
      if (c.horiz) {
        const row = c.cells[0][1];
        if (row !== m.y + (m.h >> 1)) bad.push('B:' + c.id + '>' + rid);
      } else {
        const col = c.cells[0][0];
        if (col !== m.x + (m.w >> 1)) bad.push('B:' + c.id + '>' + rid);
      }
    });
    c.cells.forEach(([a, b], i) => {
      const lat = c.horiz ? [[a, b - 1], [a, b + 1]] : [[a - 1, b], [a + 1, b]];
      lat.forEach(q => {
        const v = cellOwner[q[1] * 1000 + q[0]];
        if (v && v !== c.from && v !== c.to) bad.push('E:' + c.id + '~' + v);
      });
    });
  });

  /* C: 部屋どうしの隣接 */
  rooms.forEach(r => r.rects.forEach(q => {
    for (let b = q.y; b < q.y + q.h; b++) for (let a = q.x; a < q.x + q.w; a++) {
      [[a+1,b],[a-1,b],[a,b+1],[a,b-1]].forEach(t => {
        const v = cellOwner[t[1] * 1000 + t[0]];
        if (v && v !== r.id) bad.push('C:' + r.id + '~' + v);
      });
    }
  }));

  /* D: 辺ごとの廊下本数 */
  rooms.forEach(r => {
    const m = r.rects[0];
    const cnt = { n:0, s:0, e:0, w:0 };
    r.links.forEach(lid => {
      const c = map.byId[lid];
      if (!c || !c.cells) return;
      const end = c.from === r.id ? c.cells[0] : c.cells[c.cells.length - 1];
      /* 端マスがどの辺に接しているか */
      if (end[1] === m.y - 1) cnt.n++;
      else if (end[1] === m.y + m.h) cnt.s++;
      else if (end[0] === m.x - 1) cnt.w++;
      else if (end[0] === m.x + m.w) cnt.e++;
    });
    ['n','s','e','w'].forEach(k => { if (cnt[k] > 1) bad.push('D:' + r.id + ':' + k); });
  });

  return bad;
}

module.exports = { check };

if (require.main === module) {
  const n = +(process.argv[2] || 400);
  let fail = 0; const kinds = {};
  const sizes = ['few', 'some', 'many', 'lots'];
  for (let i = 0; i < n; i++) {
    const d = ['beast', 'mine', 'maze', 'shrine'][i % 4];
    const map = generate({ dungeon: d, rooms: sizes[Math.floor(i / 4) % 4], seed: i * 104729 + 7 });
    const bad = check(map);
    if (bad.length) {
      fail++;
      bad.forEach(x => { kinds[x[0]] = (kinds[x[0]] || 0) + 1; });
      if (fail <= 3) console.log('NG', d, map.seed, bad.slice(0, 5).join(' '));
    }
  }
  console.log(n + ' 本検査 ／ 幾何違反のある地図 ' + fail + ' 本 ／ 種別 ' + JSON.stringify(kinds));
}
