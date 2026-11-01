// src/components/ClockPage.jsx
import React from 'react';
import TimeClock from './TimeClock';
import WeekSummary from './WeekSummary';

export default function ClockPage({ employee }) {
  return (
    <div className="rt-clockpage">
      <TimeClock employee={employee} />
      <WeekSummary userId={employee.id} />
    </div>
  );
}
