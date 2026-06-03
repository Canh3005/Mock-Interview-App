import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { questionBankAdminApi } from '../../api/questionBankAdmin.api';
import i18n from '../../i18n/config';
import {
  fetchInterviewSetsFailure,
  fetchInterviewSetsRequest,
  fetchInterviewSetsSuccess,
  fetchProbesFailure,
  fetchProbesRequest,
  fetchProbesSuccess,
  fetchTaxonomyFailure,
  fetchTaxonomyRequest,
  fetchTaxonomySuccess,
  saveInterviewSetFailure,
  saveInterviewSetRequest,
  saveInterviewSetSuccess,
  saveProbeFailure,
  saveProbeRequest,
  saveProbeSuccess,
  transitionInterviewSetFailure,
  transitionInterviewSetRequest,
  transitionInterviewSetSuccess,
  transitionProbeFailure,
  transitionProbeRequest,
  transitionProbeSuccess,
} from '../slices/questionBankAdminSlice';

function _formatIssues(issues) {
  return issues
    .map((issue) => (issue.field ? `${issue.field}: ${issue.message}` : issue.message))
    .join('; ');
}

function _messageFromError(error, fallback) {
  const data = error.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') {
    if (Array.isArray(data?.issues)) return `${message}: ${_formatIssues(data.issues)}`;
    return message;
  }
  if (message && typeof message === 'object') {
    const baseMessage = typeof message.message === 'string' ? message.message : fallback;
    if (Array.isArray(message.issues)) return `${baseMessage}: ${_formatIssues(message.issues)}`;
    return baseMessage;
  }
  if (Array.isArray(data?.issues)) return _formatIssues(data.issues);
  return fallback;
}

function* _handleFetchTaxonomy() {
  try {
    const response = yield call(questionBankAdminApi.getTaxonomy);
    yield put(fetchTaxonomySuccess(response));
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.loadTaxonomyFailed'));
    yield put(fetchTaxonomyFailure(message));
    toast.error(message);
  }
}

function* _handleFetchProbes(action) {
  try {
    const state = yield select((s) => s.questionBankAdmin);
    const filters = state.filters;
    const response = yield call(questionBankAdminApi.getProbes, {
      page: action.payload?.page ?? state.page ?? 1,
      limit: state.limit ?? 10,
      status: filters.status || undefined,
      roleFamily: filters.roleFamily || undefined,
      level: filters.level || undefined,
      type: filters.type || undefined,
      competency: filters.competency || undefined,
      search: filters.search || undefined,
    });
    yield put(fetchProbesSuccess(response));
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.loadProbesFailed'));
    yield put(fetchProbesFailure(message));
    toast.error(message);
  }
}

function* _handleSaveProbe(action) {
  const { id, data } = action.payload;
  try {
    if (id) {
      yield call(questionBankAdminApi.updateProbe, { id, data });
      toast.success(i18n.t('adminQuestionBank.toast.probeUpdated'));
    } else {
      yield call(questionBankAdminApi.createProbe, data);
      toast.success(i18n.t('adminQuestionBank.toast.probeCreated'));
    }
    yield put(saveProbeSuccess());
    yield put(fetchProbesRequest());
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.saveProbeFailed'));
    yield put(saveProbeFailure(message));
    toast.error(message);
  }
}

function* _handleTransitionProbe(action) {
  try {
    yield call(questionBankAdminApi.transitionProbe, action.payload);
    yield put(transitionProbeSuccess());
    toast.success(i18n.t('adminQuestionBank.toast.probeStatusUpdated'));
    yield put(fetchProbesRequest());
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.updateProbeStatusFailed'));
    yield put(transitionProbeFailure(message));
    toast.error(message);
  }
}

function* _handleFetchInterviewSets(action) {
  try {
    const state = yield select((s) => s.questionBankAdmin);
    const filters = state.setFilters;
    const response = yield call(questionBankAdminApi.getInterviewSets, {
      page: action.payload?.page ?? state.setsPage ?? 1,
      limit: state.setsLimit ?? 10,
      status: filters.status || undefined,
      roleFamily: filters.roleFamily || undefined,
      level: filters.level || undefined,
      search: filters.search || undefined,
    });
    yield put(fetchInterviewSetsSuccess(response));
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.loadSetsFailed'));
    yield put(fetchInterviewSetsFailure(message));
    toast.error(message);
  }
}

function* _handleSaveInterviewSet(action) {
  const { id, data } = action.payload;
  try {
    if (id) {
      yield call(questionBankAdminApi.updateInterviewSet, { id, data });
      toast.success(i18n.t('adminQuestionBank.toast.setUpdated'));
    } else {
      yield call(questionBankAdminApi.createInterviewSet, data);
      toast.success(i18n.t('adminQuestionBank.toast.setCreated'));
    }
    yield put(saveInterviewSetSuccess());
    yield put(fetchInterviewSetsRequest());
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.saveSetFailed'));
    yield put(saveInterviewSetFailure(message));
    toast.error(message);
  }
}

function* _handleTransitionInterviewSet(action) {
  try {
    yield call(questionBankAdminApi.transitionInterviewSet, action.payload);
    yield put(transitionInterviewSetSuccess());
    toast.success(i18n.t('adminQuestionBank.toast.setStatusUpdated'));
    yield put(fetchInterviewSetsRequest());
  } catch (error) {
    const message = _messageFromError(error, i18n.t('adminQuestionBank.toast.updateSetStatusFailed'));
    yield put(transitionInterviewSetFailure(message));
    toast.error(message);
  }
}

export function* watchQuestionBankAdminSaga() {
  yield takeLatest(fetchTaxonomyRequest.type, _handleFetchTaxonomy);
  yield takeLatest(fetchProbesRequest.type, _handleFetchProbes);
  yield takeLatest(saveProbeRequest.type, _handleSaveProbe);
  yield takeLatest(transitionProbeRequest.type, _handleTransitionProbe);
  yield takeLatest(fetchInterviewSetsRequest.type, _handleFetchInterviewSets);
  yield takeLatest(saveInterviewSetRequest.type, _handleSaveInterviewSet);
  yield takeLatest(transitionInterviewSetRequest.type, _handleTransitionInterviewSet);
}
