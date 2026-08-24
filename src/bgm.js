/* =========================================================
   ARCANA CLASH — BGM
   効果音と同じく WebAudio でその場から合成する（音声ファイル不要＝容量ゼロ）
   ・アップテンポ（戦闘）とミドルテンポ（タイトル／編成）の2曲
   ・音色は「オーケストラ風」と「チップチューン風」を切り替えられる
   ・小節単位で先読みして予約する方式なので、タブが重くても崩れにくい
   ========================================================= */
var BGM = (function () {
  'use strict';

  var ctx = null, master = null, comp = null, revWet = null, conv = null;
  var timer = null, cur = null, nextBar = 0, nextTime = 0, vol = 0.5;

  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- 残響（ノイズを減衰させた即席インパルス） ---------- */
  function makeImpulse(sec, decay) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.006;
    master = ctx.createGain(); master.gain.value = vol;
    conv = ctx.createConvolver(); conv.buffer = makeImpulse(2.4, 2.6);
    revWet = ctx.createGain(); revWet.gain.value = 0.3;
    conv.connect(revWet); revWet.connect(comp);
    master.connect(comp); comp.connect(ctx.destination);
  }

  /* =========================================================
     楽器
     どれも (out, revSend, t, freq, dur, gain, tone) を受け取る。
     tone は 'orch'（オーケストラ風）か 'chip'（チップチューン風）。
     ========================================================= */

  function env(g, t, a, d, s, r, dur, peak) {
    var p = peak === undefined ? 1 : peak;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p * s), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, p * s), t + Math.max(a + d, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
  }

  /* 弦のパッド／和音の土台 */
  function pad(o, rv, t, f, dur, gain, tone) {
    var g = ctx.createGain(); g.gain.value = 0;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    var det = tone === 'orch' ? [-7, 0, 7] : [0];
    lp.frequency.value = tone === 'orch' ? 1700 : 4200;
    for (var i = 0; i < det.length; i++) {
      var os = ctx.createOscillator();
      os.type = tone === 'orch' ? 'sawtooth' : 'square';
      os.frequency.value = f;
      os.detune.value = det[i];
      os.connect(lp);
      os.start(t); os.stop(t + dur + 1.2);
    }
    lp.connect(g);
    env(g, t, tone === 'orch' ? 0.26 : 0.01, 0.3, 0.72, tone === 'orch' ? 0.7 : 0.12,
        dur, gain / det.length);
    g.connect(o);
    if (rv) g.connect(rv);
  }

  /* 撥弦（ハープ／アルペジオ） */
  function pluck(o, rv, t, f, dur, gain, tone) {
    var g = ctx.createGain(); g.gain.value = 0;
    var os = ctx.createOscillator();
    os.type = tone === 'orch' ? 'triangle' : 'square';
    os.frequency.value = f;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(tone === 'orch' ? 5200 : 7000, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur * 0.9 + 0.05);
    os.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95 + 0.06);
    os.start(t); os.stop(t + dur + 0.12);
    g.connect(o);
    if (rv) g.connect(rv);
  }

  /* 旋律（金管／笛） */
  function lead(o, rv, t, f, dur, gain, tone) {
    var g = ctx.createGain(); g.gain.value = 0;
    var os = ctx.createOscillator();
    os.type = tone === 'orch' ? 'sawtooth' : 'square';
    os.frequency.setValueAtTime(f, t);
    /* 立ち上がりを少しだけ下から取ると人が吹いた感じに近づく */
    os.frequency.setValueAtTime(f * 0.988, t);
    os.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    /* ゆるいビブラート */
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.2; lg.gain.value = tone === 'orch' ? f * 0.006 : f * 0.003;
    lfo.connect(lg); lg.connect(os.frequency);
    lfo.start(t + 0.12); lfo.stop(t + dur + 0.3);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = tone === 'orch' ? 2600 : 6000;
    os.connect(lp); lp.connect(g);
    env(g, t, tone === 'orch' ? 0.06 : 0.012, 0.12, 0.8, 0.22, dur, gain);
    os.start(t); os.stop(t + dur + 0.4);
    g.connect(o);
    if (rv) g.connect(rv);
  }

  /* 低音 */
  function bass(o, t, f, dur, gain, tone) {
    var g = ctx.createGain(); g.gain.value = 0;
    var os = ctx.createOscillator();
    os.type = tone === 'orch' ? 'sawtooth' : 'square';
    os.frequency.value = f;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = tone === 'orch' ? 420 : 900;
    var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f / 2;
    var sg = ctx.createGain(); sg.gain.value = 0.5;
    os.connect(lp); lp.connect(g); sub.connect(sg); sg.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.014);
    g.gain.setValueAtTime(gain, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    os.start(t); os.stop(t + dur + 0.08);
    sub.start(t); sub.stop(t + dur + 0.08);
    g.connect(o);
  }

  /* ---------- 打楽器 ---------- */
  function noiseBuf(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function kick(o, t, gain) {
    var os = ctx.createOscillator(); os.type = 'sine';
    var g = ctx.createGain();
    os.frequency.setValueAtTime(150, t);
    os.frequency.exponentialRampToValueAtTime(44, t + 0.09);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    os.connect(g); g.connect(o);
    os.start(t); os.stop(t + 0.34);
  }

  function snare(o, rv, t, gain, tone) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.22);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass';
    hp.frequency.value = tone === 'chip' ? 1400 : 1900;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(hp); hp.connect(g); g.connect(o);
    if (rv) g.connect(rv);
    s.start(t); s.stop(t + 0.24);
  }

  function hat(o, t, gain) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.06);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(hp); hp.connect(g); g.connect(o);
    s.start(t); s.stop(t + 0.07);
  }

  /* 太鼓（ミドルテンポ用のやわらかい低音） */
  function taiko(o, rv, t, gain) {
    var os = ctx.createOscillator(); os.type = 'sine';
    var g = ctx.createGain();
    os.frequency.setValueAtTime(112, t);
    os.frequency.exponentialRampToValueAtTime(58, t + 0.15);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.09);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(bp); bp.connect(ng); ng.connect(o);
    s.start(t); s.stop(t + 0.11);
    os.connect(g); g.connect(o);
    if (rv) g.connect(rv);
    os.start(t); os.stop(t + 0.5);
  }

  function shaker(o, t, gain) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.05);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(hp); hp.connect(g); g.connect(o);
    s.start(t); s.stop(t + 0.06);
  }

  /* =========================================================
     曲データ
     chords : [和音の構成音(MIDI)…] と 低音の根音
     mel    : [小節内の拍, MIDI, 長さ(拍)]
     ========================================================= */

  var UP = {
    id: 'up', name: 'アップテンポ', use: '戦闘中', bpm: 148, beats: 4, bars: 8,
    chords: [
      { n: [57, 60, 64], b: 45 },   // Am
      { n: [53, 57, 60], b: 41 },   // F
      { n: [55, 59, 62], b: 43 },   // G
      { n: [52, 55, 59], b: 40 },   // Em
      { n: [57, 60, 64], b: 45 },   // Am
      { n: [53, 57, 60], b: 41 },   // F
      { n: [48, 52, 55], b: 36 },   // C
      { n: [52, 56, 59], b: 40 }    // E（和声的短音階のドミナント）
    ],
    mel: [
      [[0, 76, 1], [1, 72, 0.5], [1.5, 74, 0.5], [2, 76, 1], [3, 81, 1]],
      [[0, 79, 1.5], [1.5, 77, 0.5], [2, 76, 2]],
      [[0, 74, 1], [1, 76, 1], [2, 79, 2]],
      [[0, 76, 1], [1, 74, 1], [2, 71, 2]],
      [[0, 72, 1], [1, 76, 0.5], [1.5, 79, 0.5], [2, 81, 2]],
      [[0, 84, 1.5], [1.5, 81, 0.5], [2, 77, 2]],
      [[0, 79, 1], [1, 76, 1], [2, 72, 2]],
      [[0, 80, 1], [1, 83, 1], [2, 80, 1], [3, 76, 1]]
    ]
  };

  var MID = {
    id: 'mid', name: 'ミドルテンポ', use: 'タイトル／編成', bpm: 92, beats: 4, bars: 8,
    chords: [
      { n: [57, 60, 64], b: 45 },   // Am
      { n: [55, 60, 64], b: 36 },   // C
      { n: [57, 60, 65], b: 41 },   // F
      { n: [55, 59, 62], b: 43 },   // G
      { n: [57, 62, 65], b: 38 },   // Dm
      { n: [57, 60, 64], b: 45 },   // Am
      { n: [56, 59, 64], b: 40 },   // E
      { n: [57, 60, 64], b: 45 }    // Am
    ],
    mel: [
      [[0, 69, 2], [2, 72, 2]],
      [[0, 76, 3], [3, 74, 1]],
      [[0, 72, 2], [2, 69, 1.5]],
      [[0, 71, 2], [2, 74, 2]],
      [[0, 77, 2], [2, 74, 2]],
      [[0, 72, 3], [3, 69, 1]],
      [[0, 71, 2], [2, 68, 2]],
      [[0, 69, 3.4]]
    ]
  };

  var SONGS = { up: UP, mid: MID };

  /* =========================================================
     1小節ぶんを予約する
     ========================================================= */
  function scheduleBar(song, tone, bar, t0, out, rv) {
    var spb = 60 / song.bpm;                    // 1拍の秒数
    var ch = song.chords[bar % song.bars];
    var mel = song.mel[bar % song.bars];
    var barLen = spb * song.beats;
    var cycle = Math.floor(bar / song.bars);    // 何周目か（音を足していく）
    var i, j, t;

    /* --- 和音のパッド --- */
    for (i = 0; i < ch.n.length; i++) {
      pad(out, rv, t0, midi(ch.n[i] - 12), barLen * 0.98,
          tone === 'orch' ? 0.13 : 0.055, tone);
    }

    if (song.id === 'up') {
      /* --- 低音：8分の刻み、4拍目だけ跳ねる --- */
      for (i = 0; i < song.beats * 2; i++) {
        var up = (i % 4 === 3) ? 12 : 0;
        bass(out, t0 + i * spb * 0.5, midi(ch.b + up), spb * 0.42, 0.3, tone);
      }
      /* --- アルペジオ（16分） --- */
      var arp = [ch.n[0], ch.n[1], ch.n[2], ch.n[1] + 12, ch.n[2], ch.n[1], ch.n[2], ch.n[0] + 12];
      for (i = 0; i < song.beats * 4; i++) {
        t = t0 + i * spb * 0.25;
        pluck(out, rv, t, midi(arp[i % arp.length] + 12), spb * 0.24,
              tone === 'orch' ? 0.075 : 0.05, tone);
      }
      /* --- 打楽器 --- */
      var kicks = [0, 1.5, 2, 2.75], snares = [1, 3];
      for (i = 0; i < kicks.length; i++) kick(out, t0 + kicks[i] * spb, 0.62);
      for (i = 0; i < snares.length; i++) snare(out, rv, t0 + snares[i] * spb, 0.34, tone);
      for (i = 0; i < song.beats * 2; i++) {
        hat(out, t0 + i * spb * 0.5, i % 2 ? 0.055 : 0.085);
      }
    } else {
      /* --- 低音：全音符ぎみに長く --- */
      bass(out, t0, midi(ch.b), spb * 2.6, 0.28, tone);
      bass(out, t0 + spb * 2.5, midi(ch.b + 7), spb * 1.2, 0.2, tone);
      /* --- ハープの分散和音（8分の上行下行） --- */
      var pat = [0, 1, 2, 1];
      for (i = 0; i < song.beats * 2; i++) {
        t = t0 + i * spb * 0.5;
        var oct = (i >= song.beats) ? 12 : 0;
        pluck(out, rv, t, midi(ch.n[pat[i % 4]] + oct), spb * 0.7,
              tone === 'orch' ? 0.09 : 0.055, tone);
      }
      /* --- 太鼓と鈴（2周目から入れて盛り上げる） --- */
      taiko(out, rv, t0, 0.42);
      taiko(out, rv, t0 + spb * 2.5, 0.3);
      if (cycle >= 1) {
        for (i = 0; i < song.beats * 2; i++) {
          if (i % 2 === 1) shaker(out, t0 + i * spb * 0.5, 0.05);
        }
      }
    }

    /* --- 旋律（1周目は出さず、2周目から乗せる） --- */
    if (cycle >= 1) {
      for (j = 0; j < mel.length; j++) {
        var m = mel[j];
        lead(out, rv, t0 + m[0] * spb, midi(m[1]), m[2] * spb * 0.92,
             tone === 'orch' ? 0.16 : 0.1, tone);
      }
    }
    return barLen;
  }

  /* =========================================================
     再生（小節を先読みして予約する）
     ========================================================= */
  function tick() {
    if (!cur) return;
    var song = SONGS[cur.song];
    while (nextTime < ctx.currentTime + 0.7) {
      nextTime += scheduleBar(song, cur.tone, nextBar, nextTime, master, conv);
      nextBar++;
    }
  }

  function play(songId, tone) {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    cur = { song: songId in SONGS ? songId : 'up', tone: tone === 'chip' ? 'chip' : 'orch' };
    revWet.gain.value = cur.tone === 'orch' ? 0.32 : 0.1;
    nextBar = 0;
    nextTime = ctx.currentTime + 0.12;
    tick();
    timer = setInterval(tick, 120);
    return cur;
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    cur = null;
    if (master) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.25);
      setTimeout(function () {
        if (!cur && master) master.gain.setValueAtTime(vol, ctx.currentTime);
      }, 320);
    }
  }

  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    if (master && cur) master.gain.setValueAtTime(vol, ctx.currentTime);
  }

  function isPlaying() { return !!cur; }
  function current() { return cur; }

  /* =========================================================
     書き出し（MP3などにするためのオフライン合成）
     ========================================================= */
  function render(songId, tone, bars, rate) {
    var song = SONGS[songId];
    var spb = 60 / song.bpm;
    var total = spb * song.beats * bars + 3;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((rate || 44100) * total), rate || 44100);

    /* 楽器は外側の ctx を参照しているので、書き出し中だけ差し替える */
    var save = { ctx: ctx, master: master, comp: comp, conv: conv, revWet: revWet };
    ctx = off;
    comp = off.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.006;
    master = off.createGain(); master.gain.value = 0.62;
    conv = off.createConvolver(); conv.buffer = makeImpulse(2.4, 2.6);
    revWet = off.createGain(); revWet.gain.value = tone === 'orch' ? 0.32 : 0.1;
    conv.connect(revWet); revWet.connect(comp);
    master.connect(comp); comp.connect(off.destination);

    var t = 0.05;
    for (var b = 0; b < bars; b++) t += scheduleBar(song, tone, b, t, master, conv);

    var p = off.startRendering();
    ctx = save.ctx; master = save.master; comp = save.comp;
    conv = save.conv; revWet = save.revWet;
    return p;
  }

  /* 波形を見せたいとき用（ゲーム本体では使わない） */
  var ana = null;
  function analyser() {
    init();
    if (!ana) {
      ana = ctx.createAnalyser();
      ana.fftSize = 1024; ana.smoothingTimeConstant = 0.75;
      comp.connect(ana);
    }
    return ana;
  }

  return {
    play: play, stop: stop, setVolume: setVolume,
    isPlaying: isPlaying, current: current,
    render: render, analyser: analyser, SONGS: SONGS
  };
})();
