// src/components/ShiftRoster.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatLocalDate, getStartOfWeek } from '../lib/dates';

export default function ShiftRoster({ user }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);



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

  const DAYS_OF_WEEK = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', color: '#16212B' }}>My Shift Schedule</h2>
        <p style={{ margin: '4px 0 0 0', color: '#5E6A76', fontSize: '13px' }}>
          Your upcoming work assignments and accepted shift details for the week.
        </p>
      </div>

      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev Week</button>
        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#16212B' }}>
          Week of {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next Week ▶</button>
      </div>

      {loading ? (
        <div style={emptyCardStyle}>Loading your shift schedule...</div>
      ) : shifts.length === 0 ? (
        <div style={emptyCardStyle}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}></div>
          <h3 style={{ margin: 0, color: '#3A4753' }}>No Shifts Scheduled This Week</h3>
          <p style={{ margin: '4px 0 0 0', color: '#8B97A3', fontSize: '13px' }}>
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
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#16212B' }}>{dayName}</span>
                    <span style={{ fontSize: '12px', color: '#5E6A76', marginLeft: '8px' }}>
                      {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <span style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold',
                    backgroundColor: dayShift.status === 'Accepted' ? '#dcfce7' : '#D7E5EE',
                    color: dayShift.status === 'Accepted' ? '#15803d' : '#1e40af'
                  }}>
                    {dayShift.status ? dayShift.status.toUpperCase() : 'CONFIRMED'}
                  </span>
                </div>

                <div style={timingBoxStyle}>
                  <div style={{ fontSize: '12px', color: '#5E6A76', fontWeight: 'bold', }}>Shift Hours</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2F5D7C', marginTop: '2px' }}>
                    {formatTimeString(dayShift.start_time)} – {formatTimeString(dayShift.end_time)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4A5763', marginTop: '12px' }}>
                  <span><strong>Site Location:</strong> {dayShift.location || user?.location || 'Site not set'}</span>
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
const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', backgroundColor: '#EDF0F2', borderRadius: '8px', marginBottom: '20px', border: '1px solid #C9D1D8' };
const weekNavBtnStyle = { padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #C9D1D8', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: '#3A4753' };
const emptyCardStyle = { backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', border: '1px dashed #C9D1D8', textAlign: 'center' };

const shiftCardStyle = { backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '2px solid #bfdbfe', };
const timingBoxStyle = { backgroundColor: '#F5F7F8', padding: '12px 14px', borderRadius: '10px', border: '1px solid #D8DEE3' };