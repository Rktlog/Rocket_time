// src/components/AdminPayroll.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminPayroll() {
  // Payroll Settings State
  const [approverEmail, setApproverEmail] = useState('payroll@company.com');
  const [approverName, setApproverName] = useState('Payroll Manager');
  const [deliveryDay, setDeliveryDay] = useState('Monday');
  const [deliveryTime, setDeliveryTime] = useState('09:00');
  const [overtimeThreshold, setOvertimeThreshold] = useState(38); // Standard 38 hours limit

  // Interface State
  const [showSettings, setShowSettings] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editHoursValue, setEditHoursValue] = useState('');
  const [msg, setMsg] = useState('');

  // Sample Payroll Timesheet Data
  const [timesheets, setTimesheets] = useState([
    { id: '1', name: 'John Doe', department: 'Logistics', location: 'Campbellfield', regularHours: 38, overtimeHours: 4.5, totalHours: 42.5, status: 'Pending Approval' },
    { id: '2', name: 'Sarah Smith', department: 'Warehouse', location: 'Richmond', regularHours: 35, overtimeHours: 0, totalHours: 35.0, status: 'Approved' },
    { id: '3', name: 'Michael Brown', department: 'Logistics', location: 'Campbellfield', regularHours: 38, overtimeHours: 6.0, totalHours: 44.0, status: 'Overtime Alert' },
  ]);

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setMsg(`✅ Settings saved! Timesheets will be sent to ${approverEmail} every ${deliveryDay} at ${deliveryTime}.`);
    setShowSettings(false);
  };

  // Enable inline editing for hours
  const handleStartEdit = (emp) => {
    setEditingEmployeeId(emp.id);
    setEditHoursValue(emp.totalHours.toString());
  };

  // Save Edited Hours
  const handleSaveHours = (id) => {
    const newTotal = parseFloat(editHoursValue) || 0;
    const threshold = parseFloat(overtimeThreshold) || 38;

    setTimesheets(timesheets.map((ts) => {
      if (ts.id === id) {
        const regular = Math.min(newTotal, threshold);
        const overtime = Math.max(0, newTotal - threshold);
        const status = overtime > 0 ? 'Overtime Flagged (>38h)' : 'Edited';

        return {
          ...ts,
          regularHours: regular,
          overtimeHours: overtime,
          totalHours: newTotal,
          status: status,
        };
      }
      return ts;
    }));

    setEditingEmployeeId(null);
    setMsg('✅ Employee timesheet hours updated successfully!');
  };

  // Toggle Approval Status
  const handleApprove = (id) => {
    setTimesheets(timesheets.map((ts) => (ts.id === id ? { ...ts, status: 'Approved ✅' } : ts)));
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER WITH SETTINGS BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            📊 Weekly Payroll & Timesheets
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Review, edit overtime, and approve employee timesheets before processing.
          </p>
        </div>

        <button onClick={() => setShowSettings(!showSettings)} style={secondaryBtnStyle}>
          ⚙️ Timesheet Settings
        </button>
      </div>

      {msg && <div style={msgBannerStyle}>{msg}</div>}

      {/* ⚙️ SETTINGS MODAL / PANEL */}
      {showSettings && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>
            ⚙️ Timesheet & Approval Configuration
          </h3>

          <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* TIMESHEET RECIPIENT EMAIL */}
            <div>
              <label style={labelStyle}>Timesheet Approver / Recipient Email</label>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* RECIPIENT NAME */}
            <div>
              <label style={labelStyle}>Approver Manager Name</label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* DELIVERY DAY */}
            <div>
              <label style={labelStyle}>Recieve Day</label>
              <select
                value={deliveryDay}
                onChange={(e) => setDeliveryDay(e.target.value)}
                style={inputStyle}
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Friday">Friday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            {/* DELIVERY TIME */}
            <div>
              <label style={labelStyle}>Recieve Time</label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* OVERTIME THRESHOLD */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Overtime Hours Threshold (Default: 38 Hours)</label>
              <input
                type="number"
                value={overtimeThreshold}
                onChange={(e) => setOvertimeThreshold(e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                * Employees working more than {overtimeThreshold} hours will automatically be flagged for overtime edit and approval.
              </span>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={primaryBtnStyle}>
                Save Settings
              </button>
              <button type="button" onClick={() => setShowSettings(false)} style={cancelBtnStyle}>
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 📋 TIMESHEETS SUMMARY & APPROVAL TABLE */}
      <div style={{ ...cardStyle, marginTop: showSettings ? '24px' : '0' }}>
        
        {/* RECIPIENT INFO BANNER */}
        <div style={infoBannerStyle}>
          <div>
            <strong>Scheduled Recipient:</strong> {approverName} ({approverEmail})
          </div>
          <div>
            <strong>Delivery Schedule:</strong> Every {deliveryDay} at {deliveryTime}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Employee</th>
              <th style={{ padding: '12px' }}>Dept & Location</th>
              <th style={{ padding: '12px' }}>Standard Hrs</th>
              <th style={{ padding: '12px' }}>Overtime (&gt;38h)</th>
              <th style={{ padding: '12px' }}>Total Hours</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((emp) => {
              const isOvertime = emp.totalHours > overtimeThreshold;
              const isEditing = editingEmployeeId === emp.id;

              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isOvertime ? '#fffbeb' : 'transparent' }}>
                  
                  {/* EMPLOYEE NAME */}
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                    {emp.name}
                  </td>

                  {/* DEPT & LOCATION */}
                  <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>
                    🏢 {emp.department} <br />
                    📍 {emp.location}
                  </td>

                  {/* REGULAR HOURS */}
                  <td style={{ padding: '12px' }}>{emp.regularHours} hrs</td>

                  {/* OVERTIME HOURS */}
                  <td style={{ padding: '12px', color: emp.overtimeHours > 0 ? '#d97706' : '#64748b', fontWeight: emp.overtimeHours > 0 ? 'bold' : 'normal' }}>
                    +{emp.overtimeHours} hrs
                  </td>

                  {/* TOTAL HOURS (EDITABLE) */}
                  <td style={{ padding: '12px' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        value={editHoursValue}
                        onChange={(e) => setEditHoursValue(e.target.value)}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #2563eb' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: isOvertime ? '#dc2626' : '#0f172a' }}>
                        {emp.totalHours} hrs
                      </span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td style={{ padding: '12px' }}>
                    <span style={statusBadgeStyle(emp.status, isOvertime)}>
                      {emp.status}
                    </span>
                  </td>

                  {/* ACTION BUTTONS */}
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {isEditing ? (
                      <button onClick={() => handleSaveHours(emp.id)} style={saveBtnStyle}>
                        Save
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleStartEdit(emp)} style={actionBtnStyle}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleApprove(emp.id)} style={approveBtnStyle}>
                          Approve
                        </button>
                      </div>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>

      </div>

    </div>
  );
}

// Styling definitions
const cardStyle = { padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const primaryBtnStyle = { padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const secondaryBtnStyle = { padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' };
const cancelBtnStyle = { padding: '10px 18px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const actionBtnStyle = { padding: '6px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const saveBtnStyle = { padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const approveBtnStyle = { padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const msgBannerStyle = { background: '#f0f9ff', color: '#0369a1', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bae6fd', fontWeight: '500' };
const infoBannerStyle = { padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155' };

const statusBadgeStyle = (status, isOvertime) => {
  let bg = '#f1f5f9';
  let color = '#475569';

  if (status.includes('Approved')) {
    bg = '#dcfce7';
    color = '#15803d';
  } else if (isOvertime || status.includes('Overtime')) {
    bg = '#fef3c7';
    color = '#b45309';
  }

  return {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: bg,
    color: color,
  };
};