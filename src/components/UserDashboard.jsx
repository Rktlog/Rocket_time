// src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { countIncomingSwaps } from '../lib/pending';
import Shell from './Shell';
import PendingOffersView from './PendingOffersView';
import ClockPage from './ClockPage';
import ShiftRoster from './ShiftRoster';
import WeeklyAvailability from './WeeklyAvailability';
import MyTimesheet from './MyTimesheet';
import MyRequests from './MyRequests';
import UserProfileSettingsView from './UserProfileSettingsView';

export default function UserDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('timeclock');
  const [incoming, setIncoming] = useState(0);

  useEffect(() => {
    countIncomingSwaps(currentUser.id).then(setIncoming).catch(() => {});
  }, [activeTab, currentUser.id]);

  const items = [
    { id: 'timeclock', label: 'Clock', icon: 'clock', primary: true },
    { id: 'roster', label: 'Roster', icon: 'calendar', primary: true },
    { id: 'offers', label: 'Shift offers', icon: 'inbox', primary: true },
    { id: 'timesheet', label: 'Timesheet', icon: 'clipboard', primary: true },
    { id: 'availability', label: 'Availability', icon: 'checkSquare' },
    { id: 'requests', label: 'Requests', icon: 'repeat', badge: incoming || null },
    { id: 'settings', label: 'My profile', icon: 'user' },
  ];

  const employee = { id: currentUser.id, name: currentUser.name, department: currentUser.department, location: currentUser.location };

  return (
    <Shell user={currentUser} roleLabel="Employee" items={items} active={activeTab} onSelect={setActiveTab} onLogout={onLogout}>
      {activeTab === 'offers' && <PendingOffersView user={currentUser} />}
      {activeTab === 'timeclock' && <ClockPage employee={employee} />}
      {activeTab === 'roster' && <ShiftRoster user={currentUser} />}
      {activeTab === 'availability' && <WeeklyAvailability user={currentUser} />}
      {activeTab === 'timesheet' && <MyTimesheet user={currentUser} />}
      {activeTab === 'requests' && <MyRequests user={currentUser} />}
      {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Employee" />}
    </Shell>
  );
}
