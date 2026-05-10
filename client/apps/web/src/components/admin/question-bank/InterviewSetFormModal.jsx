import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AddButton,
  FormSection,
  LineListField,
  MultiCheckboxField,
  NumberField,
  RemoveButton,
  SelectField,
  TextAreaField,
  TextField,
  ValidationSummary,
} from './QuestionBankFormFields';
import {
  SUPPORTED_LOCALES,
  compactLocalizedContent,
  compactObjectList,
  compactTextList,
  editableInterviewSet,
  removeItem,
  updateItem,
} from './questionBankFormData';

function _options(options, fallback) {
  return options?.length ? options : fallback.map((key) => ({ key, label: key }));
}

function _optionsWithAny(options, t) {
  return [{ key: '', label: t('adminQuestionBank.any') }, ..._options(options, [])];
}

function _validSlotRules(slotRules) {
  return compactObjectList(slotRules, ['stage']).filter((rule) => Number(rule.count) > 0);
}

function _validateSet({ form, t }) {
  const issues = [];
  const hasProbeIds = compactTextList(form.probeIds).length > 0;
  const hasSlotRules = _validSlotRules(form.slotRules).length > 0;
  if (!form.title.trim()) issues.push(t('adminQuestionBank.validationSetTitle'));
  if (!form.roleFamily) issues.push(t('adminQuestionBank.validationSetRole'));
  if (!form.level) issues.push(t('adminQuestionBank.validationSetLevel'));
  if (!form.stages.length) issues.push(t('adminQuestionBank.validationStages'));
  if (!form.competencies.length) issues.push(t('adminQuestionBank.validationCompetencies'));
  if (Number(form.durationMinutes) < 1) issues.push(t('adminQuestionBank.validationDuration'));
  if (Number(form.questionCount) < 1) issues.push(t('adminQuestionBank.validationQuestionCount'));
  if (!hasProbeIds && !hasSlotRules) issues.push(t('adminQuestionBank.validationSetComposition'));
  SUPPORTED_LOCALES.forEach((locale) => {
    if (!form.localizedContent[locale]?.title?.trim()) {
      issues.push(t('adminQuestionBank.validationSetLocale', { locale }));
    }
  });
  return issues;
}

function _payload(form) {
  return {
    ...form,
    code: form.code.trim() || null,
    title: form.title.trim(),
    durationMinutes: Number(form.durationMinutes),
    difficulty: Number(form.difficulty),
    questionCount: Number(form.questionCount),
    probeIds: compactTextList(form.probeIds),
    localizedContent: compactLocalizedContent(form.localizedContent),
    slotRules: _validSlotRules(form.slotRules).map((rule) => ({
      stage: rule.stage,
      type: rule.type || undefined,
      competency: rule.competency || undefined,
      count: Number(rule.count),
    })),
  };
}

function SetMetadataSection({ form, taxonomy, setField, t }) {
  return (
    <FormSection title={t('adminQuestionBank.setMetadataSection')}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField label={t('adminQuestionBank.code')} value={form.code} onChange={(code) => setField({ code })} />
        <TextField label={t('adminQuestionBank.setTitle')} value={form.title} onChange={(title) => setField({ title })} />
        <SelectField label={t('adminQuestionBank.role')} value={form.roleFamily} options={_options(taxonomy?.roleFamilies, ['backend'])} onChange={(roleFamily) => setField({ roleFamily })} />
        <SelectField label={t('adminQuestionBank.level')} value={form.level} options={_options(taxonomy?.levels, ['mid'])} onChange={(level) => setField({ level })} />
        <NumberField label={t('adminQuestionBank.durationMinutes')} value={form.durationMinutes} min={1} onChange={(durationMinutes) => setField({ durationMinutes })} />
        <NumberField label={t('adminQuestionBank.difficulty')} value={form.difficulty} min={1} max={5} onChange={(difficulty) => setField({ difficulty })} />
        <NumberField label={t('adminQuestionBank.questionCount')} value={form.questionCount} min={1} onChange={(questionCount) => setField({ questionCount })} />
      </div>
      <MultiCheckboxField label={t('adminQuestionBank.stages')} values={form.stages} options={_options(taxonomy?.stages, [])} onChange={(stages) => setField({ stages })} />
      <MultiCheckboxField label={t('adminQuestionBank.competencies')} values={form.competencies} options={_options(taxonomy?.competencies, [])} onChange={(competencies) => setField({ competencies })} />
    </FormSection>
  );
}

function SetLocalizedSection({ form, activeLocale, setActiveLocale, setLocaleField, t }) {
  const content = form.localizedContent[activeLocale];
  return (
    <FormSection title={t('adminQuestionBank.localizedSection')}>
      <div className="flex gap-2">
        {SUPPORTED_LOCALES.map((locale) => (
          <button key={locale} type="button" onClick={() => setActiveLocale(locale)} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${activeLocale === locale ? 'bg-cta text-black' : 'bg-slate-800 text-slate-300'}`}>
            {locale.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label={t('adminQuestionBank.localizedTitle')} value={content.title} onChange={(title) => setLocaleField({ title })} />
        <TextField label={t('adminQuestionBank.displayIntent')} value={content.displayIntent} onChange={(displayIntent) => setLocaleField({ displayIntent })} />
      </div>
      <TextAreaField label={t('adminQuestionBank.displayQuestion')} value={content.displayQuestion} onChange={(displayQuestion) => setLocaleField({ displayQuestion })} />
      <LineListField label={t('adminQuestionBank.guidance')} values={content.guidance} onChange={(guidance) => setLocaleField({ guidance })} />
      <LineListField label={t('adminQuestionBank.commonMistakes')} values={content.commonMistakes} onChange={(commonMistakes) => setLocaleField({ commonMistakes })} />
    </FormSection>
  );
}

function SetCompositionSection({ form, taxonomy, setField, t }) {
  return (
    <FormSection title={t('adminQuestionBank.setCompositionSection')}>
      <LineListField label={t('adminQuestionBank.probeIds')} values={form.probeIds} onChange={(probeIds) => setField({ probeIds })} rows={3} />
      <SlotRulesSection form={form} taxonomy={taxonomy} setField={setField} t={t} />
    </FormSection>
  );
}

function SlotRulesSection({ form, taxonomy, setField, t }) {
  const _set = (index, patch) => setField({ slotRules: updateItem(form.slotRules, index, patch) });
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-400">{t('adminQuestionBank.slotRules')}</div>
      {form.slotRules.map((rule, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px_auto] gap-3 items-end">
          <SelectField label={t('adminQuestionBank.stage')} value={rule.stage} options={_options(taxonomy?.stages, ['stage_1_culture_fit'])} onChange={(stage) => _set(index, { stage })} />
          <SelectField label={t('adminQuestionBank.type')} value={rule.type} options={_optionsWithAny(taxonomy?.types, t)} onChange={(type) => _set(index, { type })} />
          <SelectField label={t('adminQuestionBank.competency')} value={rule.competency} options={_optionsWithAny(taxonomy?.competencies, t)} onChange={(competency) => _set(index, { competency })} />
          <NumberField label={t('adminQuestionBank.count')} value={rule.count} min={1} onChange={(count) => _set(index, { count })} />
          <RemoveButton label={t('adminQuestionBank.remove')} onClick={() => setField({ slotRules: removeItem(form.slotRules, index) })} />
        </div>
      ))}
      <AddButton
        label={t('adminQuestionBank.addSlotRule')}
        onClick={() => setField({ slotRules: [...form.slotRules, { stage: 'stage_1_culture_fit', type: '', competency: '', count: 1 }] })}
      />
    </div>
  );
}

export default function InterviewSetFormModal({ interviewSet, taxonomy, saving, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => editableInterviewSet(interviewSet));
  const [activeLocale, setActiveLocale] = useState('vi');
  const [issues, setIssues] = useState([]);
  const setField = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setLocaleField = (patch) => setForm((current) => ({
    ...current,
    localizedContent: {
      ...current.localizedContent,
      [activeLocale]: { ...current.localizedContent[activeLocale], ...patch },
    },
  }));
  const _submit = (event) => {
    event.preventDefault();
    const nextIssues = _validateSet({ form, t });
    setIssues(nextIssues);
    if (!nextIssues.length) onSave(_payload(form));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
          <h3 className="text-lg font-heading font-semibold text-white">{interviewSet ? t('adminQuestionBank.editSet') : t('adminQuestionBank.createSet')}</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={_submit} className="flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-5">
            <ValidationSummary issues={issues} />
            <SetMetadataSection form={form} taxonomy={taxonomy} setField={setField} t={t} />
            <SetLocalizedSection form={form} activeLocale={activeLocale} setActiveLocale={setActiveLocale} setLocaleField={setLocaleField} t={t} />
            <SetCompositionSection form={form} taxonomy={taxonomy} setField={setField} t={t} />
          </div>
          <div className="p-5 border-t border-slate-700/60 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer">{t('adminQuestionBank.cancel')}</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-cta text-black font-semibold hover:bg-cta/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('adminQuestionBank.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
