/* 各効果音をオフラインレンダリングして、数値チェック＋試聴用WAVを書き出す */
const fs = require('fs');
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');

const ORDER = [
  ['slash', '斬撃', 1.2], ['pierce', '刺突', 1.0], ['lance', '長槍突き', 1.0], ['sweep', '薙ぎ払い', 1.2],
  ['holystrike', '聖なる一撃', 1.4],
  ['bash', '盾殴り', 1.0], ['smash', '叩き潰し', 1.4], ['rock', '岩石打', 1.2], ['horn', '角突き', 1.2],
  ['wallop', '豪腕', 1.2], ['claw', '裂爪', 1.0], ['dclaw', '竜爪', 1.2],
  ['arrow', '射抜き', 1.2], ['spear', '天翔ける槍', 1.2], ['dagger', '投げ短剣', 1.0], ['mark', '死の刻印', 1.2],
  ['firebolt', 'ファイアボルト', 1.4], ['breath', '業火のブレス', 2.6], ['purge', '浄化の炎', 1.6],
  ['meteor', 'メテオ', 2.6],
  ['frost', 'フロストノヴァ', 1.6], ['blizzard', '氷嵐', 1.8],
  ['doom', '死の宣告', 1.8], ['grasp', '亡者の手', 1.4], ['hex', '呪縛', 1.6],
  ['holy', '聖光', 1.8], ['logos', '理の光', 1.4], ['arcanebolt', '秘術の矢', 1.2],
  ['thorn', '茨の呪縛', 1.2], ['screech', 'かく乱の叫び', 1.2], ['discord', '不協和音', 1.4],
  ['blood', '吸血の牙', 1.0], ['wind', '風', 1.2], ['earth', '大地', 1.6],
  ['i_cut', '＜命中＞斬られる', 0.8], ['i_stab', '＜命中＞突き刺さる', 0.7],
  ['i_arrow', '＜命中＞矢が刺さる', 0.9], ['i_rip', '＜命中＞引き裂かれる', 0.8],
  ['i_crush', '＜命中＞打ち砕かれる', 0.9], ['i_ice', '＜命中＞凍りつく', 0.9],
  ['i_fire', '＜命中＞燃える', 0.9], ['i_arcane', '＜命中＞魔力が弾ける', 0.8],
  ['i_dark', '＜命中＞呪いが染みる', 0.9], ['i_light', '＜命中＞光に灼かれる', 0.8],
  ['i_wet', '＜命中＞湿った衝撃', 0.8], ['i_gust', '＜命中＞突風', 0.8],
  ['i_thorn', '＜命中＞棘が刺さる', 0.7], ['critboom', '＜命中＞痛恨の重ね音', 0.9],
  ['heal', '回復', 1.8], ['ward', '結界', 1.6], ['guard', '防御', 0.9], ['revive', '蘇生', 2.2],
  ['death', '撃破', 1.6], ['execute', '首狩り', 1.8],
  ['round', 'ラウンド', 1.2], ['start', '開始', 1.6], ['win', '勝利', 2.2], ['lose', '敗北', 2.2],
  ['select', '選択', 0.5], ['ui', 'ボタン', 0.5]
];
const RATE = 32000;

function wav(samples, rate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('file:///root/cardbattle/index.html');

  const all = [];
  const rows = [];
  for (const [name, label, sec] of ORDER) {
    const data = await p.evaluate(async ([n, s, r]) => {
      const pr = SFX.render(n, s, r);
      if (!pr) return null;
      const buf = await pr;
      const ch = buf.getChannelData(0);
      // 16bit PCM をバイナリ文字列 → base64 でまとめて返す
      const i16 = new Int16Array(ch.length);
      let peak = 0, sum = 0, clip = 0;
      for (let i = 0; i < ch.length; i++) {
        const v = ch[i];
        const a = Math.abs(v);
        if (a > peak) peak = a;
        if (a >= 0.999) clip++;
        sum += v * v;
        i16[i] = Math.max(-32768, Math.min(32767, Math.round(Math.max(-1, Math.min(1, v)) * 32767)));
      }
      // ざっくり重心周波数（明るさの指標）
      let hi = 0, lo = 0, prev = 0, zc = 0;
      for (let i = 1; i < ch.length; i++) { if ((ch[i] >= 0) !== (prev >= 0)) zc++; prev = ch[i]; }
      const bytes = new Uint8Array(i16.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      return { b64: btoa(bin), peak: +peak.toFixed(3), rms: +Math.sqrt(sum / ch.length).toFixed(4),
               clip: clip, zcr: Math.round(zc / (ch.length / r) / 2), len: ch.length };
    }, [name, sec, RATE]);

    if (!data) { console.log('レンダリング不可:', name); continue; }
    const raw = Buffer.from(data.b64, 'base64');
    const f32 = new Float32Array(raw.length / 2);
    for (let i = 0; i < f32.length; i++) f32[i] = raw.readInt16LE(i * 2) / 32767;
    all.push({ name, label, f32 });
    rows.push({ 名前: name + '（' + label + '）', 秒: sec, ピーク: data.peak, RMS: data.rms,
                クリップ: data.clip, '中心周波数(Hz)': data.zcr });
  }

  console.table(rows);
  const bad = rows.filter(r => r.ピーク < 0.02 || r.クリップ > 0);
  console.log(bad.length ? '⚠ 要確認:\n' + JSON.stringify(bad, null, 1) : '✓ 無音・クリップともになし');

  // 一覧WAV（各音のあいだに0.35秒の間）
  const gap = Math.floor(RATE * 0.35);
  let total = 0;
  all.forEach(x => { total += x.f32.length + gap; });
  const mix = new Float32Array(total);
  let off = 0;
  all.forEach(x => { mix.set(x.f32, off); off += x.f32.length + gap; });
  fs.writeFileSync('/root/cardbattle/サウンド一覧.wav', wav(mix, RATE));
  console.log('サウンド一覧.wav', (total / RATE).toFixed(1) + '秒');

  console.log(errs.length ? 'ERR:\n' + errs.join('\n') : '✓ エラーなし');
  await b.close();
})();
