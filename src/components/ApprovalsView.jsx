// src/components/ApprovalsView.jsx
// Manager / admin: approve or decline leave requests and shift hand-overs.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { prettyDate } from '../lib/dates';
import {
  viewHeadingStyle, subTextStyle, cardStyle, approveBtnStyle, declineBtnStyle,
  statusChipStyle, successBannerStyle, errorAlertStyle,
} from '../lib/styles';

export default function ApprovalsView({ department, currentUser }) {
  const [leave, setLeave] = useState([]);
  const [recentLeave, setRecentLeave] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const flash = (text, isError = false) => {
    setMsg({ text, isError });
    setTimeout(() => setMsg({ text: '', isError: false }), 5000);
  };

  const scoped = (q) =>
    department && department !== 'All Departments' ? q.ilike('department', department.trim()) : q;

  useEffect(() => {
    load();
  }, [department]);

  const load = async () => {
    setLoading(true);
    try {
      const [pending, recent, sw] = await Promise.all([
        scoped(supabase.from('leave_requests').select('*').eq('status', 'Pending')).order('start_date'),
        scoped(supabase.from('leave_requests').select('*').in('status', ['Approved', 'Declined']))
          .order('decided_at', { ascending: false }).limit(8),
        scoped(supabase.from('shift_swaps').select('*').in('status', ['Awaiting colleague', 'Awaiting manager']))
          .order('shift_date'),
      ]);
      if (pending.error) throw pending.error;
      if (recent.error) throw recent.error;
      if (sw.error) throw sw.error;
      setLeave(pending.data || []);
      setRecentLeave(recent.data || []);
      setSwaps(sw.data || []);
    } catch (err) {
      flash(`❌ Could not load requests: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const decidedFields = (status, note) => ({
    status,
    decided_by: currentUser.id,
    decided_by_name: currentUser.name,
    decided_at: new Date().toISOString(),
    ...(note !== undefined ? { decision_note: note || null } : {}),
  });

  /* ---------- leave ---------- */
  const decideLeave = async (r, approve) => {
    let note = '';
    if (!approve) {
      note = window.prompt('Reason for declining (optional, the employee will see it):', '') ?? null;
      if (note === null) return; // cancelled the prompt
    }
    setBusyId(r.id);
    try {
      await expectRows(
        supabase.from('leave_requests').update(decidedFields(approve ? 'Approved' : 'Declined', note)).eq('id', r.id),
        approve ? 'approve the leave' : 'decline the leave'
      );
      flash(`${approve ? '✅ Approved' : 'Declined'}: ${r.employee_name}, ${prettyDate(r.start_date)}.`);
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    } finally {
      setBusyId(null);
    }
  };

  /* ---------- shift hand-overs ---------- */
  const approveSwap = async (s) => {
    setBusyId(s.id);
    try {
      // 1. the shift must still belong to the person handing it over
      const { data: shift, error: shiftErr } = await supabase
        .from('shifts').select('id, user_id').eq('id', s.shift_id).maybeSingle();
      if (shiftErr) throw shiftErr;
      if (!shift) throw new Error('That shift no longer exists.');
      if (shift.user_id !== s.requester_id) throw new Error('That shift has already changed hands. Decline this request.');

      // 2. the colleague must be free that day
      const { data: clash, error: clashErr } = await supabase
        .from('shifts').select('id').eq('user_id', s.target_id).eq('shift_date', s.shift_date).limit(1);
      if (clashErr) throw clashErr;
      if (clash && clash.length > 0) throw new Error(`${s.target_name} already has a shift on ${prettyDate(s.shift_date)}.`);

      // 3. move the shift
      const { data: target, error: targetErr } = await supabase
        .from('profiles').select('email').eq('id', s.target_id).maybeSingle();
      if (targetErr) throw targetErr;

      await expectRows(
        supabase.from('shifts').update({
          user_id: s.target_id,
          employee_name: s.target_name,
          offered_to_email: (target?.email || '').trim().toLowerCase(),
        }).eq('id', s.shift_id),
        'move the shift'
      );

      // 4. close the request
      await expectRows(
        supabase.from('shift_swaps').update(decidedFields('Approved')).eq('id', s.id),
        'mark the request approved'
      );

      flash(`✅ ${s.requester_name}'s shift on ${prettyDate(s.shift_date)} now belongs to ${s.target_name}.`);
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    } finally {
      setBusyId(null);
    }
  };

  const declineSwap = async (s) => {
    setBusyId(s.id);
    try {
      await expectRows(supabase.from('shift_swaps').update(decidedFields('Declined')).eq('id', s.id), 'decline the hand-over');
      flash('Declined.');
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    } finally {
      setBusyId(null);
    }
  };

  const waitingForManager = swaps.filter((s) => s.status === 'Awaiting manager');
  const waitingForColleague = swaps.filter((s) => s.status === 'Awaiting colleague');

  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' };

  return (
    <div>
      <h2 style={viewHeadingStyle}>✅ Approvals</h2>
      <p style={subTextStyle}>Time off and shift hand-overs waiting for a decision.</p>

      {msg.text && <div style={{ ...(msg.isError ? errorAlertStyle : successBannerStyle), marginBottom: '14px' }}>{msg.text}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gap: '14px', maxWidth: '720px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>🌴 Time off ({leave.length})</h3>
            {leave.length === 0 ? <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nothing waiting.</div> : leave.map((r) => (
              <div key={r.id} style={rowStyle}>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>
                  <strong>{r.employee_name}</strong>, {r.leave_type}
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    {prettyDate(r.start_date)}{r.end_date !== r.start_date ? ` to ${prettyDate(r.end_date)}` : ''}
                  </div>
                  {r.reason && <div style={{ fontSize: '11px', color: '#64748b' }}>"{r.reason}"</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => decideLeave(r, true)} disabled={busyId === r.id} style={approveBtnStyle}>✓ Approve</button>
                  <button onClick={() => decideLeave(r, false)} disabled={busyId === r.id} style={declineBtnStyle}>✕ Decline</button>
                </div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>🔄 Shift hand-overs ({waitingForManager.length})</h3>
            {waitingForManager.length === 0 ? <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nothing waiting.</div> : waitingForManager.map((s) => (
              <div key={s.id} style={rowStyle}>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>
                  <strong>{s.requester_name}</strong> gives <strong>{prettyDate(s.shift_date)}</strong> to <strong>{s.target_name}</strong>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>{s.target_name} has agreed</div>
                  {s.note && <div style={{ fontSize: '11px', color: '#64748b' }}>"{s.note}"</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => approveSwap(s)} disabled={busyId === s.id} style={approveBtnStyle}>✓ Approve</button>
                  <button onClick={() => declineSwap(s)} disabled={busyId === s.id} style={declineBtnStyle}>✕ Decline</button>
                </div>
              </div>
            ))}
            {waitingForColleague.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
                Still waiting on the colleague: {waitingForColleague.map((s) => `${s.requester_name} to ${s.target_name} (${prettyDate(s.shift_date)})`).join(', ')}
              </div>
            )}
          </div>

          {recentLeave.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>Recently decided time off</h3>
              {recentLeave.map((r) => (
                <div key={r.id} style={{ ...rowStyle, padding: '6px 0' }}>
                  <div style={{ fontSize: '12px', color: '#0f172a' }}>
                    {r.employee_name}: {prettyDate(r.start_date)}{r.end_date !== r.start_date ? ` to ${prettyDate(r.end_date)}` : ''}
                    <span style={{ color: '#64748b' }}> (by {r.decided_by_name})</span>
                  </div>
                  <span style={statusChipStyle(r.status)}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
