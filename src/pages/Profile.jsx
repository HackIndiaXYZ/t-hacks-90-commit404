// The profile form. Everything is native HTML controls plus our reusable Field components.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LANGS, useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { OCCUPATIONS, GENDERS } from '../eligibility/index.js';
import { ChoiceField, Field, StateCombobox } from '../components/Fields.jsx';
import AiProfileAssistant from '../components/AiProfileAssistant.jsx';

const REQUIRED = ['age', 'state', 'domicile', 'occupation', 'income'];
// Error-summary labels where the form field name differs from the dictionary key.
const LABEL = { income: 'f.income', domicileCertificate: 'f.domicileCert', hasDisabilityCertificate: 'f.disability' };

export default function Profile() {
  const { t, lang, setLang } = useI18n();
  const { form, setField, isSample, clearSample, fromText, validate, submit } = useProfile();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [targetAiField, setTargetAiField] = useState(null);
  const summaryRef = useRef(null);
  const aiSectionRef = useRef(null);

  const handleTriggerAi = (fieldName) => {
    setShowAiAssistant(true);
    setTargetAiField(fieldName);
    setTimeout(() => {
      aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const yn = [{ value: 'yes', label: t('opt.yes') }, { value: 'no', label: t('opt.no') }, { value: 'unsure', label: t('opt.unsure') }];
  const done = REQUIRED.filter((k) => (k === 'income' ? form.incomeUnsure || form.income !== '' : form[k] !== '')).length;
  const confirm = (name) => fromText.includes(name);

  const onSubmit = (e) => {
    e.preventDefault();
    const res = submit();
    if (res.ok) { setErrors({}); navigate('/results'); return; }
    // The engine names the income field "annualIncome"; the form calls it "income".
    const mapped = {};
    for (const [k, v] of Object.entries(res.errors)) mapped[k === 'annualIncome' ? 'income' : k] = v;
    setErrors(mapped);
    setTimeout(() => summaryRef.current?.focus(), 0);
  };

  const focusField = (name) => {
    const target = document.getElementById(`f-${name}`) || document.querySelector(`[data-field="${name}"] input`);
    target?.focus();
  };
  const err = (name) => errors[name];
  const errIds = (name) => (err(name) ? `f-${name}-err` : undefined);

  return (
    <main id="main" className="wrap page profile-page">
      <aside className="profile-aside">
        <h1>{t('form.title')}</h1>
        <p className="lede-sm">{t('form.intro')}</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={REQUIRED.length} aria-valuenow={done}
          aria-label={t('form.progress', { done, total: REQUIRED.length })}>
          <div className="progress-bar" style={{ width: `${(done / REQUIRED.length) * 100}%` }} />
        </div>
        <p className="progress-text">{t('form.progress', { done, total: REQUIRED.length })}</p>
      </aside>

      <form className="profile-form" onSubmit={onSubmit} noValidate>
        {isSample && (
          <div className="sample-banner" role="note">
            <p>{t('form.sample.banner')}</p>
            <button type="button" className="btn btn-ghost" onClick={clearSample}>{t('form.sample.clear')}</button>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="error-summary" tabIndex={-1} ref={summaryRef} role="alert">
            <h2>{t('form.errors.title')}</h2>
            <ul>
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}><button type="button" className="link-btn" onClick={() => focusField(k)}>{t(LABEL[k] || 'f.' + k)}: {t('err.' + v)}</button></li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Autofill Assistant Component */}
        <div ref={aiSectionRef} className="ai-assistant-toggle-wrapper">
          {showAiAssistant ? (
            <AiProfileAssistant
              activeFieldTarget={targetAiField}
              onClose={() => setShowAiAssistant(false)}
              onComplete={() => {
                const res = submit();
                if (res.ok) navigate('/results');
              }}
            />
          ) : (
            <div className="ai-toggle-bar">
              <span className="ai-badge-label">✨ {t('ai.autofill')}</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAiAssistant(true)}
              >
                {t('ai.openAssistant')}
              </button>
            </div>
          )}
        </div>

        <section className="form-sec" aria-labelledby="sec-about">
          <h2 id="sec-about">{t('form.sec.about')}</h2>
          <ChoiceField name="language" legend={t('f.language')} value={lang} onChange={setLang}
            options={LANGS.map((l) => ({ value: l.code, label: l.label }))} />
          <Field
            id="f-age"
            label={
              <span>
                {t('f.age')}
                <button type="button" className="btn-ai-assist-inline" onClick={() => handleTriggerAi('age')}>
                  {t('ai.askThis')}
                </button>
              </span>
            }
            help={t('f.age.help')}
            error={err('age')}
            confirm={confirm('age')}
          >
            <input id="f-age" className="input input-short" type="text" inputMode="numeric" autoComplete="off"
              value={form.age} onChange={(e) => setField('age', e.target.value)} aria-invalid={!!err('age')} aria-describedby={`f-age-help ${errIds('age') || ''}`} />
          </Field>
        </section>

        <section className="form-sec" aria-labelledby="sec-place">
          <h2 id="sec-place">{t('form.sec.place')}</h2>
          <Field
            id="f-state"
            label={
              <span>
                {t('f.state')}
                <button type="button" className="btn-ai-assist-inline" onClick={() => handleTriggerAi('state')}>
                  {t('ai.askThis')}
                </button>
              </span>
            }
            help={t('f.state.help')}
            error={err('state')}
            confirm={confirm('state')}
          >
            <StateCombobox id="f-state" value={form.state} onChange={(v) => setField('state', v)} invalid={!!err('state')} describedBy={`f-state-help ${errIds('state') || ''}`} />
          </Field>
          <Field id="f-domicile" label={t('f.domicile')} help={t('f.domicile.help')} error={err('domicile')} confirm={confirm('domicile')}>
            <StateCombobox id="f-domicile" allowUnsure value={form.domicile} onChange={(v) => setField('domicile', v)} invalid={!!err('domicile')} describedBy={`f-domicile-help ${errIds('domicile') || ''}`} />
          </Field>
          <ChoiceField name="domicileCertificate" legend={t('f.domicileCert')} optional value={form.domicileCertificate} onChange={(v) => setField('domicileCertificate', v)} options={yn} error={err('domicileCertificate')} />
        </section>

        <section className="form-sec" aria-labelledby="sec-work">
          <h2 id="sec-work">{t('form.sec.work')}</h2>
          <ChoiceField
            name="occupation"
            legend={
              <span>
                {t('f.occupation')}
                <button type="button" className="btn-ai-assist-inline" onClick={() => handleTriggerAi('occupation')}>
                  {t('ai.askThis')}
                </button>
              </span>
            }
            value={form.occupation}
            onChange={(v) => setField('occupation', v)}
            options={OCCUPATIONS.map((o) => ({ value: o, label: t('occ.' + o) }))}
            error={err('occupation')}
            confirm={confirm('occupation')}
          />
          <Field
            id="f-income"
            label={
              <span>
                {t('f.income')}
                <button type="button" className="btn-ai-assist-inline" onClick={() => handleTriggerAi('income')}>
                  {t('ai.askThis')}
                </button>
              </span>
            }
            help={t('f.income.help')}
            error={err('income')}
            confirm={confirm('income')}
          >
            <div className="income-row">
              <input id="f-income" className="input input-short" type="text" inputMode="numeric" autoComplete="off"
                value={form.incomeUnsure ? '' : form.income} disabled={form.incomeUnsure}
                onChange={(e) => setField('income', e.target.value)} aria-invalid={!!err('income')} aria-describedby={`f-income-help ${errIds('income') || ''}`} />
              <label className="check-inline">
                <input type="checkbox" checked={form.incomeUnsure} onChange={(e) => setField('incomeUnsure', e.target.checked)} />
                <span>{t('f.incomeUnsure')}</span>
              </label>
            </div>
          </Field>
          <ChoiceField name="gender" legend={t('f.gender')} help={t('f.gender.help')} optional value={form.gender} onChange={(v) => setField('gender', v)}
            options={GENDERS.map((g) => ({ value: g, label: t('gender.' + g) }))} error={err('gender')} confirm={confirm('gender')} />
        </section>

        <section className="form-sec" aria-labelledby="sec-more">
          <h2 id="sec-more">{t('form.sec.more')}</h2>
          <p className="field-help">{t('form.sec.more.help')}</p>
          <ChoiceField name="isStudent" legend={t('f.isStudent')} optional value={form.isStudent} onChange={(v) => setField('isStudent', v)} options={yn} confirm={confirm('isStudent')} />
          <ChoiceField
            name="ownsLand"
            legend={
              <span>
                {t('f.ownsLand')}
                <button type="button" className="btn-ai-assist-inline" onClick={() => handleTriggerAi('ownsLand')}>
                  {t('ai.askThis')}
                </button>
              </span>
            }
            optional
            value={form.ownsLand}
            onChange={(v) => setField('ownsLand', v)}
            options={yn}
            confirm={confirm('ownsLand')}
          />
          <ChoiceField name="hasDisabilityCertificate" legend={t('f.disability')} optional value={form.hasDisabilityCertificate} onChange={(v) => setField('hasDisabilityCertificate', v)} options={yn} confirm={confirm('hasDisabilityCertificate')} />
        </section>

        <div className="form-submit">
          <button type="submit" className="btn btn-primary btn-lg">{t('btn.find')}</button>
        </div>
      </form>
    </main>
  );
}
