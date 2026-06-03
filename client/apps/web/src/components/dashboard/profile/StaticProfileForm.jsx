import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateProfileRequest } from '../../../store/slices/profileSlice';
import { Loader2, Plus, X } from 'lucide-react';

export default function StaticProfileForm({ profileData }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.profile);
  
  const [formData, setFormData] = useState({
    role: '',
    seniority: 'Junior',
    domain: '',
    experience: '',
    techStack: []
  });

  const [tagInput, setTagInput] = useState('');

  const education = profileData?.education || [];
  const languages = profileData?.languages || [];

  useEffect(() => {
    if (profileData) {
      setFormData({
        role: profileData.role || '',
        seniority: profileData.seniority || 'Junior',
        domain: profileData.domain || '',
        experience: profileData.experience ? JSON.stringify(profileData.experience, null, 2) : '',
        techStack: profileData.techStack || []
      });
    }
  }, [profileData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.techStack.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        techStack: [...formData.techStack, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      techStack: formData.techStack.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let parsedExp = formData.experience;
    try {
      if (formData.experience) {
         parsedExp = JSON.parse(formData.experience);
      }
    } catch(e) { /* ignore parse error, send as string */ }

    dispatch(updateProfileRequest({
      ...formData,
      experience: parsedExp
    }));
  };

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
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.techStack.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 bg-cta/15 text-cta px-3 py-1 rounded-full text-sm font-medium border border-cta/30">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-white transition-colors">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag(e); }}
            placeholder={t('profile.form.skillPlaceholder')}
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
          />
          <button 
            type="button"
            onClick={handleAddTag}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={18} />
            {t('profile.form.add')}
          </button>
        </div>
      </div>

      {education.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.form.education')}</label>
          <div className="space-y-2">
            {education.map((edu, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300">
                <span className="text-white font-medium">{edu.institution}</span>
                {edu.degree && <span className="text-slate-400"> — {edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>}
                {edu.gpa && <span className="ml-2 text-cta text-xs font-semibold">GPA {edu.gpa}</span>}
                {edu.graduationYear && <span className="ml-2 text-slate-500 text-xs">{edu.graduationYear}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {languages.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">{t('profile.form.languages')}</label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-slate-900/50 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                <span className="text-white font-medium">{lang.language}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{lang.proficiency}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">{t('profile.form.experience')}</label>
        <textarea 
          name="experience"
          value={formData.experience}
          onChange={handleChange}
          rows={12}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors font-mono text-xs leading-relaxed"
          placeholder='[{"company": "Tech Corp", "role": "SE", "duration": "2020-2022"}]'
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-cta hover:bg-cta/90 text-white font-semibold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : t('profile.form.save')}
        </button>
      </div>

    </form>
  )
}
