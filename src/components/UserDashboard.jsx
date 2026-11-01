// src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { dashboardGrid, sidebarStyle, panelStyle, navBtn } from '../lib/styles';
import { countIncomingSwaps } from '../lib/pending';
import PendingOffersView from './PendingOffersView';
import TimeClock from './TimeClock';
import ShiftRoster from './ShiftRoster';
import WeeklyAvailability from './WeeklyAvailability';
import MyTimesheet from './MyTimesheet';
import MyRequests from './MyRequests';
import UserProfileSettingsView from './UserProfileSettingsView';

export default function UserDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('offers');
  const [incoming, setIncoming] = useState(0);

  useEffect(() => {
    countIncomingSwaps(currentUser.id).then(setIncoming).catch(() => {});
  }, [activeTab, currentUser.id]);

  const tab = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={navBtn(activeTab === id)}>{label}</button>
  );

  return (
    <div style={dashboardGrid}>
      <aside style={sidebarStyle}>
        {tab('offers', '📬 Offers')}
        {tab('timeclock', '⏱️ Time Clock')}
        {tab('roster', '📅 Roster')}
        {tab('availability', '⏱️ Availability')}
        {tab('timesheet', '📋 Timesheet')}
        {tab('requests', `🔁 Requests${incoming ? ` (${incoming})` : ''}`)}
        {tab('settings', '⚙️ Settings')}
      </aside>

      <div style={panelStyle}>
        {activeTab === 'offers' && <PendingOffersView user={currentUser} />}
        {activeTab === 'timeclock' && (
          <TimeClock employee={{ id: currentUser.id, name: currentUser.name, department: currentUser.department, location: currentUser.location }} />
        )}
        {activeTab === 'roster' && <ShiftRoster user={currentUser} />}
        {activeTab === 'availability' && <WeeklyAvailability user={currentUser} />}
        {activeTab === 'timesheet' && <MyTimesheet user={currentUser} />}
        {activeTab === 'requests' && <MyRequests user={currentUser} />}
        {activeTab === 'settings' && <UserProfileSettingsView user={currentUser} role="Employee" />}
      </div>
    </div>
  );
}
