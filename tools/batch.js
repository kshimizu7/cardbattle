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
    await p.goto('file:///root/cardbattle/index.html');
    const pvp = g % 3 === 0;
    if (pvp) await p.click('[data-mode="pvp"]');
    else await p.click('[data-diff="' + ['easy','normal','hard'][g%3] + '"]');
    await p.click('[data-pool="'+(process.env.CBPOOL||'full')+'"]');
    if (await p.$('[data-deal="'+(process.env.CBDEAL||'shuffle')+'"]')) {
      await p.click('[data-deal="'+(process.env.CBDEAL||'shuffle')+'"]');
    }
    await p.click('#go'); await p.waitForTimeout(200);
    async function doDraft() {
      if (await p.$('#pgo')) { await p.click('#pgo'); await p.waitForTimeout(150); }
      // 候補を1タップずつ置く（前衛左から自動で埋まる）
      for (let i = 0; i < 20; i++) {
        const cards = await p.$$eval('.hand .card:not(.used)', els => els.map(e => ({ id: e.dataset.card, c: e.querySelector('.cost') ? +e.querySelector('.cost').textContent : 0 })));
        if (!cards.length) break;
        cards.sort((a, b) => (Math.random()<0.5? a.c-b.c : b.c-a.c));
        const el = await p.$(`.hand .card[data-card="${cards[0].id}"]:not(.used)`);
        if (!el) break;
        await el.click().catch(()=>{}); await p.waitForTimeout(40);
        if ((await p.textContent('.hdr .badge')).includes('6/6')) break;
      }
      // 自動整列 → 場のカードを選んで移動、を1回ずつ試す
      const au = await p.$('#arrange:not([disabled])');
      if (au) { await au.click().catch(()=>{}); await p.waitForTimeout(60); }
      const filled = await p.$$('.slot.filled');
      if (filled.length) {
        await filled[0].click().catch(()=>{}); await p.waitForTimeout(60);
        const mv = await p.$('[data-mv="V"]:not([disabled])');
        if (mv) { await mv.click().catch(()=>{}); await p.waitForTimeout(60); }
        const un = await p.$('#undo:not([disabled])');
        if (un) { await un.click().catch(()=>{}); await p.waitForTimeout(60); }
      }
      const ok = await p.$('#done:not([disabled])');
      if (!ok) return false;
      await p.click('#done'); await p.waitForTimeout(300);
      return true;
    }
    if (!(await doDraft())) { results.push('draft fail'); await p.close(); continue; }
    if (pvp) { await doDraft(); }
    await p.waitForTimeout(2500);
    await p.click('#spd'); await p.click('#spd');
    let guard = 0;
    while (guard++ < 700) {
      if (await p.$('#again')) break;
      const auto = await p.$('#auto');
      if (auto) { await auto.click().catch(() => {}); await p.waitForTimeout(90); continue; }
      const ex = await p.$('#exec');
      if (ex) { await ex.click().catch(() => {}); await p.waitForTimeout(90); continue; }
      await p.waitForTimeout(90);
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
