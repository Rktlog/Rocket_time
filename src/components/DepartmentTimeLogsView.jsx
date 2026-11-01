// src/components/DepartmentTimeLogsView.jsx
// Manager / admin timesheet review: approve shifts, fix times, see who changed what.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { getStartOfWeek } from '../lib/dates';
import { calculatePaidHours, FORGOTTEN_CLOCK_OUT_HOURS } from '../lib/hours';
import {
  cardStyle, weekNavHeaderStyle, weekNavBtnStyle, todayBtnStyle, bulkApproveBtnStyle,
  approveBtnStyle, editBtnStyle, timeInputStyle, inputStyle, responsiveTableWrapper,
} from '../lib/styles';

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtStamp = (iso) =>
  iso ? new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const breakLabel = (noBreak) => (noBreak ? 'Worked through (+40m)' : '30m unpaid');
const containerLabel = (c) => ({ '20ft': '20ft (+10m)', '40ft': '40ft (+20m)' }[c] || 'None');

/** A shift needs a manager's eyes if it was closed by the system, or has been open far too long. */
function needsAttention(log) {
  if (String(log.status || '').startsWith('Auto Clocked Out')) return true;
  if (!log.clock_out) {
    const hoursOpen = (Date.now() - new Date(log.clock_in).getTime()) / 36e5;
    return hoursOpen > FORGOTTEN_CLOCK_OUT_HOURS;
  }
  return false;
}

export default function DepartmentTimeLogsView({ department, currentUser }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [expandedUser, setExpandedUser] = useState(null);
  const [weeklySummaries, setWeeklySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  // editing one shift
  const [editingLogId, setEditingLogId] = useState(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editNote, setEditNote] = useState('');

  // history of one shift
  const [historyLogId, setHistoryLogId] = useState(null);
  const [history, setHistory] = useState([]);

  const changeWeek = (offset) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offset * 7);
    setCurrentWeekStart(d);
  };

  useEffect(() => {
    fetchTimeLogs();
  }, [department, currentWeekStart]);

  const flash = (text, isError = false) => {
    setMsg({ text, isError });
    setTimeout(() => setMsg({ text: '', isError: false }), 5000);
  };

  const fetchTimeLogs = async () => {
    setLoading(true);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      let query = supabase
        .from('time_logs')
        .select('*')
        .gte('clock_in', currentWeekStart.toISOString())
        .lt('clock_in', weekEnd.toISOString())
        .order('clock_in', { ascending: true });

      if (department && department !== 'All Departments') {
        query = query.ilike('department', department.trim());
      }

      const { data, error } = await query;
      if (error) throw error;

      const grouped = {};
      (data || []).forEach((log) => {
        const empName = log.employee_name || 'Employee';
        const key = log.user_id || empName;
        if (!grouped[key]) {
          grouped[key] = { id: key, userId: log.user_id, name: empName, total: 0, shifts: [] };
        }
        const clockIn = new Date(log.clock_in);
        const clockOut = log.clock_out ? new Date(log.clock_out) : null;
        grouped[key].total += parseFloat(log.total_hours || 0);
        grouped[key].shifts.push({
          logId: log.id,
          department: log.department,
          rawClockIn: log.clock_in,
          rawClockOut: log.clock_out,
          noBreak: Boolean(log.no_break),
          container: log.container_type || 'none',
          day: clockIn.toLocaleDateString([], { weekday: 'short' }),
          date: clockIn.toLocaleDateString([], { day: '2-digit', month: 'short' }),
          clockIn: hhmm(clockIn),
          clockOut: clockOut ? hhmm(clockOut) : 'Active',
          paidHours: log.total_hours ? parseFloat(log.total_hours).toFixed(2) : '0.00',
          status: log.status || 'Pending Review',
          flagged: needsAttention(log),
          approvedByName: log.approved_by_name,
          approvedAt: log.approved_at,
          editedByName: log.edited_by_name,
          editedAt: log.edited_at,
          editNote: log.edit_note,
        });
      });

      const list = Object.values(grouped).map((g) => ({
        ...g,
        weeklyTotalHours: g.total.toFixed(2),
        flaggedCount: g.shifts.filter((s) => s.flagged).length,
        status: g.shifts.some((s) => s.flagged)
          ? 'Needs review'
          : g.shifts.every((s) => s.status === 'Approved')
            ? 'Approved'
            : 'Pending Review',
      }));
      setWeeklySummaries(list);
    } catch (err) {
      console.error('Time logs retrieval error:', err);
      setWeeklySummaries([]);
      flash(`❌ Could not load time logs: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const attentionTotal = weeklySummaries.reduce((n, e) => n + e.flaggedCount, 0);

  /* ---------- approving ---------- */
  const approveLogs = async (shifts, label) => {
    if (shifts.length === 0) {
      flash('Nothing to approve here.');
      return;
    }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const ids = shifts.map((s) => s.logId);
      await expectRows(
        supabase
          .from('time_logs')
          .update({
            status: 'Approved',
            approved_by: currentUser?.id || null,
            approved_by_name: currentUser?.name || null,
            approved_at: now,
          })
          .in('id', ids),
        'approve the shifts',
        ids.length
      );

      // history entries (a failure here must not hide that the approval itself worked)
      const { error: auditErr } = await supabase.from('time_log_edits').insert(
        shifts.map((s) => ({
          time_log_id: s.logId,
          department: s.department || null,
          action: 'approve',
          edited_by: currentUser?.id || null,
          edited_by_name: currentUser?.name || null,
          new_clock_in: s.rawClockIn,
          new_clock_out: s.rawClockOut,
          new_hours: parseFloat(s.paidHours),
        }))
      );
      if (auditErr) console.warn('Approval history not saved:', auditErr.message);

      flash(`✅ Approved ${ids.length} shift${ids.length === 1 ? '' : 's'}${label ? ` for ${label}` : ''}.`);
      await fetchTimeLogs();
    } catch (err) {
      flash(`❌ Approval failed: ${err.message}`, true);
    } finally {
      setProcessing(false);
    }
  };

  // Completed, not yet approved, and not flagged. Flagged shifts need a human decision first.
  const approvable = (shifts) => shifts.filter((s) => s.rawClockOut && s.status !== 'Approved' && !s.flagged);

  const handleApproveEmployee = (emp) => {
    const toApprove = approvable(emp.shifts);
    approveLogs(toApprove, emp.name);
  };

  const handleBulkApprove = () => {
    const all = weeklySummaries.flatMap((e) => e.shifts);
    approveLogs(approvable(all), '');
  };

  /* ---------- editing ---------- */
  const startEditShift = (s) => {
    setEditingLogId(s.logId);
    setEditInTime(s.clockIn);
    setEditOutTime(s.clockOut === 'Active' ? '16:30' : s.clockOut);
    setEditNote('');
  };

  const saveShiftEdit = async (s) => {
    if (!editNote.trim()) {
      flash('❌ Add a short reason for the change. It is saved in the history.', true);
      return;
    }
    const day = new Date(s.rawClockIn);
    const prefix = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    const newIn = new Date(`${prefix}T${editInTime.slice(0, 5)}:00`);
    const newOut = new Date(`${prefix}T${editOutTime.slice(0, 5)}:00`);
    if (!(newOut > newIn)) {
      flash('❌ Clock out must be after clock in (same day).', true);
      return;
    }

    setProcessing(true);
    try {
      // Same rules as the time clock: break deduction, no-break bonus, container bonus.
      const newHours = parseFloat(calculatePaidHours(newIn, newOut, s.noBreak, s.container));
      const now = new Date().toISOString();

      await expectRows(
        supabase
          .from('time_logs')
          .update({
            clock_in: newIn.toISOString(),
            clock_out: newOut.toISOString(),
            total_hours: newHours,
            status: 'Pending Review', // an edited shift must be approved again
            approved_by: null,
            approved_by_name: null,
            approved_at: null,
            edited_by: currentUser?.id || null,
            edited_by_name: currentUser?.name || null,
            edited_at: now,
            edit_note: editNote.trim(),
          })
          .eq('id', s.logId),
        'save the time change'
      );

      const { error: auditErr } = await supabase.from('time_log_edits').insert([
        {
          time_log_id: s.logId,
          department: s.department || null,
          action: 'edit',
          edited_by: currentUser?.id || null,
          edited_by_name: currentUser?.name || null,
          old_clock_in: s.rawClockIn,
          old_clock_out: s.rawClockOut,
          new_clock_in: newIn.toISOString(),
          new_clock_out: newOut.toISOString(),
          old_hours: parseFloat(s.paidHours),
          new_hours: newHours,
          note: editNote.trim(),
        },
      ]);

      setEditingLogId(null);
      flash(
        auditErr
          ? `⚠️ Times saved, but the history entry failed: ${auditErr.message}`
          : '✅ Times updated. The shift now needs approving again.',
        Boolean(auditErr)
      );
      await fetchTimeLogs();
    } catch (err) {
      flash(`❌ Time change failed: ${err.message}`, true);
    } finally {
      setProcessing(false);
    }
  };

  /* ---------- history ---------- */
  const toggleHistory = async (logId) => {
    if (historyLogId === logId) {
      setHistoryLogId(null);
      return;
    }
    setHistoryLogId(logId);
    setHistory([]);
    const { data, error } = await supabase
      .from('time_log_edits')
      .select('*')
      .eq('time_log_id', logId)
      .order('created_at', { ascending: false });
    if (error) flash(`❌ Could not load history: ${error.message}`, true);
    else setHistory(data || []);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const heading = department === 'All Departments' ? 'All departments' : department;

  return (
    <div>
      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0f172a' }}>
            Week: {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))} style={todayBtnStyle}>Jump to Current Week</button>
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next ▶</button>
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
          color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`,
        }}>
          {msg.text}
        </div>
      )}

      {attentionTotal > 0 && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
          ⚠️ <strong>{attentionTotal} shift{attentionTotal === 1 ? '' : 's'} need{attentionTotal === 1 ? 's' : ''} checking.</strong>{' '}
          Someone forgot to clock out, so the system closed the shift at 8 PM or it is still open.
          Open the employee, fix the clock-out time with ✏️ Edit, then approve it.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>📋 Timesheets ({heading})</h3>
        <button onClick={handleBulkApprove} disabled={processing || weeklySummaries.length === 0} style={bulkApproveBtnStyle}>
          {processing ? 'Processing...' : '⚡ Approve all clear shifts'}
        </button>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>Loading timesheets...</div>
        ) : weeklySummaries.length === 0 ? (
          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>No shift logs for this week.</div>
        ) : (
          <div style={responsiveTableWrapper}>
            <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Weekly Hrs</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeklySummaries.map((emp) => {
                  const isOpen = expandedUser === emp.id;
                  const chip = {
                    Approved: ['#dcfce7', '#15803d'],
                    'Pending Review': ['#fef3c7', '#b45309'],
                    'Needs review': ['#fee2e2', '#b91c1c'],
                  }[emp.status];
                  return (
                    <React.Fragment key={emp.id}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isOpen ? '#f8fafc' : '#ffffff' }}>
                        <td onClick={() => setExpandedUser(isOpen ? null : emp.id)} style={{ padding: '10px 8px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', wordBreak: 'break-word' }}>
                          {isOpen ? '▼ ' : '▶ '} {emp.name}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{emp.weeklyTotalHours} hrs</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', backgroundColor: chip[0], color: chip[1], whiteSpace: 'nowrap' }}>
                            {emp.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setExpandedUser(isOpen ? null : emp.id)} style={editBtnStyle}>
                              {isOpen ? 'Close' : '🔍 Shifts'}
                            </button>
                            {approvable(emp.shifts).length > 0 && (
                              <button onClick={() => handleApproveEmployee(emp)} disabled={processing} style={approveBtnStyle}>
                                ✓ Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan="4" style={{ padding: '8px', backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#0f172a' }}>
                                🗓️ Shifts for <strong>{emp.name}</strong>
                              </h4>
                              <div style={responsiveTableWrapper}>
                                <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '12px' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                      <th style={{ padding: '6px' }}>Date</th>
                                      <th style={{ padding: '6px' }}>In</th>
                                      <th style={{ padding: '6px' }}>Out</th>
                                      <th style={{ padding: '6px' }}>Break</th>
                                      <th style={{ padding: '6px' }}>Container</th>
                                      <th style={{ padding: '6px' }}>Hrs</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emp.shifts.map((s) => {
                                      const editing = editingLogId === s.logId;
                                      return (
                                        <React.Fragment key={s.logId}>
                                          <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: s.flagged ? '#fffbeb' : 'transparent' }}>
                                            <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                                              <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{s.day}, {s.date}</div>
                                              {s.flagged && <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 'bold' }}>⚠️ Check clock-out</div>}
                                              {s.status === 'Approved' && s.approvedByName && (
                                                <div style={{ fontSize: '10px', color: '#15803d' }}>✓ {s.approvedByName}, {fmtStamp(s.approvedAt)}</div>
                                              )}
                                              {s.editedByName && (
                                                <div style={{ fontSize: '10px', color: '#64748b' }} title={s.editNote || ''}>
                                                  ✏️ Edited by {s.editedByName}, {fmtStamp(s.editedAt)}
                                                </div>
                                              )}
                                            </td>
                                            <td style={{ padding: '6px', color: '#15803d', fontWeight: 'bold' }}>
                                              {editing ? (
                                                <input type="time" value={editInTime} onChange={(e) => setEditInTime(e.target.value)} style={timeInputStyle} />
                                              ) : `🟢 ${s.clockIn}`}
                                            </td>
                                            <td style={{ padding: '6px', color: '#b91c1c', fontWeight: 'bold' }}>
                                              {editing ? (
                                                <input type="time" value={editOutTime} onChange={(e) => setEditOutTime(e.target.value)} style={timeInputStyle} />
                                              ) : `⏹ ${s.clockOut}`}
                                            </td>
                                            <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                                              <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', backgroundColor: s.noBreak ? '#fef3c7' : '#f1f5f9', color: s.noBreak ? '#b45309' : '#475569' }}>
                                                {breakLabel(s.noBreak)}
                                              </span>
                                            </td>
                                            <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                                              <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', backgroundColor: s.container !== 'none' ? '#e0e7ff' : '#f1f5f9', color: s.container !== 'none' ? '#3730a3' : '#94a3b8' }}>
                                                {containerLabel(s.container)}
                                              </span>
                                            </td>
                                            <td style={{ padding: '6px', fontWeight: 'bold', color: '#0f172a' }}>{s.paidHours}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>
                                              {editing ? (
                                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end' }}>
                                                  <button onClick={() => setEditingLogId(null)} style={editBtnStyle}>Cancel</button>
                                                  <button onClick={() => saveShiftEdit(s)} disabled={processing} style={approveBtnStyle}>Save 💾</button>
                                                </div>
                                              ) : (
                                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                  {s.rawClockOut && s.status !== 'Approved' && (
                                                    <button onClick={() => approveLogs([s], '')} disabled={processing} style={approveBtnStyle}>✓</button>
                                                  )}
                                                  <button onClick={() => startEditShift(s)} style={editBtnStyle}>✏️ Edit</button>
                                                  <button onClick={() => toggleHistory(s.logId)} style={editBtnStyle} title="Who changed this shift">📜</button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>

                                          {editing && (
                                            <tr>
                                              <td colSpan="7" style={{ padding: '6px', backgroundColor: '#f8fafc' }}>
                                                <input
                                                  type="text"
                                                  placeholder="Reason for the change (required), e.g. forgot to clock out, finished at 4:15"
                                                  value={editNote}
                                                  onChange={(e) => setEditNote(e.target.value)}
                                                  style={{ ...inputStyle, width: '100%' }}
                                                />
                                              </td>
                                            </tr>
                                          )}

                                          {historyLogId === s.logId && (
                                            <tr>
                                              <td colSpan="7" style={{ padding: '8px', backgroundColor: '#f8fafc', fontSize: '11px', color: '#475569' }}>
                                                {history.length === 0 ? 'No changes recorded for this shift.' : history.map((h) => (
                                                  <div key={h.id} style={{ marginBottom: '4px' }}>
                                                    <strong>{fmtStamp(h.created_at)}</strong>, {h.edited_by_name || 'Someone'}:{' '}
                                                    {h.action === 'approve'
                                                      ? 'approved'
                                                      : `changed ${h.old_clock_in ? hhmm(new Date(h.old_clock_in)) : '?'} to ${h.old_clock_out ? hhmm(new Date(h.old_clock_out)) : 'open'} (${h.old_hours ?? 0}h) into ${hhmm(new Date(h.new_clock_in))} to ${hhmm(new Date(h.new_clock_out))} (${h.new_hours}h). Reason: ${h.note}`}
                                                  </div>
                                                ))}
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
