/* 音の"性格"が狙いどおりか（立ち上がりの鋭さ／炎のゆらぎ／余韻の長さ）を数値で確認 */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const RATE = 32000;
const LIST = [
  ['arrow', 1.2], ['i_arrow', 0.8], ['frost', 1.6], ['i_ice', 0.8],
  ['slash', 1.2], ['i_cut', 0.7], ['firebolt', 1.4], ['i_fire', 0.8],
  ['screech', 1.2], ['doom', 1.8], ['rock', 1.2], ['wallop', 1.2],
  ['blizzard', 1.8], ['thorn', 1.2], ['holystrike', 1.4], ['spear', 1.2],
  ['discord', 1.4], ['logos', 1.4], ['hex', 1.6], ['mark', 1.2],
  ['grasp', 1.4], ['horn', 1.2], ['dclaw', 1.2], ['purge', 1.6], ['lance', 1.0],
  ['arcanebolt', 1.2], ['fire', 1.8], ['breath', 2.6]
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///root/cardbattle/index.html');
  const rows = [];
  for (const [n, sec] of LIST) {
    const r = await p.evaluate(async ([name, s, rate]) => {
      const buf = await SFX.render(name, s, rate);
      const ch = buf.getChannelData(0);
      // 10ms窓のRMS包絡
      const W = Math.floor(rate * 0.01), env = [];
      for (let i = 0; i + W <= ch.length; i += W) {
        let sum = 0;
        for (let j = 0; j < W; j++) sum += ch[i + j] * ch[i + j];
        env.push(Math.sqrt(sum / W));
      }
      const peak = Math.max.apply(null, env);
      const iPeak = env.indexOf(peak);
      // 立ち上がり：ピークの50%に達するまでの時間
      let iRise = 0;
      while (iRise < env.length && env[iRise] < peak * 0.5) iRise++;
      // 余韻：ピーク後にピークの5%を下回るまで
      let iEnd = iPeak;
      while (iEnd < env.length && env[iEnd] > peak * 0.05) iEnd++;
      // ゆらぎ：本体部分（ピーク後〜終わりの7割）の包絡のばらつき
      const body = env.slice(iPeak + 3, Math.max(iPeak + 6, Math.floor(iEnd * 0.9)));
      const mean = body.reduce((a, c) => a + c, 0) / (body.length || 1);
      let vr = 0; body.forEach(v => { vr += (v - mean) * (v - mean); });
      const flick = mean > 0 ? Math.sqrt(vr / (body.length || 1)) / mean : 0;
      return { rise: iRise * 10, tail: (iEnd - iPeak) * 10, flick: +flick.toFixed(2) };
    }, [n, sec, RATE]);
    rows.push({ 音: n, '立ち上がり(ms)': r.rise, '余韻(ms)': r.tail, 'ゆらぎ': r.flick });
  }
  console.table(rows);
  await b.close();
})();
