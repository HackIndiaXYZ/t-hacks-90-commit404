// Keeps only extracted values that are valid. Anything doubtful is dropped, so the
// user is asked for it instead of us guessing.
import { STATES } from '../../src/data/states.js';

const OCC = ['farmer', 'student', 'employed', 'unemployed', 'selfEmployed', 'other'];
const GEN = ['male', 'female', 'other'];
const YN = ['yes', 'no'];

export function sanitizeExtracted(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;

  if (Number.isInteger(obj.age) && obj.age >= 0 && obj.age <= 120) out.age = obj.age;
  if (STATES.includes(obj.state)) out.state = obj.state;
  if (STATES.includes(obj.domicile)) out.domicile = obj.domicile;
  if (OCC.includes(obj.occupation)) out.occupation = obj.occupation;
  if (typeof obj.annualIncome === 'number' && Number.isFinite(obj.annualIncome) && obj.annualIncome >= 0 && obj.annualIncome <= 1e9) {
    out.annualIncome = Math.round(obj.annualIncome);
  }
  if (GEN.includes(obj.gender)) out.gender = obj.gender;
  for (const f of ['isStudent', 'ownsLand', 'hasDisabilityCertificate']) {
    if (YN.includes(obj[f])) out[f] = obj[f];
  }
  return out;
}
