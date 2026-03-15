import { call, put, takeLatest, delay, select } from 'redux-saga/effects';
import { profileApi } from '../../api/profile.api';
import {
  fetchProfileRequest, fetchProfileSuccess, fetchProfileFailure,
  updateProfileRequest, updateProfileSuccess, updateProfileFailure,
  uploadDocumentRequest, uploadDocumentSuccess, uploadDocumentFailure,
  pollJobStatusRequest, pollJobStatusSuccess, pollJobStatusFailure
} from '../slices/profileSlice';
import { toast } from 'sonner';

// Worker Sagas
function* fetchProfileSaga() {
  try {
    const response = yield call(profileApi.getProfile);
    yield put(fetchProfileSuccess(response));
  } catch (error) {
    yield put(fetchProfileFailure(error.response?.data?.message || 'Failed to fetch profile'));
  }
}

function* updateProfileSaga(action) {
  try {
    const response = yield call(profileApi.updateProfile, action.payload);
    yield put(updateProfileSuccess(response));
    toast.success('Profile updated successfully');
  } catch (error) {
    yield put(updateProfileFailure(error.response?.data?.message || 'Failed to update profile'));
    toast.error('Failed to update profile');
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
    yield put(uploadDocumentFailure(error.response?.data?.message || 'Failed to upload document'));
    toast.error('Upload failed: ' + (error.response?.data?.message || 'Unknown error'));
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
        toast.success('AI Processing Complete!');
        // After parsing is done, refresh the entire profile to reflect new DB state
        yield put(fetchProfileRequest());
      } else if (status === 'failed') {
        isPolling = false;
        yield put(pollJobStatusFailure(failedReason || 'Job failed'));
        toast.error('AI Processing Failed: ' + (failedReason || 'Unknown error'));
      } else if (status === 'not_found' || !status) {
        isPolling = false;
        yield put(pollJobStatusFailure('Job not found'));
      } else {
        // waiting, active, delayed => wait and poll again
        yield delay(2000); // 2 seconds between polls
      }
    } catch (error) {
      isPolling = false;
      yield put(pollJobStatusFailure(error.message));
      toast.error('Failed to check job status');
    }
  }
}

// Watcher Saga
export function* watchProfileSaga() {
  yield takeLatest(fetchProfileRequest.type, fetchProfileSaga);
  yield takeLatest(updateProfileRequest.type, updateProfileSaga);
  yield takeLatest(uploadDocumentRequest.type, uploadDocumentSaga);
  yield takeLatest(pollJobStatusRequest.type, pollJobStatusSaga);
}
