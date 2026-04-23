// Supabase client initialization for a static site.
// IMPORTANT: Only use the public "anon" key here (never service_role).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Option 1 (recommended for this repo): set these in `assets/js/supabaseConfig.js`
// Option 2: set window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__ before this file loads
const SUPABASE_URL =
  window.__SUPABASE_URL__ || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url);
const SUPABASE_ANON_KEY =
  window.__SUPABASE_ANON_KEY__ || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Keep failure loud so you notice it immediately in dev.
  throw new Error(
    "Supabase config missing. Create `assets/js/supabaseConfig.js` and set SUPABASE_CONFIG = { url, anonKey }."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Handy for quick manual testing in the console.
window.supabase = supabase;

