// src/components/WeekSummary.jsx
// "This week" and "Coming up" beside the time clock.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStartOfWeek, todayLocal, prettyDate } from '../lib/dates';

const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

export default function WeekSummary({ userId }) {
  const [hours, setHours] = useState(null);
  const [shiftsWorked, setShiftsWorked] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [upcoming, setUpcoming] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    load();
    const timer = setInterval(load, 30000); // picks up a clock-out without a page change
    window.addEventListener('focus', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [userId]);

  const load = async () => {
    const weekStart = getStartOfWeek(new Date());
    const [logsRes, shiftsRes] = await Promise.all([
      supabase.from('time_logs').select('total_hours, clock_out, status')
        .eq('user_id', userId).gte('clock_in', weekStart.toISOString()),
      supabase.from('shifts').select('id, shift_date, start_time, end_time, location, status')
        .eq('user_id', userId).gte('shift_date', todayLocal()).order('shift_date').limit(5),
    ]);
    if (logsRes.error || shiftsRes.error) {
      setFailed(true);
      return;
    }
    setFailed(false);
    const logs = logsRes.data || [];
    setHours(logs.reduce((sum, l) => sum + parseFloat(l.total_hours || 0), 0));
    setShiftsWorked(logs.filter((l) => l.clock_out).length);
    setWaiting(logs.filter((l) => l.clock_out && l.status !== 'Approved').length);
    setUpcoming((shiftsRes.data || []).filter((s) => s.status !== 'Declined').slice(0, 3));
  };

  return (
    <div>
      <section className="rt-week">
        <h3>This week</h3>
        <p className="rt-sub">Weeks run Friday to Thursday.</p>
        {failed ? (
          <div className="rt-empty">Could not load your hours. Check your connection and try again.</div>
        ) : (
          <>
            <div className="rt-kv"><span>Hours worked</span><b>{hours === null ? '...' : hours.toFixed(2)}</b></div>
            <div className="rt-kv"><span>Shifts finished</span><b>{shiftsWorked}</b></div>
            <div className="rt-kv"><span>Waiting for approval</span><b>{waiting}</b></div>
          </>
        )}
      </section>

      <section className="rt-week rt-week-gap">
        <h3>Coming up</h3>
        {upcoming.length === 0 ? (
          <div className="rt-empty">No shifts on the roster yet.</div>
        ) : (
          upcoming.map((s) => (
            <div className="rt-up" key={s.id}>
              <b>{prettyDate(s.shift_date)}</b>, {hhmm(s.start_time)} to {hhmm(s.end_time)}
              <small>{s.location || 'Site not set'}</small>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
