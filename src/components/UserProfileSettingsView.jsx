// src/components/UserProfileSettingsView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { verifyPassword } from '../lib/auth';
import { viewHeadingStyle, cardStyle, subTextStyle, labelStyle, inputStyle, sectionHeadingStyle, dividerStyle, btnStyle } from '../lib/styles';

export default function UserProfileSettingsView({ user, role }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchCurrentProfile();
  }, [user?.id]);

  const fetchCurrentProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setFullName(data.full_name || user.name || '');
        setEmail(data.email || user.email || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', isError: false });

    try {
      if (newPassword || confirmPassword) {
        if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
        if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
        if (!currentPassword) throw new Error('Enter your current password to change it.');
        const { ok } = await verifyPassword(currentPassword);
        if (!ok) throw new Error('Current password is incorrect.');
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
        if (pwErr) throw pwErr;
      }

      // Email is the login identity, so it is not edited here.
      await expectRows(
        supabase
          .from('profiles')
          .update({ full_name: fullName, address, phone, updated_at: new Date().toISOString() })
          .eq('id', user.id),
        'save your profile'
      );

      setMsg({ text: `✅ ${role} profile saved successfully!`, isError: false });
    } catch (err) {
      setMsg({ text: `❌ ${err.message}`, isError: true });
    } finally {
      setSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div>
      <h2 style={viewHeadingStyle}>⚙️ {role} Account Profile & Settings</h2>
      <p style={subTextStyle}>Manage your personal contact details and password security.</p>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ ...cardStyle, maxWidth: '600px' }}>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={sectionHeadingStyle}>1. Personal & Contact Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div><label style={labelStyle}>Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Email Address</label><input type="email" value={email} disabled title="Email is your login and cannot be changed here" style={{ ...inputStyle, backgroundColor: '#f1f5f9' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div><label style={labelStyle}>Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone Number</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} /></div>
            </div>
          </div>

          <hr style={dividerStyle} />

          <div>
            <h3 style={sectionHeadingStyle}>2. Password Security</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div><label style={labelStyle}>New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} /></div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ ...btnStyle('#2563eb'), marginTop: '4px' }}>
            {saving ? 'Saving...' : 'Save Details 💾'}
          </button>
        </form>
      </div>
    </div>
  );
}
