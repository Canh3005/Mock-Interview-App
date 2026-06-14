import { call, put, select, takeLatest, delay } from 'redux-saga/effects';
import { nsdSessionApi } from '../../api/nsdSession';
import i18n from '../../i18n/config';
import {
  loadRequest,
  loadSuccess,
  loadFailure,
  canvasChanged,
  setCanvasJSON,
  autoSaveStart,
  autoSaveSuccess,
  autoSaveFailure,
} from '../slices/nsdSessionSlice';

const AUTO_SAVE_DEBOUNCE_MS = 8000;

function* _handleLoad(action) {
  try {
    const data = yield call(nsdSessionApi.getById, action.payload);
    yield put(loadSuccess(data));
  } catch (err) {
    yield put(loadFailure(err.response?.data?.message || i18n.t('sdRoom.errors.loadSessionFailed')));
  }
}

function* _handleCanvasChanged(action) {
  yield delay(AUTO_SAVE_DEBOUNCE_MS);
  const canvas = action.payload;
  yield put(setCanvasJSON(canvas));

  const { sessionId } = yield select((s) => s.nsdSession);
  if (!sessionId) return;
  try {
    yield put(autoSaveStart());
    yield call(nsdSessionApi.updateCanvas, sessionId, canvas);
    yield put(autoSaveSuccess());
  } catch {
    yield put(autoSaveFailure());
  }
}

export function* watchNSDSessionSaga() {
  yield takeLatest(loadRequest.type, _handleLoad);
  yield takeLatest(canvasChanged.type, _handleCanvasChanged);
}
