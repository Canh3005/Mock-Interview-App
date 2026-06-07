import { call, put, select, takeLatest, all } from 'redux-saga/effects';
import { adminAnalyticsApi } from '../../api/adminAnalytics.api';
import {
  fetchRevenueRequest, fetchRevenueSuccess, fetchRevenueFailure,
  fetchLlmCostRequest, fetchLlmCostSuccess, fetchLlmCostFailure,
  fetchQuestionUsageRequest, fetchQuestionUsageSuccess, fetchQuestionUsageFailure,
  fetchExamModeRequest, fetchExamModeSuccess, fetchExamModeFailure,
  fetchAnomaliesRequest, fetchAnomaliesSuccess, fetchAnomaliesFailure,
} from '../slices/adminAnalyticsSlice';

function* fetchRevenue() {
  try {
    const period = yield select((s) => s.adminAnalytics.period);
    const data = yield call(adminAnalyticsApi.getRevenue, period);
    yield put(fetchRevenueSuccess(data));
  } catch { yield put(fetchRevenueFailure()); }
}

function* fetchLlmCost() {
  try {
    const period = yield select((s) => s.adminAnalytics.period);
    const data = yield call(adminAnalyticsApi.getLlmCost, period);
    yield put(fetchLlmCostSuccess(data));
  } catch { yield put(fetchLlmCostFailure()); }
}

function* fetchQuestionUsage() {
  try {
    const data = yield call(adminAnalyticsApi.getQuestionUsage, 20);
    yield put(fetchQuestionUsageSuccess(data));
  } catch { yield put(fetchQuestionUsageFailure()); }
}

function* fetchExamMode() {
  try {
    const period = yield select((s) => s.adminAnalytics.period);
    const data = yield call(adminAnalyticsApi.getExamModeUsage, period);
    yield put(fetchExamModeSuccess(data));
  } catch { yield put(fetchExamModeFailure()); }
}

function* fetchAnomalies() {
  try {
    const data = yield call(adminAnalyticsApi.getAnomalies, 1, 20);
    yield put(fetchAnomaliesSuccess(data));
  } catch { yield put(fetchAnomaliesFailure()); }
}

export function* watchAdminAnalyticsSaga() {
  yield takeLatest(fetchRevenueRequest.type, fetchRevenue);
  yield takeLatest(fetchLlmCostRequest.type, fetchLlmCost);
  yield takeLatest(fetchQuestionUsageRequest.type, fetchQuestionUsage);
  yield takeLatest(fetchExamModeRequest.type, fetchExamMode);
  yield takeLatest(fetchAnomaliesRequest.type, fetchAnomalies);
}
