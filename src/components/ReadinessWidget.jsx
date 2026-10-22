// Application Readiness Score Widget (Phase 5.F)
// Visualizes preparation progress (0-100%) with profile, eligibility, and document breakdowns.
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';

export default function ReadinessWidget({ compact = false }) {
  const { t } = useI18n();
  const { readiness } = useProfile();
  const { score = 0, profileScore = 0, eligibilityScore = 0, documentScore = 0, disclaimer } = readiness;

  if (compact) {
    return (
      <div className="readiness-compact" title={disclaimer}>
        <span className="readiness-label">{t('ready.title')}:</span>
        <div className="readiness-mini-bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
          <div className="readiness-mini-fill" style={{ width: `${score}%` }} />
        </div>
        <span className="readiness-value">{score}%</span>
      </div>
    );
  }

  return (
    <section className="readiness-widget-card" aria-label={t('ready.title')}>
      <div className="readiness-card-head">
        <div>
          <h3 className="readiness-card-title">{t('ready.title')}</h3>
          <p className="readiness-card-desc">{t('ready.desc')}</p>
        </div>
        <div className="readiness-badge-large">
          <span className="readiness-number">{score}%</span>
          <span className="readiness-badge-tag">{t('ready.badge', { score })}</span>
        </div>
      </div>

      <div className="readiness-main-progress" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className="readiness-bar-fill" style={{ width: `${score}%` }} />
      </div>

      <div className="readiness-breakdown-grid">
        <div className="breakdown-card">
          <span className="breakdown-title">{t('ready.profile', { pct: profileScore })}</span>
          <div className="breakdown-meter">
            <div className="breakdown-meter-fill profile-fill" style={{ width: `${profileScore}%` }} />
          </div>
        </div>

        <div className="breakdown-card">
          <span className="breakdown-title">{t('ready.docs', { pct: documentScore })}</span>
          <div className="breakdown-meter">
            <div className="breakdown-meter-fill docs-fill" style={{ width: `${documentScore}%` }} />
          </div>
        </div>

        <div className="breakdown-card">
          <span className="breakdown-title">{t('ready.elig', { pct: eligibilityScore })}</span>
          <div className="breakdown-meter">
            <div className="breakdown-meter-fill elig-fill" style={{ width: `${eligibilityScore}%` }} />
          </div>
        </div>
      </div>

      <p className="readiness-disclaimer">
        <small>ℹ {t('ready.disclaimer')}</small>
      </p>
    </section>
  );
}
