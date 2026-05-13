const SUPABASE_URL = 'https://pqtmnbbmrovkjmmbudbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdG1uYmJtcm92a2ptbWJ1ZGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDI2MjgsImV4cCI6MjA5NDIxODYyOH0.p85VVEPBy1nAIFPVXzv8OEJrmltbLjcJRcEQNMZlUnQ';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 현재 페이지 기준 URL 계산 (로컬/GitHub Pages 모두 대응)
const BASE_URL = new URL('./', window.location.href).href;

async function getAuthUser() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.user_metadata?.user_name || u.email?.split('@')[0],
    email: u.email,
    avatar: u.user_metadata?.avatar_url || null,
    isGuest: false,
  };
}

async function signInWithGoogle() {
  await _supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: BASE_URL + 'board.html' },
  });
}

async function signInWithGitHub() {
  await _supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: BASE_URL + 'board.html' },
  });
}

async function signUpWithEmail(email, password) {
  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: BASE_URL + 'board.html' },
  });
  return { data, error };
}

async function signInWithEmail(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  await _supabase.auth.signOut();
}

function onAuthStateChange(callback) {
  _supabase.auth.onAuthStateChange((event) => callback(event));
}
