// src/components/SetNewPassword.jsx
// Shown after someone clicks the link in a "reset your password" email.
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loginWrapperStyle, loginCardStyle, loginBtnStyle, labelStyle, inputStyle, errorAlertStyle } from '../lib/styles';

export default function SetNewPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 8) return setErrorMsg('❌ Use at least 8 characters.');
    if (password !== confirm) return setErrorMsg('❌ The two passwords do not match.');

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setErrorMsg('❌ ' + error.message);
    onDone();
  };

  return (
    <div style={loginWrapperStyle}>
      <div style={loginCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>Choose a new password</h2>
        </div>
        {errorMsg && <div style={{ ...errorAlertStyle, marginBottom: '12px' }}>{errorMsg}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={saving} style={loginBtnStyle}>{saving ? 'Saving...' : 'Save password'}</button>
        </form>
      </div>
    </div>
  );
}
