/* プール別バランス検証 */
const CB=require('../src/engine.js'); global.CB=CB; const AI=require('../src/ai.js');
const POOL = process.argv[3] || 'starter';
CB.setPool(POOL);
const pool = CB.poolIds(), HS = CB.handSize();
function playable(h){const c=h.map(i=>CB.BY_ID[i].cost).sort((a,b)=>a-b);let s=0;for(let i=0;i<CB.MIN_UNITS;i++)s+=c[i];return s<=CB.COST_CAP;}
function deal(seed, force){
  const rnd=CB.mulberry32(seed);
  const indep = pool.length < HS*2;
  for(let t=0;t<300;t++){
    let h1,h2;
    if(indep){ h1=CB.shuffle(pool,rnd).slice(0,HS); h2=CB.shuffle(pool,rnd).slice(0,HS); }
    else { const d=CB.shuffle(pool,rnd); h1=d.slice(0,HS); h2=d.slice(HS,HS*2); }
    if(force && h1.indexOf(force)<0){ h1=h1.slice(0,HS-1); h1.unshift(force); }
    if(playable(h1)&&playable(h2))return{hands:[h1,h2],rnd};
  }
  return {hands:[pool.slice(0,HS),pool.slice(0,HS)],rnd};
}
function play(seed,force,diff){
  const {hands,rnd}=deal(seed,force);
  const tA=AI.buildTeam(hands[0],diff,rnd,force), tB=AI.buildTeam(hands[1],diff,rnd);
  const st=CB.createState(tA,tB); let g=0;
  while(st.phase!=='ended'&&g++<3000){
    const u=CB.currentActor(st); if(!u){CB.endRound(st);continue;}
    const ch=AI.chooseAction(st,u,diff);
    CB.performAction(st,u,ch.actionKey,ch.target);
    if(st.phase==='ended')break;
    CB.nextTurn(st); if(!CB.currentActor(st))CB.endRound(st);
  }
  return {st, included:tA.some(c=>c.id===force)};
}
const N=+process.argv[2]||600, diff='hard';
let base=0,r=0,ko=0,units=0,teams=0;
for(let i=0;i<N;i++){const{st}=play(i*7919+3,null,diff);if(st.winner===0)base++;else if(st.winner===null)base+=.5;r+=st.round;if(st.result.how==='KO')ko++;
  units+=st.players[0].units.length+st.players[1].units.length; teams+=2;}
console.log(`[${POOL}] ${pool.length}枚/手札${HS}枚  ベース ${(base/N*100).toFixed(1)}%  平均${(r/N).toFixed(2)}R  全滅${(ko/N*100).toFixed(1)}%  平均出撃${(units/teams).toFixed(2)}体\n`);
const res=[];
for(const id of pool){
  let w=0,n=0;
  for(let i=0;i<N;i++){const{st,included}=play(i*104729+11,id,diff);if(!included)continue;n++;
    if(st.winner===0)w++;else if(st.winner===null)w+=.5;}
  res.push({id,name:CB.BY_ID[id].name,cost:CB.BY_ID[id].cost,wr:n?w/n*100:0,n});
}
res.sort((a,b)=>b.wr-a.wr);
console.log('名前            C  採用時勝率');
res.forEach(x=>console.log((x.name+'            ').slice(0,12)+String(x.cost).padStart(3)+x.wr.toFixed(1).padStart(8)+'%  '+'█'.repeat(Math.max(0,Math.round((x.wr-38)/1.1)))));
const v=res.map(x=>x.wr),m=v.reduce((a,b)=>a+b,0)/v.length;
console.log(`\n平均 ${m.toFixed(1)}%  レンジ ${Math.min(...v).toFixed(1)}〜${Math.max(...v).toFixed(1)}  SD ${Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length).toFixed(2)}`);
console.log('RATING_STARTER = {' + res.map(x=>x.id+':'+x.wr.toFixed(1)).join(', ') + '};');
