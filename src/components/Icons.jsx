// Small hand-drawn style icons. All use currentColor so CSS controls the colour.
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };

// Eight-pointed star outline used as the "seal" behind status marks and as a motif.
export function starPoints(cx, cy, R, r, n = 8) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export function Seal({ kind, size = 24 }) {
  const glyph = {
    check: <path d="M8.2 12.4l2.7 2.6 5-5.6" />,
    maybe: <><path d="M9.8 9.6c.2-1.3 1.2-2 2.3-2 1.3 0 2.2.8 2.2 1.9 0 1.7-2.2 1.7-2.2 3.4" /><circle cx="12.1" cy="16.4" r=".5" fill="currentColor" /></>,
    cross: <path d="M9 9l6 6M15 9l-6 6" />,
  }[kind];
  return (
    <svg {...base} width={size} height={size} strokeWidth={1.5}>
      <polygon points={starPoints(12, 12, 11, 8.6)} />
      {glyph}
    </svg>
  );
}

export const IconDoc = (p) => (<svg {...base} {...p}><path d="M7 3.5h7l4 4V20a.5.5 0 01-.5.5h-10A.5.5 0 017 20z" /><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5" /></svg>);
export const IconLink = (p) => (<svg {...base} {...p}><path d="M10 14a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1M14 10a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1" /></svg>);
export const IconDownload = (p) => (<svg {...base} {...p}><path d="M12 4v10M7.5 10.5L12 15l4.5-4.5M5 19.5h14" /></svg>);
export const IconEdit = (p) => (<svg {...base} {...p}><path d="M5 19l1-4 9.5-9.5a1.8 1.8 0 012.5 2.5L8.5 17.5z" /><path d="M14 7l3 3" /></svg>);
export const IconMenu = (p) => (<svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>);
export const IconClose = (p) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconBack = (p) => (<svg {...base} {...p} className="flip-rtl"><path d="M14 6l-6 6 6 6" /></svg>);

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--forest)" />
      <polygon points={starPoints(32, 32, 24, 17)} fill="none" stroke="var(--turmeric)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M21 35c6-13 15 1 22-9" fill="none" stroke="var(--ivory)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
