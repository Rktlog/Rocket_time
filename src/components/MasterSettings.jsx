// src/components/MasterSettings.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MasterSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });

    // 1. Check if current password is provided
    if (!currentPassword) {
      setMsg({ text: '❌ Please enter your current password.', isError: true });
      return;
    }

    // 2. Validate new password length
    if (newPassword.length < 6) {
      setMsg({ text: '❌ New password must be at least 6 characters long.', isError: true });
      return;
    }

    // 3. Confirm matching passwords
    if (newPassword !== confirmPassword) {
      setMsg({ text: '❌ New password and confirmation do not match.', isError: true });
      return;
    }

    setLoading(true);

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setMsg({ text: '✅ Master Admin password updated successfully!', isError: false });
      
      // Reset form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMsg({ text: `❌ Password Update Error: ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
        ⚙️ Master Security Settings
      </h2>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
        Manage system settings and update the Master Administrator account password.
      </p>

      {/* FEEDBACK BANNER */}
      {msg.text && (
        <div style={msgBannerStyle(msg.isError)}>
          {msg.text}
        </div>
      )}

      {/* CHANGE PASSWORD CARD */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a', fontSize: '18px' }}>
          🔒 Change Admin Password
        </h3>

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* CURRENT PASSWORD */}
          <div>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* NEW PASSWORD */}
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Updating Password...' : 'Update Master Password 🔑'}
          </button>
        </form>
      </div>

    </div>
  );
}

// Styling definitions
const cardStyle = { padding: '28px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' };
const btnStyle = { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' };
const msgBannerStyle = (isError) => ({
  background: isError ? '#fef2f2' : '#f0f9ff',
  color: isError ? '#991b1b' : '#0369a1',
  padding: '12px 16px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: `1px solid ${isError ? '#fca5a5' : '#bae6fd'}`,
  fontWeight: '500',
  fontSize: '14px',
});