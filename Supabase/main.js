import { assertCoreReady, createHakoniwaSupabaseClient } from './client.js';
import { createStateStore } from './state.js';
import { createTurnScheduler, TURN_INTERVAL_MS } from './turn.js';

function $(id) {
  return document.getElementById(id);
}

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function startSupabaseHakoniwa(config) {
  const core = assertCoreReady();
  let supabase;
  try {
    supabase = createHakoniwaSupabaseClient(config);
  } catch (error) {
    core.logAction(error.message);
    $('supabaseAuthStatus').textContent = error.message;
    return;
  }

  const store = createStateStore(supabase, core);
  window.HakoniwaSupabase = store;

  const scheduler = createTurnScheduler({
    supabase,
    store,
    core,
    onTick: (remaining, interval) => {
      $('supabaseTurnCountdown').textContent = formatMs(remaining);
      $('supabaseTurnIntervalLabel').textContent = `${Math.round(interval / 60000)}分`;
    },
    onTurnComplete: async () => {
      await refreshIslandLists();
      const session = store.getSession();
      if (session) await store.login({ serial: session.serial, password: session.password });
    }
  });

  async function refreshIslandLists() {
    const islands = await store.listIslands();
    for (const select of [$('supabaseTouristIslandSelect'), $('supabaseOtherIslandSelect')]) {
      if (!select) continue;
      const current = select.value;
      select.innerHTML = '<option value="">登録済みの島を選択</option>';
      islands.forEach((island) => {
        const option = document.createElement('option');
        option.value = island.serial;
        option.textContent = `No.${island.serial} ${island.islandName}（人口:${island.population} / T${island.turn}）`;
        select.appendChild(option);
      });
      select.value = current;
    }
  }

  function setStatus(message) {
    $('supabaseAuthStatus').textContent = message;
    core.logAction(message);
  }

  $('supabaseRegisterBtn').addEventListener('click', async () => {
    try {
      const serial = await store.register({
        islandName: $('islandNameInput').value.trim() || 'MyIsland',
        password: $('supabasePasswordInput').value
      });
      $('supabaseSerialInput').value = serial;
      setStatus(`登録完了: 通し番号 No.${serial} が発行されました。`);
      await refreshIslandLists();
    } catch (error) {
      setStatus(`登録失敗: ${error.message}`);
    }
  });

  $('supabaseLoginBtn').addEventListener('click', async () => {
    try {
      const island = await store.login({
        serial: $('supabaseSerialInput').value,
        password: $('supabasePasswordInput').value
      });
      setStatus(`ログイン中: No.${island.serial} ${island.islandName}`);
      await refreshIslandLists();
    } catch (error) {
      setStatus(`ログイン失敗: ${error.message}`);
    }
  });

  $('supabaseSaveBtn').addEventListener('click', async () => {
    try {
      await store.saveCurrent({ markAction: true });
      setStatus('サーバーへ保存しました。');
      await refreshIslandLists();
    } catch (error) {
      setStatus(`保存失敗: ${error.message}`);
    }
  });

  $('supabaseLogoutBtn').addEventListener('click', () => {
    store.logout();
    setStatus('ログアウトしました（観光者モード可）。');
  });

  $('supabaseVisitBtn').addEventListener('click', async () => {
    try {
      const serial = $('supabaseTouristIslandSelect').value;
      if (!serial) throw new Error('観光する島を選択してください。');
      const island = await store.loadTourist(serial);
      setStatus(`観光者モード: No.${island.serial} ${island.islandName}`);
    } catch (error) {
      setStatus(`観光失敗: ${error.message}`);
    }
  });

  $('supabaseReturnBtn').addEventListener('click', () => {
    store.returnHome();
    setStatus('自島に戻りました。');
  });

  $('supabaseOtherIslandSelect').addEventListener('change', async (event) => {
    if (!event.target.value) return;
    try {
      await store.loadTourist(event.target.value);
      setStatus('行き先の島を観光者モードで表示しました。砲撃系計画のみ登録できます。');
    } catch (error) {
      setStatus(`行き先表示失敗: ${error.message}`);
    }
  });

  const originalConfirmAction = window.confirmAction;
  window.confirmAction = function supabaseConfirmAction() {
    if ($('actionSelect').value === 'goToOtherIsland') {
      const serial = $('supabaseOtherIslandSelect').value || $('supabaseTouristIslandSelect').value;
      if (!serial) {
        setStatus('行き先の島をプルダウンから選択してください。');
        return;
      }
      store.loadTourist(serial)
        .then((island) => setStatus(`観光者モード: No.${island.serial} ${island.islandName}`))
        .catch((error) => setStatus(`行き先表示失敗: ${error.message}`));
      $('actionSelect').value = '';
      window.updateConfirmButton();
      return;
    }
    originalConfirmAction();
  };

  const originalUpdateConfirmButton = window.updateConfirmButton;
  window.updateConfirmButton = function supabaseUpdateConfirmButton() {
    originalUpdateConfirmButton();
    const action = $('actionSelect').value;
    const shouldShow = action === 'goToOtherIsland';
    $('supabaseOtherIslandSelect').style.display = shouldShow ? 'inline-block' : 'none';
    if (shouldShow) $('touristCodeInput').style.display = 'none';
  };

  scheduler.start();
  refreshIslandLists().catch((error) => setStatus(`島一覧取得失敗: ${error.message}`));
  $('supabaseTurnIntervalLabel').textContent = `${Math.round(TURN_INTERVAL_MS / 60000)}分`;
}
