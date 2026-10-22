// Indian digit grouping: 1,50,000
export const formatINR = (n) => new Intl.NumberFormat('en-IN').format(n);

export function formatDate(date, lang) {
  const locale = { en: 'en-IN', hi: 'hi-IN', ur: 'ur-IN' }[lang] || 'en-IN';
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date); } catch { return date.toDateString(); }
}
