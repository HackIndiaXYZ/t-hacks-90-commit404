// Pieces used on both the results list and the detail page.
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { describeCheck, headlineReason } from '../utils/describe.js';
import { isDemo } from '../data/index.js';
import { DemoTag, StatusBadge, VerifiedBadge } from './Chrome.jsx';
import { IconDownload, IconBack, Seal } from './Icons.jsx';
import GapFinder from './GapFinder.jsx';

const MARK = { pass: 'check', unknown: 'maybe', fail: 'cross' };

// "Why this result": every check with a tick, question mark or cross.
export function CheckList({ checks }) {
  const ctx = useI18n();
  return (
    <ul className="checks">
      {checks.map((c, i) => (
        <li key={i} className={`check check-${c.status}`}>
          <Seal kind={MARK[c.status]} size={22} />
          <span>{describeCheck(c, ctx)}</span>
        </li>
      ))}
    </ul>
  );
}

// One row in the results "ledger". Rows are rows (not identical cards) and the left edge shows status.
export function SchemeRow({ scheme, result, onDownload, busy }) {
  const ctx = useI18n();
  const { t, tx } = ctx;
  const { isSchemeSaved, toggleSaveScheme, comparedSchemes, addToCompare, removeFromCompare } = useProfile();
  const demo = isDemo(scheme);
  const isCompared = comparedSchemes.includes(scheme.id);
  const isSaved = isSchemeSaved(scheme.id);

  return (
    <article className={`row row-${result.status}`} id={`scheme-${scheme.id}`}>
      <div className="row-main">
        <div className="row-top-meta">
          <StatusBadge status={result.status} sample={demo} />
          <VerifiedBadge status={scheme.verificationStatus} publisher={scheme.sourcePublisher} />
        </div>

        <h3 className="row-title">
          <Link to={`/scheme/${scheme.id}`}>{tx(scheme.name)}</Link>
        </h3>
        {scheme.department && <p className="row-dept">{scheme.department}</p>}
        {demo && <DemoTag />}
        <p className="row-desc">{tx(scheme.description)}</p>
        <p className="row-reason">{headlineReason(result, ctx)}</p>
        <p className="row-meta">{t('rank.passed', { p: result.passed, t: result.total })}</p>

        {/* Embedded Gap Finder for maybe schemes */}
        {result.status === 'maybe' && (
          <GapFinder result={result} scheme={scheme} />
        )}
      </div>

      <div className="row-actions">
        <div className="action-buttons-group">
          <Link className="btn btn-solid" to={`/scheme/${scheme.id}`}>{t('btn.view')}</Link>
          <button type="button" className="btn btn-ghost" onClick={onDownload} disabled={busy}>
            <IconDownload />{busy ? t('btn.preparing') : t('btn.download')}
          </button>
        </div>

        <div className="quick-tool-buttons">
          <button
            type="button"
            className={`btn-tool-chip ${isCompared ? 'is-active' : ''}`}
            onClick={() => isCompared ? removeFromCompare(scheme.id) : addToCompare(scheme.id)}
            title="Add to side-by-side comparison"
          >
            {isCompared ? '✓ Compared' : '+ Compare'}
          </button>
          <button
            type="button"
            className={`btn-tool-chip star-chip ${isSaved ? 'is-active' : ''}`}
            onClick={() => toggleSaveScheme(scheme.id)}
            aria-label={isSaved ? t('dash.unsaveScheme') : t('dash.saveScheme')}
            title={isSaved ? t('dash.unsaveScheme') : t('dash.saveScheme')}
          >
            {isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function BackLink({ to, children }) {
  return <Link to={to} className="back-link"><IconBack />{children}</Link>;
}
