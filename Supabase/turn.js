export const TURN_INTERVAL_MS = 120 * 60 * 1000;
const edgeURL = 'dynamic-handler';

export function createTurnScheduler({ supabase, core, onTick, onTurnComplete }) {
  let timerId = null;
  let running = false;
  let serverOffsetMs = 0;
  let lastServerSyncAt = 0;
  let lastProcessedSlot = null;
  let warnedServerTimeFallback = false;
  const SERVER_SYNC_INTERVAL_MS = 60 * 1000;

  function serverNow() {
    return Date.now() + serverOffsetMs;
  }

  function currentSlot() {
    return Math.floor(serverNow() / TURN_INTERVAL_MS);
  }

  function remainingMs() {
    const nextTurnAt = (currentSlot() + 1) * TURN_INTERVAL_MS;
    return Math.max(0, nextTurnAt - serverNow());
  }

  async function syncServerTime() {
    try {
      const { data, error } = await supabase.rpc('hakoniwa_server_timestamp');
      if (error) throw error;
      const serverMs = Number(data);
      if (!Number.isFinite(serverMs)) throw new Error('invalid server timestamp');
      serverOffsetMs = serverMs - Date.now();
      lastServerSyncAt = Date.now();
    } catch (error) {
      lastServerSyncAt = Date.now();
      if (!warnedServerTimeFallback) {
        warnedServerTimeFallback = true;
        core.logAction(`サーバー時刻の取得に失敗したため端末時刻で表示します: ${error.message || error}`);
      }
    }
  }

  async function ensureServerTimeFresh() {
    if (Date.now() - lastServerSyncAt < SERVER_SYNC_INTERVAL_MS) return;
    await syncServerTime();
  }

  async function runServerTurn(slot = currentSlot()) {
    if (running || lastProcessedSlot === slot) return;
    running = true;
    lastProcessedSlot = slot;
    try {
      const { error } = await supabase.functions.invoke(edgeURL, {
        body: { inactiveTurnLimit: 50 }
      });
      if (error) throw error;
    } catch (error) {
      core.logAction(`サーバーターン関数を呼び出せませんでした: ${error.message || error}`);
    } finally {
      running = false;
      await syncServerTime();
      if (typeof onTurnComplete === 'function') await onTurnComplete();
    }
  }

  function start() {
    stop();
    syncServerTime().finally(() => {
      lastProcessedSlot = currentSlot();
      if (typeof onTick === 'function') onTick(remainingMs(), TURN_INTERVAL_MS);
    });
    timerId = window.setInterval(async () => {
      await ensureServerTimeFresh();
      const remaining = remainingMs();
      if (typeof onTick === 'function') onTick(remaining, TURN_INTERVAL_MS);
      const slot = currentSlot();
      if (slot !== lastProcessedSlot) {
        await runServerTurn(slot);
      }
    }, 1000);
    if (typeof onTick === 'function') onTick(remainingMs(), TURN_INTERVAL_MS);
  }

  function stop() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  return { start, stop, runServerTurn, remainingMs, intervalMs: TURN_INTERVAL_MS };
}
