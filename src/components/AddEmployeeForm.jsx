// src/components/AddEmployeeForm.jsx
// Managers and admins create an employee profile directly. No invite email.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  viewHeadingStyle, subTextStyle, cardStyle, labelStyle, inputStyle, btnStyle,
  successBannerStyle, errorAlertStyle,
} from '../lib/styles';

export default function AddEmployeeForm({ mode, currentUser, departments = [], sites = [] }) {
  const isAdmin = mode === 'admin';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState('');
  const [site, setSite] = useState('');
  const [employmentType, setEmploymentType] = useState('Full Time');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok, email, tempPassword } | { ok: false, error }
  const [copied, setCopied] = useState(false);

  // Admin dropdown defaults once the lists have loaded
  useEffect(() => {
    if (isAdmin && !dept && departments[0]) setDept(departments[0].name);
    if (isAdmin && !site && sites[0]) setSite(sites[0].name);
  }, [isAdmin, departments, sites]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    setCopied(false);

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: {
        full_name: fullName.trim(),
        email: cleanEmail,
        department: isAdmin ? dept : currentUser.department,
        location: isAdmin ? site : currentUser.location,
        employment_type: employmentType,
      },
    });
    setSaving(false);

    if (error || !data?.ok) {
      setResult({ ok: false, error: data?.error || error?.message || 'Unknown error' });
      return;
    }
    // The temp password is shown once, so the banner stays until dismissed.
    setResult({ ok: true, email: cleanEmail, tempPassword: data.tempPassword });
    setFullName('');
    setEmail('');
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
    } catch {
      /* clipboard blocked: the password is selectable on screen */
    }
  };

  const field = { ...inputStyle, width: '100%', marginBottom: '12px' };

  return (
    <div>
      <h2 style={viewHeadingStyle}>➕ Add Employee</h2>
      <p style={subTextStyle}>
        {isAdmin
          ? 'Create an employee profile directly. No invite needed.'
          : <>Create an employee profile directly. They are added to <strong>{currentUser.department}</strong> at <strong>{currentUser.location}</strong>.</>}
      </p>

      <div style={{ ...cardStyle, maxWidth: '500px' }}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Employee Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={field} />

          <label style={labelStyle}>Employee Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={field} />

          {isAdmin && (
            <>
              <label style={labelStyle}>Assign Site / Location</label>
              <select value={site} onChange={(e) => setSite(e.target.value)} style={field}>
                {sites.map((s) => <option key={s.id} value={s.name}>📍 {s.name}</option>)}
              </select>

              <label style={labelStyle}>Assign Department</label>
              <select value={dept} onChange={(e) => setDept(e.target.value)} style={field}>
                {departments.map((d) => <option key={d.id} value={d.name}>🏢 {d.name}</option>)}
              </select>
            </>
          )}

          <label style={labelStyle}>Employment Type</label>
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} style={{ ...field, marginBottom: '16px' }}>
            <option value="Full Time">💼 Full Time</option>
            <option value="Part Time">⏱️ Part Time</option>
            <option value="Casual">📅 Casual</option>
          </select>

          <button type="submit" disabled={saving} style={btnStyle(isAdmin ? '#2563eb' : '#0f172a')}>
            {saving ? 'Creating...' : 'Create Profile ✅'}
          </button>
        </form>

        {result && (
          <div style={{ ...(result.ok ? successBannerStyle : errorAlertStyle), marginTop: '16px' }}>
            {result.ok ? (
              <div>
                ✅ Profile created for <strong>{result.email}</strong>.<br />
                Temporary password: <code style={{ fontWeight: 'bold', userSelect: 'all' }}>{result.tempPassword}</code>{' '}
                <button type="button" onClick={copyPassword} style={{ cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
                <br />
                Give this to them now. It is not shown again. On first sign-in they confirm their details and choose their own password.
                <div><button type="button" onClick={() => setResult(null)} style={{ marginTop: '8px', cursor: 'pointer' }}>Done</button></div>
              </div>
            ) : (
              `❌ Could not create profile: ${result.error}`
            )}
          </div>
        )}
      </div>
    </div>
  );
}
