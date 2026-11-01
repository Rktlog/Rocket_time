// Shared inline styles used across the app.
export const layoutStyle = { minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' };
export const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' };
export const logoStyle = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a' };
export const viewHeadingStyle = { margin: 0, fontSize: '18px', color: '#0f172a', wordBreak: 'break-word' };
export const mainContentStyle = { padding: '12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' };
export const dashboardGrid = { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' };
export const sidebarStyle = { display: 'flex', flexDirection: 'row', overflowX: 'auto', WebkitOverflowScrolling: 'touch', gap: '6px', paddingBottom: '4px', width: '100%', boxSizing: 'border-box' };
export const panelStyle = { backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minHeight: '380px', width: '100%', boxSizing: 'border-box' };
export const cardStyle = { backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' };
export const subTextStyle = { color: '#64748b', fontSize: '12px', marginTop: '2px', marginBottom: '16px', wordBreak: 'break-word' };
export const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '3px' };
export const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' };
export const successBannerStyle = { padding: '10px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '500', wordBreak: 'break-word' };

export const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '10px', marginBottom: '14px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '6px' };
export const weekNavBtnStyle = { padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#334155' };
export const todayBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' };

export const bulkApproveBtnStyle = { padding: '6px 12px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' };
export const approveBtnStyle = { padding: '5px 8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const declineBtnStyle = { padding: '5px 8px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const editBtnStyle = { padding: '5px 8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const promoteBtnStyle = { padding: '5px 8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const demoteBtnStyle = { padding: '5px 8px', backgroundColor: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };

export const sectionHeadingStyle = { margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a', borderLeft: '3px solid #2563eb', paddingLeft: '6px' };
export const dividerStyle = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' };

export const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' };
export const modalBoxStyle = { backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' };
export const closeModalBtnStyle = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' };

export const loginWrapperStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' };
export const loginCardStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', boxSizing: 'border-box' };
export const loginBtnStyle = { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' };
export const logoutBtnStyle = { padding: '5px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const errorAlertStyle = { padding: '8px 10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', wordBreak: 'break-word' };
export const timeInputStyle = { padding: '3px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' };
export const responsiveTableWrapper = { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };

export const navBtn = (isActive) => ({
  padding: '8px 12px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  borderRadius: '8px',
  border: 'none',
  backgroundColor: isActive ? '#e0e7ff' : '#ffffff',
  color: isActive ? '#3730a3' : '#475569',
  fontWeight: isActive ? 'bold' : '500',
  fontSize: '12px',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
});

export const btnStyle = (color) => ({
  padding: '8px 14px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '12px',
});

export const badgeStyle = (role) => {
  const normRole = String(role || 'user').toLowerCase().trim();
  return {
    padding: '3px 8px',
    backgroundColor: normRole === 'admin' ? '#f3e8ff' : normRole === 'manager' ? '#e0e7ff' : '#dcfce7',
    color: normRole === 'admin' ? '#7e22ce' : normRole === 'manager' ? '#3730a3' : '#15803d',
    borderRadius: '16px',
    fontSize: '10px',
    fontWeight: 'bold',
  };
};
// Small coloured pill for request / approval statuses
export const statusChipStyle = (status) => {
  const map = {
    Pending: ['#fef3c7', '#b45309'],
    'Awaiting colleague': ['#e0e7ff', '#3730a3'],
    'Awaiting manager': ['#fef3c7', '#b45309'],
    Approved: ['#dcfce7', '#15803d'],
    Declined: ['#fee2e2', '#b91c1c'],
    Cancelled: ['#e2e8f0', '#475569'],
  };
  const [bg, fg] = map[status] || ['#e2e8f0', '#475569'];
  return { padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', backgroundColor: bg, color: fg, whiteSpace: 'nowrap' };
};
