import { call, put, select, takeLatest, delay } from 'redux-saga/effects';
import { interviewApi } from '../../api/interview.api';
import { nsdSessionApi } from '../../api/nsdSession';
import i18n from '../../i18n/config';
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
  setCreditError,
} from '../slices/interviewSetupSlice';
import { setBalance } from '../slices/walletSlice';
import { toast } from 'sonner';

const LOW_BALANCE_THRESHOLD = 5;

function* preflightSaga() {
  // Small debounce — absorbs React Strict Mode double-mount in development
  yield delay(50);
  try {
    const data = yield call(interviewApi.preflight);
    yield put(preflightSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || i18n.t('interviewSetup.toast.preflightFailed');
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
    const msg = err.response?.data?.message || i18n.t('interviewSetup.toast.saveContextFailed');
    yield put(saveContextFailure(msg));
    toast.error(msg);
  }
}

function* initSessionSaga() {
  try {
    const { selectedMode, selectedRounds, selectedLanguage, dsaConfig, systemDesignConfig, behavioralConfig } =
      yield select((s) => s.interviewSetup);
    const initPayload = {
      mode: selectedMode,
      rounds: selectedRounds,
      language: selectedLanguage ?? 'vi',
    };

    if (selectedRounds.includes('dsa')) {
      initPayload.dsaProblemCount = dsaConfig.problemCount;
    }

    if (selectedRounds.includes('system_design')) {
      initPayload.systemDesignDurationMinutes = systemDesignConfig.durationMinutes;
    }

    if (selectedRounds.includes('hr_behavioral')) {
      initPayload.behavioralDepth = behavioralConfig.depth;
      initPayload.behavioralDurationMinutes = behavioralConfig.durationMinutes;
    }

    const data = yield call(interviewApi.initSession, initPayload);

    if (typeof data.newBalance === 'number') {
      yield put(setBalance(data.newBalance));
      if (data.newBalance === 0) {
        toast.warning(i18n.t('creditGate.zeroBalanceWarning'));
      } else if (data.newBalance < LOW_BALANCE_THRESHOLD) {
        toast.warning(i18n.t('creditGate.lowBalanceWarning', { balance: data.newBalance }));
      }
    }

    let nsdSessionId = null;
    if (selectedRounds.includes('system_design')) {
      const nsdData = yield call(nsdSessionApi.create, {
        interviewSessionId: data.sessionId,
      });
      nsdSessionId = nsdData.nsdSessionId;
    }

    yield put(initSessionSuccess({ ...data, mode: selectedMode, nsdSessionId }));
  } catch (err) {
    const errData = err.response?.data;
    if (errData?.code === 'INSUFFICIENT_CREDITS') {
      yield put(setCreditError(errData));
      return;
    }
    const msg = errData?.message || i18n.t('interviewSetup.toast.initFailed');
    yield put(initSessionFailure(msg));
    toast.error(msg);
  }
}

export function* watchInterviewSetupSaga() {
  yield takeLatest(preflightRequest.type, preflightSaga);
  yield takeLatest(saveContextRequest.type, saveContextSaga);
  yield takeLatest(initSessionRequest.type, initSessionSaga);
}
