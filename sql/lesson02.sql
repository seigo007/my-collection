-- Ver3.0版
-- Day 2：TAと一緒に実行する見本
-- 場所：アプリの「SQL実験室」。固定の6件を使います。
-- 1文ずつエディタに残して実行すると、違いを比べやすくなります。

-- 見本1：idとtitleの列を取り出す
SELECT id, title FROM items;

-- 見本2：おすすめ度が5のものを取り出す
SELECT id, title, rating FROM items WHERE rating = 5;

-- 読み方
-- SELECT 取り出す列 FROM テーブル名 WHERE 条件;
-- id / title / category / rating / note / cover がitemsの列です。
-- 数値はそのまま、文字は半角のシングルクォート ' ' で囲みます。
-- この後はexercises.sqlへ、自分で問題のSQLを書きます。
