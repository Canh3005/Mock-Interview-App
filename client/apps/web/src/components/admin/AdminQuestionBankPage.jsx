import { useEffect, useState } from 'react';
import { BookOpenCheck, Layers3, Plus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchInterviewSetsRequest,
  fetchProbesRequest,
  fetchTaxonomyRequest,
  resetInterviewSetFilters,
  resetProbeFilters,
  saveInterviewSetRequest,
  saveProbeRequest,
  setInterviewSetFilters,
  setProbeFilters,
  transitionInterviewSetRequest,
  transitionProbeRequest,
} from '../../store/slices/questionBankAdminSlice';
import InterviewSetFormModal from './question-bank/InterviewSetFormModal';
import InterviewSetTable from './question-bank/InterviewSetTable';
import ProbeFilterBar from './question-bank/ProbeFilterBar';
import ProbeFormModal from './question-bank/ProbeFormModal';
import ProbeTable from './question-bank/ProbeTable';

export default function AdminQuestionBankPage() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const {
    probes,
    taxonomy,
    total,
    page,
    limit,
    filters,
    interviewSets,
    setsTotal,
    setsPage,
    setsLimit,
    setFilters,
    loading,
    setsLoading,
    saving,
    error,
  } = useSelector((state) => state.questionBankAdmin);
  const [activeTab, setActiveTab] = useState('probes');
  const [selectedProbe, setSelectedProbe] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const isModalOpen = selectedProbe !== null;
  const isSetModalOpen = selectedSet !== null;

  useEffect(() => {
    dispatch(fetchTaxonomyRequest());
  }, [dispatch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (activeTab === 'probes') {
        dispatch(fetchProbesRequest({ page: 1 }));
        return;
      }
      dispatch(fetchInterviewSetsRequest({ page: 1 }));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, dispatch, filters, setFilters]);

  const _handleSave = (data) => {
    dispatch(saveProbeRequest({ id: selectedProbe?.id ?? null, data }));
    setSelectedProbe(null);
  };

  const _handleSaveSet = (data) => {
    dispatch(saveInterviewSetRequest({ id: selectedSet?.id ?? null, data }));
    setSelectedSet(null);
  };

  const _handleTransition = (probe, transition, needsReason = false) => {
    const reason = needsReason ? window.prompt(t('adminQuestionBank.reasonPrompt')) : undefined;
    if (needsReason && !reason) return;
    dispatch(transitionProbeRequest({ id: probe.id, transition, reason }));
  };

  const _handleReset = () => {
    dispatch(resetProbeFilters());
  };

  const _handleResetSets = () => {
    dispatch(resetInterviewSetFilters());
  };

  const _handleSetTransition = (interviewSet, transition, needsReason = false) => {
    const reason = needsReason ? window.prompt(t('adminQuestionBank.reasonPrompt')) : undefined;
    if (needsReason && !reason) return;
    dispatch(transitionInterviewSetRequest({ id: interviewSet.id, transition, reason }));
  };

  const _openCreateModal = () => {
    if (activeTab === 'probes') {
      setSelectedProbe(undefined);
      return;
    }
    setSelectedSet(undefined);
  };

  return (
    <main className="dash-page font-body animate-in fade-in duration-500">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">
            {t('adminQuestionBank.title')}
          </h1>
          <p className="dash-page-description">{t('adminQuestionBank.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={_openCreateModal}
          className="dash-primary-button px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'probes'
            ? t('adminQuestionBank.createProbe')
            : t('adminQuestionBank.createSet')}
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="dash-border flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('probes')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'probes'
              ? 'border-cta text-[var(--dash-text)]'
              : 'border-transparent dash-subtle hover:text-[var(--dash-text)]'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          {t('adminQuestionBank.probesTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sets')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'sets'
              ? 'border-cta text-[var(--dash-text)]'
              : 'border-transparent dash-subtle hover:text-[var(--dash-text)]'
          }`}
        >
          <Layers3 className="w-4 h-4" />
          {t('adminQuestionBank.setsTab')}
        </button>
      </div>

      {activeTab === 'probes' ? (
        <>
          <ProbeFilterBar
            filters={filters}
            taxonomy={taxonomy}
            onChange={(changes) => dispatch(setProbeFilters(changes))}
            onReset={_handleReset}
          />

          <ProbeTable
            probes={probes}
            loading={loading}
            page={page}
            total={total}
            limit={limit}
            onPageChange={(targetPage) => dispatch(fetchProbesRequest({ page: targetPage }))}
            onEdit={(probe) => setSelectedProbe(probe)}
            onTransition={_handleTransition}
          />
        </>
      ) : (
        <>
          <ProbeFilterBar
            filters={setFilters}
            taxonomy={taxonomy}
            onChange={(changes) => dispatch(setInterviewSetFilters(changes))}
            onReset={_handleResetSets}
          />

          <InterviewSetTable
            interviewSets={interviewSets}
            loading={setsLoading}
            page={setsPage}
            total={setsTotal}
            limit={setsLimit}
            onPageChange={(targetPage) => dispatch(fetchInterviewSetsRequest({ page: targetPage }))}
            onEdit={(interviewSet) => setSelectedSet(interviewSet)}
            onTransition={_handleSetTransition}
          />
        </>
      )}

      {isModalOpen && (
        <ProbeFormModal
          probe={selectedProbe}
          taxonomy={taxonomy}
          saving={saving}
          onClose={() => setSelectedProbe(null)}
          onSave={_handleSave}
        />
      )}
      {isSetModalOpen && (
        <InterviewSetFormModal
          interviewSet={selectedSet}
          taxonomy={taxonomy}
          saving={saving}
          onClose={() => setSelectedSet(null)}
          onSave={_handleSaveSet}
        />
      )}
    </main>
  );
}
