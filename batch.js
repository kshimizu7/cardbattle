const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const N = +process.argv[2] || 8;
  let allErr = [], results = [];
  for (let g = 0; g < N; g++) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack||'').split('\n')[1]));
    await p.goto('file:///root/cardbattle/ArcanaClash.html');
    if (await p.$('#h_arena')) { await p.click('#h_arena'); await p.waitForTimeout(150); }
    const pvp = g % 3 === 0;
    if (pvp) await p.click('[data-mode="pvp"]');
    else await p.click('[data-diff="' + ['easy','normal','hard'][g%3] + '"]');
    await p.click('[data-pool="'+(process.env.CBPOOL||'full')+'"]'); await p.click('#go'); await p.waitForTimeout(200);
    async function doDraft() {
      if (await p.$('#pgo')) { await p.click('#pgo'); await p.waitForTimeout(150); }
      for (let i = 0; i < 20; i++) {
        const cards = await p.$$eval('.drpool .card:not(.used)', els => els.map(e => ({ id: e.dataset.card, c: e.querySelector('.cost') ? +e.querySelector('.cost').textContent : 0 })));
        if (!cards.length) break;
        cards.sort((a, b) => (Math.random()<0.5? a.c-b.c : b.c-a.c));
        const el = await p.$(`.drpool .card[data-card="${cards[0].id}"]:not(.used)`);
        if (!el) break;
        await el.click().catch(()=>{}); await p.waitForTimeout(30);
        const slots = await p.$$('.drslot.can');
        if (!slots.length) break;
        await slots[Math.floor(Math.random()*slots.length)].click().catch(()=>{}); await p.waitForTimeout(30);
        if ((await p.$$('.drslot.filled')).length >= 6) break;
      }
      const ok = await p.$('#done:not([disabled])');
      if (!ok) return false;
      await p.click('#done'); await p.waitForTimeout(300);
      return true;
    }
    if (!(await doDraft())) { results.push('draft fail'); await p.close(); continue; }
    if (pvp) { await doDraft(); }
    await p.waitForSelector('.b-spd', { timeout: 20000 }).catch(()=>{});
    await p.click('.b-spd').catch(()=>{}); await p.click('.b-spd').catch(()=>{});
    await p.click('.b-autoall').catch(()=>{});      /* 全部オートに任せる */
    let guard = 0;
    while (guard++ < 1500) {
      if (await p.$('#again')) break;
      const one = await p.$('.b-auto1');
      if (one) { await one.click().catch(() => {}); }
      await p.click('#app', { position: { x: 200, y: 500 } }).catch(() => {});
      await p.waitForTimeout(120);
    }
    const done = await p.$('#again');
    let tag = 'TIMEOUT';
    if (done) {
      const w = await p.textContent('.result-hero .win');
      const how = await p.textContent('.result-hero div:nth-child(3)');
      tag = w.trim() + ' / ' + (how.includes('判定') ? '判定' : '全滅');
    }
    results.push((pvp?'PvP ':'CPU ') + tag + (errs.length ? ' [ERR]' : ''));
    allErr = allErr.concat(errs);
    await p.close();
  }
  results.forEach((r, i) => console.log(' game' + (i+1) + ': ' + r));
  console.log(allErr.length ? '\nERRORS:\n' + [...new Set(allErr)].join('\n') : '\n✓ 全ゲーム コンソールエラーなし');
  await b.close();
})();
