// src/components/OnboardingWizard.jsx
// First sign-in for a newly created employee: confirm details and replace the temporary password.
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { labelStyle, inputStyle, btnStyle, errorAlertStyle, cardStyle } from '../lib/styles';

export default function OnboardingWizard({ user, onComplete }) {
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: '',
    address: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (form.password.length < 8) return setErrorMsg('❌ Your new password needs at least 8 characters.');
    if (form.password !== form.confirm) return setErrorMsg('❌ The two passwords do not match.');

    setLoading(true);
    try {
      // 1. replace the temporary password the manager gave you
      const { error: pwErr } = await supabase.auth.updateUser({ password: form.password });
      if (pwErr) throw pwErr;

      // 2. save your details and mark setup as done
      await expectRows(
        supabase
          .from('profiles')
          .update({
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id),
        'save your details'
      );

      onComplete({ name: form.fullName.trim() });
    } catch (err) {
      setErrorMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#f1f5f9', padding: '16px 20px', borderRadius: '10px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Welcome, {user?.name || 'there'}! 👋</h3>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Two quick things before you start: confirm your details and choose your own password.
        </span>
      </div>

      {errorMsg && <div style={{ ...errorAlertStyle, marginBottom: '12px' }}>{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={{ ...cardStyle, backgroundColor: '#ffffff' }}>
        <label style={labelStyle}>Full name</label>
        <input value={form.fullName} onChange={set('fullName')} required style={{ ...inputStyle, marginBottom: '12px' }} />

        <label style={labelStyle}>Phone number</label>
        <input placeholder="0400 000 000" value={form.phone} onChange={set('phone')} required style={{ ...inputStyle, marginBottom: '12px' }} />

        <label style={labelStyle}>Address</label>
        <input placeholder="123 Street, Suburb VIC 3000" value={form.address} onChange={set('address')} required style={{ ...inputStyle, marginBottom: '16px' }} />

        <label style={labelStyle}>New password</label>
        <input type="password" value={form.password} onChange={set('password')} required style={{ ...inputStyle, marginBottom: '12px' }} />

        <label style={labelStyle}>Confirm new password</label>
        <input type="password" value={form.confirm} onChange={set('confirm')} required style={{ ...inputStyle, marginBottom: '16px' }} />

        <button type="submit" disabled={loading} style={btnStyle('#16a34a')}>
          {loading ? 'Saving...' : 'Finish setup ✅'}
        </button>
      </form>
    </div>
  );
}
