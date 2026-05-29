# Supabase版セットアップ

1. `schema.sql` を Supabase SQL Editor で実行します。
2. `turn-worker/index.ts` を `hakoniwa-turn-worker` としてデプロイします。
3. Edge Function に `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を設定します。
4. `main.html` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` だけを実プロジェクト値に変更します。

ターン間隔は `turn.js` の `TURN_INTERVAL_MS` で変更できます。初期値は5分です。
