import { call, put, select, takeLatest } from 'redux-saga/effects';
import { interviewApi } from '../../api/interview.api';
import {
  preflightRequest,
  preflightSuccess,
  preflightFailure,
  initSessionRequest,
  initSessionSuccess,
  initSessionFailure,
} from '../slices/interviewSetupSlice';
import { toast } from 'sonner';

function* preflightSaga() {
  try {
    const data = yield call(interviewApi.preflight);
    yield put(preflightSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể kiểm tra ngữ cảnh phỏng vấn.';
    yield put(preflightFailure(msg));
    toast.error(msg);
  }
}

function* initSessionSaga() {
  try {
    const { selectedMode, selectedRounds } = yield select(
      (s) => s.interviewSetup,
    );
    const data = yield call(interviewApi.initSession, {
      mode: selectedMode,
      rounds: selectedRounds,
    });
    yield put(initSessionSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể khởi tạo phiên phỏng vấn.';
    yield put(initSessionFailure(msg));
    toast.error(msg);
  }
}

export function* watchInterviewSetupSaga() {
  yield takeLatest(preflightRequest.type, preflightSaga);
  yield takeLatest(initSessionRequest.type, initSessionSaga);
}
