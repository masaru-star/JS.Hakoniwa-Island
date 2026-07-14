// Deploy: supabase functions deploy hakoniwa-turn-worker
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: { env: { get(key: string): string | undefined } };

const SIZE = 16;
const ACTIONS_PER_TURN = 2;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // 追加
};

type IslandRow = { serial: number; island_name: string; state: any; last_action_turn: number };

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function log(state: any, message: string) {
  state.turnLog = Array.isArray(state.turnLog) ? state.turnLog : [];
  state.turnLog.unshift(`[ターン${n(state.turn)}] ${message}`);
  state.turnLog = state.turnLog.slice(0, 200);
}

function tileAt(state: any, x: number, y: number) {
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? state.map?.[y]?.[x] : null;
}

function warships(state: any) {
  state.warships = Array.isArray(state.warships) ? state.warships : [];
  return state.warships;
}

function getGunCount(state: any) {
  return (state.map || []).flat().reduce((sum: number, tile: any) => {
    if (tile?.facility !== 'gun') return sum;
    return sum + (tile.enhanced ? 3 : 1);
  }, 0);
}

function getProtectingDefenseFacility(state: any, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tile = tileAt(state, x + dx, y + dy);
      if (tile?.facility === 'defenseFacility') return tile;
    }
  }
  return null;
}

function removePopulationForTile(state: any, tile: any) {
  if (tile?.facility === 'house') state.population = Math.max(0, n(state.population) - n(tile.pop));
}

function overwriteWithFacility(state: any, tile: any, facility: string) {
  removePopulationForTile(state, tile);
  tile.facility = facility;
  tile.pop = 0;
  tile.enhanced = false;
}

function applyBombard(state: any, action: any, source = '砲撃') {
  const type = action.action || action.type;
  const count = n(action.count, 1);
  const errorRange = type === 'spreadBombard' ? 2 : (type === 'ppBombard' || type === 'randomBombard' ? 0 : 1);
  const costPerShot = { bombard: 120, spreadBombard: 500, ppBombard: 10000000, randomBombard: 500000 }[type as string] || 0;
  const maxShots = action.remoteBombard ? count : Math.min(count, getGunCount(state), Math.floor(n(state.money) / costPerShot));
  let chargedShots = 0;
  for (let i = 0; i < maxShots; i++) {
    const tx = type === 'randomBombard' ? Math.floor(Math.random() * SIZE) : n(action.x) + (errorRange ? Math.floor(Math.random() * (2 * errorRange + 1)) - errorRange : 0);
    const ty = type === 'randomBombard' ? Math.floor(Math.random() * SIZE) : n(action.y) + (errorRange ? Math.floor(Math.random() * (2 * errorRange + 1)) - errorRange : 0);
    const target = tileAt(state, tx, ty);
    if (!target) continue;
    const defense = getProtectingDefenseFacility(state, tx, ty);
    if (defense && type !== 'ppBombard' && type !== 'randomBombard') continue;
    if (defense) {
      defense.terrain = 'waste';
      defense.facility = null;
      defense.enhanced = false;
    }
    const ship = warships(state).find((s: any) => n(s.x) === tx && n(s.y) === ty && !s.isDispatched);
    if (target.terrain === 'mountain') continue;
    if (ship && target.terrain === 'sea') {
      ship.currentDurability = n(ship.currentDurability) - 1;
      if (ship.currentDurability <= 0) state.warships = warships(state).filter((s: any) => s !== ship);
    } else if (target.terrain === 'sea') {
      if (target.facility === 'port') target.facility = null;
    } else {
      removePopulationForTile(state, target);
      target.terrain = 'waste';
      target.facility = null;
      target.pop = 0;
      target.enhanced = false;
    }
    chargedShots++;
  }
  if (!action.remoteBombard && costPerShot) state.money = n(state.money) - (type === 'randomBombard' ? maxShots : chargedShots) * costPerShot;
  log(state, `${source}を${maxShots}発処理しました。`);
}

function applyRemoteWarship(state: any, event: any) {
  if (event.action === 'dispatchWarship' || event.type === 'warshipDispatch') {
    const ship = structuredClone(event.warshipData || event.ship || {});
    const seas: any[] = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const tile = tileAt(state, x, y);
      if (tile?.terrain === 'sea' && !tile.facility && !warships(state).some((s: any) => n(s.x) === x && n(s.y) === y)) seas.push({ x, y });
    }
    if (seas.length) {
      const pos = seas[Math.floor(Math.random() * seas.length)];
      Object.assign(ship, pos, { isDispatched: false });
      warships(state).push(ship);
      log(state, `${event.sourceIslandName || '他島'}から軍艦「${ship.name || '無銘艦'}」が派遣されました。`);
    }
  }
}

function runAction(state: any, task: any, outgoing: any[]) {
  const x = n(task.x), y = n(task.y);
  const tile = tileAt(state, x, y);
  const action = task.action;
  if (task.targetSerial && (action === 'bombard' || action === 'spreadBombard' || action === 'ppBombard' || action === 'randomBombard' || action === 'dispatchWarship')) {
    outgoing.push({ ...task, sourceIslandName: state.islandName });
    log(state, `${task.targetIslandName || '他島'}への${action}を送信しました。`);
    return;
  }
  if (action === 'delayAction' || action === 'goToOtherIsland' || action === 'returnToMyIsland' || action === 'showWarshipDetails') return;
  if (action === 'bombard' || action === 'spreadBombard' || action === 'ppBombard' || action === 'randomBombard' || action === 'concentratedFire') return applyBombard(state, { ...task, action: action === 'concentratedFire' ? 'bombard' : action }, action === 'concentratedFire' ? '集中砲撃' : '砲撃');
  if (!tile && !['exportFood'].includes(action)) return;
  if (action === 'buildFarm' && tile.terrain === 'plain' && n(state.money) >= 100) { overwriteWithFacility(state, tile, 'farm'); state.money -= 100; }
  else if (action === 'buildFactory' && tile.terrain === 'plain' && n(state.money) >= 100) { overwriteWithFacility(state, tile, 'factory'); state.money -= 100; }
  else if (action === 'enhanceFacility' && ['farm', 'factory', 'oilRig', 'gun'].includes(tile.facility) && !tile.enhanced && n(state.money) >= 10000) { tile.enhanced = true; state.money -= 10000; }
  else if (action === 'buildPort' && tile.terrain === 'sea' && !tile.facility && n(state.money) >= 3000) { tile.facility = 'port'; tile.enhanced = false; state.money -= 3000; }
  else if (action === 'buildGun' && tile.terrain === 'plain' && n(state.money) >= 1200) { overwriteWithFacility(state, tile, 'gun'); state.money -= 1200; }
  else if (action === 'buildDefenseFacility' && tile.terrain === 'plain' && n(state.money) >= 5000) { overwriteWithFacility(state, tile, 'defenseFacility'); state.money -= 5000; }
  else if (action === 'flatten' && tile.terrain !== 'mountain' && (tile.terrain === 'waste' || tile.facility) && n(state.money) >= 20) { removePopulationForTile(state, tile); Object.assign(tile, { terrain: 'plain', facility: null, pop: 0, enhanced: false }); state.money -= 20; }
  else if (action === 'landfill' && tile.terrain === 'sea' && n(state.money) >= 600 && !warships(state).some((s: any) => n(s.x) === x && n(s.y) === y)) { tile.terrain = 'waste'; tile.enhanced = false; state.money -= 600; }
  else if (action === 'dig' && tile.terrain !== 'mountain') { const cost = tile.terrain === 'sea' ? 300 * n(task.oilFactor, 1) ** 2 : 300; if (n(state.money) < cost) return log(state, `${action}は資金不足で失敗しました。`); state.money -= cost; if (tile.terrain === 'sea') { if (!tile.facility && Math.random() < 0.02 + (n(task.oilFactor, 1) - 1) * 0.05) tile.facility = 'oilRig'; } else { removePopulationForTile(state, tile); Object.assign(tile, { terrain: 'sea', facility: null, pop: 0, enhanced: false }); } }
  else if (action === 'cutForest' && tile.terrain === 'forest') { tile.terrain = 'plain'; tile.enhanced = false; state.money = n(state.money) + Math.floor(Math.random() * 421) + 80; }
  else if (action === 'plantForest' && tile.terrain === 'plain' && !tile.facility && n(state.money) >= 200) { tile.terrain = 'forest'; tile.enhanced = false; state.money -= 200; }
  else if (action === 'exportFood' && n(state.food) >= n(task.amount, 1) * 20) { state.food -= n(task.amount, 1) * 20; state.money = n(state.money) + n(task.amount, 1) * 200; }
  else if (action === 'selfDestructMilitaryFacility' && ['gun', 'defenseFacility'].includes(tile.facility)) { Object.assign(tile, { terrain: 'waste', facility: null, pop: 0, enhanced: false }); }
  else if (action === 'buildMonument' && tile.terrain === 'plain' && tile.facility !== 'Monument' && n(state.money) >= 500000000) { overwriteWithFacility(state, tile, 'Monument'); tile.MonumentLevel = 1; state.money -= 500000000; }
  else if (action === 'upgradeMonument' && tile.facility === 'Monument' && n(state.money) >= 500000000) { tile.MonumentLevel = n(tile.MonumentLevel, 1) + 1; state.money -= 500000000; }
  else if (action === 'sellMonument' && tile.facility === 'Monument') { state.money = n(state.money) + 500000000 * n(tile.MonumentLevel, 1); Object.assign(tile, { terrain: 'plain', facility: null, pop: 0, enhanced: false, MonumentLevel: 0 }); }
  else if (action === 'buildWarship' && tile.terrain === 'sea' && !warships(state).some((s: any) => n(s.x) === x && n(s.y) === y)) { const d = task.warshipData || {}; const cost = n(d.originalCost || d.cost); if (n(state.money) >= cost) { warships(state).push({ x, y, homePort: state.islandName, name: d.name || '無銘艦', exp: 0, currentFuel: 0, maxFuel: 100, maxDurability: n(d.durability), currentDurability: n(d.durability), mainGun: n(d.mainGun), torpedo: n(d.torpedo), antiAir: n(d.antiAir), maxAmmo: n(d.ammo), currentAmmo: 0, reconnaissance: n(d.recon), accuracyImprovement: n(d.accuracy), isDispatched: false, abnormality: null, nickname: '', medalsEarned: {} }); state.money -= cost; } }
  else {
    const ship = warships(state).find((s: any) => n(s.x) === x && n(s.y) === y);
    if (action === 'refuelWarship' && ship && !ship.isDispatched && n(state.food) >= n(task.amount) * 500) { const amount = Math.min(n(task.amount), n(ship.maxFuel) - n(ship.currentFuel)); ship.currentFuel = n(ship.currentFuel) + amount; state.food -= n(task.amount) * 500; }
    else if (action === 'resupplyWarshipAmmo' && ship && !ship.isDispatched && n(state.money) >= n(task.amount) * 20000) { const amount = Math.min(n(task.amount), n(ship.maxAmmo) - n(ship.currentAmmo)); ship.currentAmmo = n(ship.currentAmmo) + amount; state.money -= n(task.amount) * 20000; }
    else if (action === 'repairWarship' && ship && !ship.isDispatched && n(state.money) >= n(task.amount) * 100000) { const amount = Math.min(n(task.amount), n(ship.maxDurability) - n(ship.currentDurability)); ship.currentDurability = n(ship.currentDurability) + amount; state.money -= n(task.amount) * 100000; }
    else if (action === 'setWarshipNickname' && ship && ship.homePort === state.islandName && n(state.money) >= 100000) { ship.nickname = task.nickname || ''; state.money -= 100000; }
    else if (action === 'convertAchievementToExp' && ship && n(state.achievementPoints) >= n(task.amount)) { state.achievementPoints -= n(task.amount); ship.exp = n(ship.exp) + n(task.amount) * 100; }
    else if (action === 'remodelWarshipWeapon' && ship && n(ship.maxAmmo) >= 1000 && n(ship.exp) > 0) { ship.exp = 0; ship.maxAmmo -= 1000; if (task.weaponType === 'torpedo') ship.torpedo = n(ship.torpedo) + 1; else ship.mainGun = n(ship.mainGun) + 1; }
    else if (action === 'enhanceWarship' && ship && n(ship.exp) > 0) { ship.exp = 0; ship.maxDurability = n(ship.maxDurability) + 1; ship.currentDurability = n(ship.currentDurability) + 1; }
    else if (action === 'decommissionWarship' && ship && ship.homePort === state.islandName) state.warships = warships(state).filter((s: any) => s !== ship);
    else if (action === 'moveWarshipToDock' && ship) { state.dockedWarships = Array.isArray(state.dockedWarships) ? state.dockedWarships : []; state.dockedWarships.push({ ...ship, isDocked: true, isDispatched: false }); state.warships = warships(state).filter((s: any) => s !== ship); }
    else if (action === 'returnWarshipFromDock') { state.dockedWarships = Array.isArray(state.dockedWarships) ? state.dockedWarships : []; const docked = state.dockedWarships.find((s: any) => s.name === task.name || (n(s.x) === x && n(s.y) === y)); if (docked) { state.dockedWarships = state.dockedWarships.filter((s: any) => s !== docked); warships(state).push({ ...docked, x, y, isDocked: false }); } }
  }
  log(state, `${action}を処理しました。`);
}

function produce(state: any) {
  let foodChange = 0, moneyChange = 0, divisor = 0;
  for (const row of state.map || []) for (const tile of row) {
    if (tile.facility === 'farm' && tile.terrain === 'plain') foodChange += tile.enhanced ? 300 : 100;
    if (tile.facility === 'factory' && tile.terrain === 'plain') divisor = tile.enhanced ? (4 / 1.5) : 4; moneyChange += Math.floor(state.population / divisor);
    if (tile.facility === 'oilRig' && tile.terrain === 'sea') moneyChange += tile.enhanced ? 30000 : 10000;
    if (tile.facility === 'house' && tile.terrain === 'plain') { const growth = Math.min(100, Math.max(0, 1000 - n(tile.pop))); tile.pop = n(tile.pop) + growth; state.population = n(state.population) + growth; }
  }
  state.food = n(state.food) + foodChange;
  state.money = n(state.money) + moneyChange;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const inactiveTurnLimit = Number(body.inactiveTurnLimit || 50);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('hakoniwa_islands').select('serial,island_name,state,last_action_turn').is('deleted_at', null);
    if (error) throw error;
    const rows = ((data || []) as IslandRow[]).sort((a, b) => n(b.state?.population) - n(a.state?.population));
    const incoming = new Map<number, any[]>();
    for (const row of rows) {
      const state = row.state || {};
      state.islandName = state.islandName || row.island_name;
      state.turn = n(state.turn) + 1;
      const queue = Array.isArray(state.actionQueue) ? state.actionQueue : [];
      const outgoing: any[] = [];
      for (let i = 0; i < ACTIONS_PER_TURN && queue.length; i++) runAction(state, queue.shift(), outgoing);
      state.actionQueue = queue;
      produce(state);
      for (const event of outgoing) if (event.targetSerial) incoming.set(n(event.targetSerial), [...(incoming.get(n(event.targetSerial)) || []), event]);
      row.state = state;
    }
    for (const row of rows) for (const event of incoming.get(n(row.serial)) || []) {
      if (['bombard', 'spreadBombard', 'ppBombard', 'randomBombard', 'concentratedFire'].includes(event.action)) applyBombard(row.state, { ...event, remoteBombard: true }, `${event.sourceIslandName || '他島'}からの砲撃`);
      else applyRemoteWarship(row.state, event);
    }
    for (const row of rows) {
      const turn = n(row.state?.turn);
      if (turn - n(row.last_action_turn) >= inactiveTurnLimit) await supabase.from('hakoniwa_islands').delete().eq('serial', row.serial);
      else await supabase.from('hakoniwa_islands').update({ state: row.state, updated_at: new Date().toISOString() }).eq('serial', row.serial);
    }
    return new Response(JSON.stringify({ ok: true, processed: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
