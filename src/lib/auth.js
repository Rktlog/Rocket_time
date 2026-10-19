// src/lib/auth.js
import { supabase } from './supabaseClient';

/** Re-checks the signed-in user's current password before sensitive changes. */
export async function verifyPassword(password) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) return { ok: false };
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  return { ok: !error };
}