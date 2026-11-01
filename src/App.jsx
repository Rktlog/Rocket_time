// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { layoutStyle, headerStyle, logoStyle, mainContentStyle, logoutBtnStyle, badgeStyle } from './lib/styles';

import ErrorBoundary from './components/ErrorBoundary';
import LoginPortal from './components/LoginPortal';
import SetNewPassword from './components/SetNewPassword';
import OnboardingWizard from './components/OnboardingWizard';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import UserDashboard from './components/UserDashboard';

function buildUser(authUser, profile) {
  const role = String(profile?.role || 'user').toLowerCase().trim();
  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
    email: authUser.email,
    role,
    department: profile?.department || authUser.user_metadata?.department_name || 'Unassigned',
    location: profile?.location || null,
    // false only for people an admin or manager just created and who have not finished setup
    onboardingCompleted: profile?.onboarding_completed !== false,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false); // opened from a "reset password" email
  const [loginNotice, setLoginNotice] = useState('');
  const [departments, setDepartments] = useState([]);
  const [sites, setSites] = useState([]);
  const userIdRef = useRef(null);

  useEffect(() => {
    fetchDepartmentsAndSites();
    checkExistingSession();

    // Do not await Supabase calls inside this callback (can deadlock). Defer them.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);

      setTimeout(async () => {
        if (!session?.user) {
          userIdRef.current = null;
          setCurrentUser(null);
        } else {
          await restoreUserProfile(session.user); // no-op if this user is already loaded
        }
        setLoadingSession(false);
      }, 0);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await restoreUserProfile(session.user);
    } catch (err) {
      console.error('Session restore error:', err);
    } finally {
      setLoadingSession(false);
    }
  };

  // Only loads when the signed-in user changes, so token refreshes / tab refocus
  // do not replace currentUser and reset forms.
  const restoreUserProfile = async (authUser) => {
    if (userIdRef.current === authUser.id) return;
    userIdRef.current = authUser.id;
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, role, department, location, active, onboarding_completed')
        .eq('id', authUser.id)
        .maybeSingle();

      // If the database migration has not been run yet the new columns do not exist.
      // Fall back to the old column list rather than treating an admin as a plain employee.
      if (error) {
        ({ data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, department, location')
          .eq('id', authUser.id)
          .maybeSingle());
      }

      if (profile?.active === false) {
        await supabase.auth.signOut({ scope: 'local' });
        userIdRef.current = null;
        setCurrentUser(null);
        setLoginNotice('❌ This account has been deactivated. Please contact your manager.');
        return;
      }

      setLoginNotice('');
      setCurrentUser(buildUser(authUser, profile));
      fetchDepartmentsAndSites(); // refetch now that we are authenticated
    } catch (err) {
      userIdRef.current = null;
      console.error('Error fetching profile on restore:', err);
    }
  };

  const fetchDepartmentsAndSites = async () => {
    try {
      const { data: deptData } = await supabase.from('departments').select('*').order('name');
      if (deptData) setDepartments(deptData);

      const { data: siteData } = await supabase.from('sites').select('*').order('name');
      if (siteData) setSites(siteData);
    } catch (err) {
      console.error('Error fetching departments or sites:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Signout warning:', err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      userIdRef.current = null;
      setCurrentUser(null);
    }
  };

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>
        🚀 Loading Rocket Time workspace...
      </div>
    );
  }

  const renderBody = () => {
    if (recoveryMode) return <SetNewPassword onDone={() => setRecoveryMode(false)} />;
    if (!currentUser) return <LoginPortal onLoginSuccess={restoreUserProfile} notice={loginNotice} />;

    if (!currentUser.onboardingCompleted) {
      return (
        <OnboardingWizard
          user={currentUser}
          onComplete={({ name }) =>
            setCurrentUser((u) => ({ ...u, name: name || u.name, onboardingCompleted: true }))
          }
        />
      );
    }

    return (
      <ErrorBoundary>
        {currentUser.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} departments={departments} sites={sites} refreshData={fetchDepartmentsAndSites} />
        )}
        {currentUser.role === 'manager' && <ManagerDashboard currentUser={currentUser} />}
        {(currentUser.role === 'user' || currentUser.role === 'employee') && <UserDashboard currentUser={currentUser} />}
      </ErrorBoundary>
    );
  };

  return (
    <div style={layoutStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={logoStyle}>🚀 Rocket Time</div>
          {currentUser && <span style={badgeStyle(currentUser.role)}>{currentUser.role.toUpperCase()} PORTAL</span>}
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-word' }}>
              Logged in: <strong>{currentUser.name}</strong> ({currentUser.department})
            </div>
            <button onClick={handleLogout} style={logoutBtnStyle}>🚪 Log Out</button>
          </div>
        )}
      </header>

      <main style={mainContentStyle}>{renderBody()}</main>
    </div>
  );
}
