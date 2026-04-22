import { call, put, takeLatest } from 'redux-saga/effects';
import axiosClient from '../../api/axiosClient';
import {
  fetchProblemsStart,
  fetchProblemsSuccess,
  fetchProblemsFailure,
  fetchProblemByIdStart,
  fetchProblemByIdSuccess,
  fetchProblemByIdFailure,
  createProblemStart,
  createProblemSuccess,
  createProblemFailure,
  updateProblemStart,
  updateProblemSuccess,
  updateProblemFailure,
  deleteProblemStart,
  deleteProblemSuccess,
  deleteProblemFailure,
  verifyProblemStart,
  verifyProblemSuccess,
  verifyProblemFailure,
  importProblemsStart,
  importProblemsSuccess,
  importProblemsFailure
} from '../slices/adminProblemsSlice';

function* fetchProblemsSaga(action) {
  try {
    const { page, limit, search, difficulty } = action.payload || {};
    const response = yield call(axiosClient.get, '/admin/problems', {
      params: { page, limit, search, difficulty }
    });
    yield put(fetchProblemsSuccess(response));
  } catch (error) {
    yield put(fetchProblemsFailure(error.message));
  }
}

function* fetchProblemByIdSaga(action) {
  try {
    const response = yield call(axiosClient.get, `/admin/problems/${action.payload}`);
    yield put(fetchProblemByIdSuccess(response));
  } catch (error) {
    yield put(fetchProblemByIdFailure(error.message));
  }
}

function* createProblemSaga(action) {
  try {
    const response = yield call(axiosClient.post, '/admin/problems', action.payload);
    yield put(createProblemSuccess(response));
    // Optional: trigger fetch problems again or navigate
  } catch (error) {
    yield put(createProblemFailure(error.message));
  }
}

function* updateProblemSaga(action) {
  try {
    const { id, data } = action.payload;
    yield call(axiosClient.patch, `/admin/problems/${id}`, data);
    // Re-fetch to get fresh DB state with all relations (templates, testCases)
    const fresh = yield call(axiosClient.get, `/admin/problems/${id}`);
    yield put(updateProblemSuccess(fresh));
  } catch (error) {
    yield put(updateProblemFailure(error.message));
  }
}

function* deleteProblemSaga(action) {
  try {
    yield call(axiosClient.delete, `/admin/problems/${action.payload}`);
    yield put(deleteProblemSuccess(action.payload));
    // Optionally trigger a re-fetch of the problem list
    yield put(fetchProblemsStart({ page: 1, limit: 10 }));
  } catch (error) {
    yield put(deleteProblemFailure(error.message));
  }
}

function* verifyProblemSaga(action) {
  try {
    const { id, templates, testCases } = action.payload;
    const response = yield call(axiosClient.post, `/admin/problems/${id}/verify`, { templates, testCases });
    yield put(verifyProblemSuccess(response));
    yield put(fetchProblemByIdStart(id));
  } catch (error) {
    yield put(verifyProblemFailure(error.response?.data?.message || error.message));
  }
}

function* importProblemsSaga(action) {
  try {
    const response = yield call(axiosClient.post, '/admin/problems/import', action.payload);
    yield put(importProblemsSuccess(response));
    yield put(fetchProblemsStart({ page: 1, limit: 10 }));
    // We can handle the toast alert in the UI component, or here
    alert(`Import hoàn tất! Thành công: ${response.successful}, Thất bại: ${response.failed}\n${response.failed > 0 ? JSON.stringify(response.errors) : ''}`);
  } catch (error) {
    yield put(importProblemsFailure(error.response?.data?.message || error.message));
    alert(`Lỗi import: ${error.message}`);
  }
}

export function* watchAdminProblemsSaga() {
  yield takeLatest(fetchProblemsStart.type, fetchProblemsSaga);
  yield takeLatest(fetchProblemByIdStart.type, fetchProblemByIdSaga);
  yield takeLatest(createProblemStart.type, createProblemSaga);
  yield takeLatest(updateProblemStart.type, updateProblemSaga);
  yield takeLatest(deleteProblemStart.type, deleteProblemSaga);
  yield takeLatest(verifyProblemStart.type, verifyProblemSaga);
  yield takeLatest(importProblemsStart.type, importProblemsSaga);
}
