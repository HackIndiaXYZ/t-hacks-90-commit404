import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile, toRaw } from '../state/ProfileContext.jsx';
import { SCHEMES, CATEGORIES, LIFE_SITUATIONS, isDemo } from '../data/index.js';
import { matchSchemes } from '../eligibility/index.js';
import { downloadChecklist } from '../services/pdf.js';
import { formatINR } from '../utils/format.js';
import { IconDownload, IconEdit } from '../components/Icons.jsx';
import { SchemeRow } from '../components/SchemeParts.jsx';
import ReadinessWidget from '../components/ReadinessWidget.jsx';
import DocumentChecklist from '../components/DocumentChecklist.jsx';
import LifeSituations from '../components/LifeSituations.jsx';

export default function Results() {
  const ctx = useI18n();
  const { t, tx, lang } = ctx;
  const { form, analysis: contextAnalysis, isSample, submit } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [busy, setBusy] = useState(null);
  const [failed, setFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showDocs, setShowDocs] = useState(false);

  const selectedSituation = searchParams.get('situation') || null;

  // If user hasn't explicitly clicked submit, auto-evaluate from current form
  const analysis = useMemo(() => {
    if (contextAnalysis) return contextAnalysis;
    try {
      const res = matchSchemes(toRaw(form, lang), SCHEMES);
      return {
        ...res,
        results: res.results.map((r) => ({
          ...r,
          scheme: SCHEMES.find((s) => s.id === r.schemeId),
        })),
      };
    } catch {
      return null;
    }
  }, [contextAnalysis, form, lang]);

  if (!analysis) {
    return (
      <main id="main" className="wrap page">
        <h1>{t('res.title')}</h1>
        <p className="lede-sm">{t('res.needProfile')}</p>
        <Link to="/profile" className="btn btn-primary">{t('btn.find')}</Link>
      </main>
    );
  }

  const { profile, results, summary } = analysis;
  const byId = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));

  // Filtering by search query, category, and life situation
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const s = byId[r.schemeId];
      if (!s) return false;

      // 1. Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = tx(s.name).toLowerCase().includes(q);
        const descMatch = tx(s.description).toLowerCase().includes(q);
        const deptMatch = (s.department || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !deptMatch) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) {
        return false;
      }

      // 3. Life Situation filter
      if (selectedSituation) {
        const sit = LIFE_SITUATIONS.find((ls) => ls.id === selectedSituation);
        if (sit) {
          const catMatches = sit.categoryMatch.includes(s.category);
          const occMatches = sit.targetOccupations ? s.eligibility?.occupations?.some((o) => sit.targetOccupations.includes(o)) : false;
          const genderMatches = sit.targetGender ? s.eligibility?.genders?.includes(sit.targetGender) : false;
          if (!catMatches && !occMatches && !genderMatches) return false;
        }
      }

      return true;
    });
  }, [results, searchQuery, selectedCategory, selectedSituation, byId, tx]);

  const main = filteredResults.filter((r) => r.status !== 'not_eligible');
  const notEligible = filteredResults.filter((r) => r.status === 'not_eligible');
  const missing = [...new Set(results.filter((r) => r.status === 'maybe').flatMap((r) => r.missing))];
  const anyDemo = results.some((r) => isDemo(byId[r.schemeId]));

  const download = async (key, list) => {
    setBusy(key);
    setFailed(false);
    try {
      await downloadChecklist({
        items: list.map((r) => ({ scheme: byId[r.schemeId], result: r })),
        profile,
        isSample,
        ctx,
      });
    } catch (e) {
      console.error(e);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const handleSituationChange = (sitId) => {
    if (sitId) {
      setSearchParams({ situation: sitId });
    } else {
      setSearchParams({});
    }
  };

  const facts = [
    t('about.profile.age', { n: profile.age }),
    profile.state,
    `${t('f.domicile')}: ${profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile}`,
    t('occ.' + profile.occupation),
    profile.annualIncome === 'unsure'
      ? `${t('f.income')}: ${t('opt.unsure')}`
      : t('about.profile.income', { n: formatINR(profile.annualIncome) }),
  ];

  return (
    <main id="main" className="wrap page results-page">
      <header className="results-head">
        <div>
          <h1>{t('res.title')}</h1>
          <p className="results-count">{t('res.checked', { n: summary.checked })}</p>
          <ul className="tally">
            <li className="tally-eligible"><strong>{summary.eligible}</strong> {t('status.eligible')}</li>
            <li className="tally-maybe"><strong>{summary.maybe}</strong> {t('status.maybe')}</li>
            {summary.insufficientInfo > 0 && (
              <li className="tally-insufficient"><strong>{summary.insufficientInfo}</strong> {t('status.insufficient_info')}</li>
            )}
            <li className="tally-not"><strong>{summary.notEligible}</strong> {t('status.not_eligible')}</li>
          </ul>
        </div>
        <div className="results-tools">
          <Link to="/profile" className="btn btn-ghost"><IconEdit />{t('btn.edit')}</Link>
          <button
            type="button"
            className="btn btn-solid"
            disabled={busy !== null}
            onClick={() => download('all', results.filter((r) => r.status !== 'not_eligible'))}
          >
            <IconDownload />{busy === 'all' ? t('btn.preparing') : t('btn.downloadAll')}
          </button>
        </div>
      </header>

      {failed && <p className="note note-error" role="alert">{t('common.error')}</p>}
      {anyDemo && <p className="demo-banner" role="note">{t('demo.label')}. {t('demo.results')}</p>}

      {/* Profile summary strip */}
      <section className="profile-strip" aria-label={t('res.profile')}>
        <h2>{t('res.profile')}{isSample && <span className="sample-tag">{t('res.sample')}</span>}</h2>
        <ul>{facts.map((f) => <li key={f}>{f}</li>)}</ul>
        <p>{t('res.domicileNote', { d: profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile, s: profile.state })}</p>
      </section>

      {/* Application Readiness Score Widget */}
      <ReadinessWidget />

      {/* Life Situation Filter */}
      <div className="results-sit-box">
        <LifeSituations
          selectedSituation={selectedSituation}
          onSelectSituation={handleSituationChange}
          compact
        />
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="search-input"
            placeholder="Search by scheme name, benefits, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter schemes"
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="category-chips-bar" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`cat-chip ${selectedCategory === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-chip ${selectedCategory === cat ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Document Checklist Accordion Toggle */}
      <div className="doc-checklist-accordion">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowDocs(!showDocs)}
          aria-expanded={showDocs}
        >
          {showDocs ? '▲ Hide Document Checklist' : '▼ View Document Checklist & Common Papers'}
        </button>
        {showDocs && (
          <div className="docs-accordion-body">
            <DocumentChecklist schemes={main.map((r) => byId[r.schemeId]).filter(Boolean)} />
          </div>
        )}
      </div>

      <details className="rank-explain">
        <summary>{t('res.rank.title')}</summary>
        <p>{t('res.rank.body')}</p>
      </details>

      {/* Main eligible and maybe schemes ledger */}
      <section className="ledger" aria-label={t('res.title')}>
        {main.length === 0 && (
          <div className="no-matches-box">
            <p className="note">{t('res.none')}</p>
            {(searchQuery || selectedCategory !== 'ALL' || selectedSituation) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSearchParams({});
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {main.map((r) => (
          <SchemeRow
            key={r.schemeId}
            scheme={byId[r.schemeId]}
            result={r}
            busy={busy === r.schemeId}
            onDownload={() => download(r.schemeId, [r])}
          />
        ))}
      </section>

      {/* Missing Information Panel */}
      {missing.length > 0 && (
        <section className="missing-panel">
          <h2>{t('res.missing.title')}</h2>
          <ul>{missing.map((m) => <li key={m}>{t('miss.' + m) || m}</li>)}</ul>
          <Link to="/profile" className="btn btn-solid">{t('res.missing.cta')}</Link>
        </section>
      )}

      {/* Not Eligible Schemes Disclosure */}
      {notEligible.length > 0 && (
        <details className="not-eligible">
          <summary>{t('res.notEligible', { n: notEligible.length })}</summary>
          <div className="ledger">
            {notEligible.map((r) => (
              <SchemeRow
                key={r.schemeId}
                scheme={byId[r.schemeId]}
                result={r}
                busy={busy === r.schemeId}
                onDownload={() => download(r.schemeId, [r])}
              />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
