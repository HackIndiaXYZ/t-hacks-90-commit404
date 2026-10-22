// Scheme Comparison Page (Phase 5.C)
// Allows side-by-side comparison of up to 3 government schemes.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { SCHEMES, getScheme } from '../data/index.js';
import { VerifiedBadge } from '../components/Chrome.jsx';
import { IconLink } from '../components/Icons.jsx';

export default function Compare() {
  const { t, tx, lang } = useI18n();
  const { comparedSchemes, addToCompare, removeFromCompare, clearCompare } = useProfile();
  const [selectedToAdd, setSelectedToAdd] = useState('');

  const schemes = comparedSchemes.map((id) => getScheme(id)).filter(Boolean);

  const handleAdd = (e) => {
    e.preventDefault();
    if (selectedToAdd) {
      addToCompare(selectedToAdd);
      setSelectedToAdd('');
    }
  };

  const formatAge = (age) => {
    if (!age || (age.min == null && age.max == null)) return t('comp.notSpecified');
    if (age.min != null && age.max != null) return `${age.min} - ${age.max} years`;
    if (age.min != null) return `${age.min}+ years`;
    return `Up to ${age.max} years`;
  };

  const formatIncome = (income) => {
    if (!income || income.max == null) return t('comp.notSpecified');
    return `Up to ₹${(income.max).toLocaleString('en-IN')} / year`;
  };

  const formatStates = (scheme) => {
    if (scheme.applicableStates?.includes('ALL')) return t('det.allStates');
    return scheme.applicableStates?.join(', ') || t('comp.notSpecified');
  };

  const formatDomicile = (e) => {
    if (!e.domicile || !e.domicile.states?.length) return t('det.noDomicile');
    const cert = e.domicile.certificateRequired ? ` (${t('det.certNeeded')})` : '';
    return `${e.domicile.states.join(', ')}${cert}`;
  };

  return (
    <main id="main" className="wrap page compare-page">
      <div className="page-header-row">
        <div>
          <h1>{t('comp.title')}</h1>
          <p className="lede-sm">{t('comp.subtitle')}</p>
        </div>
        {comparedSchemes.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearCompare}>
            {t('comp.clear')}
          </button>
        )}
      </div>

      {/* Add Scheme Dropdown if less than 3 */}
      {comparedSchemes.length < 3 && (
        <form className="compare-add-bar" onSubmit={handleAdd}>
          <label htmlFor="compare-select" className="sr-only">{t('comp.select')}</label>
          <select
            id="compare-select"
            className="input-select"
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
          >
            <option value="">-- {t('comp.select')} --</option>
            {SCHEMES.filter((s) => !comparedSchemes.includes(s.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {tx(s.name)} ({s.level === 'central' ? 'Central' : s.governingState || 'State'})
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-solid" disabled={!selectedToAdd}>
            + {t('comp.add')}
          </button>
        </form>
      )}

      {schemes.length === 0 ? (
        <div className="compare-empty-state">
          <p className="empty-icon">⚖</p>
          <h2>{t('comp.empty')}</h2>
          <p>Choose schemes from the dropdown above or click "Compare" on any scheme card.</p>
          <Link to="/results" className="btn btn-primary">{t('nav.results')}</Link>
        </div>
      ) : (
        <div className="compare-table-wrapper">
          <table className="compare-matrix" role="grid" aria-label={t('comp.title')}>
            <thead>
              <tr>
                <th className="matrix-param-col">Attribute</th>
                {schemes.map((s) => (
                  <th key={s.id} className="matrix-scheme-col">
                    <div className="matrix-col-head">
                      <h3>{tx(s.name)}</h3>
                      <p className="scheme-dept">{s.department}</p>
                      <div className="head-tags">
                        <VerifiedBadge status={s.verificationStatus} publisher={s.sourcePublisher} />
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeFromCompare(s.id)}
                          aria-label={`${t('comp.remove')} ${tx(s.name)}`}
                        >
                          ✕ {t('comp.remove')}
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="matrix-label">{t('comp.benefits')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    <p className="cell-highlight">{tx(s.benefits) || tx(s.description)}</p>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('comp.age')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    {formatAge(s.eligibility?.age)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('comp.income')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    {formatIncome(s.eligibility?.income)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('comp.states')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    {formatStates(s)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('det.domicileReq')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    {formatDomicile(s.eligibility)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('comp.docs')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    <ul className="cell-list">
                      {(s.documents || []).map((d) => (
                        <li key={d}>{tx(d)}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('comp.steps')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    <ol className="cell-ol">
                      {(s.steps || []).map((step) => (
                        <li key={step}>{tx(step)}</li>
                      ))}
                    </ol>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('det.apply')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    {s.applicationUrl ? (
                      <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                        <IconLink />
                        <span>Visit Official Portal</span>
                      </a>
                    ) : (
                      <span className="not-specified">{t('comp.notSpecified')}</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="matrix-label">{t('det.verified')}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="matrix-cell">
                    <small>{s.lastVerified || 'October 2026'}</small>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
