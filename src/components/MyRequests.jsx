// src/components/MyRequests.jsx
// Employee side: ask for leave, hand a shift to a colleague, answer hand-over requests.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { todayLocal, prettyDate } from '../lib/dates';
import {
  viewHeadingStyle, subTextStyle, cardStyle, labelStyle, inputStyle, btnStyle,
  approveBtnStyle, declineBtnStyle, editBtnStyle, statusChipStyle,
  successBannerStyle, errorAlertStyle,
} from '../lib/styles';

const LEAVE_TYPES = ['Annual leave', 'Sick leave', 'Personal leave', 'Unpaid leave', 'Other'];

export default function MyRequests({ user }) {
  const [tab, setTab] = useState('leave');
  const [msg, setMsg] = useState({ text: '', isError: false });

  const flash = (text, isError = false) => {
    setMsg({ text, isError });
    setTimeout(() => setMsg({ text: '', isError: false }), 5000);
  };

  return (
    <div>
      <h2 style={viewHeadingStyle}>🔁 Requests</h2>
      <p style={subTextStyle}>Ask for time off, or hand one of your shifts to a colleague. Your manager signs off.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button onClick={() => setTab('leave')} style={tab === 'leave' ? btnStyle('#2563eb') : editBtnStyle}>🌴 Time off</button>
        <button onClick={() => setTab('swaps')} style={tab === 'swaps' ? btnStyle('#2563eb') : editBtnStyle}>🔄 Shift hand-over</button>
      </div>

      {msg.text && (
        <div style={{ ...(msg.isError ? errorAlertStyle : successBannerStyle), marginBottom: '14px' }}>{msg.text}</div>
      )}

      {tab === 'leave' ? <LeaveSection user={user} flash={flash} /> : <SwapSection user={user} flash={flash} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TIME OFF                                                            */
/* ------------------------------------------------------------------ */
function LeaveSection({ user, flash }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leave_type: LEAVE_TYPES[0], start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    load();
  }, [user.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) flash(`❌ Could not load your requests: ${error.message}`, true);
    setRequests(data || []);
    setLoading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.end_date < form.start_date) {
      flash('❌ The end date is before the start date.', true);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('leave_requests').insert([
        {
          user_id: user.id,
          employee_name: user.name,
          department: user.department,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason.trim() || null,
        },
      ]);
      if (error) throw error;
      setForm({ leave_type: LEAVE_TYPES[0], start_date: '', end_date: '', reason: '' });
      flash('✅ Request sent to your manager.');
      await load();
    } catch (err) {
      flash(`❌ Could not send the request: ${err.message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (r) => {
    try {
      await expectRows(
        supabase.from('leave_requests').update({ status: 'Cancelled' }).eq('id', r.id),
        'cancel the request'
      );
      flash('Request cancelled.');
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '14px', maxWidth: '560px' }}>
      <form onSubmit={submit} style={cardStyle}>
        <label style={labelStyle}>Type</label>
        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} style={{ ...inputStyle, marginBottom: '12px' }}>
          {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First day off</label>
            <input type="date" required min={todayLocal()} value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: form.end_date || e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last day off</label>
            <input type="date" required min={form.start_date || todayLocal()} value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Note (optional)</label>
        <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ ...inputStyle, marginBottom: '14px' }} />

        <button type="submit" disabled={saving} style={btnStyle('#2563eb')}>{saving ? 'Sending...' : 'Request time off'}</button>
      </form>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>My requests</h3>
        {loading ? <div style={{ fontSize: '12px', color: '#64748b' }}>Loading...</div>
          : requests.length === 0 ? <div style={{ fontSize: '12px', color: '#94a3b8' }}>No requests yet.</div>
            : requests.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                    {r.leave_type}: {prettyDate(r.start_date)}{r.end_date !== r.start_date ? ` to ${prettyDate(r.end_date)}` : ''}
                  </div>
                  {r.decision_note && <div style={{ fontSize: '11px', color: '#64748b' }}>Manager: {r.decision_note}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={statusChipStyle(r.status)}>{r.status}</span>
                  {r.status === 'Pending' && <button onClick={() => cancel(r)} style={editBtnStyle}>Cancel</button>}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SHIFT HAND-OVER                                                     */
/* ------------------------------------------------------------------ */
function SwapSection({ user, flash }) {
  const [myShifts, setMyShifts] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [mine, setMine] = useState([]);       // swaps I asked for
  const [incoming, setIncoming] = useState([]); // swaps asked of me
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shift_id: '', target_id: '', note: '' });

  useEffect(() => {
    load();
  }, [user.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [shiftsRes, mineRes, inRes, colRes] = await Promise.all([
        supabase.from('shifts').select('id, shift_date, start_time, end_time, status')
          .eq('user_id', user.id).gte('shift_date', todayLocal()).order('shift_date').limit(30),
        supabase.from('shift_swaps').select('*').eq('requester_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('shift_swaps').select('*').eq('target_id', user.id).eq('status', 'Awaiting colleague').order('shift_date'),
        supabase.rpc('my_colleagues'),
      ]);
      if (shiftsRes.error) throw shiftsRes.error;
      if (mineRes.error) throw mineRes.error;
      if (inRes.error) throw inRes.error;
      if (colRes.error) throw colRes.error;

      const busy = new Set((mineRes.data || []).filter((s) => ['Awaiting colleague', 'Awaiting manager'].includes(s.status)).map((s) => s.shift_id));
      setMyShifts((shiftsRes.data || []).filter((s) => s.status !== 'Declined' && !busy.has(s.id)));
      setMine(mineRes.data || []);
      setIncoming(inRes.data || []);
      setColleagues(colRes.data || []);
    } catch (err) {
      flash(`❌ Could not load shift hand-overs: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '');

  const submit = async (e) => {
    e.preventDefault();
    const shift = myShifts.find((s) => s.id === form.shift_id);
    const target = colleagues.find((c) => c.id === form.target_id);
    if (!shift || !target) return;

    setSaving(true);
    try {
      // The colleague must be free that day (one shift per person per day)
      const { data: clash, error: clashErr } = await supabase
        .from('shifts').select('id').eq('user_id', target.id).eq('shift_date', shift.shift_date).limit(1);
      if (clashErr) throw clashErr;
      if (clash && clash.length > 0) {
        throw new Error(`${target.full_name} already has a shift on ${prettyDate(shift.shift_date)}.`);
      }

      const { error } = await supabase.from('shift_swaps').insert([
        {
          shift_id: shift.id,
          shift_date: shift.shift_date,
          department: user.department,
          requester_id: user.id,
          requester_name: user.name,
          target_id: target.id,
          target_name: target.full_name,
          note: form.note.trim() || null,
        },
      ]);
      if (error) throw error;

      setForm({ shift_id: '', target_id: '', note: '' });
      flash(`✅ Asked ${target.full_name}. If they accept, your manager approves it.`);
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const answer = async (swap, accept) => {
    try {
      await expectRows(
        supabase.from('shift_swaps').update({ status: accept ? 'Awaiting manager' : 'Declined' }).eq('id', swap.id),
        accept ? 'accept the hand-over' : 'decline the hand-over'
      );
      flash(accept ? '✅ Accepted. It now goes to the manager for sign-off.' : 'Declined.');
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    }
  };

  const cancel = async (swap) => {
    try {
      await expectRows(supabase.from('shift_swaps').update({ status: 'Cancelled' }).eq('id', swap.id), 'cancel the request');
      flash('Request cancelled.');
      await load();
    } catch (err) {
      flash(`❌ ${err.message}`, true);
    }
  };

  if (loading) return <div style={{ fontSize: '12px', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ display: 'grid', gap: '14px', maxWidth: '560px' }}>
      {incoming.length > 0 && (
        <div style={{ ...cardStyle, border: '1px solid #fcd34d', backgroundColor: '#fffbeb' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#92400e' }}>📥 Asking you to take a shift</h3>
          {incoming.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13px' }}>
                <strong>{s.requester_name}</strong> wants you to take <strong>{prettyDate(s.shift_date)}</strong>
                {s.note && <div style={{ fontSize: '11px', color: '#64748b' }}>"{s.note}"</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => answer(s, true)} style={approveBtnStyle}>✓ Accept</button>
                <button onClick={() => answer(s, false)} style={declineBtnStyle}>✕ Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} style={cardStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Hand one of my shifts to a colleague</h3>

        <label style={labelStyle}>My shift</label>
        <select required value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })} style={{ ...inputStyle, marginBottom: '12px' }}>
          <option value="">{myShifts.length ? 'Choose a shift...' : 'No upcoming shifts to hand over'}</option>
          {myShifts.map((s) => (
            <option key={s.id} value={s.id}>{prettyDate(s.shift_date)}, {timeOf(s.start_time)} to {timeOf(s.end_time)}</option>
          ))}
        </select>

        <label style={labelStyle}>Colleague (same department)</label>
        <select required value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })} style={{ ...inputStyle, marginBottom: '12px' }}>
          <option value="">{colleagues.length ? 'Choose a colleague...' : 'No colleagues found'}</option>
          {colleagues.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>

        <label style={labelStyle}>Note (optional)</label>
        <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, marginBottom: '14px' }} />

        <button type="submit" disabled={saving || myShifts.length === 0} style={btnStyle('#2563eb')}>
          {saving ? 'Sending...' : 'Ask colleague'}
        </button>
      </form>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>My hand-over requests</h3>
        {mine.length === 0 ? <div style={{ fontSize: '12px', color: '#94a3b8' }}>None yet.</div> : mine.map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', color: '#0f172a' }}>
              <strong>{prettyDate(s.shift_date)}</strong> to {s.target_name}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={statusChipStyle(s.status)}>{s.status}</span>
              {['Awaiting colleague', 'Awaiting manager'].includes(s.status) && (
                <button onClick={() => cancel(s)} style={editBtnStyle}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
