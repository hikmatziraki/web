(function () {
  "use strict";
  var config = window.VITRIN_CONFIG || {};
  var SUPABASE_URL = config.supabaseUrl;
  var SUPABASE_KEY = config.supabaseKey;
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS SDK failed to load.");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase configuration. Run the project build with VITRIN_SUPABASE_URL and VITRIN_SUPABASE_KEY.");
    return;
  }
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
