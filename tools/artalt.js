/* キャラ絵の別バージョン案。
   現行と同じ部品構造（.p-deco / .p-shadow / .p-fig > .p-body + .p-head / .p-wep）を保つので、
   既存の行動モーション（立ち上がり→溜め→振り抜き）がそのまま乗る。
   node tools/artalt.js → /root/cardbattle/artalt.html  */
const fs = require('fs');
const R = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');

/* 案1＝写実路線 / 案2＝イラスト路線（FF風）。
   どちらも「肩から手まで」を武器グループに含め、回転軸(--hx/--hy)を肩に置く。
   現行は全身が黒いシルエットなので手だけを軸にしても成立していたが、
   陰影を入れると武器だけが腕から離れて回るのが見えてしまうため。 */
const ART = {};

/* ---------- 騎士（人系） ---------- */
ART.knight = {
  real: {
    hx: 61, hy: 41, rim: '#c9d6e8', rimO: 0.26,
    bg: `<linearGradient id="kR-sky" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#2c3441"/><stop offset="52%" stop-color="#1c212a"/>
           <stop offset="100%" stop-color="#0a0d12"/></linearGradient>
         <radialGradient id="kR-glow" cx="50%" cy="30%" r="46%">
           <stop offset="0%" stop-color="#b9c6d8" stop-opacity=".15"/>
           <stop offset="100%" stop-color="#b9c6d8" stop-opacity="0"/></radialGradient>
         <linearGradient id="kR-steel" x1="0.15" y1="0" x2="0.85" y2="1">
           <stop offset="0%" stop-color="#dfe7f1"/><stop offset="30%" stop-color="#8a95a5"/>
           <stop offset="66%" stop-color="#495260"/><stop offset="100%" stop-color="#252b34"/></linearGradient>
         <linearGradient id="kR-dark" x1="0" y1="0" x2="0.4" y2="1">
           <stop offset="0%" stop-color="#5c6573"/><stop offset="100%" stop-color="#22272f"/></linearGradient>
         <linearGradient id="kR-blade" x1="0" y1="0" x2="1" y2="0.2">
           <stop offset="0%" stop-color="#e9eef5"/><stop offset="46%" stop-color="#aab4c2"/>
           <stop offset="52%" stop-color="#dde4ec"/><stop offset="100%" stop-color="#7d8593"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#kR-sky)"/>
           <rect width="100" height="100" fill="url(#kR-glow)"/>
           <path d="M0 80 c18-7 30-4 44-9 c16-6 30-2 56-8 v41 H0z" fill="#0d1117" opacity=".92"/>`,
    deco: `<g><ellipse cx="28" cy="72" rx="24" ry="4.5" fill="#8b98ab" opacity=".14"/>
           <ellipse cx="76" cy="80" rx="20" ry="4" fill="#8b98ab" opacity=".11"/>
           <circle cx="24" cy="40" r=".8" fill="#cfd8e6" opacity=".4"/>
           <circle cx="80" cy="52" r=".7" fill="#cfd8e6" opacity=".34"/>
           <circle cx="34" cy="24" r=".6" fill="#cfd8e6" opacity=".3"/></g>`,
    body: `<path d="M45.5 32 h9 l.6 12 h-10.2z" fill="#2b323c"/>
           <ellipse cx="40.5" cy="45.5" rx="5.4" ry="4.4" fill="url(#kR-dark)"/>
           <path d="M44 74 l-2.5 21 h7 l1-21z" fill="url(#kR-dark)"/>
           <path d="M56 74 l2.5 21 h-7 l-1-21z" fill="url(#kR-dark)"/>
           <path d="M40.8 91 h8.6 l.8 4 h-11z" fill="#1a1e25"/>
           <path d="M59.2 91 h-8.6 l-.8 4 h11z" fill="#1a1e25"/>
           <path d="M41 70 h18 l-1.5 8 H42.5z" fill="#333a45"/>
           <path d="M43 43 q7-4 14 0 l2.4 20 q-9.4 5-18.8 0z" fill="url(#kR-steel)"/>
           <path d="M43 43 q7-4 14 0 l.7 6 q-7.7-3.5-15.4 0z" fill="#e6ecf3" opacity=".5"/>
           <path d="M50 45 v19" stroke="#454d5b" stroke-width=".7"/>
           <path d="M43.5 55 q6.5 3 13 0" stroke="#454d5b" stroke-width=".7" fill="none"/>
           <path d="M40.5 62 q9.5 5 19 0 l-.8 8 q-8.8 4-17.4 0z" fill="url(#kR-dark)"/>
           <path d="M41.5 41 q-6 2-6.8 8.4 q3.6 2.6 8 .8z" fill="url(#kR-steel)"/>
           <path d="M38.8 49.5 l-2.4 13.5 4.6 1.8 3-13.6z" fill="#414a57"/>
           <ellipse cx="38.6" cy="65.5" rx="3.2" ry="2.8" fill="#2f363f"/>`,
    head: `<path d="M43 24 q7-6 14 0 l1 12 q-8 5-16 0z" fill="url(#kR-steel)"/>
           <path d="M43 24 q7-6 14 0 l.5 4 q-8-4-15 0z" fill="#e3e9f0" opacity=".5"/>
           <rect x="44" y="28.5" width="12" height="1.9" rx=".6" fill="#171c24"/>
           <path d="M50 31 v6" stroke="#3f4753" stroke-width="1.1"/>
           <path d="M44 34 h12" stroke="#3f4753" stroke-width=".6"/>`,
    wep: `<ellipse cx="60.5" cy="45" rx="5.6" ry="4.6" fill="url(#kR-dark)"/>
          <path d="M62 40 q7 1 8 8 q-4 3-9 1z" fill="url(#kR-steel)"/>
          <path d="M64 46 l5 12 -5 2 -4-12z" fill="url(#kR-dark)"/>
          <path d="M67 54 l6 6 -4 4 -6-6z" fill="#6d7684"/>
          <rect x="68" y="55" width="12" height="2.4" rx=".8" transform="rotate(-42 74 56)" fill="#565f6c"/>
          <path d="M70 55 l17-26 2.4 1.6 -16.6 26.4z" fill="url(#kR-blade)"/>
          <path d="M71.5 54 l16-24.6 .7 .5 -16 24.6z" fill="#fff" opacity=".55"/>
          <circle cx="67.5" cy="58.5" r="2" fill="#5f6875"/>`
  },
  ff: {
    hx: 61, hy: 40,
    bg: `<radialGradient id="kF-bg" cx="50%" cy="36%" r="82%">
           <stop offset="0%" stop-color="#3d5fa8"/><stop offset="45%" stop-color="#1b2a55"/>
           <stop offset="100%" stop-color="#080d1c"/></radialGradient>
         <linearGradient id="kF-arm" x1="0.1" y1="0" x2="0.9" y2="1">
           <stop offset="0%" stop-color="#dbe8ff"/><stop offset="40%" stop-color="#7f9ede"/>
           <stop offset="100%" stop-color="#26356a"/></linearGradient>
         <linearGradient id="kF-gold" x1="0" y1="0" x2="0.6" y2="1">
           <stop offset="0%" stop-color="#ffe9a8"/><stop offset="55%" stop-color="#e0ac3e"/>
           <stop offset="100%" stop-color="#8a5f12"/></linearGradient>
         <linearGradient id="kF-cape" x1="0.2" y1="0" x2="0.8" y2="1">
           <stop offset="0%" stop-color="#3a63c8"/><stop offset="100%" stop-color="#101a3c"/></linearGradient>
         <linearGradient id="kF-bl" x1="0" y1="1" x2="0.3" y2="0">
           <stop offset="0%" stop-color="#9fe4ff"/><stop offset="50%" stop-color="#ffffff"/>
           <stop offset="100%" stop-color="#6fc8ff"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#kF-bg)"/>
           <g opacity=".5"><path d="M50 50 L14 0 h9z" fill="#7ea8ff" opacity=".18"/>
           <path d="M50 50 L40 0 h7z" fill="#9fc4ff" opacity=".14"/>
           <path d="M50 50 L78 0 h-8z" fill="#7ea8ff" opacity=".16"/></g>
           <ellipse cx="50" cy="44" rx="30" ry="34" fill="#8fc3ff" opacity=".12"/>`,
    deco: `<g><circle cx="24" cy="30" r="1.1" fill="#bfe4ff" opacity=".8"/>
           <circle cx="78" cy="24" r="1.4" fill="#bfe4ff" opacity=".7"/>
           <circle cx="70" cy="66" r="1" fill="#ffe9a8" opacity=".8"/>
           <circle cx="30" cy="60" r="1.2" fill="#bfe4ff" opacity=".6"/>
           <circle cx="60" cy="14" r=".9" fill="#fff" opacity=".7"/></g>`,
    body: `<path d="M37 40 q-12 22-8 42 q10-6 15-16z" fill="url(#kF-cape)"/>
           <path d="M45.5 31 h9 l.6 12 h-10.2z" fill="#22305e"/>
           <ellipse cx="40" cy="44" rx="5.6" ry="4.6" fill="url(#kF-gold)"/>
           <path d="M44 74 l-2.5 21 h7 l1-21z" fill="#1a2445"/>
           <path d="M56 74 l2.5 21 h-7 l-1-21z" fill="#1a2445"/>
           <path d="M40.6 90.5 h8.8 l.8 4.5 h-11.2z" fill="url(#kF-gold)"/>
           <path d="M59.4 90.5 h-8.8 l-.8 4.5 h11.2z" fill="url(#kF-gold)"/>
           <path d="M41 70 h18 l-1.5 9 H42.5z" fill="url(#kF-gold)"/>
           <path d="M42.5 42 q7.5-5 15 0 l2.6 21 q-10 5-20 0z" fill="url(#kF-arm)"/>
           <path d="M42.5 42 q7.5-5 15 0 l.8 6 q-8.3-4-16.6 0z" fill="#eaf3ff" opacity=".55"/>
           <path d="M50 46 l3.4 8 -3.4 8 -3.4-8z" fill="url(#kF-gold)"/>
           <path d="M39.5 61 q10.5 6 21 0 l-1.5 9 q-9 5-18 0z" fill="#22305e"/>
           <path d="M40.5 40 q-7 1-7.8 8.6 q4.6 3.4 10 1.4z" fill="url(#kF-arm)"/>
           <path d="M33 41 l-5-6 3-2 6 6z" fill="url(#kF-gold)"/>
           <path d="M37 50 l-3 15 5 2 4-15z" fill="#2b3b70"/>
           <ellipse cx="36.5" cy="66.5" rx="3.4" ry="3" fill="url(#kF-arm)"/>`,
    head: `<path d="M43 23 q7-7 14 0 l1 13 q-8 5-16 0z" fill="url(#kF-arm)"/>
           <rect x="44" y="27.5" width="12" height="2.2" rx=".7" fill="#0a1024"/>
           <path d="M45 28.6 h10" stroke="#8fe4ff" stroke-width=".9" opacity=".9"/>
           <path d="M42 21 l-4-8 4 1 3 6z" fill="url(#kF-gold)"/>
           <path d="M58 21 l4-8 -4 1 -3 6z" fill="url(#kF-gold)"/>
           <path d="M44 34 h12" stroke="#ffe9a8" stroke-width=".7" opacity=".8"/>`,
    wep: `<ellipse cx="60.5" cy="44" rx="5.8" ry="4.8" fill="url(#kF-gold)"/>
          <path d="M60 38 q9 1 10 9 q-5 4-11 1z" fill="url(#kF-arm)"/>
          <path d="M70 36 l6-5 2 3 -6 5z" fill="url(#kF-gold)"/>
          <path d="M64 45 l5 12 -5 2 -4-12z" fill="url(#kF-arm)"/>
          <path d="M68 54 l6 6 -4 4 -6-6z" fill="url(#kF-gold)"/>
          <rect x="66" y="54" width="16" height="3" rx="1" transform="rotate(-42 74 55)" fill="url(#kF-gold)"/>
          <path d="M70 54 l20-31 3 2 -19.6 31.4z" fill="url(#kF-bl)"/>
          <path d="M72 52.4 l18-27.6 .8 .6 -18 27.6z" fill="#fff" opacity=".8"/>
          <circle cx="80" cy="38" r="1.5" fill="#8fe4ff"/>
          <circle cx="76" cy="44" r="1.1" fill="#8fe4ff" opacity=".8"/>
          <circle cx="67.5" cy="58.5" r="2.2" fill="url(#kF-gold)"/>`
  }
};

/* ---------- 竜（竜系） ---------- */
ART.dragon = {
  real: {
    hx: 44, hy: 44, rim: '#e0b58a',
    bg: `<linearGradient id="dR-sky" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#4a3a2b"/><stop offset="48%" stop-color="#241c16"/>
           <stop offset="100%" stop-color="#0c0908"/></linearGradient>
         <radialGradient id="dR-glow" cx="56%" cy="28%" r="44%">
           <stop offset="0%" stop-color="#e0a86a" stop-opacity=".17"/>
           <stop offset="100%" stop-color="#e0a86a" stop-opacity="0"/></radialGradient>
         <linearGradient id="dR-hide" x1="0.2" y1="0" x2="0.8" y2="1">
           <stop offset="0%" stop-color="#b0713f"/><stop offset="45%" stop-color="#7a462b"/>
           <stop offset="100%" stop-color="#2a1913"/></linearGradient>
         <linearGradient id="dR-belly" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#cfa165"/><stop offset="100%" stop-color="#83653e"/></linearGradient>
         <linearGradient id="dR-mem" x1="0.1" y1="0" x2="0.9" y2="1">
           <stop offset="0%" stop-color="#8d5334"/><stop offset="100%" stop-color="#33200f"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#dR-sky)"/>
           <rect width="100" height="100" fill="url(#dR-glow)"/>
           <path d="M0 82 q26-10 50-6 q26 4 50-6 v30 H0z" fill="#0d0a08" opacity=".92"/>`,
    deco: `<g><circle cx="22" cy="66" r="1" fill="#e8b878" opacity=".5"/>
           <circle cx="32" cy="80" r=".8" fill="#e8b878" opacity=".4"/>
           <circle cx="80" cy="58" r="1.1" fill="#e8b878" opacity=".45"/>
           <circle cx="88" cy="74" r=".8" fill="#e8b878" opacity=".35"/>
           <ellipse cx="70" cy="84" rx="22" ry="4" fill="#8a6440" opacity=".14"/></g>`,
    body: `<path d="M40 66 c-14 5-23 13-28 25 c-1 3 4 5 6 2 c6-11 14-17 24-19z" fill="url(#dR-hide)"/>
           <path d="M51 48 q3-15 12-20 l8 6 q-9 5-12 17z" fill="url(#dR-hide)"/>
           <path d="M53 47 q3-12 10-16 l2 1.6 q-7 5-9 15z" fill="#b0713f" opacity=".45"/>
           <path d="M36 46 q18-10 34 2 q6 12-2 22 q-16 8-32-2z" fill="url(#dR-hide)"/>
           <path d="M42 58 q12 6 24 0 q-2 10-12 12 q-9-2-12-12z" fill="url(#dR-belly)" opacity=".9"/>
           <g stroke="#2a1913" stroke-width=".55" fill="none" opacity=".75">
             <path d="M40 50 q8 3 16 0"/><path d="M39 55 q9 4 19 0"/><path d="M40 61 q9 4 18 0"/>
             <path d="M43 66 q8 3 15 0"/></g>
           <path d="M44 76 c-2 8-1 14 1 18 h7 c-3-6-3-12-2-18z" fill="url(#dR-hide)"/>
           <path d="M62 74 c1 8 3 13 6 17 h-8 c-2-6-2-11-2-17z" fill="url(#dR-hide)"/>
           <path d="M46 92 l-5 3 h9z" fill="#1c110c"/><path d="M64 91 l5 4 h-9z" fill="#1c110c"/>
           <path d="M38 44 q10-8 22-6 q-1 4-6 5 q-8 0-16 3z" fill="#b0713f" opacity=".65"/>`,
    head: `<path d="M60 20 q11-2 17 6 q3 5-2 8 q-9 3-16-2z" fill="url(#dR-hide)"/>
           <path d="M75 25 q9 1 12 5 q-4 4-12 3z" fill="url(#dR-hide)"/>
           <path d="M77 30 q6 1 9 3 q-5 2-9 1z" fill="url(#dR-belly)"/>
           <path d="M62 19 l-5-7 8 3 2 5z" fill="#b0713f"/>
           <path d="M69 17 l-2-8 6 5 1 5z" fill="#b0713f"/>
           <ellipse cx="74" cy="26" rx="2.4" ry="1.5" fill="#e8bf52"/>
           <path d="M72.6 26 q1.4-2 2.8 0 q-1.4 2-2.8 0z" fill="#1c110c"/>
           <path d="M84 30 l4 1 -4 1z" fill="#f0e8d6"/>`,
    wep: `<path d="M44 44 q-16-14-30-10 q6 14 20 22z" fill="url(#dR-mem)"/>
          <g stroke="#2a1913" stroke-width=".7" fill="none" opacity=".8">
            <path d="M42 44 q-12-10-24-9"/><path d="M42 47 q-13-6-22 0"/><path d="M42 51 q-11-2-18 4"/></g>
          <path d="M14 34 q-4-3-2-6 q4 1 6 5z" fill="#7a462b"/>`
  },
  ff: {
    hx: 44, hy: 44,
    bg: `<radialGradient id="dF-bg" cx="52%" cy="40%" r="80%">
           <stop offset="0%" stop-color="#ff8a3c"/><stop offset="34%" stop-color="#a32914"/>
           <stop offset="100%" stop-color="#160406"/></radialGradient>
         <linearGradient id="dF-hide" x1="0.2" y1="0" x2="0.8" y2="1">
           <stop offset="0%" stop-color="#ff7a4a"/><stop offset="42%" stop-color="#c02a1e"/>
           <stop offset="100%" stop-color="#3d0a0c"/></linearGradient>
         <linearGradient id="dF-gold" x1="0" y1="0" x2="0.5" y2="1">
           <stop offset="0%" stop-color="#ffe9a0"/><stop offset="60%" stop-color="#e5a327"/>
           <stop offset="100%" stop-color="#7d4c08"/></linearGradient>
         <linearGradient id="dF-mem" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="#ffb06a" stop-opacity=".92"/>
           <stop offset="60%" stop-color="#c8341c" stop-opacity=".85"/>
           <stop offset="100%" stop-color="#4a0d0a"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#dF-bg)"/>
           <ellipse cx="52" cy="44" rx="34" ry="36" fill="#ffb06a" opacity=".16"/>
           <path d="M0 86 q28-8 52-3 q24 5 48-5 v26 H0z" fill="#1a0507" opacity=".9"/>`,
    deco: `<g><circle cx="22" cy="70" r="1.5" fill="#ffcf7a" opacity=".9"/>
           <circle cx="34" cy="82" r="1.1" fill="#ff9a4a" opacity=".8"/>
           <circle cx="76" cy="60" r="1.7" fill="#ffcf7a" opacity=".85"/>
           <circle cx="86" cy="76" r="1.2" fill="#ff9a4a" opacity=".7"/>
           <circle cx="16" cy="46" r="1.2" fill="#ffcf7a" opacity=".7"/>
           <circle cx="66" cy="88" r="1" fill="#ff9a4a" opacity=".7"/></g>`,
    body: `<path d="M40 66 c-15 5-25 14-30 27 c-1 3 5 5 7 2 c6-12 15-19 26-21z" fill="url(#dF-hide)"/>
           <path d="M11 92 q-4 3-2 5 q4 0 6-4z" fill="url(#dF-gold)"/>
           <path d="M50 48 q3-16 12-21 l9 6 q-10 6-13 18z" fill="url(#dF-hide)"/>
           <path d="M35 45 q19-12 36 2 q7 13-2 24 q-17 9-34-3z" fill="url(#dF-hide)"/>
           <path d="M42 58 q12 7 24 0 q-2 11-12 14 q-10-3-12-14z" fill="url(#dF-gold)" opacity=".9"/>
           <path d="M45 60 q5 4 10 0 q-1 6-5 8 q-4-2-5-8z" fill="#fff3c4" opacity=".5"/>
           <path d="M44 76 c-2 8-1 14 1 18 h7 c-3-6-3-12-2-18z" fill="url(#dF-hide)"/>
           <path d="M63 74 c1 8 3 13 6 17 h-8 c-2-6-2-11-2-17z" fill="url(#dF-hide)"/>
           <path d="M45 92 l-6 3 h10z" fill="url(#dF-gold)"/><path d="M65 91 l6 4 h-10z" fill="url(#dF-gold)"/>
           <g fill="url(#dF-gold)"><path d="M40 42 l3-6 2 6z"/><path d="M48 39 l3-7 3 7z"/><path d="M57 40 l3-6 3 6z"/></g>`,
    head: `<path d="M58 19 q13-3 20 7 q3 6-3 9 q-10 3-18-2z" fill="url(#dF-hide)"/>
           <path d="M76 25 q11 1 14 6 q-5 4-14 4z" fill="url(#dF-hide)"/>
           <path d="M78 31 q7 1 10 3 q-5 3-10 1z" fill="url(#dF-gold)"/>
           <path d="M76 33 q7 1 11 2 q-6 3-11 1z" fill="#ffd98a" opacity=".55"/>
           <path d="M60 18 l-7-9 10 4 2 6z" fill="url(#dF-gold)"/>
           <path d="M68 15 l-2-10 7 6 1 6z" fill="url(#dF-gold)"/>
           <ellipse cx="74" cy="26" rx="2.8" ry="1.8" fill="#fff3c4"/>
           <path d="M72.4 26 q1.6-2.4 3.2 0 q-1.6 2.4-3.2 0z" fill="#c02a1e"/>
           <path d="M86 31 l5 1 -5 1.4z" fill="#fff"/>`,
    wep: `<path d="M44 44 q-19-18-36-12 q7 18 25 27z" fill="url(#dF-mem)"/>
          <g stroke="#ffcf7a" stroke-width=".8" fill="none" opacity=".65">
            <path d="M42 44 q-14-12-28-11"/><path d="M42 48 q-15-7-26 0"/><path d="M42 53 q-13-2-21 5"/></g>
          <path d="M8 32 q-5-3-3-7 q5 1 8 6z" fill="url(#dF-gold)"/>
          <path d="M14 60 q-4 3-3 6 q5-1 7-5z" fill="url(#dF-gold)" opacity=".8"/>`
  }
};

/* ---------- 人狼（獣系） ---------- */
ART.werewolf = {
  real: {
    hx: 62, hy: 47, rim: '#ddd6c2',
    bg: `<linearGradient id="wR-sky" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#2f3646"/><stop offset="50%" stop-color="#171b25"/>
           <stop offset="100%" stop-color="#080a0e"/></linearGradient>
         <radialGradient id="wR-glow" cx="70%" cy="24%" r="42%">
           <stop offset="0%" stop-color="#e2ddcc" stop-opacity=".17"/>
           <stop offset="100%" stop-color="#e2ddcc" stop-opacity="0"/></radialGradient>
         <linearGradient id="wR-fur" x1="0.2" y1="0" x2="0.8" y2="1">
           <stop offset="0%" stop-color="#a79e8a"/><stop offset="42%" stop-color="#6b6355"/>
           <stop offset="100%" stop-color="#23201b"/></linearGradient>
         <linearGradient id="wR-fur2" x1="0" y1="0" x2="0.5" y2="1">
           <stop offset="0%" stop-color="#c2b9a2"/><stop offset="100%" stop-color="#544e43"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#wR-sky)"/>
           <rect width="100" height="100" fill="url(#wR-glow)"/>
           <circle cx="74" cy="24" r="13" fill="#e8e3d2" opacity=".4"/>
           <path d="M0 84 q24-8 48-4 q26 4 52-6 v28 H0z" fill="#080a0e" opacity=".93"/>`,
    deco: `<g><ellipse cx="26" cy="74" rx="24" ry="4.5" fill="#8d8a7c" opacity=".13"/>
           <ellipse cx="78" cy="82" rx="20" ry="4" fill="#8d8a7c" opacity=".1"/>
           <circle cx="20" cy="44" r=".8" fill="#ded8c6" opacity=".4"/>
           <circle cx="86" cy="58" r=".7" fill="#ded8c6" opacity=".32"/>
           <circle cx="30" cy="30" r=".6" fill="#ded8c6" opacity=".28"/></g>`,
    body: `<path d="M38 66 c-7 6-7 13-13 17 l4 6 c10-4 14-10 17-17z" fill="url(#wR-fur)"/>
           <path d="M28 88 l-5 3 h10z" fill="#191612"/>
           <path d="M45 46 q2-13 8-18 l8 5 q-7 6-8 15z" fill="url(#wR-fur)"/>
           <path d="M39 44 q14-9 26 2 q6 12 0 22 q-15 8-28-2z" fill="url(#wR-fur)"/>
           <path d="M45 56 q10 5 18 0 q-2 11-9 13 q-7-2-9-13z" fill="url(#wR-fur2)" opacity=".85"/>
           <g stroke="#191612" stroke-width=".5" fill="none" opacity=".65">
             <path d="M41 48 l3 5"/><path d="M45 46 l3 6"/><path d="M50 45 l2 6"/><path d="M55 46 l3 6"/>
             <path d="M43 60 l3 5"/><path d="M49 61 l2 5"/><path d="M55 60 l3 5"/></g>
           <path d="M44 76 c-2 8-1 14 1 18 h7 c-3-6-3-12-2-18z" fill="url(#wR-fur)"/>
           <path d="M60 75 c1 8 3 13 5 17 h-8 c-2-6-2-11-1-17z" fill="url(#wR-fur)"/>
           <path d="M45 92 l-5 3 h9z" fill="#191612"/><path d="M62 92 l5 3 h-9z" fill="#191612"/>
           <path d="M40 42 q12-7 24-2 q-2 4-8 4 q-8-2-16-2z" fill="#a79e8a" opacity=".5"/>`,
    head: `<path d="M45 20 q9-6 16 1 q3 6-2 10 q-8 4-15-1z" fill="url(#wR-fur)"/>
           <path d="M59 26 q9 1 12 5 q-5 4-12 3z" fill="url(#wR-fur)"/>
           <path d="M62 31 q6 1 8 3 q-4 2-8 1z" fill="#2f2b24"/>
           <path d="M45 18 l-3-9 7 5 1 5z" fill="url(#wR-fur2)"/>
           <path d="M57 17 l4-9 -1 8 -2 4z" fill="url(#wR-fur2)"/>
           <ellipse cx="57" cy="26" rx="2" ry="1.4" fill="#e8d795"/>
           <path d="M55.8 26 q1.2-1.8 2.4 0 q-1.2 1.8-2.4 0z" fill="#141210"/>
           <path d="M68 33 l3 1 -3 1z" fill="#f0ebde"/><path d="M65 34 l2.4 1 -2.4 1z" fill="#f0ebde"/>`,
    wep: `<path d="M62 46 q9 2 11 9 q-5 4-11 1z" fill="url(#wR-fur)"/>
          <path d="M67 55 l6 10 -5 3 -5-10z" fill="url(#wR-fur2)"/>
          <g fill="#e8e0cc">
            <path d="M70 65 q5 3 7 8 q-4 0-7-4z"/><path d="M67 67 q4 4 5 9 q-4-1-6-5z"/>
            <path d="M64 68 q3 4 3 9 q-4-2-5-6z"/></g>`
  },
  ff: {
    hx: 62, hy: 46,
    bg: `<radialGradient id="wF-bg" cx="52%" cy="34%" r="82%">
           <stop offset="0%" stop-color="#8e6bd8"/><stop offset="40%" stop-color="#3a2170"/>
           <stop offset="100%" stop-color="#0d0722"/></radialGradient>
         <linearGradient id="wF-fur" x1="0.2" y1="0" x2="0.8" y2="1">
           <stop offset="0%" stop-color="#cbb4ff"/><stop offset="40%" stop-color="#6c4fb8"/>
           <stop offset="100%" stop-color="#1c1140"/></linearGradient>
         <linearGradient id="wF-mane" x1="0" y1="0" x2="0.4" y2="1">
           <stop offset="0%" stop-color="#ffd98a"/><stop offset="100%" stop-color="#a05f1c"/></linearGradient>
         <linearGradient id="wF-claw" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="#ffffff"/><stop offset="60%" stop-color="#c9b0ff"/>
           <stop offset="100%" stop-color="#6a49c0"/></linearGradient>`,
    back: `<rect width="100" height="100" fill="url(#wF-bg)"/>
           <circle cx="72" cy="22" r="16" fill="#e8dcff" opacity=".3"/>
           <circle cx="72" cy="22" r="16" fill="none" stroke="#fff" stroke-width=".6" opacity=".35"/>
           <ellipse cx="50" cy="50" rx="32" ry="34" fill="#b18cff" opacity=".14"/>
           <path d="M0 88 q26-8 50-3 q26 5 50-7 v24 H0z" fill="#100826" opacity=".9"/>`,
    deco: `<g><circle cx="20" cy="42" r="1.3" fill="#e6d4ff" opacity=".85"/>
           <circle cx="30" cy="72" r="1" fill="#ffd98a" opacity=".8"/>
           <circle cx="84" cy="52" r="1.5" fill="#e6d4ff" opacity=".8"/>
           <circle cx="14" cy="66" r="1.1" fill="#c9b0ff" opacity=".7"/>
           <circle cx="88" cy="76" r="1" fill="#ffd98a" opacity=".7"/></g>`,
    body: `<path d="M36 66 c-8 7-8 14-15 19 l5 7 c11-5 16-11 19-19z" fill="url(#wF-fur)"/>
           <path d="M24 91 l-6 4 h11z" fill="url(#wF-claw)"/>
           <path d="M45 45 q2-13 8-18 l8 5 q-7 6-8 15z" fill="url(#wF-fur)"/>
           <path d="M38 43 q15-10 28 2 q7 13 0 24 q-16 9-30-2z" fill="url(#wF-fur)"/>
           <path d="M36 40 q10-8 20-6 q-3 8-10 10 q-7 0-10-4z" fill="url(#wF-mane)" opacity=".9"/>
           <path d="M45 55 q10 6 19 0 q-2 12-9 15 q-8-3-10-15z" fill="url(#wF-mane)" opacity=".55"/>
           <path d="M44 76 c-2 8-1 14 1 18 h7 c-3-6-3-12-2-18z" fill="url(#wF-fur)"/>
           <path d="M61 75 c1 8 3 13 5 17 h-8 c-2-6-2-11-1-17z" fill="url(#wF-fur)"/>
           <path d="M44 92 l-6 3 h10z" fill="url(#wF-claw)"/><path d="M63 92 l6 3 h-10z" fill="url(#wF-claw)"/>`,
    head: `<path d="M44 19 q10-7 18 1 q3 7-2 11 q-9 4-17-1z" fill="url(#wF-fur)"/>
           <path d="M60 25 q11 1 14 6 q-6 4-14 3z" fill="url(#wF-fur)"/>
           <path d="M63 31 q7 1 9 3 q-5 3-9 1z" fill="#2a1a52"/>
           <path d="M44 17 l-4-11 9 6 1 6z" fill="url(#wF-mane)"/>
           <path d="M58 15 l5-11 -1 10 -3 4z" fill="url(#wF-mane)"/>
           <ellipse cx="57" cy="25" rx="2.6" ry="1.8" fill="#ffe98a"/>
           <ellipse cx="57" cy="25" rx="1" ry="1.8" fill="#3a2170"/>
           <path d="M71 33 l4 1.2 -4 1.2z" fill="#fff"/><path d="M67 34.5 l3 1.2 -3 1.2z" fill="#fff"/>`,
    wep: `<path d="M62 44 q11 2 13 10 q-6 5-13 1z" fill="url(#wF-fur)"/>
          <path d="M68 54 l7 11 -6 4 -6-11z" fill="url(#wF-fur)"/>
          <g fill="url(#wF-claw)">
            <path d="M72 65 q7 4 9 10 q-5 0-9-5z"/><path d="M68 67 q5 5 6 11 q-5-1-7-6z"/>
            <path d="M64 69 q4 5 4 11 q-5-2-6-7z"/></g>
          <g stroke="#e6d4ff" stroke-width=".7" fill="none" opacity=".6">
            <path d="M74 68 q6 4 8 9"/><path d="M69 70 q5 5 6 10"/></g>`
  }
};

/* 現行絵は全身が枠いっぱいに入るので、同じ迫力を出すために少しだけ寄せる。
   --hx/--hy は view-box に対する％なので、viewBox を変えたら換算し直す必要がある。 */
const VB = { x: 4, y: 4, s: 92 };
const px = v => ((v - VB.x) / VB.s * 100).toFixed(2);
const py = v => ((v - VB.y) / VB.s * 100).toFixed(2);

/* 現行と同じレイヤー順・同じクラス名で組み立てる */
function build(key, style) {
  const a = ART[key][style];
  const uid = key[0] + style[0];
  const rim = style === 'real' ? ' filter="url(#rim-' + uid + ')"' : '';
  return '<svg viewBox="' + VB.x + ' ' + VB.y + ' ' + VB.s + ' ' + VB.s + '" ' +
      'preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' + a.bg +
      '<filter id="rim-' + uid + '" x="-15%" y="-15%" width="130%" height="130%">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="0.3" result="d"/>' +
        '<feFlood flood-color="' + (a.rim || '#cfe0f5') + '" flood-opacity="' + (a.rimO || 0.42) + '" result="f"/>' +
        '<feComposite in="f" in2="d" operator="in" result="r"/>' +
        '<feGaussianBlur in="r" stdDeviation="0.18" result="rb"/>' +
        '<feMerge><feMergeNode in="rb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '</defs>' + a.back +
    '<g class="p-deco">' + a.deco + '</g>' +
    '<ellipse class="p-shadow" cx="50" cy="95" rx="28" ry="5.5" fill="#000" opacity=".42"/>' +
    (key === 'dragon' ? '<g class="p-wep" style="--hx:' + px(a.hx) + ';--hy:' + py(a.hy) + '">' + a.wep + '</g>' : '') +
    '<g class="p-fig"' + rim + '>' +
      '<g class="p-body">' + a.body + '</g>' +
      '<g class="p-head" style="--hdx:' + px(52) + ';--hdy:' + py(26) + '">' + a.head + '</g>' +
    '</g>' +
    (key === 'dragon' ? '' : '<g class="p-wep" style="--hx:' + px(a.hx) + ';--hy:' + py(a.hy) + '">' + a.wep + '</g>') +
    '</svg>';
}

const CHARS = [
  { key:'knight',   name:'騎士', line:'人系', elem:'steel'  },
  { key:'dragon',   name:'竜',   line:'竜系', elem:'fire'   },
  { key:'werewolf', name:'人狼', line:'獣系', elem:'shadow' },
];
const DATA = {};
CHARS.forEach(c => { DATA[c.key] = { real: build(c.key,'real'), ff: build(c.key,'ff') }; });

const page = `<title>絵柄リニューアル案</title>
<style>
${R('style.css')}

body{background:#07090f;color:#dbe4f5;margin:0;padding:0 0 70px;user-select:text;
  font-family:"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,-apple-system,sans-serif;
  -webkit-user-select:text;overflow-y:auto;line-height:1.85;font-size:14px;text-align:left}
.w{max-width:1000px;margin:0 auto;padding:22px 16px 0}
.w h1{font-size:21px;font-weight:900;color:#f2c65c;letter-spacing:.05em;margin:6px 0 8px}
.w h2{font-size:16.5px;font-weight:900;color:#f2c65c;margin:44px 0 4px;padding-top:22px;
  border-top:1px solid #1e2740}
.w p.lead{font-size:12.5px;color:#8fa0c0;line-height:1.9;margin:0 0 12px;max-width:70ch}
.w p.lead b{color:#dbe4f5}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 0}
.bar button{font-family:inherit;font-size:12px;font-weight:900;padding:8px 14px;border-radius:10px;
  border:1px solid #3c4762;background:#121a2c;color:#dbe4f5;cursor:pointer}
.bar button.on{border-color:#f2c65c;color:#f2c65c;background:rgba(242,198,92,.1)}
.bar button:focus-visible{outline:2px solid #f2c65c;outline-offset:2px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:16px}
.cel{border:1px solid #1e2740;border-radius:14px;background:#0b0f1a;overflow:hidden;
  display:flex;flex-direction:column}
.cel .hd{padding:10px 13px;background:#111827;display:flex;align-items:center;gap:9px}
.cel .hd b{font-size:13px;font-weight:900}
.cel .hd em{font-style:normal;font-size:10.5px;color:#8fa0c0;border:1px solid #2f3a55;
  border-radius:999px;padding:1px 8px}
.cel .hd em.now{color:#ffd98a;border-color:#8a6a1c}
.cel .hd em.rec{color:#7de8a4;border-color:#2f7a52}
.pic-wrap{position:relative;aspect-ratio:1/1.06;overflow:hidden;cursor:pointer;background:#04060c}
.pic-wrap:focus-visible{outline:2px solid #f2c65c;outline-offset:-2px}
.pic-wrap .unit{position:static;width:100%;height:100%;display:block;transform-origin:50% 84%}
.pic-wrap .unit .pic,.pic-wrap .unit .pic svg{width:100%;height:100%;display:block}
.pic-wrap .tap{position:absolute;left:8px;top:8px;z-index:3;font-size:9.5px;font-weight:900;
  color:#0a0d16;background:rgba(242,198,92,.92);padding:3px 8px;border-radius:999px;pointer-events:none}
.cel .ds{font-size:11.5px;color:#8fa0c0;padding:11px 13px;line-height:1.8;flex:1 1 auto}
.cel .ds b{color:#ffeec2}
.smallbox{display:flex;gap:26px;flex-wrap:wrap;background:#04060c;border:1px solid #1e2740;
  border-radius:14px;padding:18px 20px;margin-top:14px}
.smallbox .ttl{font-size:11.5px;font-weight:900;color:#8fa0c0;margin-bottom:8px}
.smallbox .pic{width:100px;aspect-ratio:1/1.06;overflow:hidden;border-radius:8px;border:1px solid #263049}
.smallbox .pic svg{width:100%;height:100%;display:block}
.smallbox .cap{font-size:10px;color:#7686a6;text-align:center;margin-top:5px;font-weight:800}
ul.pl{margin:0 0 14px;padding-left:1.2em;font-size:12.5px;color:#a8b6d4;line-height:1.9}
ul.pl li{margin-bottom:9px;max-width:70ch}
ul.pl b{color:#ffeec2}
</style>

<div id="fxlayer"></div>
<div class="w">
<h1>キャラ絵の別案</h1>
<p class="lead">人系（騎士）・竜系（竜）・獣系（人狼）の3体で、<b>写実路線</b>と<b>イラスト路線（FF風）</b>を作りました。<b>絵をタップすると、いまの行動モーションがそのまま再生されます。</b>アニメーションが成立するかどうかを、実際に見て判断してください。</p>
<div class="bar">
  <button id="sndb">♪ 音を出す</button>
  <button data-mo="attack" class="on">振り抜き（近接）</button>
  <button data-mo="cast">詠唱（掲げる）</button>
</div>

<h2>人系 ── 騎士</h2><div class="row" id="r-knight"></div>
<h2>竜系 ── 竜</h2><div class="row" id="r-dragon"></div>
<h2>獣系 ── 人狼</h2><div class="row" id="r-werewolf"></div>

<h2>盤面サイズだとどう見えるか</h2>
<p class="lead">対戦中、キャラは<b>1体あたり約100px</b>で表示されます。詳細画面では映えても、この大きさで見分けが付かないと実用になりません。同じ絵を実寸で並べました。</p>
<div id="small"></div>

<h2>アニメーションについて分かったこと</h2>
<div id="findings"></div>
</div>

<script>
${R('engine.js')}
</script>
<script>
${R('art.js')}
</script>
<script>
${R('sfx.js')}
</script>
<script>
var ALT = ${JSON.stringify(DATA)};
var CHARS = ${JSON.stringify(CHARS)};
</script>
<script>
(function () {
  var sound = false, mode = 'attack';

  function motionPlay(el, kind) {
    if (!el) return 0;
    el.classList.remove('mo-act','mo-chg','mo-stk','mo-cast');
    void el.offsetWidth;
    el.classList.add('mo-act');
    if (kind === 'cast') {
      el.classList.add('mo-cast');
      setTimeout(function(){ el.classList.remove('mo-cast'); }, 520);
      setTimeout(function(){ el.classList.remove('mo-act'); }, 760);
      return 300;
    }
    setTimeout(function(){ el.classList.add('mo-chg'); }, 70);
    setTimeout(function(){ el.classList.remove('mo-chg'); el.classList.add('mo-stk'); }, 330);
    setTimeout(function(){ el.classList.remove('mo-stk'); }, 470);
    setTimeout(function(){ el.classList.remove('mo-act'); }, 760);
    return 330;
  }

  var VER = [
    ['now','現行','now','全身を黒いシルエットにして、輪郭だけを色で光らせる作り。<b>手だけを軸に武器が回っても違和感が出にくい</b>のが、いまのアニメーションが成立している理由です。'],
    ['real','案1 写実路線','','金属や毛並みに実際の陰影を入れ、色を落ち着かせた案。<b>腕を武器グループに入れ、回転の軸を手から肩へ移しました。</b>これをしないと、腕から離れた武器だけが回って見えます。'],
    ['ff','案2 イラスト路線','rec','FF風。強い逆光の縁取り、金の装飾、光の筋と粒子。シルエットを大きく取り、<b>武器を長く誇張</b>して振りが映えるようにしています。']
  ];

  CHARS.forEach(function (c) {
    var row = document.getElementById('r-' + c.key);
    VER.forEach(function (v) {
      var svg = v[0] === 'now' ? CBART.portrait(c.key, c.elem) : ALT[c.key][v[0]];
      var wep = (CBART.ART[c.key] || {}).wep || 'sword';
      var cel = document.createElement('div');
      cel.className = 'cel';
      cel.innerHTML =
        '<div class="hd"><b>' + v[1] + '</b>' +
          (v[2] ? '<em class="' + v[2] + '">' + (v[2]==='now'?'いま':'おすすめ') + '</em>' : '') + '</div>' +
        '<div class="pic-wrap" tabindex="0" role="button" aria-label="' + v[1] + 'のアニメーションを再生">' +
          '<div class="unit" data-wep="' + wep + '"><div class="pic">' + svg +
          '</div></div><span class="tap">タップで再生</span></div>' +
        '<div class="ds">' + v[3] + '</div>';
      var pw = cel.querySelector('.pic-wrap');
      function go() {
        motionPlay(pw.querySelector('.unit'), mode);
        if (sound) { try { SFX.play(mode === 'cast' ? 'holy'
          : (c.key==='knight'?'lance':c.key==='dragon'?'dclaw':'claw')); } catch(e){} }
      }
      pw.onclick = go;
      pw.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      row.appendChild(cel);
    });
  });

  document.getElementById('sndb').onclick = function () {
    sound = !sound;
    try { SFX.setEnabled(sound); if (sound) SFX.play('select'); } catch(e){}
    this.classList.toggle('on', sound);
    this.textContent = sound ? '♪ 音 ON' : '♪ 音を出す';
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-mo]'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-mo]'), function(o){o.classList.remove('on');});
      b.classList.add('on'); mode = b.dataset.mo;
    };
  });

  /* 盤面サイズ（約100px）での見え方 */
  document.getElementById('small').innerHTML = '<div class="smallbox">' +
    CHARS.map(function (c) {
      return '<div><div class="ttl">' + c.line + '　' + c.name + '</div>' +
        '<div style="display:flex;gap:10px">' + VER.map(function (v) {
          var svg = v[0] === 'now' ? CBART.portrait(c.key, c.elem) : ALT[c.key][v[0]];
          return '<div><div class="pic">' + svg + '</div><div class="cap">' +
            (v[0]==='now'?'現行':v[0]==='real'?'写実':'FF風') + '</div></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';

  document.getElementById('findings').innerHTML =
    '<ul class="pl">' +
    '<li><b>いまのアニメーションは、そのまま両案に乗ります。</b>部品の名前と重ね順（背景→装飾→影→本体→武器）を現行と同じにしてあるので、ゲーム側のコードは1行も変えずに絵だけ差し替えられます。</li>' +
    '<li><b>ただし1か所だけ、作り方を変える必要がありました。</b>現行は「手」を軸に武器だけが回ります。全身が真っ黒なシルエットなので、腕と武器の境目が見えず成立していました。陰影を入れると<b>腕から切り離された武器だけが回転して見えてしまう</b>ので、両案とも<b>肩から手までを武器グループに含め、回転の軸を肩に移しています。</b></li>' +
    '<li><b>竜は翼が「武器」扱い</b>なので、羽ばたきとして自然に見えます。人狼は前脚＋爪をまとめて回します。</li>' +
    '<li><b>写実路線の弱点は、盤面サイズで消えることです。</b>上の実寸比較を見てください。100pxまで落とすと、陰影もテクスチャも潰れて<b>ただの灰色や茶色の塊</b>になります。詳細画面では映えますが、対戦中の見分けやすさは現行のシルエット方式のほうが上です。</li>' +
    '<li><b>イラスト路線（FF風）の強みは、小さくしても読めることです。</b>強い縁取りと明暗差、金の装飾があるので輪郭が保たれます。<b>盤面での視認性を落とさずに見栄えだけ上げられる</b>のが利点で、装飾の色（青・赤金・紫）で系統の区別も付けやすくなります。</li>' +
    '<li><b>作業量の目安。</b>現行は23体＋イメージ枠16体。ただし<b>体・頭・武器・装飾の組み合わせで作る仕組みは現行のまま</b>なので、部品を差し替えれば全体に効きます（騎士の胴を作れば聖騎士・護衛兵にも流用できる）。実際に必要なのは、体つき8種・頭20種ほど・武器20種ほどの描き直しです。</li>' +
    '<li><b>私の見立て。</b>写実路線は、このゲームの表示サイズと相性が良くありません。<b>案2（FF風）を推します。</b>現行の「小さくても読める」という長所を保ったまま、見栄えだけを上げられるからです。ただし色数が増えるぶん、系統ごとの色の決め方は先に整理しておいたほうがいいと思います。</li>' +
    '</ul>';
})();
</script>
`;

fs.writeFileSync(__dirname + '/../artalt.html', page);
console.log('artalt.html  ' + (page.length / 1024).toFixed(0) + ' KB');
