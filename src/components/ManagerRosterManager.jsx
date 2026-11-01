// src/components/ManagerRosterManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { formatLocalDate, getStartOfWeek } from '../lib/dates';

const DAYS_OF_WEEK = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function ManagerRosterManager({ department }) {
  const [activeSubTab, setActiveTab] = useState('approved'); // 'approved' or 'grid'
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [staffList, setStaffRoster] = useState([]);
  const [availabilities, setAvailabilities] = useState({});
  
  const [draftShifts, setDraftShifts] = useState({});
  const [publishedShifts, setPublishedShifts] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });



  const changeWeek = (offset) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        '⚠️ You have unsaved changes on this week\'s Roster Grid!\n\nClick OK to discard changes, or Cancel to stay and Save & Publish.'
      );
      if (!confirmLeave) return;
    }

    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    fetchRosterData();
  }, [department, currentWeekStart]);

  const fetchRosterData = async () => {
    setLoading(true);
    const weekStartStr = formatLocalDate(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = formatLocalDate(weekEnd);

    try {
      // 1. Fetch Staff Members
      let staffQuery = supabase.from('profiles').select('id, full_name, email, department, location').neq('role', 'admin').eq('active', true);
      if (department && department !== 'All Departments') {
        staffQuery = staffQuery.or(`department.ilike.${department.trim()},department.is.null`);
      }
      const { data: staffData } = await staffQuery;
      setStaffRoster(staffData || []);

      // 2. Fetch Availability including custom start & end times
      const { data: availData } = await supabase
        .from('weekly_availability')
        .select('*')
        .or(`week_start.eq.${weekStartStr},week_start.is.null`);

      const availMap = {};
      (availData || []).forEach(a => {
        const cleanStart = a.start_time ? String(a.start_time).slice(0, 5) : '08:30';
        const cleanEnd = a.end_time ? String(a.end_time).slice(0, 5) : '16:30';

        const k = `${a.user_id}_${a.day}`;
        const isSpecific = a.week_start === weekStartStr;
        if (!isSpecific && availMap[k]?.specific) return; // week-specific row wins over template
        availMap[k] = {
          isAvailable: Boolean(a.is_available),
          startTime: cleanStart,
          endTime: cleanEnd,
          specific: isSpecific
        };
      });
      setAvailabilities(availMap);

      // 3. Fetch Weekly Approved Roster
      const { data: shiftData, error: shiftErr } = await supabase
        .from('shifts')
        .select('*')
        .gte('shift_date', weekStartStr)
        .lt('shift_date', weekEndStr)
        .order('shift_date', { ascending: true });

      if (shiftErr) throw shiftErr;

      // Deduplicate fetched rows in memory by user_id + shift_date
      const uniqueShifts = [];
      const seenKeys = new Set();
      (shiftData || []).forEach(s => {
        const key = `${s.user_id}_${s.shift_date}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueShifts.push(s);
        }
      });

      setPublishedShifts(uniqueShifts);

      // 4. Rebuild draft shifts grid strictly from active DB records
      const initialGrid = {};
      uniqueShifts.forEach(s => {
        const parseTimeStr = (rawVal) => {
          if (!rawVal) return '08:30';
          if (String(rawVal).includes('T')) {
            const dateObj = new Date(rawVal);
            return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          }
          return String(rawVal).slice(0, 5);
        };

        initialGrid[`${s.user_id}_${s.shift_date}`] = {
          startTime: parseTimeStr(s.start_time),
          endTime: parseTimeStr(s.end_time),
          isAssigned: true,
          status: s.status || 'Assigned',
          id: s.id
        };
      });

      setDraftShifts(initialGrid);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStaffDayAvailability = (staffId, dayName) => {
    const key = `${staffId}_${dayName}`;
    return availabilities[key] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };
  };

  const toggleShiftAssignment = (staffId, dateStr, dayName) => {
    const dayAvail = getStaffDayAvailability(staffId, dayName);
    if (!dayAvail.isAvailable) return;

    setHasUnsavedChanges(true);
    const key = `${staffId}_${dateStr}`;
    setDraftShifts(prev => {
      const nextState = { ...prev };
      if (nextState[key] && nextState[key].isAssigned) {
        delete nextState[key]; // Directly delete unassigned key
      } else {
        nextState[key] = {
          startTime: dayAvail.startTime || '08:30',
          endTime: dayAvail.endTime || '16:30',
          isAssigned: true,
          status: 'Assigned'
        };
      }
      return nextState;
    });
  };

  const handleTimeChange = (draftKey, field, val) => {
    setHasUnsavedChanges(true);
    setDraftShifts(prev => ({
      ...prev,
      [draftKey]: {
        ...prev[draftKey],
        [field]: val
      }
    }));
  };

  // TIMEZONE-SAFE SAVE AND PUBLISH FUNCTION
  const handleSaveAndPublish = async () => {
    setSaving(true);
    setMsg({ text: '', isError: false });

    // Generate accurate 7 local date strings for current week
    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      datesOfWeek.push(formatLocalDate(d));
    }

    try {
      const recordsMap = new Map();

      Object.entries(draftShifts).forEach(([key, value]) => {
        if (value.isAssigned) {
          const [userId, dateStr] = key.split('_');

          // Process only shifts that belong to this week
          if (datesOfWeek.includes(dateStr)) {
            const staffObj = staffList.find(s => s.id === userId);
            if (!staffObj) return; // never touch shifts of staff outside this department

            const startTimeStr = value.startTime.length === 5 ? `${value.startTime}:00` : value.startTime;
            const endTimeStr = value.endTime.length === 5 ? `${value.endTime}:00` : value.endTime;

            const startIso = new Date(`${dateStr}T${startTimeStr}`).toISOString();
            const endIso = new Date(`${dateStr}T${endTimeStr}`).toISOString();

            const compositeKey = `${userId}_${dateStr}`;

            recordsMap.set(compositeKey, {
              user_id: userId,
              employee_name: staffObj?.full_name || 'Employee',
              offered_to_email: staffObj?.email || '',
              department: staffObj?.department || department || 'Unassigned',
              ...(staffObj?.location ? { location: staffObj.location } : {}),
              shift_date: dateStr,
              start_time: startIso,
              end_time: endIso,
              status: value.status || 'Assigned'
            });
          }
        }
      });

      const recordsToUpsert = Array.from(recordsMap.values());

      // Only shifts for THIS department's staff are ever changed.
      const staffIds = new Set(staffList.map(s => s.id));
      const keepKeys = new Set(recordsToUpsert.map(rec => `${rec.user_id}_${rec.shift_date}`));
      const removeIds = publishedShifts
        .filter(s => staffIds.has(s.user_id) && !keepKeys.has(`${s.user_id}_${s.shift_date}`))
        .map(s => s.id);

      // 1. Save active shifts first (a failure here changes nothing)
      if (recordsToUpsert.length > 0) {
        await expectRows(
          supabase.from('shifts').upsert(recordsToUpsert, { onConflict: 'user_id,shift_date' }),
          'publish the roster',
          recordsToUpsert.length
        );
      }

      // 2. Then remove only the shifts the manager unassigned
      if (removeIds.length > 0) {
        await expectRows(supabase.from('shifts').delete().in('id', removeIds), 'remove unassigned shifts', removeIds.length);
      }

      setMsg({ text: '✅ Roster saved and published for this week!', isError: false });
      setHasUnsavedChanges(false);
      await fetchRosterData();
    } catch (err) {
      console.error('Publish error:', err);
      setMsg({ text: `❌ Save failed: ${err.message}`, isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  // DELETE PUBLISHED SHIFT
  const handleDeletePublishedShift = async (shift) => {
    try {
      await expectRows(supabase.from('shifts').delete().eq('id', shift.id), 'remove the shift');

      // Instantly purge key from draft state & approved view
      const draftKey = `${shift.user_id}_${shift.shift_date}`;
      setDraftShifts(prev => {
        const nextState = { ...prev };
        delete nextState[draftKey];
        return nextState;
      });

      setPublishedShifts(prev => prev.filter(s => s.id !== shift.id));
      setMsg({ text: 'Shift permanently removed from roster.', isError: false });
    } catch (err) {
      setMsg({ text: `❌ Delete failed: ${err.message}`, isError: true });
    } finally {
      setTimeout(() => setMsg({ text: '', isError: false }), 3000);
    }
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatTimeString = (rawVal) => {
    if (!rawVal) return '08:30';
    if (String(rawVal).includes('T')) {
      const dateObj = new Date(rawVal);
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return String(rawVal).slice(0, 5);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#16212B', fontSize: '18px' }}>Department Shift Roster</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#5E6A76' }}>
            Set times on the Roster Grid and publish approved weekly schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer',
              backgroundColor: activeSubTab === 'approved' ? '#2F5D7C' : '#EDF0F2',
              color: activeSubTab === 'approved' ? '#ffffff' : '#4A5763'
            }}
          >
            Approved Roster
          </button>

          <button
            onClick={() => setActiveTab('grid')}
            style={{
              padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer',
              backgroundColor: activeSubTab === 'grid' ? '#2F5D7C' : '#EDF0F2',
              color: activeSubTab === 'grid' ? '#ffffff' : '#4A5763'
            }}
          >
            Roster Grid {hasUnsavedChanges && '●'}
          </button>

          <button onClick={handleSaveAndPublish} disabled={saving} style={primaryBtnStyle}>
            {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {/* WEEKLY NAVIGATION BAR */}
      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#16212B' }}>
            Week of {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {hasUnsavedChanges && (
            <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 'bold', marginTop: '2px' }}>
              ⚠️ You have unsaved grid edits
            </div>
          )}
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next ▶</button>
      </div>

      {activeSubTab === 'approved' ? (
        /* SECTION 1: APPROVED ROSTER */
        <div>
          {loading ? (
            <div style={emptyCardStyle}>Loading Approved Roster...</div>
          ) : publishedShifts.length === 0 ? (
            <div style={emptyCardStyle}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>No Approved Roster For This Week</h3>
              <p style={{ margin: '4px 0 0 0', color: '#8B97A3', fontSize: '12px' }}>
                Use the Roster Grid tab to assign shifts and click "Save & Publish".
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {DAYS_OF_WEEK.map((dayName, idx) => {
                const dateObj = new Date(currentWeekStart);
                dateObj.setDate(dateObj.getDate() + idx);
                const dateStr = formatLocalDate(dateObj);
                const dayShifts = publishedShifts.filter(s => s.shift_date === dateStr);

                return (
                  <div key={dayName} style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #D8DEE3', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #EDF0F2', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#16212B' }}>{dayName}</span>
                        <span style={{ fontSize: '11px', fontWeight: '500', color: '#5E6A76' }}>
                          {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: dayShifts.length > 0 ? '#2F5D7C' : '#8B97A3', backgroundColor: dayShifts.length > 0 ? '#E8F0F5' : '#F5F7F8', padding: '3px 8px', borderRadius: '8px' }}>
                        {dayShifts.length} {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                      </span>
                    </div>

                    {dayShifts.length === 0 ? (
                      <div style={{ color: '#8B97A3', fontSize: '12px', fontStyle: 'italic', padding: '4px 0' }}>
                        No shifts scheduled for this day
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                        {dayShifts.map((s) => (
                          <div key={s.id} style={shiftCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={avatarStyle}>
                                  {(s.employee_name || 'E').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#16212B', wordBreak: 'break-word' }}>
                                    {s.employee_name || 'Employee'}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#5E6A76' }}>
                                    {s.location || 'Site not set'}
                                  </div>
                                </div>
                              </div>

                              <button onClick={() => handleDeletePublishedShift(s)} style={cardDeleteBtnStyle}></button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #D8DEE3' }}>
                              <span style={timePillStyle}>
                                {formatTimeString(s.start_time)} – {formatTimeString(s.end_time)}
                              </span>

                              <span style={{
                                padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                                backgroundColor: s.status === 'Accepted' ? '#dcfce7' : '#D7E5EE',
                                color: s.status === 'Accepted' ? '#15803d' : '#1e40af'
                              }}>
                                {s.status === 'Accepted' ? 'Accepted' : 'Assigned'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SECTION 2: ROSTER GRID */
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #D8DEE3' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#5E6A76', fontSize: '12px' }}>Loading Roster Grid...</div>
          ) : staffList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8B97A3', fontSize: '12px' }}>No staff found.</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F7F8', borderBottom: '2px solid #D8DEE3', textAlign: 'left' }}>
                    <th style={{ padding: '8px', minWidth: '130px' }}>Staff Member</th>
                    {DAYS_OF_WEEK.map((dayName, idx) => {
                      const dateObj = new Date(currentWeekStart);
                      dateObj.setDate(dateObj.getDate() + idx);
                      return (
                        <th key={dayName} style={{ padding: '8px', textAlign: 'center', minWidth: '130px' }}>
                          <div>{dayName}</div>
                          <div style={{ fontSize: '10px', color: '#5E6A76', fontWeight: 'normal' }}>
                            {dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff) => (
                    <tr key={staff.id} style={{ borderBottom: '1px solid #EDF0F2' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#16212B', wordBreak: 'break-word' }}>
                        {staff.full_name || 'Unnamed'}
                      </td>

                      {DAYS_OF_WEEK.map((dayName, idx) => {
                        const dateObj = new Date(currentWeekStart);
                        dateObj.setDate(dateObj.getDate() + idx);
                        const dateStr = formatLocalDate(dateObj);
                        const draftKey = `${staff.id}_${dateStr}`;
                        const shiftData = draftShifts[draftKey];
                        const isAssigned = shiftData?.isAssigned;
                        const dayAvail = getStaffDayAvailability(staff.id, dayName);

                        return (
                          <td key={dateStr} style={{ padding: '6px', textAlign: 'center' }}>
                            {!dayAvail.isAvailable ? (
                              <div style={unavailableStyle}>Unavailable</div>
                            ) : isAssigned ? (
                              <div style={assignedBoxStyle}>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                                  <input
                                    type="time"
                                    value={shiftData.startTime}
                                    onChange={(e) => handleTimeChange(draftKey, 'startTime', e.target.value)}
                                    style={timeInputStyle}
                                  />
                                  <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 'bold' }}>-</span>
                                  <input
                                    type="time"
                                    value={shiftData.endTime}
                                    onChange={(e) => handleTimeChange(draftKey, 'endTime', e.target.value)}
                                    style={timeInputStyle}
                                  />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: shiftData.status === 'Accepted' ? '#15803d' : '#2F5D7C' }}>
                                    {shiftData.status === 'Accepted' ? 'Accepted' : 'Assigned'}
                                  </span>
                                  <button onClick={() => toggleShiftAssignment(staff.id, dateStr, dayName)} style={removeShiftBtnStyle}></button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => toggleShiftAssignment(staff.id, dateStr, dayName)} style={assignBtnStyle}>
                                Assign ({dayAvail.startTime}-{dayAvail.endTime})
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline Styles
const primaryBtnStyle = { padding: '8px 14px', backgroundColor: '#2F5D7C', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#EDF0F2', borderRadius: '8px', marginBottom: '16px', border: '1px solid #C9D1D8', flexWrap: 'wrap', gap: '6px' };
const weekNavBtnStyle = { padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #C9D1D8', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#3A4753' };
const emptyCardStyle = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px dashed #C9D1D8', textAlign: 'center' };

const shiftCardStyle = { backgroundColor: '#F5F7F8', padding: '12px', borderRadius: '10px', border: '1px solid #D8DEE3', };
const avatarStyle = { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2F5D7C', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' };
const cardDeleteBtnStyle = { background: 'none', border: 'none', color: '#dc2626', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' };
const timePillStyle = { backgroundColor: '#E8F0F5', color: '#244A63', padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' };

const unavailableStyle = { padding: '4px 2px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 'bold', fontSize: '10px' };
const assignedBoxStyle = { padding: '4px 6px', borderRadius: '6px', border: '1px solid #16a34a', backgroundColor: '#dcfce7' };
const timeInputStyle = { width: '60px', padding: '2px 1px', border: '1px solid #86efac', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff', outline: 'none' };
const removeShiftBtnStyle = { background: 'none', border: 'none', color: '#dc2626', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', padding: '0 2px' };
const assignBtnStyle = { width: '100%', padding: '5px 2px', borderRadius: '6px', border: '1px dashed #C9D1D8', backgroundColor: '#ffffff', color: '#5E6A76', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', wordBreak: 'break-all' };