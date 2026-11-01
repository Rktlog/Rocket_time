// src/components/AdminEmployeeProfileModal.jsx
import React, { useState } from 'react';
import { labelStyle, inputStyle, approveBtnStyle, declineBtnStyle, modalOverlayStyle, modalBoxStyle, closeModalBtnStyle } from '../lib/styles';

export default function AdminEmployeeProfileModal({ userData, onClose, onSave }) {
  const [profile, setProfile] = useState({
    id: userData.id,
    full_name: userData.full_name || '',
    email: userData.email || '',
    phone: userData.phone || '',
    address: userData.address || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const editable = { ...profile };
    delete editable.email; // email is the login, never saved from here
    onSave(editable);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalBoxStyle, maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#16212B', wordBreak: 'break-word' }}>
            Employee: {profile.full_name}
          </h2>
          <button onClick={onClose} style={closeModalBtnStyle}>Close</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={profile.email} readOnly disabled title="Email is the login, so it can't be changed here" style={{ ...inputStyle, backgroundColor: '#EDF0F2', color: '#5E6A76' }} />
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Residential Address</label>
            <input type="text" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ ...declineBtnStyle, backgroundColor: '#C9D1D8' }}>Cancel</button>
            <button type="submit" style={approveBtnStyle}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
