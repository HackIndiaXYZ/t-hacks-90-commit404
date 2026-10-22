// Life Situation selector (Phase 5.E)
// Helps citizens prioritize relevant government initiatives based on their situation.
import { LIFE_SITUATIONS } from '../data/index.js';
import { useI18n } from '../i18n/index.jsx';

export default function LifeSituations({ selectedSituation, onSelectSituation, compact = false }) {
  const { t } = useI18n();

  return (
    <section className={`life-situations-sec ${compact ? 'is-compact' : ''}`} aria-label={t('sit.title')}>
      {!compact && (
        <div className="section-head">
          <h2 className="section-title">{t('sit.title')}</h2>
          <p className="section-desc">{t('sit.desc')}</p>
        </div>
      )}
      <div className="situations-grid" role="group" aria-label={t('sit.title')}>
        <button
          type="button"
          className={`sit-chip ${!selectedSituation ? 'is-active' : ''}`}
          onClick={() => onSelectSituation(null)}
          aria-pressed={!selectedSituation}
        >
          <span className="sit-icon">✦</span>
          <span className="sit-label">{t('sit.all')}</span>
        </button>
        {LIFE_SITUATIONS.map((sit) => {
          const isActive = selectedSituation === sit.id;
          return (
            <button
              key={sit.id}
              type="button"
              className={`sit-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectSituation(isActive ? null : sit.id)}
              aria-pressed={isActive}
            >
              <span className="sit-icon" aria-hidden="true">
                {sit.id === 'student' && '🎓'}
                {sit.id === 'farmer' && '🌾'}
                {sit.id === 'jobseeker' && '💼'}
                {sit.id === 'senior' && '👴'}
                {sit.id === 'low_income' && '🏠'}
                {sit.id === 'woman' && '👩'}
                {sit.id === 'business' && '🏪'}
                {sit.id === 'disability' && '♿'}
              </span>
              <span className="sit-label">{t(sit.key)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
