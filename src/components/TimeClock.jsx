// src/components/TimeClock.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { calculatePaidHours } from '../lib/hours';

export default function TimeClock({ employee, scheduledShift }) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeLogId, setActiveLogId] = useState(null);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dynamic Allocated Site State
  const [allocatedSite, setAllocatedSite] = useState({
    name: employee?.location || 'Unassigned Site',
    department: employee?.department || 'General',
    lat: null,
    lng: null,
    maxDistanceKm: 5.0,
    loaded: false,
  });

  // Shift Options
  const [hasNoBreak, setHasNoBreak] = useState(false);
  const [containerType, setContainerType] = useState('none');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  // 1. Background GPS Resolution from Database & Recovery
  useEffect(() => {
    resolveSiteGpsInBackground();
    checkActiveShift();
  }, [employee?.location, employee?.department]);

  const resolveSiteGpsInBackground = async () => {
    const siteName = employee?.location;
    if (!siteName) {
      setAllocatedSite(prev => ({ 
        ...prev, 
        department: employee?.department || 'General',
        loaded: true 
      }));
      return;
    }

    try {
      const { data: siteData, error } = await supabase
        .from('sites')
        .select('*')
        .ilike('name', siteName.trim())
        .maybeSingle();

      if (error) console.warn('Site lookup query warning:', error.message);

      const resolvedLat = siteData?.lat;
      const resolvedLng = siteData?.lng;
      const radiusKm = parseFloat(siteData?.radius_km || 5.0);
      const siteDept = siteData?.department || employee?.department || 'General';

      if (resolvedLat && resolvedLng) {
        setAllocatedSite({
          name: siteData?.name || siteName,
          department: siteDept,
          lat: parseFloat(resolvedLat),
          lng: parseFloat(resolvedLng),
          maxDistanceKm: radiusKm,
          loaded: true,
        });
      } else {
        setAllocatedSite({
          name: siteName,
          department: siteDept,
          lat: null,
          lng: null,
          maxDistanceKm: radiusKm,
          loaded: true,
        });
      }
    } catch (err) {
      console.error('Error resolving site GPS in background:', err);
      setAllocatedSite(prev => ({ ...prev, loaded: true }));
    }
  };

  const getEightPmCutoff = (referenceDate = new Date()) => {
    const cutoff = new Date(referenceDate);
    cutoff.setHours(20, 0, 0, 0); // 8:00:00 PM cutoff
    return cutoff;
  };

  const checkActiveShift = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const startTime = new Date(data.clock_in);
        const now = new Date();
        const startEightPm = getEightPmCutoff(startTime);

        const isFromPreviousDay = startTime.toDateString() !== now.toDateString();
        const isPastEightPm = now > startEightPm;

        if (isFromPreviousDay || isPastEightPm) {
          const autoClockOutTime = startEightPm;
          const paidHours = calculatePaidHours(
            startTime, 
            autoClockOutTime, 
            data.no_break || false, 
            data.container_type || 'none'
          );

          await expectRows(
            supabase
              .from('time_logs')
              .update({
                clock_out: autoClockOutTime.toISOString(),
                total_hours: parseFloat(paidHours),
                status: 'Auto Clocked Out (System)'
              })
              .eq('id', data.id),
            'close the previous shift'
          );

          setMsg({
            text: `⚠️ Previous shift forgot to clock out! Automatically closed at 8:00 PM. Your manager will review it.`,
            isError: false,
          });

          setIsClockedIn(false);
          setActiveLogId(null);
          setClockInTime(null);
          setElapsedSeconds(0);
          return;
        }

        setActiveLogId(data.id);
        setClockInTime(startTime);
        setIsClockedIn(true);
        setHasNoBreak(data.no_break || false);
        setContainerType(data.container_type || 'none');

        const initialDiffSec = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(initialDiffSec > 0 ? initialDiffSec : 0);
      }
    } catch (err) {
      console.error('Error recovering active shift:', err);
    }
  };

  // 2. Timer Loop
  useEffect(() => {
    let timer = null;
    if (isClockedIn && clockInTime) {
      timer = setInterval(() => {
        const now = new Date();
        const eightPmCutoff = getEightPmCutoff(new Date(clockInTime));

        if (now >= eightPmCutoff) {
          clearInterval(timer);
          triggerEightPmAutoClockOut();
          return;
        }

        const diffInSeconds = Math.floor((now - new Date(clockInTime)) / 1000);
        setElapsedSeconds(diffInSeconds > 0 ? diffInSeconds : 0);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isClockedIn, clockInTime]);

  const triggerEightPmAutoClockOut = async () => {
    setLoading(true);
    const eightPmCutoff = getEightPmCutoff(new Date(clockInTime));
    const paidHours = calculatePaidHours(clockInTime, eightPmCutoff, hasNoBreak, containerType);

    try {
      if (activeLogId) {
        await expectRows(
          supabase
            .from('time_logs')
            .update({
              clock_out: eightPmCutoff.toISOString(),
              no_break: hasNoBreak,
              container_type: containerType,
              total_hours: parseFloat(paidHours),
              status: 'Auto Clocked Out (System)'
            })
            .eq('id', activeLogId),
          'close your shift at the 8 PM cutoff'
        );
      }

      setMsg({
        text: `8:00 PM shift cutoff reached! Automatically clocked out.`,
        isError: false,
      });

      setIsClockedIn(false);
      setActiveLogId(null);
      setClockInTime(null);
      setElapsedSeconds(0);
      setHasNoBreak(false);
      setContainerType('none');
    } catch (err) {
      console.error('Auto clock-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const applyTenMinBuffer = (actualDate, scheduledDate) => {
    if (!scheduledDate) return actualDate;
    const diffMinutes = Math.abs(actualDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
    if (diffMinutes <= 10) {
      return new Date(scheduledDate);
    }
    return actualDate;
  };

  // 3. Clock In with Strict GPS Check
  const handleStartClockIn = () => {
    setLoading(true);
    setMsg({ text: `Verifying live GPS position for site: ${allocatedSite.name}...`, isError: false });

    if (!allocatedSite.lat || !allocatedSite.lng) {
      setMsg({
        text: `⚠️ GPS coordinates for "${allocatedSite.name}" are missing in database. Please ask admin to save location address.`,
        isError: true,
      });
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setMsg({ text: '❌ Geolocation is not supported on this device.', isError: true });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const positionTimestamp = position.timestamp;
        const nowTimestamp = Date.now();

        if (nowTimestamp - positionTimestamp > 15000) {
          setMsg({
            text: '❌ Stale GPS position detected. Please refresh the page with active location permissions.',
            isError: true,
          });
          setLoading(false);
          return;
        }

        if (accuracy > 200) {
          setMsg({
            text: `❌ GPS accuracy too low (${Math.round(accuracy)}m). Please clock in using a mobile phone with High-Precision GPS enabled.`,
            isError: true,
          });
          setLoading(false);
          return;
        }

        const distance = calculateDistanceKm(userLat, userLng, allocatedSite.lat, allocatedSite.lng);

        if (distance > allocatedSite.maxDistanceKm) {
          setMsg({
            text: `❌ Location Rejected! You are ${distance.toFixed(2)} km away from site "${allocatedSite.name}". Must be within ${allocatedSite.maxDistanceKm} km bounds.`,
            isError: true,
          });
          setLoading(false);
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          const now = new Date();

          // Block a second open shift (other tab or device)
          const { data: openLog } = await supabase
            .from('time_logs')
            .select('id')
            .eq('user_id', user?.id)
            .is('clock_out', null)
            .limit(1)
            .maybeSingle();

          if (openLog) {
            setMsg({ text: '⚠️ You already have an open shift (maybe on another device). Loading it now.', isError: true });
            await checkActiveShift();
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('time_logs')
            .insert([
              {
                user_id: user?.id,
                employee_name: employee?.name || user?.email?.split('@')[0] || 'Employee',
                department: allocatedSite.department,
                location: allocatedSite.name,
                clock_in: now.toISOString(),
                no_break: hasNoBreak,
                container_type: containerType,
                status: 'Pending Review',
              },
            ])
            .select()
            .single();

          if (error) throw error;

          setActiveLogId(data.id);
          setClockInTime(now);
          setIsClockedIn(true);
          setElapsedSeconds(0);
          setMsg({ text: `Shift started at ${allocatedSite.name}!`, isError: false });
        } catch (err) {
          setMsg({ text: `❌ Database Error: ${err.message}`, isError: true });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setMsg({ text: '❌ Location access denied or lost. Please enable device GPS permissions.', isError: true });
        setLoading(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  const handleClockOut = async () => {
    setLoading(true);
    let actualClockOutDate = new Date();
    const actualClockInDate = clockInTime || new Date(actualClockOutDate.getTime() - elapsedSeconds * 1000);

    const eightPmCutoff = getEightPmCutoff(actualClockInDate);
    if (actualClockOutDate > eightPmCutoff) {
      actualClockOutDate = eightPmCutoff;
    }

    const today = new Date();
    const scheduledStart = scheduledShift?.start_time
      ? new Date(scheduledShift.start_time)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30, 0);

    const scheduledEnd = scheduledShift?.end_time
      ? new Date(scheduledShift.end_time)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30, 0);

    const adjustedClockIn = applyTenMinBuffer(actualClockInDate, scheduledStart);
    const adjustedClockOut = applyTenMinBuffer(actualClockOutDate, scheduledEnd);

    const finalPaidHours = calculatePaidHours(adjustedClockIn, adjustedClockOut, hasNoBreak, containerType);

    try {
      if (activeLogId) {
        await expectRows(
          supabase
            .from('time_logs')
            .update({
              clock_in: adjustedClockIn.toISOString(),
              clock_out: adjustedClockOut.toISOString(),
              no_break: hasNoBreak,
              container_type: containerType,
              total_hours: parseFloat(finalPaidHours),
            })
            .eq('id', activeLogId),
          'save your clock-out'
        );
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: insertErr } = await supabase.from('time_logs').insert([
          {
            user_id: user?.id,
            employee_name: employee?.name || 'Employee',
            department: allocatedSite.department,
            location: allocatedSite.name,
            clock_in: adjustedClockIn.toISOString(),
            clock_out: adjustedClockOut.toISOString(),
            no_break: hasNoBreak,
            container_type: containerType,
            total_hours: parseFloat(finalPaidHours),
            status: 'Pending Review',
          },
        ]);
        if (insertErr) throw insertErr;
      }

      setMsg({
        text: `✅ Shift Clocked Out! Logged as ${finalPaidHours} paid hours.`,
        isError: false,
      });

      setIsClockedIn(false);
      setActiveLogId(null);
      setClockInTime(null);
      setElapsedSeconds(0);
      setHasNoBreak(false);
      setContainerType('none');
    } catch (err) {
      setMsg({ text: `❌ Failed to save shift: ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const sinceLabel = clockInTime
    ? new Date(clockInTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  const pick = (setter, value) => () => setter(value);

  return (
    <section className="rt-punch" data-state={isClockedIn ? 'on' : 'off'}>
      <div className="rt-punch-top">
        <div className="rt-where">
          {employee?.name || 'Employee'}, {allocatedSite.name}
          {allocatedSite.department ? `, ${allocatedSite.department}` : ''}
        </div>

        <LiveClock />

        <div className="rt-state">
          <i />
          {isClockedIn ? `On shift since ${sinceLabel}` : 'Off the clock'}
        </div>
        {isClockedIn && (
          <>
            <div className="rt-elapsed">{formatTimer(elapsedSeconds)}</div>
            <div className="rt-cutoff">Shifts close automatically at 8:00 PM</div>
          </>
        )}
      </div>

      <div className="rt-punch-body">
        {!isClockedIn ? (
          <button onClick={handleStartClockIn} disabled={loading} className="rt-btn-in">
            {loading ? 'Checking your location...' : 'Clock in'}
          </button>
        ) : (
          <>
            <p className="rt-hint">Set these before you clock out. They change your paid hours.</p>

            <button type="button" onClick={() => setHasNoBreak(!hasNoBreak)}
              className={`rt-toggle${hasNoBreak ? ' is-on' : ''}`} aria-pressed={hasNoBreak}>
              <span>I did not take a break</span>
              <span className="rt-check">&#10003;</span>
            </button>

            <fieldset className="rt-fieldset">
              <legend>Container unloaded</legend>
              <div className="rt-seg">
                <button type="button" className={containerType === 'none' ? 'is-on' : ''} onClick={pick(setContainerType, 'none')}>None</button>
                <button type="button" className={containerType === '20ft' ? 'is-on' : ''} onClick={pick(setContainerType, '20ft')}>20 ft</button>
                <button type="button" className={containerType === '40ft' ? 'is-on' : ''} onClick={pick(setContainerType, '40ft')}>40 ft</button>
              </div>
            </fieldset>

            <button onClick={handleClockOut} disabled={loading} className="rt-btn-out">
              {loading ? 'Saving...' : 'Clock out'}
            </button>
          </>
        )}

        {msg.text && <div className={`rt-msg ${msg.isError ? 'err' : 'ok'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}

/** Live time of day. Its own timer, so only this small piece re-renders each second. */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hm = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const ss = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <>
      <div className="rt-time">{hm}<small>{ss}</small></div>
      <div className="rt-date-line">{date}</div>
    </>
  );
}
