import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeeklyAvailability({ user }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  useEffect(() => {
    if (user?.id) fetchAvailability();
  }, [user, currentWeekStart]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('weekly_availability')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      if (error) throw error;

      const availMap = {};
      DAYS.forEach(day => {
        availMap[day] = {
          isAvailable: true,
          startTime: '08:30',
          endTime: '16:30'
        };
      });

      (data || []).forEach(item => {
        if (item && item.day) {
          availMap[item.day] = {
            isAvailable: Boolean(item.is_available),
            startTime: item.start_time || '08:30',
            endTime: item.end_time || '16:30'
          };
        }
      });

      setAvailability(availMap);
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  // SAFELY TOGGLE AVAILABILITY (PREVENTS REACT NULL POINTER CRASHES)
  const toggleDay = (e, day) => {
    if (e && e.preventDefault) e.preventDefault();

    setAvailability(prev => {
      const currentObj = prev[day] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };
      return {
        ...prev,
        [day]: {
          ...currentObj,
          isAvailable: !currentObj.isAvailable
        }
      };
    });
  };

  const handleTimeChange = (day, field, value) => {
    setAvailability(prev => {
      const currentObj = prev[day] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };
      return {
        ...prev,
        [day]: {
          ...currentObj,
          [field]: value
        }
      };
    });
  };

  const handleSaveAvailability = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setMsg({ text: '', isError: false });

    const weekStartStr = currentWeekStart.toISOString().split('T')[0];

    try {
      const recordsToUpsert = DAYS.map(day => {
        const item = availability[day] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };
        return {
          user_id: user.id,
          day,
          week_start: weekStartStr,
          is_available: item.isAvailable,
          start_time: item.startTime,
          end_time: item.endTime,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('weekly_availability')
        .upsert(recordsToUpsert, { onConflict: 'user_id, day, week_start' });

      if (error) throw error;
      setMsg({ text: '💾 Availability saved successfully!', isError: false });
    } catch (err) {
      console.error(err);
      setMsg({ text: `❌ Save failed: ${err.message}`, isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const handleRepeatNextWeek = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setMsg({ text: '', isError: false });

    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];

    try {
      const clonedRecords = DAYS.map(day => {
        const item = availability[day] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };
        return {
          user_id: user.id,
          day,
          week_start: nextWeekStartStr,
          is_available: item.isAvailable,
          start_time: item.startTime,
          end_time: item.endTime,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('weekly_availability')
        .upsert(clonedRecords, { onConflict: 'user_id, day, week_start' });

      if (error) throw error;

      setMsg({ text: '🔄 Current availability copied to next week!', isError: false });
    } catch (err) {
      console.error(err);
      setMsg({ text: `❌ Repeat failed: ${err.message}`, isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>⏱️ My Weekly Availability</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Set available shift times or repeat settings into future weeks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={handleSaveAvailability} disabled={saving} style={primaryBtnStyle}>
            💾 Save
          </button>
          <button type="button" onClick={handleRepeatNextWeek} disabled={saving} style={secondaryBtnStyle}>
            🔄 Repeat Next Week
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{
          padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
          color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {/* WEEK SELECTION BAR */}
      <div style={weekNavHeaderStyle}>
        <button type="button" onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev Week</button>
        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
          Week: {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button type="button" onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next Week ▶</button>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ color: '#64748b' }}>Loading availability settings...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DAYS.map(day => {
              const dayData = availability[day] || { isAvailable: true, startTime: '08:30', endTime: '16:30' };

              return (
                <div key={day} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={(e) => toggleDay(e, day)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold',
                        fontSize: '12px', cursor: 'pointer',
                        backgroundColor: dayData.isAvailable ? '#dcfce7' : '#fee2e2',
                        color: dayData.isAvailable ? '#15803d' : '#dc2626'
                      }}
                    >
                      {dayData.isAvailable ? '✓ Available' : '✕ Unavailable'}
                    </button>

                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', width: '90px' }}>{day}</span>
                  </div>

                  {dayData.isAvailable ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>From:</span>
                      <input
                        type="time"
                        value={dayData.startTime || '08:30'}
                        onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                        style={timeInputStyle}
                      />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>To:</span>
                      <input
                        type="time"
                        value={dayData.endTime || '16:30'}
                        onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                        style={timeInputStyle}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>
                      🔴 Marked Unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Styles
const primaryBtnStyle = { padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const secondaryBtnStyle = { padding: '8px 14px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '16px', border: '1px solid #cbd5e1' };
const weekNavBtnStyle = { padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' };
const timeInputStyle = { padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', color: '#0f172a' };