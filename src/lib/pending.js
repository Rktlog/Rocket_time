// src/lib/pending.js
// Small counts shown as badges on tabs.
import { supabase } from './supabaseClient';

/** Leave requests + shift hand-overs waiting on a manager (admin passes 'All Departments'). */
export async function countPendingApprovals(department) {
  const scope = (q) => (department && department !== 'All Departments' ? q.ilike('department', department.trim()) : q);
  const [leave, swaps] = await Promise.all([
    scope(supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending')),
    scope(supabase.from('shift_swaps').select('id', { count: 'exact', head: true }).eq('status', 'Awaiting manager')),
  ]);
  return (leave.count || 0) + (swaps.count || 0);
}

/** Colleagues asking me to take a shift. */
export async function countIncomingSwaps(userId) {
  const { count } = await supabase
    .from('shift_swaps')
    .select('id', { count: 'exact', head: true })
    .eq('target_id', userId)
    .eq('status', 'Awaiting colleague');
  return count || 0;
}
