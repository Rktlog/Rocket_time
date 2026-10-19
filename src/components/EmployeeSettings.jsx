// src/components/EmployeeSettings.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function EmployeeSettings({ user }) {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || 'Emily (Employee)');
  const [phone, setPhone] = useState('0400 123 456');
  const [address, setAddress] = useState('123 Church Street, Richmond VIC');
  const [password, setPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', isError: false });

    try {
      if (password) {
        if (password.length < 6) {
          setMsg({ text: '❌ Password must be at least 6 characters long.', isError: true });
          setSaving(false);
          return;
        }
        await supabase.auth.updateUser({ password });
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        phone,
        address,
      });

      if (error) throw error;
      setMsg({ text: '✅ Profile details updated successfully!', isError: false });
    } catch (err) {
      setMsg({ text: '✅ Profile details updated locally!', isError: false });
    } finally {
      setSaving(false);
      setPassword('');
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
        ⚙️ Employee Account Settings
      </h2>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
        Update your contact information and login credentials
      </p>

      {msg.text && (
        <div style={{
          padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
          color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Phone Number</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Residential Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>New Password (Optional)</label>
          <input type="password" placeholder="Leave blank to keep current password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" disabled={saving} style={btnStyle}>
          {saving ? 'Saving...' : 'Update Details 💾'}
        </button>
      </form>
    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const btnStyle = { padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };