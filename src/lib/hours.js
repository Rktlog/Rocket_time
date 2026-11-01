// src/lib/hours.js

/**
 * Paid hours for one shift. Used by the time clock AND by manager edits so both
 * always agree.
 *  - normal shift: 30 minute unpaid break is deducted
 *  - worked through (no break): +40 minutes
 *  - 20ft container: +10 minutes, 40ft container: +20 minutes
 * Returns a string with 2 decimals, e.g. "7.50".
 */
export function calculatePaidHours(clockIn, clockOut, noBreakWorked = false, container = 'none') {
  const rawHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

  let paid = noBreakWorked ? rawHours + 40 / 60 : Math.max(0, rawHours - 0.5);

  if (container === '20ft') paid += 10 / 60;
  if (container === '40ft') paid += 20 / 60;

  return paid.toFixed(2);
}

/** A shift still open after this many hours is almost certainly a forgotten clock-out. */
export const FORGOTTEN_CLOCK_OUT_HOURS = 12;
