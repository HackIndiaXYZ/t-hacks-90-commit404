// Run with:  npm test  or  tsx --test src/eligibility/eligibility.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS,
  CHECK,
  validateProfile,
  evaluateScheme,
  matchSchemes,
  calculateReadinessScore,
  ProfileValidationError,
} from './index.js';
import { validateAndNormalizeScheme, importSchemesBatch } from '../data/importer.js';

const { schemes: verifiedSchemes } = JSON.parse(
  readFileSync(new URL('../data/schemes.json', import.meta.url))
);
const { schemes: demoSchemes } = JSON.parse(
  readFileSync(new URL('../data/demoSchemes.json', import.meta.url))
);

const byId = (id) =>
  verifiedSchemes.find((s) => s.id === id) || demoSchemes.find((s) => s.id === id);

// The base profile
const base = {
  age: 45,
  state: 'Bihar',
  domicile: 'Bihar',
  occupation: 'farmer',
  annualIncome: 80000,
  gender: 'male',
  domicileCertificate: 'yes',
  ownsLand: 'yes',
  isStudent: 'no',
  hasDisabilityCertificate: 'no',
};

const clean = (over = {}) => {
  const r = validateProfile({ ...base, ...over });
  assert.ok(r.valid, JSON.stringify(r.errors));
  return r.profile;
};

const run = (id, over) => evaluateScheme(clean(over), byId(id));

// ---- Real Verified Schemes Tests -------------------------------------------
test('PM-KISAN: landholding farmer is eligible', () => {
  const r = run('pm-kisan', { occupation: 'farmer', ownsLand: 'yes', age: 35 });
  assert.equal(r.status, STATUS.ELIGIBLE);
  assert.equal(r.missing.length, 0);
  assert.ok(r.satisfied.some((c) => c.field === 'ownsLand'));
});

test('PM-KISAN: non-landholding farmer fails', () => {
  const r = run('pm-kisan', { occupation: 'farmer', ownsLand: 'no' });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
  assert.ok(r.unsatisfied.some((c) => c.field === 'ownsLand'));
});

test('Bihar Fasal Sahayata: Bihar resident with Bihar domicile is eligible', () => {
  const r = run('bihar-fasal-sahayata', { state: 'Bihar', domicile: 'Bihar', domicileCertificate: 'yes' });
  assert.equal(r.status, STATUS.ELIGIBLE);
});

test('Bihar Fasal Sahayata: Non-Bihar resident fails residence test', () => {
  const r = run('bihar-fasal-sahayata', { state: 'Uttar Pradesh', domicile: 'Bihar' });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
});

test('PM-USP CSSS scholarship: student within age and income limit is eligible', () => {
  const r = run('pm-usp-csss', {
    age: 19,
    occupation: 'student',
    isStudent: 'yes',
    annualIncome: 300000,
  });
  assert.equal(r.status, STATUS.ELIGIBLE);
});

// ---- Income Boundaries -----------------------------------------------------
test('income boundary: exactly at max limit passes', () => {
  // CSSS income ceiling is 450,000
  const r = run('pm-usp-csss', {
    age: 20,
    occupation: 'student',
    isStudent: 'yes',
    annualIncome: 450000,
  });
  assert.equal(r.status, STATUS.ELIGIBLE);
});

test('income boundary: 1 rupee above max limit fails', () => {
  const r = run('pm-usp-csss', {
    age: 20,
    occupation: 'student',
    isStudent: 'yes',
    annualIncome: 450001,
  });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
  assert.equal(r.unsatisfied.find((c) => c.type === 'income').status, CHECK.FAIL);
});

// ---- Age Boundaries --------------------------------------------------------
test('age boundary: below minimum fails', () => {
  // IGNOAPS pension minimum age is 60
  assert.equal(run('ignoaps-pension', { age: 59, annualIncome: 50000 }).status, STATUS.NOT_ELIGIBLE);
});

test('age boundary: exact minimum age passes', () => {
  assert.equal(run('ignoaps-pension', { age: 60, annualIncome: 50000 }).status, STATUS.ELIGIBLE);
});

test('age boundary: exact maximum age passes', () => {
  // APY maximum joining age is 40
  assert.equal(run('atal-pension-yojana', { age: 40 }).status, STATUS.ELIGIBLE);
});

test('age boundary: above maximum age fails', () => {
  assert.equal(run('atal-pension-yojana', { age: 41 }).status, STATUS.NOT_ELIGIBLE);
});

// ---- State & Domicile Restrictions -----------------------------------------
test('domicile mismatch makes domicile-restricted scheme Not eligible', () => {
  const r = run('bihar-student-credit-card', {
    state: 'Bihar',
    domicile: 'Jharkhand',
    occupation: 'student',
    isStudent: 'yes',
    age: 20,
  });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
});

test('unsure domicile gives Maybe, not rejection', () => {
  const r = run('bihar-student-credit-card', {
    state: 'Bihar',
    domicile: 'unsure',
    occupation: 'student',
    isStudent: 'yes',
    age: 20,
  });
  assert.equal(r.status, STATUS.MAYBE);
  assert.ok(r.missing.includes('domicile'));
});

test('missing domicile certificate requires action but is not hard rejection', () => {
  const r = run('bihar-student-credit-card', {
    state: 'Bihar',
    domicile: 'Bihar',
    domicileCertificate: 'no',
    occupation: 'student',
    isStudent: 'yes',
    age: 20,
  });
  assert.equal(r.status, STATUS.MAYBE);
  assert.ok(r.missing.includes('domicileCertificate'));
});

// ---- Missing Fields & Conflicting Data --------------------------------------
test('unsure income gives Maybe and lists the missing field', () => {
  const r = run('pm-usp-csss', {
    age: 20,
    occupation: 'student',
    isStudent: 'yes',
    annualIncome: 'unsure',
  });
  assert.equal(r.status, STATUS.MAYBE);
  assert.deepEqual(r.missing, ['annualIncome']);
});

test('hard failure wins over missing information', () => {
  // Wrong age for CSSS (age 35 > max 25) even if income is unsure
  const r = run('pm-usp-csss', {
    age: 35,
    occupation: 'student',
    isStudent: 'yes',
    annualIncome: 'unsure',
  });
  assert.equal(r.status, STATUS.NOT_ELIGIBLE);
});

test('insufficient info status when all scheme requirements are unknown', () => {
  const mockScheme = {
    id: 'mock-strict',
    applicableStates: ['ALL'],
    eligibility: {
      income: { max: 100000 },
      genders: ['female'],
    },
  };
  const profile = clean({ annualIncome: 'unsure', gender: 'preferNot' });
  const result = evaluateScheme(profile, mockScheme);
  assert.equal(result.status, STATUS.INSUFFICIENT_INFO);
  assert.equal(result.passed, 0);
  assert.equal(result.missing.length, 2);
});

// ---- Application Readiness Score -------------------------------------------
test('calculateReadinessScore produces explainable score', () => {
  const profile = clean();
  const results = verifiedSchemes.map((s) => evaluateScheme(profile, s));
  const collected = ['doc.aadhaar', 'doc.bankPassbook'];
  const scoreData = calculateReadinessScore(profile, results, collected);
  assert.ok(scoreData.score >= 0 && scoreData.score <= 100);
  assert.ok(scoreData.profileScore > 50);
  assert.ok(scoreData.documentScore > 0);
  assert.ok(scoreData.disclaimer);
});

// ---- Importer & Data Hygiene -----------------------------------------------
test('every verified scheme has valid official URLs and publisher', () => {
  for (const s of verifiedSchemes) {
    assert.equal(s.verificationStatus, 'verified', s.id);
    assert.ok(s.applicationUrl && s.applicationUrl.startsWith('http'), `${s.id} missing app url`);
    assert.ok(s.sourceUrl && s.sourceUrl.startsWith('http'), `${s.id} missing source url`);
    assert.ok(s.department, `${s.id} missing department`);
  }
});

test('importer rejects invalid scheme missing id', () => {
  const res = validateAndNormalizeScheme({ name: 'Test' }, []);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('id')));
});

test('importer detects duplicate and protects verified record', () => {
  const existing = [{ id: 'pm-kisan', name: { en: 'PM-KISAN' }, verificationStatus: 'verified' }];
  const res = validateAndNormalizeScheme(
    { id: 'pm-kisan', name: 'PM-KISAN', verificationStatus: 'official_unverified' },
    existing
  );
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Cannot overwrite verified')));
});

test('batch importer correctly summarizes report', () => {
  const records = [
    { id: 'new-scheme-1', name: 'New 1', sourceUrl: 'https://myscheme.gov.in', verificationStatus: 'verified' },
    { name: 'Invalid Scheme Without ID' },
  ];
  const batchRes = importSchemesBatch(records, []);
  assert.equal(batchRes.imported.length, 1);
  assert.equal(batchRes.rejected.length, 1);
  assert.ok(batchRes.report.includes('Total records processed: 2'));
});
