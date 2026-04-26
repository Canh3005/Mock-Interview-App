import { call, put, select, takeLatest, delay } from 'redux-saga/effects';
import { interviewApi } from '../../api/interview.api';
import { sdSessionApi } from '../../api/sdSession';
import {
  preflightRequest,
  preflightSuccess,
  preflightFailure,
  saveContextRequest,
  saveContextSuccess,
  saveContextFailure,
  initSessionRequest,
  initSessionSuccess,
  initSessionFailure,
} from '../slices/interviewSetupSlice';
import { toast } from 'sonner';

function* preflightSaga() {
  // Small debounce — absorbs React Strict Mode double-mount in development
  yield delay(50);
  try {
    const data = yield call(interviewApi.preflight);
    yield put(preflightSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể kiểm tra ngữ cảnh phỏng vấn.';
    yield put(preflightFailure(msg));
    toast.error(msg);
  }
}

function* saveContextSaga(action) {
  try {
    yield call(interviewApi.updateContext, {
      cv: action.payload.cv,
      jd: action.payload.jd,
    });
    yield put(saveContextSuccess());
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể lưu thông tin CV/JD.';
    yield put(saveContextFailure(msg));
    toast.error(msg);
  }
}

function* initSessionSaga() {
  try {
    const { selectedMode, selectedRounds, selectedLanguage, sdConfig } = yield select(
      (s) => s.interviewSetup,
    );
    const data = yield call(interviewApi.initSession, {
      mode: selectedMode,
      rounds: selectedRounds,
      language: selectedLanguage ?? 'vi',
    });

    let sdSessionId = null;
    if (selectedRounds.includes('system_design')) {
      const sdData = yield call(sdSessionApi.create, {
        interviewSessionId: data.sessionId,
        durationMinutes: sdConfig.durationMinutes,
        enableCurveball: sdConfig.enableCurveball,
      });
      sdSessionId = sdData.sdSessionId;
    }

    yield put(initSessionSuccess({ ...data, mode: selectedMode, sdSessionId }));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể khởi tạo phiên phỏng vấn.';
    yield put(initSessionFailure(msg));
    toast.error(msg);
  }
}

export function* watchInterviewSetupSaga() {
  yield takeLatest(preflightRequest.type, preflightSaga);
  yield takeLatest(saveContextRequest.type, saveContextSaga);
  yield takeLatest(initSessionRequest.type, initSessionSaga);
}
