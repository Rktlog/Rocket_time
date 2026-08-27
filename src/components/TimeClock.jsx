// src/components/TimeClock.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TimeClock({ employee, scheduledShift }) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeLogId, setActiveLogId] = useState(null);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Shift Bonus & Break Options
  const [hasNoBreak, setHasNoBreak] = useState(false);
  const [containerType, setContainerType] = useState('none');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const targetSite = {
    lat: employee?.site_lat || -37.6698,
    lng: employee?.site_lng || 144.9540,
    maxDistanceKm: 5.0,
  };

  // Helper to construct today's 8:00 PM (20:00:00) cutoff date object
  const getEightPmCutoff = (referenceDate = new Date()) => {
    const cutoff = new Date(referenceDate);
    cutoff.setHours(20, 0, 0, 0); // 8:00:00 PM
    return cutoff;
  };

  // 1. Recover active running shift with auto-clock-out guardrail for forgotten shifts
  useEffect(() => {
    checkActiveShift();
  }, []);

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

          await supabase
            .from('time_logs')
            .update({
              clock_out: autoClockOutTime.toISOString(),
              total_hours: parseFloat(paidHours),
              status: 'Auto Clocked Out (System)'
            })
            .eq('id', data.id);

          setMsg({
            text: `⚠️ Previous shift forgot to clock out! Automatically closed at 8:00 PM (${paidHours} hrs logged).`,
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

  // 2. Real-time clock timer & 8:00 PM automatic trigger
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
        await supabase
          .from('time_logs')
          .update({
            clock_out: eightPmCutoff.toISOString(),
            no_break: hasNoBreak,
            container_type: containerType,
            total_hours: parseFloat(paidHours),
            status: 'Auto Clocked Out (System)'
          })
          .eq('id', activeLogId);
      }

      setMsg({
        text: `🌙 8:00 PM shift cutoff reached! Automatically clocked out (${paidHours} paid hrs logged).`,
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

  // UPDATED PAID HOURS CALCULATION
  const calculatePaidHours = (adjustedIn, adjustedOut, noBreakWorked, container) => {
    const totalMs = adjustedOut.getTime() - adjustedIn.getTime();
    const rawHours = totalMs / (1000 * 60 * 60);

    let calculatedPaidHours = 0;

    if (!noBreakWorked) {
      // Deduct 30 minutes (0.50 hours) for standard break
      calculatedPaidHours = Math.max(0, rawHours - 0.50);
    } else {
      // Add 40 minutes (+0.6667 hours) bonus if no break was taken
      calculatedPaidHours = rawHours + (40 / 60);
    }

    // Container Bonuses
    if (container === '20ft') calculatedPaidHours += (10 / 60); // +10 minutes
    if (container === '40ft') calculatedPaidHours += (20 / 60); // +20 minutes

    return calculatedPaidHours.toFixed(2);
  };

  // 3. Start Clock In -> Strict Geolocation Validation
  const handleStartClockIn = () => {
    setLoading(true);
    setMsg({ text: '📡 Verifying GPS location...', isError: false });

    if (!navigator.geolocation) {
      setMsg({ text: '❌ Geolocation is not supported by your browser or device.', isError: true });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        if (accuracy > 1500) {
          setMsg({
            text: `❌ Low accuracy location detected (${Math.round(accuracy)}m). Please clock in using a GPS-enabled mobile device.`,
            isError: true,
          });
          setLoading(false);
          return;
        }

        const distance = calculateDistanceKm(userLat, userLng, targetSite.lat, targetSite.lng);

        if (distance > targetSite.maxDistanceKm) {
          setMsg({
            text: `❌ Location Rejected! You are ${distance.toFixed(1)} km away. Must be within 5 km of assigned site.`,
            isError: true,
          });
          setLoading(false);
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          const now = new Date();

          const { data, error } = await supabase
            .from('time_logs')
            .insert([
              {
                user_id: user?.id,
                employee_name: employee?.name || user?.email?.split('@')[0] || 'Employee',
                department: employee?.department || 'Englite',
                location: employee?.location || 'Englite campbellfield',
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
          setMsg({ text: `🟢 Shift started! Recorded in database.`, isError: false });
        } catch (err) {
          setMsg({ text: `❌ Database Error: ${err.message}`, isError: true });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        let errorReason = 'Location access denied or unavailable.';
        if (error.code === error.PERMISSION_DENIED) {
          errorReason = 'Location permission was denied. Please allow location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorReason = 'Location position unavailable. Please ensure GPS is enabled on your device.';
        } else if (error.code === error.TIMEOUT) {
          errorReason = 'Location request timed out. Please try again.';
        }

        setMsg({ text: `❌ ${errorReason}`, isError: true });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 4. Clock Out -> Update existing running record in Supabase
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
        const { error } = await supabase
          .from('time_logs')
          .update({
            clock_in: adjustedClockIn.toISOString(),
            clock_out: adjustedClockOut.toISOString(),
            no_break: hasNoBreak,
            container_type: containerType,
            total_hours: parseFloat(finalPaidHours),
          })
          .eq('id', activeLogId);

        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('time_logs').insert([
          {
            user_id: user?.id,
            employee_name: employee?.name || 'Employee',
            department: employee?.department || 'Englite',
            location: employee?.location || 'Englite campbellfield',
            clock_in: adjustedClockIn.toISOString(),
            clock_out: adjustedClockOut.toISOString(),
            no_break: hasNoBreak,
            container_type: containerType,
            total_hours: parseFloat(finalPaidHours),
            status: 'Pending Review',
          },
        ]);
      }

      setMsg({
        text: `✅ Shift Clocked Out! Logged as ${finalPaidHours} paid hours (${hasNoBreak ? 'No Break (+40m)' : 'Standard Break (-30m)'}).`,
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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a' }}>
          ⏱️ Shift Time Clock
        </h2>

        <div style={infoBoxStyle}>
          <div>
            <span style={infoLabelStyle}>Employee</span>
            <div style={infoValueStyle}>{employee?.name || 'Employee'}</div>
          </div>
          <div>
            <span style={infoLabelStyle}>Department & Site</span>
            <div style={infoValueStyle}>🏢 {employee?.department || 'Englite'} ({employee?.location || 'Englite campbellfield'})</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          {!isClockedIn ? (
            <button onClick={handleStartClockIn} disabled={loading} style={clockInBtnStyle}>
              {loading ? 'Verifying Location...' : '▶ Clock In Shift'}
            </button>
          ) : (
            <div style={timerBoxStyle}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Shift Running (Max 8:00 PM)</span>
              <div style={{ fontSize: '38px', fontWeight: 'bold', fontFamily: 'monospace', color: '#38bdf8', marginTop: '4px' }}>
                {formatTimer(elapsedSeconds)}
              </div>
            </div>
          )}
        </div>

        <div style={{ opacity: isClockedIn ? 1 : 0.4, pointerEvents: isClockedIn ? 'auto' : 'none', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setHasNoBreak(!hasNoBreak)}
            style={{
              ...optionBtnStyle,
              border: `2px solid ${hasNoBreak ? '#2563eb' : '#cbd5e1'}`,
              backgroundColor: hasNoBreak ? '#eff6ff' : '#ffffff',
              fontWeight: hasNoBreak ? 'bold' : 'normal',
              color: hasNoBreak ? '#1d4ed8' : '#334155',
              marginBottom: '10px',
            }}
          >
            ☕ No Break Worked (+40 min)
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setContainerType('none')}
              style={{
                ...optionBtnStyle,
                border: `2px solid ${containerType === 'none' ? '#2563eb' : '#cbd5e1'}`,
                backgroundColor: containerType === 'none' ? '#eff6ff' : '#ffffff',
                fontWeight: containerType === 'none' ? 'bold' : 'normal',
              }}
            >
              No Container
            </button>

            <button
              type="button"
              onClick={() => setContainerType('20ft')}
              style={{
                ...optionBtnStyle,
                border: `2px solid ${containerType === '20ft' ? '#16a34a' : '#cbd5e1'}`,
                backgroundColor: containerType === '20ft' ? '#f0fdf4' : '#ffffff',
                fontWeight: containerType === '20ft' ? 'bold' : 'normal',
                color: containerType === '20ft' ? '#15803d' : '#334155',
              }}
            >
              📦 20 ft (+10m)
            </button>

            <button
              type="button"
              onClick={() => setContainerType('40ft')}
              style={{
                ...optionBtnStyle,
                border: `2px solid ${containerType === '40ft' ? '#9333ea' : '#cbd5e1'}`,
                backgroundColor: containerType === '40ft' ? '#faf5ff' : '#ffffff',
                fontWeight: containerType === '40ft' ? 'bold' : 'normal',
                color: containerType === '40ft' ? '#7e22ce' : '#334155',
              }}
            >
              📦 40 ft (+20m)
            </button>
          </div>
        </div>

        {isClockedIn && (
          <button onClick={handleClockOut} disabled={loading} style={clockOutBtnStyle}>
            {loading ? 'Processing...' : '⏹ Clock Out Shift'}
          </button>
        )}

        {msg.text && (
          <div style={{
            marginTop: '16px', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center',
            backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
            color: msg.isError ? '#991b1b' : '#166534',
            border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`,
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' };
const infoBoxStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' };
const infoLabelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const infoValueStyle = { fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' };
const clockInBtnStyle = { width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };
const clockOutBtnStyle = { width: '100%', padding: '14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };
const timerBoxStyle = { backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px', color: '#fff' };
const optionBtnStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', textAlign: 'center' };