// The hero picture: a single thread that runs from a person, through matched schemes,
// to a checklist. It draws itself once on load (see .thread in components.css).
import { useI18n } from '../i18n/index.jsx';
import { starPoints } from './Icons.jsx';

export default function HeroArt() {
  const { t } = useI18n();
  return (
    <svg className="hero-art" viewBox="0 0 520 600" role="img" aria-label={`${t('hero.art.profile')}, ${t('hero.art.match')}, ${t('hero.art.list')}`}>
      {/* the thread */}
      <path className="thread" pathLength="1"
        d="M90 190 C90 250 200 220 200 290 C200 350 330 330 330 400 C330 440 400 430 400 482" />

      {/* 1. person */}
      <g className="node n1">
        <circle cx="90" cy="120" r="24" fill="var(--ivory)" />
        <path d="M46 196c0-30 20-46 44-46s44 16 44 46z" fill="var(--ivory)" />
        <polygon points={starPoints(90, 120, 14, 9)} fill="none" stroke="var(--forest)" strokeWidth="2" />
      </g>
      <text className="art-label" x="146" y="128">{t('hero.art.profile')}</text>

      {/* 2. matched schemes: a confirmed seal and a "maybe" seal */}
      <g className="node n2">
        <polygon points={starPoints(200, 290, 34, 26)} fill="var(--turmeric)" />
        <path d="M185 291l11 11 20-22" fill="none" stroke="var(--forest)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text className="art-label" x="248" y="270">{t('hero.art.match')}</text>
      <g className="node n3">
        <polygon points={starPoints(330, 400, 28, 21)} fill="none" stroke="var(--turmeric)" strokeWidth="3" />
        <path d="M321 392c1-8 8-11 14-8 6 3 6 11 0 14-3 2-5 4-5 8" fill="none" stroke="var(--ivory)" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="330" cy="415" r="2.4" fill="var(--ivory)" />
      </g>

      {/* 3. checklist sheet */}
      <g className="node n4">
        <rect x="364" y="470" width="72" height="92" rx="6" fill="var(--ivory)" />
        <path d="M378 492h44M378 508h44M378 524h26" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" />
        <path d="M410 534l6 6 12-14" fill="none" stroke="var(--terracotta)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text className="art-label" x="400" y="590" textAnchor="middle">{t('hero.art.list')}</text>
    </svg>
  );
}
