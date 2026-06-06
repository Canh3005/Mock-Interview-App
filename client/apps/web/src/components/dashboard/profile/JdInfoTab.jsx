import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, CheckCircle2, Pencil, X, Plus } from 'lucide-react';
import {
  updateJdJsonRequest,
} from '../../../store/slices/profileSlice';
import {
  getQuestionProbeCompetencyLabel,
  getQuestionProbeCompetencyOptions,
} from '../../../constants/questionProbeTaxonomy';

const JD_SENIORITY_OPTIONS = ['intern', 'junior', 'mid', 'senior', 'lead', 'staff', 'manager'];

function SkillPill({ label }) {
  return (
    <span className="text-xs px-2.5 py-1 bg-cta/10 text-cta rounded-full border border-cta/20">
      {label}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function TagEditor({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');

  const addTag = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-cta/15 text-cta px-2.5 py-1 rounded-full text-xs font-medium border border-cta/30">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTag(e); }}
          placeholder={placeholder}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
        />
        <button
          type="button"
          onClick={addTag}
          className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function CompetencyEditor({ competencies, onChange, t }) {
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const competencyOptions = getQuestionProbeCompetencyOptions(t);
  const availableOptions = competencyOptions.filter(
    (option) => !competencies.includes(option.key),
  );
  const selectedValue = availableOptions.some((option) => option.key === selectedCompetency)
    ? selectedCompetency
    : (availableOptions[0]?.key ?? '');

  const addCompetency = () => {
    if (!selectedValue) return;
    onChange([...competencies, selectedValue]);
    setSelectedCompetency('');
  };

  const removeCompetency = (competency) => {
    onChange(competencies.filter((current) => current !== competency));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {competencies.map((competency) => (
          <span key={competency} className="inline-flex items-center gap-1 bg-cta/15 text-cta px-2.5 py-1 rounded-full text-xs font-medium border border-cta/30">
            {getQuestionProbeCompetencyLabel(t, competency)}
            <button type="button" onClick={() => removeCompetency(competency)} className="hover:text-white transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <select
          value={selectedValue}
          onChange={(e) => setSelectedCompetency(e.target.value)}
          disabled={availableOptions.length === 0}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors disabled:opacity-50"
        >
          {availableOptions.length === 0 ? (
            <option value="">{t('profile.jdTab.edit.noCompetencies')}</option>
          ) : (
            availableOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={addCompetency}
          disabled={!selectedValue}
          className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function JdInfoTab({ onGoUpload }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const {
    documentContext,
    parseResult,
    jdSaving,
    jdSaveError,
  } = useSelector((state) => state.profile);

  const jd = documentContext?.jd ?? null;
  const justParsed = parseResult?.type === 'JD';

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const prevSavingRef = useRef(false);

  useEffect(() => {
    if (prevSavingRef.current && !jdSaving && !jdSaveError) {
      setIsEditing(false);
      setEditData(null);
    }
    prevSavingRef.current = jdSaving;
  }, [jdSaving, jdSaveError]);

  const handleEditOpen = () => {
    setEditData({
      role: jd.role || '',
      domain: jd.domain || '',
      seniority: jd.seniority || '',
      minimum_experience_years: jd.minimum_experience_years ?? '',
      required_skills: [...(jd.required_skills || [])],
      nice_to_have_skills: [...(jd.nice_to_have_skills || [])],
      requiredCompetencies: [...(jd.requiredCompetencies || [])],
      key_responsibilities: (jd.key_responsibilities || []).join('\n'),
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    dispatch(updateJdJsonRequest({
      ...jd,
      role: editData.role,
      domain: editData.domain || undefined,
      seniority: editData.seniority || undefined,
      minimum_experience_years: editData.minimum_experience_years !== ''
        ? Number(editData.minimum_experience_years)
        : undefined,
      required_skills: editData.required_skills,
      nice_to_have_skills: editData.nice_to_have_skills,
      requiredCompetencies: editData.requiredCompetencies,
      key_responsibilities: editData.key_responsibilities
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  };

  if (!jd) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <Upload size={36} className="text-slate-600" />
        <div>
          <p className="text-slate-300 font-medium">{t('profile.jdTab.empty.title')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('profile.jdTab.empty.description')}</p>
        </div>
        <button
          onClick={onGoUpload}
          className="text-sm text-cta hover:text-cta/80 transition-colors underline underline-offset-2"
        >
          {t('profile.jdTab.empty.action')}
        </button>
      </div>
    );
  }

  if (isEditing && editData) {
    return (
      <form onSubmit={handleEditSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.edit.role')}</label>
            <input
              type="text"
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.edit.seniority')}</label>
            <select
              value={editData.seniority}
              onChange={(e) => setEditData({ ...editData, seniority: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            >
              <option value="">—</option>
              {JD_SENIORITY_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.edit.domain')}</label>
            <input
              type="text"
              value={editData.domain}
              onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.edit.minExp')}</label>
            <input
              type="number"
              min={0}
              value={editData.minimum_experience_years}
              onChange={(e) => setEditData({ ...editData, minimum_experience_years: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.requiredSkills')}</label>
          <TagEditor
            tags={editData.required_skills}
            onChange={(tags) => setEditData({ ...editData, required_skills: tags })}
            placeholder={t('profile.jdTab.edit.skillPlaceholder')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.niceToHave')}</label>
          <TagEditor
            tags={editData.nice_to_have_skills}
            onChange={(tags) => setEditData({ ...editData, nice_to_have_skills: tags })}
            placeholder={t('profile.jdTab.edit.skillPlaceholder')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.competencies')}</label>
          <CompetencyEditor
            competencies={editData.requiredCompetencies}
            onChange={(tags) => setEditData({ ...editData, requiredCompetencies: tags })}
            t={t}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.jdTab.responsibilities')}</label>
          <textarea
            value={editData.key_responsibilities}
            onChange={(e) => setEditData({ ...editData, key_responsibilities: e.target.value })}
            rows={8}
            placeholder={t('profile.jdTab.edit.responsibilitiesPlaceholder')}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors leading-relaxed"
          />
          <p className="text-xs text-slate-500">{t('profile.jdTab.edit.responsibilitiesHint')}</p>
        </div>

        {jdSaveError && (
          <p className="text-sm text-red-400">{jdSaveError}</p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={handleEditCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={jdSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-cta text-white rounded-xl font-medium text-sm hover:bg-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {jdSaving ? <Loader2 size={15} className="animate-spin" /> : t('profile.form.save')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-white">{jd.role}</h3>
        {jd.domain && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">{jd.domain}</span>
        )}
        {jd.seniority && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full capitalize">{jd.seniority}</span>
        )}
        {jd.minimum_experience_years != null && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
            {jd.minimum_experience_years}+ {t('profile.jdTab.yearsExp')}
          </span>
        )}
        {justParsed && (
          <span className="text-xs px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full border border-green-500/20 flex items-center gap-1">
            <CheckCircle2 size={10} /> {t('profile.upload.analysisComplete')}
          </span>
        )}
        <button
          onClick={handleEditOpen}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
        >
          <Pencil size={12} />
          {t('common.edit')}
        </button>
      </div>

      {/* Required Skills */}
      {jd.required_skills?.length > 0 && (
        <Section title={t('profile.jdTab.requiredSkills')}>
          <div className="flex flex-wrap gap-1.5">
            {jd.required_skills.map((s) => <SkillPill key={s} label={s} />)}
          </div>
        </Section>
      )}

      {/* Nice-to-have */}
      {jd.nice_to_have_skills?.length > 0 && (
        <Section title={t('profile.jdTab.niceToHave')}>
          <div className="flex flex-wrap gap-1.5">
            {jd.nice_to_have_skills.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Required Competencies */}
      {jd.requiredCompetencies?.length > 0 && (
        <Section title={t('profile.jdTab.competencies')}>
          <div className="flex flex-wrap gap-1.5">
            {jd.requiredCompetencies.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {getQuestionProbeCompetencyLabel(t, c)}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Key Responsibilities */}
      {jd.key_responsibilities?.length > 0 && (
        <Section title={t('profile.jdTab.responsibilities')}>
          <ul className="space-y-1.5">
            {jd.key_responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-cta/60 shrink-0 mt-0.5">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
