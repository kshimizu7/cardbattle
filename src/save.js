/* =========================================================
   ARCANA CLASH — セーブ（戦績・設定・保存編成）
   ・localStorage に保存する。使えない環境（file:// の一部端末）では
     メモリ上だけに持ち、その旨を UI 側から知らせる。
   ・書き出し／読み込み用のコード文字列にも変換できる。
   ========================================================= */
var CBSAVE = (function () {
  'use strict';

  var KEY = 'arcanaclash.save.v1';
  var MAX_GAMES = 200;          // 履歴の上限。古いものから捨てる
  var MAX_DECKS = 20;
  var MAX_REPS  = 30;           // 再現データ。多すぎると保存領域を圧迫する

  var store = null;             // localStorage か、使えなければ null
  var mem = null;               // localStorage が使えないときの置き場
  var warned = false;

  try {
    var t = '__ac_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    store = window.localStorage;
  } catch (e) { store = null; }

  function blank() {
    return { v: 1, created: Date.now(), games: [], decks: [], settings: {}, reps: [], rpg: { coin: 0, clears: {} } };
  }

  function normalize(d) {
    if (!d || typeof d !== 'object') return blank();
    if (!Array.isArray(d.games)) d.games = [];
    if (!Array.isArray(d.decks)) d.decks = [];
    if (!d.settings || typeof d.settings !== 'object') d.settings = {};
    if (!Array.isArray(d.reps)) d.reps = [];        // 不具合調べ用の再現データ
    if (!d.rpg || typeof d.rpg !== 'object') d.rpg = {};
    if (typeof d.rpg.coin !== 'number') d.rpg.coin = 0;
    if (!d.rpg.clears || typeof d.rpg.clears !== 'object') d.rpg.clears = {};
    if (!d.rpg.bag || typeof d.rpg.bag !== 'object') d.rpg.bag = {};
    if (!d.rpg.chests || typeof d.rpg.chests !== 'object') d.rpg.chests = {};
    d.v = 1;
    return d;
  }

  function load() {
    if (mem) return mem;
    var raw = null;
    try { raw = store ? store.getItem(KEY) : null; } catch (e) { raw = null; }
    if (!raw) { mem = blank(); return mem; }
    try { mem = normalize(JSON.parse(raw)); } catch (e) { mem = blank(); }
    return mem;
  }

  function save() {
    if (!mem) return false;
    if (mem.games.length > MAX_GAMES) mem.games = mem.games.slice(-MAX_GAMES);
    if (mem.decks.length > MAX_DECKS) mem.decks = mem.decks.slice(-MAX_DECKS);
    if (mem.reps && mem.reps.length > MAX_REPS) mem.reps = mem.reps.slice(-MAX_REPS);
    if (!store) { warned = true; return false; }
    try { store.setItem(KEY, JSON.stringify(mem)); return true; }
    catch (e) { warned = true; return false; }
  }

  /* ---------- 設定（音・速度・プール・配り方） ---------- */
  /* ---------- RPGモード（硬貨と依頼の達成） ---------- */
  function rpg() { return load().rpg; }
  function rpgReward(questId, coin, res) {
    var r = load().rpg;
    r.coin += (coin || 0);
    if (questId) r.clears[questId] = (r.clears[questId] || 0) + 1;
    if (res) {
      if (res.bag) r.bag = res.bag;                       /* 道具は街へ持ち帰る */
      if (res.chests) Object.keys(res.chests).forEach(function (k) { r.chests[k] = 1; });
    }
    save(); return r;
  }

  function getSettings() { return load().settings; }
  function setSettings(patch) {
    var s = load().settings;
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    save();
    return s;
  }

  /* ---------- 対戦履歴 ----------
     rec = { at, pool, deal, mode, diff, result:'win'|'lose'|'draw',
             how, decidedBy, rounds,
             me:{ cost, units:[{id,row,col,dmg,heal,kills,alive,hp}] },
             foe:{ ... } }                                            */
  function addGame(rec) {
    var d = load();
    rec.at = rec.at || Date.now();
    d.games.push(rec);
    save();
    return rec;
  }
  function games() { return load().games.slice().reverse(); }   // 新しい順

  /* ---------- 再現データ（不具合の報告用） ----------
     戦闘の種・両軍の配置・実際に取った行動をそのまま残す。
     これがあれば、同じ戦闘をこちらでもう一度なぞって中身を確かめられる。 */
  function addReplay(rep) {
    var d = load();
    rep.at = rep.at || Date.now();
    d.reps.push(rep);
    save();
    return rep;
  }
  function replays() { return load().reps.slice().reverse(); }
  function replayCode(rep) {
    var json = JSON.stringify(rep);
    var bytes = new TextEncoder().encode(json);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return 'AC1' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function gameCount() { return load().games.length; }

  /* ---------- 保存した編成 ---------- */
  function decks() { return load().decks.slice(); }
  function addDeck(name, pool, units) {
    var d = load();
    var rec = { id: 'd' + Date.now(), name: name, pool: pool, at: Date.now(),
      units: units.map(function (u) { return { id: u.id, row: u.row, col: u.col }; }) };
    d.decks.push(rec); save();
    return rec;
  }
  function removeDeck(id) {
    var d = load();
    d.decks = d.decks.filter(function (x) { return x.id !== id; });
    save();
  }

  /* ---------- 集計 ---------- */
  function stats(filter) {
    var gs = load().games.filter(function (g) {
      if (!filter) return true;
      if (filter.pool && g.pool !== filter.pool) return false;
      if (filter.mode && g.mode !== filter.mode) return false;
      return true;
    });
    var tot = { games: gs.length, win: 0, lose: 0, draw: 0, ko: 0, judge: 0, rounds: 0 };
    var byChar = {}, byPool = {};
    gs.forEach(function (g) {
      if (g.result === 'win') tot.win++;
      else if (g.result === 'lose') tot.lose++;
      else tot.draw++;
      if (g.how === 'KO') tot.ko++; else tot.judge++;
      tot.rounds += g.rounds || 0;

      var P = byPool[g.pool] || (byPool[g.pool] = { games: 0, win: 0 });
      P.games++; if (g.result === 'win') P.win++;

      (g.me && g.me.units || []).forEach(function (u) {
        var c = byChar[u.id] || (byChar[u.id] = { id: u.id, used: 0, win: 0, dmg: 0, heal: 0, kills: 0, survived: 0 });
        c.used++;
        if (g.result === 'win') c.win++;
        c.dmg += u.dmg || 0; c.heal += u.heal || 0; c.kills += u.kills || 0;
        if (u.alive) c.survived++;
      });
    });
    tot.rate = tot.games ? Math.round(tot.win / tot.games * 100) : 0;
    tot.avgRounds = tot.games ? +(tot.rounds / tot.games).toFixed(1) : 0;
    return { total: tot, byChar: byChar, byPool: byPool };
  }

  /* ---------- 書き出し／読み込み ---------- */
  function utf8ToB64(s) {
    return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(s))
      .replace(/[Ā-￿]/g, '?'));
  }
  function exportCode() {
    var json = JSON.stringify(load());
    var bytes = new TextEncoder().encode(json);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return 'AC1:' + btoa(bin);
  }
  function importCode(code) {
    if (!code) return { ok: false, msg: 'コードが空です' };
    code = String(code).trim().replace(/\s+/g, '');
    if (code.indexOf('AC1:') !== 0) return { ok: false, msg: 'このコードは ARCANA CLASH のものではありません' };
    try {
      var bin = atob(code.slice(4));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(bytes));
      mem = normalize(data);
      save();
      return { ok: true, games: mem.games.length, decks: mem.decks.length };
    } catch (e) {
      return { ok: false, msg: 'コードが壊れているようです' };
    }
  }

  function clearAll() { mem = blank(); if (store) { try { store.removeItem(KEY); } catch (e) {} } }
  function clearGames() { load().games = []; save(); }

  return {
    available: function () { return !!store; },
    warned: function () { return warned; },
    getSettings: getSettings, setSettings: setSettings,
    rpg: rpg, rpgReward: rpgReward,
    addGame: addGame, games: games, gameCount: gameCount,
    addReplay: addReplay, replays: replays, replayCode: replayCode,
    decks: decks, addDeck: addDeck, removeDeck: removeDeck,
    stats: stats,
    exportCode: exportCode, importCode: importCode,
    clearAll: clearAll, clearGames: clearGames,
    _raw: load
  };
})();
