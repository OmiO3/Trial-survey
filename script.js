/*
  ========================================
  script.js — MPL ふりかえりアンケート
  ========================================
  このファイルは「動き」を決めるファイルだよ。
  ボタンを押したときに何が起こるか、
  データをどう送るか、AI メッセージを
  どうやって作るかがぜんぶここに書いてあるよ。
*/


/* ========================================
   設定（まず最初に決めること）
   ========================================
*/

/*
  サーバーの URL（データを送る場所）
  ローカル（自分のパソコン）で動かすときは
  下のアドレスを使うよ。
  Google スプレッドシートに連携するときは
  コメントを外して GAS の URL に切りかえてね。
*/
// スプレッドシート（Google Apps Script）に送るURL
const SERVER_URL = 'https://script.google.com/macros/s/AKfycbzbz6zu3yY0io_V4xzhBsOpjF4LF959t6FvFzPJ0kNk60SOBjm0tzrFSaKOoJiYZ_AERA/exec';
// ↓ ローカル環境で動かすときはこっちを使う
// const SERVER_URL = 'http://localhost:3000/submit';


/* ========================================
   State（アンケートの答えを入れておく箱）
   ========================================
   S というオブジェクト（入れ物）に
   全部の答えをまとめて管理しているよ。
   最初は空っぽ（'' や 0）で、
   ボタンを押すたびに値が入っていくよ。
*/
const S = {
  moment:  '',  /* Q1：一番心が動いた瞬間    */
  sat:      0,  /* Q2：満足度（1〜5の数字）  */
  diff:    '',  /* Q3：ワークの難しさ         */
  improve: '',  /* Q4：改善点（自由記述）     */
  project: '',  /* Q5：プロジェクト名         */
  step:    '',  /* Q6：今週やること           */
  feeling: '',  /* Q7：今の気持ち             */
  meetup:  '',  /* Q8：Meetup 参加意向        */
  motives: [],  /* Q9：参加動機（複数 OK）    */
  age:     '',  /* Q10：年代                  */
  job:     '',  /* Q10：職業                  */
  channel: '',  /* Q10：きっかけ              */
  times:   '',  /* Q10：参加回数              */
};

/*
  AI メッセージを一時的にとっておく変数。
  コピーボタンやシェアボタンで使うよ。
*/
let aiText = '';


/* ========================================
   参加動機ピルの自動生成
   ========================================
   Q9 のボタン（ピル）を JavaScript で
   自動的に作っているよ。
   こうすると、選択肢を増やしたいときに
   MOTIVES の配列に追加するだけで OK！
*/
const MOTIVES = [
  'プロジェクトを始めたかった',
  '仲間を見つけたかった',
  '新しい刺激が欲しかった',
  '友人・知人に誘われた',
  'SNSで見て気になった',
  'MPLのファン',
  '起業・副業を考えている',
  'なんとなく気になった',
];

/*
  id="motives" の要素を見つけて、
  MOTIVES の各テキストからボタンを作って入れているよ。
  map() は配列の各要素を変換する関数。
  join('') は変換結果をつなげて1つの文字列にする。
*/
document.getElementById('motives').innerHTML = MOTIVES
  .map(m => `<div class="pill-check" onclick="toggleMotive(this, '${m}')">${m}</div>`)
  .join('');


/* ========================================
   画面の切りかえ
   ========================================
   goTo(n) を呼ぶと、スクリーン n に移動するよ。
   例）goTo(1) → スクリーン 1 に移動
*/
function goTo(n) {
  /* すべてのスクリーンから active クラスを外す（非表示にする） */
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  /* 移動先のスクリーンに active クラスをつける（表示する） */
  document.getElementById('screen-' + n).classList.add('active');

  /* ページの一番上にスクロールする */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /*
    プログレスバーの幅を変える。
    スクリーン番号に合わせた % を設定しているよ。
    ?? は「左が undefined のとき右を使う」という記号。
  */
  const progressPct = [0, 20, 55, 85, 100][n] ?? 100;
  document.getElementById('progress-bar').style.width = progressPct + '%';

  /*
    ステップカウンター（Step 1 / 3）の表示を更新するよ。
    スクリーン 1〜3 は「Step X / 3」、4 は「完了」、0 は空白。
  */
  const counter = document.getElementById('step-counter');
  if (n >= 1 && n <= 3) {
    counter.textContent = `Step ${n} / 3`;
  } else if (n === 4) {
    counter.textContent = '完了';
  } else {
    counter.textContent = '';
  }
}


/* ========================================
   選択系の関数（ボタンを選んだ時の処理）
   ========================================
*/

/*
  selectMoment(el, val)
  Q1「心が動いた瞬間」カードをクリックしたとき。
  el  → クリックした要素
  val → 選んだ答え（例：'火星コンビニ'）
*/
function selectMoment(el, val) {
  /* 全カードから selected を外す */
  document.querySelectorAll('.moment-card').forEach(c => c.classList.remove('selected'));
  /* クリックしたカードに selected をつける */
  el.classList.add('selected');
  /* 答えを S に記録 */
  S.moment = val;
  /* ボタンの有効化チェック */
  checkBtn1();
}

/*
  selectSat(el, val)
  Q2「満足度」ボタンをクリックしたとき。
  val は 1〜5 の数字。
*/
function selectSat(el, val) {
  document.querySelectorAll('.sat-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  S.sat = val;
  checkBtn1();
}

/*
  selectDiff(el, val)
  Q3「難しさ」ボタンをクリックしたとき。
*/
function selectDiff(el, val) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  S.diff = val;
  checkBtn1();
}

/*
  selectRadio(el, key, val)
  ラジオカード（Q7・Q8）をクリックしたとき。
  key → S のどのプロパティに入れるか（'feeling' or 'meetup'）
  val → 選んだ答えのテキスト
*/
function selectRadio(el, key, val) {
  /* 同じグループ内のカードから selected を外す */
  el.closest('.radio-cards').querySelectorAll('.radio-card')
    .forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  /* S['feeling'] や S['meetup'] に記録 */
  S[key] = val;
  /* スクリーン 2 のボタンチェックも呼んでおく */
  checkBtn2();
}

/*
  toggleMotive(el, val)
  Q9「参加動機」ピルをクリックしたとき。
  複数選択できるので、
  選ばれていたら外す、外れていたら選ぶ
  という「トグル」動作をするよ。
*/
function toggleMotive(el, val) {
  /* selected クラスをつけたり外したりする */
  el.classList.toggle('selected');

  if (el.classList.contains('selected')) {
    /* 選ばれた → 配列に追加 */
    S.motives.push(val);
  } else {
    /* 外れた → 配列から削除（filter で残すものだけ残す） */
    S.motives = S.motives.filter(m => m !== val);
  }
}


/* ========================================
   バリデーション（ボタンを押せるか確認）
   ========================================
   必須項目が全部そろったら「次へ」ボタンを
   押せるようにするよ。
*/

/*
  checkBtn1()
  スクリーン 1 の「次へ」ボタンの確認。
  Q1・Q2・Q3 が全部選ばれたら有効化。
*/
function checkBtn1() {
  const btn = document.getElementById('btn-1');
  if (!btn) return; /* ボタンが見つからないときは何もしない */

  /* S.moment・S.sat・S.diff が全部あれば disabled を外す */
  btn.disabled = !(S.moment && S.sat && S.diff);
}

/*
  checkBtn2()
  スクリーン 2 の「次へ」ボタンの確認。
  Q5（テキスト）・Q6（テキスト）・Q7（ラジオ）が
  全部入力されたら有効化。
*/
function checkBtn2() {
  const btn = document.getElementById('btn-2');
  if (!btn) return;

  /* テキスト入力欄の現在の値を取得（.trim() で前後の空白を消す） */
  const p  = document.getElementById('q-project')?.value.trim();
  const st = document.getElementById('q-step')?.value.trim();

  /* 3つ全部そろっていれば disabled を外す */
  btn.disabled = !(p && st && S.feeling);
}


/* ========================================
   送信処理
   ========================================
   「送信」ボタンを押したときの処理。
   1. State に最新の値を入れる
   2. 結果画面に移動する
   3. AI メッセージを作りはじめる（並行）
   4. サーバーにデータを送る
*/
async function submitSurvey() {
  /*
    テキスト入力欄の値を S に入れる。
    ボタンのクリックでは記録されていないものを
    ここで最新の状態に更新するよ。
  */
  S.project = document.getElementById('q-project').value.trim();
  S.step    = document.getElementById('q-step').value.trim();
  S.improve = document.getElementById('q-improve').value.trim();
  S.age     = document.getElementById('q-age').value;
  S.job     = document.getElementById('q-job').value;
  S.channel = document.getElementById('q-channel').value;
  S.times   = document.getElementById('q-times').value;

  /* 結果画面（スクリーン 4）に移動 */
  goTo(4);

  /* AI メッセージの生成をスタート（答えを待たずに並行して動く） */
  generateMessage();

  /* 送信するデータを作る（S のコピー + 送信日時） */
  const payload = {
    ...S,  /* S の全プロパティをコピー（スプレッド構文） */
    submittedAt: new Date().toISOString(), /* 例：2025-04-27T10:30:00.000Z */
  };

  /*
    try { ... } catch (e) { ... }
    うまくいったら try の中、
    失敗したら catch の中が動くよ。
  */
  try {
    /* fetch() でサーバーにデータを送る */
    const res = await fetch(SERVER_URL, {
      method:  'POST',                           /* データを送る方法 */
      headers: { 'Content-Type': 'application/json' }, /* JSON 形式で送る */
      body:    JSON.stringify(payload),          /* データを JSON 文字列に変換 */
    });

    /* サーバーからの返事を読む */
    const json = await res.json();

    /* 返事が ok 以外ならエラーにする */
    if (json.result !== 'ok') throw new Error('server error');

    /* 成功したら緑のメッセージを表示 */
    document.getElementById('submission-note').textContent =
      '✅ 回答が記録されました。ご協力ありがとうございました！';

  } catch (e) {
    /* 失敗したときの処理 */
    console.warn('[送信エラー]', e); /* 開発者向けのログ */

    /* 赤のエラーメッセージに切りかえる */
    const note = document.getElementById('submission-note');
    note.className   = 'submission-note error'; /* CSS クラスを変える */
    note.textContent = '⚠️ サーバーへの送信に失敗しました。ローカル保存のみ行われています。';

    /*
      フォールバック：サーバーに送れなかったとき
      ブラウザの localStorage（ブラウザ内の保存場所）に記録しておくよ。
      後で手動でコピーできるようにするためだよ。
    */
    const all = JSON.parse(localStorage.getItem('mpl_survey_fallback') || '[]');
    all.push(payload);
    localStorage.setItem('mpl_survey_fallback', JSON.stringify(all));
  }
}


/* ========================================
   AI メッセージ生成
   ========================================
   Claude API（AI のサービス）にお願いして、
   その参加者専用のメッセージを作ってもらうよ。
   async function → 時間がかかる処理を待てる関数
*/
async function generateMessage() {
  /* 満足度を絵文字に変換（配列のインデックスとして使う） */
  const satLabel = ['', '😞', '😕', '😐', '😊', '🤩'][S.sat] || '';

  /*
    AI に渡すプロンプト（お願いの文章）。
    参加者の回答をもとに、
    背中を押すメッセージを作ってもらうよ。
    テンプレートリテラル（`...`）で
    S の値を埋め込んでいるよ。
  */
  const prompt = `あなたはMicro Project Lab（MPL）のファシリテーターです。
以下のアンケート回答をした参加者に向けて、「次の一歩に踏み出す勇気」が出るような温かいメッセージを書いてください。

【参加者の回答】
- 一番心が動いた瞬間：${S.moment}
- 満足度：${satLabel}（5段階中${S.sat}）
- ワーク難易度の感想：${S.diff}
- プロジェクト名：${S.project}
- 今週やること：${S.step}
- 今の気持ち：${S.feeling}

【メッセージの条件】
- 200〜250文字程度
- プロジェクト名や「今週やること」を具体的に盛り込む
- MPLの精神「まずは始める、小さく始める」を体現したトーンで
- ため口に近い親しみやすい文体（敬語なし）
- 背中を押す一言で締める`;

  try {
    /* Anthropic API にリクエストを送る */
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514', /* 使う AI のモデル名 */
        max_tokens: 600,                         /* 最大何文字まで返してもらうか */
        messages: [
          { role: 'user', content: prompt } /* AI へのメッセージ */
        ],
      }),
    });

    const data = await res.json();

    /*
      data.content[0].text に AI の返事が入っているよ。
      もし空なら fallbackMessage()（予備のメッセージ）を使う。
      ?. は「null や undefined でもエラーにしない」という安全な書き方。
    */
    aiText = data.content?.[0]?.text || fallbackMessage();

  } catch {
    /* AI に接続できないときは予備のメッセージを使う */
    aiText = fallbackMessage();
  }

  /* 画面の #ai-message-card にメッセージを表示する */
  document.getElementById('ai-message-card').innerHTML =
    `<div class="ai-message-text">${aiText}</div>`;
}

/*
  fallbackMessage()
  AI に接続できないときの予備のメッセージを返すよ。
  プロジェクト名と今週やることを埋め込んでいるよ。
*/
function fallbackMessage() {
  return `「${S.project}」、いい名前だね。\n\n「${S.step}」という最初の一歩、今週中に踏み出してみて。完璧じゃなくていい。ちょっとやってみることが全て。\n\nまずは始める、小さく始める。それがMPLのスタイル。いってらっしゃい！`;
}


/* ========================================
   コピー・シェア機能
   ========================================
*/

/*
  copyMessage()
  AI メッセージをクリップボードにコピーするよ。
  navigator.clipboard.writeText() はブラウザの
  コピー機能を使う関数だよ。
*/
function copyMessage() {
  if (!aiText) return; /* メッセージがまだなければ何もしない */
  navigator.clipboard.writeText(aiText)
    .then(() => alert('コピーしました！'));
}

/*
  shareMessage()
  スマホでシェア（共有）するよ。
  navigator.share() が使えるスマホブラウザなら
  シェアメニューが開くよ。
  使えないパソコン等ではコピーに切りかえる。
*/
function shareMessage() {
  if (navigator.share) {
    navigator.share({ text: aiText });
  } else {
    copyMessage(); /* シェアできないときはコピー */
  }
}
