/* 「前衛のいない後衛」がどれくらい得をしているかを測る */
const CB=require('../src/engine.js'); global.CB=CB; const AI=require('../src/ai.js');
const POOL = process.argv[2] || 'full';
const N    = +(process.argv[3] || 600);
CB.setPool(POOL);
const pool=CB.poolIds(), HS=CB.handSize();
function playable(h){const c=h.map(i=>CB.BY_ID[i].cost).sort((a,b)=>a-b);
  let s=0;for(let i=0;i<CB.MIN_UNITS;i++)s+=c[i];return s<=CB.costCap();}
function deal(seed){const rnd=CB.mulberry32(seed);
  const indep=pool.length<HS*2;
  for(let t=0;t<300;t++){let h1,h2;
    if(indep){h1=CB.shuffle(pool,rnd).slice(0,HS);h2=CB.shuffle(pool,rnd).slice(0,HS);}
    else{const d=CB.shuffle(pool,rnd);h1=d.slice(0,HS);h2=d.slice(HS,HS*2);}
    if(playable(h1)&&playable(h2))return{hands:[h1,h2],rnd};}
  return {hands:[pool.slice(0,HS),pool.slice(0,HS)],rnd};}

let form={}, prot={cov:{n:0,alive:0,hp:0,max:0},bare:{n:0,alive:0,hp:0,max:0}};
let advanced={cov:0,bare:0}, teams=0;

for(let s=1;s<=N;s++){
  const {hands,rnd}=deal(s);
  const tA=AI.buildTeam(hands[0],'normal',rnd), tB=AI.buildTeam(hands[1],'normal',rnd);
  const st=CB.createState(tA,tB);
  // 開始時の配置を記録
  const start={};
  CB.allUnits(st).forEach(u=>{
    const front = CB.allUnits(st).find(v=>v.side===u.side&&v.row===0&&v.col===u.col);
    start[u.uid]={row:u.row,col:u.col,covered:!!front,max:u.maxHp!=null?u.maxHp:u.hp};
  });
  [tA,tB].forEach(t=>{
    teams++;
    const f=t.filter(c=>c.row===0).length, b=t.length-f;
    const key=`前${f}/後${b}`; form[key]=(form[key]||0)+1;
  });
  let g=0;
  while(st.phase!=='ended'&&g++<3000){
    const u=CB.currentActor(st); if(!u){CB.endRound(st);continue;}
    const ch=AI.chooseAction(st,u,'normal');
    CB.performAction(st,u,ch.actionKey,ch.target);
    if(st.phase==='ended')break;
    CB.nextTurn(st); if(!CB.currentActor(st))CB.endRound(st);
  }
  CB.allUnits(st).forEach(u=>{
    const s0=start[u.uid]; if(!s0||s0.row!==1)return;
    const k=s0.covered?'cov':'bare';
    prot[k].n++; if(u.alive)prot[k].alive++;
    prot[k].hp+=Math.max(0,u.hp); prot[k].max+=s0.max;
    if(u.row===0) advanced[k]++;
  });
}
const pc=(a,b)=>b?(a/b*100).toFixed(1)+'%':'-';
console.log(`プール=${POOL}  ${N}戦  チーム数=${teams}\n`);
console.log('【開始時の陣形】');
Object.entries(form).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
  console.log(`  ${k}  ${String(v).padStart(4)}  ${pc(v,teams)}`));
console.log('\n【後衛スタートのユニットのその後】');
console.log(`  前衛あり(守られている)  ${String(prot.cov.n).padStart(4)}体  生存 ${pc(prot.cov.alive,prot.cov.n)}  残HP率 ${pc(prot.cov.hp,prot.cov.max)}  前進した ${pc(advanced.cov,prot.cov.n)}`);
console.log(`  前衛なし(むき出し)      ${String(prot.bare.n).padStart(4)}体  生存 ${pc(prot.bare.alive,prot.bare.n)}  残HP率 ${pc(prot.bare.hp,prot.bare.max)}  前進した ${pc(advanced.bare,prot.bare.n)}`);
