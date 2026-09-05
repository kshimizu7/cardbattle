/* =========================================================
   docs/データ/ の台帳を組み直す。
     node tools/dbgen.js
   ふだんは CSV を手で直してよい（ズレは tools/dbcheck.js で見る）。
   これは作り直したいときだけ。手で決めたことは下の表に書いてあるので消えない。
   ========================================================= */
var fs = require('fs'), path = require('path');
var DIR = path.join(__dirname, '..', 'docs', 'データ');
var CB = require(path.join(__dirname, '..', 'src', 'engine.js'));
CB.setPool('full');
try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {}

var q = function (s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
var w = function (name, head, rows) {
  fs.writeFileSync(path.join(DIR, name), '﻿' + head.map(q).join(',') + '\n'
    + rows.map(function (r) { return r.map(q).join(','); }).join('\n') + '\n');
};

/* ---------- キャラクター ---------- */
var RACE = { '人':['人','Human'], '獣':['獣','Beast'], '竜':['竜','Dragon'],
             '精':['精霊','Spirit'], '神':['神獣','Divine'], '邪':['邪','Profane'], '物':['無生物','Construct'] };
var SIZE = { s:['小','Small'], m:['中','Medium'], l:['大','Large'] };
var PR   = { order:['秩序','Order'], life:['生命','Life'], spirit:['精神','Spirit'], other:['その他','Other'] };

/* 理は系譜（一の段）で決まる */
var LINEAGE = {
  knight:'order', warrior:'order', shieldguard:'order', archer:'order', spearman:'order',
  bard:'order', rogue:'order', mage:'order', shaman:'order', priest:'order',
  ogre:'life', troll:'life', werewolf:'life', harpy:'life', valkyrie:'life', whelp:'life',
  salamander:'spirit', frost:'spirit', yeti:'spirit',
  sylph:'spirit', undine:'spirit', impundulu:'spirit', dryad:'spirit',
  golem:'other'
};
/* 次段・構想の体格（2026-08-29 に決めたもの） */
var SIZE_PLAN = {
  paladinking:'s', grandsage:'s', saint:'s', phantom:'s', divinearcher:'s',
  royalguard:'s', kingshield:'s', warfiend:'s', shadowblade:'s', skald:'s', bragi:'s',
  necromancer:'s', lich:'s',
  ancient:'l', colossus:'l', ancientdragon:'l', phoenix:'l', jotunn:'l', odin:'m'
};
/* 台帳にだけある者 */
var PLAN = [
  ['spearmaster','槍術士','Spearmaster',2,'s','人','spearman','dragonslayer','spearman'],
  ['dragonslayer','竜殺し','Dragonslayer',3,'s','人','spearmaster','','spearman'],
  ['sylph','シルフ','Sylph',1,'s','精','','aiolos','sylph'],
  ['aiolos','アイオロス','Aiolos',2,'l','神','sylph','','sylph'],
  ['undine','ウンディーネ','Undine',1,'s','精','','leviathan','undine'],
  ['leviathan','リヴァイアサン','Leviathan',2,'l','神','undine','','undine'],
  ['impundulu','インプンドゥル','Impundulu',1,'s','精','','thor','impundulu'],
  ['thor','トール','Thor',2,'l','神','impundulu','','impundulu'],
  ['dryad','ドライアド','Dryad',1,'s','精','','ent','dryad'],
  ['ent','エント','Ent',2,'l','神','dryad','','dryad']
];
var NOTE = {
  spearman:'段を持たない単体（上位は構想）', ogre:'段を持たない単体', troll:'段を持たない単体',
  werewolf:'段を持たない単体', harpy:'段を持たない単体',
  yeti:'引退。データは残してある（戻したくなったら戻せる）',
  dragon:'手札には来ない。敵としてのみ現れる',
  shaman:'系統は邪悪系だが、理は秩序 Order', necromancer:'系統は邪悪系だが、理は秩序 Order',
  lich:'系統は邪悪系だが、理は秩序 Order',
  valkyrie:'出自は神獣。獣の皮ではなく軽鎧を着る', odin:'出自は神獣',
  phoenix:'出自は精霊、系統は神獣系', jotunn:'出自は精霊、系統は神獣系', bragi:'出自は人、系統は神獣系'
};
var BY = {}; CB.ROSTER.forEach(function (d) { BY[d.id] = d; });
var TZ = {};
(Array.isArray(CB.TEASERS) ? CB.TEASERS : Object.keys(CB.TEASERS).map(function (k) { return CB.TEASERS[k]; }))
  .forEach(function (d) { TZ[d.id] = d; });
function rootOf(id) {
  var d = BY[id] || TZ[id], g = 0;
  while (d && d.base && g++ < 10) d = BY[d.base] || TZ[d.base];
  return d ? d.id : id;
}
var rows = [];
CB.ROSTER.forEach(function (d) {
  rows.push([d.id, d.name, d.en, d.tier || '', d.size || '', d.line, d.base || '', d.up || '',
             rootOf(d.id), d.retired ? '引退' : (d.noDeck ? '敵専用' : '実装済')]);
});
Object.keys(TZ).forEach(function (k) {
  var d = TZ[k];
  rows.push([d.id, d.name, d.en, d.tier || '', SIZE_PLAN[d.id] || '', d.line, d.base || '', d.up || '',
             rootOf(d.id), '次段（絵と名のみ）']);
});
PLAN.forEach(function (p) {
  rows.push([p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], '構想（未実装）']);
});
w('キャラクター.csv',
  ['id','日本語名','英語名','段','体格','体格_en','種族','種族_en','理','理_en','前の段','次の段','系譜','状態','備考'],
  rows.map(function (r) {
    var sz = SIZE[r[4]] || ['',''], rc = RACE[r[5]] || [r[5],''], pr = PR[LINEAGE[r[8]]] || ['',''];
    return [r[0], r[1], r[2], r[3], sz[0], sz[1], rc[0], rc[1], pr[0], pr[1], r[6], r[7], r[8], r[9], NOTE[r[0]] || ''];
  }));

/* ---------- 装備 ---------- */
var TYPES = [
  ['sword','武器','Weapon','剣','Sword'], ['dagger','武器','Weapon','短剣','Dagger'],
  ['maul','武器','Weapon','大槌','Maul'], ['bow','武器','Weapon','弓','Bow'],
  ['spear','武器','Weapon','槍','Spear'], ['staff','武器','Weapon','杖','Staff'],
  ['claw','武器','Weapon','鉤爪','Claw'], ['lute','武器','Weapon','楽器','Instrument'],
  ['plate','防具','Armor','鎧','Plate Armor'], ['light','防具','Armor','軽鎧','Light Armor'],
  ['robe','防具','Armor','ローブ','Robe'], ['hide','防具','Armor','獣の皮','Beast Hide'],
  ['sigil','装身具','Accessory','印章','Sigil'], ['talisman','装身具','Accessory','護符','Talisman'],
  ['core','装身具','Accessory','霊核','Spirit Core']
];
w('装備分類.csv', ['id','区分','区分_en','日本語名','英語名'], TYPES);

var M = {
  knight:'sword,dagger,spear,plate,light,sigil', warrior:'sword,dagger,maul,plate,light,sigil',
  shieldguard:'sword,dagger,plate,light,sigil', archer:'bow,light,sigil',
  spearman:'spear,plate,light,sigil', bard:'lute,robe,sigil', rogue:'dagger,light,sigil',
  mage:'dagger,staff,robe,sigil', shaman:'staff,robe,sigil', priest:'staff,robe,sigil',
  ogre:'sword,maul,plate,light,talisman', troll:'maul,hide,talisman',
  werewolf:'claw,light,hide,talisman', harpy:'claw,hide,talisman',
  valkyrie:'sword,bow,spear,plate,light,talisman', whelp:'claw,talisman',
  salamander:'core', frost:'core', yeti:'core', sylph:'core', undine:'core', impundulu:'core', dryad:'core',
  golem:'maul'
};
w('装備可否.csv', ['系譜id'].concat(TYPES.map(function (t) { return t[3]; })),
  Object.keys(M).map(function (id) {
    var ok = {}; M[id].split(',').forEach(function (k) { ok[k] = 1; });
    return [id].concat(TYPES.map(function (t) { return ok[t[0]] ? '○' : '－'; }));
  }));

var ITEMS = [
  ['club','大槌','木の棍棒','Wooden Club',1,'攻撃+1',''],
  ['sword','剣','鉄の剣','Iron Sword',1,'攻撃+1',''],
  ['axe','大槌','戦斧','Battle Axe',2,'攻撃+2／素早さ-1','斧の分類を作るなら、そちらへ'],
  ['long','剣','鋼の長剣','Steel Longsword',2,'攻撃+2',''],
  ['silver','剣','銀の刃','Silver Blade',3,'攻撃+3／素早さ+1','短剣寄りにも読める'],
  ['fang','剣','竜牙の剣','Dragonfang Sword',4,'攻撃+4',''],
  ['leather','軽鎧','革の胴','Leather Vest',1,'HP+3',''],
  ['chain','軽鎧','鎖帷子','Chain Mail',2,'HP+5','鎧に寄せてもよい'],
  ['plate','鎧','鋼の胸当て','Steel Cuirass',3,'HP+8／素早さ-1',''],
  ['mith','鎧','聖銀の鎧','Mithril Armor',4,'HP+11',''],
  ['ring','（未分類）','銅の環','Copper Ring',1,'素早さ+1','指輪。印章／護符/霊核のどれにも入らない'],
  ['charm','護符','木彫りの護符','Wooden Charm',1,'HP+2',''],
  ['pow','（未分類）','力の指輪','Ring of Might',2,'攻撃+1','指輪。分類なし'],
  ['boots','（未分類）','俊足の靴','Swift Boots',2,'素早さ+2','靴。分類なし'],
  ['life','護符','生命の護符','Charm of Life',3,'HP+5',''],
  ['sign','印章','古びた聖印','Old Holy Sign',3,'攻撃+1／HP+3','']
];
w('装備品目.csv', ['id','分類','日本語名','英語名','等級','効き目','備考'], ITEMS);

/* ---------- 用語 ---------- */
var LEX = [
  ['理','order','秩序','Order','三つの原理のひとつ。文明と規律。極まれば支配になる'],
  ['理','life','生命','Life','三つの原理のひとつ。生きる力。極まれば捕食と破壊になる'],
  ['理','spirit','精神','Spirit','三つの原理のひとつ。調和。極まれば個を消してしまう'],
  ['理','other','その他','Other','三原理のどれにも属さない。いまはゴーレム系のみ'],
  ['系統','人','人系','Human','万能。突出した欠点も長所もない'],
  ['系統','獣','獣系','Beast','はっきりした欠点と、その分だけ大きい長所をセットで持つ'],
  ['系統','神','神獣系','Divine','倒れても終わらない。復活・蘇生・再行動のどれかを持つ'],
  ['系統','物','無生物系','Construct','回復がいっさい効かない。代わりに固定ダメージ軽減が大きい'],
  ['系統','竜','竜系','Dragon','全員が竜鱗を持ち、広範囲のブレスを扱う'],
  ['系統','邪','邪悪系','Profane','相手の不幸が自分の得になる。吸血・呪詛・弱体化'],
  ['系統','精','精霊系','Spirit','実体を持たず場に干渉する。属性魔法とオーラ'],
  ['体格','s','小','Small','どの迷宮にも入れる'],
  ['体格','m','中','Medium','小の迷宮には入れない'],
  ['体格','l','大','Large','大の迷宮にしか入れない'],
  ['段','1','一の段','Tier 1','はじめの姿'],
  ['段','2','二の段','Tier 2','次の姿'],
  ['段','3','三の段','Tier 3','極まった姿'],
  ['属性','steel','鋼','Steel',''], ['属性','fire','炎','Fire',''], ['属性','ice','氷','Ice',''],
  ['属性','wind','風','Wind',''], ['属性','holy','聖','Holy',''], ['属性','arcane','秘','Arcane',''],
  ['属性','shadow','影','Shadow',''], ['属性','blood','血','Blood',''], ['属性','earth','地','Earth',''],
  ['役割','melee','前衛','Melee',''], ['役割','tank','盾役','Tank',''], ['役割','ranged','射手','Ranged',''],
  ['役割','caster','術者','Caster',''], ['役割','support','支え手','Support',''],
  ['装備枠','weapon','武器','Weapon','いまのゲームの枠。1人1枠'],
  ['装備枠','armor','防具','Armor','いまのゲームの枠。1人1枠'],
  ['装備枠','t1','装身具1','Accessory 1','いまのゲームの枠'],
  ['装備枠','t2','装身具2','Accessory 2','いまのゲームの枠'],
  ['状態','live','実装済','Implemented','闘技場で使える'],
  ['状態','enemy','敵専用','Enemy only','手札には来ない。敵としてのみ現れる'],
  ['状態','retired','引退','Retired','データは残すが出さない（イエティ）'],
  ['状態','teaser','次段（絵と名のみ）','Teaser','図鑑の「段」に名前だけ出る。能力は未実装'],
  ['状態','plan','構想（未実装）','Planned','この台帳にだけある']
];
w('用語.csv', ['区分','id','日本語','英語','説明'], LEX);

console.log('書きました … キャラクター ' + rows.length + ' 行／分類 ' + TYPES.length
  + '／可否 ' + Object.keys(M).length + '／品目 ' + ITEMS.length + '／用語 ' + LEX.length);
