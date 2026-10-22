import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import HeroArt from '../components/HeroArt.jsx';
import LifeSituations from '../components/LifeSituations.jsx';
import { SCHEMES } from '../data/index.js';

export default function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [selectedSit, setSelectedSit] = useState(null);

  const principles = [
    ['home.how.ai', 'home.how.ai.body'],
    ['home.how.rules', 'home.how.rules.body'],
    ['home.how.source', 'home.how.source.body'],
  ];

  const handleSelectSituation = (sitId) => {
    setSelectedSit(sitId);
    if (sitId) {
      navigate(`/results?situation=${sitId}`);
    }
  };

  return (
    <main id="main">
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-text">
            <h1>{t('hero.title')}</h1>
            <p className="lede">{t('hero.body')}</p>
            <div className="cta-row">
              <Link to="/profile" className="btn btn-primary btn-lg">{t('hero.cta')}</Link>
              <Link to="/results" className="btn btn-solid btn-lg">Browse {SCHEMES.length} Verified Schemes</Link>
              <a href="#how" className="btn btn-link">{t('hero.cta2')}</a>
            </div>
          </div>
          <div className="hero-panel"><HeroArt /></div>
        </div>
      </section>

      {/* Life Situation Exploration Section (Phase 5.E) */}
      <section className="wrap section">
        <LifeSituations
          selectedSituation={selectedSit}
          onSelectSituation={handleSelectSituation}
        />
      </section>

      {/* Trust & Verification Badges Bar */}
      <section className="trust-strip">
        <div className="wrap trust-grid">
          <div className="trust-item">
            <span className="trust-icon">✓</span>
            <div>
              <strong>26 Verified Central & State Schemes</strong>
              <p>Researched directly from official ministry and state portals.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⚖</span>
            <div>
              <strong>Deterministic Eligibility Engine</strong>
              <p>Clear pass, maybe, and missing rule breakdown with no AI guesswork.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">📄</span>
            <div>
              <strong>Smart Document Checklist & PDF</strong>
              <p>Identify common shared papers and download personalized checklists.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section wrap">
        <h2 className="section-title">{t('home.how.title')}</h2>
        <div className="principles">
          {principles.map(([head, body]) => (
            <div className="principle" key={head}>
              <h3>{t(head)}</h3>
              <p>{t(body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section-tight">
        <aside className="demo-note is-verified-note">
          <h2>{t('home.demo.title')}</h2>
          <p>{t('home.demo.body')}</p>
        </aside>
      </section>
    </main>
  );
}
