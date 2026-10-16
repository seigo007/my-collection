// Ver3.0版
'use strict';

// Day 1-C：見本を参考に、数字表示を星表示へ変えます。
function formatRating(rating) {
  return rating + ' / 5';
}

// Day 1-C：おすすめ度が4以上なら「イチオシ」、それ以外は空文字を返そう。
// TODO D1-C: if文でラベルを返す
function getRecommendationLabel(rating) {
  return '';
}

// Day 3-C：チェック時に使うSQL条件を、自分で書きます。
// TODO D3-C: イチオシのSQL条件
function getRecommendationCondition() {
  return '1 = 1';
}

// Day 3-D：rowsには、今画面に表示する行だけが入ります。
function updateFilterSummary(rows) {
  // TODO D3-D: forとifで件数を数えて表示する
}

// ここから下は、画面とSQLiteをつなぐ共通部品です。
// 発展：renderCards → 編集ボタン → item-form の順に処理を追ってみよう。
(() => {
  const $ = id => document.getElementById(id);
  let store, editingId = null, practiceDb = null, toastTimer;

  function notify(message) {
    const box = $('toast');
    box.textContent = message; box.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 5500);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // 入力をHTMLとして実行しない
    return node;
  }

  function download(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function updateRating() { $('rating-output').textContent = '★'.repeat(Number($('item-rating').value)) + '☆'.repeat(5 - Number($('item-rating').value)); }

  async function save() {
    try {
      await store.persist();
      $('save-status').textContent = '✓ このブラウザに保存しました。授業の終わりは「SQLiteを保存」でバックアップ。';
      $('save-status').className = 'save-status';
    } catch (error) {
      $('save-status').textContent = '⚠ ブラウザへの保存ができません。「SQLiteを保存」で持ち帰ってください。画面を閉じると変更を失う場合があります。';
      $('save-status').className = 'save-status warning';
    }
  }

  function updateCategories() {
    const selected = $('category-filter').value;
    const categories = store.categories();
    $('category-filter').replaceChildren(new Option('すべての分類', ''));
    $('category-suggestions').replaceChildren();
    for (const category of categories) {
      $('category-filter').add(new Option(category, category));
      $('category-suggestions').append(new Option(category, category));
    }
    if (categories.includes(selected)) $('category-filter').value = selected;
    $('total-count').textContent = store.all().length;
    $('category-count').textContent = categories.length;
  }

  function renderCards() {
    // Day 3のHTMLがまだなくても、通常の一覧を表示できます。
    const checkbox = $('recommendation-filter');
    const recommendedOnly = checkbox ? checkbox.checked : false;
    const rows = store.search($('search').value.trim(), $('category-filter').value, $('sort-order').value, recommendedOnly);
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const card = element('article', 'collection-card'); card.dataset.id = row.id;
      const cover = element('img', 'card-cover'); cover.src = 'assets/' + row.cover + '.svg'; cover.alt = ''; cover.loading = 'lazy';
      const body = element('div', 'card-body');
      const topline = element('div', 'card-topline');
      topline.append(element('span', 'category-badge', row.category), element('span', 'card-id', '#' + String(row.id).padStart(2, '0')));
      const title = element('h3', 'card-title', row.title);
      const rating = element('p', 'card-rating', formatRating(row.rating)); rating.setAttribute('aria-label', 'おすすめ度 ' + row.rating + ' / 5');
      const note = element('p', 'card-note', row.note || 'メモを追加して、好きなところを紹介しよう。');
      const actions = element('div', 'card-actions');
      const edit = element('button', '', '編集'); edit.type = 'button'; edit.setAttribute('aria-label', row.title + 'を編集'); edit.addEventListener('click', () => editItem(row.id));
      const remove = element('button', '', '削除'); remove.type = 'button'; remove.setAttribute('aria-label', row.title + 'を削除'); remove.addEventListener('click', () => deleteItem(row.id));
      actions.append(edit, remove);
      body.append(topline, title, rating);
      const recommendation = getRecommendationLabel(row.rating);
      if (recommendation) body.append(element('span', 'recommendation-badge', recommendation));
      body.append(note, actions); card.append(cover, body); fragment.append(card);
    }
    $('collection-grid').replaceChildren(fragment); $('empty-state').hidden = rows.length !== 0;
    $('result-count').textContent = rows.length + '件を表示';
    updateFilterSummary(rows);
  }
  function refresh() { updateCategories(); renderCards(); }

  function clearForm() {
    editingId = null; $('item-form').reset(); updateRating(); $('form-error').textContent = '';
    $('form-title').textContent = 'コレクションに追加'; $('submit-item').textContent = '登録する'; $('cancel-edit').hidden = true;
  }
  function editItem(id) {
    const item = store.get(id); if (!item) return;
    editingId = id;
    for (const name of ['title','category','rating','note','cover']) $('item-' + name).value = item[name];
    updateRating(); $('form-title').textContent = 'コレクションを編集'; $('submit-item').textContent = '変更を保存'; $('cancel-edit').hidden = false; $('form-error').textContent = '';
    $('item-title').focus();
  }
  async function deleteItem(id) {
    const item = store.get(id); if (!item) return;
    if (!confirm('「' + item.title + '」を削除しますか？元に戻せません。')) return;
    store.remove(id); if (editingId === id) clearForm(); refresh(); await save(); notify('コレクションを削除しました。');
  }

  $('item-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!store) return;
    const value = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const wasEditing = editingId !== null;
      if (wasEditing) store.update(editingId, value); else store.add(value);
      clearForm(); $('search').value = ''; $('category-filter').value = ''; refresh(); await save();
      notify(wasEditing ? '変更を保存しました。' : '好きなものを登録しました。');
    } catch (error) { $('form-error').textContent = error.message; }
  });
  $('cancel-edit').addEventListener('click', clearForm);
  $('item-rating').addEventListener('input', updateRating);
  $('search').addEventListener('input', () => { if (store) renderCards(); });
  $('category-filter').addEventListener('change', () => { if (store) renderCards(); });
  $('sort-order').addEventListener('change', () => { if (store) renderCards(); });
  /* TODO D1-D: 制作メモのボタン */

  /* TODO D3-B: チェック変更時に再描画 */

  $('clear-filters').addEventListener('click', () => {
    $('search').value = ''; $('category-filter').value = '';
    const checkbox = $('recommendation-filter');
    if (checkbox) checkbox.checked = false;
    renderCards();
  });

  $('export-db').addEventListener('click', () => {
    download(store.export(), 'my-collection.db', 'application/vnd.sqlite3');
    notify('SQLiteファイルをダウンロードしました。ソースフォルダと一緒に保管しよう。');
  });
  $('import-db').addEventListener('click', () => $('db-file').click());
  $('db-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    event.target.value = '';
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('読み込めるファイルは10MBまでです。');
      const candidate = CollectionDB.validatedImport(await file.arrayBuffer());
      if (!confirm('現在のコレクションを「' + file.name + '」の内容に置き換えます。必要なら先にSQLiteを保存してください。置き換えますか？')) { candidate.close(); return; }
      store.replace(candidate); clearForm(); $('search').value = ''; $('category-filter').value = ''; refresh(); await save(); notify('SQLiteを読み込みました。');
    } catch (error) { alert(error.message); }
  });
  $('export-public').addEventListener('click', () => {
    const publicItems = store.all().map(({ title, category, rating, note, cover }) => ({ title, category, rating, note, cover }));
    const data = JSON.stringify(publicItems, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    download('// 公開用データ：自分の data/collection-data.js と置き換えます。\nwindow.COLLECTION_DATA = ' + data + ';\n', 'collection-data.js', 'text/javascript;charset=utf-8');
    notify('collection-data.jsを書き出しました。自分のdataフォルダ内の同名ファイルと置き換えます。');
  });
  $('reset-data').addEventListener('click', async () => {
    if (!confirm('今の変更を消し、data/collection-data.js の内容に戻します。必要なら先に「SQLiteを保存」をしてください。戻しますか？')) return;
    try {
      store.replace(CollectionDB.createDatabase(window.COLLECTION_DATA)); clearForm(); $('search').value = ''; $('category-filter').value = ''; refresh(); await save(); notify('配布データに戻しました。');
    } catch (error) { alert(error.message); }
  });

  // SQL実験室は固定6件の別DBです。本体の登録内容に影響されません。
  function resetPractice() {
    if (practiceDb) practiceDb.close(); practiceDb = CollectionDB.createPracticeDatabase();
    $('sql-results').replaceChildren(); $('sql-message').className = 'sql-message';
    $('sql-message').textContent = '練習用DBを、最初の固定6件に戻しました。';
  }
  $('open-lab').addEventListener('click', () => { if (!practiceDb) resetPractice(); $('sql-dialog').showModal(); });
  $('close-lab').addEventListener('click', () => $('sql-dialog').close());
  $('reset-lab').addEventListener('click', () => { if (confirm('練習中の変更を消し、最初の固定6件に戻しますか？')) resetPractice(); });
  function runSql() {
    const sql = $('sql-editor').value.trim();
    if (!sql) { $('sql-message').textContent = 'SQLを入力してください。'; return; }
    $('sql-results').replaceChildren(); $('sql-message').className = 'sql-message';
    try {
      const results = practiceDb.exec(sql);
      let count = 0;
      for (const result of results) {
        const wrap = element('div', 'result-table-wrap'); const table = document.createElement('table');
        const head = document.createElement('thead'); const header = document.createElement('tr');
        for (const column of result.columns) header.append(element('th', '', column));
        head.append(header); const body = document.createElement('tbody');
        for (const values of result.values.slice(0, 200)) {
          const row = document.createElement('tr');
          for (const value of values) row.append(element('td', '', value === null ? 'NULL' : String(value)));
          body.append(row);
        }
        table.append(head, body); wrap.append(table); $('sql-results').append(wrap);
        $('sql-results').append(element('p', 'result-caption', result.values.length + '件の結果' + (result.values.length > 200 ? '（先頭200件を表示）' : ''))); count += result.values.length;
      }
      $('sql-message').textContent = results.length ? '実行しました。結果は合計' + count + '件です。本体のデータには反映されません。' : '実行しました。表示する結果は0件です。SELECTなら条件に合う行がありません。INSERT・UPDATE・DELETEの場合は、SELECTで変更後を確かめよう。';
    } catch (error) {
      $('sql-message').className = 'sql-message error';
      $('sql-message').textContent = 'SQLエラー：' + error.message + '　半角記号・列名・引用符を確認しよう。';
    }
  }
  $('run-sql').addEventListener('click', runSql);
  $('sql-editor').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runSql(); } });
  $('load-sql').addEventListener('click', () => $('sql-file').click());
  $('sql-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return; event.target.value = '';
    if (file.size > 100000) { alert('SQLファイルは100KBまでです。'); return; }
    $('sql-editor').value = await file.text(); $('sql-message').className = 'sql-message';
    $('sql-message').textContent = file.name + 'を読み込みました。内容を確認してから「SQLを実行」を押そう。';
  });

  async function start() {
    try {
      if (typeof initSqlJs !== 'function') throw new Error('共通部品 assets/vendor/sql-asm.js が見つかりません。my-collectionフォルダ全体を展開してください。');
      const result = await CollectionDB.open(window.COLLECTION_DATA); store = result.store;
      refresh(); $('form-fields').disabled = false;
      for (const id of ['open-lab','export-db','import-db','export-public','reset-data']) $(id).disabled = false;
      $('startup-message').hidden = !result.warning;
      if (result.warning) $('startup-message').textContent = result.warning;
      $('save-status').textContent = (result.restored ? '✓ 前回このブラウザに保存したデータを復元しました。' : '✓ 配布データを読み込みました。') + ' 授業の終わりには「SQLiteを保存」。';
    } catch (error) {
      $('startup-message').textContent = '起動できませんでした。' + error.message;
      $('startup-message').className = 'notice error';
    }
  }
  start();
})();
