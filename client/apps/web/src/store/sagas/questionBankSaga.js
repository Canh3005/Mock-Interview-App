import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { questionBankApi } from '../../api/questionBank.api';
import {
  fetchQuestionProbesFailure,
  fetchQuestionProbeDetailFailure,
  fetchQuestionProbeDetailRequest,
  fetchQuestionProbeDetailSuccess,
  fetchQuestionProbesRequest,
  fetchQuestionProbesSuccess,
  fetchTaxonomyFailure,
  fetchTaxonomyRequest,
  fetchTaxonomySuccess,
  submitQuestionPracticeAttemptFailure,
  submitQuestionPracticeAttemptRequest,
  submitQuestionPracticeAttemptSuccess,
} from '../slices/questionBankSlice';

function _messageFromError(error, fallback) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

function _paramsFromState({ state, page }) {
  const filters = state.questionBank.filters;
  return {
    page: page ?? state.questionBank.page ?? 1,
    limit: state.questionBank.limit ?? 10,
    locale: filters.locale || 'vi',
    language: filters.language || undefined,
    roleFamily: filters.roleFamily || undefined,
    level: filters.level || undefined,
    type: filters.type || undefined,
    competency: filters.competency || undefined,
    techTag: filters.techTag || undefined,
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
    const { probeId, locale, relatedLimit = 3 } = action.payload;
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
  } catch (error) {
    const message = _messageFromError(error, 'Unable to submit your answer.');
    yield put(submitQuestionPracticeAttemptFailure(message));
    toast.error(message);
  }
}

export function* watchQuestionBankSaga() {
  yield takeLatest(fetchTaxonomyRequest.type, _handleFetchTaxonomy);
  yield takeLatest(fetchQuestionProbesRequest.type, _handleFetchProbes);
  yield takeLatest(fetchQuestionProbeDetailRequest.type, _handleFetchProbeDetail);
  yield takeLatest(
    submitQuestionPracticeAttemptRequest.type,
    _handleSubmitPracticeAttempt,
  );
}
