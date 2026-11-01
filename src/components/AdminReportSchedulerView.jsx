// src/components/AdminReportSchedulerView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { viewHeadingStyle, cardStyle, subTextStyle, labelStyle, inputStyle, successBannerStyle, declineBtnStyle, btnStyle } from '../lib/styles';

export default function AdminReportSchedulerView() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [dispatchDay, setDispatchDay] = useState('Friday');
  const [dispatchTime, setDispatchTime] = useState('08:00');
  const [frequency, setFrequency] = useState('Weekly');
  const [schedules, setSchedules] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase.from('report_schedules').select('*');
      if (!error && data) setSchedules(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!recipientEmail) return;

    const newObj = { email: recipientEmail, day: dispatchDay, time: dispatchTime, freq: frequency };

    const { data, error } = await supabase.from('report_schedules').insert([newObj]).select();
    if (error || !data) {
      setMsg(`❌ Could not save schedule: ${error?.message || 'unknown error'}`);
      setTimeout(() => setMsg(''), 4000);
      return;
    }

    setSchedules([...schedules, data[0]]);
    setMsg(`✅ Saved ${frequency} report to ${recipientEmail} on ${dispatchDay}s at ${dispatchTime}.`);
    setTimeout(() => setMsg(''), 4000);
    setRecipientEmail('');
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await expectRows(supabase.from('report_schedules').delete().eq('id', id), 'remove the schedule');
    } catch (error) {
      setMsg(`❌ ${error.message}`);
      setTimeout(() => setMsg(''), 4000);
      return;
    }
    setSchedules(schedules.filter(s => s.id !== id));
  };

  return (
    <div>
      <h2 style={viewHeadingStyle}>Automated Timesheet Reports</h2>
      <p style={subTextStyle}>Configure recipient emails, dispatch days, and exact times for automated report delivery.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#16212B' }}>Schedule New Report</h3>
          
          <form onSubmit={handleCreateSchedule}>
            <label style={labelStyle}>Recipient Email Address</label>
            <input
              type="email"
              placeholder="e.g. manager@company.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}
            />

            <label style={labelStyle}>Report Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}
            >
              <option value="Weekly">Weekly Summary</option>
              <option value="Bi-Weekly">Bi-Weekly Summary</option>
              <option value="Monthly">Monthly Timesheet Report</option>
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Dispatch Day</label>
                <select
                  value={dispatchDay}
                  onChange={(e) => setDispatchDay(e.target.value)}
                  style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
                >
                  {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Dispatch Time</label>
                <input
                  type="time"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  required
                  style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
                />
              </div>
            </div>

            <button type="submit" style={btnStyle('#2F5D7C')}>Save Schedule</button>
          </form>

          {msg && <div style={{ ...successBannerStyle, marginTop: '14px' }}>{msg}</div>}
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#16212B' }}>Active Scheduled Reports</h3>

          {schedules.length === 0 ? (
            <div style={{ color: '#8B97A3', fontSize: '12px' }}>No active report schedules configured in Supabase.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedules.map(sch => (
                <div key={sch.id} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #C9D1D8', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#16212B', wordBreak: 'break-all' }}>{sch.email}</div>
                    <div style={{ fontSize: '11px', color: '#5E6A76', marginTop: '2px' }}>
                      {sch.freq} on <strong>{sch.day}s at {sch.time}</strong>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSchedule(sch.id)} style={{ ...declineBtnStyle, padding: '4px 6px', fontSize: '10px' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
