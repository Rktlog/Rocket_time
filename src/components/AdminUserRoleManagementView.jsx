// src/components/AdminUserRoleManagementView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { expectRows } from '../lib/db';
import { setEmployeeActive } from '../lib/staff';
import { viewHeadingStyle, cardStyle, subTextStyle, inputStyle, successBannerStyle, errorAlertStyle, declineBtnStyle, approveBtnStyle, editBtnStyle, promoteBtnStyle, demoteBtnStyle, responsiveTableWrapper } from '../lib/styles';
import AdminEmployeeProfileModal from './AdminEmployeeProfileModal';

export default function AdminUserRoleManagementView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchFilter] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [msg, setMsg] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone, address, department, role, onboarding_completed, active');
      if (!error && data) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const normRole = String(currentRole || 'user').toLowerCase().trim();
    if (normRole === 'admin') return; // never change an admin from here
    const newRole = normRole === 'manager' ? 'user' : 'manager';

    try {
      await expectRows(supabase.from('profiles').update({ role: newRole }).eq('id', userId), 'change the role');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMsg(`✅ Role updated! User is now a ${newRole.toUpperCase()}.`);
    } catch (err) {
      setMsg(`❌ Role update failed: ${err.message}`);
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSaveModalProfile = async (updatedProfile) => {
    try {
      const { id, ...fields } = updatedProfile;
      await expectRows(supabase.from('profiles').update(fields).eq('id', id), 'save the profile');
      setUsers(users.map(u => u.id === id ? { ...u, ...fields } : u)); // keep role, department etc.
      setSelectedUserModal(null);
      setMsg(`✅ Profile record updated!`);
    } catch (err) {
      setMsg(`❌ Profile update failed: ${err.message}`);
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const toggleActive = async (u) => {
    const makeActive = u.active === false;
    const name = u.full_name || u.email;
    const question = makeActive
      ? `Reactivate ${name}? They will be able to sign in again.`
      : `Deactivate ${name}? They will no longer be able to sign in and will disappear from rosters and offers. Their history is kept.`;
    if (!window.confirm(question)) return;

    setBusyId(u.id);
    try {
      await setEmployeeActive(u.id, makeActive);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: makeActive } : x)));
      setMsg(`✅ ${name} ${makeActive ? 'reactivated' : 'deactivated'}.`);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusyId(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filteredUsers = users.filter(u =>
    (showInactive || u.active !== false) &&
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 style={viewHeadingStyle}>👥 Employee Roster & Role Control</h2>
      <p style={subTextStyle}>Admin Control: Inspect or update employee basic profile details and system roles.</p>

      {msg && <div style={{ ...(msg.startsWith('❌') ? errorAlertStyle : successBannerStyle), marginBottom: '14px' }}>{msg}</div>}

      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show deactivated staff
      </label>

      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="🔍 Search employee by name, email, or dept..."
          value={searchTerm}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>Loading real profiles...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>No profile records found.</div>
        ) : (
          <div style={responsiveTableWrapper}>
            <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Dept</th>
                  <th style={{ padding: '8px' }}>Role</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const normRole = String(u.role || 'user').toLowerCase().trim();
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', wordBreak: 'break-word' }} onClick={() => setSelectedUserModal(u)}>
                        {u.full_name || 'Unnamed'}
                        {u.active === false && (
                          <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c' }}>INACTIVE</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b', wordBreak: 'break-all' }}>{u.email}</td>
                      <td style={{ padding: '8px', color: '#0f172a' }}>🏢 {u.department || 'Unassigned'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                          backgroundColor: normRole === 'manager' ? '#e0e7ff' : normRole === 'admin' ? '#f3e8ff' : '#dcfce7',
                          color: normRole === 'manager' ? '#3730a3' : normRole === 'admin' ? '#7e22ce' : '#15803d',
                          whiteSpace: 'nowrap'
                        }}>
                          {normRole.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setSelectedUserModal(u)} style={editBtnStyle}>
                            👁️ View
                          </button>
                          {normRole !== 'admin' && (
                            <button
                              onClick={() => toggleActive(u)}
                              disabled={busyId === u.id}
                              style={u.active === false ? approveBtnStyle : declineBtnStyle}
                            >
                              {u.active === false ? '♻️ Reactivate' : '🚫 Deactivate'}
                            </button>
                          )}
                          {normRole === 'admin' || u.active === false ? null : normRole === 'manager' ? (
                            <button onClick={() => toggleRole(u.id, u.role)} style={demoteBtnStyle}>
                              ⬇️ Demote
                            </button>
                          ) : (
                            <button onClick={() => toggleRole(u.id, u.role)} style={promoteBtnStyle}>
                              ⬆️ Promote
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUserModal && (
        <AdminEmployeeProfileModal
          userData={selectedUserModal}
          onClose={() => setSelectedUserModal(null)}
          onSave={handleSaveModalProfile}
        />
      )}
    </div>
  );
}
