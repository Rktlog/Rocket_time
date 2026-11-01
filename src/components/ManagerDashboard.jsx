// src/components/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { countPendingApprovals } from '../lib/pending';
import Shell from './Shell';
import ClockPage from './ClockPage';
import MyTimesheet from './MyTimesheet';
import ManagerStaffListView from './ManagerStaffListView';
import ManagerInstantAvailabilityView from './ManagerInstantAvailabilityView';
import ManagerRosterManager from './ManagerRosterManager';
import AddEmployeeForm from './AddEmployeeForm';
import DepartmentTimeLogsView from './DepartmentTimeLogsView';
import ApprovalsView from './ApprovalsView';
import MyRequests from './MyRequests';
import UserProfileSettingsView from './UserProfileSettingsView';

export default function ManagerDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('timeclock');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    countPendingApprovals(currentUser.department).then(setPending).catch(() => {});
  }, [activeTab, currentUser.department]);

  const items = [
    { id: 'timeclock', label: 'Clock', icon: 'clock', group: 'Me', primary: true },
    { id: 'mytimesheet', label: 'My timesheet', icon: 'clipboard', group: 'Me' },
    { id: 'requests', label: 'My requests', icon: 'repeat', group: 'Me' },
    { id: 'settings', label: 'My profile', icon: 'user', group: 'Me' },
    { id: 'approvals', label: 'Approvals', icon: 'check', group: 'My team', badge: pending || null, primary: true },
    { id: 'logs', label: 'Team timesheets', icon: 'file', group: 'My team', primary: true },
    { id: 'rostering', label: 'Rostering', icon: 'calendar', group: 'My team', primary: true },
    { id: 'availability', label: 'Availability', icon: 'checkSquare', group: 'My team' },
    { id: 'users', label: 'Staff', icon: 'users', group: 'My team' },
    { id: 'add', label: 'Add employee', icon: 'userPlus', group: 'My team' },
  ];

  const employee = { id: currentUser.id, name: currentUser.name, department: currentUser.department, location: currentUser.location };

  return (
    <Shell user={currentUser} roleLabel="Manager" items={items} active={activeTab} onSelect={setActiveTab} onLogout={onLogout}>
      {activeTab === 'timeclock' && <ClockPage employee={employee} />}
      {activeTab === 'mytimesheet' && <MyTimesheet user={currentUser} />}
      {activeTab === 'users' && <ManagerStaffListView currentDepartment={currentUser.department} />}
      {activeTab === 'availability' && <ManagerInstantAvailabilityView department={currentUser.department} location={currentUser.location} />}
      {activeTab === 'rostering' && <ManagerRosterManager department={currentUser.department} />}
      {activeTab === 'approvals' && <ApprovalsView department={currentUser.department} currentUser={currentUser} />}
      {activeTab === 'logs' && <DepartmentTimeLogsView department={currentUser.department} currentUser={currentUser} />}
      {activeTab === 'add' && <AddEmployeeForm mode="manager" currentUser={currentUser} />}
      {activeTab === 'requests' && <MyRequests user={currentUser} />}
      {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Manager" />}
    </Shell>
  );
}
