// Language support: a provider, a useI18n() hook, and a tiny t() translator.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import hi from './hi.js';
import ur from './ur.js';

const DICTS = { en, hi, ur };
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ur', label: 'اردو' },
];
export const isRtl = (lang) => lang === 'ur';

const I18nContext = createContext(null);

function readSavedLang() {
  try { const l = localStorage.getItem('ss-lang'); return DICTS[l] ? l : 'en'; } catch { return 'en'; }
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readSavedLang);

  // Keep <html lang> and <html dir> in sync so Urdu flips to right-to-left.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
    try { localStorage.setItem('ss-lang', lang); } catch { /* storage may be blocked */ }
  }, [lang]);

  // t('key', { name: 'value' }) -> text in the current language (falls back to English).
  const t = useCallback((key, params) => {
    const text = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? '')) : text;
  }, [lang]);

  // tx(x): scheme content can be a dictionary key ("doc.aadhaar") or { en, hi, ur }.
  const tx = useCallback((x) => {
    if (x && typeof x === 'object') return x[lang] ?? x.en ?? '';
    if (typeof x === 'string' && DICTS.en[x] !== undefined) return t(x);
    return x ?? '';
  }, [lang, t]);

  const value = useMemo(() => ({ lang, setLang, t, tx, dir: isRtl(lang) ? 'rtl' : 'ltr' }), [lang, t, tx]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
