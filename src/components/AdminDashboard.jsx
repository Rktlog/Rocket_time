// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { dashboardGrid, sidebarStyle, panelStyle, navBtn } from '../lib/styles';
import { countPendingApprovals } from '../lib/pending';
import AdminUserRoleManagementView from './AdminUserRoleManagementView';
import AdminPanel from './AdminPanel';
import AddEmployeeForm from './AddEmployeeForm';
import ApprovalsView from './ApprovalsView';
import DepartmentTimeLogsView from './DepartmentTimeLogsView';
import AdminReportSchedulerView from './AdminReportSchedulerView';
import MasterSettings from './MasterSettings';

export default function AdminDashboard({ currentUser, departments, sites, refreshData }) {
  const [activeTab, setActiveTab] = useState('users');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    countPendingApprovals('All Departments').then(setPending).catch(() => {});
  }, [activeTab]);

  const tab = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={navBtn(activeTab === id)}>{label}</button>
  );

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        {tab('users', '👥 Users & Profiles')}
        {tab('sites', '📍 Sites & Depts')}
        {tab('add', '➕ Add Employee')}
        {tab('approvals', `✅ Approvals${pending ? ` (${pending})` : ''}`)}
        {tab('timesheets', '🕒 All Timesheets')}
        {tab('reports', '📧 Reports')}
        {tab('system', '⚙️ Settings')}
      </aside>

      <div style={panelStyle}>
        {activeTab === 'users' && <AdminUserRoleManagementView />}
        {activeTab === 'sites' && <AdminPanel onDataChange={refreshData} />}
        {activeTab === 'add' && <AddEmployeeForm mode="admin" currentUser={currentUser} departments={departments} sites={sites} />}
        {activeTab === 'approvals' && <ApprovalsView department="All Departments" currentUser={currentUser} />}
        {activeTab === 'timesheets' && <DepartmentTimeLogsView department="All Departments" currentUser={currentUser} />}
        {activeTab === 'reports' && <AdminReportSchedulerView />}
        {activeTab === 'system' && <MasterSettings />}
      </div>
    </div>
  );
}
