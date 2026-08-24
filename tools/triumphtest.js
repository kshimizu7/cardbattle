/* ヴァルキリーの凱歌が、殉教での復活とどう噛み合うかを調べる */
const CB=require('../src/engine.js'); global.CB=CB; const AI=require('../src/ai.js');
CB.setPool('full');
const N=+(process.argv[2]||300);
let kills=0, granted=0, extraDone=0, revives=0, sameTurnRevive=0;
const log=[];
for(let s=1;s<=N;s++){
  const tA=[{id:'valkyrie',row:0,col:1},{id:'knight',row:0,col:0},{id:'shieldguard',row:0,col:2},
            {id:'archer',row:1,col:0},{id:'mage',row:1,col:1},{id:'priest',row:1,col:2}];
  const tB=[{id:'golem',row:0,col:1},{id:'ogre',row:0,col:0},{id:'troll',row:0,col:2},
            {id:'highpriest',row:1,col:1},{id:'archer',row:1,col:0},{id:'rogue',row:1,col:2}];
  const st=CB.createState(tA,tB,{rnd:CB.mulberry32(s),coin:0});
  let g=0;
  while(st.phase!=='ended'&&g++<3000){
    const u=CB.currentActor(st); if(!u){CB.endRound(st);continue;}
    const ch=AI.chooseAction(st,u,'normal');
    CB.performAction(st,u,ch.actionKey,ch.target);
    const died=st.events.filter(e=>e.type==='death');
    const rev =st.events.filter(e=>e.type==='revive');
    revives+=rev.length;
    if(rev.length && died.length) sameTurnRevive++;
    if(u.defId==='valkyrie' && died.length){
      kills+=died.length;
      if(u.flags.extraTurn){ granted++;
        const nx=CB.nextTurn(st);
        if(nx && nx.uid===u.uid) extraDone++;
        else log.push('凱歌が付いたのに次が本人でない: '+(nx?nx.def.name:'なし'));
        if(!CB.currentActor(st))CB.endRound(st);
        if(st.phase==='ended')break;
        continue;
      } else if(!u.flags.triumphUsed) log.push('倒したのに凱歌が付かない（未使用なのに）');
    }
    if(st.phase==='ended')break;
    CB.nextTurn(st); if(!CB.currentActor(st))CB.endRound(st);
  }
}
console.log('ヴァルキリーの撃破', kills, '／凱歌が付いた', granted, '／実際に2回目を行動', extraDone);
console.log('復活イベント', revives, '／同じターンに死亡と復活が同居', sameTurnRevive);
console.log('異常ログ', log.length ? log.slice(0,5) : 'なし');
