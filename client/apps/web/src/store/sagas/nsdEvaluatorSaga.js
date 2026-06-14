import { call, put, delay, takeLatest } from 'redux-saga/effects';
import { nsdEvaluatorApi } from '../../api/nsdEvaluator.api';
import i18n from '../../i18n/config';
import {
  triggerEvaluation,
  evaluationCompleted,
  evaluationFailed,
} from '../slices/nsdEvaluatorSlice';

const MAX_POLLS = 60;
const POLL_INTERVAL_MS = 2000;

function* _handleTriggerEvaluation(action) {
  const sessionId = action.payload;

  try {
    yield call(nsdEvaluatorApi.enqueue, sessionId);
  } catch (err) {
    yield put(evaluationFailed(err.response?.data?.message || i18n.t('sdRoom.evaluation.errors.startFailed')));
    return;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    yield delay(POLL_INTERVAL_MS);

    let response;
    try {
      response = yield call(nsdEvaluatorApi.getStatus, sessionId);
    } catch {
      continue;
    }

    if (response.status === 'completed') {
      yield put(evaluationCompleted(response.result));
      return;
    }
    if (response.status === 'failed') {
      yield put(evaluationFailed(i18n.t('sdRoom.evaluation.errors.jobFailed')));
      return;
    }
  }

  yield put(evaluationFailed(i18n.t('sdRoom.evaluation.errors.timedOut')));
}

export function* watchNSDEvaluatorSaga() {
  yield takeLatest(triggerEvaluation.type, _handleTriggerEvaluation);
}
