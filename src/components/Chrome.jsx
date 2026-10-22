// Page chrome: Header (nav + language switcher), Footer, StatusBadge, VerifiedBadge, and OfflineBanner.
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LANGS, useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { IconClose, IconMenu, Logo, Seal } from './Icons.jsx';

export function OfflineBanner() {
  const { t } = useI18n();
  const { isOffline, lastSyncDate } = useProfile();
  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <div className="wrap offline-banner-content">
        <span className="offline-dot" aria-hidden="true"></span>
        <strong>{t('offline.banner')}:</strong>
        <span>{t('offline.cached')}</span>
        {lastSyncDate && <small>({t('offline.synced', { date: lastSyncDate })})</small>}
      </div>
    </div>
  );
}

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { comparedSchemes } = useProfile();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <OfflineBanner />
      <header className="site-header">
        <a className="skip" href="#main">{t('skip')}</a>
        <div className="wrap header-row">
          <Link to="/" className="brand" onClick={close}>
            <Logo />
            <span>SchemeSaathi</span>
          </Link>
          <button
            className="menu-btn"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen(!open)}
            aria-label={t('nav.menu')}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
          <div id="site-nav" className={'nav-panel' + (open ? ' is-open' : '')}>
            <nav aria-label="Main">
              <NavLink to="/" end onClick={close}>{t('nav.home')}</NavLink>
              <NavLink to="/profile" onClick={close}>{t('nav.find')}</NavLink>
              <NavLink to="/results" onClick={close}>{t('nav.results')}</NavLink>
              <NavLink to="/dashboard" onClick={close}>{t('nav.dashboard')}</NavLink>
              <NavLink to="/compare" onClick={close}>
                {t('nav.compare')}
                {comparedSchemes.length > 0 && <span className="nav-badge">{comparedSchemes.length}</span>}
              </NavLink>
              <NavLink to="/assistant" onClick={close}>{t('nav.assistant')}</NavLink>
            </nav>
            <div className="lang" role="group" aria-label={t('lang.label')}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={lang === l.code}
                  className={lang === l.code ? 'is-on' : ''}
                  onClick={() => { setLang(l.code); close(); }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>{t('footer.disclaimer')}</p>
      </div>
    </footer>
  );
}

// Visible on fictional demo schemes.
export function DemoTag({ compact = false }) {
  const { t } = useI18n();
  return (
    <span className={'demo-tag' + (compact ? ' is-compact' : '')} role="note">
      {compact ? t('demo.short') : t('demo.label')}
    </span>
  );
}

export function VerifiedBadge({ status = 'verified', publisher = 'Official Portal' }) {
  const { t } = useI18n();
  if (status === 'demo') {
    return <DemoTag compact />;
  }

  const isVerified = status === 'verified';
  return (
    <span
      className={`verified-badge ${isVerified ? 'is-verified' : 'is-unverified'}`}
      title={isVerified ? `Verified against ${publisher}` : 'Awaiting official verification'}
    >
      <span className="badge-icon">{isVerified ? '✓' : 'ℹ'}</span>
      <span>{t('det.verif.' + status)}</span>
    </span>
  );
}

const SEAL = {
  eligible: 'check',
  maybe: 'maybe',
  insufficient_info: 'maybe',
  not_eligible: 'cross',
};

export function StatusBadge({ status, sample }) {
  const { t } = useI18n();
  const safeStatus = SEAL[status] ? status : 'maybe';
  return (
    <span className={`status status-${safeStatus}`}>
      <Seal kind={SEAL[safeStatus]} size={22} />
      <span>{t('status.' + safeStatus)}{sample && <small> ({t('status.sample')})</small>}</span>
    </span>
  );
}
