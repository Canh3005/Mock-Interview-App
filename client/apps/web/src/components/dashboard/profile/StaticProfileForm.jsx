import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateCvJsonRequest } from '../../../store/slices/profileSlice';
import { Loader2, Plus, X, FileText, Pencil } from 'lucide-react';

const CV_SENIORITY_TO_FORM = {
  intern: 'Intern',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  staff: 'Lead',
  manager: 'Lead',
  unknown: 'Junior',
};

const FORM_TO_CV_SENIORITY = {
  Intern: 'intern',
  Fresher: 'junior',
  Junior: 'junior',
  'Mid-level': 'mid',
  Senior: 'senior',
  Lead: 'lead',
};

const CV_SENIORITY_LABEL_KEYS = {
  intern: 'intern',
  junior: 'junior',
  mid: 'mid',
  senior: 'senior',
  lead: 'lead',
  staff: 'lead',
  manager: 'lead',
};

function createEmptyExperienceItem() {
  return {
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    responsibilitiesText: '',
    achievementsText: '',
    techStackText: '',
  };
}

const emptyFormData = {
  role: '',
  seniority: 'Junior',
  domain: '',
  experience: [],
  techStack: [],
};

function toTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toMultilineText(value) {
  return toTextList(value).join('\n');
}

function multilineTextToList(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeExperienceItem(item = {}) {
  return {
    company: item.company || '',
    title: item.title || item.role || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    responsibilitiesText: toMultilineText(item.responsibilities),
    achievementsText: toMultilineText(item.achievements),
    techStackText: toMultilineText(item.techStack),
  };
}

function compactExperienceItem(item) {
  return {
    company: item.company.trim(),
    title: item.title.trim(),
    startDate: item.startDate.trim() || null,
    endDate: item.endDate.trim() || null,
    responsibilities: multilineTextToList(item.responsibilitiesText),
    achievements: multilineTextToList(item.achievementsText),
    techStack: multilineTextToList(item.techStackText),
  };
}

function hasExperienceContent(item) {
  return Boolean(
    item.company ||
    item.title ||
    item.startDate ||
    item.endDate ||
    item.responsibilities.length ||
    item.achievements.length ||
    item.techStack.length,
  );
}

function formDataFromCv(cv) {
  if (!cv) return emptyFormData;

  return {
    role: cv.currentTitle || '',
    seniority: CV_SENIORITY_TO_FORM[cv.seniority] || 'Junior',
    domain: Array.isArray(cv.domain) ? cv.domain.join(', ') : (cv.domain || ''),
    experience: (cv.experience || []).map(normalizeExperienceItem),
    techStack: cv.skills ?? [],
  };
}

function cvDomains(cv) {
  if (Array.isArray(cv?.domain)) return cv.domain.filter(Boolean);
  return cv?.domain ? [cv.domain] : [];
}

function seniorityLabel(t, seniority) {
  const labelKey = CV_SENIORITY_LABEL_KEYS[seniority];
  return labelKey ? t(`profile.form.seniorityOptions.${labelKey}`) : seniority;
}

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

function TagEditor({ tags, onChange, placeholder, addLabel }) {
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
          className="inline-flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function ExperienceItem({ item, index }) {
  const title = item.title || item.role || `Experience ${index + 1}`;
  const dateRange = [item.startDate, item.endDate].filter(Boolean).join(' - ');
  const highlights = [
    ...(item.achievements || []),
    ...(item.responsibilities || []),
  ].filter(Boolean).slice(0, 3);
  const techStack = item.techStack || [];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {item.company && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {item.company}
          </span>
        )}
        {dateRange && (
          <span className="text-xs text-slate-500">{dateRange}</span>
        )}
      </div>
      {highlights.length > 0 && (
        <ul className="space-y-1">
          {highlights.map((highlight, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
              <span className="text-cta/60 shrink-0 mt-0.5">-</span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {techStack.slice(0, 8).map((tech) => (
            <span key={tech} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ExperienceEditor({ experiences, onChange, t }) {
  const updateExperience = (index, patch) => {
    onChange(experiences.map((item, i) => (
      i === index ? { ...item, ...patch } : item
    )));
  };

  const addExperience = () => {
    onChange([...experiences, createEmptyExperienceItem()]);
  };

  const removeExperience = (index) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  return (
    <Section title={t('profile.form.experience')}>
      <div className="space-y-3">
        {experiences.length === 0 && (
          <p className="text-xs text-slate-500">{t('profile.form.emptyExperience')}</p>
        )}

        {experiences.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-200">
                {t('profile.form.experience')} {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeExperience(index)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={13} />
                {t('profile.form.removeExperience')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">{t('profile.form.company')}</label>
                <input
                  type="text"
                  value={item.company}
                  onChange={(e) => updateExperience(index, { company: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">{t('profile.form.position')}</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateExperience(index, { title: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">{t('profile.form.startDate')}</label>
                <input
                  type="text"
                  value={item.startDate}
                  onChange={(e) => updateExperience(index, { startDate: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">{t('profile.form.endDate')}</label>
                <input
                  type="text"
                  value={item.endDate}
                  onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">{t('profile.form.responsibilities')}</label>
              <textarea
                value={item.responsibilitiesText}
                onChange={(e) => updateExperience(index, { responsibilitiesText: e.target.value })}
                rows={4}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors leading-relaxed"
              />
              <p className="text-xs text-slate-500">{t('profile.form.oneItemPerLine')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">{t('profile.form.achievements')}</label>
              <textarea
                value={item.achievementsText}
                onChange={(e) => updateExperience(index, { achievementsText: e.target.value })}
                rows={4}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors leading-relaxed"
              />
              <p className="text-xs text-slate-500">{t('profile.form.oneItemPerLine')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">{t('profile.form.roleTechStack')}</label>
              <textarea
                value={item.techStackText}
                onChange={(e) => updateExperience(index, { techStackText: e.target.value })}
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors leading-relaxed"
              />
              <p className="text-xs text-slate-500">{t('profile.form.oneItemPerLine')}</p>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addExperience}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        >
          <Plus size={15} />
          {t('profile.form.addExperience')}
        </button>
      </div>
    </Section>
  );
}

export default function StaticProfileForm() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { documentContext, contextLoading, cvSaving, cvSaveError } = useSelector((state) => state.profile);
  const cv = documentContext?.cv ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const prevSavingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setFormData(formDataFromCv(cv));
    }
  }, [cv, isEditing]);

  useEffect(() => {
    if (prevSavingRef.current && !cvSaving && !cvSaveError) {
      setIsEditing(false);
    }
    prevSavingRef.current = cvSaving;
  }, [cvSaving, cvSaveError]);

  const handleEditOpen = () => {
    setFormData(formDataFromCv(cv));
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setFormData(formDataFromCv(cv));
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedExp = formData.experience
      .map(compactExperienceItem)
      .filter(hasExperienceContent);

    dispatch(updateCvJsonRequest({
      ...cv,
      currentTitle: formData.role || cv?.currentTitle,
      seniority: FORM_TO_CV_SENIORITY[formData.seniority] ?? cv?.seniority,
      domain: formData.domain
        ? formData.domain.split(',').map((s) => s.trim()).filter(Boolean)
        : cv?.domain ?? [],
      skills: formData.techStack,
      experience: parsedExp,
    }));
  };

  if (contextLoading && !cv) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-700 rounded" />
        <div className="h-4 bg-slate-700 rounded w-5/6" />
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <FileText size={32} className="text-slate-600" />
        <p className="text-slate-400 text-sm">{t('profile.upload.noCvYet')}</p>
      </div>
    );
  }

  const education = cv.education || [];
  const languages = cv.languages || [];
  const experience = cv.experience || [];
  const domains = cvDomains(cv);
  const displayTitle = cv.name || cv.currentTitle || t('profile.tabs.cv');

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.form.role')}</label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder={t('profile.form.rolePlaceholder')}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">{t('profile.form.seniority')}</label>
            <select
              name="seniority"
              value={formData.seniority}
              onChange={handleChange}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
            >
              <option value="Intern">{t('profile.form.seniorityOptions.intern')}</option>
              <option value="Fresher">{t('profile.form.seniorityOptions.fresher')}</option>
              <option value="Junior">{t('profile.form.seniorityOptions.junior')}</option>
              <option value="Mid-level">{t('profile.form.seniorityOptions.mid')}</option>
              <option value="Senior">{t('profile.form.seniorityOptions.senior')}</option>
              <option value="Lead">{t('profile.form.seniorityOptions.lead')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.form.domain')}</label>
          <input
            type="text"
            name="domain"
            value={formData.domain}
            onChange={handleChange}
            placeholder={t('profile.form.domainPlaceholder')}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.form.techStack')}</label>
          <TagEditor
            tags={formData.techStack}
            onChange={(techStack) => setFormData({ ...formData, techStack })}
            placeholder={t('profile.form.skillPlaceholder')}
            addLabel={t('profile.form.add')}
          />
        </div>

        <ExperienceEditor
          experiences={formData.experience}
          onChange={(experience) => setFormData({ ...formData, experience })}
          t={t}
        />

        {education.length > 0 && (
          <Section title={t('profile.form.education')}>
            <div className="space-y-2">
              {education.map((edu, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300">
                  <span className="text-white font-medium">{edu.institution}</span>
                  {edu.degree && <span className="text-slate-400"> - {edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>}
                  {edu.gpa && <span className="ml-2 text-cta text-xs font-semibold">GPA {edu.gpa}</span>}
                  {edu.graduationYear && <span className="ml-2 text-slate-500 text-xs">{edu.graduationYear}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {languages.length > 0 && (
          <Section title={t('profile.form.languages')}>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-slate-900/50 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                  <span className="text-white font-medium">{lang.language}</span>
                  <span className="text-slate-500">-</span>
                  <span className="text-slate-400">{lang.proficiency}</span>
                </span>
              ))}
            </div>
          </Section>
        )}

        {cvSaveError && (
          <p className="text-sm text-red-400">{cvSaveError}</p>
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
            disabled={cvSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-cta text-white rounded-xl font-medium text-sm hover:bg-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cvSaving ? <Loader2 size={15} className="animate-spin" /> : t('profile.form.save')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-white">{displayTitle}</h3>
        {cv.name && cv.currentTitle && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">{cv.currentTitle}</span>
        )}
        {cv.seniority && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
            {seniorityLabel(t, cv.seniority)}
          </span>
        )}
        {cv.totalYearsExperience != null && (
          <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
            {cv.totalYearsExperience}+ {t('profile.jdTab.yearsExp')}
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

      {domains.length > 0 && (
        <Section title={t('profile.form.domain')}>
          <div className="flex flex-wrap gap-1.5">
            {domains.map((domain) => (
              <span key={domain} className="text-xs px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {domain}
              </span>
            ))}
          </div>
        </Section>
      )}

      {cv.skills?.length > 0 && (
        <Section title={t('profile.form.techStack')}>
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((skill) => <SkillPill key={skill} label={skill} />)}
          </div>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title={t('profile.form.experience')}>
          <div className="space-y-2">
            {experience.map((item, index) => (
              <ExperienceItem key={`${item.company || item.title || index}-${index}`} item={item} index={index} />
            ))}
          </div>
        </Section>
      )}

      {education.length > 0 && (
        <Section title={t('profile.form.education')}>
          <div className="space-y-2">
            {education.map((edu, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
                <span className="text-white font-medium">{edu.institution}</span>
                {edu.degree && <span className="text-slate-400"> - {edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>}
                {edu.gpa && <span className="ml-2 text-cta text-xs font-semibold">GPA {edu.gpa}</span>}
                {edu.graduationYear && <span className="ml-2 text-slate-500 text-xs">{edu.graduationYear}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {languages.length > 0 && (
        <Section title={t('profile.form.languages')}>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-slate-900/40 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                <span className="text-white font-medium">{lang.language}</span>
                <span className="text-slate-500">-</span>
                <span className="text-slate-400">{lang.proficiency}</span>
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
