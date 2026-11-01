// src/lib/db.js

/**
 * Supabase does NOT return an error when row-level security blocks an update,
 * delete or upsert. It quietly changes 0 rows and reports success. That is how
 * "saved" screens can come back unchanged after a reload.
 *
 * Wrap a write in expectRows and a blocked or empty change becomes a real error:
 *
 *   await expectRows(supabase.from('shifts').update({ status: 'Declined' }).eq('id', id), 'decline the shift');
 *
 * Pass `expected` when you know how many rows must change (e.g. a bulk approve).
 * Returns the changed rows.
 */
export async function expectRows(builder, label = 'save the change', expected = null) {
  const { data, error } = await builder.select();
  if (error) throw error;
  const changed = data?.length || 0;
  if (changed === 0) {
    throw new Error(`Could not ${label}. No rows were changed (blocked by permissions, or the record no longer exists).`);
  }
  if (expected != null && changed < expected) {
    throw new Error(`Could not ${label} for everyone. Only ${changed} of ${expected} were changed. Check permissions.`);
  }
  return data;
}
