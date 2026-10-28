# テスト問題メーカー(test-maker)

- 全アプリ共通のルールは `../CLAUDE.md`。必ず従うこと。
- 作業を始める前に [HANDOFF.md](HANDOFF.md) を読むこと(今の状態・次にやること・採点アプリとの約束)。
- 生徒に配る問題用紙は白黒印刷が前提。灰色の塗りや色だけで意味を伝えない。
- 採点用JSON(`buildKeyJSON`)の形を変えるときは `schema` を上げ、採点アプリ(`../marksheet-grader/` の `parseAnswerKey`)も同時に直す。
- データの形を変えたら `SCHEMA` を上げて `migrate()` を書き、古いバックアップが開けることを確かめる。
- 仕様を変えたら、アプリ内の「使い方・引き継ぎ」、ファイル先頭のコメント、README.md・CHANGELOG.md・HANDOFF.md を同時に更新する。
- 自動ルビの辞書 `ruby-engine.js`(約24MB)は GitHub に上げない(`.gitignore`)。
