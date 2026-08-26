/* 単体で配る用のHTMLに包み直す。
   Artifact に載せるページは中身だけを書いているが、そのままファイルとして
   スマホやPCで直接開くと、文字コードの宣言が無いためブラウザが推測に失敗して
   文字化けする。配布用には <meta charset="utf-8"> を含む完全なHTMLにする。

   使い方: node tools/standalone.js <入力> [出力先ディレクトリ]        */
const fs = require('fs');
const path = require('path');

function wrap(src, fallbackTitle) {
  const m = src.match(/<title>([\s\S]*?)<\/title>/i);
  const title = m ? m[1] : fallbackTitle;
  const body = m ? src.replace(m[0], '') : src;
  return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no">\n' +
    '<meta name="theme-color" content="#080b12">\n' +
    '<title>' + title + '</title>\n' +
    '</head>\n<body>\n' + body.replace(/^\s*\n/, '') + '\n</body>\n</html>\n';
}

if (require.main === module) {
  const inp = process.argv[2];
  const outDir = process.argv[3] || path.join(__dirname, '..', 'standalone');
  if (!inp) { console.error('入力ファイルを指定してください'); process.exit(1); }
  const src = fs.readFileSync(inp, 'utf8');
  const base = path.basename(inp);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, base);
  fs.writeFileSync(out, wrap(src, base.replace(/\.html$/, '')), 'utf8');
  console.log(base + '  →  ' + out + '  (' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB)');
}

module.exports = { wrap };
