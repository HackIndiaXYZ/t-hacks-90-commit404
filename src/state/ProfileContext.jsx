// Holds the form answers and the results, saved schemes, collected documents,
// recently viewed schemes, comparison list, and offline caching.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { matchSchemes, validateProfile, calculateReadinessScore } from '../eligibility/index.js';
import { SCHEMES, getScheme } from '../data/index.js';
import { useI18n } from '../i18n/index.jsx';

// SAMPLE values from the brief. They are labelled as sample in the UI and are never used silently.
export const SAMPLE_FORM = {
  age: '45', state: 'Bihar', domicile: 'Bihar', domicileCertificate: '', occupation: 'farmer',
  income: '80000', incomeUnsure: false, gender: 'male', isStudent: '', ownsLand: '', hasDisabilityCertificate: '',
};
export const BLANK_FORM = {
  age: '', state: '', domicile: '', domicileCertificate: '', occupation: '',
  income: '', incomeUnsure: false, gender: '', isStudent: '', ownsLand: '', hasDisabilityCertificate: '',
};

// Convert form answers into the shape the engine expects.
export function toRaw(form, language) {
  return {
    language,
    age: form.age,
    state: form.state,
    domicile: form.domicile,
    domicileCertificate: form.domicileCertificate,
    occupation: form.occupation,
    annualIncome: form.incomeUnsure ? 'unsure' : form.income,
    gender: form.gender,
    isStudent: form.isStudent,
    ownsLand: form.ownsLand,
    hasDisabilityCertificate: form.hasDisabilityCertificate,
  };
}

const Ctx = createContext(null);
const KEY = 'ss-session';
const SAVED_SCHEMES_KEY = 'ss-saved-schemes';
const COLLECTED_DOCS_KEY = 'ss-collected-docs';
const RECENT_SCHEMES_KEY = 'ss-recent-schemes';
const COMPARE_KEY = 'ss-compare-schemes';

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; }
}

function loadLocal(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export function ProfileProvider({ children }) {
  const { lang } = useI18n();
  const saved = useMemo(loadSession, []);
  const [form, setForm] = useState(saved?.form || SAMPLE_FORM);
  const [isSample, setIsSample] = useState(saved ? saved.isSample : true);
  const [submitted, setSubmitted] = useState(saved?.submitted || null);
  const [fromText, setFromText] = useState([]); // field names filled from the user's sentence

  // Feature state: saved schemes, collected documents, recent schemes, comparison
  const [savedSchemes, setSavedSchemes] = useState(() => loadLocal(SAVED_SCHEMES_KEY, []));
  const [collectedDocs, setCollectedDocs] = useState(() => loadLocal(COLLECTED_DOCS_KEY, []));
  const [recentSchemes, setRecentSchemes] = useState(() => loadLocal(RECENT_SCHEMES_KEY, []));
  const [comparedSchemes, setComparedSchemes] = useState(() => loadLocal(COMPARE_KEY, []));

  // Offline detection & cache timestamp
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [lastSyncDate, setLastSyncDate] = useState(() => loadLocal('ss-last-sync', new Date().toISOString().split('T')[0]));

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cache schemes in localStorage for offline availability
    saveLocal('ss-schemes-cache', SCHEMES);
    saveLocal('ss-last-sync', new Date().toISOString().split('T')[0]);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const persist = (next) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const setField = useCallback((name, value) => {
    setForm((f) => {
      const next = { ...f, [name]: value };
      persist({ form: next, isSample, submitted });
      return next;
    });
    setFromText((list) => list.filter((n) => n !== name)); // user edited it, so it counts as confirmed
  }, [isSample, submitted]);

  const clearSample = useCallback(() => {
    setForm(BLANK_FORM);
    setIsSample(false);
    setSubmitted(null);
    setFromText([]);
    persist({ form: BLANK_FORM, isSample: false, submitted: null });
  }, []);

  // Fields read from user's sentence or AI conversational assistant
  const applyExtracted = useCallback((fields, merge = false) => {
    setForm((prev) => {
      const base = merge ? { ...prev } : { ...BLANK_FORM };
      const used = merge ? [...fromText] : [];
      for (const [k, v] of Object.entries(fields || {})) {
        if (v == null || v === '') continue;
        if (k === 'annualIncome') {
          if (v === 'unsure') {
            base.income = '';
            base.incomeUnsure = true;
          } else {
            base.income = String(v);
            base.incomeUnsure = false;
          }
          if (!used.includes('income')) used.push('income');
        } else if (k === 'income') {
          base.income = String(v);
          base.incomeUnsure = false;
          if (!used.includes('income')) used.push('income');
        } else if (k in base) {
          base[k] = String(v);
          if (!used.includes(k)) used.push(k);
        }
      }
      setIsSample(false);
      setFromText(used);
      persist({ form: base, isSample: false, submitted: null });
      return base;
    });
  }, [fromText]);

  const validate = useCallback(() => validateProfile(toRaw(form, lang)), [form, lang]);

  const submit = useCallback(() => {
    const check = validateProfile(toRaw(form, lang));
    if (!check.valid) return { ok: false, errors: check.errors };
    setSubmitted(form);
    persist({ form, isSample, submitted: form });
    return { ok: true };
  }, [form, lang, isSample]);

  // Real-time quick answer for Eligibility Gap Finder ("What Am I Missing?")
  const quickAnswer = useCallback((fieldName, value) => {
    setForm((f) => {
      const formKey = fieldName === 'annualIncome' ? 'income' : fieldName;
      const next = {
        ...f,
        [formKey]: value,
        incomeUnsure: formKey === 'income' ? value === 'unsure' : f.incomeUnsure,
      };
      setSubmitted(next);
      persist({ form: next, isSample, submitted: next });
      return next;
    });
  }, [isSample]);

  // Saved / Bookmarked Schemes
  const toggleSaveScheme = useCallback((schemeId) => {
    setSavedSchemes((prev) => {
      const next = prev.includes(schemeId) ? prev.filter((id) => id !== schemeId) : [...prev, schemeId];
      saveLocal(SAVED_SCHEMES_KEY, next);
      return next;
    });
  }, []);

  const isSchemeSaved = useCallback((schemeId) => savedSchemes.includes(schemeId), [savedSchemes]);

  // Document Checklist state
  const toggleDocumentCollected = useCallback((docKey) => {
    setCollectedDocs((prev) => {
      const next = prev.includes(docKey) ? prev.filter((d) => d !== docKey) : [...prev, docKey];
      saveLocal(COLLECTED_DOCS_KEY, next);
      return next;
    });
  }, []);

  const isDocumentCollected = useCallback((docKey) => collectedDocs.includes(docKey), [collectedDocs]);

  // Recently viewed schemes
  const recordSchemeView = useCallback((schemeId) => {
    setRecentSchemes((prev) => {
      const next = [schemeId, ...prev.filter((id) => id !== schemeId)].slice(0, 8);
      saveLocal(RECENT_SCHEMES_KEY, next);
      return next;
    });
  }, []);

  // Scheme Comparison
  const addToCompare = useCallback((schemeId) => {
    setComparedSchemes((prev) => {
      if (prev.includes(schemeId)) return prev;
      if (prev.length >= 3) return prev;
      const next = [...prev, schemeId];
      saveLocal(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((schemeId) => {
    setComparedSchemes((prev) => {
      const next = prev.filter((id) => id !== schemeId);
      saveLocal(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setComparedSchemes([]);
    saveLocal(COMPARE_KEY, []);
  }, []);

  // Results recomputed from submitted answers or initial form
  const activeProfile = submitted || form;
  const analysis = useMemo(() => {
    if (!activeProfile) return null;
    try {
      const res = matchSchemes(toRaw(activeProfile, lang), SCHEMES);
      // Attach scheme objects to results for convenience
      const enrichedResults = res.results.map((r) => ({
        ...r,
        scheme: getScheme(r.schemeId),
      }));
      return {
        ...res,
        results: enrichedResults,
      };
    } catch {
      return null;
    }
  }, [activeProfile, lang]);

  // Application Readiness Score
  const readiness = useMemo(() => {
    if (!analysis?.profile) return { score: 0, profileScore: 0, eligibilityScore: 0, documentScore: 0 };
    return calculateReadinessScore(analysis.profile, analysis.results, collectedDocs);
  }, [analysis, collectedDocs]);

  const value = {
    form,
    setField,
    isSample,
    clearSample,
    applyExtracted,
    fromText,
    validate,
    submit,
    quickAnswer,
    analysis,
    readiness,
    savedSchemes,
    toggleSaveScheme,
    isSchemeSaved,
    collectedDocs,
    toggleDocumentCollected,
    isDocumentCollected,
    recentSchemes,
    recordSchemeView,
    comparedSchemes,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isOffline,
    lastSyncDate,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
