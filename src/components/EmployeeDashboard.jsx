// src/components/EmployeeDashboard.jsx
import React, { useState } from 'react';
import ShiftRoster from './ShiftRoster';
import WeeklyAvailability from './WeeklyAvailability';
import MyTimesheet from './MyTimesheet';
import EmployeeSettings from './EmployeeSettings';

export default function EmployeeDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster', 'availability', 'timesheet', 'settings'

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER & NAVIGATION TABS */}
      <div style={headerCardStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: 'bold' }}>
            Employee Workspace
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Department: <strong>{user?.user_metadata?.department_name || 'Warehouse'}</strong>
          </p>
        </div>

        <div style={tabContainerStyle}>
          <button onClick={() => setActiveTab('roster')} style={tabBtnStyle(activeTab === 'roster')}>
            📅 Shift Roster
          </button>
          <button onClick={() => setActiveTab('availability')} style={tabBtnStyle(activeTab === 'availability')}>
            ⏱️ Availability
          </button>
          <button onClick={() => setActiveTab('timesheet')} style={tabBtnStyle(activeTab === 'timesheet')}>
            📋 My Timesheet
          </button>
          <button onClick={() => setActiveTab('settings')} style={tabBtnStyle(activeTab === 'settings')}>
            ⚙️ My Settings
          </button>
        </div>
      </div>

      {/* COMPONENT RENDERING */}
      {activeTab === 'roster' && <ShiftRoster user={user} />}
      {activeTab === 'availability' && <WeeklyAvailability user={user} />}
      {activeTab === 'timesheet' && <MyTimesheet user={user} />}
      {activeTab === 'settings' && <EmployeeSettings user={user} />}

    </div>
  );
}

const headerCardStyle = { backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const tabContainerStyle = { backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' };
const tabBtnStyle = (isActive) => ({ padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: isActive ? '#ffffff' : 'transparent', color: isActive ? '#2563eb' : '#64748b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' });