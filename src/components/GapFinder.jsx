// Eligibility Gap Finder ("What Am I Missing?", Phase 5.A)
// Identifies missing profile details and allows citizens to provide immediate answers
// which recalculate scheme eligibility in real time.
import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { CHECK } from '../eligibility/index.js';

export default function GapFinder({ result, scheme }) {
  const { t } = useI18n();
  const { quickAnswer } = useProfile();
  const [justAnswered, setJustAnswered] = useState(null);

  if (!result || result.status === 'eligible') {
    return null;
  }

  // Find unknown checks for this scheme
  const unknownChecks = (result.checks || []).filter((c) => c.status === CHECK.UNKNOWN);
  if (unknownChecks.length === 0) {
    return null;
  }

  const handleAnswer = (field, value) => {
    quickAnswer(field, value);
    setJustAnswered(field);
    setTimeout(() => setJustAnswered(null), 2500);
  };

  return (
    <div className="gap-finder-card" role="region" aria-label={t('gap.title')}>
      <div className="gap-header">
        <span className="gap-badge" aria-hidden="true">?</span>
        <div>
          <h3 className="gap-title">{t('gap.title')}</h3>
          <p className="gap-desc">{t('gap.desc')}</p>
        </div>
      </div>

      {justAnswered && (
        <div className="gap-toast" role="status">
          ✓ {t('gap.updated')}
        </div>
      )}

      <div className="gap-questions-list">
        {unknownChecks.map((c) => {
          const field = c.field;
          return (
            <div key={field} className="gap-item">
              <span className="gap-field-name">{t('miss.' + field) || field}:</span>

              {/* Yes / No fields */}
              {['ownsLand', 'isStudent', 'hasDisabilityCertificate', 'domicileCertificate'].includes(field) && (
                <div className="gap-btn-group">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAnswer(field, 'yes')}
                  >
                    ✓ {t('opt.yes')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAnswer(field, 'no')}
                  >
                    ✕ {t('opt.no')}
                  </button>
                </div>
              )}

              {/* Income field */}
              {field === 'annualIncome' && (
                <div className="gap-income-group">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      const max = c.params?.max;
                      const suggested = max ? max - 10000 : 100000;
                      handleAnswer('annualIncome', String(suggested));
                    }}
                  >
                    ≤ ₹{c.params?.max ? (c.params.max).toLocaleString('en-IN') : 'Limit'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      const max = c.params?.max || 200000;
                      handleAnswer('annualIncome', String(max + 50000));
                    }}
                  >
                    &gt; ₹{c.params?.max ? (c.params.max).toLocaleString('en-IN') : 'Limit'}
                  </button>
                </div>
              )}

              {/* Domicile field */}
              {field === 'domicile' && (
                <div className="gap-btn-group">
                  {(c.params?.list || []).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleAnswer('domicile', st)}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAnswer('domicile', 'Other')}
                  >
                    {t('opt.no')} / Other
                  </button>
                </div>
              )}

              {/* Gender field */}
              {field === 'gender' && (
                <div className="gap-btn-group">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAnswer('gender', 'female')}
                  >
                    {t('gender.female')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAnswer('gender', 'male')}
                  >
                    {t('gender.male')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
