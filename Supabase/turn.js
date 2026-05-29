export const TURN_INTERVAL_MS = 5 * 60 * 1000;

export function createTurnScheduler({ supabase, store, core, onTick, onTurnComplete }) {
  let timerId = null;
  let nextTurnAt = Date.now() + TURN_INTERVAL_MS;
  let running = false;

  function remainingMs() {
    return Math.max(0, nextTurnAt - Date.now());
  }

  async function runServerTurn() {
    if (running) return;
    running = true;
    try {
      const { error } = await supabase.functions.invoke('hakoniwa-turn-worker', {
        body: { inactiveTurnLimit: 50 }
      });
      if (error) throw error;
    } catch (error) {
      // Edge Function 未デプロイ時でも開発確認できるよう、ログイン中の島だけクライアント側で進行する。
      if (store.getSession()) {
        core.logAction(`サーバーターン関数を呼び出せなかったため、この島のみフォールバック進行します: ${error.message || error}`);
        core.nextTurn();
        await store.saveCurrent({ markAction: false });
      } else {
        core.logAction(`サーバーターン関数を呼び出せませんでした: ${error.message || error}`);
      }
    } finally {
      nextTurnAt = Date.now() + TURN_INTERVAL_MS;
      running = false;
      if (typeof onTurnComplete === 'function') await onTurnComplete();
    }
  }

  function start() {
    stop();
    timerId = window.setInterval(async () => {
      if (typeof onTick === 'function') onTick(remainingMs(), TURN_INTERVAL_MS);
      if (remainingMs() <= 0) await runServerTurn();
    }, 1000);
    if (typeof onTick === 'function') onTick(remainingMs(), TURN_INTERVAL_MS);
  }

  function stop() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  return { start, stop, runServerTurn, remainingMs, intervalMs: TURN_INTERVAL_MS };
}
