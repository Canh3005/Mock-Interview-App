import { call, put, select, takeLatest, delay } from 'redux-saga/effects'
import { sdSessionApi } from '../../api/sdSession'
import i18n from '../../i18n/config'
import {
  loadRequest,
  loadSuccess,
  loadFailure,
  canvasChanged,
  setArchitectureJSON,
  autoSaveStart,
  autoSaveSuccess,
  autoSaveFailure,
} from '../slices/sdSessionSlice'

const AUTO_SAVE_DEBOUNCE_MS = 8000

function* _handleLoad(action) {
  try {
    const data = yield call(sdSessionApi.getById, action.payload)
    yield put(loadSuccess(data))
  } catch (err) {
    yield put(loadFailure(err.response?.data?.message || i18n.t('sdRoom.errors.loadSessionFailed')))
  }
}

function* _handleCanvasChanged(action) {
  yield delay(AUTO_SAVE_DEBOUNCE_MS)
  const { nodes, edges } = action.payload
  yield put(setArchitectureJSON({ nodes, edges }))

  const { sessionId } = yield select((s) => s.sdSession)
  if (!sessionId) return
  try {
    yield put(autoSaveStart())
    yield call(sdSessionApi.updateArchitecture, sessionId, { nodes, edges })
    yield put(autoSaveSuccess())
  } catch {
    yield put(autoSaveFailure())
  }
}

export function* watchSDSessionSaga() {
  yield takeLatest(loadRequest.type, _handleLoad)
  yield takeLatest(canvasChanged.type, _handleCanvasChanged)
}
