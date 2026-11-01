// src/components/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { dashboardGrid, sidebarStyle, panelStyle, navBtn } from '../lib/styles';
import { countPendingApprovals } from '../lib/pending';
import TimeClock from './TimeClock';
import MyTimesheet from './MyTimesheet';
import ManagerStaffListView from './ManagerStaffListView';
import ManagerInstantAvailabilityView from './ManagerInstantAvailabilityView';
import ManagerRosterManager from './ManagerRosterManager';
import AddEmployeeForm from './AddEmployeeForm';
import DepartmentTimeLogsView from './DepartmentTimeLogsView';
import ApprovalsView from './ApprovalsView';
import MyRequests from './MyRequests';
import UserProfileSettingsView from './UserProfileSettingsView';

export default function ManagerDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('timeclock');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    countPendingApprovals(currentUser.department).then(setPending).catch(() => {});
  }, [activeTab, currentUser.department]);

  const tab = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={navBtn(activeTab === id)}>{label}</button>
  );

  const employee = {
    id: currentUser.id,
    name: currentUser.name,
    department: currentUser.department,
    location: currentUser.location,
  };

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        {tab('timeclock', '⏱️ Time Clock')}
        {tab('mytimesheet', '📋 Timesheet')}
        {tab('users', '👥 Staff')}
        {tab('availability', '⏱️ Availability')}
        {tab('rostering', '📅 Rostering')}
        {tab('approvals', `✅ Approvals${pending ? ` (${pending})` : ''}`)}
        {tab('logs', '🏢 Logs')}
        {tab('add', '➕ Add Employee')}
        {tab('requests', '🔁 My Requests')}
        {tab('settings', '⚙️ Settings')}
      </aside>

      <div style={panelStyle}>
        {activeTab === 'timeclock' && <TimeClock employee={employee} />}
        {activeTab === 'mytimesheet' && <MyTimesheet user={currentUser} />}
        {activeTab === 'users' && <ManagerStaffListView currentDepartment={currentUser.department} />}
        {activeTab === 'availability' && <ManagerInstantAvailabilityView department={currentUser.department} location={currentUser.location} />}
        {activeTab === 'rostering' && <ManagerRosterManager department={currentUser.department} />}
        {activeTab === 'approvals' && <ApprovalsView department={currentUser.department} currentUser={currentUser} />}
        {activeTab === 'logs' && <DepartmentTimeLogsView department={currentUser.department} currentUser={currentUser} />}
        {activeTab === 'add' && <AddEmployeeForm mode="manager" currentUser={currentUser} />}
        {activeTab === 'requests' && <MyRequests user={currentUser} />}
        {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Manager" />}
      </div>
    </div>
  );
}
