import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const placeholderUrl = 'https://placeholder.supabase.co';
const placeholderKey = 'placeholder-key';

// Create a single, persistent Supabase client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function createSupabaseInstance() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Debug logging for mobile and desktop
  if (typeof window !== 'undefined') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'MOBILE' : 'DESKTOP';
    
    console.log(`[Supabase] Device: ${deviceType}`);
    console.log(`[Supabase] URL configured: ${Boolean(supabaseUrl)}`);
    console.log(`[Supabase] Key configured: ${Boolean(supabaseAnonKey)}`);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[Supabase] ❌ Credentials missing on ${deviceType}`);
      console.error('[Supabase] To fix this:');
      console.error('1. Go to Replit Secrets');
      console.error('2. Add: VITE_SUPABASE_URL with your Supabase project URL');
      console.error('3. Add: VITE_SUPABASE_ANON_KEY with your Supabase anon key');
      console.error('4. Restart the application');
    } else {
      console.log(`[Supabase] ✓ Connected on ${deviceType}`);
    }
  }

  supabaseInstance = createClient(
    supabaseUrl || placeholderUrl,
    supabaseAnonKey || placeholderKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' 
          ? window.localStorage 
          : undefined,
        flowType: 'pkce'
      }
    }
  );

  return supabaseInstance;
}

// Export the getter function instead of creating instance at module load time
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_target, prop) => {
    const instance = createSupabaseInstance();
    return instance[prop as keyof typeof instance];
  }
});

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export { supabaseUrl, supabaseAnonKey };
