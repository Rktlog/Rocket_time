// lib/payrollService.js
import { supabase } from './supabaseClient';

/**
 * Calculates start and end Date objects for the current pay period week
 */
export function getPayPeriodRange(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  // Get start of week (Monday at 00:00:00)
  const day = current.getDay();
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  
  const startOfWeek = new Date(current.setDate(diffToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

/**
 * Generates aggregated weekly payroll data for all employees
 */
export async function generateWeeklyPayrollReport(startDate, endDate) {
  // 1. Fetch profiles with department info
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      tfn,
      bank_account_name,
      bsb_number,
      account_number,
      departments ( name )
    `);

  if (profileErr) throw profileErr;

  // 2. Fetch completed time logs within date range
  const { data: logs, error: logsErr } = await supabase
    .from('time_logs')
    .select('*')
    .gte('clock_in', startDate.toISOString())
    .lte('clock_in', endDate.toISOString())
    .not('clock_out', 'is', null);

  if (logsErr) throw logsErr;

  // 3. Aggregate metrics per employee
  const payrollSummary = profiles.map((emp) => {
    const userLogs = logs.filter((l) => l.user_id === emp.id);

    const totalHours = userLogs.reduce((sum, log) => sum + (parseFloat(log.total_hours) || 0), 0);
    const totalBonusMins = userLogs.reduce((sum, log) => sum + (log.bonus_minutes_added || 0), 0);
    const totalShifts = userLogs.length;

    // Standard baseline check: 38 hours/week
    const regularHours = Math.min(38, totalHours);
    const overtimeHours = Math.max(0, totalHours - 38);

    return {
      employeeId: emp.id,
      name: emp.full_name || emp.email,
      email: emp.email,
      department: emp.departments?.name || 'Unassigned',
      bankDetails: `${emp.bsb_number || 'N/A'} / ${emp.account_number || 'N/A'}`,
      totalShifts,
      totalBonusMins,
      regularHours: regularHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      totalHours: totalHours.toFixed(2),
    };
  });

  return payrollSummary;
}

/**
 * Formats report array into downloadable CSV format
 */
export function convertToCSV(data) {
  const headers = [
    'Employee Name',
    'Email',
    'Department',
    'Bank (BSB / Acc)',
    'Shifts Worked',
    'Container/Bonus Mins',
    'Regular Hours (Max 38)',
    'Overtime Hours',
    'Total Paid Hours'
  ];

  const rows = data.map((r) => [
    `"${r.name}"`,
    `"${r.email}"`,
    `"${r.department}"`,
    `"${r.bankDetails}"`,
    r.totalShifts,
    r.totalBonusMins,
    r.regularHours,
    r.overtimeHours,
    r.totalHours
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}