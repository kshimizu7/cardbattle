/* v115 の画面確認：縦持ち・横持ち・開幕の紹介 */
const { chromium } = require('./tools/playwright-loader');
const path = require('path');
const { pathToFileURL } = require('url');
const repoRoot = path.resolve(__dirname);
const indexURL = pathToFileURL(path.join(repoRoot, 'index.html')).href;
const mk = ids => ids.map((id, i) => ({ id: id, row: i < 3 ? 0 : 1, col: i % 3 }));
const A = mk(['knight', 'warrior', 'priest', 'archer', 'mage', 'rogue']);
const B = mk(['paladin', 'berserker', 'shaman', 'archmage', 'valkyrie', 'assassin']);
(async () => {
  const b = await chromium.launch();
  async function shot(w, h, name, opts) {
    opts = opts || {};
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3,
      reducedMotion: 'no-preference' });
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    await p.goto(indexURL);
    await p.waitForTimeout(700);
    await p.evaluate(([a, c]) => window.CBTEST(a, c, 'cpu'), [A, B]);
    await p.waitForTimeout(opts.wait || 4200);
    if (opts.skipIntro) {
      const ok = await p.evaluate(() => { const s = document.querySelector('.introskip'); if (!s) return 'no button'; s.click(); return 'clicked'; });
      console.log(name + ' skip:', ok);
      await p.waitForTimeout(900);
    }
    await p.screenshot({ path: path.join(repoRoot, name) });
    console.log(name, errs.length ? 'ERRORS:\n' + errs.join('\n') : 'ok');
    await p.close();
  }
  /* 開幕の紹介（縦持ち）。札がめくれている途中で撮る */
  await shot(390, 844, 'v115_intro.png', { wait: 2200 });
  /* 縦持ちの戦闘画面 */
  await shot(390, 844, 'v115_port.png', { wait: 2200, skipIntro: true });
  /* 横持ちの戦闘画面 */
  await shot(892, 412, 'v115_land.png', { wait: 2200, skipIntro: true });
  await shot(740, 360, 'v115_land_s.png', { wait: 2200, skipIntro: true });
  await b.close();
})();
