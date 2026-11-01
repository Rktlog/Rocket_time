// src/components/ManagerStaffListView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { setEmployeeActive } from '../lib/staff';
import { viewHeadingStyle, cardStyle, subTextStyle, inputStyle, successBannerStyle, declineBtnStyle, editBtnStyle, modalOverlayStyle, modalBoxStyle, errorAlertStyle, responsiveTableWrapper } from '../lib/styles';

export default function ManagerStaffListView({ currentDepartment }) {
  const [deptStaff, setDeptStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchFilter] = useState('');
  const [userToRemove, setUserToRemove] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchDeptStaff();
  }, [currentDepartment]);

  const fetchDeptStaff = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, address, department, role')
        .neq('role', 'admin')
        .eq('active', true);

      if (currentDepartment && currentDepartment !== 'All Departments') {
        query = query.or(`department.ilike.${currentDepartment.trim()},department.is.null`);
      }
      const { data, error } = await query;
      if (!error && data) setDeptStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoval = async () => {
    if (!userToRemove) return;
    try {
      await setEmployeeActive(userToRemove.id, false);
      setDeptStaff(deptStaff.filter(u => u.id !== userToRemove.id));
      setMsg(`✅ ${userToRemove.full_name} deactivated. They can no longer sign in. Their history is kept.`);
    } catch (err) {
      setMsg(`❌ Could not deactivate: ${err.message}`);
    } finally {
      setUserToRemove(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filteredStaff = deptStaff.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 style={viewHeadingStyle}>Department Staff Roster</h2>
      <p style={subTextStyle}>Active employees in your department.</p>

      {msg && <div style={{ ...(msg.startsWith('') ? errorAlertStyle : successBannerStyle), marginBottom: '14px' }}>{msg}</div>}

      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Search department staff..."
          value={searchTerm}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: '16px', color: '#5E6A76', fontSize: '12px' }}>Loading department staff...</div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ padding: '16px', color: '#8B97A3', fontSize: '12px' }}>No staff members found.</div>
        ) : (
          <div style={responsiveTableWrapper}>
            <table style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #D8DEE3', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Staff Name</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Phone</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #EDF0F2' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#16212B', wordBreak: 'break-word' }}>{u.full_name}</td>
                    <td style={{ padding: '8px', color: '#5E6A76', wordBreak: 'break-all' }}>{u.email}</td>
                    <td style={{ padding: '8px', color: '#16212B' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button onClick={() => setUserToRemove(u)} style={declineBtnStyle}>
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {userToRemove && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalBoxStyle, maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#16212B' }}>
              ⚠️ Deactivate this employee?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#5E6A76', lineHeight: '1.4' }}>
              <strong>{userToRemove.full_name}</strong> will no longer be able to sign in, and will disappear from rosters and shift offers. Their time logs and history are kept. Only an admin can reactivate them.
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setUserToRemove(null)} style={{ ...editBtnStyle, padding: '6px 12px' }}>
                Cancel
              </button>
              <button onClick={confirmRemoval} style={{ ...declineBtnStyle, padding: '6px 12px' }}>
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
