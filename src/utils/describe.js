// Turns an engine "check" (plain data) into a sentence in the current language.
import { formatINR } from './format.js';

export function describeCheck(check, { t }) {
  const p = { ...check.params };
  const label = (v) => (check.type === 'occupation' ? t('occ.' + v) : check.type === 'gender' ? t('gender.' + v) : v);

  if (p.value !== undefined) {
    if (check.type === 'occupation' || check.type === 'gender') p.value = label(p.value);
    if (check.type === 'income') p.value = formatINR(p.value);
  }
  if (Array.isArray(p.list)) p.list = p.list.map(label).join(', ');
  if (check.type === 'income' && p.max != null) p.max = formatINR(p.max);
  if (check.type === 'age') {
    p.range = p.min != null && p.max != null ? t('range.between', p)
      : p.min != null ? t('range.min', p) : t('range.max', p);
  }
  if (check.type === 'requires') p.label = t('req.' + check.field);
  return t(`check.${check.type}.${check.status}`, p);
}

// One line for the results list: the most important reason first.
export function headlineReason(result, ctx) {
  const { t } = ctx;
  if (result.status === 'eligible') return t('rank.eligible');
  const first = result.checks.find((c) => c.status === (result.status === 'maybe' ? 'unknown' : 'fail'));
  return first ? describeCheck(first, ctx) : '';
}
