// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { countPendingApprovals } from '../lib/pending';
import Shell from './Shell';
import AdminUserRoleManagementView from './AdminUserRoleManagementView';
import AdminPanel from './AdminPanel';
import AddEmployeeForm from './AddEmployeeForm';
import ApprovalsView from './ApprovalsView';
import DepartmentTimeLogsView from './DepartmentTimeLogsView';
import AdminReportSchedulerView from './AdminReportSchedulerView';
import MasterSettings from './MasterSettings';

export default function AdminDashboard({ currentUser, departments, sites, refreshData, onLogout }) {
  const [activeTab, setActiveTab] = useState('timesheets');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    countPendingApprovals('All Departments').then(setPending).catch(() => {});
  }, [activeTab]);

  const items = [
    { id: 'timesheets', label: 'All timesheets', icon: 'file', group: 'Review', primary: true },
    { id: 'approvals', label: 'Approvals', icon: 'check', group: 'Review', badge: pending || null, primary: true },
    { id: 'users', label: 'People', icon: 'users', group: 'People', primary: true },
    { id: 'add', label: 'Add employee', icon: 'userPlus', group: 'People', primary: true },
    { id: 'sites', label: 'Sites and departments', icon: 'pin', group: 'Setup' },
    { id: 'reports', label: 'Reports', icon: 'mail', group: 'Setup' },
    { id: 'system', label: 'Settings', icon: 'sliders', group: 'Setup' },
  ];

  return (
    <Shell user={currentUser} roleLabel="Admin" items={items} active={activeTab} onSelect={setActiveTab} onLogout={onLogout}>
      {activeTab === 'users' && <AdminUserRoleManagementView />}
      {activeTab === 'sites' && <AdminPanel onDataChange={refreshData} />}
      {activeTab === 'add' && <AddEmployeeForm mode="admin" currentUser={currentUser} departments={departments} sites={sites} />}
      {activeTab === 'approvals' && <ApprovalsView department="All Departments" currentUser={currentUser} />}
      {activeTab === 'timesheets' && <DepartmentTimeLogsView department="All Departments" currentUser={currentUser} />}
      {activeTab === 'reports' && <AdminReportSchedulerView />}
      {activeTab === 'system' && <MasterSettings />}
    </Shell>
  );
}
