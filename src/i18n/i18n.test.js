// Checks that every language is complete and that every engine message can be shown in every language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from './en.js';
import hi from './hi.js';
import ur from './ur.js';
import { validateProfile, evaluateScheme, OCCUPATIONS, GENDERS } from '../eligibility/index.js';
import { describeCheck } from '../utils/describe.js';
import { STATES } from '../data/states.js';

const { schemes } = JSON.parse(readFileSync(new URL('../data/schemes.json', import.meta.url)));
const DICTS = { en, hi, ur };
const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
const makeT = (d) => (key, params) => {
  assert.ok(d[key] !== undefined, `missing translation key: ${key}`);
  return params ? d[key].replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : d[key];
};

test('Hindi and Urdu have exactly the same keys and placeholders as English', () => {
  for (const [name, d] of [['hi', hi], ['ur', ur]]) {
    assert.deepEqual(Object.keys(d).sort(), Object.keys(en).sort(), name);
    for (const k of Object.keys(en)) assert.equal(placeholders(d[k]), placeholders(en[k]), `${name}:${k}`);
  }
});

test('every check message exists in every language and leaves no placeholder unfilled', () => {
  const profiles = [];
  for (const occupation of OCCUPATIONS) for (const gender of [...GENDERS, '']) for (const income of [50000, 900000, 'unsure'])
    for (const domicile of ['Bihar', 'Delhi', 'unsure']) for (const age of [15, 25, 45, 70])
      for (const yn of ['yes', 'no', '']) {
        const r = validateProfile({ age, state: STATES[3], domicile, occupation, annualIncome: income, gender,
          domicileCertificate: yn, isStudent: yn, ownsLand: yn, hasDisabilityCertificate: yn });
        assert.ok(r.valid);
        profiles.push(r.profile);
      }
  for (const [lang, d] of Object.entries(DICTS)) {
    const ctx = { t: makeT(d), tx: (x) => (typeof x === 'object' ? x[lang] : d[x] ?? x) };
    for (const p of profiles) for (const s of schemes) for (const c of evaluateScheme(p, s).checks) {
      const text = describeCheck(c, ctx);
      assert.ok(text && !/[{}]/.test(text), `${lang} ${c.type}.${c.status}: "${text}"`);
    }
  }
});

test('every scheme has text in all languages, and every document and step key exists', () => {
  for (const s of schemes) {
    for (const lang of Object.keys(DICTS)) {
      assert.ok(s.name[lang] && s.description[lang], `${s.id} ${lang}`);
      for (const k of [...s.documents, ...s.steps]) assert.ok(DICTS[lang][k], `${lang} ${k}`);
    }
  }
});
