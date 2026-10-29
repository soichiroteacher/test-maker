/*
 * ruby-engine.js を作り直すスクリプト（通常は不要。辞書エンジンを更新したいときだけ使う）
 *
 * 使い方:
 *   git clone https://github.com/takuyaa/kuromoji.js.git
 *   node build-ruby-engine.js ./kuromoji.js ../ruby-engine.js
 *
 * 材料: kuromoji.js (Apache-2.0) の build/kuromoji.js と dict/*.dat.gz (mecab-ipadic)。
 * これらを1つのJSにまとめ、通信なし(file://)でも読めるようにしている。
 */
const fs = require('fs'), path = require('path');
const src = process.argv[2], out = process.argv[3] || 'ruby-engine.js';
if (!src) { console.error('usage: node build-ruby-engine.js <kuromoji.js repo dir> [out.js]'); process.exit(1); }
const lib = fs.readFileSync(path.join(src, 'build/kuromoji.js'), 'utf8');
const dict = {};
for (const f of fs.readdirSync(path.join(src, 'dict')).filter(f => f.endsWith('.dat.gz')))
  dict[f] = fs.readFileSync(path.join(src, 'dict', f)).toString('base64');
const notice = fs.readFileSync(path.join(src, 'NOTICE.md'), 'utf8');

const head = `/*!
 * ruby-engine.js  ── テスト問題メーカー用「自動ルビ」辞書エンジン（自動生成ファイル。直接編集しない）
 * 作り方: tools/build-ruby-engine.js
 *
 * 含まれるもの
 *  - kuromoji.js  Copyright 2014 Takuya Asano / Copyright 2010-2014 Atilika Inc.  Apache License 2.0
 *    https://github.com/takuyaa/kuromoji.js
 *  - mecab-ipadic-2.7.0-20070801 の辞書データ（下記の著作権表示・免責を含めて再配布）
 *
${notice.split('\n').map(l => ' * ' + l.replace(/\*\//g, '* /')).join('\n')}
 */
`;
const tail = `
;(function () {
  var kj = window.kuromoji, DICT = window.__RUBY_DICT;
  var queue = [], state = { ready: false, loading: false, error: null, tk: null };
  function b64(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  /* kuromoji は辞書をXHRで読む。通信なしで動かすため、埋め込みデータを返す偽XHRに差し替える（読み込み中だけ） */
  function FakeXHR() { this.status = 0; this.response = null; this.statusText = ''; }
  FakeXHR.prototype.open = function (m, url) { this.url = url; };
  FakeXHR.prototype.send = function () {
    var self = this, name = String(self.url).split('/').pop();
    setTimeout(function () {
      if (DICT[name]) { self.status = 200; self.response = b64(DICT[name]); self.onload && self.onload.call(self); }
      else { self.statusText = 'not found: ' + name; self.onerror && self.onerror.call(self, self.statusText); }
    }, 0);
  };
  window.RubyEngine = {
    get ready() { return state.ready; }, get loading() { return state.loading; }, get error() { return state.error; },
    load: function (cb) {
      if (state.ready) { cb && cb(null); return; }
      if (cb) queue.push(cb);
      if (state.loading) return;
      state.loading = true;
      var Orig = window.XMLHttpRequest; window.XMLHttpRequest = FakeXHR;
      setTimeout(function () {
        kj.builder({ dicPath: 'bundle/' }).build(function (err, tk) {
          window.XMLHttpRequest = Orig; state.loading = false;
          if (err) state.error = String(err); else { state.tk = tk; state.ready = true; }
          var q = queue.splice(0); q.forEach(function (f) { f(state.error); });
        });
      }, 30);
    },
    /* 戻り値: [{s:表記, rd:読み(カタカナ) or null}] */
    tokenize: function (text) {
      return state.tk.tokenize(text).map(function (t) { return { s: t.surface_form, rd: (t.reading && t.reading !== '*') ? t.reading : null }; });
    }
  };
})();
`;
fs.writeFileSync(out, head + '(function(){\nvar DICT = ' + JSON.stringify(dict) + ';\nwindow.__RUBY_DICT = DICT;\n})();\n' + lib + '\n' + tail);
console.log('written', out, (fs.statSync(out).size / 1e6).toFixed(1) + 'MB');
