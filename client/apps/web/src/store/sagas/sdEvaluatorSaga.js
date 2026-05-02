import { call, put, delay, takeLatest } from 'redux-saga/effects';
import { sdEvaluatorApi } from '../../api/sdEvaluator.api';
import {
  triggerEvaluation,
  progressPolled,
  evaluationCompleted,
  evaluationFailed,
} from '../slices/sdEvaluatorSlice';

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 2000;

function* _handleTriggerEvaluation(action) {
  const sessionId = action.payload;

  try {
    yield call(sdEvaluatorApi.enqueue, sessionId);
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to start evaluation';
    yield put(evaluationFailed(message));
    return;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    yield delay(POLL_INTERVAL_MS);

    let response;
    try {
      response = yield call(sdEvaluatorApi.getStatus, sessionId);
    } catch {
      continue;
    }

    if (response.status === 'processing' && response.progress) {
      yield put(progressPolled({ completedDimensions: response.progress.completedDimensions ?? [] }));
    } else if (response.status === 'completed') {
      yield put(evaluationCompleted(response.result));
      return;
    } else if (response.status === 'failed') {
      yield put(evaluationFailed('Evaluation job failed'));
      return;
    }
  }

  yield put(evaluationFailed('Evaluation timed out'));
}

export function* watchSDEvaluatorSaga() {
  yield takeLatest(triggerEvaluation.type, _handleTriggerEvaluation);
}
