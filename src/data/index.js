// SchemeSaathi scheme data repository
// Provides real verified government schemes as primary production data,
// with isolated demonstration schemes available on request.
import verifiedData from './schemes.json' with { type: 'json' };
import demoData from './demoSchemes.json' with { type: 'json' };

export const SCHEMES = verifiedData.schemes;
export const DEMO_SCHEMES = demoData.schemes;
export const SCHEMES_METADATA = verifiedData._metadata || {};

export const getAllSchemes = (includeDemo = false) => {
  return includeDemo ? [...SCHEMES, ...DEMO_SCHEMES] : SCHEMES;
};

export const getScheme = (id, includeDemo = true) => {
  return SCHEMES.find((s) => s.id === id) || (includeDemo ? DEMO_SCHEMES.find((s) => s.id === id) : null);
};

export const isDemo = (scheme) => scheme?.verificationStatus === 'demo';

export const CATEGORIES = [
  'agriculture',
  'education',
  'welfare',
  'pension',
  'employment',
  'housing',
  'health',
  'business',
  'disability'
];

export const LIFE_SITUATIONS = [
  {
    id: 'student',
    key: 'sit.student',
    icon: 'graduation-cap',
    targetOccupations: ['student'],
    categoryMatch: ['education'],
  },
  {
    id: 'farmer',
    key: 'sit.farmer',
    icon: 'tractor',
    targetOccupations: ['farmer'],
    categoryMatch: ['agriculture'],
  },
  {
    id: 'jobseeker',
    key: 'sit.jobseeker',
    icon: 'briefcase',
    targetOccupations: ['unemployed'],
    categoryMatch: ['employment'],
  },
  {
    id: 'senior',
    key: 'sit.senior',
    icon: 'heart-pulse',
    categoryMatch: ['pension'],
    ageMin: 60,
  },
  {
    id: 'low_income',
    key: 'sit.low_income',
    icon: 'home',
    categoryMatch: ['housing', 'welfare', 'health'],
  },
  {
    id: 'woman',
    key: 'sit.woman',
    icon: 'user',
    targetGender: 'female',
    categoryMatch: ['welfare'],
  },
  {
    id: 'business',
    key: 'sit.business',
    icon: 'store',
    targetOccupations: ['selfEmployed'],
    categoryMatch: ['business'],
  },
  {
    id: 'disability',
    key: 'sit.disability',
    icon: 'shield',
    categoryMatch: ['disability'],
  },
];
