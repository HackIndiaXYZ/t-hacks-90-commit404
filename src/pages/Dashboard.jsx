// Personalized Citizen Dashboard (Phase 5.H)
// Displays recommended schemes, potentially matching schemes, missing answers,
// document preparation, saved schemes, recently viewed schemes, and source verification status.
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { SCHEMES, getScheme } from '../data/index.js';
import ReadinessWidget from '../components/ReadinessWidget.jsx';
import DocumentChecklist from '../components/DocumentChecklist.jsx';
import { SchemeRow } from '../components/SchemeParts.jsx';
import { VerifiedBadge } from '../components/Chrome.jsx';

export default function Dashboard() {
  const { t, tx } = useI18n();
  const {
    analysis,
    savedSchemes,
    recentSchemes,
    toggleSaveScheme,
    isSchemeSaved,
    comparedSchemes,
    addToCompare,
  } = useProfile();

  const byId = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));

  const results = analysis?.results || [];
  const eligibleSchemes = results.filter((r) => r.status === 'eligible');
  const maybeSchemes = results.filter((r) => r.status === 'maybe');

  // Schemes to show for Document Checklist
  const activeSchemes = (eligibleSchemes.length > 0 ? eligibleSchemes : maybeSchemes)
    .map((r) => byId[r.schemeId])
    .filter(Boolean);

  const savedList = savedSchemes.map((id) => getScheme(id)).filter(Boolean);
  const recentList = recentSchemes.map((id) => getScheme(id)).filter(Boolean);

  return (
    <main id="main" className="wrap page dashboard-page">
      <div className="dash-header">
        <div>
          <h1>{t('dash.title')}</h1>
          <p className="lede-sm">{t('dash.subtitle')}</p>
        </div>
        <div className="dash-quick-links">
          <Link to="/results" className="btn btn-primary btn-sm">{t('nav.results')}</Link>
          <Link to="/compare" className="btn btn-ghost btn-sm">
            {t('nav.compare')} ({comparedSchemes.length})
          </Link>
          <Link to="/profile" className="btn btn-ghost btn-sm">{t('btn.edit')}</Link>
        </div>
      </div>

      {/* Top Section: Application Readiness Score */}
      <div className="dash-section">
        <ReadinessWidget />
      </div>

      {/* Grid: Recommended & Potentially Matching */}
      <div className="dash-grid-two">
        {/* Recommended Schemes */}
        <section className="dash-card">
          <div className="card-header-bar">
            <h2>{t('dash.recommended')} ({eligibleSchemes.length})</h2>
            <Link to="/results" className="link-more">View all →</Link>
          </div>
          {eligibleSchemes.length === 0 ? (
            <div className="dash-empty-block">
              <p>No guaranteed eligible schemes yet.</p>
              <Link to="/profile" className="btn btn-ghost btn-sm">{t('btn.find')}</Link>
            </div>
          ) : (
            <div className="dash-schemes-list">
              {eligibleSchemes.slice(0, 4).map((r) => {
                const s = byId[r.schemeId];
                if (!s) return null;
                return (
                  <div key={s.id} className="dash-scheme-item">
                    <div className="item-details">
                      <Link to={`/scheme/${s.id}`} className="item-title">{tx(s.name)}</Link>
                      <p className="item-dept">{s.department}</p>
                      <p className="item-benefit">{tx(s.benefits)}</p>
                    </div>
                    <div className="item-actions">
                      <VerifiedBadge status={s.verificationStatus} publisher={s.sourcePublisher} />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => toggleSaveScheme(s.id)}
                        aria-label={isSchemeSaved(s.id) ? t('dash.unsaveScheme') : t('dash.saveScheme')}
                        title={isSchemeSaved(s.id) ? t('dash.unsaveScheme') : t('dash.saveScheme')}
                      >
                        {isSchemeSaved(s.id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Potentially Matching (Maybe) */}
        <section className="dash-card">
          <div className="card-header-bar">
            <h2>{t('dash.maybeMatches')} ({maybeSchemes.length})</h2>
            <Link to="/results" className="link-more">View all →</Link>
          </div>
          {maybeSchemes.length === 0 ? (
            <div className="dash-empty-block">
              <p>No pending or partial matches.</p>
            </div>
          ) : (
            <div className="dash-schemes-list">
              {maybeSchemes.slice(0, 4).map((r) => {
                const s = byId[r.schemeId];
                if (!s) return null;
                return (
                  <div key={s.id} className="dash-scheme-item is-maybe">
                    <div className="item-details">
                      <Link to={`/scheme/${s.id}`} className="item-title">{tx(s.name)}</Link>
                      <p className="item-dept">{s.department}</p>
                      <div className="item-missing-tags">
                        <span>Missing:</span>
                        {r.missing.map((m) => (
                          <span key={m} className="missing-tag">{t('miss.' + m) || m}</span>
                        ))}
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => addToCompare(s.id)}
                      >
                        Compare
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => toggleSaveScheme(s.id)}
                        aria-label={isSchemeSaved(s.id) ? t('dash.unsaveScheme') : t('dash.saveScheme')}
                      >
                        {isSchemeSaved(s.id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Smart Document Checklist Section */}
      {activeSchemes.length > 0 && (
        <div className="dash-section">
          <DocumentChecklist schemes={activeSchemes} />
        </div>
      )}

      {/* Grid: Saved Schemes & Recently Viewed */}
      <div className="dash-grid-two">
        {/* Saved Schemes */}
        <section className="dash-card">
          <div className="card-header-bar">
            <h2>{t('dash.saved')} ({savedList.length})</h2>
          </div>
          {savedList.length === 0 ? (
            <div className="dash-empty-block">
              <p>{t('dash.noSaved')}</p>
            </div>
          ) : (
            <div className="dash-schemes-list">
              {savedList.map((s) => (
                <div key={s.id} className="dash-scheme-item">
                  <div className="item-details">
                    <Link to={`/scheme/${s.id}`} className="item-title">{tx(s.name)}</Link>
                    <p className="item-dept">{s.department}</p>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => toggleSaveScheme(s.id)}
                      aria-label={t('dash.unsaveScheme')}
                      title={t('dash.unsaveScheme')}
                    >
                      ★
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recently Viewed */}
        <section className="dash-card">
          <div className="card-header-bar">
            <h2>{t('dash.recent')} ({recentList.length})</h2>
          </div>
          {recentList.length === 0 ? (
            <div className="dash-empty-block">
              <p>Explore schemes to see your browsing history here.</p>
              <Link to="/results" className="btn btn-ghost btn-sm">{t('nav.results')}</Link>
            </div>
          ) : (
            <div className="dash-schemes-list">
              {recentList.map((s) => (
                <div key={s.id} className="dash-scheme-item">
                  <div className="item-details">
                    <Link to={`/scheme/${s.id}`} className="item-title">{tx(s.name)}</Link>
                    <p className="item-dept">{s.department}</p>
                  </div>
                  <div className="item-actions">
                    <VerifiedBadge status={s.verificationStatus} publisher={s.sourcePublisher} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
