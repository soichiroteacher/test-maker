# テスト問題メーカー 引き継ぎメモ(後任の開発者向け)

最終更新: 2026-10-28

使う先生向けの説明は [README.md](README.md)、変更の記録は [CHANGELOG.md](CHANGELOG.md)、全アプリ共通のルールは `../CLAUDE.md` にある。
最初の引き継ぎ資料(データの形・番号の規則・採点アプリとの連携の考え方)は [docs/INTEGRATION.md](docs/INTEGRATION.md)。

## 今の状態

- 2026-10-28 に、別の場所で作っていた `TestMaker.html`(約100KB)を、校務アプリのフォルダ `apps/test-maker/` に移した。中身はまだ変えていない。
- このフォルダで Claude Code を使って、続けて作っていく。
- 採点アプリ(`../marksheet-grader/`)との連携はできている。テスト問題メーカーの「採点用JSON」を、採点アプリ v1.15 が読み込む。

| 場所 | URL・パス |
|---|---|
| GitHub(公開リポジトリ) | https://github.com/soichiroteacher/test-maker |
| Googleドライブ同期(appcopy) | `C:\Users\idolo\Documents\projects\appcopy\test-maker\` |

- アプリのファイルを変えたら、appcopy へのコピーと GitHub への push をする(グローバルの CLAUDE.md の決まり)。

## 次にやること

1. **(2026-10-29 済)残りのファイルを置いた**(ユーザーから受け取った testmaker-complete.zip から)
   - `ruby-engine.js`(自動ルビの辞書、約24MB。生成物)… GitHub には上げない(`.gitignore` で除外している)。appcopy にはコピーされる。
     別のPCで GitHub から取ったときは、appcopy か `tools/build-ruby-engine.js` で作り直して手に入れる。
   - `tools/build-ruby-engine.js`(`ruby-engine.js` を作り直すスクリプト。手順はファイルの冒頭)… GitHub に上げた。Download ZIP には入れない(`.gitattributes`)。
   - `README.txt`(前の配布用の説明)… 残っている。内容を README.md に合わせて、不要なら削除する。
   - `docs/HISTORY.md`(Claude.ai で開発していたときの経緯・決定事項・未解決事項)… **最初に読むとよい**。冒頭に、今の状態との違いを書き足してある。
   - `docs/sample-answerkey.json`(採点用JSONの見本。架空の内容)… `.gitignore` に例外を足して GitHub に上げた。
   - zip の `START_HERE.md` は、`docs/INTEGRATION.md` と同じ内容なので置いていない。zip の `TestMaker.html` は、ここにあるものと同じだった。
2. **前の場所の自動保存のデータを引き継ぐ**
   - 自動保存(localStorage `testmaker:v1`)は、HTML を開いた場所ごとに別になる。新しい場所で開くと空に見える。
   - 前の場所で「バックアップ保存」→ 新しい場所で「読み込み」で移す。
3. **共通ルールに合わせる**(`../CLAUDE.md`)
   - 「見本で試す」:サンプルのテスト(`sampleExam()`)はある。見本を試しても実際のデータを書き換えないか、確かめる。
   - 「はじめての方へ」:画面の順に操作を案内する画面ガイドは、まだ無い(「使い方・引き継ぎ」の説明だけ)。採点アプリの画面ガイド(`TOUR`)が参考になる。
   - 本体のファイル名:ほかのアプリは `index.html`。GitHub Pages で短いURLにしたいなら改名を検討する(改名すると自動保存の場所が変わるので、バックアップでの移し方を README に書く)。
4. **実物での確認**:Word 出力を実際の Word と教科書体のフォントで開いて、見た目を確かめる(今は LibreOffice でしか確かめていない)。

## 採点アプリとの約束(変えるときは両方を直す)

- 採点用JSON(`buildKeyJSON`)の形は `app: "testmaker-answerkey"`、`schema: 1`。形を変えたら `schema` を上げ、採点アプリ側(`marksheet-grader/index.html` の `parseAnswerKey`)も直す。採点アプリは知らない schema を読まずにお知らせを出す。
- マークシートの問題番号は全大問を通した連番。記述は連番に入れず「記1, 記2…」。正答の `index` は1始まり(ア=1)。
- `labels` の数は「マークシートの最大選択肢数」。採点アプリの解答用紙はア〜コの**10個まで**なので、11以上にすると採点アプリが読み込まない。
- `exam.id` が問題と採点結果を結びつけるキー。同じ id を採点アプリで読み込み直すと、読み取り結果を残して採点し直す。テストを「複製」すると別の id になる。
- 記述問題は、採点アプリではマークシートの解答用紙の下の記述欄になる(生徒は解答用紙の枠に書く)。問題用紙の解答欄をどう扱うかは未定。
- 画面を1つに統合するかは、連携を1〜2学期使ってから決める(2026-10-28 に話した方針。今は分けたまま)。

## 作りと方針

- `TestMaker.html` の1ファイルで動く。外部ライブラリ・外部通信は使わない(10年後も動くことを優先)。Word 出力も自前で ZIP と XML を組み立てている。
- 入力データ(JSON)が唯一の正。番号・記号・正答は保存せず、毎回 `compile(exam)` で計算する。出力(画面・印刷・Word・CSV・採点用JSON)はすべて `compile` の結果だけを見る。
- データの形を変えたら `SCHEMA` を上げ、`migrate()` で古いデータを補う(古いバックアップも開けるように)。
- 印刷は白黒が前提(灰色の塗りは使わない)。ルビ付きでも行間がつぶれないこと。
- 外国籍の生徒が多いので、問題用紙の漢字にはすべてルビを振る運用。教科書体のフォントを使う。
- コードの章立て(1 定数 → 2 データの形 → 3 compile → 4 出力 → 5 保存 → 6 画面)は、`TestMaker.html` の先頭のコメントにある。

## 動作の確かめ方

- 開発用には、このフォルダで `python -m http.server` を動かして Chrome で開くと、ブラウザの開発ツールから関数を呼べる。
  例:`compile(cur()).warnings` が空、`buildKeyJSON(compile(cur()), cur())` の `items.length` が問題数と一致すること。
- 採点アプリとの連携は、出した採点用JSONを採点アプリで読み込み、正答・配点・満点が合うかを見る。
