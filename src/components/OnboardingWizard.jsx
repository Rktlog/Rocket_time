import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function OnboardingWizard({ user, onComplete }) {
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    phone: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const departmentName = user?.user_metadata?.department_name || 'Unassigned Department';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      if (onComplete) onComplete();
    } catch (err) {
      alert(`Onboarding error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* 🏢 EMPLOYEE WELCOME HEADER & DEPARTMENT BADGE */}
      <div style={{ backgroundColor: '#f1f5f9', padding: '16px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Welcome, {formData.fullName || 'Employee'}! 👋
          </h3>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Please complete your contact details below.</span>
        </div>

        <div style={{ padding: '6px 14px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
          🏢 Dept: {departmentName}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Personal & Contact Details</h4>

          <label style={labelStyle}>Full Name</label>
          <input name="fullName" value={formData.fullName} onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Phone Number</label>
          <input name="phone" placeholder="0400 000 000" value={formData.phone} onChange={handleChange} required style={inputStyle} />

          <label style={labelStyle}>Residential Address</label>
          <input name="address" placeholder="123 Street, Suburb VIC 3000" value={formData.address} onChange={handleChange} required style={inputStyle} />
        </div>

        {/* SUBMIT BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, backgroundColor: loading ? '#94a3b8' : '#16a34a' }}>
            {loading ? 'Saving...' : 'Complete Onboarding ✅'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Styling definitions
const inputStyle = { width: '100%', padding: '10px 12px', marginBottom: '14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const primaryBtnStyle = { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };