// ---------------------------------------------------------------------------
// SchemeSaathi eligibility engine
//
// Pure JavaScript: no React, no network, no AI. The same profile and the same
// scheme always give the same answer, so it is easy to test and to trust.
//
// For each scheme we run a list of "checks". Each check ends as one of:
//   pass    - the profile satisfies this rule
//   fail    - the profile definitely breaks this rule
//   unknown - we lack the information (user said "not sure" or left it blank)
//
// Outcomes supported:
//   - eligible: all documented criteria are satisfied by available profile data
//   - maybe: some conditions pass, but some answers are missing/require verification
//   - insufficient_info: zero rules can be verified due to lack of profile inputs
//   - not_eligible: at least one documented condition is definitely broken
//
// Missing information NEVER produces "not eligible".
// ---------------------------------------------------------------------------
import { STATES } from '../data/states.js';

export const STATUS = Object.freeze({
  ELIGIBLE: 'eligible',
  MAYBE: 'maybe',
  INSUFFICIENT_INFO: 'insufficient_info',
  NOT_ELIGIBLE: 'not_eligible',
});

export const CHECK = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  UNKNOWN: 'unknown',
});

export const UNSURE = 'unsure';

export const OCCUPATIONS = ['farmer', 'student', 'employed', 'unemployed', 'selfEmployed', 'other'];
export const GENDERS = ['male', 'female', 'other', 'preferNot'];
export const YES_NO_UNSURE = ['yes', 'no', 'unsure'];

// Yes/no profile fields a scheme is allowed to require in `eligibility.requires`.
export const REQUIRABLE_FIELDS = ['isStudent', 'ownsLand', 'hasDisabilityCertificate'];

export class ProfileValidationError extends Error {
  constructor(errors) {
    super('The profile has invalid or missing fields.');
    this.name = 'ProfileValidationError';
    this.errors = errors; // { fieldName: 'required' | 'invalidNumber' | 'outOfRange' | 'invalidOption' }
  }
}

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function parseNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(/[,₹\s]/g, ''));
  return NaN;
}

/**
 * Checks and cleans a raw profile (for example straight from the form).
 * Returns { valid, errors, profile }. Running it on an already-clean profile
 * returns the same profile (it is idempotent).
 *
 * Domicile is its own field. It is NEVER copied from `state`.
 */
export function validateProfile(raw = {}) {
  const errors = {};
  const p = {};

  // Age: whole number 0..120
  if (isBlank(raw.age)) errors.age = 'required';
  else {
    const n = parseNumber(raw.age);
    if (!Number.isInteger(n)) errors.age = 'invalidNumber';
    else if (n < 0 || n > 120) errors.age = 'outOfRange';
    else p.age = n;
  }

  // Current state / UT where the person lives
  if (isBlank(raw.state)) errors.state = 'required';
  else if (!STATES.includes(raw.state)) errors.state = 'invalidOption';
  else p.state = raw.state;

  // Domicile state: a state/UT, or an explicit "I am not sure"
  if (isBlank(raw.domicile)) errors.domicile = 'required';
  else if (raw.domicile === UNSURE) p.domicile = UNSURE;
  else if (!STATES.includes(raw.domicile)) errors.domicile = 'invalidOption';
  else p.domicile = raw.domicile;

  // Occupation
  if (isBlank(raw.occupation)) errors.occupation = 'required';
  else if (!OCCUPATIONS.includes(raw.occupation)) errors.occupation = 'invalidOption';
  else p.occupation = raw.occupation;

  // Annual family income in INR, or explicit "unsure"
  if (isBlank(raw.annualIncome)) errors.annualIncome = 'required';
  else if (raw.annualIncome === UNSURE) p.annualIncome = UNSURE;
  else {
    const n = parseNumber(raw.annualIncome);
    if (!Number.isFinite(n)) errors.annualIncome = 'invalidNumber';
    else if (n < 0 || n > 1e9) errors.annualIncome = 'outOfRange';
    else p.annualIncome = n;
  }

  // Gender is optional. Blank means "not provided".
  if (isBlank(raw.gender)) p.gender = null;
  else if (!GENDERS.includes(raw.gender)) errors.gender = 'invalidOption';
  else p.gender = raw.gender;

  // Yes / no / not sure fields. Blank means "not sure".
  for (const field of ['domicileCertificate', ...REQUIRABLE_FIELDS]) {
    if (isBlank(raw[field])) p[field] = UNSURE;
    else if (!YES_NO_UNSURE.includes(raw[field])) errors[field] = 'invalidOption';
    else p[field] = raw[field];
  }

  if (!isBlank(raw.language)) p.language = raw.language;

  const valid = Object.keys(errors).length === 0;
  return { valid, errors, profile: valid ? p : null };
}

const ageRange = (a) => ({ min: a.min ?? null, max: a.max ?? null });

/**
 * Evaluates ONE scheme for ONE validated profile.
 * Returns { schemeId, status, checks, satisfied, unsatisfied, missing, verificationNeeded, passed, total, disclaimer }.
 */
export function evaluateScheme(profile, scheme) {
  const e = scheme.eligibility || {};
  const checks = [];
  const add = (type, field, status, params = {}) => checks.push({ type, field, status, params });

  // Age limits
  if (e.age && (e.age.min != null || e.age.max != null)) {
    const { min, max } = ageRange(e.age);
    const ok = (min == null || profile.age >= min) && (max == null || profile.age <= max);
    add('age', 'age', ok ? CHECK.PASS : CHECK.FAIL, { value: profile.age, min, max });
  }

  // Income ceiling
  if (e.income && e.income.max != null) {
    if (typeof profile.annualIncome !== 'number') {
      add('income', 'annualIncome', CHECK.UNKNOWN, { max: e.income.max });
    } else {
      add('income', 'annualIncome', profile.annualIncome <= e.income.max ? CHECK.PASS : CHECK.FAIL, {
        value: profile.annualIncome,
        max: e.income.max,
      });
    }
  }

  // Occupation
  if (e.occupations && e.occupations.length) {
    const ok = e.occupations.includes(profile.occupation);
    add('occupation', 'occupation', ok ? CHECK.PASS : CHECK.FAIL, { value: profile.occupation, list: e.occupations });
  }

  // Gender
  if (e.genders && e.genders.length) {
    if (!profile.gender || profile.gender === 'preferNot') {
      add('gender', 'gender', CHECK.UNKNOWN, { list: e.genders });
    } else {
      add('gender', 'gender', e.genders.includes(profile.gender) ? CHECK.PASS : CHECK.FAIL, {
        value: profile.gender,
        list: e.genders,
      });
    }
  }

  // Current residence (where the person lives now). "ALL" means no restriction.
  const states = scheme.applicableStates || ['ALL'];
  if (!states.includes('ALL')) {
    add('residenceState', 'state', states.includes(profile.state) ? CHECK.PASS : CHECK.FAIL, {
      value: profile.state,
      list: states,
    });
  }

  // Domicile (legal domicile, separate from residence)
  if (e.domicile && e.domicile.states && e.domicile.states.length) {
    const list = e.domicile.states;
    let domicileFailed = false;
    if (profile.domicile === UNSURE) {
      add('domicile', 'domicile', CHECK.UNKNOWN, { list });
    } else {
      const ok = list.includes(profile.domicile);
      domicileFailed = !ok;
      add('domicile', 'domicile', ok ? CHECK.PASS : CHECK.FAIL, { value: profile.domicile, list });
    }
    // The certificate only matters if domicile is not already ruled out.
    // Not having it yet is "needs action", not a rejection.
    if (e.domicile.certificateRequired && !domicileFailed) {
      add('domicileCertificate', 'domicileCertificate',
        profile.domicileCertificate === 'yes' ? CHECK.PASS : CHECK.UNKNOWN, { certificateRequired: true });
    }
  }

  // Extra yes/no conditions such as owning land or being a student
  for (const rule of e.requires || []) {
    if (!REQUIRABLE_FIELDS.includes(rule.field)) {
      throw new Error(`Scheme "${scheme.id}" requires unknown profile field "${rule.field}".`);
    }
    const answer = profile[rule.field];
    if (answer === UNSURE || answer === undefined) {
      add('requires', rule.field, CHECK.UNKNOWN, { rule });
    } else {
      add('requires', rule.field, answer === rule.equals ? CHECK.PASS : CHECK.FAIL, { value: answer, rule });
    }
  }

  const failed = checks.some((c) => c.status === CHECK.FAIL);
  const unknown = checks.filter((c) => c.status === CHECK.UNKNOWN);
  const passed = checks.filter((c) => c.status === CHECK.PASS);

  let status = STATUS.ELIGIBLE;
  if (failed) {
    status = STATUS.NOT_ELIGIBLE;
  } else if (passed.length === 0 && unknown.length >= 2) {
    status = STATUS.INSUFFICIENT_INFO;
  } else if (unknown.length > 0) {
    status = STATUS.MAYBE;
  }

  const satisfied = passed;
  const unsatisfied = checks.filter((c) => c.status === CHECK.FAIL);
  const missing = [...new Set(unknown.map((c) => c.field))];
  const verificationNeeded = checks.filter(
    (c) => c.status === CHECK.UNKNOWN || c.type === 'domicileCertificate'
  );

  return {
    schemeId: scheme.id,
    status,
    checks,
    satisfied,
    unsatisfied,
    missing,
    verificationNeeded,
    passed: passed.length,
    total: checks.length,
    disclaimer: 'Eligible based on available criteria. Official grant and disbursement remain subject to verification and sanction by the relevant government department.',
  };
}

const ORDER = {
  [STATUS.ELIGIBLE]: 0,
  [STATUS.MAYBE]: 1,
  [STATUS.INSUFFICIENT_INFO]: 2,
  [STATUS.NOT_ELIGIBLE]: 3,
};

/** Ranking: Eligible, then Maybe (fewest missing answers first), Insufficient info, then Not eligible. */
export function compareResults(a, b) {
  return (
    (ORDER[a.status] ?? 99) - (ORDER[b.status] ?? 99) ||
    a.missing.length - b.missing.length ||
    b.passed - a.passed ||
    a.schemeId.localeCompare(b.schemeId)
  );
}

/**
 * Calculates Application Readiness Score (0 to 100%)
 * Factors:
 * - Profile Completeness (40% weight)
 * - Eligibility Clarity (30% weight)
 * - Document Preparation (30% weight)
 */
export function calculateReadinessScore(profile, results = [], collectedDocuments = []) {
  if (!profile) return { score: 0, profileScore: 0, eligibilityScore: 0, documentScore: 0, breakdown: {} };

  // 1. Profile completeness
  const coreFields = ['age', 'state', 'domicile', 'occupation', 'annualIncome'];
  const optionalFields = ['gender', 'domicileCertificate', 'ownsLand', 'isStudent', 'hasDisabilityCertificate'];
  
  let coreCount = 0;
  for (const f of coreFields) {
    if (profile[f] !== undefined && profile[f] !== null && profile[f] !== UNSURE && profile[f] !== '') coreCount++;
  }
  let optCount = 0;
  for (const f of optionalFields) {
    if (profile[f] !== undefined && profile[f] !== null && profile[f] !== UNSURE && profile[f] !== '') optCount++;
  }
  const profileScore = Math.round(((coreCount / coreFields.length) * 0.7 + (optCount / optionalFields.length) * 0.3) * 100);

  // 2. Eligibility clarity
  let eligibilityScore = 0;
  if (results.length > 0) {
    const clearDecisions = results.filter((r) => r.status === STATUS.ELIGIBLE || r.status === STATUS.NOT_ELIGIBLE).length;
    eligibilityScore = Math.round((clearDecisions / results.length) * 100);
  }

  // 3. Document preparation
  const allRequiredDocs = new Set();
  const eligibleOrMaybe = results.filter((r) => r.status === STATUS.ELIGIBLE || r.status === STATUS.MAYBE);
  for (const r of eligibleOrMaybe) {
    const s = r.scheme || {};
    for (const d of (s.documents || [])) allRequiredDocs.add(d);
  }

  let documentScore = 0;
  if (allRequiredDocs.size > 0) {
    const collectedCount = Array.from(allRequiredDocs).filter((d) => collectedDocuments.includes(d)).length;
    documentScore = Math.round((collectedCount / allRequiredDocs.size) * 100);
  } else if (collectedDocuments.length > 0) {
    documentScore = 100;
  }

  const overallScore = Math.round((profileScore * 0.4) + (eligibilityScore * 0.3) + (documentScore * 0.3));

  return {
    score: overallScore,
    profileScore,
    eligibilityScore,
    documentScore,
    totalRequiredDocs: allRequiredDocs.size,
    collectedDocsCount: Array.from(allRequiredDocs).filter((d) => collectedDocuments.includes(d)).length,
    disclaimer: 'This readiness score reflects your preparation progress; it does not guarantee government approval or grant.',
  };
}

/**
 * Validates the raw profile, evaluates every scheme and returns ranked results.
 * Throws ProfileValidationError when the profile is invalid.
 */
export function matchSchemes(rawProfile, schemes) {
  const { valid, errors, profile } = validateProfile(rawProfile);
  if (!valid) throw new ProfileValidationError(errors);
  const results = schemes.map((s) => evaluateScheme(profile, s)).sort(compareResults);
  const count = (st) => results.filter((r) => r.status === st).length;
  return {
    profile,
    results,
    summary: {
      checked: results.length,
      eligible: count(STATUS.ELIGIBLE),
      maybe: count(STATUS.MAYBE),
      insufficientInfo: count(STATUS.INSUFFICIENT_INFO),
      notEligible: count(STATUS.NOT_ELIGIBLE),
    },
  };
}
