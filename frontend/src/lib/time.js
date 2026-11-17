// The clinic runs on Addis Ababa time (UTC+3). Never use new Date().toISOString() for
// "today": that is the UTC date, which is still yesterday between 00:00 and 03:00 EAT,
// and the backend rejects bookings for past dates.
const CLINIC_TIME_ZONE = 'Africa/Addis_Ababa';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

/** 'YYYY-MM-DD' in Addis Ababa for the given instant (default: now). */
export const clinicToday = (now = new Date()) => dateFormatter.format(now);

/** 'YYYY-MM-DD' in Addis Ababa, `days` days from now (negative for the past). */
export const clinicDateFromToday = (days) => clinicToday(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

// ---------------------------------------------------------------------------
// Ethiopian clock (የኢትዮጵያ ሰዓት አቆጣጠር)
// The backend stores slot / opening times as 24-hour EAT strings ("08:00", "17:30").
// Ethiopians count hours from sunrise (06:00 = 12:00 ጠዋት, 07:00 = 1:00 ጠዋት ...),
// so the Ethiopian hour is the international hour shifted by 6 on a 12-hour dial.
// Display only: always keep sending/sorting the raw "HH:MM" value.
// ---------------------------------------------------------------------------
const ETHIOPIAN_PERIOD = (h) => {
  if (h >= 6 && h < 12) return 'ጠዋት';   // morning
  if (h >= 12 && h < 18) return 'ከሰዓት'; // afternoon
  if (h >= 18) return 'ምሽት';            // evening
  return 'ሌሊት';                         // night (00:00–05:59)
};

const parseHHMM = (value) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min, mm: m[2] };
};

/** "08:00" -> "2:00 ጠዋት" (Ethiopian clock). Returns the input unchanged if unparseable. */
export const toEthiopianTime = (value) => {
  const t = parseHHMM(value);
  if (!t) return value || '';
  const ethHour = ((t.h + 6) % 12) || 12;
  return `${ethHour}:${t.mm} ${ETHIOPIAN_PERIOD(t.h)}`;
};

/** "08:00" -> "8:00 AM" (international 12-hour clock). */
export const toInternationalTime = (value) => {
  const t = parseHHMM(value);
  if (!t) return value || '';
  const hour12 = (t.h % 12) || 12;
  return `${hour12}:${t.mm} ${t.h < 12 ? 'AM' : 'PM'}`;
};

/** "08:00" -> "2:00 ጠዋት (8:00 AM)" — Ethiopian first, international in brackets. */
export const formatClinicTime = (value) => {
  const t = parseHHMM(value);
  if (!t) return value || '';
  return `${toEthiopianTime(value)} (${toInternationalTime(value)})`;
};

/** ("08:00","08:40") -> "2:00 – 2:40 ጠዋት (8:00 – 8:40 AM)"; mixed periods are spelled out on both ends. */
export const formatClinicRange = (start, end) => {
  const a = parseHHMM(start);
  const b = parseHHMM(end);
  if (!a && !b) return '';
  if (!a || !b) return formatClinicTime(start || end);
  const ethA = toEthiopianTime(start), ethB = toEthiopianTime(end);
  const intA = toInternationalTime(start), intB = toInternationalTime(end);
  const samePeriodEth = ETHIOPIAN_PERIOD(a.h) === ETHIOPIAN_PERIOD(b.h);
  const samePeriodInt = (a.h < 12) === (b.h < 12);
  const eth = samePeriodEth ? `${ethA.split(' ')[0]} – ${ethB}` : `${ethA} – ${ethB}`;
  const intl = samePeriodInt ? `${intA.split(' ')[0]} – ${intB}` : `${intA} – ${intB}`;
  return `${eth} (${intl})`;
};

/** Current wall-clock time in Addis Ababa as "HH:MM" (24h), regardless of the browser's time zone. */
export const clinicNowHHMM = (now = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);

/** "2026-11-16" -> "Mon, Nov 16" (no time-zone shift). Adds "Today"/"Tomorrow" for the clinic's dates. */
export const formatClinicDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return iso || '';
  if (iso === clinicToday()) return 'Today';
  if (iso === clinicDateFromToday(1)) return 'Tomorrow';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
};
