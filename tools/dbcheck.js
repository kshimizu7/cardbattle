/* =========================================================
   docs/データ/*.csv と、実際のゲーム（src/engine.js）のズレを調べる。
     node tools/dbcheck.js
   台帳を直したあとに走らせれば「台帳ではこう、ゲームではこう」が並ぶ。
   ========================================================= */
var fs = require('fs'), path = require('path');
var DIR = path.join(__dirname, '..', 'docs', 'データ');
var CB = require(path.join(__dirname, '..', 'src', 'engine.js'));
CB.setPool('full');

function readCsv(name){
  var t = fs.readFileSync(path.join(DIR, name), 'utf8').replace(/^﻿/, '');
  var rows = [], cur = [], f = '', q = false;
  for (var i = 0; i < t.length; i++){
    var c = t[i];
    if (q){ if (c === '"'){ if (t[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ','){ cur.push(f); f = ''; }
    else if (c === '\n'){ cur.push(f); f = ''; rows.push(cur); cur = []; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || cur.length){ cur.push(f); rows.push(cur); }
  var head = rows.shift();
  return rows.filter(function(r){ return r.join('').trim(); }).map(function(r){
    var o = {}; head.forEach(function(h, j){ o[h] = (r[j] || '').trim(); }); return o;
  });
}
var SIZE = { s:'小', m:'中', l:'大' };
var RACE = { '人':'人', '獣':'獣', '竜':'竜', '精':'精霊', '神':'神獣', '邪':'邪', '物':'無生物' };

var chars = readCsv('キャラクター.csv'), byId = {};
chars.forEach(function(c){ byId[c.id] = c; });

var game = {};
CB.ROSTER.forEach(function(d){
  game[d.id] = { ja:d.name, en:d.en, tier:d.tier || '', size:SIZE[d.size] || '',
                 race:RACE[d.line] || d.line, base:d.base || '', up:d.up || '',
                 where:d.retired ? '引退' : (d.noDeck ? '敵専用' : '実装済') };
});
(Array.isArray(CB.TEASERS) ? CB.TEASERS
  : Object.keys(CB.TEASERS).map(function(k){ return CB.TEASERS[k]; })).forEach(function(d){
  game[d.id] = { ja:d.name, en:d.en, tier:d.tier || '', size:'',
                 race:RACE[d.line] || d.line, base:d.base || '', up:d.up || '',
                 where:'次段（絵と名のみ）' };
});

var bad = [];
function ng(id, what, csv, gm){
  bad.push('  ' + (id + '              ').slice(0, 15) + what + ' … 台帳「' + csv + '」／ゲーム「' + gm + '」');
}
Object.keys(game).forEach(function(id){
  var c = byId[id], g = game[id];
  if (!c){ bad.push('  ' + id + ' … ゲームにいるが、台帳に無い（' + g.ja + '）'); return; }
  if (c['日本語名'] !== g.ja) ng(id, '日本語名', c['日本語名'], g.ja);
  if (c['英語名']   !== g.en) ng(id, '英語名  ', c['英語名'], g.en);
  if (String(c['段']) !== String(g.tier)) ng(id, '段    ', c['段'] || '(空)', g.tier || '(空)');
  if (g.size && c['体格'] !== g.size) ng(id, '体格  ', c['体格'], g.size);
  if (c['種族'] !== g.race) ng(id, '種族  ', c['種族'], g.race);
  if (c['前の段'] !== g.base) ng(id, '前の段', c['前の段'] || '(空)', g.base || '(空)');
  if (c['次の段'] !== g.up)   ng(id, '次の段', c['次の段'] || '(空)', g.up || '(空)');
  if (c['状態'] !== g.where)  ng(id, '状態  ', c['状態'], g.where);
});
var plan = chars.filter(function(c){ return !game[c.id]; });
console.log('■ キャラクター … 台帳 ' + chars.length + ' 行／ゲーム ' + Object.keys(game).length + ' 体');
if (plan.length) console.log('  構想（台帳にだけある）: ' + plan.map(function(c){ return c['日本語名']; }).join('・'));
if (bad.length){ console.log('▲ ズレ ' + bad.length + ' 件'); console.log(bad.join('\n')); }
else console.log('  ズレなし');

var eq = readCsv('装備可否.csv'), types = readCsv('装備分類.csv'), items = readCsv('装備品目.csv');
var names = types.map(function(t){ return t['日本語名']; }), eqbad = [];
eq.forEach(function(r){
  if (!byId[r['系譜id']]) eqbad.push('  ' + r['系譜id'] + ' … キャラクター.csv に無いid');
  names.forEach(function(n){
    var v = r[n];
    if (v === '') eqbad.push('  ' + r['系譜id'] + ' の ' + n + ' … 未定（空欄）');
    else if (v !== '○' && v !== '－') eqbad.push('  ' + r['系譜id'] + ' の ' + n + ' … 「' + v + '」は○／－ではない');
  });
});
var used = {}, none = [];
items.forEach(function(it){
  if (it['分類'] === '（未分類）'){ none.push(it['日本語名']); return; }
  if (names.indexOf(it['分類']) < 0) eqbad.push('  品「' + it['日本語名'] + '」… 分類「' + it['分類'] + '」が装備分類.csv に無い');
  used[it['分類']] = (used[it['分類']] || 0) + 1;
});
var empty = names.filter(function(n){ return !used[n]; });
console.log('■ 装備 … 分類 ' + types.length + ' 種／系譜 ' + eq.length + ' 本／品 ' + items.length + ' 点');
if (empty.length) console.log('  品が1つも無い分類: ' + empty.join('・'));
if (none.length)  console.log('  分類の決まっていない品: ' + none.join('・'));
if (eqbad.length){ console.log('▲ ' + eqbad.length + ' 件'); console.log(eqbad.join('\n')); }
else console.log('  可否の表は全部埋まっています');
