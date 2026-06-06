import { call, put, takeLatest } from 'redux-saga/effects';
import { profileApi } from '../../api/profile.api';
import i18n from '../../i18n/config';
import {
  fetchProfileRequest, fetchProfileSuccess, fetchProfileFailure,
  updateProfileRequest, updateProfileSuccess, updateProfileFailure,
  uploadDocumentRequest, uploadDocumentSuccess, uploadDocumentFailure, startDocumentParse,
  updateCvJsonRequest, updateCvJsonSuccess, updateCvJsonFailure,
  updateJdJsonRequest, updateJdJsonSuccess, updateJdJsonFailure,
  fetchDocumentContextRequest, fetchDocumentContextSuccess, fetchDocumentContextFailure,
  fetchAssessmentHistoryRequest, fetchAssessmentHistorySuccess, fetchAssessmentHistoryFailure,
  deleteAssessmentRequest, deleteAssessmentFailure,
} from '../slices/profileSlice';
import { toast } from 'sonner';

// Worker Sagas
function* fetchProfileSaga() {
  try {
    const response = yield call(profileApi.getProfile);
    yield put(fetchProfileSuccess(response));
  } catch (error) {
    yield put(fetchProfileFailure(error.response?.data?.message || i18n.t('profile.toast.fetchFailed')));
  }
}

function* updateProfileSaga(action) {
  try {
    const response = yield call(profileApi.updateProfile, action.payload);
    yield put(updateProfileSuccess(response));
    toast.success(i18n.t('profile.toast.updated'));
  } catch (error) {
    yield put(updateProfileFailure(error.response?.data?.message || i18n.t('profile.toast.updateFailed')));
    toast.error(i18n.t('profile.toast.updateFailed'));
  }
}

function* uploadDocumentSaga(action) {
  try {
    const { file, type } = action.payload;
    const response = yield call(profileApi.uploadDocument, file, type);
    yield put(uploadDocumentSuccess(response));
    // Signal component to open SSE parse stream — jobId is now in store.lastJobId
    yield put(startDocumentParse());
  } catch (error) {
    const message = error.response?.data?.message || i18n.t('profile.toast.unknownError');
    yield put(uploadDocumentFailure(error.response?.data?.message || i18n.t('profile.toast.uploadFailed')));
    toast.error(i18n.t('profile.toast.uploadFailedWithMessage', { message }));
  }
}

function* fetchDocumentContextSaga() {
  try {
    const response = yield call(profileApi.getDocumentContext);
    yield put(fetchDocumentContextSuccess(response));
  } catch {
    yield put(fetchDocumentContextFailure());
  }
}

function* updateCvJsonSaga(action) {
  try {
    yield call(profileApi.updateCvJson, action.payload);
    yield put(updateCvJsonSuccess());
    yield put(fetchDocumentContextRequest());
    toast.success(i18n.t('profile.toast.updated'));
  } catch (error) {
    yield put(updateCvJsonFailure(error.response?.data?.message || i18n.t('profile.toast.updateFailed')));
    toast.error(i18n.t('profile.toast.updateFailed'));
  }
}

function* updateJdJsonSaga(action) {
  try {
    yield call(profileApi.updateJdJson, action.payload);
    yield put(updateJdJsonSuccess());
    yield put(fetchDocumentContextRequest());
    toast.success(i18n.t('profile.toast.updated'));
  } catch (error) {
    yield put(updateJdJsonFailure(error.response?.data?.message || i18n.t('profile.toast.updateFailed')));
    toast.error(i18n.t('profile.toast.updateFailed'));
  }
}

function* fetchAssessmentHistorySaga() {
  try {
    const response = yield call(profileApi.getAssessmentHistory);
    yield put(fetchAssessmentHistorySuccess(response));
  } catch {
    yield put(fetchAssessmentHistoryFailure());
  }
}

function* deleteAssessmentSaga(action) {
  try {
    yield call(profileApi.deleteAssessment, action.payload);
    toast.success(i18n.t('profile.toast.assessmentDeleted'));
  } catch {
    yield put(deleteAssessmentFailure());
    toast.error(i18n.t('profile.toast.deleteFailed'));
    // Re-fetch to restore optimistic removal
    yield put(fetchAssessmentHistoryRequest());
  }
}

// Watcher Saga
export function* watchProfileSaga() {
  yield takeLatest(fetchProfileRequest.type, fetchProfileSaga);
  yield takeLatest(updateProfileRequest.type, updateProfileSaga);
  yield takeLatest(uploadDocumentRequest.type, uploadDocumentSaga);
  yield takeLatest(fetchDocumentContextRequest.type, fetchDocumentContextSaga);
  yield takeLatest(updateCvJsonRequest.type, updateCvJsonSaga);
  yield takeLatest(updateJdJsonRequest.type, updateJdJsonSaga);
  yield takeLatest(fetchAssessmentHistoryRequest.type, fetchAssessmentHistorySaga);
  yield takeLatest(deleteAssessmentRequest.type, deleteAssessmentSaga);
}
