import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit2, Plus, Save, Search, ShieldCheck, Trash2 } from 'lucide-react';
import {
  clearCurrentProblem,
  clearVerifyResult,
  deleteProblemStart,
  fetchProblemByIdStart,
  fetchProblemsStart,
  importProblemsStart,
} from '../../../store/slices/adminProblemsSlice';

export default function ProblemList({ onCreateNew, onEdit }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { problems, total, page, limit, loading, importLoading } = useSelector((state) => state.adminProblems);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchProblemsStart({ page, limit, search: searchTerm, difficulty: difficultyFilter }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [dispatch, searchTerm, difficultyFilter, page, limit]);

  const handleEditClick = (id) => {
    dispatch(fetchProblemByIdStart(id));
    dispatch(clearVerifyResult());
    onEdit();
  };

  const handleCreateClick = () => {
    dispatch(clearCurrentProblem());
    dispatch(clearVerifyResult());
    onCreateNew();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          alert(t('adminProblems.importInvalidStructure'));
          return;
        }
        dispatch(importProblemsStart(json));
      } catch (err) {
        alert(t('adminProblems.importParseError', { message: err.message }));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="dash-page animate-in fade-in duration-500 font-body">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('adminProblems.title')}</h1>
          <p className="dash-page-description">{t('adminProblems.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="dash-card hover:brightness-95 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {importLoading ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {importLoading ? t('adminProblems.importing') : t('adminProblems.importJson')}
          </button>
          <button
            type="button"
            onClick={handleCreateClick}
            className="dash-primary-button px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {t('adminProblems.newProblem')}
          </button>
        </div>
      </header>

      <div className="dash-card rounded-xl flex flex-col overflow-hidden">
        <div className="dash-border p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dash-subtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('adminProblems.searchPlaceholder')}
              className="dash-input w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-cta"
            />
          </div>
          <div className="flex gap-4 sm:w-auto w-full">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="dash-input rounded-lg px-4 py-2.5 text-sm"
            >
              <option value="">{t('adminProblems.allDifficulties')}</option>
              <option value="EASY">{t('adminProblems.difficulty.EASY')}</option>
              <option value="MEDIUM">{t('adminProblems.difficulty.MEDIUM')}</option>
              <option value="HARD">{t('adminProblems.difficulty.HARD')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[300px]">
          {loading && problems.length === 0 && (
            <div className="absolute inset-0 z-10 dash-muted-panel backdrop-blur-sm flex items-center justify-center">
              <Clock className="animate-spin w-8 h-8 text-cta" />
            </div>
          )}
          <table className={`w-full text-left text-sm whitespace-nowrap min-w-[700px] transition-opacity duration-300 ${loading && problems.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
            <thead className="dash-muted-panel dash-border border-b">
              <tr>
                <th className="px-6 py-4 font-semibold dash-subtle w-24">{t('adminProblems.columns.id')}</th>
                <th className="px-6 py-4 font-semibold dash-subtle w-1/3">{t('adminProblems.columns.title')}</th>
                <th className="px-6 py-4 font-semibold dash-subtle">{t('adminProblems.columns.difficulty')}</th>
                <th className="px-6 py-4 font-semibold dash-subtle">{t('adminProblems.columns.status')}</th>
                <th className="px-6 py-4 font-semibold dash-subtle text-right">{t('adminProblems.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="dash-border divide-y">
              {problems.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--dash-surface-muted)] transition-colors group">
                  <td className="px-6 py-4 font-mono dash-subtle text-xs">#{p.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium dash-text block">{p.title}</div>
                    <div className="text-xs dash-subtle mt-1 max-w-[200px] truncate">{p.tags?.join(', ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      p.difficulty === 'EASY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}
                    >
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {p.status === 'PUBLISHED' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {p.status === 'VERIFIED' && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                      {p.status === 'DRAFT' && <Clock className="w-4 h-4 dash-subtle" />}
                      <span className="dash-muted text-xs font-medium">{p.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEditClick(p.id)}
                        className="p-2 dash-subtle hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer"
                        title={t('adminProblems.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('adminProblems.confirmDelete'))) {
                            dispatch(deleteProblemStart(p.id));
                          }
                        }}
                        className="p-2 dash-subtle hover:text-red-500 hover:bg-red-500/15 rounded-lg transition-colors cursor-pointer"
                        title={t('adminProblems.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="text-center py-8 dash-subtle italic">{t('adminProblems.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dash-border p-4 border-t flex flex-col sm:flex-row items-center justify-between text-sm dash-subtle">
          <span>{t('adminProblems.pagination', { page, totalPages: Math.ceil(total / limit) || 1, total })}</span>
          <div className="flex gap-2 items-center mt-3 sm:mt-0">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => dispatch(fetchProblemsStart({ page: page - 1, limit, search: searchTerm, difficulty: difficultyFilter }))}
              className="dash-icon-button disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={page * limit >= total}
              onClick={() => dispatch(fetchProblemsStart({ page: page + 1, limit, search: searchTerm, difficulty: difficultyFilter }))}
              className="dash-icon-button disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
