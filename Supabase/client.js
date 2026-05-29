export function createHakoniwaSupabaseClient({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_PROJECT_ID') || supabaseAnonKey.includes('YOUR_SUPABASE')) {
    throw new Error('main.html の SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。');
  }
  if (!window.supabase?.createClient) {
    throw new Error('@supabase/supabase-js が読み込まれていません。');
  }
  return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

export function assertCoreReady() {
  if (!window.HakoniwaCore) {
    throw new Error('HakoniwaCore が初期化されていません。script.js を先に読み込んでください。');
  }
  return window.HakoniwaCore;
}
