// ---------------------------------------------------------------------------
// SchemeSaathi Data Importer & Normalizer
// Supports validating, normalizing, and importing schemes from JSON and CSV.
// ---------------------------------------------------------------------------
import { STATES } from './states.js';
import { CATEGORIES } from './index.js';

const VALID_LEVELS = ['central', 'state'];
const VALID_VERIF = ['verified', 'official_unverified', 'demo'];
const VALID_OCCUPATIONS = ['farmer', 'student', 'employed', 'unemployed', 'selfEmployed', 'other'];

/**
 * Normalizes state name to match canonical list from STATES or 'ALL'
 */
export function normalizeStateName(stateStr) {
  if (!stateStr) return null;
  const trimmed = stateStr.trim();
  if (trimmed.toUpperCase() === 'ALL') return 'ALL';
  const found = STATES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return found || null;
}

/**
 * Normalizes category to standard set
 */
export function normalizeCategory(catStr) {
  if (!catStr) return 'welfare';
  const trimmed = catStr.trim().toLowerCase();
  const found = CATEGORIES.find((c) => c === trimmed);
  if (found) return found;

  const aliases = {
    agri: 'agriculture',
    farming: 'education',
    farmer: 'agriculture',
    kisan: 'agriculture',
    scholarship: 'education',
    edu: 'education',
    social: 'welfare',
    pensions: 'pension',
    elderly: 'pension',
    jobs: 'employment',
    skills: 'employment',
    skilling: 'employment',
    house: 'housing',
    medical: 'health',
    healthcare: 'health',
    msme: 'business',
    startup: 'business',
    enterprise: 'business',
    divyang: 'disability',
    pwd: 'disability',
    handicap: 'disability',
  };

  return aliases[trimmed] || 'welfare';
}

/**
 * Validates and normalizes an individual scheme record.
 * Returns { valid: boolean, errors: string[], warnings: string[], scheme: object | null }
 */
export function validateAndNormalizeScheme(raw, existingSchemes = []) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Record must be a non-null object'], warnings, scheme: null };
  }

  // Scheme ID
  let id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) {
    errors.push('Missing required field: id');
  } else if (!/^[a-z0-9_-]+$/i.test(id)) {
    warnings.push(`ID "${id}" contains special characters; normalizing to slug`);
    id = id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  }

  // Scheme Name
  let name = raw.name;
  if (!name) {
    errors.push('Missing required field: name');
  } else if (typeof name === 'string') {
    name = { en: name.trim(), hi: raw.name_hi || name.trim(), ur: raw.name_ur || name.trim() };
  } else if (typeof name === 'object') {
    if (!name.en && !name.hi) {
      errors.push('Scheme name must have at least English or Hindi title');
    }
    name = {
      en: name.en ? String(name.en).trim() : (name.hi || 'Untitled Scheme'),
      hi: name.hi ? String(name.hi).trim() : name.en,
      ur: name.ur ? String(name.ur).trim() : name.en,
    };
  }

  // Description
  let description = raw.description;
  if (!description) {
    warnings.push('Scheme description is missing');
    description = { en: '', hi: '', ur: '' };
  } else if (typeof description === 'string') {
    description = { en: description.trim(), hi: description.trim(), ur: description.trim() };
  } else if (typeof description === 'object') {
    description = {
      en: description.en ? String(description.en).trim() : '',
      hi: description.hi ? String(description.hi).trim() : '',
      ur: description.ur ? String(description.ur).trim() : '',
    };
  }

  // Benefits
  let benefits = raw.benefits;
  if (typeof benefits === 'string') {
    benefits = { en: benefits.trim(), hi: benefits.trim(), ur: benefits.trim() };
  } else if (!benefits || typeof benefits !== 'object') {
    benefits = { en: description.en || 'Government welfare benefit', hi: description.hi || 'सरकारी कल्याण लाभ', ur: description.ur || 'سرکاری فلاحی فائدہ' };
  }

  // Level & States
  let level = typeof raw.level === 'string' ? raw.level.trim().toLowerCase() : 'central';
  if (!VALID_LEVELS.includes(level)) {
    warnings.push(`Invalid level "${level}"; defaulting to "central"`);
    level = 'central';
  }

  let governingState = null;
  if (level === 'state') {
    governingState = normalizeStateName(raw.governingState);
    if (!governingState) {
      warnings.push(`State scheme missing valid governingState: "${raw.governingState}"`);
    }
  }

  let applicableStates = ['ALL'];
  if (Array.isArray(raw.applicableStates) && raw.applicableStates.length > 0) {
    applicableStates = raw.applicableStates
      .map(normalizeStateName)
      .filter(Boolean);
    if (applicableStates.length === 0) applicableStates = ['ALL'];
  } else if (governingState) {
    applicableStates = [governingState];
  }

  // Category
  const category = normalizeCategory(raw.category);

  // Verification Status
  let verificationStatus = typeof raw.verificationStatus === 'string' ? raw.verificationStatus.trim() : 'official_unverified';
  if (!VALID_VERIF.includes(verificationStatus)) {
    verificationStatus = 'official_unverified';
  }

  // Sources
  const sourceUrl = typeof raw.sourceUrl === 'string' && raw.sourceUrl.startsWith('http') ? raw.sourceUrl.trim() : null;
  const applicationUrl = typeof raw.applicationUrl === 'string' && raw.applicationUrl.startsWith('http') ? raw.applicationUrl.trim() : null;
  if (!sourceUrl && verificationStatus === 'verified') {
    warnings.push('Scheme marked verified but lacks an authoritative sourceUrl; downgrading to official_unverified');
    verificationStatus = 'official_unverified';
  }

  // Eligibility structure
  const rawE = raw.eligibility || {};
  const eligibility = {
    age: {
      min: typeof rawE.age?.min === 'number' ? rawE.age.min : (typeof raw.ageMin === 'number' ? raw.ageMin : null),
      max: typeof rawE.age?.max === 'number' ? rawE.age.max : (typeof raw.ageMax === 'number' ? raw.ageMax : null),
    },
    income: {
      max: typeof rawE.income?.max === 'number' ? rawE.income.max : (typeof raw.incomeMax === 'number' ? raw.incomeMax : null),
    },
    occupations: Array.isArray(rawE.occupations)
      ? rawE.occupations.filter((o) => VALID_OCCUPATIONS.includes(o))
      : [],
    genders: Array.isArray(rawE.genders) ? rawE.genders : [],
    domicile: rawE.domicile && typeof rawE.domicile === 'object'
      ? {
          states: (rawE.domicile.states || []).map(normalizeStateName).filter(Boolean),
          certificateRequired: Boolean(rawE.domicile.certificateRequired),
        }
      : null,
    requires: Array.isArray(rawE.requires) ? rawE.requires : [],
  };

  // Documents and Steps
  const documents = Array.isArray(raw.documents) ? raw.documents : ['doc.aadhaar', 'doc.bankPassbook'];
  const steps = Array.isArray(raw.steps) ? raw.steps : ['step.gather', 'step.form', 'step.submit', 'step.track'];

  const normalizedScheme = {
    id,
    name,
    description,
    benefits,
    category,
    department: raw.department ? String(raw.department).trim() : 'Government of India',
    level,
    governingState,
    applicableStates,
    targetBeneficiaries: raw.targetBeneficiaries || { en: 'Eligible citizens', hi: 'पात्र नागरिक', ur: 'مستحق شہری' },
    eligibility,
    documents,
    steps,
    applicationUrl,
    sourceUrl,
    sourcePublisher: raw.sourcePublisher ? String(raw.sourcePublisher).trim() : 'Official Portal',
    dateRetrieved: raw.dateRetrieved || new Date().toISOString().split('T')[0],
    lastVerified: raw.lastVerified || new Date().toISOString().split('T')[0],
    verificationStatus,
    _rawSource: { ...raw },
  };

  // Duplicate Check against existingSchemes
  const existing = existingSchemes.find((s) => s.id === id || (s.name?.en && s.name.en.toLowerCase() === normalizedScheme.name.en.toLowerCase()));
  if (existing) {
    if (existing.verificationStatus === 'verified' && verificationStatus !== 'verified') {
      errors.push(`Cannot overwrite verified scheme "${id}" with unverified record`);
      return { valid: false, errors, warnings, scheme: null, isDuplicate: true };
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    scheme: errors.length === 0 ? normalizedScheme : null,
    isDuplicate: Boolean(existing),
  };
}

/**
 * Parses simple CSV content to array of objects
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < lines[i].length; c++) {
      const ch = lines[i][c];
      if (ch === '"' && (c === 0 || lines[i][c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim().replace(/^["']|["']$/g, ''));

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Batch import schemes
 */
export function importSchemesBatch(records, currentSchemes = []) {
  const imported = [];
  const rejected = [];
  const duplicates = [];
  const requireVerification = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const res = validateAndNormalizeScheme(rec, currentSchemes);

    if (!res.valid) {
      rejected.push({ index: i, id: rec?.id || `row_${i + 1}`, errors: res.errors });
      errors.push(`Record #${i + 1} (${rec?.id || 'unknown'}): ${res.errors.join('; ')}`);
      continue;
    }

    if (res.isDuplicate) {
      duplicates.push(res.scheme.id);
    }

    if (res.scheme.verificationStatus !== 'verified') {
      requireVerification.push(res.scheme.id);
    }

    imported.push(res.scheme);
  }

  const report = [
    `=== SchemeSaathi Import Report ===`,
    `Total records processed: ${records.length}`,
    `Successfully imported/validated: ${imported.length}`,
    `Duplicates detected: ${duplicates.length}`,
    `Requiring official verification: ${requireVerification.length}`,
    `Rejected due to errors: ${rejected.length}`,
    rejected.length ? `Errors:\n- ${errors.join('\n- ')}` : 'No fatal errors encountered.',
  ].join('\n');

  return {
    imported,
    rejected,
    duplicates,
    requireVerification,
    errors,
    report,
  };
}
