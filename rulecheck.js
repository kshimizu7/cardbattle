/* 戦闘ルールの回帰チェック（ブラウザ不要・数秒）
   ・凱歌（敵を倒すと もう一度行動）が、繰り上がりを挟んでも必ず発動するか
   ・撃った弾が「もう倒れている相手」に吸い込まれて不発になっていないか
   ・繰り上がりのせいで、同じ相手を二重に殴っていないか（連撃技を除く）
   ・「最弱を狙う」技が、画面の予告（E.weakestOf）と同じ相手に当たっているか
   ・献身で助かったとき、必ず「一度倒れた合図」が出ているか
   使い方： node rulecheck.js [試合数]                                        */
const CB = require('./src/engine.js'); global.CB = CB;
const AI = require('./src/ai.js');

const N = parseInt(process.argv[2] || '600', 10);
const bad = { triumph: [], wasted: [], double: [], weakest: [], devotion: [] };
let triN = 0, atkN = 0, moveAtk = 0, weakN = 0, devN = 0;

for (let g = 0; g < N; g++) {
  const rnd = CB.mulberry32(g + 1);
  for (const pool of ['starter', 'full']) {
    CB.setPool(pool); CB.setDealMode('shuffle');
    const { hands } = CB.deal(g + 1);
    const st = CB.createState(AI.buildTeam(hands[0], 'hard', rnd), AI.buildTeam(hands[1], 'hard', rnd), {});
    let guard = 0;
    while (st.phase !== 'ended' && guard++ < 400) {
      const u = CB.currentActor(st);
      if (!u) { CB.endRound(st); continue; }
      const canTri = CB.hasP(u, 'triumph') && !u.flags.triumphUsed;
      const uid = u.uid;
      const ch = AI.chooseAction(st, u, 'hard', rnd);
      /* 「最弱を狙う」技は、撃つ前に予告（画面もCPUもこれを見る）を控えておく */
      const actDef = (u.def.actions || []).find(x => x.key === ch.actionKey) || {};
      const foretold = actDef.range === 'weakest' ? CB.weakestOf(st, 1 - u.side) : null;
      const evs = CB.performAction(st, u, ch.actionKey, ch.target);
      if (foretold) {
        weakN++;
        const hit = evs.filter(e => e.type === 'damage' || e.type === 'execute').map(e => e.uid);
        if (hit.length && hit[0] !== foretold.uid)
          bad.weakest.push(`${u.def.name}／${actDef.name}（予告=${foretold.def.name} 実際=${(CB.findUid(st, hit[0])||{def:{name:'?'}}).def.name}）`);
      }
      /* 献身：肩代わりが起きたら、その直前に「倒れた合図」が入っているか */
      evs.forEach((e, i) => {
        if (e.type !== 'devotion') return;
        devN++;
        const before = evs.slice(0, i).reverse().find(x => x.type === 'downed' && x.uid === e.uid);
        if (!before) bad.devotion.push(`${(CB.findUid(st, e.uid)||{def:{name:'?'}}).def.name} に倒れた合図が無い`);
      });
      const atk = evs.find(e => e.type === 'attack');
      const killed = evs.some(e => e.type === 'death');
      const moved = evs.some(e => e.type === 'move');
      if (atk) {
        atkN++; if (moved) moveAtk++;
        const hitUids = evs.filter(e => e.type === 'damage' || e.type === 'execute').map(e => e.uid);
        /* 不発：狙ったのに当たらなかった弾（敵が全滅していれば正しい） */
        const foesLeft = CB.aliveUnits(st, 1 - u.side).length;
        if (atk.targets.length > hitUids.length && foesLeft > 0)
          bad.wasted.push(`${u.def.name}／${atk.name}（狙い${atk.targets.length} 命中${hitUids.length} 残敵${foesLeft}）`);
        /* 二重打ち：連撃・乱れ撃ち以外で同じ相手が2回出てくる */
        const act = (u.def.actions || []).find(x => x.key === ch.actionKey) || {};
        if (!act.hits && act.range !== 'random' && new Set(hitUids).size < hitUids.length)
          bad.double.push(`${u.def.name}／${atk.name}${moved ? '（繰り上がりあり）' : ''}`);
      }
      if (st.phase === 'ended') break;
      const nxt = CB.nextTurn(st);
      if (canTri && killed && u.alive) {
        triN++;
        if (!nxt || nxt.uid !== uid)
          bad.triumph.push(`${u.def.name}（${moved ? '繰り上がりあり' : '繰り上がりなし'}）`);
      }
    }
  }
}
function show(name, arr) {
  if (!arr.length) { console.log('  ○ ' + name); return 0; }
  console.log('  ✗ ' + name + '  ' + arr.length + '件');
  const c = {}; arr.forEach(s => c[s] = (c[s] || 0) + 1);
  Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .forEach(([k, v]) => console.log('      ' + k + '  ' + v + '回'));
  return arr.length;
}
console.log(`${N * 2}戦（スターター／エクステンション）　攻撃${atkN}回・うち繰り上がりを伴うもの${moveAtk}回　凱歌の判定${triN}回　最弱狙い${weakN}回　献身${devN}回`);
let ng = 0;
ng += show('凱歌が必ず発動する', bad.triumph);
ng += show('狙った弾が不発にならない', bad.wasted);
ng += show('同じ相手を二重に殴らない', bad.double);
ng += show('最弱狙いが予告どおりの相手に当たる', bad.weakest);
ng += show('献身の前に必ず倒れた合図が出る', bad.devotion);
console.log(ng ? '失敗 ' + ng + '件' : '全部 OK');
process.exit(ng ? 1 : 0);
