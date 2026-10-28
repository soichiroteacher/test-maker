> **この資料について(2026-10-28)**
> テスト問題メーカーを校務アプリのフォルダ `apps/test-maker/` に移したときに残した、最初の引き継ぎ資料です。
> 前半にあった「採点アプリへの連携の依頼」は、採点アプリ(`apps/marksheet-grader/`)の v1.15 で対応済みです
> (採点アプリ側の取り込み方は `marksheet-grader/HANDOFF.md` の「テスト問題メーカーとの連携」)。
> 今の状態・次にやることは、このフォルダの `HANDOFF.md` を見てください。

# テスト問題メーカー → 採点アプリ 統合のための引き継ぎ資料

この資料は、Claude Code（採点アプリの開発環境）が「テスト問題メーカー」の中身を把握し、
採点アプリとの連携・統合を設計するためのもの。先に末尾の「Claude Codeへの依頼文」を読むこと。

## 1. 目的と前提（ユーザーの方針）

- ユーザーは中学校技術科の教師。定期テストは原則マークシート式。選択肢はカタカナ（ア〜）。記述は原則入れないが機能は欲しい。
- 採点アプリは自作で、Claude Code上で完成・運用済み。**運用中のものを壊さないこと**が最優先。
- 開発の優先事項（ユーザー指定）:
  1. **持続可能性**：担当者が変わってもメンテナンスできること（構成が単純、説明が残っている）
  2. **バックアップ機能**
  3. **シンプルで使いやすいUI**
- 対象生徒に外国籍が多く、問題用紙は漢字すべてにルビを振る運用。教科書体フォントを使う。
- 印刷は白黒（グレー表現は使えない）。
- 統合の狙い：正答の二重入力をなくす／問題の入れ替えで番号が変わっても採点側の正答が追従する／
  設問ごとの正答率を問題文と並べて見る／模範解答・解説用紙を同じデータから作る。

## 2. 成果物の構成

```
testmaker/
  TestMaker.html        アプリ本体（HTML1ファイル。約100KB。外部通信なし）
  ruby-engine.js        自動ルビ用辞書エンジン（約24MB。生成物。無くても他機能は動く）
  README.txt            配布時の説明
  tools/build-ruby-engine.js   ruby-engine.js の作り直しスクリプト
  docs/INTEGRATION.md   この資料
  （docs/ は渡していない。サンプルは本ファイル末尾）
```
動作環境：Chrome / Edge。ダブルクリックで開く（file://）。サーバー不要。
自動ルビの辞書は kuromoji.js（Apache-2.0）＋ mecab-ipadic。冒頭に権利表記あり。再配布時は丸ごと渡す。

## 3. アーキテクチャ（TestMaker.html の中身）

ファイル先頭のコメントに章立てがある。要点：

| 章 | 内容 |
|---|---|
| 1 | 定数（記号セット `LABEL_SETS`、`FONTS`）、サンプルテスト `sampleExam()` |
| 2 | データの形：`newMeta / newItem / newSection / newExam / migrate`。形を変えたら `SCHEMA` を上げ `migrate()` で補完 |
| 3 | **`compile(exam)`**：入力データ → 番号・記号・正答・警告を計算。**ここが中心** |
| 4 | 出力。すべて `compile` の結果だけを見る：`renderPaperHTML`（画面・印刷）、`renderKeyHTML`（正答一覧）、`buildCSV`、`buildKeyJSON`（採点連携）、`buildDocx`（Word、自前のZIP/XML。外部ライブラリなし） |
| 5 | 保存：localStorage キー `testmaker:v1`、履歴（10分ごと・40件）、バックアップJSON、ルビ辞書 |
| 6 | 画面（エディタ）。計算はしない |

設計原則：**入力データ（JSON）が唯一の正**。番号・記号・正答は保存せず、毎回 `compile` で導出する。
そのため問題の追加・削除・並べ替えで番号がずれる事故が起きない。

## 4. データの形（exam JSON、schema 1）

```jsonc
{
  "app": "testmaker", "schema": 1, "id": "…", "name": "R8 1学年 技術 1学期", "updatedAt": 1730000000000,
  "meta": {
    "date": "R8.6.17(水)実施", "title": "令和８年度 …", "kind": "問題用紙",
    "notice": "注意書き（1行1項目）", "intro": "全体の指示文",
    "showName": true, "font": "BIZ UDPゴシック", "size": 11,
    "labelSet": "kana",          // kana(ア…) | maru(①…) | abc(A…)
    "bankCols": 0,               // 語群の列数。0=自動
    "showPoints": true, "maxChoices": 10,   // マークシートの最大選択肢数
    "showRuby": true, "autoRuby": true, "pageMode": "flow", "keepBank": true,
    "footer": "…"
  },
  "sections": [   // 大問。type ごとに中身が違う
    { "id":"…","type":"blank","title":"…","lead":"","points":2,
      "text":"本文。空欄は {{正解語句}}、同じ空欄の再登場は {{@語句}}。ルビは [漢字|かんじ]",
      "distract":"ダミー語句（1行1つ）", "order":"shuffle|appear|manual", "seed":123, "manual":"", "bankNote":"…" },
    { "type":"choice", "points":2, "items":[ {"id":"…","text":"問題文","choices":["…","…","…","…"],"correct":2} ] },
    { "type":"tf", "trueLabel":"正しい","falseLabel":"間違っている", "points":2, "items":[ {"id":"…","text":"…","correct":0} ] },  // correct 0=ア(正) 1=イ(誤)
    { "type":"written", "items":[ {"id":"…","text":"…","answer":"模範解答","lines":3,"points":3} ] }  // マークシート番号に数えず「記1,記2…」
  ]
}
```
バックアップJSON：`{ app:"testmaker", schema, exams:[exam…], userDict:{語:読み} }`。

### 番号付けの規則（採点アプリと共有すべき約束）
- マークシートの問題番号は **全大問を通した連番 1,2,3…**（語群選択は空欄ごと、選択・正誤は1問ごと）。
- `{{@語句}}` の再登場は新しい番号を消費しない（同じ空欄番号を再掲）。
- 記述問題は連番に含めず `記1, 記2…`。採点対象外（手採点）。
- 選択肢の記号は `labelSet`（既定 ア,イ,ウ…）。語群の並びは `order`（既定は語句ごとのハッシュで固定シャッフル。seed が同じなら再現する）。

## 5. 採点アプリへ渡す窓口（実装済み）

画面上部「採点用JSON」ボタン → `{テスト名}_採点用.json`。形（schema 1）は 本ファイル末尾のサンプル 

```jsonc
{ "app":"testmaker-answerkey", "schema":1, "exportedAt":"…",
  "exam":{ "id","name","title","date" },
  "labels":["ア","イ",…],         // 使える記号（maxChoices 個まで）
  "total":60,
  "items":[ {"no":1,"section":1,"label":"キ","index":7,"text":"IoT","points":2}, … ],  // マークシート対象
  "written":[ {"id":"記1","section":4,"answer":"…","points":4,"lines":3} ],            // 手採点
  "sections":[ {"no":1,"title":"…","type":"blank","from":1,"to":7,"points":14}, … ] }  // 大問ごとの範囲と配点
```
CSV（`正答CSV`）も出るが、構造を持てるのでJSONを正とする。
**`exam.id` は採点結果と問題を結びつけるキー**になる（テスト複製時は別idになる）。

## 6. 統合の方向（段階案）

1. **連携（まず）**：採点アプリが上の採点用JSONを読み込み、正答・配点・大問構成を取り込む。
   採点アプリ側の既存の入力方法はそのまま残す（後方互換）。
2. **共通の約束の固定**：記号、選択肢数、番号規則（上の §4）を1枚の文書にして両アプリで共有。
3. **統合（判断は後）**：連携を1〜2学期運用して不便が残れば、画面を統合する。
   効果が大きいのは「設問ごとの正答率を問題文と並べて表示」「誤答の多い選択肢の分析」。
   統合するなら `compile()` と `exam JSON` を共通モジュールにし、採点結果は問題データと**別ファイル・別バックアップ**に保つ（成績は個人情報）。

## 7. 制約・注意（壊さないために）

- TestMaker.html は**外部ライブラリ・CDN・通信を使わない**方針。「10年後に担当が変わっても開ける」ことを優先している。
  ライブラリを足す場合は、この方針とのトレードオフを先にユーザーへ確認する。
- 重い辞書は別ファイル（ruby-engine.js）に分離し、遅延読み込み。無くても動くこと。
- 成績データ（個人情報）を問題作成側のバックアップに混ぜない。
- 色は白黒印刷前提（灰色塗り禁止）。ルビ付きでも行間が潰れないこと。
- UIは「迷わないこと」優先。機能を足すときはボタンを増やすより既定値を賢くする。
- 既存データの互換：`SCHEMA` を上げたら `migrate()` で古いバックアップが読めること。

## 8. 未検証・既知の限界

- Word出力は LibreOffice で確認。**実機のWord／教科書体フォントでの見た目は未確認**（行間は「最低値」指定にして字体差を吸収する設計）。
- 印刷／PDFのヘッダ日時は `@page{margin:0}` ＋ `thead/tfoot` 余白で回避。ブラウザ差で出る場合は印刷ダイアログで「ヘッダーとフッター」を外す。印刷ではページ番号は出ない（Wordは出る）。
- 自動ルビ（IPAdic）は誤読がある（例：令和→れいわ は標準辞書で補正、語群の語など）。確認ダイアログと登録辞書で運用。
- サンプルテストの正答は元の問題文から推定したもの（要確認）。
- 採点アプリの仕様は**未確認**（この資料の作成者は採点アプリを見ていない）。

## 9. 動作確認のしかた

```
# Playwright（Chromium）で TestMaker.html を開き、関数を直接呼べる
const j = await page.evaluate(() => buildKeyJSON(compile(cur()), cur()));
```
`compile(cur())` の `warnings` が空であること、`answers.length` が問題数と一致することを見る。

---

---

## 採点用JSONのサンプル（先頭3件のみ。実物は全問分が出る）

```json
{
 "app": "testmaker-answerkey",
 "schema": 1,
 "exportedAt": "2026-10-28T03:16:25.263Z",
 "exam": {
  "id": "mvrjlwjytpdus",
  "name": "サンプル　R8 1学年 技術 1学期（正答は要確認）",
  "title": "令和８年度　１学年技術・家庭科（技術分野）　１学期定期テスト",
  "date": "R8.6.17(水)実施"
 },
 "labels": [
  "ア",
  "イ",
  "ウ",
  "エ",
  "オ",
  "カ",
  "キ",
  "ク",
  "ケ",
  "コ"
 ],
 "total": 60,
 "items": [
  {
   "no": 1,
   "section": 1,
   "label": "キ",
   "index": 7,
   "text": "IoT",
   "points": 2
  },
  {
   "no": 2,
   "section": 1,
   "label": "エ",
   "index": 4,
   "text": "ハードウェア",
   "points": 2
  },
  {
   "no": 3,
   "section": 1,
   "label": "ク",
   "index": 8,
   "text": "ソフトウェア",
   "points": 2
  }
 ],
 "written": [],
 "sections": [
  {
   "no": 1,
   "title": "身の回りの情報の技術・コンピュータの仕組み",
   "type": "blank",
   "from": 1,
   "to": 7,
   "points": 14
  },
  {
   "no": 2,
   "title": "情報のデジタル化",
   "type": "blank",
   "from": 8,
   "to": 13,
   "points": 12
  },
  {
   "no": 3,
   "title": "情報通信ネットワーク",
   "type": "blank",
   "from": 14,
   "to": 20,
   "points": 14
  },
  {
   "no": 4,
   "title": "情報セキュリティの仕組み・情報モラル",
   "type": "blank",
   "from": 21,
   "to": 23,
   "points": 6
  },
  {
   "no": 5,
   "title": "タイピング",
   "type": "blank",
   "from": 24,
   "to": 26,
   "points": 6
  },
  {
   "no": 6,
   "title": "中タブレットルール",
   "type": "tf",
   "from": 27,
   "to": 30,
   "points": 8
  }
 ]
}
```
