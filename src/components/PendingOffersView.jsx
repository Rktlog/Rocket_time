// src/components/PendingOffersView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';

export default function PendingOffersView({ user }) {
  const [shiftOffers, setShiftOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const formatDayAndDate = (dateStr) => {
    if (!dateStr) return { dayName: 'Scheduled Day', formattedDate: '' };
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return { dayName, formattedDate };
  };

  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    fetchShiftOffers().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user]);

  const fetchShiftOffers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const cleanEmail = (user.email || '').trim().toLowerCase();

    try {
      const { data: offersData, error: offersErr } = await supabase
        .from('shift_offers')
        .select('*')
        .or(`employee_email.eq.${cleanEmail},employee_id.eq.${user.id}`)
        .eq('status', 'Pending');

      if (offersErr) console.warn('shift_offers fetch warning:', offersErr.message);

      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Pending');

      if (shiftsErr) console.warn('shifts fetch warning:', shiftsErr.message);

      const combined = [
        ...(offersData || []).map(o => ({ ...o, source: 'shift_offers' })),
        ...(shiftsData || []).map(s => ({ ...s, source: 'shifts' }))
      ];

      setShiftOffers(combined);
    } catch (err) {
      console.error('Error fetching shift offers:', err);
      setShiftOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offer) => {
    try {
      if (offer.source === 'shifts') {
        // Already a roster row: just confirm it.
        await expectRows(supabase.from('shifts').update({ status: 'Accepted' }).eq('id', offer.id), 'accept the shift');
      } else {
        const targetDate = offer.shift_date;
        if (!targetDate) throw new Error('This offer has no date.');
        const cleanEmail = (user.email || '').trim().toLowerCase();

        const parts = String(offer.shift_time || '08:30 - 16:30').split('-').map((p) => p.trim());
        const toSec = (t) => (t.length === 5 ? `${t}:00` : t);
        const startIso = new Date(`${targetDate}T${toSec(parts[0] || '08:30')}`).toISOString();
        const endIso = new Date(`${targetDate}T${toSec(parts[1] || '16:30')}`).toISOString();

        // Create the shift first, so a failure never leaves an Accepted offer with no shift.
        await expectRows(supabase
          .from('shifts')
          .upsert(
            [
              {
                user_id: user.id,
                employee_name: user.name || 'Employee',
                offered_to_email: cleanEmail,
                department: user.department || 'Unassigned',
                location: offer.location || user.location || null,
                shift_date: targetDate,
                start_time: startIso,
                end_time: endIso,
                status: 'Accepted',
              },
            ],
            { onConflict: 'user_id,shift_date' }
          ), 'create your shift');

        await expectRows(
          supabase.from('shift_offers').update({ status: 'Accepted' }).eq('id', offer.id),
          'mark the offer as accepted'
        );
      }

      setShiftOffers((prev) => prev.filter((o) => !(o.id === offer.id && o.source === offer.source)));
      setMsg({ text: '✅ Shift accepted! It is now live on your roster.', isError: false });
    } catch (err) {
      console.error('Accept offer error:', err);
      setMsg({ text: `❌ Failed to accept shift: ${err.message}`, isError: true });
    }
  };

  const handleDecline = async (offer) => {
    try {
      if (offer.source === 'shift_offers') {
        await expectRows(
          supabase.from('shift_offers').update({ status: 'Declined' }).eq('id', offer.id),
          'decline the offer'
        );
      } else {
        await expectRows(
          supabase.from('shifts').update({ status: 'Declined' }).eq('id', offer.id),
          'decline the shift'
        );
      }

      setShiftOffers(prev => prev.filter(o => !(o.id === offer.id && o.source === offer.source)));
      setMsg({ text: 'Shift offer declined.', isError: false });
    } catch (err) {
      console.error('Decline offer error:', err);
      setMsg({ text: `❌ Failed to decline shift: ${err.message}`, isError: true });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #D8DEE3' }}>
        <div style={{ fontSize: '13px', color: '#5E6A76', fontWeight: 'bold' }}>⌛ Checking shift offers...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #D8DEE3', }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#16212B' }}>Pending Shift Offers</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#5E6A76' }}>
            Review and accept open shifts offered by your manager.
          </p>
        </div>
        <span style={{ backgroundColor: '#E8F0F5', color: '#2F5D7C', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
          {shiftOffers.length} {shiftOffers.length === 1 ? 'Available' : 'Available'}
        </span>
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {shiftOffers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', border: '1px dashed #C9D1D8', borderRadius: '8px', backgroundColor: '#F5F7F8' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}></div>
          <h4 style={{ margin: 0, color: '#3A4753', fontSize: '14px' }}>No Pending Shift Offers</h4>
          <p style={{ margin: '2px 0 0 0', color: '#8B97A3', fontSize: '11px' }}>
            You're all caught up! New shift invitations will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {shiftOffers.map((offer) => {
            const rawDate = offer.shift_date || offer.date;
            const { dayName, formattedDate } = formatDayAndDate(rawDate);

            return (
              <div key={offer.id} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '2px solid #3b82f6', }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#16212B' }}>
                      {dayName}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#5E6A76', marginTop: '2px' }}>
                      {formattedDate || rawDate}
                    </div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#D7E5EE', color: '#1e40af' }}>
                    PENDING
                  </span>
                </div>

                <div style={{ backgroundColor: '#F5F7F8', padding: '8px 10px', borderRadius: '8px', border: '1px solid #D8DEE3', marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#5E6A76', fontWeight: 'bold', }}>Hours</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2F5D7C', marginTop: '2px' }}>
                    {offer.shift_time || '08:30 - 16:30'}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#4A5763', marginBottom: '12px', wordBreak: 'break-word' }}>
                  <strong>Location:</strong> {offer.location || user.location || 'Not set'}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAccept(offer)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(offer)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
