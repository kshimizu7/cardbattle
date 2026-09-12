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
**必ず `src/` を直し、PowerShellで `CBVER` を明示して作り直す。**

```powershell
$env:CBVER = 'NN'
node .\build.js
```
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

## 正式開発環境

詳しい手順は [docs/開発ガイド.md](docs/開発ガイド.md#正式開発環境とgit運用) を参照。

### 12. 母艦PCの `cardbattle-main` を使う

正式な開発環境は、母艦Windows PCのCodexと次の通常clone。

```text
C:\Users\kazu_\projects\cardbattle-main
```

実装・build・テスト・commit・push・配信は、kazu が明示的に依頼または承認した範囲だけ行う。

### 13. GitHub の `main` が唯一の正本

- **作業を始める前に、必ず `main` へ最新化する**
- 通常の `git pull --ff-only origin main` / commit / `git push origin main` を使う
- `GIT_DIR` / `GIT_WORK_TREE`、detached HEAD、tgz転送、別環境での再commitは使わない
- ローカルファイルの直接コピーを環境間の受け渡し手段にしない

### 14. 同じテーマを複数環境で同時に編集しない

- 1つのテーマは、必ず1つの作業コピーだけで触る
- **未 commit の変更が残っている状態で、もう一方へ同じ作業を依頼しない**

### 15. commit identity はリポジトリローカルに固定する

グローバル設定は変更せず、このリポジトリの `.git/config` に次を設定する。

```powershell
git config --local user.name kshimizu7
git config --local user.email 70817205+kshimizu7@users.noreply.github.com
```

---

## 作業の型

1. **作業前に、通常cloneを `main` の内容に合わせる**（手順は開発ガイド）
2. `docs/現在地.md` で、いま何が最優先かを確認する
3. 変更は `src/` に対して行う
4. `node .\smoke.js` と `node .\rulecheck.js 300` を通す
5. `変更履歴.md` に日本語で追記する
6. kazu の確認を受けてから配信する（手順は [docs/開発ガイド.md](docs/開発ガイド.md)）
7. ローカルHEADと `origin/main` の一致を確認する
