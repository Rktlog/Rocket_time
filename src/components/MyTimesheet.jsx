// src/components/MyTimesheet.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MyTimesheet({ user }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate start of week starting on THURSDAY
  function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay(); // Sunday = 0, Monday = 1, ..., Thursday = 4
    const diff = date.getDate() - day + (day < 4 ? -3 : 4);
    const thursday = new Date(date.setDate(diff));
    thursday.setHours(0, 0, 0, 0);
    return thursday;
  }

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  const resetToCurrentWeek = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  useEffect(() => {
    if (user) {
      fetchTimesheet();
    }
  }, [user, currentWeekStart]);

  const fetchTimesheet = async () => {
    setLoading(true);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      // 1. Primary Query: Query by user.id (UUID)
      let { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in', currentWeekStart.toISOString())
        .lt('clock_in', weekEnd.toISOString())
        .order('clock_in', { ascending: false });

      // 2. Fallback Query: Search by full_name if user_id query yielded no results
      if ((!data || data.length === 0) && user?.user_metadata?.full_name) {
        const nameQuery = await supabase
          .from('time_logs')
          .select('*')
          .eq('employee_name', user.user_metadata.full_name)
          .gte('clock_in', currentWeekStart.toISOString())
          .lt('clock_in', weekEnd.toISOString())
          .order('clock_in', { ascending: false });

        if (nameQuery.data && nameQuery.data.length > 0) {
          data = nameQuery.data;
        }
      }

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Fetch error:', err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const totalWeeklyHours = logs
    .reduce((sum, item) => sum + (parseFloat(item.total_hours) || 0), 0)
    .toFixed(2);
    
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div style={cardStyle}>
      {/* WEEK TOGGLE NAVIGATION HEADER */}
      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0f172a' }}>
            Week: {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={resetToCurrentWeek} style={todayBtnStyle}>Jump to Current Week</button>
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next ▶</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
            📋 Completed Timesheet History
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Weekly Paid Hours Total: <strong style={{ color: '#2563eb' }}>{totalWeeklyHours} hours</strong>
          </p>
        </div>
        <button onClick={fetchTimesheet} style={refreshBtnStyle}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '12px' }}>Loading timesheet logs...</div>
      ) : logs.length === 0 ? (
        <div style={emptyBoxStyle}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>No shift logs recorded for this week</p>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>Clock out from a shift to log your timesheet!</p>
        </div>
      ) : (
        /* RESPONSIVE SCROLLABLE TABLE WRAPPER */
        <div style={responsiveTableWrapper}>
          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Shift Date</th>
                <th style={{ padding: '8px' }}>🟢 Clock In</th>
                <th style={{ padding: '8px' }}>⏹ Clock Out</th>
                <th style={{ padding: '8px' }}>Shift Details</th>
                <th style={{ padding: '8px' }}>Bonus Mins</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total Paid Hours</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const clockInDate = log.clock_in ? new Date(log.clock_in) : null;
                const clockOutDate = log.clock_out ? new Date(log.clock_out) : null;

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {clockInDate ? clockInDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}
                    </td>
                    <td style={{ padding: '8px', color: '#15803d', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {clockInDate ? clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td style={{ padding: '8px', color: '#b91c1c', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {clockOutDate ? clockOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active / In Progress'}
                    </td>
                    <td style={{ padding: '8px', color: '#64748b' }}>
                      {log.no_break ? '☕ No Break Waived' : 'Standard Break'} 
                      {log.container_type && log.container_type !== 'none' ? ` | 📦 ${log.container_type}` : ''}
                    </td>
                    <td style={{ padding: '8px', color: '#16a34a', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      +{log.bonus_minutes_added || 0}m
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#2563eb', whiteSpace: 'nowrap' }}>
                      {log.total_hours || '0.00'}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const cardStyle = { backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' };
const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '14px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '6px' };
const weekNavBtnStyle = { padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#334155' };
const todayBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' };
const emptyBoxStyle = { textAlign: 'center', padding: '24px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' };
const refreshBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const responsiveTableWrapper = { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };