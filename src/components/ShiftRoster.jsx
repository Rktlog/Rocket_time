// src/components/ShiftRoster.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ShiftRoster({ user }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  useEffect(() => {
    if (user) fetchEmployeeRoster();
  }, [user, currentWeekStart]);

  const fetchEmployeeRoster = async () => {
    setLoading(true);
    const weekStartStr = formatLocalDate(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = formatLocalDate(weekEnd);

    const cleanEmail = (user.email || '').trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .or(`user_id.eq.${user.id},offered_to_email.ilike.${cleanEmail}`)
        .gte('shift_date', weekStartStr)
        .lt('shift_date', weekEndStr)
        .order('shift_date', { ascending: true });

      if (error) throw error;

      // Deduplicate shifts by shift_date in memory
      const uniqueMap = {};
      (data || []).forEach(s => {
        if (!uniqueMap[s.shift_date]) {
          uniqueMap[s.shift_date] = s;
        }
      });

      setShifts(Object.values(uniqueMap));
    } catch (err) {
      console.error('Error fetching employee roster:', err);
      setShifts([]);
    } finally {
      setLoading(false);
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

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>📅 My Shift Schedule</h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
          Your upcoming work assignments and accepted shift details for the week.
        </p>
      </div>

      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev Week</button>
        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
          Week of {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next Week ▶</button>
      </div>

      {loading ? (
        <div style={emptyCardStyle}>Loading your shift schedule...</div>
      ) : shifts.length === 0 ? (
        <div style={emptyCardStyle}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>☕</div>
          <h3 style={{ margin: 0, color: '#334155' }}>No Shifts Scheduled This Week</h3>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Accepted shift offers and assigned rosters will automatically appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {DAYS_OF_WEEK.map((dayName, idx) => {
            const dateObj = new Date(currentWeekStart);
            dateObj.setDate(dateObj.getDate() + idx);
            const dateStr = formatLocalDate(dateObj);
            const dayShift = shifts.find(s => s.shift_date === dateStr);

            if (!dayShift) return null;

            return (
              <div key={dateStr} style={shiftCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{dayName}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                      {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    backgroundColor: dayShift.status === 'Accepted' ? '#dcfce7' : '#dbeafe',
                    color: dayShift.status === 'Accepted' ? '#15803d' : '#1e40af'
                  }}>
                    {dayShift.status ? dayShift.status.toUpperCase() : 'CONFIRMED'}
                  </span>
                </div>

                <div style={timingBoxStyle}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Shift Hours</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb', marginTop: '2px' }}>
                    ⏰ {formatTimeString(dayShift.start_time)} – {formatTimeString(dayShift.end_time)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', marginTop: '12px' }}>
                  <span>📍 <strong>Site Location:</strong> Englite Campbellfield</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline Styles
const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', backgroundColor: '#f1f5f9', borderRadius: '12px', marginBottom: '20px', border: '1px solid #cbd5e1' };
const weekNavBtnStyle = { padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: '#334155' };
const emptyCardStyle = { backgroundColor: '#ffffff', padding: '40px', borderRadius: '14px', border: '1px dashed #cbd5e1', textAlign: 'center' };

const shiftCardStyle = { backgroundColor: '#ffffff', padding: '20px', borderRadius: '14px', border: '2px solid #bfdbfe', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' };
const timingBoxStyle = { backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' };