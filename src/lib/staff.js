// src/lib/staff.js
import { supabase } from './supabaseClient';

/**
 * Deactivate or reactivate an employee through the set-employee-active edge function.
 * The function blocks the login AND flips profiles.active, and checks that the caller
 * is allowed to (managers: own department only, only admins can reactivate).
 */
export async function setEmployeeActive(userId, active) {
  const { data, error } = await supabase.functions.invoke('set-employee-active', {
    body: { user_id: userId, active },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || 'Could not update the employee.');
  }
}
