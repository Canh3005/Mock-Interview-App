import { call, put, takeLatest, delay } from 'redux-saga/effects';
import { profileApi } from '../../api/profile.api';
import i18n from '../../i18n/config';
import {
  fetchProfileRequest, fetchProfileSuccess, fetchProfileFailure,
  updateProfileRequest, updateProfileSuccess, updateProfileFailure,
  uploadDocumentRequest, uploadDocumentSuccess, uploadDocumentFailure,
  pollJobStatusRequest, pollJobStatusSuccess, pollJobStatusFailure,
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
    
    // Auto-start polling after a successful upload
    yield put(pollJobStatusRequest(response.jobId));
  } catch (error) {
    const message = error.response?.data?.message || i18n.t('profile.toast.unknownError');
    yield put(uploadDocumentFailure(error.response?.data?.message || i18n.t('profile.toast.uploadFailed')));
    toast.error(i18n.t('profile.toast.uploadFailedWithMessage', { message }));
  }
}

function* pollJobStatusSaga(action) {
  const jobId = action.payload;
  let isPolling = true;

  while (isPolling) {
    try {
      const response = yield call(profileApi.getJobStatus, jobId);
      const { status, result, failedReason } = response;
      
      yield put(pollJobStatusSuccess({ status, result }));

      if (status === 'completed') {
        isPolling = false;
        toast.success(i18n.t('profile.toast.processingComplete'));
        // After parsing is done, refresh the entire profile to reflect new DB state
        yield put(fetchProfileRequest());
      } else if (status === 'failed') {
        isPolling = false;
        const message = failedReason || i18n.t('profile.toast.unknownError');
        yield put(pollJobStatusFailure(failedReason || i18n.t('profile.toast.jobFailed')));
        toast.error(i18n.t('profile.toast.processingFailedWithMessage', { message }));
      } else if (status === 'not_found' || !status) {
        isPolling = false;
        yield put(pollJobStatusFailure(i18n.t('profile.toast.jobNotFound')));
      } else {
        // waiting, active, delayed => wait and poll again
        yield delay(2000); // 2 seconds between polls
      }
    } catch (error) {
      isPolling = false;
      yield put(pollJobStatusFailure(error.message));
      toast.error(i18n.t('profile.toast.jobStatusFailed'));
    }
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
  yield takeLatest(pollJobStatusRequest.type, pollJobStatusSaga);
  yield takeLatest(fetchAssessmentHistoryRequest.type, fetchAssessmentHistorySaga);
  yield takeLatest(deleteAssessmentRequest.type, deleteAssessmentSaga);
}
