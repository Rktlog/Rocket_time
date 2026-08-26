// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

// Sub-components
import AdminPanel from './components/AdminPanel';
import TimeClock from './components/TimeClock';
import ShiftRoster from './components/ShiftRoster';
import WeeklyAvailability from './components/WeeklyAvailability';
import MyTimesheet from './components/MyTimesheet';
import MasterSettings from './components/MasterSettings';
import ManagerRosterManager from './components/ManagerRosterManager';

/* =========================================
   REACT ERROR BOUNDARY COMPONENT
   ========================================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          color: '#991b1b',
          margin: '16px auto',
          maxWidth: '600px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>⚠️ Something went wrong in this workspace view.</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#7f1d1d', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Shared State
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteSite, setInviteSite] = useState('');
  const [employmentType, setEmploymentType] = useState('Full Time');
  const [inviteSent, setInviteSent] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchDepartmentsAndSites();
  }, []);

  const fetchDepartmentsAndSites = async () => {
    try {
      const { data: deptData } = await supabase.from('departments').select('*');
      if (deptData && deptData.length > 0) {
        setDepartments(deptData);
        setInviteDept(deptData[0].name);
      }

      const { data: siteData } = await supabase.from('sites').select('*');
      if (siteData && siteData.length > 0) {
        setSites(siteData);
        setInviteSite(siteData[0].name);
      }
    } catch (err) {
      console.error('Error fetching departments or sites:', err);
    }
  };

  const handleSendInvite = async (e, overrideDept = null, overrideSite = null) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName) return;

    const targetDept = overrideDept || inviteDept;
    const targetSite = overrideSite || inviteSite;

    try {
      await supabase.from('invitations').insert([
        {
          full_name: inviteFullName,
          email: inviteEmail,
          department: targetDept,
          location: targetSite,
          employment_type: employmentType,
        },
      ]);
    } catch (err) {
      console.log('Invite recorded');
    }

    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 4000);
    setInviteFullName('');
    setInviteEmail('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <div style={layoutStyle}>
      {/* HEADER BAR */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={logoStyle}>🚀 Rocket Time</div>
          {currentUser && (
            <span style={badgeStyle(currentUser.role)}>
              {currentUser.role.toUpperCase()} PORTAL
            </span>
          )}
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-word' }}>
              Logged in: <strong>{currentUser.name}</strong> ({currentUser.department})
            </div>
            <button onClick={handleLogout} style={logoutBtnStyle}>
              🚪 Log Out
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA WITH ERROR BOUNDARY */}
      <main style={mainContentStyle}>
        {!currentUser ? (
          <MasterLoginPortal onLoginSuccess={setCurrentUser} />
        ) : (
          <ErrorBoundary>
            {currentUser.role === 'admin' && (
              <AdminDashboard
                currentUser={currentUser}
                departments={departments}
                sites={sites}
                inviteFullName={inviteFullName}
                setInviteFullName={setInviteFullName}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteDept={inviteDept}
                setInviteDept={setInviteDept}
                inviteSite={inviteSite}
                setInviteSite={setInviteSite}
                employmentType={employmentType}
                setEmploymentType={setEmploymentType}
                handleSendInvite={handleSendInvite}
                inviteSent={inviteSent}
                refreshData={fetchDepartmentsAndSites}
              />
            )}
            {currentUser.role === 'manager' && (
              <ManagerDashboard
                currentUser={currentUser}
                inviteFullName={inviteFullName}
                setInviteFullName={setInviteFullName}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                employmentType={employmentType}
                setEmploymentType={setEmploymentType}
                handleSendInvite={handleSendInvite}
                inviteSent={inviteSent}
              />
            )}
            {(currentUser.role === 'user' || currentUser.role === 'employee') && (
              <UserDashboard currentUser={currentUser} />
            )}
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

/* =========================================
   LOGIN PORTAL
   ========================================= */
function MasterLoginPortal({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, department, location')
          .eq('id', data.user.id)
          .single();

        const rawRole = profile?.role || data.user.user_metadata?.role || 'user';
        const userRole = String(rawRole).toLowerCase().trim();

        const userName = profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0];
        const userDept = profile?.department || data.user.user_metadata?.department_name || 'englite';
        const userLoc = profile?.location || 'Englite campbellfield';

        onLoginSuccess({
          id: data.user.id,
          name: userName,
          email: data.user.email,
          role: userRole,
          department: userDept,
          location: userLoc,
        });
      }
    } catch (err) {
      setErrorMsg('❌ ' + (err.message || 'Invalid credentials. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginWrapperStyle}>
      <div style={loginCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>🚀</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>
            Rocket Time Login
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Enter your workplace credentials to access your workspace.
          </p>
        </div>

        {errorMsg && <div style={errorAlertStyle}>{errorMsg}</div>}

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={loginBtnStyle}>
            {loading ? 'Authenticating...' : 'Sign In 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   1. ADMIN DASHBOARD
   ========================================= */
function AdminDashboard({
  currentUser, departments, sites, inviteFullName, setInviteFullName, inviteEmail, setInviteEmail,
  inviteDept, setInviteDept, inviteSite, setInviteSite, employmentType, setEmploymentType, handleSendInvite, inviteSent, refreshData
}) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        <button onClick={() => setActiveTab('users')} style={navBtn(activeTab === 'users')}>👥 Users & Profiles</button>
        <button onClick={() => setActiveTab('sites')} style={navBtn(activeTab === 'sites')}>📍 Sites & Depts</button>
        <button onClick={() => setActiveTab('invites')} style={navBtn(activeTab === 'invites')}>✉️ Send Invites</button>
        <button onClick={() => setActiveTab('payroll')} style={navBtn(activeTab === 'payroll')}>📊 Global Payroll</button>
        <button onClick={() => setActiveTab('reports')} style={navBtn(activeTab === 'reports')}>📧 Reports</button>
        <button onClick={() => setActiveTab('system')} style={navBtn(activeTab === 'system')}>⚙️ Settings</button>
      </aside>

      <div style={panelStyle}>
        {activeTab === 'users' && <AdminUserRoleManagementView />}
        {activeTab === 'sites' && <AdminPanel onDataChange={refreshData} />}

        {activeTab === 'invites' && (
          <div>
            <h2 style={viewHeadingStyle}>✉️ Send Employee Invitation</h2>
            <p style={subTextStyle}>Send an onboarding invitation specifying department, site, and employment type.</p>
            <div style={{ ...cardStyle, maxWidth: '500px' }}>
              <form onSubmit={handleSendInvite}>
                <label style={labelStyle}>Employee Full Name</label>
                <input type="text" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} required style={{ ...inputStyle, width: '100%', marginBottom: '12px' }} />
                
                <label style={labelStyle}>Employee Email</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required style={{ ...inputStyle, width: '100%', marginBottom: '12px' }} />
                
                <label style={labelStyle}>Assign Site / Location</label>
                <select value={inviteSite} onChange={(e) => setInviteSite(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '12px' }}>
                  {sites.map((site) => <option key={site.id} value={site.name}>📍 {site.name}</option>)}
                </select>

                <label style={labelStyle}>Assign Department</label>
                <select value={inviteDept} onChange={(e) => setInviteDept(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '12px' }}>
                  {departments.map((dept) => <option key={dept.id} value={dept.name}>🏢 {dept.name}</option>)}
                </select>

                <label style={labelStyle}>Employment Type</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '16px' }}>
                  <option value="Full Time">💼 Full Time</option>
                  <option value="Part Time">⏱️ Part Time</option>
                  <option value="Casual">📅 Casual</option>
                </select>
                <button type="submit" style={btnStyle('#2563eb')}>Send Invite Link 🚀</button>
              </form>
              {inviteSent && <div style={successBannerStyle}>✅ Invitation sent to {inviteEmail}!</div>}
            </div>
          </div>
        )}

        {activeTab === 'payroll' && <AdminWeeklyPayrollView />}
        {activeTab === 'reports' && <AdminReportSchedulerView />}
        {activeTab === 'system' && <MasterSettings />}
      </div>
    </div>
  );
}

function AdminWeeklyPayrollView() {
  return (
    <div>
      <h2 style={viewHeadingStyle}>📊 Global Payroll & Shift Summaries</h2>
      <p style={subTextStyle}>Review and approve accumulated time logs for all company departments across active sites.</p>
      <DepartmentTimeLogsView department="All Departments" />
    </div>
  );
}

/* =========================================
   2. MANAGER DASHBOARD
   ========================================= */
function ManagerDashboard({
  currentUser, inviteFullName, setInviteFullName, inviteEmail, setInviteEmail,
  employmentType, setEmploymentType, handleSendInvite, inviteSent,
}) {
  const [activeTab, setActiveTab] = useState('timeclock');

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        <button onClick={() => setActiveTab('timeclock')} style={navBtn(activeTab === 'timeclock')}>⏱️ Time Clock</button>
        <button onClick={() => setActiveTab('mytimesheet')} style={navBtn(activeTab === 'mytimesheet')}>📋 Timesheet</button>
        <button onClick={() => setActiveTab('users')} style={navBtn(activeTab === 'users')}>👥 Staff</button>
        <button onClick={() => setActiveTab('availability')} style={navBtn(activeTab === 'availability')}>⏱️ Availability</button>
        <button onClick={() => setActiveTab('rostering')} style={navBtn(activeTab === 'rostering')}>📅 Rostering</button>
        <button onClick={() => setActiveTab('invites')} style={navBtn(activeTab === 'invites')}>✉️ Invites</button>
        <button onClick={() => setActiveTab('logs')} style={navBtn(activeTab === 'logs')}>🏢 Logs</button>
        <button onClick={() => setActiveTab('settings')} style={navBtn(activeTab === 'settings')}>⚙️ Settings</button>
      </aside>

      <div style={panelStyle}>
        {activeTab === 'timeclock' && <TimeClock employee={{ name: currentUser.name, department: currentUser.department, location: currentUser.location }} />}
        {activeTab === 'mytimesheet' && <MyTimesheet user={currentUser} />}
        {activeTab === 'users' && <ManagerStaffListView currentDepartment={currentUser.department} />}
        {activeTab === 'availability' && <ManagerInstantAvailabilityView department={currentUser.department} location={currentUser.location} />}
        {activeTab === 'rostering' && <ManagerRosterManager department={currentUser.department} />}

        {activeTab === 'invites' && (
          <div>
            <h2 style={viewHeadingStyle}>✉️ Onboarding Invites</h2>
            <p style={subTextStyle}>
              Send onboarding registration links. Invited staff will automatically be assigned to <strong>{currentUser.department}</strong> at <strong>{currentUser.location}</strong>.
            </p>
            <div style={{ ...cardStyle, maxWidth: '500px' }}>
              <form onSubmit={(e) => handleSendInvite(e, currentUser.department, currentUser.location)}>
                <label style={labelStyle}>Employee Full Name</label>
                <input 
                  type="text" 
                  value={inviteFullName} 
                  onChange={(e) => setInviteFullName(e.target.value)} 
                  required 
                  style={{ ...inputStyle, width: '100%', marginBottom: '12px' }} 
                />
                
                <label style={labelStyle}>Employee Email</label>
                <input 
                  type="email" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                  required 
                  style={{ ...inputStyle, width: '100%', marginBottom: '12px' }} 
                />
                
                <label style={labelStyle}>Employment Type</label>
                <select 
                  value={employmentType} 
                  onChange={(e) => setEmploymentType(e.target.value)} 
                  style={{ ...inputStyle, width: '100%', marginBottom: '16px' }}
                >
                  <option value="Full Time">💼 Full Time</option>
                  <option value="Part Time">⏱️ Part Time</option>
                  <option value="Casual">📅 Casual</option>
                </select>

                <button type="submit" style={btnStyle('#0f172a')}>Send Invite Link 🚀</button>
              </form>
              {inviteSent && <div style={{ ...successBannerStyle, marginTop: '16px' }}>✅ Invitation sent to {inviteEmail}!</div>}
            </div>
          </div>
        )}

        {activeTab === 'logs' && <DepartmentTimeLogsView department={currentUser.department} />}
        {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Manager" />}
      </div>
    </div>
  );
}

/* =========================================
   3. USER (EMPLOYEE) DASHBOARD
   ========================================= */
function UserDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('offers');

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        <button onClick={() => setActiveTab('offers')} style={navBtn(activeTab === 'offers')}>📬 Offers</button>
        <button onClick={() => setActiveTab('timeclock')} style={navBtn(activeTab === 'timeclock')}>⏱️ Time Clock</button>
        <button onClick={() => setActiveTab('roster')} style={navBtn(activeTab === 'roster')}>📅 Roster</button>
        <button onClick={() => setActiveTab('availability')} style={navBtn(activeTab === 'availability')}>⏱️ Availability</button>
        <button onClick={() => setActiveTab('timesheet')} style={navBtn(activeTab === 'timesheet')}>📋 Timesheet</button>
        <button onClick={() => setActiveTab('settings')} style={navBtn(activeTab === 'settings')}>⚙️ Settings</button>
      </aside>

      <div style={panelStyle}>
        {activeTab === 'offers' && <PendingOffersView user={currentUser} />}
        {activeTab === 'timeclock' && <TimeClock employee={{ name: currentUser.name, department: currentUser.department, location: currentUser.location }} />}
        {activeTab === 'roster' && <ShiftRoster user={currentUser} />}
        {activeTab === 'availability' && <WeeklyAvailability user={currentUser} />}
        {activeTab === 'timesheet' && <MyTimesheet user={currentUser} />}
        {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Employee" />}
      </div>
    </div>
  );
}

/* =========================================
   INSTANT STAFF AVAILABILITY VIEW (SYNCED WITH STAFF UPDATES)
   ========================================= */
function ManagerInstantAvailabilityView({ department, location }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [staffRoster, setStaffRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [msg, setMsg] = useState('');

  function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  useEffect(() => {
    fetchAvailableStaff();
  }, [department, currentWeekStart, selectedDay]);

 const fetchAvailableStaff = async () => {
    setLoading(true);
    const weekStartStr = currentWeekStart.toISOString().split('T')[0];

    try {
      // 1. Fetch profiles cleanly without strict role/dept blockers
      let { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, name, email, department, role');

      if (pErr) throw pErr;

      // Filter out admins locally to avoid query syntax issues
      let activeStaff = (profiles || []).filter(p => String(p.role).toLowerCase() !== 'admin');

      // Filter by department if a specific non-global department is selected
      if (department && department !== 'All Departments' && department !== 'All Staff') {
        const targetDept = department.trim().toLowerCase();
        activeStaff = activeStaff.filter(p => {
          if (!p.department) return true; // Include unassigned staff as fallbacks
          return p.department.trim().toLowerCase().includes(targetDept);
        });
      }

      // 2. Fetch weekly availability logs for the chosen day
      const { data: availData, error: aErr } = await supabase
        .from('weekly_availability')
        .select('*')
        .eq('day', selectedDay);

      if (aErr) console.warn('Availability query warning:', aErr.message);

      // Create lookup map by user_id
      const availMap = {};
      (availData || []).forEach(a => {
        if (!a.week_start || a.week_start === weekStartStr) {
          availMap[a.user_id] = {
            isAvailable: a.is_available ?? true,
            startTime: a.start_time ? String(a.start_time).slice(0, 5) : '08:30',
            endTime: a.end_time ? String(a.end_time).slice(0, 5) : '16:30'
          };
        }
      });

      // 3. Map availability directly onto the staff list
      const processed = activeStaff.map(staff => {
        const pref = availMap[staff.id];
        const isAvail = pref ? pref.isAvailable : true;
        const timing = pref ? `${pref.startTime} - ${pref.endTime}` : '08:30 - 16:30';

        return {
          ...staff,
          isAvailable: isAvail,
          timing
        };
      });

      setStaffRoster(processed);
    } catch (err) {
      console.error('Error in instant availability view:', err);
      setStaffRoster([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInstantOffer = async (staffMember) => {
    setSendingId(staffMember.id);
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(selectedDay);
    const shiftDateObj = new Date(currentWeekStart);
    shiftDateObj.setDate(shiftDateObj.getDate() + dayIndex);
    const shiftDateStr = shiftDateObj.toISOString().split('T')[0];

    try {
      const { error } = await supabase.from('shift_offers').insert([
        {
          employee_id: staffMember.id,
          employee_email: (staffMember.email || '').trim().toLowerCase(),
          day: selectedDay,
          week_start: currentWeekStart.toISOString().split('T')[0],
          shift_date: shiftDateStr,
          location: location || 'Englite campbellfield',
          shift_time: staffMember.timing || '08:30 - 16:30',
          status: 'Pending',
        },
      ]);

      if (error) throw error;
      setMsg(`✅ Shift offer dispatched to ${staffMember.full_name || staffMember.name} for ${selectedDay} (${shiftDateStr})!`);
    } catch (err) {
      setMsg(`❌ Failed to dispatch offer: ${err.message}`);
    } finally {
      setSendingId(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>⏱️ Instant Staff Availability & Shift Offers</h2>
      <p style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', marginBottom: '16px' }}>Select target week and day to inspect staff availability and send shift offers.</p>

      {msg && <div style={{ padding: '10px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '500', marginBottom: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '10px', marginBottom: '14px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '6px' }}>
        <button onClick={() => changeWeek(-1)} style={{ padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#334155' }}>◀ Prev</button>
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0f172a', textAlign: 'center' }}>
          {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button onClick={() => changeWeek(1)} style={{ padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#334155' }}>Next ▶</button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
          const dateObj = new Date(currentWeekStart);
          dateObj.setDate(dateObj.getDate() + idx);
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flexShrink: 0,
                backgroundColor: selectedDay === day ? '#2563eb' : '#e2e8f0',
                color: selectedDay === day ? '#ffffff' : '#334155'
              }}
            >
              <div>{day.slice(0, 3)}</div>
              <div style={{ fontSize: '9px', opacity: 0.8 }}>{dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</div>
            </button>
          );
        })}
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0f172a' }}>
          Availability for <strong>{selectedDay}</strong> ({department || 'All Staff'})
        </h4>

        {loading ? (
          <div style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>Checking staff availability...</div>
        ) : staffRoster.length === 0 ? (
          <div style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>No employees registered in the system.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffRoster.map(staff => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a', wordBreak: 'break-word' }}>{staff.full_name || staff.name || 'Unnamed Staff'}</td>
                    <td style={{ padding: '8px', color: '#64748b', wordBreak: 'break-all' }}>{staff.email}</td>
                    <td style={{ padding: '8px' }}>
                      {staff.isAvailable ? (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', whiteSpace: 'nowrap' }}>
                          🟢 Available ({staff.timing})
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#dc2626', whiteSpace: 'nowrap' }}>
                          🔴 Marked Unavailable
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleSendInstantOffer(staff)}
                        disabled={sendingId === staff.id || !staff.isAvailable}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: staff.isAvailable ? 'pointer' : 'not-allowed',
                          backgroundColor: !staff.isAvailable ? '#cbd5e1' : sendingId === staff.id ? '#94a3b8' : '#2563eb',
                          color: '#ffffff',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {!staff.isAvailable ? 'Unavailable' : sendingId === staff.id ? 'Sending...' : 'Offer Shift 🚀'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Pending Shift Offers Component with Day Name Display
function PendingOffersView({ user }) {
  const [shiftOffers, setShiftOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const formatDayAndDate = (dateStr) => {
    if (!dateStr) return { dayName: 'Scheduled Day', formattedDate: '' };
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return { dayName, formattedDate };
  };

  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    fetchShiftOffers().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user]);

  const fetchShiftOffers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const cleanEmail = (user.email || '').trim().toLowerCase();

    try {
      const { data: offersData, error: offersErr } = await supabase
        .from('shift_offers')
        .select('*')
        .or(`employee_email.ilike.${cleanEmail},employee_id.eq.${user.id}`)
        .eq('status', 'Pending');

      if (offersErr) console.warn('shift_offers fetch warning:', offersErr.message);

      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('shifts')
        .select('*')
        .or(`user_id.eq.${user.id},offered_to_email.ilike.${cleanEmail}`)
        .eq('status', 'Pending');

      if (shiftsErr) console.warn('shifts fetch warning:', shiftsErr.message);

      const combined = [
        ...(offersData || []).map(o => ({ ...o, source: 'shift_offers' })),
        ...(shiftsData || []).map(s => ({ ...s, source: 'shifts' }))
      ];

      setShiftOffers(combined);
    } catch (err) {
      console.error('Error fetching shift offers:', err);
      setShiftOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offer) => {
    try {
      const targetDate = offer.shift_date || offer.date;
      const cleanEmail = (user.email || '').trim().toLowerCase();

      if (offer.source === 'shift_offers') {
        const { error: offerErr } = await supabase
          .from('shift_offers')
          .update({ status: 'Accepted' })
          .eq('id', offer.id);

        if (offerErr) throw offerErr;
      }

      const rawTime = offer.shift_time || '08:30 - 16:30';
      const [startTimeStr, endTimeStr] = rawTime.includes('-') ? rawTime.split('-') : ['08:30', '16:30'];
      const cleanStart = startTimeStr ? startTimeStr.trim() : '08:30';
      const cleanEnd = endTimeStr ? endTimeStr.trim() : '16:30';

      const formattedStart = cleanStart.length === 5 ? `${cleanStart}:00` : cleanStart;
      const formattedEnd = cleanEnd.length === 5 ? `${cleanEnd}:00` : cleanEnd;

      const startIso = new Date(`${targetDate}T${formattedStart}`).toISOString();
      const endIso = new Date(`${targetDate}T${formattedEnd}`).toISOString();

      const { error: shiftErr } = await supabase
        .from('shifts')
        .upsert(
          [
            {
              user_id: user.id,
              employee_name: user.name || user.full_name || 'Employee',
              offered_to_email: cleanEmail,
              department: user.department || 'englite',
              shift_date: targetDate,
              start_time: startIso,
              end_time: endIso,
              status: 'Accepted',
            },
          ],
          { onConflict: 'user_id, shift_date' }
        );

      if (shiftErr) throw shiftErr;

      setShiftOffers(prev => prev.filter(o => o.id !== offer.id));
      setMsg({ text: '✅ Shift accepted! It is now live on your roster.', isError: false });
    } catch (err) {
      console.error('Accept offer error:', err);
      setMsg({ text: `❌ Failed to accept shift: ${err.message}`, isError: true });
    }
  };

  const handleDecline = async (offer) => {
    try {
      if (offer.source === 'shift_offers') {
        const { error } = await supabase
          .from('shift_offers')
          .update({ status: 'Declined' })
          .eq('id', offer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shifts')
          .update({ status: 'Declined' })
          .eq('id', offer.id);
        if (error) throw error;
      }

      setShiftOffers(prev => prev.filter(o => o.id !== offer.id));
      setMsg({ text: '🚫 Shift offer declined.', isError: false });
    } catch (err) {
      console.error('Decline offer error:', err);
      setMsg({ text: `❌ Failed to decline shift: ${err.message}`, isError: true });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>⌛ Checking shift offers...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>📬 Pending Shift Offers</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Review and accept open shifts offered by your manager.
          </p>
        </div>
        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
          {shiftOffers.length} {shiftOffers.length === 1 ? 'Available' : 'Available'}
        </span>
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {shiftOffers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', border: '1px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>☕</div>
          <h4 style={{ margin: 0, color: '#334155', fontSize: '14px' }}>No Pending Shift Offers</h4>
          <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
            You're all caught up! New shift invitations will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {shiftOffers.map((offer) => {
            const rawDate = offer.shift_date || offer.date;
            const { dayName, formattedDate } = formatDayAndDate(rawDate);

            return (
              <div key={offer.id} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '2px solid #3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                      📅 {dayName}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '2px' }}>
                      {formattedDate || rawDate}
                    </div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                    PENDING
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Hours</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2563eb', marginTop: '2px' }}>
                    ⏰ {offer.shift_time || '08:30 - 16:30'}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px', wordBreak: 'break-word' }}>
                  📍 <strong>Location:</strong> Englite Campbellfield
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAccept(offer)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleDecline(offer)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================
   ADMIN USER ROLE & PROFILE CONTROL
   ========================================= */
function AdminUserRoleManagementView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchFilter] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone, address, department, role, onboarding_completed');
      if (!error && data) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const normRole = String(currentRole || 'user').toLowerCase().trim();
    const newRole = normRole === 'manager' ? 'user' : 'manager';

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setMsg(`✅ Role updated! User is now a ${newRole.toUpperCase()}.`);
        setTimeout(() => setMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveModalProfile = async (updatedProfile) => {
    try {
      const { error } = await supabase.from('profiles').upsert(updatedProfile);
      if (!error) {
        setUsers(users.map(u => u.id === updatedProfile.id ? updatedProfile : u));
        setSelectedUserModal(null);
        setMsg(`✅ Profile record updated!`);
        setTimeout(() => setMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 style={viewHeadingStyle}>👥 Employee Roster & Role Control</h2>
      <p style={subTextStyle}>Admin Control: Inspect or update employee basic profile details and system roles.</p>

      {msg && <div style={{ ...successBannerStyle, marginBottom: '14px' }}>{msg}</div>}

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
                        {u.full_name || u.name || 'Unnamed'}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b', wordBreak: 'break-all' }}>{u.email}</td>
                      <td style={{ padding: '8px', color: '#0f172a' }}>🏢 {u.department || 'englite'}</td>
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
                          {normRole === 'manager' ? (
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

/* =========================================
   MANAGER DEPT STAFF LIST
   ========================================= */
function ManagerStaffListView({ currentDepartment }) {
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
        .neq('role', 'admin');

      if (currentDepartment && currentDepartment !== 'All Departments') {
        query = query.or(`department.ilike.%${currentDepartment.trim()}%,department.is.null`);
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
      await supabase.from('profiles').update({ department: 'Unassigned' }).eq('id', userToRemove.id);
      setDeptStaff(deptStaff.filter(u => u.id !== userToRemove.id));
      setMsg(`✅ Removed ${userToRemove.full_name || userToRemove.name} from roster.`);
    } catch (err) {
      setDeptStaff(deptStaff.filter(u => u.id !== userToRemove.id));
    } finally {
      setUserToRemove(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filteredStaff = deptStaff.filter(u =>
    (u.full_name || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 style={viewHeadingStyle}>👥 Department Staff Roster</h2>
      <p style={subTextStyle}>View employees assigned under your department management.</p>

      {msg && <div style={{ ...successBannerStyle, marginBottom: '14px' }}>{msg}</div>}

      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="🔍 Search department staff..."
          value={searchTerm}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>Loading department staff...</div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>No staff members found.</div>
        ) : (
          <div style={responsiveTableWrapper}>
            <table style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Staff Name</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Phone</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a', wordBreak: 'break-word' }}>{u.full_name || u.name}</td>
                    <td style={{ padding: '8px', color: '#64748b', wordBreak: 'break-all' }}>{u.email}</td>
                    <td style={{ padding: '8px', color: '#0f172a' }}>📞 {u.phone || 'N/A'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button onClick={() => setUserToRemove(u)} style={declineBtnStyle}>
                        ❌ Remove
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>
              ⚠️ Confirm Staff Removal
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Are you sure you want to remove <strong>{userToRemove.full_name || userToRemove.name}</strong> from the department roster list?
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setUserToRemove(null)} style={{ ...editBtnStyle, padding: '6px 12px' }}>
                Cancel
              </button>
              <button onClick={confirmRemoval} style={{ ...declineBtnStyle, padding: '6px 12px' }}>
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================
   INSPECTOR PROFILE MODAL
   ========================================= */
function AdminEmployeeProfileModal({ userData, onClose, onSave }) {
  const [profile, setProfile] = useState({
    id: userData.id,
    full_name: userData.full_name || userData.name || '',
    email: userData.email || '',
    phone: userData.phone || '',
    address: userData.address || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(profile);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalBoxStyle, maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#0f172a', wordBreak: 'break-word' }}>
            👤 Employee: {profile.full_name}
          </h2>
          <button onClick={onClose} style={closeModalBtnStyle}>✕ Close</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Residential Address</label>
            <input type="text" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ ...declineBtnStyle, backgroundColor: '#cbd5e1' }}>Cancel</button>
            <button type="submit" style={approveBtnStyle}>Save Changes 💾</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   AUTOMATED REPORTS SCHEDULER
   ========================================= */
function AdminReportSchedulerView() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [dispatchDay, setDispatchDay] = useState('Monday');
  const [dispatchTime, setDispatchTime] = useState('08:00');
  const [frequency, setFrequency] = useState('Weekly');
  const [schedules, setSchedules] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase.from('report_schedules').select('*');
      if (!error && data) setSchedules(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!recipientEmail) return;

    const newObj = { email: recipientEmail, day: dispatchDay, time: dispatchTime, freq: frequency };

    try {
      const { data, error } = await supabase.from('report_schedules').insert([newObj]).select();
      if (!error && data) {
        setSchedules([...schedules, data[0]]);
      } else {
        setSchedules([...schedules, { id: Date.now().toString(), ...newObj }]);
      }
    } catch (err) {
      setSchedules([...schedules, { id: Date.now().toString(), ...newObj }]);
    }

    setMsg(`✅ Scheduled automated ${frequency} report to ${recipientEmail} on ${dispatchDay}s at ${dispatchTime}!`);
    setTimeout(() => setMsg(''), 4000);
    setRecipientEmail('');
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await supabase.from('report_schedules').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
    setSchedules(schedules.filter(s => s.id !== id));
  };

  return (
    <div>
      <h2 style={viewHeadingStyle}>📧 Automated Timesheet Reports</h2>
      <p style={subTextStyle}>Configure recipient emails, dispatch days, and exact times for automated report delivery.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a' }}>➕ Schedule New Report</h3>
          
          <form onSubmit={handleCreateSchedule}>
            <label style={labelStyle}>Recipient Email Address</label>
            <input
              type="email"
              placeholder="e.g. payroll@company.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}
            />

            <label style={labelStyle}>Report Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}
            >
              <option value="Weekly">📅 Weekly Summary</option>
              <option value="Bi-Weekly">🗓️ Bi-Weekly Summary</option>
              <option value="Monthly">📊 Monthly Payroll Report</option>
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Dispatch Day</label>
                <select
                  value={dispatchDay}
                  onChange={(e) => setDispatchDay(e.target.value)}
                  style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Dispatch Time</label>
                <input
                  type="time"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  required
                  style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
                />
              </div>
            </div>

            <button type="submit" style={btnStyle('#2563eb')}>Save Schedule 🚀</button>
          </form>

          {msg && <div style={{ ...successBannerStyle, marginTop: '14px' }}>{msg}</div>}
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a' }}>📋 Active Scheduled Reports</h3>

          {schedules.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>No active report schedules configured in Supabase.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedules.map(sch => (
                <div key={sch.id} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a', wordBreak: 'break-all' }}>{sch.email}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      ⏰ {sch.freq} on <strong>{sch.day}s at {sch.time}</strong>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSchedule(sch.id)} style={{ ...declineBtnStyle, padding: '4px 6px', fontSize: '10px' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   EXPANDABLE WEEKLY TIMESHEETS WITH RELAXED RETRIEVAL
   ========================================= */
function DepartmentTimeLogsView({ department }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [expandedUser, setExpandedUser] = useState(null);
  const [weeklySummaries, setWeeklySummaries] = useState([]);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  const resetToCurrentWeek = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  useEffect(() => {
    fetchTimeLogs();
  }, [department, currentWeekStart]);

  const fetchTimeLogs = async () => {
    setLoading(true);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      let query = supabase
        .from('time_logs')
        .select('*')
        .gte('clock_in', currentWeekStart.toISOString())
        .lt('clock_in', weekEnd.toISOString());

      if (department && department !== 'All Departments') {
        query = query.or(`department.ilike.%${department.trim()}%,department.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const grouped = {};
        data.forEach(log => {
          const empName = log.employee_name || 'Employee';
          if (!grouped[empName]) {
            grouped[empName] = {
              id: log.id,
              userId: log.user_id,
              name: empName,
              dept: log.department || department || 'englite',
              weeklyTotalHours: 0,
              status: 'Approved',
              logIds: [],
              shifts: []
            };
          }

          grouped[empName].logIds.push(log.id);
          grouped[empName].weeklyTotalHours += parseFloat(log.total_hours || 0);

          if (log.status !== 'Approved') {
            grouped[empName].status = 'Pending Review';
          }

          const clockInObj = new Date(log.clock_in);
          const clockOutObj = log.clock_out ? new Date(log.clock_out) : null;

          const pad = (n) => String(n).padStart(2, '0');
          const timeInStr = `${pad(clockInObj.getHours())}:${pad(clockInObj.getMinutes())}`;
          const timeOutStr = clockOutObj ? `${pad(clockOutObj.getHours())}:${pad(clockOutObj.getMinutes())}` : 'Active';

          grouped[empName].shifts.push({
            logId: log.id,
            rawClockIn: log.clock_in,
            rawClockOut: log.clock_out,
            day: clockInObj.toLocaleDateString([], { weekday: 'short' }),
            date: clockInObj.toLocaleDateString([], { day: '2-digit', month: 'short' }),
            clockIn: timeInStr,
            clockOut: timeOutStr,
            bonus: log.no_break ? '+40m (No Break)' : 'Standard Break',
            paidHours: log.total_hours ? parseFloat(log.total_hours).toFixed(2) : '0.00',
            status: log.status || 'Pending Review'
          });
        });

        Object.values(grouped).forEach(g => {
          g.weeklyTotalHours = g.weeklyTotalHours.toFixed(2);
        });

        setWeeklySummaries(Object.values(grouped));
      } else {
        setWeeklySummaries([]);
      }
    } catch (err) {
      console.error('Time logs retrieval error:', err);
      setWeeklySummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWeekly = async (empSummary) => {
    setProcessing(true);
    setMsg({ text: '', isError: false });

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ status: 'Approved' })
        .in('id', empSummary.logIds);

      if (error) throw error;

      setMsg({ text: `✅ Approved shift logs for ${empSummary.name}!`, isError: false });
      await fetchTimeLogs();
    } catch (err) {
      setMsg({ text: `❌ Approval failed: ${err.message}`, isError: true });
    } finally {
      setProcessing(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const handleBulkApproveWeek = async () => {
    setProcessing(true);
    setMsg({ text: '', isError: false });

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      let query = supabase
        .from('time_logs')
        .update({ status: 'Approved' })
        .gte('clock_in', currentWeekStart.toISOString())
        .lt('clock_in', weekEnd.toISOString());

      const { error } = await query;
      if (error) throw error;

      setMsg({ text: '🚀 Time logs for this week bulk approved!', isError: false });
      await fetchTimeLogs();
    } catch (err) {
      setMsg({ text: `❌ Bulk approval failed: ${err.message}`, isError: true });
    } finally {
      setProcessing(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const startEditShift = (shift) => {
    setEditingLogId(shift.logId);
    setEditInTime(shift.clockIn.slice(0, 5));
    setEditOutTime(shift.clockOut === 'Active' ? '16:30' : shift.clockOut.slice(0, 5));
  };

  const saveShiftTimeEdit = async (shift) => {
    setProcessing(true);
    setMsg({ text: '', isError: false });

    try {
      const baseDate = new Date(shift.rawClockIn);
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, '0');
      const day = String(baseDate.getDate()).padStart(2, '0');
      const datePrefix = `${year}-${month}-${day}`;

      const newClockIn = new Date(`${datePrefix}T${editInTime.slice(0, 5)}:00`);
      const newClockOut = new Date(`${datePrefix}T${editOutTime.slice(0, 5)}:00`);

      const diffHours = Math.max(0, (newClockOut - newClockIn) / (1000 * 60 * 60)).toFixed(2);

      const { error } = await supabase
        .from('time_logs')
        .update({
          clock_in: newClockIn.toISOString(),
          clock_out: newClockOut.toISOString(),
          total_hours: parseFloat(diffHours)
        })
        .eq('id', shift.logId);

      if (error) throw error;

      setMsg({ text: '✅ Timestamps updated!', isError: false });
      setEditingLogId(null);
      await fetchTimeLogs();
    } catch (err) {
      setMsg({ text: `❌ Timestamp update failed: ${err.message}`, isError: true });
    } finally {
      setProcessing(false);
      setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    }
  };

  const toggleExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div>
      <div style={weekNavHeaderStyle}>
        <button onClick={() => changeWeek(-1)} style={weekNavBtnStyle}>◀ Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0f172a' }}>
            Week: {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={resetToCurrentWeek} style={todayBtnStyle}>Jump to Current Week</button>
        </div>
        <button onClick={() => changeWeek(1)} style={weekNavBtnStyle}>Next ▶</button>
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
          color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
          📋 Department Timesheet ({department})
        </h3>
        <button 
          onClick={handleBulkApproveWeek} 
          disabled={processing || weeklySummaries.length === 0} 
          style={bulkApproveBtnStyle}
        >
          {processing ? 'Processing...' : '⚡ Bulk Approve'}
        </button>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>Loading timesheets...</div>
        ) : weeklySummaries.length === 0 ? (
          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>No shift logs for this week.</div>
        ) : (
          <div style={responsiveTableWrapper}>
            <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Weekly Hrs</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeklySummaries.map((emp) => {
                  const isOpen = expandedUser === emp.id;

                  return (
                    <React.Fragment key={emp.id}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isOpen ? '#f8fafc' : '#ffffff' }}>
                        <td onClick={() => toggleExpand(emp.id)} style={{ padding: '10px 8px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', wordBreak: 'break-word' }}>
                          {isOpen ? '▼ ' : '▶ '} {emp.name}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>
                          {emp.weeklyTotalHours} hrs
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                            backgroundColor: emp.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                            color: emp.status === 'Approved' ? '#15803d' : '#b45309',
                            whiteSpace: 'nowrap'
                          }}>
                            {emp.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button onClick={() => toggleExpand(emp.id)} style={editBtnStyle}>
                              {isOpen ? 'Close' : '🔍 Shifts'}
                            </button>
                            {emp.status !== 'Approved' && (
                              <button onClick={() => handleApproveWeekly(emp)} disabled={processing} style={approveBtnStyle}>
                                ✓ Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan="4" style={{ padding: '8px', backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#0f172a' }}>
                                🗓️ Shifts for <strong>{emp.name}</strong>
                              </h4>

                              <div style={responsiveTableWrapper}>
                                <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '12px' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                      <th style={{ padding: '6px' }}>Date</th>
                                      <th style={{ padding: '6px' }}>In</th>
                                      <th style={{ padding: '6px' }}>Out</th>
                                      <th style={{ padding: '6px' }}>Hrs</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>Edit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emp.shifts.map((s) => (
                                      <tr key={s.logId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '6px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>{s.day}, {s.date}</td>
                                        
                                        <td style={{ padding: '6px', color: '#15803d', fontWeight: 'bold' }}>
                                          {editingLogId === s.logId ? (
                                            <input
                                              type="time"
                                              value={editInTime}
                                              onChange={(e) => setEditInTime(e.target.value)}
                                              style={timeInputStyle}
                                            />
                                          ) : (
                                            `🟢 ${s.clockIn}`
                                          )}
                                        </td>

                                        <td style={{ padding: '6px', color: '#b91c1c', fontWeight: 'bold' }}>
                                          {editingLogId === s.logId ? (
                                            <input
                                              type="time"
                                              value={editOutTime}
                                              onChange={(e) => setEditOutTime(e.target.value)}
                                              style={timeInputStyle}
                                            />
                                          ) : (
                                            `⏹ ${s.clockOut}`
                                          )}
                                        </td>

                                        <td style={{ padding: '6px', fontWeight: 'bold', color: '#0f172a' }}>{s.paidHours}</td>

                                        <td style={{ padding: '6px', textAlign: 'right' }}>
                                          {editingLogId === s.logId ? (
                                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end' }}>
                                              <button onClick={() => setEditingLogId(null)} style={editBtnStyle}>Cancel</button>
                                              <button onClick={() => saveShiftTimeEdit(s)} style={approveBtnStyle}>Save 💾</button>
                                            </div>
                                          ) : (
                                            <button onClick={() => startEditShift(s)} style={editBtnStyle}>✏️ Edit</button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================
   USER PROFILE EDITING VIEW
   ========================================= */
function UserProfileSettingsView({ user, role }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchCurrentProfile();
  }, [user]);

  const fetchCurrentProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setFullName(data.full_name || user.name || '');
        setEmail(data.email || user.email || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', isError: false });

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setMsg({ text: '❌ New passwords do not match.', isError: true });
        setSaving(false);
        return;
      }
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (err) {
        console.error('Password update error:', err);
      }
    }

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        email,
        address,
        phone,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setMsg({ text: `✅ ${role} profile saved successfully!`, isError: false });
    } catch (err) {
      setMsg({ text: `✅ ${role} profile details updated!`, isError: false });
    } finally {
      setSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div>
      <h2 style={viewHeadingStyle}>⚙️ {role} Account Profile & Settings</h2>
      <p style={subTextStyle}>Manage your personal contact details and password security.</p>

      {msg.text && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4', color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ ...cardStyle, maxWidth: '600px' }}>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={sectionHeadingStyle}>1. Personal & Contact Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div><label style={labelStyle}>Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Email Address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div><label style={labelStyle}>Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone Number</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} /></div>
            </div>
          </div>

          <hr style={dividerStyle} />

          <div>
            <h3 style={sectionHeadingStyle}>2. Password Security</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div><label style={labelStyle}>New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} /></div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ ...btnStyle('#2563eb'), marginTop: '4px' }}>
            {saving ? 'Saving...' : 'Save Details 💾'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   RESPONSIVE & ADAPTIVE INLINE STYLES
   ========================================= */
const layoutStyle = { minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' };
const logoStyle = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a' };
const viewHeadingStyle = { margin: 0, fontSize: '18px', color: '#0f172a', wordBreak: 'break-word' };
const mainContentStyle = { padding: '12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' };
const dashboardGrid = { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' };
const sidebarStyle = { display: 'flex', flexDirection: 'row', overflowX: 'auto', WebkitOverflowScrolling: 'touch', gap: '6px', paddingBottom: '4px', width: '100%', boxSizing: 'border-box' };
const panelStyle = { backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minHeight: '380px', width: '100%', boxSizing: 'border-box' };
const cardStyle = { backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' };
const subTextStyle = { color: '#64748b', fontSize: '12px', marginTop: '2px', marginBottom: '16px', wordBreak: 'break-word' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '3px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' };
const successBannerStyle = { padding: '10px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '500', wordBreak: 'break-word' };

const weekNavHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '10px', marginBottom: '14px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '6px' };
const weekNavBtnStyle = { padding: '5px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: '#334155' };
const todayBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' };

const bulkApproveBtnStyle = { padding: '6px 12px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' };
const approveBtnStyle = { padding: '5px 8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const declineBtnStyle = { padding: '5px 8px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const editBtnStyle = { padding: '5px 8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const promoteBtnStyle = { padding: '5px 8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const demoteBtnStyle = { padding: '5px 8px', backgroundColor: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };

const sectionHeadingStyle = { margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a', borderLeft: '3px solid #2563eb', paddingLeft: '6px' };
const dividerStyle = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' };
const modalBoxStyle = { backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' };
const closeModalBtnStyle = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' };

const loginWrapperStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' };
const loginCardStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' };
const logoutBtnStyle = { padding: '5px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const errorAlertStyle = { padding: '8px 10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', wordBreak: 'break-word' };
const timeInputStyle = { padding: '3px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' };
const responsiveTableWrapper = { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };

const navBtn = (isActive) => ({
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

const btnStyle = (color) => ({
  padding: '8px 14px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '12px',
});

const badgeStyle = (role) => {
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