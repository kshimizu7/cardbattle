/* ビルド済みHTMLから src/ を丸ごと復元する（作業環境がリセットされたとき用）
   使い方: node recover.js [HTMLのパス]   省略時は index.html */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || __dirname + '/index.html', 'utf8');
const css = src.slice(src.indexOf('<style>') + 8, src.indexOf('\n</style>'));
const blocks = []; let pos = 0;
while (true) {
  const a = src.indexOf('<script>\n', pos); if (a < 0) break;
  const b = src.indexOf('\n</script>', a);
  blocks.push(src.slice(a + 9, b)); pos = b;
}
if (blocks.length !== 6) throw new Error('scriptブロックが6つではない: ' + blocks.length);
fs.writeFileSync(__dirname + '/src/style.css', css);
['engine.js','ai.js','save.js','sfx.js','art.js','ui.js'].forEach((n, i) => fs.writeFileSync(__dirname + '/src/' + n, blocks[i]));
console.log('復元:', blocks.map((b,i)=>['engine','ai','save','sfx','art','ui'][i]+':'+b.length).join(' '));
