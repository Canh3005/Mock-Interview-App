import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfileRequest } from '../../../store/slices/profileSlice';
import { Loader2, Plus, X } from 'lucide-react';

export default function StaticProfileForm({ profileData }) {
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
          <label className="text-sm font-medium text-slate-300">Job Role</label>
          <input 
            type="text" 
            name="role"
            value={formData.role}
            onChange={handleChange}
            placeholder="e.g. Frontend Engineer"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Seniority</label>
          <select 
            name="seniority"
            value={formData.seniority}
            onChange={handleChange}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
          >
            <option value="Intern">Intern</option>
            <option value="Fresher">Fresher</option>
            <option value="Junior">Junior</option>
            <option value="Mid-level">Mid-level</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Domain / Industry</label>
        <input 
          type="text" 
          name="domain"
          value={formData.domain}
          onChange={handleChange}
          placeholder="e.g. Fintech, E-commerce, Healthcare"
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Tech Stack (Skills)</label>
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
            placeholder="Type a skill and press Add (e.g. React, Node.js)"
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors"
          />
          <button 
            type="button"
            onClick={handleAddTag}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Experience (Raw JSON from CV)</label>
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
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile'}
        </button>
      </div>

    </form>
  )
}
