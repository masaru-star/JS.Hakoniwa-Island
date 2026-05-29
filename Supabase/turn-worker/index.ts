// Deploy: supabase functions deploy hakoniwa-turn-worker
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function applyBombard(state: any, action: any) {
  const size = 16;
  const map = state.map || [];
  const count = Number(action.count || 1);
  const type = action.action;
  const errorRange = type === 'spreadBombard' ? 2 : (type === 'ppBombard' || type === 'randomBombard' ? 0 : 1);
  for (let i = 0; i < count; i++) {
    let tx = 0;
    let ty = 0;
    if (type === 'randomBombard') {
      tx = Math.floor(Math.random() * size);
      ty = Math.floor(Math.random() * size);
    } else {
      tx = Number(action.x || 0) + (errorRange ? Math.floor(Math.random() * (2 * errorRange + 1)) - errorRange : 0);
      ty = Number(action.y || 0) + (errorRange ? Math.floor(Math.random() * (2 * errorRange + 1)) - errorRange : 0);
    }
    if (!map[ty]?.[tx]) continue;
    const tile = map[ty][tx];
    if (tile.terrain === 'mountain') continue;
    if (tile.facility === 'house') {
      state.population = Math.max(0, Number(state.population || 0) - Number(tile.pop || 0));
    }
    tile.terrain = tile.terrain === 'sea' ? 'sea' : 'waste';
    tile.facility = null;
    tile.pop = 0;
    tile.enhanced = false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const inactiveTurnLimit = Number(body.inactiveTurnLimit || 50);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase
      .from('hakoniwa_islands')
      .select('serial,island_name,state,last_action_turn')
      .is('deleted_at', null);
    if (error) throw error;
    const rows = (data || []).sort((a: any, b: any) => Number(b.state?.population || 0) - Number(a.state?.population || 0));

    const incoming = new Map<number, any[]>();

    for (const row of rows) {
      const state = row.state || {};
      const queue = Array.isArray(state.actionQueue) ? state.actionQueue : [];
      const remainingQueue = [];
      for (const task of queue) {
        if (task.remoteBombard && task.targetSerial) {
          const list = incoming.get(Number(task.targetSerial)) || [];
          list.push(task);
          incoming.set(Number(task.targetSerial), list);
        } else {
          remainingQueue.push(task);
        }
      }
      state.actionQueue = remainingQueue;
    }

    for (const row of rows) {
      const state = row.state || {};
      for (const action of incoming.get(Number(row.serial)) || []) applyBombard(state, action);
      state.turn = Number(state.turn || 0) + 1;
      row.state = state;
    }

    for (const row of rows) {
      const turn = Number(row.state?.turn || 0);
      if (turn - Number(row.last_action_turn || 0) >= inactiveTurnLimit) {
        await supabase.from('hakoniwa_islands').delete().eq('serial', row.serial);
      } else {
        await supabase.from('hakoniwa_islands').update({ state: row.state, updated_at: new Date().toISOString() }).eq('serial', row.serial);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
