// src/components/ManagerInstantAvailabilityView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatLocalDate, getStartOfWeek } from '../lib/dates';

export default function ManagerInstantAvailabilityView({ department, location }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState('Friday');
  const [staffRoster, setStaffRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [msg, setMsg] = useState('');

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  useEffect(() => {
    fetchAvailableStaff();
  }, [department, currentWeekStart, selectedDay]);

  const fetchAvailableStaff = async () => {
    setLoading(true);
    const weekStartStr = formatLocalDate(currentWeekStart);

    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, role')
        .eq('active', true);

      if (pErr) throw pErr;

      let activeStaff = (profiles || []).filter(
        (p) => String(p.role || '').toLowerCase() !== 'admin'
      );

      if (department && department !== 'All Departments' && department !== 'All Staff') {
        const targetDept = department.trim().toLowerCase();
        activeStaff = activeStaff.filter((p) => {
          if (!p.department) return true;
          return p.department.trim().toLowerCase().includes(targetDept);
        });
      }

      const { data: availData, error: aErr } = await supabase
        .from('weekly_availability')
        .select('*')
        .eq('day', selectedDay);

      if (aErr) console.warn('Availability query warning:', aErr.message);

      const availMap = {};
      (availData || []).forEach((a) => {
        const isSpecific = a.week_start === weekStartStr;
        if (a.week_start && !isSpecific) return; // other week
        if (!isSpecific && availMap[a.user_id]?.specific) return; // week-specific row wins
        availMap[a.user_id] = {
          isAvailable: Boolean(a.is_available),
          startTime: a.start_time ? String(a.start_time).slice(0, 5) : '08:30',
          endTime: a.end_time ? String(a.end_time).slice(0, 5) : '16:30',
          specific: isSpecific,
        };
      });

      const processed = activeStaff.map((staff) => {
        const pref = availMap[staff.id];
        const isAvail = pref ? pref.isAvailable : true;
        const timing = pref ? `${pref.startTime} - ${pref.endTime}` : '08:30 - 16:30';

        return {
          ...staff,
          isAvailable: isAvail,
          timing,
        };
      });

      setStaffRoster(processed);
    } catch (err) {
      console.error('Error fetching instant availability staff:', err);
      setStaffRoster([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInstantOffer = async (staffMember) => {
    if (!location) {
      setMsg('❌ Your profile has no site set, so the offer would have no location. Ask an admin to set your site.');
      setTimeout(() => setMsg(''), 5000);
      return;
    }
    setSendingId(staffMember.id);
    const daysArr = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayIndex = daysArr.indexOf(selectedDay);
    const shiftDateObj = new Date(currentWeekStart);
    shiftDateObj.setDate(shiftDateObj.getDate() + dayIndex);
    const shiftDateStr = formatLocalDate(shiftDateObj);

    try {
      const { data: existing } = await supabase
        .from('shift_offers')
        .select('id')
        .eq('employee_id', staffMember.id)
        .eq('shift_date', shiftDateStr)
        .eq('status', 'Pending')
        .limit(1);

      if (existing && existing.length > 0) {
        setMsg(`⚠️ ${staffMember.full_name} already has a pending offer for ${shiftDateStr}.`);
        return;
      }

      const { error } = await supabase.from('shift_offers').insert([
        {
          employee_id: staffMember.id,
          employee_email: (staffMember.email || '').trim().toLowerCase(),
          day: selectedDay,
          week_start: formatLocalDate(currentWeekStart),
          shift_date: shiftDateStr,
          location,
          shift_time: staffMember.timing || '08:30 - 16:30',
          status: 'Pending',
        },
      ]);

      if (error) throw error;
      setMsg(`✅ Offer sent to ${staffMember.full_name} for ${selectedDay} (${shiftDateStr})!`);
    } catch (err) {
      setMsg(`❌ Offer dispatch failed: ${err.message}`);
    } finally {
      setSendingId(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: '18px', color: '#16212B' }}>Instant Staff Availability & Shift Offers</h2>
      <p style={{ color: '#5E6A76', fontSize: '12px', marginTop: '2px', marginBottom: '16px' }}>Select week and day to inspect availability and send shift invitations.</p>

      {msg && <div style={{ padding: '10px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '500', marginBottom: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#EDF0F2', borderRadius: '10px', marginBottom: '14px', border: '1px solid #C9D1D8', flexWrap: 'wrap', gap: '6px' }}>
        <button onClick={() => changeWeek(-1)} style={{ padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #C9D1D8', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#3A4753' }}>◀ Prev</button>
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#16212B', textAlign: 'center' }}>
          {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button onClick={() => changeWeek(1)} style={{ padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #C9D1D8', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#3A4753' }}>Next ▶</button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
        {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day, idx) => {
          const dateObj = new Date(currentWeekStart);
          dateObj.setDate(dateObj.getDate() + idx);
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flexShrink: 0,
                backgroundColor: selectedDay === day ? '#2F5D7C' : '#D8DEE3',
                color: selectedDay === day ? '#ffffff' : '#3A4753'
              }}
            >
              <div>{day.slice(0, 3)}</div>
              <div style={{ fontSize: '9px', opacity: 0.8 }}>{dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</div>
            </button>
          );
        })}
      </div>

      <div style={{ backgroundColor: '#F5F7F8', padding: '14px', borderRadius: '8px', border: '1px solid #D8DEE3' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#16212B' }}>
          Availability for <strong>{selectedDay}</strong> ({department || 'All Staff'})
        </h4>

        {loading ? (
          <div style={{ padding: '12px', color: '#5E6A76', fontSize: '12px' }}>Checking staff availability...</div>
        ) : staffRoster.length === 0 ? (
          <div style={{ padding: '12px', color: '#8B97A3', fontSize: '12px' }}>No employees registered in the system.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #D8DEE3', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffRoster.map((staff) => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid #EDF0F2' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#16212B', wordBreak: 'break-word' }}>{staff.full_name || 'Unnamed Staff'}</td>
                    <td style={{ padding: '8px', color: '#5E6A76', wordBreak: 'break-all' }}>{staff.email}</td>
                    <td style={{ padding: '8px' }}>
                      {staff.isAvailable ? (
                        <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', whiteSpace: 'nowrap' }}>
                          Available ({staff.timing})
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#dc2626', whiteSpace: 'nowrap' }}>
                          Marked Unavailable
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleSendInstantOffer(staff)}
                        disabled={sendingId === staff.id || !staff.isAvailable}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: staff.isAvailable ? 'pointer' : 'not-allowed',
                          backgroundColor: !staff.isAvailable ? '#C9D1D8' : sendingId === staff.id ? '#8B97A3' : '#2F5D7C',
                          color: '#ffffff',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {!staff.isAvailable ? 'Unavailable' : sendingId === staff.id ? 'Sending...' : 'Offer Shift'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
