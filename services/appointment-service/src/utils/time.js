// All "today" / "now" logic for the clinic must use Ethiopian local time (UTC+3),
// not the server's clock or UTC — Render servers run in UTC, so between 00:00 and
// 03:00 EAT the UTC date is still "yesterday".
export const CLINIC_TIME_ZONE = 'Africa/Addis_Ababa';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

/** 'YYYY-MM-DD' in Addis Ababa for the given instant (default: now). */
export const clinicDate = (now = new Date()) => dateFormatter.format(now);

/** 'HH:MM' (24h) in Addis Ababa for the given instant (default: now). */
export const clinicTime = (now = new Date()) => timeFormatter.format(now);

/** Calendar year in Addis Ababa (used for card numbers CLN-YYYY-NNNNN). */
export const clinicYear = (now = new Date()) => Number(clinicDate(now).slice(0, 4));

/** True if the string is a real calendar date in 'YYYY-MM-DD' form. */
export const isValidDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
