import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, CheckCircle2, Clock, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from "@monaco-editor/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createProblemStart, updateProblemStart, verifyProblemStart } from '../../../store/slices/adminProblemsSlice';

const LANGUAGES = [
  { id: 'python', name: 'Python 3', defaultStarter: 'def solve():\n    pass', defaultTimer: 2000 },
  { id: 'javascript', name: 'JavaScript', defaultStarter: 'function solve() {\n\n}', defaultTimer: 2000 },
  { id: 'java', name: 'Java', defaultStarter: 'class Solution {\n    public void solve() {\n\n    }\n}', defaultTimer: 2000 },
  { id: 'cpp', name: 'C++', defaultStarter: '#include <iostream>\n\nint main() {\n    return 0;\n}', defaultTimer: 1000 },
];

export default function ProblemEditor({ onCancel }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentProblem, verifyResult, verifyLoading, loading } = useSelector(state => state.adminProblems);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'content' | 'testcases'
  
  // Editor Form State
  const [formData, setFormData] = useState({
    title: '', difficulty: 'EASY', tags: '', description: '', timeLimitMultiplier: 1.0, testCases: [], hints: ['', '', ''],
  });
  const [templates, setTemplates] = useState({});
  const [activeLang, setActiveLang] = useState('python');
  const [codeView, setCodeView] = useState('solutionCode'); // 'starterCode', 'solutionCode', 'driverCode'
  const loadedProblemId = useRef(null);

  useEffect(() => {
    const incomingId = currentProblem?.id ?? null;
    // Only re-initialize editor when switching to a different problem, not on every save/verify re-fetch
    if (incomingId === loadedProblemId.current) return;
    loadedProblemId.current = incomingId;

    if (currentProblem) {
      const loadedHints = [0, 1, 2].map((i) => currentProblem.hints?.[i] ?? '')
      setFormData({
        title: currentProblem.title || '',
        difficulty: currentProblem.difficulty || 'EASY',
        tags: currentProblem.tags ? currentProblem.tags.join(', ') : '',
        description: currentProblem.description || '',
        timeLimitMultiplier: currentProblem.timeLimitMultiplier || 1.0,
        testCases: currentProblem.testCases || [],
        hints: loadedHints,
      });

      const initialTemplates = {};
      LANGUAGES.forEach(lang => {
        const found = currentProblem.templates?.find(t => t.languageId === lang.id);
        if (found) {
          initialTemplates[lang.id] = { ...found, languageId: lang.id, enabled: found.isEnabled !== false };
        } else {
          initialTemplates[lang.id] = { enabled: false, languageId: lang.id, starterCode: lang.defaultStarter, solutionCode: '', driverCode: '', timeLimitMs: lang.defaultTimer, memoryLimitKb: 128000 };
        }
      });
      setTemplates(initialTemplates);
    } else {
      const initialTemplates = {};
      LANGUAGES.forEach(lang => {
        initialTemplates[lang.id] = { enabled: lang.id === 'python', languageId: lang.id, starterCode: lang.defaultStarter, solutionCode: '', driverCode: '', timeLimitMs: lang.defaultTimer, memoryLimitKb: 128000 };
      });
      setTemplates(initialTemplates);
      setFormData({ title: '', difficulty: 'EASY', tags: '', description: '', timeLimitMultiplier: 1.0, testCases: [] });
    }
  }, [currentProblem]);

  const handleSave = () => {
    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      hints: (formData.hints ?? []).map(h => h.trim()).filter(Boolean),
      templates: Object.values(templates).map(t => ({ ...t, isEnabled: t.enabled })),
    };

    if (currentProblem?.id) {
      dispatch(updateProblemStart({ id: currentProblem.id, data: payload }));
    } else {
      dispatch(createProblemStart(payload));
    }
  };

  const handleVerify = () => {
    if (!currentProblem?.id) {
      alert(t('adminProblemEditor.verifyNeedsDraft'));
      return;
    }
    dispatch(verifyProblemStart({
      id: currentProblem.id,
      templates: Object.values(templates).map(t => ({ ...t, isEnabled: t.enabled })),
      testCases: formData.testCases,
    }));
  };

  const handleToggleLang = (langId) => {
    setTemplates(prev => ({
      ...prev,
      [langId]: { ...prev[langId], enabled: !prev[langId].enabled }
    }));
  };

  const handleTemplateChange = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value }
    }));
  };

  const currentTemplate = templates[activeLang] || {};

  if (loading && !currentProblem) {
    return (
      <main className="dash-page font-body pb-12 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-slate-700/60 rounded-lg" />
            <div className="h-4 w-40 bg-slate-700/40 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-16 bg-slate-700/60 rounded-lg" />
            <div className="h-9 w-28 bg-slate-700/60 rounded-lg" />
            <div className="h-9 w-32 bg-slate-700/60 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-4 border-b border-slate-700/60 pb-0">
          {[1, 2, 3].map(i => <div key={i} className="h-10 w-28 bg-slate-700/40 rounded-t-lg" />)}
        </div>
        <div className="dash-card rounded-xl p-6 min-h-[500px] space-y-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-slate-700/50 rounded" />
              <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="dash-page animate-in slide-in-from-bottom-4 duration-500 font-body pb-12">
      <header className="dash-page-header">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white">
            {currentProblem ? t('adminProblemEditor.editTitle') : t('adminProblemEditor.createTitle')}
          </h2>
          <p className="text-slate-400">{t('adminProblemEditor.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="dash-card px-4 py-2 rounded-lg font-medium hover:brightness-95 transition-colors cursor-pointer">
            {t('adminProblemEditor.cancel')}
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-md cursor-pointer">
            <Save className="w-4 h-4" /> {t('adminProblemEditor.saveDraft')}
          </button>
          <button onClick={handleVerify} disabled={verifyLoading} className="dash-primary-button px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            {verifyLoading ? <Clock className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {verifyLoading ? t('adminProblemEditor.verifying') : t('adminProblemEditor.verify')}
          </button>
        </div>
      </header>

      {/* Verification Result Feedback */}
      {verifyResult && (
        <div className={`p-4 rounded-xl border ${verifyResult.verified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <h3 className="font-bold flex items-center gap-2 mb-2">
            {verifyResult.verified ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
            {verifyResult.verified ? t('adminProblemEditor.verifySuccess') : t('adminProblemEditor.verifyFailed')}
          </h3>
          {!verifyResult.verified && verifyResult.details?.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-red-500/20">
                    <th className="py-2">{t('adminProblemEditor.columns.language')}</th>
                    <th className="py-2">{t('adminProblemEditor.columns.input')}</th>
                    <th className="py-2">{t('adminProblemEditor.columns.expected')}</th>
                    <th className="py-2">{t('adminProblemEditor.columns.actual')}</th>
                  </tr>
                </thead>
                <tbody>
                  {verifyResult.details.map((d, i) => (
                    <tr key={i} className="border-b border-red-500/10 opacity-80">
                      <td className="py-2">{d.language} ({d.statusDescription})</td>
                      <td className="py-2 font-mono truncate max-w-[150px]">{d.input}</td>
                      <td className="py-2 font-mono truncate max-w-[150px]">{d.expectedOutput}</td>
                      <td className="py-2 font-mono truncate max-w-[150px]">{d.actualOutput}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Studio Tabs */}
      <div className="flex border-b border-slate-700/60 overflow-x-auto">
        {['general', 'content', 'testcases'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm capitalize border-b-2 transition-colors cursor-pointer ${
              activeTab === tab ? 'border-cta text-cta' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t(`adminProblemEditor.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 min-h-[500px]">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">{t('adminProblemEditor.fields.title')}</label>
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50" placeholder={t('adminProblemEditor.placeholders.title')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">{t('adminProblemEditor.fields.difficulty')}</label>
                <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 cursor-pointer">
                  <option value="EASY">{t('adminProblems.difficulty.EASY')}</option>
                  <option value="MEDIUM">{t('adminProblems.difficulty.MEDIUM')}</option>
                  <option value="HARD">{t('adminProblems.difficulty.HARD')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">{t('adminProblemEditor.fields.timeLimitMultiplier')}</label>
                <input type="number" value={formData.timeLimitMultiplier} onChange={e => setFormData({...formData, timeLimitMultiplier: parseFloat(e.target.value)})} step={0.1} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">{t('adminProblemEditor.fields.tags')}</label>
              <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50" placeholder={t('adminProblemEditor.placeholders.tags')} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">{t('adminProblemEditor.fields.description')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                 <textarea
                   value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                   className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-cta h-full resize-none" placeholder={t('adminProblemEditor.placeholders.markdown')}/>
                 <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 prose prose-invert max-w-none overflow-y-auto w-full">
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                 </div>
              </div>
            </div>

            <div className="border-t border-slate-700/60 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-slate-300">{t('adminProblemEditor.fields.hints')}</label>
                <span className="text-xs text-slate-500">{t('adminProblemEditor.hintsHelp')}</span>
              </div>
              <div className="space-y-3 mt-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="mt-2.5 text-xs font-mono text-slate-500 w-12 shrink-0">
                      {t('adminProblemEditor.hintLabel', { index: i + 1 })}
                    </span>
                    <textarea
                      rows={2}
                      value={formData.hints?.[i] ?? ''}
                      onChange={e => {
                        const next = [0, 1, 2].map((j) =>
                          j === i ? e.target.value : (formData.hints?.[j] ?? '')
                        )
                        setFormData({ ...formData, hints: next })
                      }}
                      placeholder={t('adminProblemEditor.hintPlaceholder', { index: i + 1 })}
                      className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="flex flex-col gap-4 h-[600px]">
            <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700/60 flex-wrap">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm font-medium text-slate-400 mr-2">{t('adminProblemEditor.languageConfig')}</span>
                {LANGUAGES.map(lang => (
                   <label key={lang.id} className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-700">
                     <input 
                       type="checkbox" 
                       checked={templates[lang.id]?.enabled || false}
                       onChange={() => handleToggleLang(lang.id)}
                       className="accent-cta w-4 h-4"
                     />
                     <span className="text-sm text-slate-200">{lang.name}</span>
                   </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4 h-full flex-col sm:flex-row">
              {/* Lang Selector Sidebar */}
              <div className="sm:w-48 flex flex-row sm:flex-col gap-2 sm:border-r border-slate-700/60 sm:pr-4 overflow-x-auto">
                {LANGUAGES.filter(l => templates[l.id]?.enabled).map(lang => (
                  <button 
                    key={lang.id} 
                    onClick={() => setActiveLang(lang.id)}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeLang === lang.id ? 'bg-cta/15 border border-cta/30 text-cta' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    {lang.name}
                  </button>
                ))}
                {LANGUAGES.filter(l => templates[l.id]?.enabled).length === 0 && (
                  <p className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-700 rounded text-center">
                    {t('adminProblemEditor.noLanguageSelected')}
                  </p>
                )}
              </div>

              {/* Editor Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {templates[activeLang]?.enabled ? (
                  <>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {['starterCode', 'solutionCode', 'driverCode'].map(type => (
                         <button 
                           key={type}
                           onClick={() => setCodeView(type)}
                           className={`px-4 py-1.5 text-xs font-semibold rounded-md border ${codeView === type ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}
                         >
                           {t(`adminProblemEditor.codeView.${type}`)}
                         </button>
                      ))}
                      <div className="ml-auto flex gap-2 items-center text-xs text-slate-400">
                        {t('adminProblemEditor.timeMs')}
                        <input type="number" className="bg-slate-900 px-2 py-1 rounded border border-slate-700 w-20 outline-none focus:border-cta" value={currentTemplate.timeLimitMs} onChange={e => handleTemplateChange('timeLimitMs', parseInt(e.target.value))}/>
                      </div>
                    </div>
                    <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden bg-[#1E1E1E]">
                      <Editor
                        height="100%"
                        language={activeLang === 'cpp' ? 'cpp' : activeLang}
                        theme="vs-dark"
                        value={currentTemplate[codeView] || ''}
                        onChange={(val) => handleTemplateChange(codeView, val)}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 bg-slate-900/30 rounded-lg border border-slate-700/60 border-dashed">
                    {t('adminProblemEditor.noLanguageSelected')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-semibold text-white">
                {t('adminProblemEditor.testCasesTitle', { count: formData.testCases.length })}
              </h3>
              <button 
                onClick={() => setFormData({...formData, testCases: [...formData.testCases, { id: Date.now(), inputData: '', expectedOutput: '', isHidden: false }]})}
                className="text-sm bg-cta/15 text-cta border border-cta/30 px-3 py-1.5 rounded-lg font-medium hover:bg-cta/25 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('adminProblemEditor.addRow')}
              </button>
            </div>
            <div className="border border-slate-700/60 rounded-lg overflow-x-auto bg-slate-800/50">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-400">{t('adminProblemEditor.columns.input')}</th>
                    <th className="px-4 py-3 font-medium text-slate-400">{t('adminProblemEditor.columns.expectedOutput')}</th>
                    <th className="px-4 py-3 font-medium text-slate-400 w-24 text-center">{t('adminProblemEditor.columns.hidden')}</th>
                    <th className="px-4 py-3 font-medium text-slate-400 w-16">{t('adminProblemEditor.columns.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {formData.testCases.map((tc, idx) => (
                    <tr key={idx} className={`hover:bg-slate-700/20 transition-colors ${tc.isHidden ? 'bg-amber-500/5' : 'bg-transparent'}`}>
                      <td className="px-4 py-3">
                        {tc.isHidden && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1">
                            {t('adminProblemEditor.largeInput')}
                          </span>
                        )}
                        <textarea className="w-full bg-slate-900/80 border border-slate-700 rounded text-xs font-mono p-2 text-slate-300 resize-y focus:outline-none focus:border-cta" rows={2} value={tc.inputData} onChange={(e) => {
                          const newTc = [...formData.testCases];
                          newTc[idx].inputData = e.target.value;
                          setFormData({...formData, testCases: newTc});
                        }}/>
                      </td>
                      <td className="px-4 py-3">
                        <textarea className="w-full bg-slate-900/80 border border-slate-700 rounded text-xs font-mono p-2 text-slate-300 resize-y focus:outline-none focus:border-cta" rows={2} value={tc.expectedOutput} onChange={(e) => {
                          const newTc = [...formData.testCases];
                          newTc[idx].expectedOutput = e.target.value;
                          setFormData({...formData, testCases: newTc});
                        }}/>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={tc.isHidden} onChange={(e) => {
                           const newTc = [...formData.testCases];
                           newTc[idx].isHidden = e.target.checked;
                           setFormData({...formData, testCases: newTc});
                        }} className="w-4 h-4 accent-cta rounded bg-slate-900/50 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => {
                          const newTc = formData.testCases.filter((_, i) => i !== idx);
                          setFormData({...formData, testCases: newTc});
                        }} className="text-slate-400 hover:text-red-400 p-1.5 rounded cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {formData.testCases.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">{t('adminProblemEditor.emptyTestCases')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
