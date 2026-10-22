// Reusable form controls: Field wrapper, ChoiceField (radio chips) and StateCombobox (searchable select).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { STATES } from '../data/states.js';
import { useI18n } from '../i18n/index.jsx';

export function Field({ id, label, help, error, optional, confirm, children }) {
  const { t } = useI18n();
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <label htmlFor={id} className="field-label">
        {label}{optional && <span className="field-opt">{t('f.optional')}</span>}
      </label>
      {help && <p id={`${id}-help`} className="field-help">{help}</p>}
      {children}
      {confirm && <p className="field-confirm">{t('nl.confirm')}</p>}
      {error && <p id={`${id}-err`} className="field-error" role="alert">{t('err.' + error)}</p>}
    </div>
  );
}

// A row of radio "chips". Native radios, so arrow keys and screen readers just work.
export function ChoiceField({ name, legend, help, value, onChange, options, error, optional, confirm }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <fieldset className={'field choice' + (error ? ' has-error' : '')} aria-describedby={error ? `${id}-err` : undefined} data-field={name}>
      <legend className="field-label">
        {legend}{optional && <span className="field-opt">{t('f.optional')}</span>}
      </legend>
      {help && <p className="field-help">{help}</p>}
      <div className="chips">
        {options.map((o) => (
          <label key={o.value} className={'chip' + (value === o.value ? ' is-on' : '')}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {confirm && <p className="field-confirm">{t('nl.confirm')}</p>}
      {error && <p id={`${id}-err`} className="field-error" role="alert">{t('err.' + error)}</p>}
    </fieldset>
  );
}

// Searchable State / UT picker following the ARIA "combobox with listbox popup" pattern.
export function StateCombobox({ id, value, onChange, allowUnsure = false, invalid, describedBy }) {
  const { t } = useI18n();
  const options = useMemo(() => [
    ...(allowUnsure ? [{ value: 'unsure', label: t('opt.unsure') }] : []),
    ...STATES.map((s) => ({ value: s, label: s })),
  ], [allowUnsure, t]);
  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? '';

  const [query, setQuery] = useState(labelOf(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);

  // Follow outside changes (sample cleared, sentence parsed, language switched).
  useEffect(() => { setQuery(labelOf(value)); }, [value, options]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = open && query !== labelOf(value);
  const shown = typing ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options;

  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  const choose = (o) => { onChange(o.value); setQuery(o.label); setOpen(false); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); choose(shown[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(labelOf(value)); }
  };

  return (
    <div className="combo" ref={wrapRef}
      onBlur={(e) => { if (!wrapRef.current.contains(e.relatedTarget)) { setOpen(false); setQuery(labelOf(value)); } }}>
      <input
        id={id} className="input" type="text" role="combobox" autoComplete="off"
        aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        placeholder={t('f.select.placeholder')} value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={(e) => { setOpen(true); e.target.select(); }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={`${id}-list`} className="combo-list" role="listbox">
          {shown.length === 0 && <li className="combo-none" role="presentation">{t('f.select.none')}</li>}
          {shown.map((o, i) => (
            <li key={o.value} id={`${id}-opt-${i}`} role="option" aria-selected={o.value === value}
              className={'combo-opt' + (i === active ? ' is-active' : '') + (o.value === 'unsure' ? ' is-unsure' : '')}
              onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)} onMouseMove={() => setActive(i)}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
