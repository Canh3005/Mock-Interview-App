import { call, delay, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { questionBankApi } from '../../api/questionBank.api';
import {
  fetchQuestionProbesFailure,
  fetchQuestionProbeDetailFailure,
  fetchQuestionProbeDetailRequest,
  fetchQuestionProbeDetailSuccess,
  fetchQuestionPracticeAttemptFailure,
  fetchQuestionPracticeAttemptRequest,
  fetchQuestionPracticeAttemptSuccess,
  fetchQuestionProbesRequest,
  fetchQuestionProbesSuccess,
  fetchTaxonomyFailure,
  fetchTaxonomyRequest,
  fetchTaxonomySuccess,
  pollQuestionPracticeAttemptRequest,
  retryQuestionPracticeFeedbackFailure,
  retryQuestionPracticeFeedbackRequest,
  retryQuestionPracticeFeedbackSuccess,
  submitQuestionPracticeAttemptFailure,
  submitQuestionPracticeAttemptRequest,
  submitQuestionPracticeAttemptSuccess,
  QUESTION_BANK_PAGE_SIZE,
} from '../slices/questionBankSlice';

const POLL_DELAY_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

function _messageFromError(error, fallback) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

function _isTerminalAttempt(attempt) {
  return ['feedback_ready', 'feedback_failed'].includes(attempt?.status);
}

function _paramsFromState({ state, page }) {
  const filters = state.questionBank.filters;
  return {
    page: page ?? state.questionBank.page ?? 1,
    limit: state.questionBank.limit ?? QUESTION_BANK_PAGE_SIZE,
    locale: filters.locale || 'vi',
    language: filters.language || undefined,
    stage: filters.stage || undefined,
    roleFamily: filters.roleFamily || undefined,
    level: filters.level || undefined,
    type: filters.type || undefined,
    competency: filters.competency || undefined,
    techTags: filters.techTags?.length ? filters.techTags.join(',') : undefined,
    difficulty: filters.difficulty || undefined,
    search: filters.search || undefined,
    sort: filters.sort || 'newest',
  };
}

function* _handleFetchTaxonomy() {
  try {
    const response = yield call(questionBankApi.getTaxonomy);
    yield put(fetchTaxonomySuccess(response));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to load taxonomy.');
    yield put(fetchTaxonomyFailure(message));
    toast.error(message);
  }
}

function* _handleFetchProbes(action) {
  try {
    const state = yield select();
    const params = _paramsFromState({
      state,
      page: action.payload?.page,
    });
    const response = yield call(questionBankApi.getProbes, params);
    yield put(fetchQuestionProbesSuccess(response));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to load question bank.');
    yield put(fetchQuestionProbesFailure(message));
    toast.error(message);
  }
}

function* _handleFetchProbeDetail(action) {
  try {
    const { probeId, locale, relatedLimit = 4 } = action.payload;
    const response = yield call(questionBankApi.getProbeDetail, {
      probeId,
      params: { locale, relatedLimit },
    });
    yield put(fetchQuestionProbeDetailSuccess(response));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to load question detail.');
    yield put(fetchQuestionProbeDetailFailure(message));
    toast.error(message);
  }
}

function* _handleSubmitPracticeAttempt(action) {
  try {
    const { probeId, data } = action.payload;
    const response = yield call(questionBankApi.submitPracticeAttempt, {
      probeId,
      data,
    });
    yield put(submitQuestionPracticeAttemptSuccess(response));
    toast.success('Answer submitted. Feedback is being prepared.');
    yield put(pollQuestionPracticeAttemptRequest({ attemptId: response.attemptId }));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to submit your answer.');
    yield put(submitQuestionPracticeAttemptFailure(message));
    toast.error(message);
  }
}

function* _handleFetchPracticeAttempt(action) {
  try {
    const { attemptId } = action.payload;
    const response = yield call(questionBankApi.getPracticeAttempt, {
      attemptId,
    });
    yield put(fetchQuestionPracticeAttemptSuccess(response));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to load feedback.');
    yield put(fetchQuestionPracticeAttemptFailure(message));
    toast.error(message);
  }
}

function* _handlePollPracticeAttempt(action) {
  const { attemptId } = action.payload;
  let attempts = 0;
  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts += 1;
    try {
      const response = yield call(questionBankApi.getPracticeAttempt, {
        attemptId,
      });
      const activeAttemptId = yield select(
        (state) => state.questionBank.currentAttempt?.attemptId,
      );
      if (activeAttemptId !== attemptId) break;
      yield put(fetchQuestionPracticeAttemptSuccess(response));
      if (_isTerminalAttempt(response)) break;
    } catch (error) {
      const message = _messageFromError(error, 'Unable to load feedback.');
      yield put(fetchQuestionPracticeAttemptFailure(message));
      break;
    }
    yield delay(POLL_DELAY_MS);
  }
}

function* _handleRetryPracticeFeedback(action) {
  try {
    const { attemptId } = action.payload;
    const response = yield call(questionBankApi.retryPracticeFeedback, {
      attemptId,
    });
    yield put(retryQuestionPracticeFeedbackSuccess(response));
    toast.success('Feedback retry started.');
    yield put(pollQuestionPracticeAttemptRequest({ attemptId }));
  } catch (error) {
    const message = _messageFromError(error, 'Unable to retry feedback.');
    yield put(retryQuestionPracticeFeedbackFailure(message));
    toast.error(message);
  }
}

export function* watchQuestionBankSaga() {
  yield takeLatest(fetchTaxonomyRequest.type, _handleFetchTaxonomy);
  yield takeLatest(fetchQuestionProbesRequest.type, _handleFetchProbes);
  yield takeLatest(fetchQuestionProbeDetailRequest.type, _handleFetchProbeDetail);
  yield takeLatest(
    fetchQuestionPracticeAttemptRequest.type,
    _handleFetchPracticeAttempt,
  );
  yield takeLatest(
    pollQuestionPracticeAttemptRequest.type,
    _handlePollPracticeAttempt,
  );
  yield takeLatest(
    retryQuestionPracticeFeedbackRequest.type,
    _handleRetryPracticeFeedback,
  );
  yield takeLatest(
    submitQuestionPracticeAttemptRequest.type,
    _handleSubmitPracticeAttempt,
  );
}
