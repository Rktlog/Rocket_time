// src/lib/dates.js

/** Local YYYY-MM-DD (never use toISOString for date-only values, it shifts the day in Melbourne). */
export function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Start of the Friday-based work week, at local midnight. */
export function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // Sunday = 0 ... Friday = 5
  const diff = date.getDate() - day + (day < 5 ? -2 : 5);
  const friday = new Date(date.setDate(diff));
  friday.setHours(0, 0, 0, 0);
  return friday;
}