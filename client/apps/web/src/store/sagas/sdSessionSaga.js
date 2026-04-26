import { call, put, select, take, fork, takeLatest, delay } from 'redux-saga/effects'
import { eventChannel } from 'redux-saga'
import { sdSessionApi } from '../../api/sdSession'
import {
  loadRequest,
  loadSuccess,
  loadFailure,
  canvasChanged,
  setArchitectureJSON,
  setDirty,
  autoSaveStart,
  autoSaveSuccess,
  autoSaveFailure,
  phaseUpdated,
  appendTranscriptRequest,
  transcriptAppended,
} from '../slices/sdSessionSlice'

function* _handleLoad(action) {
  try {
    const data = yield call(sdSessionApi.getById, action.payload)
    yield put(loadSuccess(data))
    yield fork(_pollPhase)
    yield fork(_autoSaveLoop)
  } catch (err) {
    yield put(loadFailure(err.response?.data?.message || 'Cannot load SD session'))
  }
}

function* _handleCanvasChanged(action) {
  yield delay(2000)
  const { nodes, edges } = action.payload
  yield put(setArchitectureJSON({ nodes, edges }))
  yield put(setDirty(true))
}

function* _autoSaveLoop() {
  const chan = eventChannel((emit) => {
    const id = setInterval(() => emit('TICK'), 30000)
    return () => clearInterval(id)
  })
  try {
    while (true) {
      yield take(chan)
      const { sessionId, architectureJSON, isDirty } = yield select((s) => s.sdSession)
      if (!sessionId || !isDirty || !architectureJSON) continue
      try {
        yield put(autoSaveStart())
        yield call(sdSessionApi.updateArchitecture, sessionId, architectureJSON)
        yield put(autoSaveSuccess())
      } catch {
        yield put(autoSaveFailure())
      }
    }
  } finally {
    chan.close()
  }
}

function* _pollPhase() {
  while (true) {
    yield delay(5000)
    const { sessionId, phase } = yield select((s) => s.sdSession)
    if (!sessionId || phase === 'COMPLETED') break
    try {
      const data = yield call(sdSessionApi.getById, sessionId)
      if (data.phase !== phase) {
        yield put(phaseUpdated(data.phase))
      }
    } catch {
      // non-critical, retry next tick
    }
  }
}

function* _handleAppendTranscript(action) {
  try {
    const { sessionId } = yield select((s) => s.sdSession)
    yield call(sdSessionApi.appendTranscript, sessionId, action.payload)
    yield put(transcriptAppended(action.payload))
  } catch {
    // non-critical, transcript lost is acceptable
  }
}

export function* watchSDSessionSaga() {
  yield takeLatest(loadRequest.type, _handleLoad)
  yield takeLatest(canvasChanged.type, _handleCanvasChanged)
  yield takeLatest(appendTranscriptRequest.type, _handleAppendTranscript)
}
