/**
 * USA-format date/time formatting (MM/DD/YYYY, 12-hour AM/PM).
 * Use everywhere we display dates or times to users.
 * Uses Intl.DateTimeFormat with en-US so output is always USA format.
 */

const US_LOCALE = 'en-US';

const US_DATE: Intl.DateTimeFormatOptions = {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
};

const US_TIME: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
};

const US_DATE_TIME: Intl.DateTimeFormatOptions = {
  ...US_DATE,
  ...US_TIME,
};

const US_TIME_SHORT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

const US_DATE_LONG: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

const fmtDate = new Intl.DateTimeFormat(US_LOCALE, US_DATE);
const fmtTime = new Intl.DateTimeFormat(US_LOCALE, US_TIME);
const fmtDateTime = new Intl.DateTimeFormat(US_LOCALE, US_DATE_TIME);
const fmtTimeShort = new Intl.DateTimeFormat(US_LOCALE, US_TIME_SHORT);
const fmtDateLong = new Intl.DateTimeFormat(US_LOCALE, US_DATE_LONG);

export function formatDateUSA(d: Date): string {
  return fmtDate.format(d);
}

/** Alias for formatDateUSA - MM/DD/YYYY */
export const formatDate = formatDateUSA;

export function formatTimeUSA(d: Date): string {
  return fmtTime.format(d);
}

export function formatTimeUSAShort(d: Date): string {
  return fmtTimeShort.format(d);
}

export function formatDateTimeUSA(d: Date): string {
  return fmtDateTime.format(d);
}

/** Long form e.g. "Wednesday, January 29, 2026" */
export function formatDateUSALong(d: Date): string {
  return fmtDateLong.format(d);
}
