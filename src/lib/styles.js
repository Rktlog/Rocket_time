// Shared inline styles used across the app.
export const layoutStyle = { minHeight: '100vh', backgroundColor: '#EDF0F2', };
export const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#ffffff', borderBottom: '1px solid #D8DEE3', flexWrap: 'wrap', gap: '8px' };
export const logoStyle = { fontSize: '18px', fontWeight: 'bold', color: '#16212B' };
export const viewHeadingStyle = { margin: 0, fontSize: '18px', fontWeight: 600, color: '#16212B', wordBreak: 'break-word' };
export const mainContentStyle = { padding: '12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' };
export const dashboardGrid = { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' };
export const sidebarStyle = { display: 'flex', flexDirection: 'row', overflowX: 'auto', WebkitOverflowScrolling: 'touch', gap: '6px', paddingBottom: '4px', width: '100%', boxSizing: 'border-box' };
export const panelStyle = { backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', minHeight: '380px', width: '100%', boxSizing: 'border-box' };
export const cardStyle = { backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #D8DEE3', boxSizing: 'border-box' };
export const subTextStyle = { color: '#5E6A76', fontSize: '12px', marginTop: '2px', marginBottom: '16px', wordBreak: 'break-word' };
export const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#3A4753', marginBottom: '4px' };
export const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #C9D1D8', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#16212B' };
export const successBannerStyle = { padding: '10px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '500', wordBreak: 'break-word' };

export const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#EDF0F2', borderRadius: '10px', marginBottom: '14px', border: '1px solid #C9D1D8', flexWrap: 'wrap', gap: '6px' };
export const weekNavBtnStyle = { padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #C9D1D8', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#3A4753' };
export const todayBtnStyle = { background: 'none', border: 'none', color: '#2F5D7C', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' };

export const bulkApproveBtnStyle = { padding: '6px 12px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' };
export const approveBtnStyle = { padding: '5px 8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const declineBtnStyle = { padding: '5px 8px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const editBtnStyle = { padding: '5px 8px', backgroundColor: '#EDF0F2', color: '#3A4753', border: '1px solid #C9D1D8', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const promoteBtnStyle = { padding: '5px 8px', backgroundColor: '#2F5D7C', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const demoteBtnStyle = { padding: '5px 8px', backgroundColor: '#D8DEE3', color: '#3A4753', border: '1px solid #C9D1D8', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };

export const sectionHeadingStyle = { margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#16212B' };
export const dividerStyle = { border: 'none', borderTop: '1px solid #D8DEE3', margin: '4px 0' };

export const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' };
export const modalBoxStyle = { backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' };
export const closeModalBtnStyle = { background: 'none', border: 'none', color: '#5E6A76', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' };

export const loginWrapperStyle = { display: 'flex', justifyContent: 'center' };
export const loginCardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', boxSizing: 'border-box' };
export const loginBtnStyle = { width: '100%', padding: '12px', backgroundColor: '#16212B', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' };
export const logoutBtnStyle = { padding: '5px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
export const errorAlertStyle = { padding: '8px 10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', wordBreak: 'break-word' };
export const timeInputStyle = { padding: '3px 5px', borderRadius: '4px', border: '1px solid #C9D1D8', fontSize: '11px', fontWeight: 'bold' };
export const responsiveTableWrapper = { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };

export const navBtn = (isActive) => ({
  padding: '8px 12px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  borderRadius: '8px',
  border: 'none',
  backgroundColor: isActive ? '#DCE8F0' : '#ffffff',
  color: isActive ? '#244A63' : '#4A5763',
  fontWeight: isActive ? 'bold' : '500',
  fontSize: '12px',
  cursor: 'pointer',
  
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
    backgroundColor: normRole === 'admin' ? '#f3e8ff' : normRole === 'manager' ? '#DCE8F0' : '#dcfce7',
    color: normRole === 'admin' ? '#7e22ce' : normRole === 'manager' ? '#244A63' : '#15803d',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold',
  };
};
// Small coloured pill for request / approval statuses
export const statusChipStyle = (status) => {
  const map = {
    Pending: ['#fef3c7', '#b45309'],
    'Awaiting colleague': ['#DCE8F0', '#244A63'],
    'Awaiting manager': ['#fef3c7', '#b45309'],
    Approved: ['#dcfce7', '#15803d'],
    Declined: ['#fee2e2', '#b91c1c'],
    Cancelled: ['#D8DEE3', '#4A5763'],
  };
  const [bg, fg] = map[status] || ['#D8DEE3', '#4A5763'];
  return { padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', backgroundColor: bg, color: fg, whiteSpace: 'nowrap' };
};
