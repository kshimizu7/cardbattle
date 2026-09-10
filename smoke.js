/* 画面の通し確認（速い方）。ブラウザは使うが、戦闘は開始だけ見る */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const F='file://'+require('path').join(__dirname,'ArcanaClash.html');
(async()=>{
  const b=await chromium.launch(); const bad=[]; const ok=[];
  async function check(name, fn){ try{ await fn(); ok.push(name); }catch(e){ bad.push(name+' … '+e.message.split('\n')[0]); } }
  for (const pool of ['tutorial','starter','full']) {
    const p=await b.newPage({viewport:{width:390,height:844}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
    await p.goto(F);
    await check(pool+'：ホーム→闘技場', async()=>{ await p.click('#h_arena',{timeout:4000}); });
    await check(pool+'：設定→編成', async()=>{
      await p.click('[data-diff="normal"]',{timeout:3000});
      await p.click('[data-pool="'+pool+'"]',{timeout:3000});
      await p.click('#go',{timeout:3000});
      await p.waitForSelector('.drpick',{timeout:5000});
    });
    await check(pool+'：候補タップ→枠に配置', async()=>{
      await p.click('.drpool .card:not(.used)',{timeout:3000});
      await p.waitForSelector('.drslot.can',{timeout:2000});
      await p.click('.drslot.can',{timeout:2000});
      await p.waitForSelector('.drslot.filled',{timeout:2000});
    });
    await check(pool+'：選ぶと↑が出て、押すと自動配置', async()=>{
      const n0=(await p.$$('.drslot.filled')).length;
      if((await p.$$('.drpool .drput')).length!==0) throw new Error('選ぶ前から↑が出ている');
      await p.click('.drpool .card:not(.used)',{timeout:3000});
      await p.waitForSelector('.drpool .card.sel .drput',{timeout:2000});
      await p.click('.drpool .card.sel .drput',{timeout:2000});
      const n1=(await p.$$('.drslot.filled')).length;
      if(n1!==n0+1) throw new Error('増えなかった '+n0+'→'+n1);
    });
    await check(pool+'：ダブルタップで退避', async()=>{
      const n0=(await p.$$('.drslot.filled')).length;
      await p.evaluate(()=>{ const c=document.querySelector('.drslot.filled .card'); c.click(); c.click(); });
      const n1=(await p.$$('.drslot.filled')).length;
      if(n1!==n0-1) throw new Error('減らなかった '+n0+'→'+n1);
    });
    await check(pool+'：6体そろえて出撃', async()=>{
      for(let i=0;i<10;i++){
        const c=await p.$('.drpool .card:not(.used)'); if(!c) break;
        await c.click().catch(()=>{});
        const u=await p.$('.drpool .card.sel .drput');
        if(u) await u.click().catch(()=>{}); else break;
        if((await p.$$('.drslot.filled')).length>=6) break;
      }
      const go=await p.$('#done:not([disabled])'); if(!go) throw new Error('出撃ボタンが押せない');
      await go.click(); await p.waitForSelector('.b-spd',{timeout:20000});
    });
    if(errs.length) bad.push(pool+'：コンソールエラー '+errs[0]);
    await p.close();
  }
  await b.close();
  ok.forEach(s=>console.log('  ○ '+s));
  bad.forEach(s=>console.log('  ✗ '+s));
  console.log(bad.length? '失敗 '+bad.length+'件' : '全部 OK（'+ok.length+'項目）');
  process.exit(bad.length?1:0);
})();
