// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import Icon from './components/icons';

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

  const authFrame = (node, wide = false) => (
    <div className="rt-auth">
      <div className={`rt-auth-inner${wide ? ' is-wide' : ''}`}>
        <div className="rt-auth-brand"><span className="rt-mark"><Icon name="clock" size={18} /></span>Rocket Time</div>
        {node}
      </div>
    </div>
  );

  if (loadingSession) {
    return authFrame(<div style={{ textAlign: 'center', color: '#9FB0BF', fontSize: '14px' }}>Loading your workspace...</div>);
  }

  if (recoveryMode) return authFrame(<SetNewPassword onDone={() => setRecoveryMode(false)} />);
  if (!currentUser) return authFrame(<LoginPortal onLoginSuccess={restoreUserProfile} notice={loginNotice} />);

  if (!currentUser.onboardingCompleted) {
    return authFrame(
      <OnboardingWizard
        user={currentUser}
        onComplete={({ name }) =>
          setCurrentUser((u) => ({ ...u, name: name || u.name, onboardingCompleted: true }))
        }
      />,
      true
    );
  }

  return (
    <ErrorBoundary>
      {currentUser.role === 'admin' && (
        <AdminDashboard currentUser={currentUser} departments={departments} sites={sites} refreshData={fetchDepartmentsAndSites} onLogout={handleLogout} />
      )}
      {currentUser.role === 'manager' && <ManagerDashboard currentUser={currentUser} onLogout={handleLogout} />}
      {(currentUser.role === 'user' || currentUser.role === 'employee') && <UserDashboard currentUser={currentUser} onLogout={handleLogout} />}
    </ErrorBoundary>
  );
}
