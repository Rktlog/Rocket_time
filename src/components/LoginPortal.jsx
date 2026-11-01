// src/components/LoginPortal.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loginWrapperStyle, loginCardStyle, loginBtnStyle, labelStyle, inputStyle, errorAlertStyle, successBannerStyle } from '../lib/styles';

export default function LoginPortal({ onLoginSuccess, notice }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data?.user) await onLoginSuccess(data.user);
    } catch (err) {
      const text = String(err.message || '');
      // A deactivated login is blocked by Supabase with a "banned" message
      setErrorMsg(
        /banned/i.test(text)
          ? '❌ This account has been deactivated. Please contact your manager.'
          : '❌ ' + (text || 'Invalid credentials. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      // Same message whether or not the email exists, so nobody can probe for accounts
      setInfoMsg('✅ If that email has an account, a reset link is on its way. Check your inbox and spam.');
    } catch (err) {
      setErrorMsg('❌ ' + (err.message || 'Could not send the reset email. Try again in a minute.'));
    } finally {
      setLoading(false);
    }
  };

  const linkBtn = { background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' };

  return (
    <div style={loginWrapperStyle}>
      <div style={loginCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>🚀</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>
            {mode === 'signin' ? 'Rocket Time Login' : 'Reset your password'}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            {mode === 'signin'
              ? 'Enter your workplace credentials to access your workspace.'
              : 'Enter your work email and we will send you a link.'}
          </p>
        </div>

        {notice && <div style={{ ...errorAlertStyle, marginBottom: '12px' }}>{notice}</div>}
        {errorMsg && <div style={{ ...errorAlertStyle, marginBottom: '12px' }}>{errorMsg}</div>}
        {infoMsg && <div style={{ ...successBannerStyle, marginBottom: '12px' }}>{infoMsg}</div>}

        {mode === 'signin' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={loginBtnStyle}>
              {loading ? 'Authenticating...' : 'Sign In 🚀'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" style={linkBtn} onClick={() => { setMode('forgot'); setErrorMsg(''); setInfoMsg(''); }}>
                Forgot your password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={loginBtnStyle}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" style={linkBtn} onClick={() => { setMode('signin'); setErrorMsg(''); setInfoMsg(''); }}>
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
