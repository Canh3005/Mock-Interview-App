import { call, put, take, race, takeLatest, cancelled } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { toast } from 'sonner';
import { notificationsApi } from '../../api/notifications.api';
import {
  connectSseRequest,
  disconnectSseRequest,
  sseConnected,
  sseDisconnected,
  fetchUnreadRequest,
  fetchUnreadSuccess,
  addNotification,
  markReadRequest,
  markReadSuccess,
  markAllReadRequest,
  markAllReadSuccess,
} from '../slices/notificationsSlice';

// ─── SSE channel ──────────────────────────────────────────────────────────────
function _createNotifChannel() {
  return eventChannel((emit) => {
    let reader = null;
    let abortController = new AbortController();

    notificationsApi.openStream().then((response) => {
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) { emit(END); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                emit(JSON.parse(line.slice(6)));
              } catch { /* ignore malformed */ }
            }
          }
          pump();
        }).catch(() => emit(END));
      }
      pump();
    }).catch(() => emit(END));

    return () => {
      abortController.abort();
      reader?.cancel();
    };
  });
}

// ─── Sagas ────────────────────────────────────────────────────────────────────
function* watchSseStream() {
  const channel = yield call(_createNotifChannel);
  yield put(sseConnected());
  try {
    while (true) {
      const { event, disconnect } = yield race({
        event: take(channel),
        disconnect: take(disconnectSseRequest.type),
      });

      if (disconnect) {
        channel.close();
        break;
      }
      if (!event) break;

      yield put(addNotification(event));

      if (event.type === 'llm_anomaly') {
        toast.warning('Session đang tiêu thụ nhiều tài nguyên AI', {
          description: `Hệ thống ghi nhận ${event.callCount ?? ''} lần gọi AI trong phiên này (ngưỡng: ${event.threshold ?? ''}).`,
          duration: 12000,
          dismissible: true,
        });
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
    yield put(sseDisconnected());
  }
}

function* fetchUnread() {
  try {
    const items = yield call(notificationsApi.getUnread);
    yield put(fetchUnreadSuccess(items));
  } catch { /* silent */ }
}

function* markRead({ payload: id }) {
  try {
    yield call(notificationsApi.markRead, id);
    yield put(markReadSuccess(id));
  } catch { /* silent */ }
}

function* markAllRead() {
  try {
    yield call(notificationsApi.markAllRead);
    yield put(markAllReadSuccess());
  } catch { /* silent */ }
}

export function* watchNotificationsSaga() {
  yield takeLatest(connectSseRequest.type, watchSseStream);
  yield takeLatest(fetchUnreadRequest.type, fetchUnread);
  yield takeLatest(markReadRequest.type, markRead);
  yield takeLatest(markAllReadRequest.type, markAllRead);
}
