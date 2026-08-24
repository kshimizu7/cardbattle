/* 対戦の再現。ゲーム側で「コードをコピー」したものを渡すと、
   その戦闘をもう一度なぞって、1手ずつの中身を書き出す。
   使い方: node tools/replay.js "<コード>"
           node tools/replay.js --file code.txt                              */
const fs = require('fs');
const CB = require('../src/engine.js');

/* ---------- コードの読み書き ---------- */
function encode(rep) {
  const j = JSON.stringify(rep);
  return 'AC1' + Buffer.from(j, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(code) {
  const s = String(code).trim().replace(/\s+/g, '');
  if (s.slice(0, 3) !== 'AC1') throw new Error('コードの形式が違います（AC1で始まりません）');
  let b = s.slice(3).replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return JSON.parse(Buffer.from(b, 'base64').toString('utf8'));
}

/* ---------- 再現 ---------- */
function replay(rep, opt) {
  opt = opt || {};
  if (rep.pool) CB.setPool(rep.pool);
  const st = CB.createState(rep.tA, rep.tB, { seed: rep.seed, coin: rep.coin, rec: false });
  const lines = [];
  const nameOf = u => u.def.name + '(' + (u.side === 0 ? 'P1' : 'P2') +
    (u.row === 0 ? '前' : '後') + (u.col + 1) + ')';
  const hpLine = () => CB.allUnits(st).map(u =>
    u.def.name + (u.alive ? ':' + u.hp : ':✕')).join(' ');

  lines.push('種 ' + rep.seed + ' ／ 先手 ' + (rep.coin === 0 ? 'P1' : 'P2') +
    ' ／ プール ' + (rep.pool || '?') + ' ／ ' + (rep.mode || '?') + (rep.diff ? '・' + rep.diff : ''));
  lines.push('P1: ' + rep.tA.map(c => c.id + '(' + c.row + ',' + c.col + ')').join(' '));
  lines.push('P2: ' + rep.tB.map(c => c.id + '(' + c.row + ',' + c.col + ')').join(' '));
  lines.push('');

  let round = 1, n = 0;
  lines.push('── ラウンド 1 ──');
  const bySlot = n => {
    const side = Math.floor(n / 10), i = n % 10;
    return st.players[side] && st.players[side].units[i];
  };
  for (const [slot, key, tgtStr] of rep.acts) {
    const u = bySlot(slot);
    if (!u) { lines.push('  ！ 記録の ' + slot + ' 番が見つかりません'); break; }
    let target = null;
    if (tgtStr) {
      if (tgtStr[0] === 'u') { const t = bySlot(+tgtStr.slice(1)); if (t) target = { type: 'unit', uid: t.uid }; }
      else if (tgtStr[0] === 'c') target = { type: 'square', col: +tgtStr.slice(1) };
      else if (tgtStr[0] === 'r') target = { type: 'row', row: +tgtStr.slice(1) };
    }
    const before = CB.allUnits(st).map(v => v.hp);
    CB.performAction(st, u, key, target);
    n++;

    /* このターンで起きたこと */
    const ev = st.events || [];
    const dmg = ev.filter(e => e.type === 'damage' || e.type === 'hit');
    const dead = ev.filter(e => e.type === 'death').map(e => {
      const v = CB.findUid(st, e.uid); return v ? v.def.name : e.uid; });
    const rev = ev.filter(e => e.type === 'revive').map(e => {
      const v = CB.findUid(st, e.uid); return v ? v.def.name : e.uid; });
    const dev = ev.filter(e => e.type === 'devotion').map(e => {
      const v = CB.findUid(st, e.uid); return v ? v.def.name : e.uid; });
    const pas = ev.filter(e => e.type === 'passive').map(e => e.name);

    const after = CB.allUnits(st).map(v => v.hp);
    const diffs = CB.allUnits(st).map((v, i) => ({ v: v, d: after[i] - before[i] }))
      .filter(x => x.d !== 0)
      .map(x => x.v.def.name + (x.d > 0 ? '+' : '') + x.d);

    let line = '  ' + String(n).padStart(2) + '. ' + nameOf(u) + ' → ' + key;
    if (target) line += ' [' + tgtStr + ']';
    if (diffs.length) line += '　' + diffs.join(' ');
    if (pas.length) line += '　特性:' + Array.from(new Set(pas)).join(',');
    if (dev.length) line += '　★献身で肩代わり:' + dev.join(',');
    if (dead.length) line += '　☠撃破:' + dead.join(',');
    if (rev.length) line += '　✚復活:' + rev.join(',');
    if (u.flags.extraTurn) line += '　→ 凱歌で続けてもう一度';
    lines.push(line);

    if (st.phase === 'ended') break;
    CB.nextTurn(st);
    if (!CB.currentActor(st)) {
      CB.endRound(st);
      if (st.phase !== 'ended' && st.round !== round) {
        round = st.round; lines.push('── ラウンド ' + round + ' ──　' + hpLine());
      }
    }
  }
  lines.push('');
  lines.push('結果: ' + (st.winner == null ? '引き分け' : (st.winner === 0 ? 'P1' : 'P2') + ' の勝ち') +
    ' ／ ' + st.round + 'ラウンド');
  lines.push('最終HP: ' + hpLine());
  if (rep.result) lines.push('記録側の結果: ' + JSON.stringify(rep.result));
  return { st: st, text: lines.join('\n') };
}

module.exports = { encode: encode, decode: decode, replay: replay };

if (require.main === module) {
  let code = process.argv[2];
  if (code === '--file') code = fs.readFileSync(process.argv[3], 'utf8');
  if (!code) { console.error('コードを渡してください'); process.exit(1); }
  console.log(replay(decode(code)).text);
}
