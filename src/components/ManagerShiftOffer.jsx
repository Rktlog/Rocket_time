// src/components/ManagerShiftOffer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerShiftOffer({ department }) {
  const [staffList, setStaffList] = useState([]);
  const [offersList, setOffersList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', isError: false });

  // Form State for Sending Offers with Editable Times
  const [selectedStaff, setSelectedStaff] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('16:30');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, [department]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Department Staff Profiles
      let staffQuery = supabase.from('profiles').select('id, full_name, email, department').neq('role', 'admin');
      if (department && department !== 'All Departments') {
        staffQuery = staffQuery.or(`department.ilike.%${department.trim()}%,department.is.null`);
      }
      const { data: staffData } = await staffQuery;
      setStaffList(staffData || []);

      // 2. Fetch Sent Shift Offers
      const { data: offersData } = await supabase
        .from('shift_offers')
        .select('*')
        .order('shift_date', { ascending: true });

      setOffersList(offersData || []);
    } catch (err) {
      console.error('Error loading shift offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !shiftDate || !startTime || !endTime) {
      setMsg({ text: '⚠️ Please select an employee, shift date, start time, and end time.', isError: true });
      return;
    }

    setSending(true);
    setMsg({ text: '', isError: false });

    try {
      const staffObj = staffList.find((s) => s.id === selectedStaff);
      const customShiftTime = `${startTime} - ${endTime}`;

      const { error } = await supabase.from('shift_offers').insert([
        {
          employee_id: selectedStaff,
          employee_email: staffObj?.email || '',
          employee_name: staffObj?.full_name || staffObj?.name || 'Employee',
          department: staffObj?.department || department || 'englite',
          shift_date: shiftDate,
          shift_time: customShiftTime,
          notes: notes,
          status: 'Pending',
        },
      ]);

      if (error) throw error;

      setMsg({ text: '✅ Shift offer sent successfully!', isError: false });
      setSelectedStaff('');
      setShiftDate('');
      setStartTime('08:30');
      setEndTime('16:30');
      setNotes('');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error sending offer:', err);
      setMsg({ text: `❌ Failed to send offer: ${err.message}`, isError: true });
    } finally {
      setSending(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    try {
      const { error } = await supabase.from('shift_offers').delete().eq('id', offerId);
      if (error) throw error;
      setOffersList(prev => prev.filter(o => o.id !== offerId));
      setMsg({ text: '🗑️ Offer canceled.', isError: false });
    } catch (err) {
      setMsg({ text: `❌ Delete failed: ${err.message}`, isError: true });
    } finally {
      setTimeout(() => setMsg({ text: '', isError: false }), 3000);
    }
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>✉️ Open Shift Offers</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Send shift offers with customizable start/end times directly to department staff.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} style={primaryBtnStyle}>
          ➕ Create Shift Offer
        </button>
      </div>

      {msg.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {/* OFFERS DASHBOARD BOARD */}
      {loading ? (
        <div style={emptyCardStyle}>Loading open shift offers...</div>
      ) : offersList.length === 0 ? (
        <div style={emptyCardStyle}>
          <h3>📭 No Active Shift Offers</h3>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Click "Create Shift Offer" to offer open shifts to team members.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {offersList.map((offer) => (
            <div key={offer.id} style={offerCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                    {offer.employee_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    📅 {offer.shift_date}
                  </div>
                </div>

                <span style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                  backgroundColor: offer.status === 'Accepted' ? '#dcfce7' : offer.status === 'Declined' ? '#fef2f2' : '#dbeafe',
                  color: offer.status === 'Accepted' ? '#15803d' : offer.status === 'Declined' ? '#991b1b' : '#1e40af'
                }}>
                  {offer.status ? offer.status.toUpperCase() : 'PENDING'}
                </span>
              </div>

              <div style={timingBoxStyle}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Offered Time Range</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', marginTop: '2px' }}>
                  ⏰ {offer.shift_time || '08:30 - 16:30'}
                </div>
              </div>

              {offer.notes && (
                <div style={{ fontSize: '12px', color: '#475569', margin: '10px 0', fontStyle: 'italic' }}>
                  💬 "{offer.notes}"
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                <button onClick={() => handleDeleteOffer(offer.id)} style={deleteBtnStyle}>
                  🗑️ Cancel Offer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMBEDDED MODAL WITH TIME EDITING */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>✉️ Send Shift Offer</h3>
              <button onClick={() => setIsModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <form onSubmit={handleSendOffer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Employee Selection */}
              <div>
                <label style={labelStyle}>Staff Member</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.name} ({s.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Date */}
              <div>
                <label style={labelStyle}>Shift Date</label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* EDIT TIME CONTROLS */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Shift Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please cover morning floor duty."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={secondaryBtnStyle}>
                  Cancel
                </button>
                <button type="submit" disabled={sending} style={primaryBtnStyle}>
                  {sending ? 'Sending...' : 'Send Offer 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const primaryBtnStyle = { padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' };
const secondaryBtnStyle = { flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };
const deleteBtnStyle = { padding: '4px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const emptyCardStyle = { backgroundColor: '#ffffff', padding: '40px', borderRadius: '14px', border: '1px dashed #cbd5e1', textAlign: 'center' };

const offerCardStyle = { backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' };
const timingBoxStyle = { backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' };
const modalContentStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' };