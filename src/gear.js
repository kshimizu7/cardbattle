/* =========================================================
   VORTEX OF THREE — 装備の元ネタ（街と探索ページの共通データ）
   ・武器／防具／装身具の素の性能
   ・呪いの種類と効き目
   ・拾いものの抽選、名前、効き目の一行、値付け
   このファイルは本編（index.html）と探索ページの両方に埋め込まれる。
   どちらか片方だけを直すと数字がずれるので、必ずここを直すこと。
   ========================================================= */
function grnd(){ return Math.random(); }
/* ================= 装備 =================
   宝箱から出るのは武器・防具・装身具。同じ品でも出来には幅があり（＋0〜＋3）、
   稀に呪われている。拾った時点では正体が分からず、身につけてはじめて分かる。 */
var GEAR = {
  weapon: [
    { b:'club',   n:'木の棍棒',     t:1, atk:1 },
    { b:'sword',  n:'鉄の剣',       t:1, atk:1 },
    { b:'axe',    n:'戦斧',         t:2, atk:2, spd:-1 },
    { b:'long',   n:'鋼の長剣',     t:2, atk:2 },
    { b:'silver', n:'銀の刃',       t:3, atk:3, spd:1 },
    { b:'fang',   n:'竜牙の剣',     t:4, atk:4 }
  ],
  armor: [
    { b:'leather',n:'革の胴',       t:1, hp:3 },
    { b:'chain',  n:'鎖帷子',       t:2, hp:5 },
    { b:'plate',  n:'鋼の胸当て',   t:3, hp:8, spd:-1 },
    { b:'mith',   n:'聖銀の鎧',     t:4, hp:11 }
  ],
  trinket: [
    { b:'ring',   n:'銅の環',       t:1, spd:1 },
    { b:'charm',  n:'木彫りの護符', t:1, hp:2 },
    { b:'pow',    n:'力の指輪',     t:2, atk:1 },
    { b:'boots',  n:'俊足の靴',     t:2, spd:2 },
    { b:'life',   n:'生命の護符',   t:3, hp:5 },
    { b:'sign',   n:'古びた聖印',   t:3, atk:1, hp:3 }
  ]
};
/* 呪い。品そのものは腕が立つことが多い。身につけるまで分からず、
   一度つけたらその探索のあいだ外せない（街での解呪は次の段） */
var CURSES = {
  drain: { n:'蝕む',   t:'戦いのたび、持ち主が削られる（戦闘後 -2）', atk:1 },
  heavy: { n:'重い',   t:'身体が思うように動かない（素早さ -3）',     spd:-3 },
  greed: { n:'貪る',   t:'傷薬の効きが半分になる',                    atk:1 },
  frail: { n:'脆い',   t:'守りが薄くなる（HP -4）',                   hp:-4 }
};
var SLOTNAME = { weapon:'武器', armor:'防具', t1:'装身具', t2:'装身具' };
var VAGUE = { weapon:'刃物のような何か', armor:'身を守る何か', trinket:'小さな品' };
var _gid = 1;
function rollGear(rar){
  var ks = ['weapon','armor','trinket'];
  var k = ks[Math.floor(grnd() * 3)];
  var top = rar === 3 ? 4 : rar === 2 ? 3 : 2;
  var cand = GEAR[k].filter(function(g){ return g.t <= top; });
  var pick = cand[Math.min(cand.length - 1,
    Math.floor(Math.pow(grnd(), rar === 3 ? 0.6 : rar === 2 ? 0.85 : 1.35) * cand.length))];
  var plus = 0, r2 = grnd();
  if (rar === 1) plus = r2 < 0.62 ? 0 : r2 < 0.92 ? 1 : 2;
  else if (rar === 2) plus = r2 < 0.34 ? 0 : r2 < 0.74 ? 1 : r2 < 0.94 ? 2 : 3;
  else plus = r2 < 0.16 ? 1 : r2 < 0.62 ? 2 : 3;
  var curse = null;
  if (grnd() < (rar === 3 ? 0.28 : rar === 2 ? 0.16 : 0.08)){
    var cks = Object.keys(CURSES);
    curse = cks[Math.floor(grnd() * cks.length)];
    plus = Math.max(plus, rar === 1 ? 1 : 2);
  }
  return { u:'g' + (_gid++), k:k, b:pick.b, plus:plus, curse:curse, idd:0 };
}
function gearDef(it){
  var pool = GEAR[it.k];
  for (var i = 0; i < pool.length; i++) if (pool[i].b === it.b) return pool[i];
  return pool[0];
}
function gearStats(it){
  var d = gearDef(it), c = it.curse ? CURSES[it.curse] : null;
  var atk = d.atk || 0, hp = d.hp || 0, spd = d.spd || 0;
  /* ＋値は、その品がいちばん得意な数字に乗る */
  if (it.plus){
    if (d.atk) atk += it.plus;
    else if (d.hp) hp += it.plus;
    else if (d.spd) spd += it.plus;
  }
  return {
    atk: atk + ((c && c.atk) || 0),
    hp:  hp  + ((c && c.hp)  || 0),
    spd: spd + ((c && c.spd) || 0)
  };
}
function gearName(it){
  if (!it.idd) return VAGUE[it.k] + '？';
  return (it.curse ? CURSES[it.curse].n : '') + gearDef(it).n + (it.plus ? '＋' + it.plus : '');
}
function gearLine(it){
  if (!it.idd) return '正体は、身につけてみるまで分からない';
  var s = gearStats(it), out = [];
  if (s.atk) out.push('攻撃 ' + (s.atk > 0 ? '+' : '') + s.atk);
  if (s.hp)  out.push('HP ' + (s.hp > 0 ? '+' : '') + s.hp);
  if (s.spd) out.push('素早さ ' + (s.spd > 0 ? '+' : '') + s.spd);
  if (it.curse) out.push('呪：' + CURSES[it.curse].t);
  return out.join('／') || 'これといった効き目はない';
}
function gearBonus(p){
  var b = { atk:0, hp:0, spd:0 };
  ['weapon','armor','t1','t2'].forEach(function(sl){
    var it = p.eq && p.eq[sl];
    if (!it) return;
    var s = gearStats(it);
    b.atk += s.atk; b.hp += s.hp; b.spd += s.spd;
  });
  return b;
}
/* 装備が変わると最大HPも変わる。増えた分は、そのまま体力になる */
function applyGear(p){
  var was = p.mx;
  p.mx = Math.max(1, (p.base || p.mx) + gearBonus(p).hp);
  if (p.mx > was) p.hp += (p.mx - was);
  p.hp = Math.max(0, Math.min(p.mx, p.hp));
}
function hasCurse(p, ck){
  return ['weapon','armor','t1','t2'].some(function(sl){
    var it = p.eq && p.eq[sl];
    return it && it.idd && it.curse === ck;
  });
}


/* 値打ち。等級と＋値で決まる。呪われた品は、正体が知れていれば買い叩かれる */
function gearValue(it){
  var d = gearDef(it);
  var v = 18 * d.t + 22 * (it.plus || 0);
  if (it.idd && it.curse) v = Math.round(v * 0.5);
  return Math.max(8, v);
}
function gearSell(it){
  return it.idd ? Math.max(4, Math.round(gearValue(it) / 3)) : 12;  /* 見ずに売れば、二束三文 */
}
if (typeof module !== 'undefined' && module.exports)
  module.exports = { GEAR:GEAR, CURSES:CURSES, SLOTNAME:SLOTNAME, VAGUE:VAGUE,
    rollGear:rollGear, gearDef:gearDef, gearStats:gearStats, gearName:gearName,
    gearLine:gearLine, gearValue:gearValue, gearSell:gearSell };
