import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeInfo,
  CheckCircle2,
  Keyboard,
  Languages,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import SharedNavbar from '../shared/SharedNavbar';
import { SelectField } from '../admin/question-bank/QuestionBankFormFields';
import { ROUTES } from '../../router/routes';
import {
  clearQuestionProbeDetail,
  fetchQuestionProbeDetailRequest,
  pollQuestionPracticeAttemptRequest,
  resetQuestionPracticeAttempt,
  retryQuestionPracticeFeedbackRequest,
  submitQuestionPracticeAttemptRequest,
} from '../../store/slices/questionBankSlice';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import QuestionProbeCard from './QuestionProbeCard';
import QuestionPracticeFeedbackPanel from './QuestionPracticeFeedbackPanel';

const SUPPORTED_LOCALES = ['vi', 'en', 'ja'];
const SPEECH_RECOGNITION_LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
};

function _appLocale(i18n) {
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'vi';
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'vi';
}

function _submissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function _appendVoiceTranscript(baseText, transcript) {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return baseText;
  const cleanBase = baseText.trimEnd();
  return cleanBase ? `${cleanBase}\n${cleanTranscript}` : cleanTranscript;
}

function _taxonomyLabel({ t, group, key }) {
  if (!key) return '';
  return t(`questionBank.taxonomy.${group}.${key}`, { defaultValue: key });
}

function _difficultyLabel({ t, difficulty }) {
  if (!difficulty) return t('questionBank.difficulty.unknown');
  return t(`questionBank.difficulty.${difficulty}`, {
    defaultValue: String(difficulty),
  });
}

function MetadataChip({ children }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error}
    </div>
  );
}

function LocaleSelect({ label, value, onChange }) {
  const { t } = useTranslation();
  const options = SUPPORTED_LOCALES.map((locale) => ({
    key: locale,
    label: t(`questionBank.taxonomy.languages.${locale}`, {
      defaultValue: locale.toUpperCase(),
    }),
  }));

  return (
    <SelectField
      label={label}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}

function DetailHeader({ detail, displayLocale, onDisplayLocaleChange }) {
  const { t } = useTranslation();
  const metadata = [
    ...detail.roleFamilies.map((key) =>
      _taxonomyLabel({ t, group: 'roleFamilies', key }),
    ),
    ...detail.levels.map((key) => _taxonomyLabel({ t, group: 'levels', key })),
    detail.type ? _taxonomyLabel({ t, group: 'types', key: detail.type }) : '',
  ].filter(Boolean);

  return (
    <header className="space-y-4">
      <Link
        to={ROUTES.QUESTION_BANK}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('questionBank.detail.back')}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="font-mono text-xs text-slate-500">
            {detail.code ?? detail.id}
          </p>
          <h1 className="font-heading text-3xl font-bold leading-tight text-white md:text-4xl">
            {detail.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <MetadataChip>{_difficultyLabel({ t, difficulty: detail.difficulty })}</MetadataChip>
            {metadata.map((item) => (
              <MetadataChip key={item}>{item}</MetadataChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              {detail.resolvedLocale.toUpperCase()}
            </span>
            {detail.localeFallbackUsed && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <BadgeInfo className="h-3.5 w-3.5" />
                {t('questionBank.card.fallback')}
              </span>
            )}
          </div>
        </div>

        <div className="w-full max-w-xs">
          <LocaleSelect
            label={t('questionBank.detail.displayLanguage')}
            value={displayLocale}
            onChange={onDisplayLocaleChange}
          />
        </div>
      </div>
    </header>
  );
}

function QuestionContent({ detail }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cta">
          {t('questionBank.detail.question')}
        </p>
        <p className="mt-3 text-xl leading-8 text-white">
          {detail.displayQuestion}
        </p>
      </div>

      {detail.displayIntent && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            {t('questionBank.detail.intent')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {detail.displayIntent}
          </p>
        </section>
      )}

      {detail.guidance?.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            {t('questionBank.detail.guidance')}
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {detail.guidance.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cta" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.commonMistakes?.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            {t('questionBank.detail.commonMistakes')}
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {detail.commonMistakes.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function PracticePanel({
  answerText,
  answerInputMode,
  feedbackLocale,
  isListening,
  isVoiceSupported,
  onAnswerChange,
  onAnswerInputModeChange,
  onFeedbackLocaleChange,
  onSubmit,
  onToggleListening,
  onNewAttempt,
  submitLoading,
  submitError,
  currentAttempt,
}) {
  const { t } = useTranslation();
  const answerIsEmpty = answerText.trim().length === 0;
  const locked = Boolean(currentAttempt) || submitLoading;

  return (
    <aside className="space-y-4 rounded-lg border border-slate-700/70 bg-slate-900/90 p-4 lg:sticky lg:top-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cta/30 bg-cta/10 text-cta">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('questionBank.detail.practiceTitle')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('questionBank.detail.practiceSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <LocaleSelect
        label={t('questionBank.detail.feedbackLanguage')}
        value={feedbackLocale}
        onChange={onFeedbackLocaleChange}
      />

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
        <button
          type="button"
          onClick={() => onAnswerInputModeChange('text')}
          disabled={locked}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            answerInputMode === 'text'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Keyboard className="h-3.5 w-3.5" />
          {t('questionBank.detail.textMode')}
        </button>
        <button
          type="button"
          onClick={() => onAnswerInputModeChange('voice')}
          disabled={locked || !isVoiceSupported}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            answerInputMode === 'voice'
              ? 'bg-cta/20 text-cta'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          {t('questionBank.detail.voiceMode')}
        </button>
      </div>

      <label className="flex flex-col gap-2 text-xs text-slate-400">
        {t('questionBank.detail.answerLabel')}
        <textarea
          value={answerText}
          onChange={(event) => onAnswerChange(event.target.value)}
          rows={12}
          disabled={Boolean(currentAttempt)}
          placeholder={
            answerInputMode === 'voice'
              ? t('questionBank.detail.voicePlaceholder')
              : t('questionBank.detail.answerPlaceholder')
          }
          className="min-h-[260px] resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-6 text-slate-200 outline-none hover:border-slate-500 focus:border-cta focus:ring-2 focus:ring-cta/20 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>

      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs leading-5 text-slate-500">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-slate-300">
            {isListening ? (
              <MicOff className="h-3.5 w-3.5 text-red-300" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            <span>
              {isVoiceSupported
                ? t('questionBank.detail.voiceReadyTitle')
                : t('questionBank.detail.voiceUnsupportedTitle')}
            </span>
          </div>
          {isVoiceSupported && (
            <button
              type="button"
              onClick={onToggleListening}
              disabled={locked || answerInputMode !== 'voice'}
              className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isListening
                  ? 'border-red-400/40 bg-red-400/10 text-red-200'
                  : 'border-cta/40 bg-cta/10 text-cta hover:bg-cta/20'
              }`}
            >
              {isListening ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              {isListening
                ? t('questionBank.detail.stopVoice')
                : t('questionBank.detail.startVoice')}
            </button>
          )}
        </div>
        {isListening
          ? t('questionBank.detail.voiceListeningBody')
          : isVoiceSupported
            ? t('questionBank.detail.voiceReadyBody')
            : t('questionBank.detail.voiceUnsupportedBody')}
      </div>

      <ErrorBanner error={submitError} />

      {currentAttempt ? (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {t('questionBank.detail.submittedTitle')}
          </div>
          <p className="text-xs leading-5 text-emerald-100/80">
            {t('questionBank.detail.submittedBody')}
          </p>
          <button
            type="button"
            onClick={onNewAttempt}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('questionBank.detail.newAttempt')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={answerIsEmpty || submitLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-semibold text-white hover:bg-cta/90 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {submitLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {t('questionBank.detail.submit')}
        </button>
      )}
    </aside>
  );
}

function RelatedQuestions({ questions }) {
  const { t } = useTranslation();
  if (!questions?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white">
        {t('questionBank.detail.related')}
      </h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {questions.map((probe) => (
          <QuestionProbeCard key={probe.id} probe={probe} />
        ))}
      </div>
    </section>
  );
}

function useDarkMode() {
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  return [darkMode, setDarkMode];
}

export default function QuestionProbeDetailPage() {
  const { probeId } = useParams();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useDarkMode();
  const appLocale = useMemo(() => _appLocale(i18n), [i18n.language, i18n.resolvedLanguage]);
  const [displayLocale, setDisplayLocale] = useState(appLocale);
  const [feedbackLocale, setFeedbackLocale] = useState(appLocale);
  const [answerInputMode, setAnswerInputMode] = useState('text');
  const [answerText, setAnswerText] = useState('');
  const [clientSubmissionId, setClientSubmissionId] = useState(_submissionId);
  const voiceBaseTextRef = useRef('');
  const {
    detail,
    detailLoading,
    detailError,
    submitLoading,
    submitError,
    feedbackLoading,
    feedbackError,
    retryFeedbackLoading,
    currentAttempt,
  } = useSelector((state) => state.questionBank);
  const {
    isListening,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    lang: SPEECH_RECOGNITION_LOCALES[displayLocale] ?? 'vi-VN',
    continuous: true,
    silenceTimeout: 10000,
  });

  useEffect(() => {
    setDisplayLocale(appLocale);
    setFeedbackLocale(appLocale);
  }, [appLocale]);

  useEffect(() => {
    if (!probeId) return undefined;
    dispatch(
      fetchQuestionProbeDetailRequest({
        probeId,
        locale: displayLocale,
        relatedLimit: 3,
      }),
    );
    return undefined;
  }, [dispatch, displayLocale, probeId]);

  useEffect(
    () => () => {
      dispatch(clearQuestionProbeDetail());
    },
    [dispatch],
  );

  useEffect(() => {
    if (answerInputMode === 'voice' && transcript) {
      setAnswerText(_appendVoiceTranscript(voiceBaseTextRef.current, transcript));
    }
  }, [answerInputMode, transcript]);

  useEffect(() => {
    if (currentAttempt && isListening) stopListening();
  }, [currentAttempt, isListening, stopListening]);

  useEffect(() => {
    const status = currentAttempt?.status;
    if (!currentAttempt?.attemptId) return undefined;
    if (!['pending_feedback', 'processing'].includes(status)) return undefined;
    dispatch(
      pollQuestionPracticeAttemptRequest({
        attemptId: currentAttempt.attemptId,
      }),
    );
    return undefined;
  }, [currentAttempt?.attemptId, currentAttempt?.status, dispatch]);

  const handleAnswerInputModeChange = useCallback(
    (mode) => {
      setAnswerInputMode(mode);
      if (mode === 'text' && isListening) stopListening();
      if (mode === 'voice') {
        voiceBaseTextRef.current = answerText;
        resetTranscript();
      }
    },
    [answerText, isListening, resetTranscript, stopListening],
  );

  const handleToggleListening = useCallback(() => {
    if (answerInputMode !== 'voice') return;
    if (isListening) {
      stopListening();
      return;
    }
    voiceBaseTextRef.current = answerText;
    resetTranscript();
    startListening();
  }, [
    answerInputMode,
    answerText,
    isListening,
    resetTranscript,
    startListening,
    stopListening,
  ]);

  const handleSubmit = useCallback(() => {
    if (!probeId || answerText.trim().length === 0) return;
    if (isListening) stopListening();
    dispatch(
      submitQuestionPracticeAttemptRequest({
        probeId,
        data: {
          clientSubmissionId,
          answerInputType: answerInputMode,
          answerText,
          displayLocale,
          feedbackLocale,
        },
      }),
    );
  }, [
    answerInputMode,
    answerText,
    clientSubmissionId,
    dispatch,
    displayLocale,
    feedbackLocale,
    isListening,
    probeId,
    stopListening,
  ]);

  const handleNewAttempt = useCallback(() => {
    if (isListening) stopListening();
    setAnswerText('');
    setAnswerInputMode('text');
    voiceBaseTextRef.current = '';
    resetTranscript();
    setClientSubmissionId(_submissionId());
    dispatch(resetQuestionPracticeAttempt());
  }, [dispatch, isListening, resetTranscript, stopListening]);

  const handleRetryFeedback = useCallback(() => {
    if (!currentAttempt?.attemptId) return;
    dispatch(
      retryQuestionPracticeFeedbackRequest({
        attemptId: currentAttempt.attemptId,
      }),
    );
  }, [currentAttempt?.attemptId, dispatch]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300">
        <SharedNavbar
          page="dashboard"
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((value) => !value)}
        />

        <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
          {detailLoading && !detail ? (
            <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t('questionBank.detail.loading')}</span>
            </div>
          ) : null}

          <ErrorBanner error={detailError} />

          {detail ? (
            <>
              <DetailHeader
                detail={detail}
                displayLocale={displayLocale}
                onDisplayLocaleChange={setDisplayLocale}
              />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-6">
                  <QuestionContent detail={detail} />
                  <QuestionPracticeFeedbackPanel
                    attempt={currentAttempt}
                    loading={feedbackLoading}
                    error={feedbackError}
                    retryLoading={retryFeedbackLoading}
                    onRetry={handleRetryFeedback}
                  />
                  <RelatedQuestions questions={detail.relatedQuestions} />
                </div>
                <PracticePanel
                  answerText={answerText}
                  answerInputMode={answerInputMode}
                  feedbackLocale={feedbackLocale}
                  isListening={isListening}
                  isVoiceSupported={isVoiceSupported}
                  onAnswerChange={setAnswerText}
                  onAnswerInputModeChange={handleAnswerInputModeChange}
                  onFeedbackLocaleChange={setFeedbackLocale}
                  onSubmit={handleSubmit}
                  onToggleListening={handleToggleListening}
                  onNewAttempt={handleNewAttempt}
                  submitLoading={submitLoading}
                  submitError={submitError}
                  currentAttempt={currentAttempt}
                />
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
