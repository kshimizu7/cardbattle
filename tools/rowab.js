/* 現行ルール vs 「前衛のいない後衛は前に出す」ルール を同じ手札で比較 */
const CB=require('../src/engine.js'); global.CB=CB; const AI=require('../src/ai.js');
const POOL=process.argv[2]||'full', N=+(process.argv[3]||800);
CB.setPool(POOL);
const pool=CB.poolIds(), HS=CB.handSize();
function playable(h){const c=h.map(i=>CB.BY_ID[i].cost).sort((a,b)=>a-b);
  let s=0;for(let i=0;i<CB.MIN_UNITS;i++)s+=c[i];return s<=CB.costCap();}
function deal(seed){const rnd=CB.mulberry32(seed);const indep=pool.length<HS*2;
  for(let t=0;t<300;t++){let h1,h2;
    if(indep){h1=CB.shuffle(pool,rnd).slice(0,HS);h2=CB.shuffle(pool,rnd).slice(0,HS);}
    else{const d=CB.shuffle(pool,rnd);h1=d.slice(0,HS);h2=d.slice(HS,HS*2);}
    if(playable(h1)&&playable(h2))return{hands:[h1,h2],rnd};}
  return{hands:[pool.slice(0,HS),pool.slice(0,HS)],rnd};}

/* 提案ルール：前衛が空いている列の後衛を前へ出す（左詰め） */
function compact(team){
  const t=team.map(c=>({...c}));
  for(let col=0;col<3;col++){
    if(t.some(c=>c.row===0&&c.col===col))continue;
    const b=t.find(c=>c.row===1&&c.col===col);
    if(b)b.row=0;
  }
  return t;
}
function run(tA,tB){
  const st=CB.createState(tA,tB); let g=0;
  while(st.phase!=='ended'&&g++<3000){
    const u=CB.currentActor(st); if(!u){CB.endRound(st);continue;}
    const ch=AI.chooseAction(st,u,'normal');
    CB.performAction(st,u,ch.actionKey,ch.target);
    if(st.phase==='ended')break;
    CB.nextTurn(st); if(!CB.currentActor(st))CB.endRound(st);
  }
  return st;
}
const S={cur:{w:0,d:0,rounds:0},nw:{w:0,d:0,rounds:0}};
const per={};   // キャラ別 勝率
let changed=0, teams=0;
function note(mode,team,win){
  team.forEach(c=>{ per[c.id]=per[c.id]||{cur:[0,0],nw:[0,0]};
    per[c.id][mode][0]+=win?1:0; per[c.id][mode][1]++; });
}
for(let s=1;s<=N;s++){
  const {hands,rnd}=deal(s);
  const tA=AI.buildTeam(hands[0],'normal',CB.mulberry32(s*7+1));
  const tB=AI.buildTeam(hands[1],'normal',CB.mulberry32(s*7+2));
  teams+=2;
  const cA=compact(tA), cB=compact(tB);
  if(JSON.stringify(cA)!==JSON.stringify(tA))changed++;
  if(JSON.stringify(cB)!==JSON.stringify(tB))changed++;
  [['cur',tA,tB],['nw',cA,cB]].forEach(([m,x,y])=>{
    const st=run(x,y);
    S[m].rounds+=st.round;
    if(st.winner===0){S[m].w++; note(m,x,true); note(m,y,false);}
    else if(st.winner===1){note(m,x,false); note(m,y,true);}
    else {S[m].d++; note(m,x,false); note(m,y,false);}
  });
}
const p=(a,b)=>b?(a/b*100):0;
console.log(`プール=${POOL}  ${N}戦\n`);
console.log(`陣形が変わったチーム : ${changed}/${teams}  (${p(changed,teams).toFixed(1)}%)`);
console.log(`平均ラウンド数       : 現行 ${(S.cur.rounds/N).toFixed(2)}  →  新 ${(S.nw.rounds/N).toFixed(2)}`);
console.log(`引き分け             : 現行 ${p(S.cur.d,N).toFixed(1)}%  →  新 ${p(S.nw.d,N).toFixed(1)}%`);
console.log(`先手勝率             : 現行 ${p(S.cur.w,N).toFixed(1)}%  →  新 ${p(S.nw.w,N).toFixed(1)}%`);
console.log('\n【キャラ別 勝率の変化（登場30回以上・変化の大きい順）】');
Object.entries(per).filter(([,v])=>v.cur[1]>=30&&v.nw[1]>=30)
 .map(([id,v])=>({id,name:(CB.BY_ID[id]||{}).name||id,
   a:p(v.cur[0],v.cur[1]),b:p(v.nw[0],v.nw[1]),n:v.cur[1]}))
 .map(o=>({...o,d:o.b-o.a}))
 .sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,14)
 .forEach(o=>console.log(`  ${o.name.padEnd(7,'　')} ${o.a.toFixed(1).padStart(5)}% → ${o.b.toFixed(1).padStart(5)}%  ${(o.d>=0?'+':'')+o.d.toFixed(1)}pt  (n=${o.n})`));
