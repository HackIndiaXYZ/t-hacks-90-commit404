import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { getScheme, isDemo } from '../data/index.js';
import { downloadChecklist } from '../services/pdf.js';
import { BackLink, CheckList } from '../components/SchemeParts.jsx';
import { DemoTag, StatusBadge, VerifiedBadge } from '../components/Chrome.jsx';
import { IconDownload, IconLink } from '../components/Icons.jsx';
import GapFinder from '../components/GapFinder.jsx';

export default function SchemeDetail() {
  const { id } = useParams();
  const ctx = useI18n();
  const { t, tx } = ctx;
  const {
    analysis,
    isSample,
    recordSchemeView,
    isSchemeSaved,
    toggleSaveScheme,
    comparedSchemes,
    addToCompare,
    removeFromCompare,
    isDocumentCollected,
    toggleDocumentCollected,
  } = useProfile();

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (id) recordSchemeView(id);
  }, [id, recordSchemeView]);

  const scheme = getScheme(id);
  if (!scheme) {
    return (
      <main id="main" className="wrap page">
        <p>{t('det.notFound')}</p>
        <BackLink to="/results">{t('btn.back')}</BackLink>
      </main>
    );
  }

  const result = analysis?.results.find((r) => r.schemeId === id) || null;
  const demo = isDemo(scheme);
  const isCompared = comparedSchemes.includes(scheme.id);
  const isSaved = isSchemeSaved(scheme.id);

  const e = scheme.eligibility || {};
  const states = scheme.applicableStates.includes('ALL') ? t('det.allStates') : scheme.applicableStates.join(', ');
  const domicile = e.domicile?.states?.length
    ? t('det.domicileReqText', { list: e.domicile.states.join(', ') }) + (e.domicile.certificateRequired ? ` (${t('det.certNeeded')})` : '')
    : t('det.noDomicile');
  const verif = t('det.verif.' + scheme.verificationStatus);

  const download = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await downloadChecklist({ items: [{ scheme, result }], profile: analysis?.profile, isSample, ctx });
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="wrap page detail">
      <div className="detail-top-nav">
        <BackLink to="/results">{t('btn.back')}</BackLink>
        <div className="detail-top-actions">
          <button
            type="button"
            className={`btn btn-sm btn-ghost ${isCompared ? 'is-active' : ''}`}
            onClick={() => isCompared ? removeFromCompare(scheme.id) : addToCompare(scheme.id)}
          >
            {isCompared ? '✓ In Compare' : '+ Compare'}
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-ghost ${isSaved ? 'is-active' : ''}`}
            onClick={() => toggleSaveScheme(scheme.id)}
          >
            {isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>
      </div>

      <header className="detail-head">
        <div className="detail-badges-row">
          {result && <StatusBadge status={result.status} sample={demo} />}
          <VerifiedBadge status={scheme.verificationStatus} publisher={scheme.sourcePublisher} />
        </div>
        <h1>{tx(scheme.name)}</h1>
        {scheme.department && <p className="detail-department">{scheme.department}</p>}
        {demo && <DemoTag />}
        <p className="lede-sm">{tx(scheme.description)}</p>

        {/* Benefits Highlight Box */}
        {scheme.benefits && (
          <div className="detail-benefits-banner">
            <strong>{t('comp.benefits')}:</strong> {tx(scheme.benefits)}
          </div>
        )}

        <div className="detail-actions-bar">
          <button type="button" className="btn btn-solid" onClick={download} disabled={busy}>
            <IconDownload />{busy ? t('btn.preparing') : t('btn.download')}
          </button>
          {scheme.applicationUrl && (
            <a className="btn btn-primary" href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
              <IconLink />{t('det.apply')}
            </a>
          )}
        </div>
        {failed && <p className="note note-error" role="alert">{t('common.error')}</p>}
      </header>

      <div className="detail-grid">
        <section className="detail-main">
          {/* Eligibility Gap Finder if maybe */}
          {result && result.status === 'maybe' && (
            <GapFinder result={result} scheme={scheme} />
          )}

          {result ? (
            <>
              <h2>{t('det.why')}</h2>
              <CheckList checks={result.checks} />
              {result.status === 'maybe' && result.missing.length > 0 && (
                <div className="missing-inline">
                  <h3>{t('det.missing')}</h3>
                  <ul>{result.missing.map((m) => <li key={m}>{t('miss.' + m) || m}</li>)}</ul>
                  <Link to="/profile" className="btn btn-ghost">{t('res.missing.cta')}</Link>
                </div>
              )}
            </>
          ) : (
            <p className="note">{t('res.needProfile')} <Link to="/profile">{t('btn.find')}</Link></p>
          )}

          {/* Interactive Document Checklist for this Scheme */}
          <h2>{t('det.docs')}</h2>
          <ul className="docs-interactive-list">
            {(scheme.documents || []).map((d) => {
              const collected = isDocumentCollected(d);
              return (
                <li key={d} className={`doc-check-item ${collected ? 'is-collected' : ''}`}>
                  <label className="doc-check-label">
                    <input
                      type="checkbox"
                      checked={collected}
                      onChange={() => toggleDocumentCollected(d)}
                      aria-label={`${collected ? t('docs.markPending') : t('docs.markCollected')} ${tx(d)}`}
                    />
                    <span className="doc-check-text">{tx(d)}</span>
                  </label>
                  <span className={`doc-status-tag ${collected ? 'tag-ready' : 'tag-needed'}`}>
                    {collected ? '✓ Ready' : '○ Needed'}
                  </span>
                </li>
              );
            })}
          </ul>

          <h2>{t('det.steps')}</h2>
          <ol className="steps">{(scheme.steps || []).map((s) => <li key={s}>{tx(s)}</li>)}</ol>
          {demo && <p className="note">{t('step.demoNote')}</p>}
        </section>

        <aside className="facts">
          <dl>
            <dt>{t('det.level')}</dt>
            <dd>{scheme.level === 'central' ? t('scope.central') : t('scope.state', { s: scheme.governingState })}</dd>
            <dt>{t('det.states')}</dt><dd>{states}</dd>
            <dt>{t('det.domicileReq')}</dt><dd>{domicile}</dd>
            <dt>{t('det.verified')}</dt><dd>{scheme.lastVerified || verif}</dd>
            <dt>Category</dt><dd>{scheme.category ? scheme.category.toUpperCase() : 'General'}</dd>
          </dl>
          <div className="links">
            {scheme.applicationUrl && (
              <a className="btn btn-primary" href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                <IconLink />{t('det.apply')}
              </a>
            )}
            {scheme.sourceUrl && (
              <a className="btn btn-ghost" href={scheme.sourceUrl} target="_blank" rel="noopener noreferrer">
                <IconLink />{t('det.source')}
              </a>
            )}
            {!scheme.applicationUrl && !scheme.sourceUrl && <p className="note">{t('det.noLinks')}</p>}
          </div>
          <p className="fine">{t('det.final')}</p>
        </aside>
      </div>
    </main>
  );
}
