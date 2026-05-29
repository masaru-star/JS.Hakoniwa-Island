export const INACTIVE_TURN_LIMIT = 50;

export function createStateStore(supabase, core) {
  let session = null;
  let currentState = null;
  let viewingIsland = null;
  let dirty = false;

  function normalizeIsland(row) {
    return {
      serial: Number(row.serial),
      islandName: row.island_name,
      population: Number(row.population ?? row.state?.population ?? 0),
      turn: Number(row.turn ?? row.state?.turn ?? 0),
      state: row.state
    };
  }

  async function register({ islandName, password }) {
    core.resetGame();
    const state = core.getState();
    state.islandName = islandName || state.islandName;
    const { data, error } = await supabase.rpc('hakoniwa_register', {
      p_island_name: state.islandName,
      p_password: password,
      p_state: state
    });
    if (error) throw error;
    const serial = Number(data);
    session = { serial, password };
    currentState = state;
    core.setOwnIsland(currentState);
    return serial;
  }

  async function login({ serial, password }) {
    const { data, error } = await supabase.rpc('hakoniwa_login', {
      p_serial: Number(serial),
      p_password: password
    });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('通し番号またはパスワードが正しくありません。');
    const island = normalizeIsland(data[0]);
    session = { serial: island.serial, password };
    currentState = island.state;
    core.setOwnIsland(currentState);
    return island;
  }

  async function saveCurrent({ markAction = false } = {}) {
    if (!session) throw new Error('保存にはログインが必要です。');
    currentState = core.getState();
    const { error } = await supabase.rpc('hakoniwa_save', {
      p_serial: session.serial,
      p_password: session.password,
      p_state: currentState,
      p_mark_action: markAction
    });
    if (error) throw error;
    dirty = false;
    return currentState;
  }

  async function listIslands() {
    const { data, error } = await supabase
      .from('hakoniwa_public_islands')
      .select('serial,island_name,population,turn,state')
      .order('serial', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeIsland);
  }

  async function loadTourist(serial) {
    const { data, error } = await supabase
      .from('hakoniwa_public_islands')
      .select('serial,island_name,population,turn,state')
      .eq('serial', Number(serial))
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('指定された島が見つかりません。');
    viewingIsland = normalizeIsland(data);
    core.setViewingOtherIsland(viewingIsland.state);
    return viewingIsland;
  }

  function returnHome() {
    if (!currentState && session) currentState = core.getState();
    if (!currentState) {
      viewingIsland = null;
      return false;
    }
    core.setOwnIsland(currentState);
    viewingIsland = null;
    return true;
  }

  function queueRemoteBombard({ action, count, x, y }) {
    if (!session) {
      core.logAction('他島への砲撃計画を登録するにはログインが必要です。');
      return false;
    }
    if (!viewingIsland) {
      core.logAction('砲撃先の島が選択されていません。');
      return false;
    }
    const targetIsland = viewingIsland;
    returnHome();
    const state = core.getState();
    state.actionQueue = state.actionQueue || [];
    state.actionQueue.push({
      action,
      count,
      x,
      y,
      targetSerial: targetIsland.serial,
      targetIslandName: targetIsland.islandName,
      remoteBombard: true
    });
    core.setOwnIsland(state);
    saveCurrent({ markAction: true })
      .then(() => core.logAction(`${targetIsland.islandName} への${action}を計画キューに保存しました。ターン進行時に同時処理されます。`))
      .catch((error) => core.logAction(`他島への砲撃計画の保存に失敗しました: ${error.message || error}`));
    return true;
  }

  function onLocalStateChanged(state) {
    currentState = state;
    dirty = true;
  }

  function loadCurrentIslandIntoCore() {
    if (currentState) core.setOwnIsland(currentState);
  }

  function logout() {
    session = null;
    currentState = null;
    viewingIsland = null;
    dirty = false;
  }

  return {
    register,
    login,
    logout,
    saveCurrent,
    listIslands,
    loadTourist,
    returnHome,
    queueRemoteBombard,
    onLocalStateChanged,
    loadCurrentIslandIntoCore,
    getSession: () => session,
    getCurrentState: () => currentState,
    isDirty: () => dirty
  };
}
