# AGENTS.md — AI開発者への必須ルール

このリポジトリで作業するすべてのAI（Claude Code / ChatGPT Desktop / Codex ほか）は、
**作業を始める前に必ずこのファイルを読むこと。**

背景やプロジェクト全体の説明はここには書かない。
詳しくは [docs/開発ガイド.md](docs/開発ガイド.md) と [docs/設計判断.md](docs/設計判断.md) を参照。

---

## 絶対に守ること

### 1. HTML 1枚・外部依存ゼロを崩さない

このゲームは `index.html` を1つ配れば `file://` でもオフラインで動く。**これが最大の設計方針。**

- CDN・npm パッケージ・外部フォント・`fetch` / `XMLHttpRequest` を**製品コードに入れない**
- 画像は base64 で埋め込む。アイコンは絵文字かインラインSVG
- フレームワーク（React 等）もビルドツール（webpack 等）も導入しない
- `package.json` は存在しない。増やさない

### 2. `index.html` は直接編集しない

`index.html` は `build.js` の出力物。手で編集すると次のビルドで消える。
**必ず `src/` を直して `CBVER=NN node build.js` で作り直す。**
（`CBVER` を省くと版番号が既定値の `21` になってしまう）

`ArcanaClash.html` と `dist/` も同じく成果物（`.gitignore` 対象）。

### 3. 実装前に必ず kazu の合意を取る

kazu（プロダクトオーナー）が仕様と可否を決める。

- 提案 → 合意 → 実装 の順を守る
- 「壁打ちしたい」と言われたら**コードを書かない**。案を出して判断を待つ
- 自己判断で仕様を変えない。迷ったら聞く

### 4. 1バージョン＝1テーマ

1つの版に複数テーマの変更を混ぜない。**切り戻しを1手でできるようにするため。**

版を切ったら `変更履歴.md`（リポジトリ直下）を日本語で更新してから配信する。

### 5. `art/face.json` の既存値を変更しない

全キャラの「目の位置」を1体ずつ手で合わせた資産。
狂うと盤面・紹介札・図鑑の顔位置がまとめて崩れる。

**新しいキャラの行を足すのは可。既存の行の数値は触らない。**

### 6. `build.js` の埋め込み順を変更しない

```
engine → ai → gear → save → sfx → bgm → art → teamname → CHAR/UI/ART → RPG → ui
```

この順序に依存関係がある（例：`teamname.js` は `ui.js` より前でないと動かない）。
`src/` にファイルを足したときは、この順序を壊さない位置に登録する。

### 7. 新規ファイルを作る前に、既存ファイルを必ず確認する

`ls` / `Glob` で同名ファイルの有無を確かめてから書く。
**過去に既存の `sim.js`（84行のバランス検証ツール）を上書きして失った事故がある。**

同じ処理を2か所以上に書かない。
**過去に「一番弱い」の判定が3か所に分裂し、画面の予告と実際の被弾がズレるバグになった。**

---

## セキュリティ

### 8. `yamagear` リポジトリには一切触れない

読むことも、書くことも、履歴を変えることも禁止。
このセッションで許可されているのは `cardbattle` と Google Drive の `バトルゲーム` フォルダのみ。

### 9. GitHubトークンの権限を `cardbattle` 以外へ広げない

現在は `kshimizu7/cardbattle` に限定した fine-grained PAT（Contents + Pages の write）。

- **「All repositories」に変更してはいけない**（`yamagear` が露出する）
- リポジトリ登録は必ず「Only select repositories」＝ `cardbattle` のみ
- GitHubの「Block command line pushes that expose my email」を**有効にしない**（アカウント全体設定で `yamagear` の運用が壊れる）

### 10. コミットのメールアドレスは固定

```
70817205+kshimizu7@users.noreply.github.com
```

ユーザー名は `kshimizu7`。

### 11. 秘密情報・APIキー・トークンを Git に保存しない

- トークンは端末の `$HOME/.git-credentials` にのみ置く（リポジトリの外）
- ソース・ドキュメント・コミットメッセージ・ログに書かない
- 誤って入れた場合は commit する前に取り除く

---

## 作業の型

1. `docs/現在地.md` で、いま何が最優先かを確認する
2. 変更は `src/` に対して行う
3. `node smoke.js` と `node rulecheck.js 300` を通す
4. `変更履歴.md` に日本語で追記する
5. kazu の確認を受けてから配信する（手順は [docs/開発ガイド.md](docs/開発ガイド.md)）
