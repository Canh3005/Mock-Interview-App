import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
} from "./QuestionBankFormFields";
import {
  SUPPORTED_LOCALES,
  compactCompleteObjects,
  compactLocalizedContent,
  compactObjectList,
  compactTextList,
  editableProbe,
  removeItem,
  updateItem,
} from "./questionBankFormData";

const SCORE_BANDS = ["strong", "adequate", "weak"];

function _options(options, fallback) {
  return options?.length
    ? options
    : fallback.map((key) => ({ key, label: key }));
}

function _validateProbe({ form, t }) {
  const issues = [];
  if (!form.stages.length) issues.push(t("adminQuestionBank.validationStages"));
  if (!form.roleFamilies.length)
    issues.push(t("adminQuestionBank.validationRoles"));
  if (!form.levels.length) issues.push(t("adminQuestionBank.validationLevels"));
  if (!form.competencies.length)
    issues.push(t("adminQuestionBank.validationCompetencies"));
  if (!form.intent.trim()) issues.push(t("adminQuestionBank.validationIntent"));
  if (!form.primaryQuestion.trim())
    issues.push(t("adminQuestionBank.validationPrimaryQuestion"));
  if (!compactCompleteObjects(form.expectedSignals, ["label"]).length)
    issues.push(t("adminQuestionBank.validationSignals"));
  if (!compactCompleteObjects(form.scoringHints, ["description"]).length) {
    issues.push(t("adminQuestionBank.validationScoringHints"));
  }
  if (!compactCompleteObjects(form.followUps, ["question", "purpose"]).length) {
    issues.push(t("adminQuestionBank.validationFollowUps"));
  }
  SUPPORTED_LOCALES.forEach((locale) => {
    const content = form.localizedContent[locale] ?? {};
    if (!content.title?.trim() || !content.displayQuestion?.trim()) {
      issues.push(t("adminQuestionBank.validationLocale", { locale }));
    }
  });
  return issues;
}

function _payload(form) {
  return {
    ...form,
    code: form.code.trim() || null,
    difficulty: Number(form.difficulty),
    techTags: compactTextList(form.techTags),
    topicTags: compactTextList(form.topicTags),
    expectedSignals: compactCompleteObjects(form.expectedSignals, ["label"]),
    scoringHints: compactCompleteObjects(form.scoringHints, ["description"]),
    followUps: compactCompleteObjects(form.followUps, ["question", "purpose"]),
    localizedContent: compactLocalizedContent(form.localizedContent),
    sourceReferences: compactObjectList(form.sourceReferences, ["label"]),
  };
}

function MetadataSection({ form, taxonomy, setField, t }) {
  return (
    <FormSection title={t("adminQuestionBank.metadataSection")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField
          label={t("adminQuestionBank.code")}
          value={form.code}
          onChange={(code) => setField({ code })}
        />
        <SelectField
          label={t("adminQuestionBank.type")}
          value={form.type}
          options={_options(taxonomy?.types, ["behavioral"])}
          onChange={(type) => setField({ type })}
        />
        <NumberField
          label={t("adminQuestionBank.difficulty")}
          value={form.difficulty}
          min={1}
          max={5}
          onChange={(difficulty) => setField({ difficulty })}
        />
      </div>
      <MultiCheckboxField
        label={t("adminQuestionBank.stages")}
        values={form.stages}
        options={_options(taxonomy?.stages, [])}
        onChange={(stages) => setField({ stages })}
      />
      <MultiCheckboxField
        label={t("adminQuestionBank.roles")}
        values={form.roleFamilies}
        options={_options(taxonomy?.roleFamilies, [])}
        onChange={(roleFamilies) => setField({ roleFamilies })}
      />
      <MultiCheckboxField
        label={t("adminQuestionBank.levels")}
        values={form.levels}
        options={_options(taxonomy?.levels, [])}
        onChange={(levels) => setField({ levels })}
      />
      <MultiCheckboxField
        label={t("adminQuestionBank.competencies")}
        values={form.competencies}
        options={_options(taxonomy?.competencies, [])}
        onChange={(competencies) => setField({ competencies })}
      />
      <LineListField
        label={t("adminQuestionBank.techTags")}
        values={form.techTags}
        onChange={(techTags) => setField({ techTags })}
        rows={2}
      />
      <LineListField
        label={t("adminQuestionBank.topicTags")}
        values={form.topicTags}
        onChange={(topicTags) => setField({ topicTags })}
        rows={2}
      />
    </FormSection>
  );
}

function LocalizedSection({
  form,
  activeLocale,
  setActiveLocale,
  setLocaleField,
  t,
}) {
  const content = form.localizedContent[activeLocale];
  return (
    <FormSection title={t("adminQuestionBank.localizedSection")}>
      <div className="flex gap-2">
        {SUPPORTED_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveLocale(locale)}
            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${activeLocale === locale ? "bg-cta text-black" : "bg-slate-800 text-slate-300"}`}
          >
            {locale.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label={t("adminQuestionBank.localizedTitle")}
          value={content.title}
          onChange={(title) => setLocaleField({ title })}
        />
        <TextField
          label={t("adminQuestionBank.displayIntent")}
          value={content.displayIntent}
          onChange={(displayIntent) => setLocaleField({ displayIntent })}
        />
      </div>
      <TextAreaField
        label={t("adminQuestionBank.displayQuestion")}
        value={content.displayQuestion}
        onChange={(displayQuestion) => setLocaleField({ displayQuestion })}
      />
      <LineListField
        label={t("adminQuestionBank.guidance")}
        values={content.guidance}
        onChange={(guidance) => setLocaleField({ guidance })}
      />
      <LineListField
        label={t("adminQuestionBank.commonMistakes")}
        values={content.commonMistakes}
        onChange={(commonMistakes) => setLocaleField({ commonMistakes })}
      />
    </FormSection>
  );
}

function GuidanceSection({ form, setField, t }) {
  return (
    <FormSection title={t("adminQuestionBank.guidanceSection")}>
      <TextAreaField
        label={t("adminQuestionBank.intent")}
        value={form.intent}
        onChange={(intent) => setField({ intent })}
      />
      <TextAreaField
        label={t("adminQuestionBank.primaryQuestion")}
        value={form.primaryQuestion}
        onChange={(primaryQuestion) => setField({ primaryQuestion })}
      />
    </FormSection>
  );
}

function ExpectedSignalsSection({ form, taxonomy, setField, t }) {
  const _set = (index, patch) =>
    setField({
      expectedSignals: updateItem(form.expectedSignals, index, patch),
    });
  const triggerOptions = [
    { key: "", label: t("adminQuestionBank.noRelatedTrigger") },
    ..._options(taxonomy?.followUpTriggers, []),
  ];
  return (
    <FormSection title={t("adminQuestionBank.expectedSignals")}>
      {form.expectedSignals.map((signal, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end"
        >
          <TextField
            label={t("adminQuestionBank.signalLabel")}
            value={signal.label}
            onChange={(label) => _set(index, { label })}
          />
          <SelectField
            label={t("adminQuestionBank.relatedTrigger")}
            value={signal.relatedTrigger ?? ""}
            options={triggerOptions}
            onChange={(relatedTrigger) =>
              _set(index, { relatedTrigger: relatedTrigger || null })
            }
          />
          <RemoveButton
            label={t("adminQuestionBank.remove")}
            onClick={() =>
              setField({
                expectedSignals: removeItem(form.expectedSignals, index),
              })
            }
          />
        </div>
      ))}
      <AddButton
        label={t("adminQuestionBank.addSignal")}
        onClick={() =>
          setField({
            expectedSignals: [
              ...form.expectedSignals,
              { label: "", relatedTrigger: null },
            ],
          })
        }
      />
    </FormSection>
  );
}

function ScoringSection({ form, setField, t }) {
  const _set = (index, patch) =>
    setField({ scoringHints: updateItem(form.scoringHints, index, patch) });
  const scoreBandOptions = SCORE_BANDS.map((key) => ({
    key,
    label: t(`adminQuestionBank.scoreBand_${key}`),
  }));
  return (
    <FormSection title={t("adminQuestionBank.scoringSection")}>
      {form.scoringHints.map((hint, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 items-end"
        >
          <SelectField
            label={t("adminQuestionBank.scoreBand")}
            value={hint.scoreBand}
            options={scoreBandOptions}
            onChange={(scoreBand) => _set(index, { scoreBand })}
          />
          <TextField
            label={t("adminQuestionBank.description")}
            value={hint.description}
            onChange={(description) => _set(index, { description })}
          />
          <RemoveButton
            label={t("adminQuestionBank.remove")}
            onClick={() =>
              setField({ scoringHints: removeItem(form.scoringHints, index) })
            }
          />
        </div>
      ))}
      <AddButton
        label={t("adminQuestionBank.addScoringHint")}
        onClick={() =>
          setField({
            scoringHints: [
              ...form.scoringHints,
              { scoreBand: "strong", description: "" },
            ],
          })
        }
      />
    </FormSection>
  );
}

function FollowUpsSection({ form, taxonomy, setField, t }) {
  const _set = (index, patch) =>
    setField({ followUps: updateItem(form.followUps, index, patch) });
  return (
    <FormSection title={t("adminQuestionBank.followUpsSection")}>
      {form.followUps.map((followUp, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr_auto] gap-3 items-end"
        >
          <SelectField
            label={t("adminQuestionBank.trigger")}
            value={followUp.trigger}
            options={_options(taxonomy?.followUpTriggers, ["vague_answer"])}
            onChange={(trigger) => _set(index, { trigger })}
          />
          <TextField
            label={t("adminQuestionBank.question")}
            value={followUp.question}
            onChange={(question) => _set(index, { question })}
          />
          <TextField
            label={t("adminQuestionBank.purpose")}
            value={followUp.purpose}
            onChange={(purpose) => _set(index, { purpose })}
          />
          <RemoveButton
            label={t("adminQuestionBank.remove")}
            onClick={() =>
              setField({ followUps: removeItem(form.followUps, index) })
            }
          />
        </div>
      ))}
      <AddButton
        label={t("adminQuestionBank.addFollowUp")}
        onClick={() =>
          setField({
            followUps: [
              ...form.followUps,
              { trigger: "vague_answer", question: "", purpose: "" },
            ],
          })
        }
      />
    </FormSection>
  );
}

function SourcesSection({ form, setField, t }) {
  const _set = (index, patch) =>
    setField({
      sourceReferences: updateItem(form.sourceReferences, index, patch),
    });
  return (
    <FormSection title={t("adminQuestionBank.sourcesSection")}>
      {form.sourceReferences.map((source, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
        >
          <TextField
            label={t("adminQuestionBank.sourceLabel")}
            value={source.label}
            onChange={(label) => _set(index, { label })}
          />
          <TextField
            label={t("adminQuestionBank.sourceUrl")}
            value={source.url}
            onChange={(url) => _set(index, { url })}
          />
          <TextField
            label={t("adminQuestionBank.sourceNote")}
            value={source.note}
            onChange={(note) => _set(index, { note })}
          />
          <RemoveButton
            label={t("adminQuestionBank.remove")}
            onClick={() =>
              setField({
                sourceReferences: removeItem(form.sourceReferences, index),
              })
            }
          />
        </div>
      ))}
      <AddButton
        label={t("adminQuestionBank.addSource")}
        onClick={() =>
          setField({
            sourceReferences: [
              ...form.sourceReferences,
              { label: "", url: "", note: "" },
            ],
          })
        }
      />
    </FormSection>
  );
}

export default function ProbeFormModal({
  probe,
  taxonomy,
  saving,
  onClose,
  onSave,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => editableProbe(probe));
  const [activeLocale, setActiveLocale] = useState("vi");
  const [issues, setIssues] = useState([]);
  const setField = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setLocaleField = (patch) =>
    setForm((current) => ({
      ...current,
      localizedContent: {
        ...current.localizedContent,
        [activeLocale]: { ...current.localizedContent[activeLocale], ...patch },
      },
    }));
  const _submit = (event) => {
    event.preventDefault();
    const nextIssues = _validateProbe({ form, t });
    setIssues(nextIssues);
    if (!nextIssues.length) onSave(_payload(form));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
          <h3 className="text-lg font-heading font-semibold text-white">
            {probe
              ? t("adminQuestionBank.editProbe")
              : t("adminQuestionBank.createProbe")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={_submit} className="flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-5">
            <ValidationSummary issues={issues} />
            <MetadataSection
              form={form}
              taxonomy={taxonomy}
              setField={setField}
              t={t}
            />
            <LocalizedSection
              form={form}
              activeLocale={activeLocale}
              setActiveLocale={setActiveLocale}
              setLocaleField={setLocaleField}
              t={t}
            />
            <GuidanceSection form={form} setField={setField} t={t} />
            <ExpectedSignalsSection
              form={form}
              taxonomy={taxonomy}
              setField={setField}
              t={t}
            />
            <ScoringSection form={form} setField={setField} t={t} />
            <FollowUpsSection
              form={form}
              taxonomy={taxonomy}
              setField={setField}
              t={t}
            />
            <SourcesSection form={form} setField={setField} t={t} />
          </div>
          <div className="p-5 border-t border-slate-700/60 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              {t("adminQuestionBank.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-cta text-black font-semibold hover:bg-cta/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("adminQuestionBank.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
