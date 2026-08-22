/* =========================================================
   ARCANA CLASH — 効果音
   WebAudio でその場から合成（外部ファイル不要）
   ・白／ピンク／ブラウンの3種ノイズ素材
   ・波形歪み（ウェーブシェイパー）で炎や打撃に芯を出す
   ・LFO でフィルタを揺らして「ゴオー」という燃え方を作る
   ・畳み込みリバーブで余韻を付ける
   ・マスターにコンプを噛ませて音が重なっても割れないようにする
   ========================================================= */
var SFX = (function () {
  'use strict';

  var ctx = null, enabled = true;
  var master = null, comp = null, outGain = null;
  var revBus = null, revWet = null, conv = null;
  var bus = null, busRev = null;      // 1発ぶんの出力バス（音ごとの音量調整用）
  var BUF = null;
  var jit = 1;                       // 1発ごとの微妙なゆらぎ（機械的な連射感を消す）

  /* ---------- 素材づくり ---------- */
  function makeNoise(kind, sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), i, w;
    if (kind === 'white') {
      for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < len; i++) {
        w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {                                   // brown（低域が濃い＝炎や地鳴り向き）
      var last = 0;
      for (i = 0; i < len; i++) {
        w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.6;
      }
    }
    return buf;
  }
  function buildNoise() {
    BUF = { white: makeNoise('white', 2.2), pink: makeNoise('pink', 2.2), brown: makeNoise('brown', 2.6) };
  }

  /** 残響用インパルス応答をノイズから作る */
  function makeIR(sec, decay) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 40 ? i / 40 : 1);
      }
    }
    return buf;
  }

  function buildGraph() {
    master = ctx.createGain();  master.gain.value = 1.0;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 14; comp.ratio.value = 4;
    comp.attack.value = 0.003;  comp.release.value = 0.16;
    outGain = ctx.createGain();  outGain.gain.value = 0.75;
    master.connect(comp); comp.connect(outGain); outGain.connect(ctx.destination);

    conv = ctx.createConvolver(); conv.buffer = makeIR(1.9, 3.2);
    revBus = ctx.createGain(); revBus.gain.value = 1;
    var hp = ctx.createBiquadFilter();          // 低域まで響かせると濁るので削る
    hp.type = 'highpass'; hp.frequency.value = 360;
    revWet = ctx.createGain(); revWet.gain.value = 0.36;
    revBus.connect(hp); hp.connect(conv); conv.connect(revWet); revWet.connect(master);
  }

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    buildGraph(); buildNoise();
    return true;
  }
  function unlock() { if (!init()) return; if (ctx.state === 'suspended') ctx.resume(); }
  function setEnabled(v) { enabled = !!v; if (enabled) unlock(); }
  function isEnabled() { return enabled; }

  /* ---------- 部品 ---------- */
  function T(delay) { return ctx.currentTime + (delay || 0); }

  function shaper(amount) {
    var n = 1024, c = new Float32Array(n), k = amount * 90;
    for (var i = 0; i < n; i++) {
      var x = i * 2 / n - 1;
      c[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    var ws = ctx.createWaveShaper();
    ws.curve = c; ws.oversample = '2x';
    return ws;
  }

  function sweep(param, t0, dur, f0, f1, lin) {
    param.setValueAtTime(Math.max(8, f0), t0);
    if (f1 != null) {
      if (lin) param.linearRampToValueAtTime(Math.max(8, f1), t0 + dur);
      else param.exponentialRampToValueAtTime(Math.max(8, f1), t0 + dur);
    }
  }
  function addLfo(param, t0, dur, o) {
    var l = ctx.createOscillator();
    l.type = o.type || 'sine';
    l.frequency.value = o.f;
    var g = ctx.createGain(); g.gain.value = o.amt;
    l.connect(g); g.connect(param);
    l.start(t0); l.stop(t0 + dur + 0.1);
  }
  function ampEnv(p, t0, dur, vol, atk, rel) {
    vol = Math.max(0.0008, vol) * (0.93 + Math.random() * 0.14);
    atk = (atk == null) ? 0.006 : atk;
    rel = (rel == null) ? dur * 0.7 : rel;
    if (atk + rel > dur * 0.98) { var k = dur * 0.98 / (atk + rel); atk *= k; rel *= k; }
    var hold = Math.max(0.002, dur - atk - rel);
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(vol, t0 + atk);
    p.exponentialRampToValueAtTime(vol * 0.8, t0 + atk + hold);
    p.exponentialRampToValueAtTime(0.0001, t0 + atk + hold + rel);
  }
  function out(g, rev) {
    g.connect(bus || master);
    if (rev) {
      var r = ctx.createGain(); r.gain.value = rev;
      g.connect(r); r.connect(busRev || revBus);
    }
  }

  /** 音ごとの最終音量。すべての音の聞こえの大きさを揃えるための係数 */
  var TRIM = {
    slash: 0.81, pierce: 0.68, sweep: 0.63, bash: 0.46,
    smash: 0.59, claw: 0.82, arrow: 1.64, dagger: 0.77,
    wind: 1.74, blood: 3.39, holy: 1.12, fire: 0.95,
    ice: 3.66, arcane: 1.33, shadow: 0.98, earth: 1.93,
    breath: 0.80, meteor: 0.75, heal: 1.40, ward: 1.67,
    guard: 2.94, revive: 1.04, hit: 2.77, bighit: 2.46,
    death: 1.81, execute: 0.88, round: 1.93, start: 1.42,
    win: 1.11, lose: 1.19, ui: 7.20, select: 6.48,
    lance: 0.78, wallop: 0.70, rock: 0.77, horn: 0.71,
    dclaw: 0.82, holystrike: 0.83, spear: 3.65, mark: 1.10,
    screech: 2.23, hex: 2.23, discord: 1.35, doom: 1.74,
    grasp: 1.59, arcanebolt: 0.94, logos: 1.21, thorn: 1.87,
    purge: 0.93, blizzard: 1.45, frost: 1.10, firebolt: 0.80,
    i_cut: 3.51, i_stab: 4.17, i_arrow: 4.27, i_rip: 2.73,
    i_crush: 1.95, i_ice: 3.37, i_fire: 2.29, i_arcane: 4.36,
    i_dark: 2.52, i_light: 3.09, i_wet: 3.37, i_gust: 5.32,
    i_thorn: 3.98, critboom: 2.84, aegis: 2.43, siege: 0.71,
    cannon: 0.84, wclaw: 1.24, venom: 1.22, parrow: 5.27,
    triple: 2.41, i_venom: 5.02, ember: 1.03, blaze: 0.99,
    iceclub: 0.74, frostroar: 1.57, i_cutwide: 4.69, i_horn: 3.77,
    i_rock: 3.06, i_mark: 1.38, i_spear: 3.58
  };

  /** 1発ぶんのバスを用意して鳴らす */
  function trigger(k) {
    var t = TRIM[k] == null ? 1 : TRIM[k];
    bus = ctx.createGain(); bus.gain.value = t; bus.connect(master);
    busRev = ctx.createGain(); busRev.gain.value = t; busRev.connect(revBus);
    var f = LIB[k] || LIB.hit;
    try { f(); } catch (e) { /* 無音で続行 */ }
    bus = null; busRev = null;
  }

  /** ノイズ系ボイス */
  function nz(o) {
    if (!ctx || !BUF) return;
    var t0 = T(o.delay), dur = o.dur;
    var src = ctx.createBufferSource();
    src.buffer = BUF[o.kind || 'white'];
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    var node = src;
    if (o.f0) {
      var f = ctx.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.Q.value = (o.q == null) ? 1 : o.q;
      sweep(f.frequency, t0, dur, o.f0 * jit, o.f1 == null ? null : o.f1 * jit);
      if (o.lfo) addLfo(f.frequency, t0, dur, o.lfo);
      node.connect(f); node = f;
    }
    if (o.f2) {
      var f2 = ctx.createBiquadFilter();
      f2.type = o.filter2 || 'lowpass';
      f2.frequency.value = o.f2; f2.Q.value = o.q2 || 0.7;
      node.connect(f2); node = f2;
    }
    if (o.drive) { var ws = shaper(o.drive); node.connect(ws); node = ws; }
    var g = ctx.createGain();
    ampEnv(g.gain, t0, dur, o.vol == null ? 0.25 : o.vol, o.atk, o.rel);
    node.connect(g); out(g, o.rev);
    src.start(t0, Math.random() * 1.2);
    src.stop(t0 + dur + 0.3);
  }

  /**
   * 咆哮・唸り声。
   * 声帯（のこぎり波＋ざらつきノイズ）を母音のフォルマント3本で鳴らす。
   * vowel:[F1,F2,F3] → vowel2 を渡すと「うぉ→あー」のように口の形が変わる。
   */
  function growl(o) {
    if (!ctx || !BUF) return;
    var t0 = T(o.delay), dur = o.dur;
    var src = ctx.createGain(); src.gain.value = 1;

    var O = ctx.createOscillator();
    O.type = o.wave || 'sawtooth';
    sweep(O.frequency, t0, dur, o.f0 * jit, o.f1 == null ? null : o.f1 * jit);
    addLfo(O.frequency, t0, dur, o.vib || { f: 5.5, amt: o.f0 * 0.03 });
    var og = ctx.createGain(); og.gain.value = 1;
    O.connect(og); og.connect(src);
    O.start(t0); O.stop(t0 + dur + 0.3);

    // 1オクターブ下（体格の大きさ）
    if (o.sub) {
      var O2 = ctx.createOscillator(); O2.type = 'sawtooth';
      sweep(O2.frequency, t0, dur, o.f0 * jit * 0.5, o.f1 == null ? null : o.f1 * jit * 0.5);
      var g2 = ctx.createGain(); g2.gain.value = o.sub;
      O2.connect(g2); g2.connect(src);
      O2.start(t0); O2.stop(t0 + dur + 0.3);
    }
    // 声のざらつき（濁声）
    if (o.rasp) {
      var n = ctx.createBufferSource(); n.buffer = BUF.pink; n.loop = true;
      var nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.6;
      var ng = ctx.createGain(); ng.gain.value = o.rasp;
      n.connect(nf); nf.connect(ng); ng.connect(src);
      n.start(t0, Math.random() * 1.0); n.stop(t0 + dur + 0.3);
    }

    var mix = ctx.createGain();
    var V1 = o.vowel, V2 = o.vowel2 || o.vowel;
    var AMP = [1, 0.62, 0.3], QQ = [7, 9, 12];
    for (var i = 0; i < V1.length; i++) {
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = QQ[i] || 10;
      sweep(bp.frequency, t0, dur, V1[i], V2[i]);
      var fg = ctx.createGain(); fg.gain.value = AMP[i] || 0.25;
      src.connect(bp); bp.connect(fg); fg.connect(mix);
    }
    var node = mix;
    if (o.drive) { var ws = shaper(o.drive); node.connect(ws); node = ws; }
    var g = ctx.createGain();
    ampEnv(g.gain, t0, dur, o.vol == null ? 0.3 : o.vol, o.atk == null ? 0.05 : o.atk, o.rel);
    node.connect(g); out(g, o.rev);
  }

  /**
   * 金属の残響。
   * 非整数倍音を複数重ね、1本ごとに2つずつわずかにずらして「うなり」を出す。
   * これが無いと金属は「ピー」という電子音にしか聞こえない。
   */
  function metal(o) {
    if (!ctx) return;
    var t0 = T(o.delay), dur = o.dur || 0.6;
    var fs = o.f || [2870, 4310, 6120];
    var amp = o.vol == null ? 0.09 : o.vol;
    fs.forEach(function (f, i) {
      var v = amp * Math.pow(o.roll == null ? 0.62 : o.roll, i);
      var d = dur * Math.pow(0.78, i);
      [0, 1].forEach(function (k) {
        var O = ctx.createOscillator();
        O.type = o.type || 'triangle';
        O.frequency.setValueAtTime(f * jit * (k ? 1 + (o.beat || 0.004) : 1), t0);
        if (o.drop) O.frequency.exponentialRampToValueAtTime(f * jit * o.drop, t0 + d);
        var g = ctx.createGain();
        ampEnv(g.gain, t0, d, v * (k ? 0.72 : 1), 0.001, d * 0.97);
        O.connect(g); out(g, o.rev == null ? 0.55 : o.rev);
        O.start(t0); O.stop(t0 + d + 0.2);
      });
    });
  }

  /** 武器が空を切る音。重い武器ほど低く、軽い武器ほど細く鳴らす */
  function swing(o) {
    var lo = o.lo || 700, hi = o.hi || 4200;
    nz({ kind: o.kind || 'pink', f0: lo, f1: hi, filter: 'bandpass', q: o.q == null ? 1.1 : o.q,
         dur: o.dur || 0.12, vol: o.vol == null ? 0.22 : o.vol,
         atk: (o.dur || 0.12) * 0.45, rel: (o.dur || 0.12) * 0.4, delay: o.delay });
    if (o.mass) {
      osc({ type: 'sawtooth', f0: o.mass, f1: o.mass * 0.55, dur: (o.dur || 0.12) * 1.1,
            vol: 0.10, atk: (o.dur || 0.12) * 0.4, rel: (o.dur || 0.12) * 0.5,
            lp: o.mass * 5, delay: o.delay });
    }
  }

  /** 音程のあるボイス */
  function osc(o) {
    if (!ctx) return;
    var t0 = T(o.delay), dur = o.dur;
    var O = ctx.createOscillator();
    O.type = o.type || 'sine';
    sweep(O.frequency, t0, dur, o.f0 * jit, o.f1 == null ? null : o.f1 * jit, o.lin);
    if (o.detune) O.detune.value = o.detune;
    if (o.vib) addLfo(O.frequency, t0, dur, o.vib);
    var node = O;
    if (o.drive) { var ws = shaper(o.drive); node.connect(ws); node = ws; }
    if (o.lp) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.lq || 0.8;
      node.connect(f); node = f;
    }
    var g = ctx.createGain();
    ampEnv(g.gain, t0, dur, o.vol == null ? 0.2 : o.vol, o.atk, o.rel);
    node.connect(g); out(g, o.rev);
    O.start(t0); O.stop(t0 + dur + 0.3);
  }

  /* ---------- 効果音カタログ ---------- */
  var LIB = {

    /* ===== 近接：刃と打撃 ===== */
    // 剣：ヒュッ（空気を裂く）→ バシュッ（斬撃）→ キィン（刃鳴り）
    slash: function () {
      nz({ kind: 'pink',  f0: 650,  f1: 5200, filter: 'bandpass', q: 0.9, dur: 0.11, vol: 0.20, atk: 0.03, rel: 0.05 });
      nz({ kind: 'white', f0: 6200, f1: 1100, filter: 'highpass', dur: 0.06, vol: 0.44, atk: 0.001, rel: 0.055, delay: 0.09, drive: 0.55 });
      osc({ type: 'sine', f0: 195, f1: 50, dur: 0.17, vol: 0.34, atk: 0.002, rel: 0.16, delay: 0.09 });
      osc({ type: 'triangle', f0: 2870, dur: 0.32, vol: 0.055, atk: 0.002, rel: 0.31, delay: 0.095, rev: 0.55 });
      osc({ type: 'triangle', f0: 4310, dur: 0.24, vol: 0.030, atk: 0.002, rel: 0.23, delay: 0.098, rev: 0.55 });
      nz({ kind: 'white', f0: 2600, filter: 'bandpass', q: 0.5, dur: 0.20, vol: 0.10, atk: 0.001, rel: 0.19, delay: 0.09, rev: 0.75 });
    },
    // 刺突：細く鋭い風切りからの一点集中
    pierce: function () {
      swing({ lo: 500, hi: 3600, q: 1.3, dur: 0.13, vol: 0.24, mass: 190 });
      nz({ kind: 'white', f0: 9000, f1: 2400, filter: 'highpass', dur: 0.035, vol: 0.46, atk: 0.0006, rel: 0.034, delay: 0.11, drive: 0.5 });
      nz({ kind: 'white', f0: 2600, f1: 900, filter: 'bandpass', q: 1.6, dur: 0.07, vol: 0.30, atk: 0.001, rel: 0.068, delay: 0.112, drive: 0.6 });
      osc({ type: 'triangle', f0: 430, f1: 150, dur: 0.11, vol: 0.28, atk: 0.001, rel: 0.108, delay: 0.112, drive: 0.4 });
      osc({ type: 'sine', f0: 175, f1: 58, dur: 0.20, vol: 0.28, atk: 0.002, rel: 0.195, delay: 0.112 });
      metal({ f: [2740, 4180, 5930, 7710], vol: 0.11, dur: 0.62, delay: 0.115, beat: 0.005, rev: 0.6 });
    },
    // 薙ぎ払い：ブオンッと重く長い風、遅れて着弾
    sweep: function () {
      growl({ f0: 230, f1: 300, dur: 0.42, vol: 0.24, atk: 0.03, rel: 0.26,
              vowel: [800, 1300, 2700], vowel2: [900, 1500, 2800],
              rasp: 0.5, drive: 0.5, rev: 0.3, vib: { f: 9, amt: 10 } });
      swing({ kind: 'brown', lo: 2400, hi: 260, q: 1.7, dur: 0.4, vol: 0.42, mass: 190, delay: 0.05 });
      nz({ kind: 'white', f0: 9000, f1: 1200, filter: 'highpass', dur: 0.055, vol: 0.42, atk: 0.0007, rel: 0.05, delay: 0.4, drive: 0.55 });
      osc({ type: 'triangle', f0: 300, f1: 110, dur: 0.16, vol: 0.30, atk: 0.001, rel: 0.155, delay: 0.4, drive: 0.5 });
      osc({ type: 'sine', f0: 150, f1: 42, dur: 0.26, vol: 0.32, atk: 0.002, rel: 0.255, delay: 0.4 });
      metal({ f: [1870, 2960, 4210], vol: 0.085, dur: 0.6, delay: 0.404, beat: 0.007, rev: 0.6 });
    },
    // 盾・鈍器：ゴインッ
    bash: function () {
      swing({ kind: 'brown', lo: 900, hi: 300, q: 1.4, dur: 0.14, vol: 0.20, mass: 120 });
      nz({ kind: 'white', f0: 2600, f1: 500, filter: 'lowpass', dur: 0.05, vol: 0.44, atk: 0.0007, rel: 0.048, delay: 0.13, drive: 0.7 });
      osc({ type: 'triangle', f0: 520, f1: 175, dur: 0.16, vol: 0.34, atk: 0.001, rel: 0.155, delay: 0.13, drive: 0.4 });
      osc({ type: 'sine', f0: 148, f1: 42, dur: 0.34, vol: 0.44, atk: 0.002, rel: 0.335, delay: 0.13 });
      // 鉄板は低めで濁った倍音が長く残る
      metal({ f: [412, 733, 1129, 1687, 2510], vol: 0.15, dur: 1.05, delay: 0.132,
              beat: 0.008, roll: 0.66, rev: 0.62, type: 'sine' });
    },
    // 叩きつけ：ドゴォン＋飛び散る破片
    smash: function () {
      growl({ f0: 118, f1: 86, dur: 0.34, vol: 0.28, atk: 0.03, rel: 0.2,
              vowel: [640, 1080, 2400], vowel2: [400, 800, 2200],
              sub: 0.45, rasp: 0.3, drive: 0.5, vib: { f: 6, amt: 5 } });
      nz({ kind: 'brown', f0: 1600, f1: 300, filter: 'lowpass', q: 1.4, dur: 0.2, vol: 0.24, atk: 0.1, rel: 0.09, delay: 0.16 });
      nz({ kind: 'white', f0: 1900, f1: 280, filter: 'lowpass', dur: 0.10, vol: 0.44, atk: 0.001, rel: 0.095, drive: 0.85, delay: 0.33 });
      osc({ type: 'triangle', f0: 480, f1: 130, dur: 0.20, vol: 0.38, atk: 0.002, rel: 0.19, drive: 0.5, delay: 0.33 });
      osc({ type: 'sine', f0: 122, f1: 29, dur: 0.60, vol: 0.55, atk: 0.003, rel: 0.58, delay: 0.33 });
      nz({ kind: 'brown', f0: 520, f1: 85, filter: 'lowpass', dur: 0.75, vol: 0.32, atk: 0.012, rel: 0.72, rev: 0.5, delay: 0.33 });
      [0.385, 0.435, 0.495].forEach(function (t, i) {
        nz({ kind: 'white', f0: 2900 + i * 950, filter: 'bandpass', q: 3, dur: 0.055, vol: 0.09, delay: t, rev: 0.3 });
      });
    },
    // 獣の爪：低い唸りの上をザシュッ×3
    claw: function () {
      // 「グルルル…ガアッ」：唸りから吠えへ
      growl({ f0: 150, f1: 128, dur: 0.24, vol: 0.20, atk: 0.04, rel: 0.14,
              vowel: [420, 1250, 2600], vowel2: [500, 1400, 2700],
              rasp: 0.55, drive: 0.5, vib: { f: 26, amt: 12 } });
      growl({ f0: 210, f1: 168, dur: 0.30, vol: 0.30, atk: 0.012, rel: 0.22, delay: 0.20,
              vowel: [760, 1300, 2700], vowel2: [620, 1150, 2500],
              sub: 0.35, rasp: 0.35, drive: 0.55, rev: 0.35, vib: { f: 8, amt: 9 } });
      [0.20, 0.262, 0.318].forEach(function (t, i) {
        nz({ kind: 'white', f0: 6600 - i * 750, f1: 1400, filter: 'bandpass', q: 1.1, dur: 0.08, vol: 0.30, atk: 0.001, rel: 0.075, delay: t, drive: 0.45, rev: 0.25 });
        osc({ type: 'sine', f0: 225 - i * 22, f1: 66, dur: 0.11, vol: 0.18, atk: 0.002, rel: 0.105, delay: t });
      });
    },

    /* ===== 遠隔 ===== */
    // 弓：弦のビィン → 飛翔のヒュゥ → 命中のドスッ
    // 射抜き：弓のしなり → 弦のビィン → 頭上を過ぎるヒュンッ（近づいて遠ざかる）
    arrow: function () {
      nz({ kind: 'brown', f0: 900, f1: 1600, filter: 'bandpass', q: 3, dur: 0.10, vol: 0.10, atk: 0.06, rel: 0.03 });
      osc({ type: 'triangle', f0: 210, f1: 74, dur: 0.10, vol: 0.30, atk: 0.001, rel: 0.095, delay: 0.09, drive: 0.3 });
      nz({ kind: 'white', f0: 2400, f1: 900, filter: 'bandpass', q: 1.2, dur: 0.05, vol: 0.22, atk: 0.001, rel: 0.045, delay: 0.09 });
      // 矢の飛翔：上がりきってから抜けていく（ドップラー）
      nz({ kind: 'pink', f0: 1400, f1: 6200, filter: 'bandpass', q: 5.5, dur: 0.13, vol: 0.30, atk: 0.05, rel: 0.06, delay: 0.12 });
      nz({ kind: 'pink', f0: 6200, f1: 1500, filter: 'bandpass', q: 5.5, dur: 0.16, vol: 0.26, atk: 0.02, rel: 0.13, delay: 0.25, rev: 0.3 });
      osc({ type: 'sine', f0: 2100, f1: 3400, dur: 0.13, vol: 0.05, atk: 0.05, rel: 0.06, delay: 0.12 });
      osc({ type: 'sine', f0: 3400, f1: 1500, dur: 0.16, vol: 0.05, atk: 0.02, rel: 0.13, delay: 0.25 });
    },
    // 天翔ける槍：光をまとった投槍が唸りを上げて落ちてくる
    spear: function () {
      osc({ type: 'triangle', f0: 660, f1: 990, dur: 0.22, vol: 0.10, atk: 0.1, rel: 0.1, rev: 0.6 });
      nz({ kind: 'pink', f0: 900, f1: 4600, filter: 'bandpass', q: 3.2, dur: 0.30, vol: 0.28, atk: 0.16, rel: 0.12, rev: 0.3 });
      osc({ type: 'sine', f0: 1320, f1: 2640, dur: 0.30, vol: 0.06, atk: 0.16, rel: 0.12, rev: 0.5 });
      osc({ type: 'sawtooth', f0: 150, f1: 90, dur: 0.28, vol: 0.10, atk: 0.14, rel: 0.13, lp: 700 });
    },
    // 死の刻印：刃を抜く音 → 印を刻む一瞬 → 静かで確実な一突き
    mark: function () {
      nz({ kind: 'pink', f0: 2600, f1: 5200, filter: 'bandpass', q: 4, dur: 0.16, vol: 0.13, atk: 0.1, rel: 0.05 });
      osc({ type: 'sine', f0: 1760, f1: 880, dur: 0.14, vol: 0.07, atk: 0.004, rel: 0.13, delay: 0.14, rev: 0.6 });
      osc({ type: 'sine', f0: 62, f1: 40, dur: 0.5, vol: 0.26, atk: 0.02, rel: 0.46, delay: 0.14 });
      nz({ kind: 'white', f0: 7200, f1: 2600, filter: 'highpass', dur: 0.04, vol: 0.30, atk: 0.001, rel: 0.035, delay: 0.26, drive: 0.4 });
    },
    // 投擲短剣：もっと細く速い
    dagger: function () {
      nz({ kind: 'white', f0: 4200, f1: 9000, filter: 'bandpass', q: 3.2, dur: 0.05, vol: 0.18, atk: 0.02, rel: 0.028 });
      swing({ lo: 1800, hi: 7000, q: 2.8, dur: 0.09, vol: 0.22, delay: 0.03 });
      nz({ kind: 'white', f0: 11000, f1: 3000, filter: 'highpass', dur: 0.026, vol: 0.44, atk: 0.0005, rel: 0.025, delay: 0.11, drive: 0.4 });
      nz({ kind: 'white', f0: 2200, f1: 800, filter: 'bandpass', q: 2.4, dur: 0.05, vol: 0.24, atk: 0.001, rel: 0.048, delay: 0.112 });
      osc({ type: 'sine', f0: 230, f1: 78, dur: 0.11, vol: 0.22, atk: 0.002, rel: 0.106, delay: 0.112 });
      metal({ f: [4390, 6620, 9140], vol: 0.075, dur: 0.34, delay: 0.114, beat: 0.006, rev: 0.6 });
    },
    // 風：うねりながら通り抜ける
    wind: function () {
      nz({ kind: 'pink', f0: 380, f1: 3400, filter: 'bandpass', q: 0.8, dur: 0.42, vol: 0.30, atk: 0.14, rel: 0.24, rev: 0.35, lfo: { f: 4.5, amt: 620 } });
      nz({ kind: 'white', f0: 5200, f1: 2000, filter: 'highpass', dur: 0.28, vol: 0.12, atk: 0.09, rel: 0.18, delay: 0.06 });
      osc({ type: 'sine', f0: 520, f1: 1600, dur: 0.32, vol: 0.055, atk: 0.11, rel: 0.2 });
    },
    // 吸血：どろりとした低音
    blood: function () {
      osc({ type: 'sine', f0: 300, f1: 74, dur: 0.34, vol: 0.30, atk: 0.012, rel: 0.32, drive: 0.35 });
      nz({ kind: 'brown', f0: 720, f1: 165, filter: 'lowpass', dur: 0.38, vol: 0.24, atk: 0.02, rel: 0.36, rev: 0.3 });
      nz({ kind: 'white', f0: 2500, f1: 750, filter: 'bandpass', q: 1.2, dur: 0.11, vol: 0.16, atk: 0.002, rel: 0.1 });
    },
    // 聖なる光：分散和音ではなく、和音の塊で荘厳に
    holy: function () {
      var d = 0.95;
      [392, 494, 587, 784].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: d - i * 0.06, vol: 0.10, atk: 0.09, rel: (d - i * 0.06) * 0.78,
              delay: i * 0.014, rev: 0.65, detune: (i % 2 ? 7 : -7) });
      });
      osc({ type: 'sine', f0: 1568, dur: 0.75, vol: 0.05, atk: 0.004, rel: 0.73, rev: 0.75 });
      nz({ kind: 'white', f0: 6500, f1: 10000, filter: 'highpass', dur: 0.55, vol: 0.07, atk: 0.14, rel: 0.4, rev: 0.65 });
      osc({ type: 'sine', f0: 98, dur: 0.8, vol: 0.16, atk: 0.06, rel: 0.72 });
    },

    /* ===== 魔法 ===== */
    // 炎：ゴオオォ…（ブラウンノイズのローパスを LFO で揺らす）
    fire: function () {
      var d = 1.08;
      nz({ kind: 'white', f0: 2400, f1: 320, filter: 'lowpass', q: 0.7, dur: 0.15, vol: 0.36, atk: 0.002, rel: 0.14, drive: 0.65 });
      nz({ kind: 'brown', f0: 1150, f1: 380, filter: 'lowpass', q: 1.3, dur: d, vol: 0.52, atk: 0.05, rel: 0.62,
           drive: 0.45, rev: 0.35, lfo: { f: 8.5, amt: 430 } });
      nz({ kind: 'pink',  f0: 950,  f1: 260, filter: 'bandpass', q: 0.7, dur: d * 0.9, vol: 0.26, atk: 0.04, rel: 0.42,
           rev: 0.3, lfo: { f: 5.5, amt: 320 } });
      nz({ kind: 'white', f0: 4300, f1: 2600, filter: 'bandpass', q: 1.7, dur: d * 0.78, vol: 0.11, atk: 0.02, rel: 0.42,
           lfo: { f: 17, amt: 1500 } });
      osc({ type: 'sine', f0: 78, f1: 40, dur: d, vol: 0.34, atk: 0.06, rel: 0.68 });
    },
    // 氷：パキィンと張りつめた冷気
    ice: function () {
      nz({ kind: 'white', f0: 9000, f1: 3800, filter: 'highpass', dur: 0.075, vol: 0.26, atk: 0.001, rel: 0.07 });
      [2093, 3136, 4186].forEach(function (f, i) {
        osc({ type: 'sine', f0: f, dur: 0.55 - i * 0.09, vol: 0.09 - i * 0.02, atk: 0.002, rel: 0.5 - i * 0.09, delay: i * 0.02, rev: 0.65 });
      });
      nz({ kind: 'pink', f0: 5400, f1: 1300, filter: 'bandpass', q: 1.5, dur: 0.45, vol: 0.16, atk: 0.02, rel: 0.42, rev: 0.45 });
      osc({ type: 'sine', f0: 175, f1: 64, dur: 0.22, vol: 0.22, atk: 0.002, rel: 0.21 });
    },
    // 秘術：うねって立ち上がる魔力
    arcane: function () {
      osc({ type: 'sine', f0: 300, f1: 1450, dur: 0.5, vol: 0.19, atk: 0.06, rel: 0.34, rev: 0.5 });
      osc({ type: 'sine', f0: 303, f1: 1462, dur: 0.5, vol: 0.14, atk: 0.06, rel: 0.34, delay: 0.016, rev: 0.5 });
      osc({ type: 'triangle', f0: 1800, f1: 2700, dur: 0.44, vol: 0.06, atk: 0.05, rel: 0.38, rev: 0.65, vib: { f: 6, amt: 22 } });
      nz({ kind: 'white', f0: 1800, f1: 8500, filter: 'bandpass', q: 1.2, dur: 0.44, vol: 0.11, atk: 0.09, rel: 0.34, rev: 0.55 });
      osc({ type: 'sine', f0: 92, f1: 48, dur: 0.38, vol: 0.24, atk: 0.02, rel: 0.35 });
    },
    // 闇：吸い込んでから重く広がる
    shadow: function () {
      nz({ kind: 'brown', f0: 260, f1: 950, filter: 'lowpass', q: 1.2, dur: 0.28, vol: 0.20, atk: 0.2, rel: 0.07 });
      osc({ type: 'sawtooth', f0: 275, f1: 58, dur: 0.6, vol: 0.24, atk: 0.02, rel: 0.56, lp: 760, drive: 0.55, delay: 0.17, rev: 0.4 });
      nz({ kind: 'brown', f0: 950, f1: 110, filter: 'lowpass', dur: 0.6, vol: 0.28, atk: 0.02, rel: 0.56, delay: 0.17, rev: 0.45 });
      osc({ type: 'sine', f0: 70, f1: 34, dur: 0.55, vol: 0.32, atk: 0.03, rel: 0.5, delay: 0.17 });
    },
    // 大地：ズゥン…と地鳴り＋礫
    earth: function () {
      osc({ type: 'triangle', f0: 330, f1: 105, dur: 0.24, vol: 0.30, atk: 0.006, rel: 0.23, drive: 0.4 });
      osc({ type: 'sine', f0: 122, f1: 34, dur: 0.55, vol: 0.5, atk: 0.008, rel: 0.53 });
      nz({ kind: 'brown', f0: 440, f1: 75, filter: 'lowpass', q: 1.1, dur: 0.7, vol: 0.36, atk: 0.02, rel: 0.66, drive: 0.45, rev: 0.45 });
      [0.02, 0.09, 0.16, 0.24].forEach(function (t, i) {
        nz({ kind: 'white', f0: 1700 + i * 520, filter: 'bandpass', q: 2.6, dur: 0.06, vol: 0.09, delay: t, rev: 0.3 });
      });
    },
    // ブレス：長く低く吠える炎
    breath: function () {
      var d = 1.35;
      growl({ f0: 58, f1: 72, dur: 0.34, vol: 0.30, atk: 0.06, rel: 0.16,
              vowel: [280, 600, 2000], vowel2: [560, 1000, 2200],
              sub: 0.55, rasp: 0.25, drive: 0.6, rev: 0.35, vib: { f: 4, amt: 2.5 } });   // 竜が息を吸って吠える
      nz({ kind: 'white', f0: 3000, f1: 400, filter: 'lowpass', q: 0.7, dur: 0.18, vol: 0.34, atk: 0.004, rel: 0.17, drive: 0.7, delay: 0.3 });
      nz({ kind: 'brown', f0: 1550, f1: 290, filter: 'lowpass', q: 1.5, dur: d, vol: 0.60, atk: 0.10, rel: 0.72,
           drive: 0.75, rev: 0.45, lfo: { f: 6.2, amt: 540 } , delay: 0.3 });
      nz({ kind: 'pink',  f0: 1400, f1: 480, filter: 'bandpass', q: 0.6, dur: d * 0.95, vol: 0.30, atk: 0.09, rel: 0.62,
           rev: 0.35, lfo: { f: 3.4, amt: 430 } , delay: 0.3 });
      nz({ kind: 'white', f0: 5400, f1: 2900, filter: 'bandpass', q: 1.5, dur: d * 0.8, vol: 0.11, atk: 0.06, rel: 0.6,
           lfo: { f: 14, amt: 1800 } , delay: 0.3 });
      osc({ type: 'sawtooth', f0: 104, f1: 56, dur: d * 0.9, vol: 0.20, atk: 0.08, rel: 0.62, drive: 0.55, lp: 880, vib: { f: 5.5, amt: 7 } , delay: 0.3 });
      osc({ type: 'sine', f0: 56, f1: 32, dur: d, vol: 0.40, atk: 0.1, rel: 0.75 , delay: 0.3 });
    },
    // 隕石：落下の風切り → 着弾の大爆発 → 尾を引く轟き
    meteor: function () {
      nz({ kind: 'pink', f0: 2800, f1: 400, filter: 'bandpass', q: 1.2, dur: 0.55, vol: 0.30, atk: 0.14, rel: 0.2, rev: 0.25 });
      osc({ type: 'sine', f0: 1500, f1: 210, dur: 0.55, vol: 0.07, atk: 0.11, rel: 0.26 });
      var D = 0.5;
      nz({ kind: 'white', f0: 3200, f1: 170, filter: 'lowpass', q: 0.7, dur: 0.32, vol: 0.50, atk: 0.002, rel: 0.31, drive: 0.9, delay: D, rev: 0.4 });
      osc({ type: 'triangle', f0: 430, f1: 110, dur: 0.26, vol: 0.34, atk: 0.003, rel: 0.25, delay: D, drive: 0.55 });
      osc({ type: 'sine', f0: 112, f1: 26, dur: 0.8, vol: 0.55, atk: 0.003, rel: 0.78, delay: D });
      nz({ kind: 'brown', f0: 330, f1: 80, filter: 'lowpass', q: 1, dur: 1.05, vol: 0.30, atk: 0.03, rel: 1.0, delay: D + 0.05, rev: 0.55 });
    },

    /* ===== 支援 ===== */
    // 回復：やわらかい和音の膨らみ＋きらめき
    heal: function () {
      [523, 659, 784].forEach(function (f, i) {
        osc({ type: 'sine', f0: f * 0.994, f1: f, dur: 0.8, vol: 0.11, atk: 0.13, rel: 0.62, delay: i * 0.03, rev: 0.6 });
      });
      osc({ type: 'triangle', f0: 1568, dur: 0.55, vol: 0.045, atk: 0.01, rel: 0.53, rev: 0.75 });
      nz({ kind: 'white', f0: 7000, f1: 11000, filter: 'highpass', dur: 0.45, vol: 0.05, atk: 0.16, rel: 0.28, rev: 0.65 });
      osc({ type: 'sine', f0: 131, dur: 0.7, vol: 0.13, atk: 0.1, rel: 0.58 });
    },
    // 結界：シュゥンと張られる膜
    ward: function () {
      osc({ type: 'sine', f0: 330, f1: 494, dur: 0.65, vol: 0.16, atk: 0.11, rel: 0.5, rev: 0.55 });
      osc({ type: 'sine', f0: 494, f1: 659, dur: 0.65, vol: 0.10, atk: 0.15, rel: 0.46, delay: 0.04, rev: 0.55 });
      nz({ kind: 'pink', f0: 1100, f1: 5200, filter: 'bandpass', q: 1.1, dur: 0.5, vol: 0.13, atk: 0.16, rel: 0.32, rev: 0.5 });
      osc({ type: 'sine', f0: 110, dur: 0.5, vol: 0.14, atk: 0.06, rel: 0.42 });
    },
    // 防御：金属の身構え
    guard: function () {
      nz({ kind: 'white', f0: 3300, f1: 1100, filter: 'bandpass', q: 1.2, dur: 0.055, vol: 0.26, atk: 0.001, rel: 0.05, drive: 0.45 });
      osc({ type: 'triangle', f0: 645, f1: 520, dur: 0.24, vol: 0.10, atk: 0.002, rel: 0.23, rev: 0.4 });
      osc({ type: 'sine', f0: 172, f1: 76, dur: 0.18, vol: 0.24, atk: 0.002, rel: 0.17 });
    },
    // 蘇生：下から光が満ちてくる
    revive: function () {
      [392, 523, 659, 784, 1047].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 1.05 - i * 0.09, vol: 0.10, atk: 0.1 + i * 0.02, rel: 0.72, delay: i * 0.05, rev: 0.7 });
      });
      osc({ type: 'sine', f0: 98, f1: 196, dur: 0.95, vol: 0.26, atk: 0.16, rel: 0.66 });
      nz({ kind: 'white', f0: 4500, f1: 12000, filter: 'highpass', dur: 0.75, vol: 0.07, atk: 0.34, rel: 0.4, rev: 0.7 });
    },

    /* ===== 技ごとの表情（同じ属性でも技名に合わせて作り分ける） ===== */

    // 長槍突き：長い柄がしなり、深く重い一突き
    lance: function () {
      nz({ kind: 'brown', f0: 260, f1: 700, filter: 'bandpass', q: 3.6, dur: 0.14, vol: 0.14, atk: 0.09, rel: 0.05 });
      swing({ lo: 420, hi: 3000, q: 1.5, dur: 0.16, vol: 0.24, mass: 150, delay: 0.03 });
      nz({ kind: 'white', f0: 7200, f1: 1900, filter: 'highpass', dur: 0.04, vol: 0.42, atk: 0.0007, rel: 0.038, delay: 0.16, drive: 0.5 });
      osc({ type: 'triangle', f0: 380, f1: 120, dur: 0.14, vol: 0.32, atk: 0.001, rel: 0.138, delay: 0.16, drive: 0.45 });
      osc({ type: 'sine', f0: 155, f1: 48, dur: 0.26, vol: 0.32, atk: 0.002, rel: 0.255, delay: 0.16 });
      metal({ f: [2180, 3340, 4890], vol: 0.09, dur: 0.7, delay: 0.165, beat: 0.0035, rev: 0.6, drop: 0.985 });
    },
    // 豪腕：唸る大振り → 肉の詰まった鈍い一撃（金属音は出さない）
    wallop: function () {
      // ①「うぉおおーー」：口が「ウォ」から「アー」へ開いていく咆哮
      growl({ f0: 96, f1: 132, dur: 0.62, vol: 0.42, atk: 0.07, rel: 0.24,
              vowel: [380, 760, 2400], vowel2: [720, 1180, 2600],
              sub: 0.55, rasp: 0.30, drive: 0.5, rev: 0.35, vib: { f: 5.0, amt: 4.5 } });
      growl({ f0: 99, f1: 136, dur: 0.60, vol: 0.16, atk: 0.09, rel: 0.24, delay: 0.02,
              vowel: [420, 820, 2500], vowel2: [760, 1240, 2700], rasp: 0.5, drive: 0.35 });
      nz({ kind: 'brown', f0: 500, f1: 900, filter: 'bandpass', q: 0.8, dur: 0.5, vol: 0.14, atk: 0.1, rel: 0.34 });  // 息
      // ② 丸太のような腕を振り抜く
      nz({ kind: 'brown', f0: 1700, f1: 240, filter: 'lowpass', q: 1.5, dur: 0.26, vol: 0.30, atk: 0.14, rel: 0.11, drive: 0.3, delay: 0.36 });
      // ③ 肉の詰まった一撃
      nz({ kind: 'brown', f0: 900, f1: 190, filter: 'lowpass', dur: 0.11, vol: 0.46, atk: 0.002, rel: 0.105, delay: 0.60, drive: 0.75 });
      osc({ type: 'triangle', f0: 300, f1: 92, dur: 0.22, vol: 0.34, atk: 0.002, rel: 0.21, delay: 0.60, drive: 0.45 });
      osc({ type: 'sine', f0: 118, f1: 38, dur: 0.40, vol: 0.44, atk: 0.003, rel: 0.39, delay: 0.60 });
    },
    // 岩石打：石と石がぶつかって砕ける
    rock: function () {
      nz({ kind: 'brown', f0: 260, f1: 620, filter: 'bandpass', q: 3.2, dur: 0.24, vol: 0.22, atk: 0.06, rel: 0.17, drive: 0.5 });  // 岩体が軋む
      growl({ f0: 52, f1: 44, dur: 0.30, vol: 0.20, atk: 0.05, rel: 0.2,
              vowel: [260, 520, 1600], vowel2: [300, 600, 1700], sub: 0.4, rasp: 0.15, drive: 0.4 });
      nz({ kind: 'white', f0: 1500, f1: 420, filter: 'bandpass', q: 1.6, dur: 0.07, vol: 0.42, atk: 0.001, rel: 0.065, drive: 0.8, delay: 0.24 });
      osc({ type: 'square', f0: 380, f1: 160, dur: 0.09, vol: 0.16, atk: 0.001, rel: 0.085, lp: 1800, drive: 0.4, delay: 0.24 });
      osc({ type: 'sine', f0: 130, f1: 38, dur: 0.42, vol: 0.46, atk: 0.003, rel: 0.41, delay: 0.24 });
      nz({ kind: 'brown', f0: 600, f1: 110, filter: 'lowpass', dur: 0.5, vol: 0.26, atk: 0.01, rel: 0.48, rev: 0.45, delay: 0.24 });
      [0.29, 0.33, 0.38, 0.44, 0.51].forEach(function (t, i) {      // 砕けた礫が転がる
        nz({ kind: 'white', f0: 1100 + i * 380, filter: 'bandpass', q: 4, dur: 0.05, vol: 0.10, delay: t, rev: 0.3 });
      });
    },
    // 角突き：骨の詰まった鈍く重い衝突＋鼻息
    horn: function () {
      // ブフーッという鼻息 →「ヴォオッ」という短い唸り → 突進
      nz({ kind: 'brown', f0: 380, f1: 900, filter: 'bandpass', q: 1.1, dur: 0.16, vol: 0.22, atk: 0.02, rel: 0.13, drive: 0.4 });
      growl({ f0: 84, f1: 108, dur: 0.34, vol: 0.34, atk: 0.03, rel: 0.16, delay: 0.10,
              vowel: [340, 700, 2300], vowel2: [560, 980, 2400],
              sub: 0.5, rasp: 0.28, drive: 0.55, rev: 0.3, vib: { f: 7, amt: 4 } });
      nz({ kind: 'brown', f0: 700, f1: 1400, filter: 'bandpass', q: 1.2, dur: 0.14, vol: 0.16, atk: 0.1, rel: 0.04, delay: 0.30 });
      nz({ kind: 'white', f0: 1200, f1: 320, filter: 'lowpass', dur: 0.06, vol: 0.36, atk: 0.001, rel: 0.055, delay: 0.44, drive: 0.7 });
      osc({ type: 'triangle', f0: 260, f1: 88, dur: 0.16, vol: 0.36, atk: 0.002, rel: 0.15, delay: 0.44, drive: 0.35 });
      osc({ type: 'sine', f0: 112, f1: 34, dur: 0.44, vol: 0.48, atk: 0.003, rel: 0.43, delay: 0.44 });
    },
    // 竜爪：ぶ厚い爪が装甲ごと引き裂く
    dclaw: function () {
      // 腹の底から響く「ゴアアァ」
      growl({ f0: 62, f1: 78, dur: 0.55, vol: 0.40, atk: 0.05, rel: 0.26,
              vowel: [300, 640, 2100], vowel2: [640, 1080, 2400],
              sub: 0.6, rasp: 0.25, drive: 0.6, rev: 0.4, vib: { f: 4.2, amt: 3 } });
      nz({ kind: 'brown', f0: 420, f1: 1100, filter: 'bandpass', q: 0.7, dur: 0.5, vol: 0.14, atk: 0.08, rel: 0.34 });
      [0.34, 0.41, 0.475].forEach(function (t, i) {
        nz({ kind: 'white', f0: 5200 - i * 620, f1: 900, filter: 'bandpass', q: 0.9, dur: 0.10, vol: 0.34, atk: 0.001, rel: 0.095, delay: t, drive: 0.55, rev: 0.3 });
        osc({ type: 'triangle', f0: 330 - i * 30, f1: 90, dur: 0.14, vol: 0.24, atk: 0.002, rel: 0.13, delay: t, drive: 0.35 });
      });
      osc({ type: 'sine', f0: 108, f1: 34, dur: 0.4, vol: 0.34, atk: 0.004, rel: 0.38, delay: 0.475 });
    },
    // 聖なる一撃：剣の一閃に光の炸裂が重なる
    holystrike: function () {
      swing({ lo: 650, hi: 5000, q: 1.0, dur: 0.11, vol: 0.20, mass: 210 });
      nz({ kind: 'white', f0: 10000, f1: 2200, filter: 'highpass', dur: 0.04, vol: 0.46, atk: 0.0006, rel: 0.038, delay: 0.10, drive: 0.5 });
      nz({ kind: 'white', f0: 3000, f1: 800, filter: 'bandpass', q: 1.3, dur: 0.075, vol: 0.28, atk: 0.001, rel: 0.073, delay: 0.102 });
      osc({ type: 'sine', f0: 185, f1: 52, dur: 0.18, vol: 0.28, atk: 0.002, rel: 0.175, delay: 0.102 });
      metal({ f: [3140, 4720, 6280], vol: 0.10, dur: 0.5, delay: 0.104, beat: 0.005, rev: 0.65 });
      [784, 1175, 1568].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 0.62 - i * 0.09, vol: 0.11, atk: 0.004, rel: 0.58 - i * 0.09,
              delay: 0.104 + i * 0.008, rev: 0.75 });
      });
      nz({ kind: 'white', f0: 6500, f1: 11000, filter: 'highpass', dur: 0.38, vol: 0.07, atk: 0.02, rel: 0.35, delay: 0.104, rev: 0.72 });
    },
    // かく乱の叫び：耳をつんざく鳥の絶叫
    screech: function () {
      osc({ type: 'sawtooth', f0: 1500, f1: 2600, dur: 0.14, vol: 0.13, atk: 0.02, rel: 0.06, lp: 5200, lq: 6, vib: { f: 22, amt: 190 } });
      osc({ type: 'sawtooth', f0: 2600, f1: 1100, dur: 0.30, vol: 0.15, atk: 0.02, rel: 0.24, lp: 6000, lq: 6, vib: { f: 15, amt: 150 }, delay: 0.13, rev: 0.5 });
      osc({ type: 'square', f0: 1290, f1: 780, dur: 0.28, vol: 0.05, atk: 0.03, rel: 0.24, lp: 4000, delay: 0.14 });
      nz({ kind: 'white', f0: 3600, f1: 6800, filter: 'bandpass', q: 1.6, dur: 0.34, vol: 0.14, atk: 0.04, rel: 0.28, rev: 0.4 });
      nz({ kind: 'pink', f0: 900, f1: 2600, filter: 'bandpass', q: 0.8, dur: 0.32, vol: 0.10, atk: 0.1, rel: 0.2 });
    },
    // 呪縛：低い詠唱と骨のカタカタ、締め上げるような軋み
    hex: function () {
      osc({ type: 'sawtooth', f0: 87, dur: 0.7, vol: 0.16, atk: 0.06, rel: 0.6, lp: 620, drive: 0.4, vib: { f: 5.5, amt: 3 }, rev: 0.35 });
      osc({ type: 'sawtooth', f0: 130.8, dur: 0.65, vol: 0.10, atk: 0.09, rel: 0.55, lp: 700, delay: 0.05, rev: 0.35 });
      osc({ type: 'sine', f0: 620, f1: 300, dur: 0.6, vol: 0.06, atk: 0.2, rel: 0.38, rev: 0.6 });
      [0.06, 0.13, 0.19, 0.28, 0.35].forEach(function (t, i) {         // 骨が鳴る
        nz({ kind: 'white', f0: 2400 + (i % 3) * 700, filter: 'bandpass', q: 9, dur: 0.045, vol: 0.11, delay: t, rev: 0.35 });
      });
    },
    // 不協和音：美しい和音が濁って軋む
    discord: function () {
      [440, 466.2, 622.3].forEach(function (f, i) {                    // 短2度＋三全音
        osc({ type: 'triangle', f0: f, f1: f * 0.94, dur: 0.7, vol: 0.13, atk: 0.006, rel: 0.62, delay: i * 0.008, rev: 0.55 });
      });
      osc({ type: 'sawtooth', f0: 110, f1: 103, dur: 0.7, vol: 0.11, atk: 0.01, rel: 0.62, lp: 900, drive: 0.35 });
      nz({ kind: 'white', f0: 3000, f1: 1400, filter: 'bandpass', q: 2.4, dur: 0.06, vol: 0.16, atk: 0.001, rel: 0.055 });
    },
    // 死の宣告：鐘が鳴り、囁きとともに沈む
    doom: function () {
      osc({ type: 'sine', f0: 110, dur: 1.1, vol: 0.30, atk: 0.003, rel: 1.05, rev: 0.6 });
      osc({ type: 'sine', f0: 293, dur: 0.9, vol: 0.13, atk: 0.003, rel: 0.88, rev: 0.7 });     // 鐘の非整数倍音
      osc({ type: 'sine', f0: 547, dur: 0.7, vol: 0.08, atk: 0.003, rel: 0.68, rev: 0.7 });
      osc({ type: 'sine', f0: 826, dur: 0.5, vol: 0.05, atk: 0.003, rel: 0.48, rev: 0.7 });
      nz({ kind: 'pink', f0: 1600, f1: 700, filter: 'bandpass', q: 1.4, dur: 0.7, vol: 0.10, atk: 0.2, rel: 0.45, rev: 0.6 });
      growl({ f0: 74, f1: 62, dur: 0.85, vol: 0.16, atk: 0.18, rel: 0.5, delay: 0.12,
              vowel: [300, 900, 2300], vowel2: [400, 1100, 2400],
              rasp: 0.6, drive: 0.3, rev: 0.6, vib: { f: 3.5, amt: 2 } });   // 死を告げる声
      osc({ type: 'sawtooth', f0: 82, f1: 41, dur: 0.9, vol: 0.14, atk: 0.15, rel: 0.7, lp: 460, drive: 0.4 });
    },
    // 亡者の手：土が裂け、湿った手が掴みかかる
    grasp: function () {
      nz({ kind: 'brown', f0: 700, f1: 180, filter: 'lowpass', q: 1.2, dur: 0.26, vol: 0.30, atk: 0.02, rel: 0.24, drive: 0.4 });
      [0.03, 0.10, 0.17].forEach(function (t, i) {
        nz({ kind: 'white', f0: 1800 - i * 300, filter: 'bandpass', q: 3, dur: 0.06, vol: 0.13, delay: t });
      });
      osc({ type: 'sawtooth', f0: 138, f1: 62, dur: 0.55, vol: 0.16, atk: 0.09, rel: 0.44, lp: 560, drive: 0.5, delay: 0.14, rev: 0.4, vib: { f: 6, amt: 6 } });
      nz({ kind: 'brown', f0: 420, f1: 900, filter: 'bandpass', q: 1.1, dur: 0.34, vol: 0.16, atk: 0.14, rel: 0.19, delay: 0.16 });
      growl({ f0: 128, f1: 104, dur: 0.5, vol: 0.20, atk: 0.12, rel: 0.32, delay: 0.16,
              vowel: [500, 1000, 2300], vowel2: [640, 1150, 2400],
              rasp: 0.7, drive: 0.35, rev: 0.45, vib: { f: 6.5, amt: 5 } });   // 亡者のうめき
      osc({ type: 'sine', f0: 66, f1: 36, dur: 0.5, vol: 0.30, atk: 0.03, rel: 0.46, delay: 0.14 });
    },
    // 秘術の矢：魔力が凝縮して弾け飛ぶ
    arcanebolt: function () {
      osc({ type: 'sine', f0: 400, f1: 1600, dur: 0.16, vol: 0.14, atk: 0.09, rel: 0.06, rev: 0.4 });
      nz({ kind: 'white', f0: 2000, f1: 6500, filter: 'bandpass', q: 2.2, dur: 0.16, vol: 0.11, atk: 0.09, rel: 0.06 });
      osc({ type: 'sine', f0: 2400, f1: 900, dur: 0.20, vol: 0.14, atk: 0.004, rel: 0.19, delay: 0.16, rev: 0.5 });
      osc({ type: 'sine', f0: 2412, f1: 906, dur: 0.20, vol: 0.10, atk: 0.004, rel: 0.19, delay: 0.168, rev: 0.5 });
      nz({ kind: 'white', f0: 5200, f1: 1600, filter: 'bandpass', q: 1.1, dur: 0.09, vol: 0.24, atk: 0.001, rel: 0.085, delay: 0.16, drive: 0.5 });
      osc({ type: 'sine', f0: 130, f1: 52, dur: 0.24, vol: 0.26, atk: 0.003, rel: 0.23, delay: 0.16 });
    },
    // 理の光：澄んだ一条の光線
    logos: function () {
      osc({ type: 'sine', f0: 880, dur: 0.62, vol: 0.18, atk: 0.05, rel: 0.5, rev: 0.6 });
      osc({ type: 'sine', f0: 1760, dur: 0.55, vol: 0.09, atk: 0.05, rel: 0.46, rev: 0.6 });
      osc({ type: 'sine', f0: 2640, dur: 0.45, vol: 0.05, atk: 0.05, rel: 0.4, rev: 0.7 });
      osc({ type: 'sine', f0: 220, dur: 0.6, vol: 0.16, atk: 0.04, rel: 0.5 });
      nz({ kind: 'white', f0: 6000, f1: 9500, filter: 'highpass', dur: 0.5, vol: 0.06, atk: 0.08, rel: 0.4, rev: 0.65 });
    },
    // 茨の呪縛：蔓が軋みながら伸び、棘が次々に刺さる
    thorn: function () {
      nz({ kind: 'brown', f0: 500, f1: 1500, filter: 'bandpass', q: 2.2, dur: 0.34, vol: 0.20, atk: 0.06, rel: 0.26, drive: 0.35 });
      osc({ type: 'sawtooth', f0: 150, f1: 320, dur: 0.32, vol: 0.09, atk: 0.06, rel: 0.24, lp: 900 });
      [0.10, 0.16, 0.21, 0.27].forEach(function (t, i) {                // 棘
        nz({ kind: 'white', f0: 4200 + i * 500, f1: 1400, filter: 'bandpass', q: 2.2, dur: 0.045, vol: 0.20, atk: 0.001, rel: 0.04, delay: t });
        osc({ type: 'triangle', f0: 300 - i * 25, f1: 110, dur: 0.07, vol: 0.14, atk: 0.002, rel: 0.065, delay: t });
      });
      osc({ type: 'sine', f0: 92, f1: 46, dur: 0.4, vol: 0.24, atk: 0.05, rel: 0.34 });
    },
    // 浄化の炎：炎に聖歌のきらめきが混ざる
    purge: function () {
      var d = 0.95;
      nz({ kind: 'white', f0: 2600, f1: 500, filter: 'lowpass', q: 0.7, dur: 0.14, vol: 0.32, atk: 0.002, rel: 0.13, drive: 0.6 });
      nz({ kind: 'brown', f0: 1400, f1: 520, filter: 'lowpass', q: 1.2, dur: d, vol: 0.44, atk: 0.05, rel: 0.6, drive: 0.4, rev: 0.4, lfo: { f: 9.5, amt: 480 } });
      nz({ kind: 'white', f0: 5200, f1: 3000, filter: 'bandpass', q: 1.5, dur: d * 0.8, vol: 0.13, atk: 0.02, rel: 0.5, lfo: { f: 19, amt: 1700 } });
      [1047, 1319, 1568].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 0.7 - i * 0.08, vol: 0.07, atk: 0.03, rel: 0.62 - i * 0.08, delay: 0.04 + i * 0.02, rev: 0.75 });
      });
      osc({ type: 'sine', f0: 98, f1: 60, dur: d, vol: 0.28, atk: 0.05, rel: 0.6 });
    },
    // 氷嵐：吹き荒れる氷の風と無数の破片
    blizzard: function () {
      var d = 1.0;
      nz({ kind: 'pink', f0: 700, f1: 3200, filter: 'bandpass', q: 1.1, dur: d, vol: 0.34, atk: 0.10, rel: 0.6, rev: 0.45, lfo: { f: 3.2, amt: 900 } });
      nz({ kind: 'white', f0: 6500, f1: 3400, filter: 'highpass', dur: d * 0.9, vol: 0.16, atk: 0.08, rel: 0.55, lfo: { f: 7.5, amt: 2200 } });
      [0.06, 0.15, 0.26, 0.38, 0.52].forEach(function (t, i) {          // 氷片がぶつかる
        osc({ type: 'sine', f0: 3100 + i * 620, dur: 0.22, vol: 0.07, atk: 0.002, rel: 0.21, delay: t, rev: 0.7 });
        nz({ kind: 'white', f0: 8000 + i * 400, filter: 'bandpass', q: 8, dur: 0.04, vol: 0.10, delay: t });
      });
      osc({ type: 'sine', f0: 140, f1: 62, dur: d * 0.7, vol: 0.22, atk: 0.06, rel: 0.55 });
    },
    // フロストノヴァ：張りつめた冷気が一気に凍りつき、周囲へ広がる
    frost: function () {
      nz({ kind: 'pink', f0: 5000, f1: 1200, filter: 'bandpass', q: 1.3, dur: 0.16, vol: 0.20, atk: 0.10, rel: 0.05 });   // 吸い込む冷気
      nz({ kind: 'white', f0: 11000, f1: 4200, filter: 'highpass', dur: 0.09, vol: 0.34, atk: 0.001, rel: 0.085, delay: 0.16 });
      [2637, 3520, 4699, 6270].forEach(function (f, i) {                 // 凍りつく響き
        osc({ type: 'sine', f0: f, f1: f * 0.985, dur: 0.85 - i * 0.12, vol: 0.11 - i * 0.02, atk: 0.002, rel: 0.8 - i * 0.12, delay: 0.16 + i * 0.014, rev: 0.75 });
      });
      nz({ kind: 'white', f0: 3000, f1: 9000, filter: 'bandpass', q: 1.0, dur: 0.55, vol: 0.13, atk: 0.03, rel: 0.5, delay: 0.17, rev: 0.6 });  // 霜が走る
      osc({ type: 'sine', f0: 210, f1: 74, dur: 0.30, vol: 0.24, atk: 0.003, rel: 0.29, delay: 0.16 });
    },
    // ファイアボルト：投げつけた火球が着弾で弾ける
    firebolt: function () {
      nz({ kind: 'brown', f0: 700, f1: 1800, filter: 'bandpass', q: 1.3, dur: 0.18, vol: 0.26, atk: 0.08, rel: 0.09, drive: 0.4, lfo: { f: 13, amt: 420 } });
      osc({ type: 'sawtooth', f0: 130, f1: 210, dur: 0.18, vol: 0.09, atk: 0.08, rel: 0.09, lp: 700 });
      nz({ kind: 'white', f0: 3000, f1: 420, filter: 'lowpass', q: 0.7, dur: 0.16, vol: 0.42, atk: 0.002, rel: 0.15, delay: 0.19, drive: 0.8, rev: 0.35 });
      nz({ kind: 'brown', f0: 1100, f1: 320, filter: 'lowpass', q: 1.2, dur: 0.42, vol: 0.32, atk: 0.01, rel: 0.4, delay: 0.19, drive: 0.5, lfo: { f: 11, amt: 380 } });
      osc({ type: 'sine', f0: 96, f1: 44, dur: 0.44, vol: 0.34, atk: 0.004, rel: 0.42, delay: 0.19 });
    },

    // 王命の盾：盾を突き立て、王家の合図が鳴る
    aegis: function () {
      nz({ kind: 'white', f0: 2600, f1: 700, filter: 'bandpass', q: 1.4, dur: 0.06, vol: 0.30, atk: 0.001, rel: 0.058, drive: 0.5 });
      osc({ type: 'sine', f0: 150, f1: 62, dur: 0.26, vol: 0.30, atk: 0.002, rel: 0.255 });
      [392, 523, 659].forEach(function (f, i) {                       // 王家の和音
        osc({ type: 'triangle', f0: f, dur: 0.8 - i * 0.09, vol: 0.11, atk: 0.02, rel: 0.72 - i * 0.09, delay: 0.06 + i * 0.02, rev: 0.7, detune: (i % 2 ? 6 : -6) });
      });
      osc({ type: 'triangle', f0: 1046, dur: 0.5, vol: 0.05, atk: 0.006, rel: 0.49, delay: 0.07, rev: 0.75 });
      nz({ kind: 'white', f0: 6000, f1: 10000, filter: 'highpass', dur: 0.45, vol: 0.06, atk: 0.1, rel: 0.34, delay: 0.06, rev: 0.7 });
    },
    // 破城の一撃：石の巨体が軋み、城門ごと打ち砕く
    siege: function () {
      nz({ kind: 'brown', f0: 220, f1: 560, filter: 'bandpass', q: 3.4, dur: 0.26, vol: 0.24, atk: 0.06, rel: 0.19, drive: 0.5 });
      nz({ kind: 'white', f0: 1700, f1: 240, filter: 'lowpass', dur: 0.10, vol: 0.46, atk: 0.001, rel: 0.098, drive: 0.9, delay: 0.26 });
      osc({ type: 'triangle', f0: 430, f1: 110, dur: 0.22, vol: 0.38, atk: 0.002, rel: 0.215, drive: 0.55, delay: 0.26 });
      osc({ type: 'sine', f0: 112, f1: 26, dur: 0.7, vol: 0.55, atk: 0.003, rel: 0.69, delay: 0.26 });
      nz({ kind: 'brown', f0: 500, f1: 80, filter: 'lowpass', dur: 0.85, vol: 0.32, atk: 0.012, rel: 0.83, rev: 0.55, delay: 0.28 });
      [0.32, 0.38, 0.45, 0.53].forEach(function (t, i) {
        nz({ kind: 'white', f0: 1500 + i * 700, filter: 'bandpass', q: 4, dur: 0.05, vol: 0.10, delay: t, rev: 0.35 });
      });
    },
    // 古代の砲：歯車が回り、砲身から重い一発
    cannon: function () {
      [0, 0.05, 0.10].forEach(function (t, i) {                       // 歯車の駆動音
        nz({ kind: 'white', f0: 900 + i * 180, filter: 'bandpass', q: 8, dur: 0.045, vol: 0.13, delay: t });
      });
      osc({ type: 'sawtooth', f0: 70, f1: 96, dur: 0.16, vol: 0.14, atk: 0.05, rel: 0.1, lp: 400, drive: 0.4 });
      nz({ kind: 'white', f0: 2400, f1: 220, filter: 'lowpass', q: 0.7, dur: 0.16, vol: 0.48, atk: 0.001, rel: 0.158, drive: 0.9, delay: 0.17, rev: 0.4 });
      osc({ type: 'sine', f0: 130, f1: 30, dur: 0.55, vol: 0.5, atk: 0.002, rel: 0.545, delay: 0.17 });
      nz({ kind: 'brown', f0: 420, f1: 90, filter: 'lowpass', dur: 0.6, vol: 0.24, atk: 0.01, rel: 0.59, delay: 0.19, rev: 0.55 });
    },
    // 鉤爪（ワイバーン）：竜爪より軽く、鋭い
    wclaw: function () {
      growl({ f0: 190, f1: 240, dur: 0.24, vol: 0.22, atk: 0.02, rel: 0.16,
              vowel: [620, 1500, 2900], vowel2: [880, 1700, 3000],
              rasp: 0.45, drive: 0.5, vib: { f: 14, amt: 12 } });
      [0.16, 0.215].forEach(function (t, i) {
        nz({ kind: 'white', f0: 6200 - i * 700, f1: 1500, filter: 'bandpass', q: 1.0, dur: 0.08, vol: 0.32, atk: 0.001, rel: 0.078, delay: t, drive: 0.45, rev: 0.28 });
        osc({ type: 'triangle', f0: 330 - i * 30, f1: 105, dur: 0.11, vol: 0.22, atk: 0.002, rel: 0.105, delay: t });
      });
    },
    // 毒の息：シュウウ…と噴き出す酸性の霧
    venom: function () {
      nz({ kind: 'white', f0: 6800, f1: 3400, filter: 'bandpass', q: 1.1, dur: 0.55, vol: 0.30, atk: 0.05, rel: 0.44, rev: 0.35, lfo: { f: 9, amt: 1500 } });
      nz({ kind: 'pink', f0: 1500, f1: 700, filter: 'bandpass', q: 1.4, dur: 0.5, vol: 0.20, atk: 0.06, rel: 0.4 });
      osc({ type: 'sawtooth', f0: 128, f1: 86, dur: 0.45, vol: 0.14, atk: 0.05, rel: 0.38, lp: 620, drive: 0.45, vib: { f: 11, amt: 6 } });
      osc({ type: 'sine', f0: 84, f1: 52, dur: 0.45, vol: 0.22, atk: 0.06, rel: 0.38 });
    },
    // 幻影の矢：実体のない矢が空気だけを残して抜けていく
    parrow: function () {
      osc({ type: 'triangle', f0: 205, f1: 78, dur: 0.09, vol: 0.22, atk: 0.001, rel: 0.088, drive: 0.25 });
      nz({ kind: 'pink', f0: 1600, f1: 6800, filter: 'bandpass', q: 5.0, dur: 0.13, vol: 0.28, atk: 0.05, rel: 0.06, delay: 0.09 });
      nz({ kind: 'pink', f0: 6800, f1: 1700, filter: 'bandpass', q: 5.0, dur: 0.17, vol: 0.24, atk: 0.02, rel: 0.14, delay: 0.21, rev: 0.45 });
      osc({ type: 'sine', f0: 2600, f1: 1500, dur: 0.30, vol: 0.06, atk: 0.02, rel: 0.29, delay: 0.2, rev: 0.7 });
      osc({ type: 'sine', f0: 2617, f1: 1510, dur: 0.30, vol: 0.05, atk: 0.02, rel: 0.29, delay: 0.21, rev: 0.7 });
    },
    // 三連矢：三本が続けて放たれる
    triple: function () {
      [0, 0.085, 0.17].forEach(function (t, i) {
        osc({ type: 'triangle', f0: 215 - i * 8, f1: 82, dur: 0.07, vol: 0.20, atk: 0.001, rel: 0.068, delay: t });
        nz({ kind: 'pink', f0: 1700 + i * 250, f1: 6600, filter: 'bandpass', q: 5.5, dur: 0.10, vol: 0.24, atk: 0.04, rel: 0.05, delay: t + 0.02 });
        osc({ type: 'sine', f0: 2400 + i * 260, f1: 1400, dur: 0.2, vol: 0.05, atk: 0.02, rel: 0.19, delay: t + 0.05, rev: 0.6 });
      });
    },

    /* =====================================================
       命中音：技と武器の材質が伝わるよう、低い「ぼこっ」を止めて
       高域の切っ先＋中域の手応えで鳴らし分ける
       ===================================================== */

    // 剣が斬る：ザシュッ（鋼の切っ先 → 断ち切る音 → 刃鳴り）
    i_cut: function () {
      nz({ kind: 'white', f0: 8600, f1: 1300, filter: 'bandpass', q: 1.1, dur: 0.055, vol: 0.44, atk: 0.0008, rel: 0.052, drive: 0.5 });
      nz({ kind: 'pink',  f0: 2300, f1: 620,  filter: 'bandpass', q: 2.6, dur: 0.10,  vol: 0.24, atk: 0.001, rel: 0.098, delay: 0.008 });
      metal({ f: [3210, 4870, 6640], vol: 0.10, dur: 0.42, delay: 0.004, beat: 0.006, rev: 0.62 });
      osc({ type: 'triangle', f0: 330, f1: 190, dur: 0.05, vol: 0.13, atk: 0.001, rel: 0.048 });
    },
    // 薙ぎ払い：ザシャアッ（横一線に裂ける）
    i_cutwide: function () {
      nz({ kind: 'white', f0: 9000, f1: 1000, filter: 'bandpass', q: 0.8, dur: 0.11, vol: 0.42, atk: 0.001, rel: 0.107, drive: 0.5 });
      nz({ kind: 'pink',  f0: 2600, f1: 520,  filter: 'bandpass', q: 1.8, dur: 0.17, vol: 0.24, atk: 0.002, rel: 0.166, delay: 0.02, rev: 0.35 });
      osc({ type: 'triangle', f0: 3100, f1: 2900, dur: 0.22, vol: 0.06, atk: 0.002, rel: 0.215, delay: 0.01, rev: 0.6 });
      osc({ type: 'triangle', f0: 300, f1: 165, dur: 0.07, vol: 0.14, atk: 0.001, rel: 0.068 });
    },
    // 矢が射抜く：スパァッ（風を切ったまま貫通し、矢柄が震える）
    i_arrow: function () {
      nz({ kind: 'white', f0: 12000, f1: 3000, filter: 'highpass', dur: 0.028, vol: 0.60, atk: 0.0005, rel: 0.027 });
      nz({ kind: 'white', f0: 6500, f1: 1600, filter: 'bandpass', q: 1.0, dur: 0.06, vol: 0.42, atk: 0.0008, rel: 0.058, delay: 0.003, drive: 0.4 });
      nz({ kind: 'white', f0: 1800, f1: 1150, filter: 'bandpass', q: 6.5, dur: 0.05, vol: 0.26, atk: 0.001, rel: 0.048, delay: 0.005 });
      osc({ type: 'triangle', f0: 196, f1: 178, dur: 0.30, vol: 0.07, atk: 0.006, rel: 0.293, delay: 0.03, lp: 1400, vib: { f: 46, amt: 16 } });
      osc({ type: 'triangle', f0: 400, f1: 250, dur: 0.04, vol: 0.10, atk: 0.001, rel: 0.038 });
    },
    // 突き刺さる：ズシュッ（一点に食い込む）
    i_stab: function () {
      nz({ kind: 'white', f0: 6400, f1: 1500, filter: 'bandpass', q: 1.5, dur: 0.04, vol: 0.42, atk: 0.0007, rel: 0.038, drive: 0.4 });
      nz({ kind: 'brown', f0: 1100, f1: 340,  filter: 'bandpass', q: 2.2, dur: 0.085, vol: 0.26, atk: 0.001, rel: 0.083, delay: 0.006 });
      metal({ f: [2560, 3910, 5480], vol: 0.085, dur: 0.34, delay: 0.004, beat: 0.005, rev: 0.6 });
      osc({ type: 'triangle', f0: 340, f1: 200, dur: 0.055, vol: 0.15, atk: 0.001, rel: 0.053 });
    },
    // 天翔ける槍：シャキィンッ（光をまとった穂先が貫く）
    i_spear: function () {
      nz({ kind: 'white', f0: 12000, f1: 4000, filter: 'highpass', dur: 0.03, vol: 0.42, atk: 0.0006, rel: 0.029 });
      metal({ f: [4186, 6272, 8372, 10500], vol: 0.12, dur: 0.7, beat: 0.005, roll: 0.66, rev: 0.78 });
      nz({ kind: 'white', f0: 2400, f1: 800, filter: 'bandpass', q: 2.2, dur: 0.06, vol: 0.24, atk: 0.001, rel: 0.058, delay: 0.005 });
      osc({ type: 'triangle', f0: 420, f1: 230, dur: 0.06, vol: 0.15, atk: 0.001, rel: 0.058 });
    },
    // 爪で引き裂く：ビリィッ（布と肉が裂ける）
    i_rip: function () {
      [0, 0.012, 0.026, 0.042, 0.06, 0.08].forEach(function (t, i) {
        nz({ kind: 'white', f0: 7000 - i * 900, f1: 1600, filter: 'bandpass', q: 1.4, dur: 0.05, vol: 0.26 - i * 0.02, atk: 0.0008, rel: 0.048, delay: t, drive: 0.4 });
      });
      nz({ kind: 'brown', f0: 1500, f1: 420, filter: 'bandpass', q: 1.6, dur: 0.16, vol: 0.26, atk: 0.002, rel: 0.156, drive: 0.4, rev: 0.3 });
      osc({ type: 'triangle', f0: 360, f1: 170, dur: 0.10, vol: 0.18, atk: 0.002, rel: 0.098 });
    },
    // 角がぶつかる：ゴキッ（骨と骨）
    i_horn: function () {
      nz({ kind: 'white', f0: 1400, filter: 'bandpass', q: 9, dur: 0.028, vol: 0.42, atk: 0.0006, rel: 0.027, drive: 0.7 });
      nz({ kind: 'white', f0: 3200, f1: 900, filter: 'bandpass', q: 1.4, dur: 0.05, vol: 0.24, atk: 0.001, rel: 0.048 });
      osc({ type: 'triangle', f0: 430, f1: 150, dur: 0.13, vol: 0.32, atk: 0.001, rel: 0.128, drive: 0.5 });
      osc({ type: 'sine', f0: 130, f1: 52, dur: 0.26, vol: 0.30, atk: 0.002, rel: 0.256 });
    },
    // 岩がぶつかる：ガシャアッ（割れて礫が散る）
    i_rock: function () {
      nz({ kind: 'white', f0: 2600, f1: 700, filter: 'bandpass', q: 1.0, dur: 0.055, vol: 0.46, atk: 0.0007, rel: 0.053, drive: 0.85 });
      // 石は倍音が極端に濁る（うなりを強く）
      metal({ f: [389, 617, 1043, 1571], vol: 0.09, dur: 0.24, beat: 0.028, roll: 0.7, rev: 0.35, type: 'sine' });
      osc({ type: 'sine', f0: 140, f1: 46, dur: 0.28, vol: 0.36, atk: 0.002, rel: 0.276 });
      [0.03, 0.06, 0.10, 0.15, 0.21].forEach(function (t, i) {
        nz({ kind: 'white', f0: 1400 + i * 640, filter: 'bandpass', q: 5, dur: 0.04, vol: 0.13, delay: t, rev: 0.35 });
      });
    },
    // 打ち砕く：ドゴッ（鈍器・巨体の一撃）
    i_crush: function () {
      nz({ kind: 'white', f0: 2000, f1: 380, filter: 'lowpass', dur: 0.06, vol: 0.46, atk: 0.0008, rel: 0.058, drive: 0.85 });
      osc({ type: 'triangle', f0: 470, f1: 128, dur: 0.15, vol: 0.38, atk: 0.001, rel: 0.148, drive: 0.5 });
      osc({ type: 'sine', f0: 132, f1: 36, dur: 0.32, vol: 0.40, atk: 0.002, rel: 0.316 });
      // 鎧がひしゃげる濁った金属
      metal({ f: [318, 561, 902, 1364], vol: 0.10, dur: 0.5, beat: 0.011, roll: 0.6, rev: 0.5, type: 'sine' });
      nz({ kind: 'brown', f0: 460, f1: 100, filter: 'lowpass', dur: 0.34, vol: 0.18, atk: 0.008, rel: 0.33, rev: 0.4 });
    },
    // 凍りつく：パキィンッ（氷が割れて破片がこぼれる）
    i_ice: function () {
      nz({ kind: 'white', f0: 9500, f1: 5200, filter: 'highpass', dur: 0.03, vol: 0.34, atk: 0.001, rel: 0.028 });
      [3520, 4699, 5920].forEach(function (f, i) {
        osc({ type: 'sine', f0: f, dur: 0.42 - i * 0.09, vol: 0.13 - i * 0.03, atk: 0.001, rel: 0.4 - i * 0.09, delay: i * 0.006, rev: 0.75 });
      });
      nz({ kind: 'white', f0: 6200, f1: 2600, filter: 'bandpass', q: 2.6, dur: 0.09, vol: 0.20, atk: 0.001, rel: 0.085 });
      [0.05, 0.09, 0.14, 0.19].forEach(function (t, i) {
        nz({ kind: 'white', f0: 7800 + i * 900, filter: 'bandpass', q: 11, dur: 0.035, vol: 0.11, delay: t, rev: 0.5 });
      });
      osc({ type: 'sine', f0: 240, f1: 96, dur: 0.16, vol: 0.20, atk: 0.002, rel: 0.15 });
    },
    // 燃える：ボッと爆ぜる
    i_fire: function () {
      nz({ kind: 'white', f0: 3000, f1: 480, filter: 'lowpass', q: 0.7, dur: 0.075, vol: 0.40, atk: 0.0008, rel: 0.073, drive: 0.8 });
      nz({ kind: 'brown', f0: 1100, f1: 300, filter: 'lowpass', q: 1.2, dur: 0.30, vol: 0.28, atk: 0.005, rel: 0.295, drive: 0.5, lfo: { f: 15, amt: 360 }, rev: 0.35 });
      osc({ type: 'triangle', f0: 400, f1: 110, dur: 0.12, vol: 0.26, atk: 0.001, rel: 0.118, drive: 0.45 });
      osc({ type: 'sine', f0: 110, f1: 40, dur: 0.30, vol: 0.30, atk: 0.002, rel: 0.296 });
    },
    // 魔力が弾ける：パチッ（帯電した破裂）
    i_arcane: function () {
      nz({ kind: 'white', f0: 7000, f1: 1800, filter: 'bandpass', q: 1.1, dur: 0.035, vol: 0.36, atk: 0.0006, rel: 0.034, drive: 0.55 });
      osc({ type: 'sine', f0: 2600, f1: 780, dur: 0.16, vol: 0.16, atk: 0.001, rel: 0.158, rev: 0.6 });
      osc({ type: 'sine', f0: 2618, f1: 786, dur: 0.16, vol: 0.11, atk: 0.001, rel: 0.158, delay: 0.007, rev: 0.6 });
      osc({ type: 'triangle', f0: 360, f1: 170, dur: 0.07, vol: 0.16, atk: 0.001, rel: 0.068 });
    },
    // 呪いが染みる：ドスン…（音を吸われたような鈍い衝撃）
    i_dark: function () {
      nz({ kind: 'brown', f0: 950, f1: 190, filter: 'lowpass', q: 1.1, dur: 0.20, vol: 0.36, atk: 0.002, rel: 0.196, drive: 0.55, rev: 0.4 });
      osc({ type: 'triangle', f0: 250, f1: 78, dur: 0.14, vol: 0.26, atk: 0.001, rel: 0.138, drive: 0.4 });
      osc({ type: 'sine', f0: 96, f1: 34, dur: 0.36, vol: 0.34, atk: 0.002, rel: 0.356 });
      nz({ kind: 'pink', f0: 1900, f1: 800, filter: 'bandpass', q: 2, dur: 0.26, vol: 0.08, atk: 0.015, rel: 0.244, rev: 0.55 });
    },
    // 光に灼かれる：シャアッ（明るく弾ける）
    i_light: function () {
      nz({ kind: 'white', f0: 9000, f1: 2600, filter: 'highpass', dur: 0.032, vol: 0.36, atk: 0.0006, rel: 0.031 });
      metal({ f: [1568, 2349, 3136, 4700], vol: 0.11, dur: 0.62, beat: 0.004, roll: 0.68, rev: 0.75 });
      nz({ kind: 'white', f0: 5000, f1: 9000, filter: 'highpass', dur: 0.22, vol: 0.08, atk: 0.01, rel: 0.208, rev: 0.7 });
      osc({ type: 'triangle', f0: 420, f1: 190, dur: 0.06, vol: 0.16, atk: 0.001, rel: 0.058 });
    },
    // 死の刻印：スッ…（音もなく喉を裂き、鼓動が止まる）
    i_mark: function () {
      nz({ kind: 'white', f0: 9500, f1: 2400, filter: 'bandpass', q: 1.3, dur: 0.035, vol: 0.34, atk: 0.0006, rel: 0.034 });
      nz({ kind: 'pink', f0: 2200, f1: 700, filter: 'bandpass', q: 3, dur: 0.075, vol: 0.16, atk: 0.001, rel: 0.073, delay: 0.005, rev: 0.4 });
      osc({ type: 'sine', f0: 92, f1: 52, dur: 0.16, vol: 0.32, atk: 0.002, rel: 0.156, delay: 0.10 });   // 鼓動
      osc({ type: 'sine', f0: 82, f1: 44, dur: 0.22, vol: 0.24, atk: 0.002, rel: 0.216, delay: 0.24 });
    },
    // 湿った衝撃（吸血）
    i_wet: function () {
      nz({ kind: 'brown', f0: 1400, f1: 300, filter: 'lowpass', dur: 0.075, vol: 0.36, atk: 0.001, rel: 0.073, drive: 0.55 });
      nz({ kind: 'pink', f0: 900, f1: 2200, filter: 'bandpass', q: 2.6, dur: 0.12, vol: 0.16, atk: 0.01, rel: 0.108, delay: 0.02 });
      osc({ type: 'triangle', f0: 330, f1: 100, dur: 0.10, vol: 0.24, atk: 0.001, rel: 0.098, drive: 0.4 });
      osc({ type: 'sine', f0: 155, f1: 50, dur: 0.22, vol: 0.28, atk: 0.002, rel: 0.216 });
    },
    // 突風がぶつかる：バサッ
    i_gust: function () {
      nz({ kind: 'white', f0: 6000, f1: 1400, filter: 'bandpass', q: 0.9, dur: 0.06, vol: 0.34, atk: 0.001, rel: 0.058 });
      nz({ kind: 'pink', f0: 1800, f1: 500, filter: 'bandpass', q: 0.8, dur: 0.16, vol: 0.26, atk: 0.003, rel: 0.156, rev: 0.35 });
      osc({ type: 'triangle', f0: 380, f1: 140, dur: 0.08, vol: 0.18, atk: 0.001, rel: 0.078 });
    },
    // 棘が刺さる：プツッ・ブスッ
    i_thorn: function () {
      nz({ kind: 'white', f0: 5600, f1: 1500, filter: 'bandpass', q: 2.2, dur: 0.03, vol: 0.34, atk: 0.0006, rel: 0.029 });
      nz({ kind: 'brown', f0: 900, f1: 320, filter: 'bandpass', q: 2.6, dur: 0.13, vol: 0.24, atk: 0.002, rel: 0.128, drive: 0.4 });
      osc({ type: 'triangle', f0: 440, f1: 150, dur: 0.075, vol: 0.22, atk: 0.001, rel: 0.073 });
      osc({ type: 'sine', f0: 150, f1: 62, dur: 0.16, vol: 0.20, atk: 0.002, rel: 0.156 });
    },
    // 毒が焼く：ジュウゥ…（酸のしみ込む音）
    i_venom: function () {
      nz({ kind: 'white', f0: 7000, f1: 2600, filter: 'bandpass', q: 1.2, dur: 0.05, vol: 0.30, atk: 0.001, rel: 0.048 });
      nz({ kind: 'pink', f0: 3800, f1: 1500, filter: 'bandpass', q: 1.6, dur: 0.28, vol: 0.20, atk: 0.01, rel: 0.27, rev: 0.4, lfo: { f: 13, amt: 900 } });
      osc({ type: 'triangle', f0: 340, f1: 130, dur: 0.09, vol: 0.20, atk: 0.001, rel: 0.088 });
      osc({ type: 'sine', f0: 130, f1: 58, dur: 0.2, vol: 0.22, atk: 0.002, rel: 0.196 });
    },
    // 痛恨の一撃で命中音に重ねる、腹に響く一撃
    critboom: function () {
      osc({ type: 'sine', f0: 138, f1: 30, dur: 0.42, vol: 0.5, atk: 0.002, rel: 0.41 });
      osc({ type: 'triangle', f0: 620, f1: 145, dur: 0.16, vol: 0.30, atk: 0.002, rel: 0.15, drive: 0.5 });
      nz({ kind: 'brown', f0: 520, f1: 100, filter: 'lowpass', dur: 0.5, vol: 0.24, atk: 0.008, rel: 0.48, rev: 0.55 });
    },

    // 火の粉（サラマンダー）：小さな火球がぱちぱちと舞う
    ember: function () {
      nz({ kind: 'brown', f0: 900, f1: 2000, filter: 'bandpass', q: 1.4, dur: 0.16, vol: 0.22, atk: 0.06, rel: 0.09, drive: 0.4, lfo: { f: 16, amt: 500 } });
      nz({ kind: 'white', f0: 2800, f1: 600, filter: 'lowpass', q: 0.7, dur: 0.12, vol: 0.34, atk: 0.002, rel: 0.115, drive: 0.6, delay: 0.16 });
      nz({ kind: 'brown', f0: 1000, f1: 340, filter: 'lowpass', q: 1.2, dur: 0.32, vol: 0.26, atk: 0.01, rel: 0.31, drive: 0.45, lfo: { f: 13, amt: 340 }, delay: 0.16, rev: 0.35 });
      [0.20, 0.27, 0.35].forEach(function (t, i) {
        nz({ kind: 'white', f0: 4200 + i * 700, filter: 'bandpass', q: 3.5, dur: 0.045, vol: 0.10, delay: t });
      });
      osc({ type: 'sine', f0: 92, f1: 46, dur: 0.34, vol: 0.28, atk: 0.004, rel: 0.33, delay: 0.16 });
    },
    // 焔纏い（味方全体を燃え上がらせる）
    blaze: function () {
      nz({ kind: 'brown', f0: 700, f1: 1500, filter: 'bandpass', q: 1.1, dur: 0.7, vol: 0.30, atk: 0.14, rel: 0.5, drive: 0.4, rev: 0.4, lfo: { f: 9, amt: 420 } });
      [523, 659, 831].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f * 0.97, f1: f, dur: 0.75 - i * 0.08, vol: 0.10, atk: 0.1, rel: 0.6, delay: i * 0.03, rev: 0.6 });
      });
      nz({ kind: 'white', f0: 4200, f1: 8000, filter: 'highpass', dur: 0.5, vol: 0.07, atk: 0.14, rel: 0.34, rev: 0.6 });
      osc({ type: 'sine', f0: 98, f1: 62, dur: 0.6, vol: 0.24, atk: 0.08, rel: 0.5 });
    },
    // 氷塊叩き（イエティ）：凍った塊を叩きつける
    iceclub: function () {
      growl({ f0: 120, f1: 92, dur: 0.3, vol: 0.26, atk: 0.03, rel: 0.2,
              vowel: [420, 900, 2400], vowel2: [620, 1100, 2500], sub: 0.5, rasp: 0.35, drive: 0.5, vib: { f: 7, amt: 5 } });
      nz({ kind: 'white', f0: 2200, f1: 600, filter: 'lowpass', dur: 0.08, vol: 0.42, atk: 0.001, rel: 0.078, drive: 0.8, delay: 0.26 });
      osc({ type: 'triangle', f0: 440, f1: 130, dur: 0.16, vol: 0.34, atk: 0.002, rel: 0.155, drive: 0.5, delay: 0.26 });
      osc({ type: 'sine', f0: 118, f1: 34, dur: 0.4, vol: 0.42, atk: 0.003, rel: 0.39, delay: 0.26 });
      [0.30, 0.35, 0.41].forEach(function (t, i) {
        nz({ kind: 'white', f0: 7000 + i * 900, filter: 'bandpass', q: 9, dur: 0.04, vol: 0.11, delay: t, rev: 0.5 });
      });
    },
    // 凍てつく咆哮（イエティ）：吠えると空気が凍る
    frostroar: function () {
      growl({ f0: 104, f1: 138, dur: 0.5, vol: 0.34, atk: 0.05, rel: 0.28,
              vowel: [380, 820, 2400], vowel2: [740, 1200, 2600], sub: 0.55, rasp: 0.4, drive: 0.55, rev: 0.35, vib: { f: 6, amt: 6 } });
      nz({ kind: 'pink', f0: 900, f1: 4200, filter: 'bandpass', q: 1.2, dur: 0.6, vol: 0.26, atk: 0.14, rel: 0.44, rev: 0.45, lfo: { f: 4, amt: 1100 }, delay: 0.2 });
      [3136, 4186, 5274].forEach(function (f, i) {
        osc({ type: 'sine', f0: f, dur: 0.5 - i * 0.1, vol: 0.08 - i * 0.02, atk: 0.02, rel: 0.46 - i * 0.1, delay: 0.24 + i * 0.02, rev: 0.7 });
      });
      osc({ type: 'sine', f0: 150, f1: 66, dur: 0.4, vol: 0.24, atk: 0.03, rel: 0.36, delay: 0.2 });
    },

    /* ===== 状況 ===== */
    // 通常ヒット（1発ごとに鳴るので軽め・短め）
    hit: function () {
      nz({ kind: 'white', f0: 3400, f1: 900, filter: 'bandpass', q: 0.8, dur: 0.05, vol: 0.28, atk: 0.001, rel: 0.045, drive: 0.35 });
      osc({ type: 'triangle', f0: 540, f1: 175, dur: 0.09, vol: 0.30, atk: 0.002, rel: 0.085, drive: 0.3 });
      osc({ type: 'sine', f0: 185, f1: 62, dur: 0.14, vol: 0.30, atk: 0.002, rel: 0.13 });
    },
    // 痛恨の一撃
    bighit: function () {
      nz({ kind: 'white', f0: 2600, f1: 400, filter: 'lowpass', dur: 0.10, vol: 0.46, atk: 0.001, rel: 0.095, drive: 0.75 });
      osc({ type: 'triangle', f0: 660, f1: 155, dur: 0.17, vol: 0.36, atk: 0.002, rel: 0.16, drive: 0.45 });
      osc({ type: 'sine', f0: 142, f1: 34, dur: 0.38, vol: 0.50, atk: 0.002, rel: 0.37 });
      nz({ kind: 'brown', f0: 470, f1: 105, filter: 'lowpass', dur: 0.42, vol: 0.20, atk: 0.01, rel: 0.4, rev: 0.5 });
      osc({ type: 'triangle', f0: 880, f1: 500, dur: 0.14, vol: 0.06, atk: 0.002, rel: 0.13, rev: 0.4 });
    },
    // 撃破：崩れ落ちる
    death: function () {
      osc({ type: 'sawtooth', f0: 300, f1: 42, dur: 0.75, vol: 0.26, atk: 0.01, rel: 0.72, lp: 880, drive: 0.45, rev: 0.4 });
      nz({ kind: 'brown', f0: 850, f1: 95, filter: 'lowpass', dur: 0.8, vol: 0.28, atk: 0.02, rel: 0.76, rev: 0.5 });
      osc({ type: 'triangle', f0: 300, f1: 95, dur: 0.3, vol: 0.20, atk: 0.008, rel: 0.29, drive: 0.35 });
      osc({ type: 'sine', f0: 92, f1: 28, dur: 0.65, vol: 0.32, atk: 0.01, rel: 0.62 });
      [0.05, 0.14, 0.25].forEach(function (t, i) {
        nz({ kind: 'white', f0: 2200 - i * 420, filter: 'bandpass', q: 2, dur: 0.055, vol: 0.08, delay: t, rev: 0.3 });
      });
    },
    // 首狩り：鋭い一閃 → 間 → 重い落着
    execute: function () {
      nz({ kind: 'white', f0: 9500, f1: 2200, filter: 'highpass', dur: 0.075, vol: 0.44, atk: 0.001, rel: 0.07, drive: 0.5 });
      osc({ type: 'triangle', f0: 5200, dur: 0.32, vol: 0.06, atk: 0.002, rel: 0.31, rev: 0.75 });
      osc({ type: 'triangle', f0: 520, f1: 120, dur: 0.22, vol: 0.34, atk: 0.003, rel: 0.21, delay: 0.11, drive: 0.5 });
      osc({ type: 'sine', f0: 152, f1: 25, dur: 0.85, vol: 0.55, atk: 0.003, rel: 0.83, delay: 0.11 });
      nz({ kind: 'brown', f0: 620, f1: 75, filter: 'lowpass', dur: 0.95, vol: 0.30, atk: 0.01, rel: 0.92, delay: 0.11, rev: 0.55, drive: 0.5 });
    },

    /* ===== 画面遷移 ===== */
    round: function () {
      [523, 784].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 0.55, vol: 0.12, atk: 0.006, rel: 0.52, delay: i * 0.07, rev: 0.5 });
      });
      osc({ type: 'sine', f0: 131, dur: 0.55, vol: 0.20, atk: 0.006, rel: 0.52 });
      nz({ kind: 'white', f0: 6000, f1: 12000, filter: 'highpass', dur: 0.28, vol: 0.05, atk: 0.004, rel: 0.27, rev: 0.5 });
    },
    start: function () {
      [392, 523, 659, 784].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 0.6, vol: 0.13, atk: 0.006, rel: 0.55, delay: i * 0.085, rev: 0.5 });
      });
      osc({ type: 'sine', f0: 98, f1: 196, dur: 0.7, vol: 0.22, atk: 0.01, rel: 0.6 });
      nz({ kind: 'brown', f0: 700, f1: 160, filter: 'lowpass', dur: 0.5, vol: 0.16, atk: 0.02, rel: 0.46, rev: 0.4 });
    },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        osc({ type: 'triangle', f0: f, dur: 0.9 - i * 0.06, vol: 0.13, atk: 0.006, rel: 0.7, delay: i * 0.1, rev: 0.6 });
      });
      osc({ type: 'sine', f0: 131, f1: 262, dur: 1.0, vol: 0.22, atk: 0.02, rel: 0.8 });
      nz({ kind: 'white', f0: 5000, f1: 12000, filter: 'highpass', dur: 0.7, vol: 0.06, atk: 0.2, rel: 0.45, rev: 0.7 });
    },
    lose: function () {
      [523, 440, 349, 262].forEach(function (f, i) {
        osc({ type: 'sine', f0: f, dur: 0.9 - i * 0.05, vol: 0.14, atk: 0.02, rel: 0.7, delay: i * 0.13, rev: 0.55 });
      });
      osc({ type: 'sawtooth', f0: 110, f1: 55, dur: 1.1, vol: 0.16, atk: 0.05, rel: 0.95, lp: 500 });
    },

    /* ===== UI（主張しすぎない） ===== */
    ui: function () {
      osc({ type: 'sine', f0: 1150, f1: 780, dur: 0.055, vol: 0.07, atk: 0.002, rel: 0.05, lp: 3000 });
    },
    select: function () {
      osc({ type: 'sine', f0: 680, f1: 1150, dur: 0.10, vol: 0.11, atk: 0.004, rel: 0.09, lp: 4000 });
      nz({ kind: 'white', f0: 5200, filter: 'bandpass', q: 2, dur: 0.035, vol: 0.05 });
    }
  };

  /* fx名 → 効果音名の対応（未定義は汎用ヒット） */
  var ALIAS = { holyhit: 'holy' };

  /* 攻撃の fx名 → 命中音。技の当たり方に合わせて鳴り分ける */
  var IMPACT = {
    slash: 'i_cut', sweep: 'i_cutwide', holystrike: 'i_light',
    pierce: 'i_stab', lance: 'i_stab', dagger: 'i_stab',
    mark: 'i_mark', arrow: 'i_arrow', spear: 'i_spear',
    claw: 'i_rip', dclaw: 'i_rip',
    bash: 'i_crush', smash: 'i_crush', wallop: 'i_crush', earth: 'i_crush',
    horn: 'i_horn', rock: 'i_rock',
    ice: 'i_ice', frost: 'i_ice', blizzard: 'i_ice',
    fire: 'i_fire', firebolt: 'i_fire', breath: 'i_fire', purge: 'i_fire', meteor: 'i_fire',
    arcane: 'i_arcane', arcanebolt: 'i_arcane', logos: 'i_light', discord: 'i_arcane',
    shadow: 'i_dark', doom: 'i_dark', grasp: 'i_dark', hex: 'i_dark',
    holy: 'i_light', blood: 'i_wet',
    wind: 'i_gust', screech: 'i_gust', thorn: 'i_thorn',
    siege: 'i_crush', cannon: 'i_crush', wclaw: 'i_rip', venom: 'i_venom',
    parrow: 'i_arrow', triple: 'i_arrow',
    ember: 'i_fire', iceclub: 'i_crush', frostroar: 'i_ice'
  };

  /** ダメージが入った瞬間の音。痛恨なら腹に響く一撃を重ねる */
  function impact(fxName, crit) {
    var k = IMPACT[fxName];
    play(k && LIB[k] ? k : (crit ? 'bighit' : 'hit'));
    if (crit && k && LIB[k]) play('critboom');
  }

  function play(name) {
    if (!enabled) return;
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    jit = 1 + (Math.random() - 0.5) * 0.05;      // ±2.5% の音程ゆらぎ
    trigger(ALIAS[name] || name);
    jit = 1;
  }

  /**
   * 音作りの検証用：オフラインで1音レンダリングして AudioBuffer を返す。
   * ゲーム本体では使わない。
   */
  function render(name, seconds, rate) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    var s = { ctx: ctx, master: master, comp: comp, outGain: outGain, revBus: revBus, revWet: revWet, conv: conv, BUF: BUF };
    rate = rate || 32000;
    var oc = new OAC(1, Math.ceil((seconds || 2) * rate), rate);
    ctx = oc; buildGraph(); buildNoise();
    jit = 1;
    trigger(ALIAS[name] || name);
    var p = oc.startRendering();
    ctx = s.ctx; master = s.master; comp = s.comp; outGain = s.outGain;
    revBus = s.revBus; revWet = s.revWet; conv = s.conv; BUF = s.BUF;
    return p;
  }

  return { play: play, impact: impact, unlock: unlock, setEnabled: setEnabled, isEnabled: isEnabled,
           render: render, names: function () { return Object.keys(LIB); } };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SFX;
