// The server sends dates such as a date of birth as "2002-11-19T00:00:00.000Z".
// Forms work with the plain calendar date "2002-11-19" and show it as "19-11-2002".
// The date part is taken as written (no time-zone conversion), so the day never shifts.

/** "2002-11-19T00:00:00.000Z" or "2002-11-19" → "2002-11-19"; anything else → "" */
export const toDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
};

/** Any of the above → "19-11-2002"; "" when there is no valid date */
export const formatDateDDMMYYYY = (value) => {
  const ymd = toDateOnly(value);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
};
