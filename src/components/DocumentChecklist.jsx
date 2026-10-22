// Smart Document Checklist (Phase 5.B)
// Tracks collected vs pending documents across matched schemes, highlights shared documents,
// and downloads personalized PDF checklist.
import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { downloadDocumentChecklistPDF } from '../services/pdf.js';
import { IconDownload } from './Icons.jsx';

export default function DocumentChecklist({ schemes = [] }) {
  const ctx = useI18n();
  const { t, tx } = ctx;
  const { analysis, collectedDocs, toggleDocumentCollected, isDocumentCollected } = useProfile();
  const [downloading, setDownloading] = useState(false);

  // Collect all unique documents and compute scheme count for each
  const docFrequency = {};
  for (const s of schemes) {
    for (const d of (s.documents || [])) {
      docFrequency[d] = (docFrequency[d] || 0) + 1;
    }
  }

  const allDocKeys = Object.keys(docFrequency);
  if (allDocKeys.length === 0) return null;

  const collected = allDocKeys.filter(isDocumentCollected);
  const pending = allDocKeys.filter((d) => !isDocumentCollected(d));

  // Shared documents needed by 2 or more schemes
  const sharedDocs = {};
  for (const [d, count] of Object.entries(docFrequency)) {
    if (count >= 2) sharedDocs[d] = count;
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocumentChecklistPDF({
        schemes,
        profile: analysis?.profile,
        collectedDocs: collected,
        pendingDocs: pending,
        sharedDocs,
        ctx,
      });
    } catch (err) {
      console.error('Failed to generate document checklist PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="smart-docs-card" aria-label={t('docs.title')}>
      <div className="smart-docs-head">
        <div>
          <h3 className="smart-docs-title">{t('docs.title')}</h3>
          <p className="smart-docs-sub">
            {collected.length} of {allDocKeys.length} documents ready across {schemes.length} schemes
          </p>
        </div>
        <button
          type="button"
          className="btn btn-solid btn-sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          <IconDownload />
          <span>{downloading ? t('btn.preparing') : t('docs.downloadPdf')}</span>
        </button>
      </div>

      {/* Shared Documents Highlight */}
      {Object.keys(sharedDocs).length > 0 && (
        <div className="shared-docs-banner">
          <div className="shared-docs-title">
            <span className="shared-star">★</span>
            <strong>{t('docs.shared')}:</strong>
          </div>
          <div className="shared-chips">
            {Object.entries(sharedDocs).map(([d, count]) => (
              <span key={d} className="shared-chip">
                {tx(d)} <span className="shared-count">({count} schemes)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Collected vs Pending */}
      <div className="docs-columns-grid">
        {/* Pending column */}
        <div className="docs-col pending-col">
          <h4 className="col-heading pending-heading">
            {t('docs.pending', { n: pending.length })}
          </h4>
          {pending.length === 0 ? (
            <p className="col-empty success-text">✓ All required papers collected!</p>
          ) : (
            <ul className="doc-items-list">
              {pending.map((d) => (
                <li key={d} className="doc-item is-pending">
                  <label className="doc-item-label">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleDocumentCollected(d)}
                      aria-label={`${t('docs.markCollected')} ${tx(d)}`}
                    />
                    <span className="doc-name">{tx(d)}</span>
                  </label>
                  {docFrequency[d] > 1 && (
                    <span className="doc-freq-pill">{docFrequency[d]} schemes</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Collected column */}
        <div className="docs-col collected-col">
          <h4 className="col-heading collected-heading">
            {t('docs.collected', { n: collected.length })}
          </h4>
          {collected.length === 0 ? (
            <p className="col-empty">Check off documents as you gather them.</p>
          ) : (
            <ul className="doc-items-list">
              {collected.map((d) => (
                <li key={d} className="doc-item is-collected">
                  <label className="doc-item-label">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleDocumentCollected(d)}
                      aria-label={`${t('docs.markPending')} ${tx(d)}`}
                    />
                    <span className="doc-name">{tx(d)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
