# Supabase版セットアップ

1. `schema.sql` を Supabase SQL Editor で実行します。
2. `turn-worker/index.ts` を Edge functionのURLと同じ名前でデプロイします。
3. `turn.js`の`edgeURL`定数を自身が展開するEdge functionの名前で置き換え、プッシュします。
5. `main.html` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` だけを実プロジェクト値に変更します。

ターン間隔は `turn.js` の `TURN_INTERVAL_MS` で変更できます。初期値は120分です。ターンのカウントダウンと進行判定は `schema.sql` の `hakoniwa_server_timestamp()` で取得したSupabaseサーバー時刻に同期します。
