// Builds a readable PDF checklist in the user's language (English, Hindi or Urdu).
// We lay the checklist out as normal HTML, let the browser draw it (so Devanagari and
// Urdu shape correctly), then place the pictures on A4 pages with jsPDF.
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { describeCheck } from '../utils/describe.js';
import { formatDate } from '../utils/format.js';
import { isDemo } from '../data/index.js';

const WIDTH = 794; // px, roughly A4 at 96 dpi

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  Object.assign(node, props.prop || {});
  Object.assign(node.style, props.style || {});
  for (const k of kids.flat()) if (k != null) node.append(k instanceof Node ? k : document.createTextNode(k));
  return node;
}

function list(items) {
  return el('ul', { style: { margin: '4px 0 0', paddingInlineStart: '20px' } },
    items.map((i) => el('li', { style: { margin: '3px 0' } }, i)));
}

function block(ctx, scheme, result) {
  const { t, tx } = ctx;
  const demo = isDemo(scheme);
  const wrap = el('section', { style: { padding: '14px 0', borderTop: '2px solid #1E3B2C', pageBreakInside: 'avoid' } });
  wrap.append(el('h2', { style: { font: 'inherit', fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: '#1E3B2C' } }, tx(scheme.name)));
  if (demo) wrap.append(el('div', { style: { fontWeight: '700', color: '#A4461F', margin: '2px 0 6px' } }, t('demo.label')));
  if (result) {
    wrap.append(el('div', { style: { fontWeight: '700', margin: '4px 0' } },
      t('status.' + result.status) + (demo ? ` (${t('status.sample')})` : '')));
    wrap.append(list(result.checks.map((c) => describeCheck(c, ctx))));
  }
  wrap.append(el('h3', { style: { fontSize: '15px', margin: '12px 0 0' } }, t('det.docs')), list(scheme.documents.map(tx)));
  wrap.append(el('h3', { style: { fontSize: '15px', margin: '12px 0 0' } }, t('det.steps')),
    el('ol', { style: { margin: '4px 0 0', paddingInlineStart: '20px' } }, scheme.steps.map((s) => el('li', { style: { margin: '3px 0' } }, tx(s)))));
  if (demo) wrap.append(el('p', { style: { margin: '8px 0 0', fontStyle: 'italic' } }, t('step.demoNote')));
  const links = [];
  if (scheme.sourceUrl) links.push(`${t('det.source')}: ${scheme.sourceUrl}`);
  if (scheme.applicationUrl) links.push(`${t('det.apply')}: ${scheme.applicationUrl}`);
  wrap.append(el('p', { style: { margin: '8px 0 0', wordBreak: 'break-all', whiteSpace: 'pre-line' } },
    links.length ? links.join('\n') : t('det.noLinks')));
  if (scheme.lastVerified) wrap.append(el('p', { style: { margin: '2px 0 0' } }, `${t('det.verified')}: ${scheme.lastVerified}`));
  return wrap;
}

/** items: [{ scheme, result }]  - result may be null if no profile was entered. */
export async function downloadChecklist({ items, profile, isSample, ctx }) {
  const { t, lang, dir } = ctx;
  const body = {
    en: "'Hanken Grotesk', system-ui, sans-serif",
    hi: "'Noto Sans Devanagari', 'Hanken Grotesk', sans-serif",
    ur: "'Noto Naskh Arabic', serif",
  }[lang];

  const root = el('div', { style: {
    position: 'fixed', left: '-10000px', top: '0', width: WIDTH + 'px', padding: '36px 44px', boxSizing: 'border-box',
    background: '#FBF7EC', color: '#1B2620', fontFamily: body, fontSize: '14px', lineHeight: lang === 'en' ? '1.5' : '1.9',
    letterSpacing: '0', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left',
  } });
  root.setAttribute('lang', lang);
  document.body.append(root);

  const head = el('header', { style: { paddingBottom: '10px' } });
  head.append(el('h1', { style: { fontSize: '28px', margin: '0', color: '#1E3B2C' } }, t('pdf.title')));
  head.append(el('p', { style: { margin: '4px 0' } }, t('pdf.prepared', { date: formatDate(new Date(), lang) })));
  if (items.some((i) => isDemo(i.scheme))) head.append(el('p', { style: { margin: '4px 0', fontWeight: '700', color: '#A4461F' } }, t('pdf.illustrative')));
  if (profile) {
    const parts = [`${t('f.age')}: ${profile.age}`, `${t('f.state')}: ${profile.state}`,
      `${t('f.domicile')}: ${profile.domicile === 'unsure' ? t('opt.unsure') : profile.domicile}`,
      `${t('f.occupation')}: ${t('occ.' + profile.occupation)}`];
    head.append(el('p', { style: { margin: '4px 0' } }, `${t('pdf.profile')}${isSample ? ` (${t('res.sample')})` : ''}: ${parts.join(' | ')}`));
  }
  const foot = el('footer', { style: { borderTop: '2px solid #1E3B2C', paddingTop: '12px', fontSize: '12px' } },
    t('det.final'), el('br'), t('footer.disclaimer'));

  const blocks = [head, ...items.map((i) => block(ctx, i.scheme, i.result)), foot];
  blocks.forEach((b) => root.append(b));

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    let y = margin;

    // Draw each block separately so a scheme is never cut in half across two pages.
    for (const b of blocks) {
      const canvas = await html2canvas(b, { scale: 2, backgroundColor: '#FBF7EC', logging: false, scrollX: 0, scrollY: 0 });
      let w = pageW - margin * 2;
      let h = (canvas.height * w) / canvas.width;
      const maxH = pageH - margin * 2;
      if (h > maxH) { w = (w * maxH) / h; h = maxH; } // very long block: shrink to fit one page
      if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, w, h);
      y += h;
    }
    const name = items.length === 1 ? items[0].scheme.id : 'all-schemes';
    pdf.save(`schemesaathi-${name}-${lang}.pdf`);
  } finally {
    root.remove();
  }
}

/**
 * Downloads a dedicated Document Checklist PDF with Collected vs Pending status,
 * shared document callouts, and official links.
 */
export async function downloadDocumentChecklistPDF({ schemes = [], profile, collectedDocs = [], pendingDocs = [], sharedDocs = {}, ctx }) {
  const { t, tx, lang, dir } = ctx;
  const body = {
    en: "'Hanken Grotesk', system-ui, sans-serif",
    hi: "'Noto Sans Devanagari', 'Hanken Grotesk', sans-serif",
    ur: "'Noto Naskh Arabic', serif",
  }[lang];

  const root = el('div', { style: {
    position: 'fixed', left: '-10000px', top: '0', width: WIDTH + 'px', padding: '36px 44px', boxSizing: 'border-box',
    background: '#FBF7EC', color: '#1B2620', fontFamily: body, fontSize: '14px', lineHeight: lang === 'en' ? '1.5' : '1.9',
    letterSpacing: '0', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left',
  } });
  root.setAttribute('lang', lang);
  document.body.append(root);

  const head = el('header', { style: { paddingBottom: '16px', borderBottom: '2px solid #1E3B2C' } });
  head.append(el('h1', { style: { fontSize: '26px', margin: '0', color: '#1E3B2C' } }, t('docs.title')));
  head.append(el('p', { style: { margin: '4px 0', fontSize: '13px' } }, t('pdf.prepared', { date: formatDate(new Date(), lang) })));
  if (profile) {
    const parts = [
      `${t('f.age')}: ${profile.age}`,
      `${t('f.state')}: ${profile.state}`,
      `${t('f.domicile')}: ${profile.domicile}`,
      `${t('f.occupation')}: ${t('occ.' + profile.occupation)}`,
    ];
    head.append(el('p', { style: { margin: '4px 0', fontWeight: '500', color: '#46544B' } }, parts.join(' | ')));
  }

  // Section 1: Common / Shared Documents
  const sharedKeys = Object.keys(sharedDocs);
  const sharedSec = el('section', { style: { padding: '14px 0', borderBottom: '1px solid #DCE3CF' } });
  sharedSec.append(el('h2', { style: { fontSize: '17px', color: '#A4461F', margin: '0 0 6px' } }, t('docs.shared')));
  if (sharedKeys.length > 0) {
    const ul = el('ul', { style: { margin: '4px 0', paddingInlineStart: '20px' } });
    sharedKeys.forEach((k) => {
      const isCollected = collectedDocs.includes(k);
      const li = el('li', { style: { margin: '4px 0' } },
        `${isCollected ? '✓ [Ready] ' : '○ [Pending] '} ${tx(k)} — ${t('docs.sharedDesc', { n: sharedDocs[k] })}`);
      ul.append(li);
    });
    sharedSec.append(ul);
  }

  // Section 2: Collected Documents
  const collectedSec = el('section', { style: { padding: '14px 0', borderBottom: '1px solid #DCE3CF' } });
  collectedSec.append(el('h2', { style: { fontSize: '17px', color: '#1E3B2C', margin: '0 0 6px' } }, `${t('docs.collected', { n: collectedDocs.length })}`));
  if (collectedDocs.length > 0) {
    const ul = el('ul', { style: { margin: '4px 0', paddingInlineStart: '20px' } });
    collectedDocs.forEach((d) => ul.append(el('li', { style: { margin: '4px 0', color: '#1E3B2C', fontWeight: '600' } }, `✓ ${tx(d)}`)));
    collectedSec.append(ul);
  } else {
    collectedSec.append(el('p', { style: { fontStyle: 'italic', margin: '4px 0' } }, 'None marked as collected yet.'));
  }

  // Section 3: Pending Documents
  const pendingSec = el('section', { style: { padding: '14px 0', borderBottom: '1px solid #DCE3CF' } });
  pendingSec.append(el('h2', { style: { fontSize: '17px', color: '#A4461F', margin: '0 0 6px' } }, `${t('docs.pending', { n: pendingDocs.length })}`));
  if (pendingDocs.length > 0) {
    const ul = el('ul', { style: { margin: '4px 0', paddingInlineStart: '20px' } });
    pendingDocs.forEach((d) => ul.append(el('li', { style: { margin: '4px 0', color: '#A4461F' } }, `○ [Pending] ${tx(d)}`)));
    pendingSec.append(ul);
  } else {
    pendingSec.append(el('p', { style: { color: '#1E3B2C', fontWeight: 'bold' } }, 'All required documents have been collected!'));
  }

  // Section 4: Target Schemes
  const schemesSec = el('section', { style: { padding: '14px 0' } });
  schemesSec.append(el('h2', { style: { fontSize: '17px', color: '#1E3B2C', margin: '0 0 6px' } }, `Target Schemes (${schemes.length})`));
  const sUl = el('ul', { style: { margin: '4px 0', paddingInlineStart: '20px' } });
  schemes.forEach((s) => {
    sUl.append(el('li', { style: { margin: '4px 0' } },
      `${tx(s.name)} (${s.level === 'central' ? 'Central' : s.governingState || 'State'}) — Official: ${s.applicationUrl || s.sourceUrl || 'District Office'}`));
  });
  schemesSec.append(sUl);

  const foot = el('footer', { style: { borderTop: '2px solid #1E3B2C', paddingTop: '12px', fontSize: '11px', color: '#46544B' } },
    t('det.final'), el('br'), t('footer.disclaimer'));

  const blocks = [head, sharedSec, collectedSec, pendingSec, schemesSec, foot];
  blocks.forEach((b) => root.append(b));

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    let y = margin;

    for (const b of blocks) {
      const canvas = await html2canvas(b, { scale: 2, backgroundColor: '#FBF7EC', logging: false, scrollX: 0, scrollY: 0 });
      let w = pageW - margin * 2;
      let h = (canvas.height * w) / canvas.width;
      const maxH = pageH - margin * 2;
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }
      if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, w, h);
      y += h;
    }
    pdf.save(`schemesaathi-documents-checklist-${lang}.pdf`);
  } finally {
    root.remove();
  }
}
