# ARCANA CLASH ─ アルカナ・クラッシュ

6体編成の陣形カードバトル。スマートフォン1台でふたり対戦、またはCPU対戦ができます。

**▶ 遊ぶ： https://kshimizu7.github.io/cardbattle/**

---

## どんなゲームか

前衛3マス・後衛3マスに最大6体を並べ、素早さの順に自動で戦います。
プレイヤーが決めるのは **誰を出すか / どこに置くか / 誰を狙うか** の3つ。

- **カードプール**は3種類 ── 入門8枚 / スターター15枚 / エクステンション23枚
- **配り方**も2種類 ── シャッフル（敵味方まったく同じ候補）/ フルカード（全部が候補）
- 対戦は **CPU戦**（強さ3段階）と、1台を交代で回す **ふたり対戦**

外部ファイルは一切ありません。効果音は60種類以上をすべて WebAudio でその場から合成し、
キャラクターの絵も SVG をコードから生成しています。**HTML 1枚で完結**します。

## 遊び方（配布）

`index.html` を1つダウンロードするだけで、オフラインでも動きます。

ただし **ファイルを直接開くと、端末によっては戦績が保存されません**（ブラウザの仕様です）。
記録を残したい場合は上記のURLから遊んでください。

---

## 開発

### 構成

```
src/
  engine.js   ゲームエンジン（DOM非依存。Node でもブラウザでも動く）
  ai.js       CPU の思考
  save.js     セーブ（戦績・設定・引き継ぎコード）
  sfx.js      効果音の合成
  art.js      キャラクターの SVG 生成
  ui.js       画面と進行制御
  style.css
build.js      src/ を1枚の HTML に束ねる
recover.js    ビルド済み HTML から src/ を復元する
tools/        開発用スクリプト（回帰テスト・バランス検証・音の確認）
```

### ビルド

```bash
CBVER=21 node build.js
```

`index.html`（Pages 用）と、配布用のコピーが出力されます。
版番号はタイトル画面の下部に `ver 21` として表示されます。

### 復元

`index.html` にはソース一式がそのまま埋め込まれているので、
`src/` を失っても HTML さえあれば完全に復元できます。

```bash
node recover.js            # index.html から復元
node recover.js path/to/ArcanaClash.html
```

### テスト

Playwright で実際に画面を操作し、編成から決着までを自動で流します。

```bash
CBPOOL=full CBDEAL=shuffle node tools/batch.js 3
```

`CBPOOL` は `tutorial` / `starter` / `full`、`CBDEAL` は `shuffle` / `full`。

---

## 変更履歴

[docs/CHANGELOG.md](docs/CHANGELOG.md)
