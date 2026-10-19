// src/components/PendingOffersView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PendingOffersView({ user }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchShiftOffers();
  }, [user]);

  // Fetch offers matching the employee's email or user ID
  const fetchShiftOffers = async () => {
    if (!user?.email && !user?.id) return;
    setLoading(true);

    try {
      // 1. Check shift_offers table
      const { data: directOffers, error: offerErr } = await supabase
        .from('shift_offers')
        .select('*')
        .or(`employee_email.eq.${user.email},employee_id.eq.${user.id}`)
        .eq('status', 'Pending');

      // 2. Check shifts table
      const { data: shiftTableOffers, error: shiftErr } = await supabase
        .from('shifts')
        .select('*')
        .eq('offered_to_email', user.email)
        .eq('status', 'Offered');

      let combined = [];

      if (directOffers) {
        combined = [...combined, ...directOffers.map(o => ({ ...o, source: 'shift_offers' }))];
      }
      if (shiftTableOffers) {
        combined = [...combined, ...shiftTableOffers.map(s => ({ ...s, source: 'shifts' }))];
      }

      setOffers(combined);
    } catch (err) {
      console.error('Error loading shift offers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Accept Shift Action
  const handleAccept = async (offer) => {
    try {
      if (offer.source === 'shift_offers') {
        const { error } = await supabase
          .from('shift_offers')
          .update({ status: 'Accepted' })
          .eq('id', offer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shifts')
          .update({ status: 'Assigned', assigned_to: user.id })
          .eq('id', offer.id);
        if (error) throw error;
      }

      setMsg({ text: '✅ Shift accepted! Added to your active roster.', isError: false });
      fetchShiftOffers(); // Refresh list
    } catch (err) {
      setMsg({ text: `❌ Failed to accept shift: ${err.message}`, isError: true });
    }
  };

  // Decline Shift Action
  const handleDecline = async (offer) => {
    try {
      if (offer.source === 'shift_offers') {
        await supabase
          .from('shift_offers')
          .update({ status: 'Declined' })
          .eq('id', offer.id);
      } else {
        await supabase
          .from('shifts')
          .update({ status: 'Declined' })
          .eq('id', offer.id);
      }

      setMsg({ text: '❌ Shift offer declined.', isError: false });
      fetchShiftOffers(); // Refresh list
    } catch (err) {
      setMsg({ text: `❌ Failed to decline shift: ${err.message}`, isError: true });
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2>📬 Pending Shift Offers</h2>
      <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
        Review and accept shift offers dispatched by your management team.
      </p>

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

      {loading ? (
        <div style={cardStyle}>Checking for new shift offers...</div>
      ) : offers.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>
            🎉 You have no pending shift offers right now. Check back later!
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {offers.map((item) => {
            const title = item.title || `${item.day || 'Scheduled'} Shift`;
            const timing = item.shift_time || (item.start_time ? `${new Date(item.start_time).toLocaleDateString()} (${new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '08:30 AM - 04:30 PM');
            const loc = item.location || 'Campbellfield Site';

            return (
              <div key={item.id} style={offerCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={badgeStyle}>NEW OFFER</span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px', color: '#0f172a' }}>{title}</h3>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '16px', marginTop: '6px' }}>
                      <span>📍 <strong>Location:</strong> {loc}</span>
                      <span>⏰ <strong>Shift:</strong> {timing}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleAccept(item)} style={acceptBtnStyle}>
                      ✓ Accept Shift
                    </button>
                    <button onClick={() => handleDecline(item)} style={declineBtnStyle}>
                      ✕ Decline
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styling Constants
const cardStyle = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const offerCardStyle = { backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', border: '2px solid #bfdbfe', boxShadow: '0 2px 4px rgba(37,99,235,0.05)' };
const badgeStyle = { backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
const acceptBtnStyle = { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };
const declineBtnStyle = { backgroundColor: '#f1f5f9', color: '#dc2626', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };