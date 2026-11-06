const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

export function easternDate(now = new Date()) {
  const parts = Object.fromEntries(dateFormat.formatToParts(now).map(({type, value}) => [type, value]));
  return [parts.year, parts.month, parts.day].join('-');
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value;
}

export function dayFor(value) {
  return dayNames[new Date(value + 'T12:00:00Z').getUTCDay()];
}
