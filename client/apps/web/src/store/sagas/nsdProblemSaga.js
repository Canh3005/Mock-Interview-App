import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { nsdProblemApi } from '../../api/nsdProblem.api';
import i18n from '../../i18n/config';
import {
  deleteNSDProblemFailure,
  deleteNSDProblemRequest,
  deleteNSDProblemSuccess,
  fetchNSDProblemsFailure,
  fetchNSDProblemsRequest,
  fetchNSDProblemsSuccess,
  saveNSDProblemFailure,
  saveNSDProblemRequest,
  saveNSDProblemSuccess,
} from '../slices/nsdProblemSlice';

const PAGE_LIMIT = 10;

function* handleFetch(action) {
  try {
    const response = yield call(nsdProblemApi.getList, {
      page: action.payload ?? 1,
      limit: PAGE_LIMIT,
    });
    yield put(fetchNSDProblemsSuccess(response));
  } catch {
    const msg = i18n.t('adminSdProblems.toast.loadFailed');
    yield put(fetchNSDProblemsFailure(msg));
    toast.error(msg);
  }
}

function* handleSave(action) {
  const { id, dto, currentPage } = action.payload;
  try {
    if (id) {
      yield call(nsdProblemApi.update, { id, data: dto });
      toast.success(i18n.t('adminSdProblems.toast.updated'));
    } else {
      yield call(nsdProblemApi.create, dto);
      toast.success(i18n.t('adminSdProblems.toast.created'));
    }
    yield put(saveNSDProblemSuccess());
    yield put(fetchNSDProblemsRequest(currentPage));
  } catch (error) {
    const msg = error.response?.data?.message || i18n.t('adminSdProblems.toast.saveFailed');
    yield put(saveNSDProblemFailure(msg));
    toast.error(msg);
  }
}

function* handleDelete(action) {
  const { id } = action.payload;
  try {
    yield call(nsdProblemApi.remove, id);
    yield put(deleteNSDProblemSuccess());
    toast.success(i18n.t('adminSdProblems.toast.deleted'));
    const { problems, page } = yield select((state) => state.nsdProblem);
    const targetPage = problems.length === 1 && page > 1 ? page - 1 : page;
    yield put(fetchNSDProblemsRequest(targetPage));
  } catch {
    const msg = i18n.t('adminSdProblems.toast.deleteFailed');
    yield put(deleteNSDProblemFailure(msg));
    toast.error(msg);
  }
}

export function* watchNSDProblemSaga() {
  yield takeLatest(fetchNSDProblemsRequest.type, handleFetch);
  yield takeLatest(saveNSDProblemRequest.type, handleSave);
  yield takeLatest(deleteNSDProblemRequest.type, handleDelete);
}
