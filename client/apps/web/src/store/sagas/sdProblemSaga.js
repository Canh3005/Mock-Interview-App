import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { sdProblemApi } from '../../api/sdProblem.api';
import i18n from '../../i18n/config';
import {
  fetchSDProblemsRequest,
  fetchSDProblemsSuccess,
  fetchSDProblemsFailure,
  saveSDProblemRequest,
  saveSDProblemSuccess,
  saveSDProblemFailure,
  deleteSDProblemRequest,
  deleteSDProblemSuccess,
  deleteSDProblemFailure,
} from '../slices/sdProblemSlice';

const PAGE_LIMIT = 10;

function* _handleFetch(action) {
  try {
    const response = yield call(sdProblemApi.getList, {
      page: action.payload ?? 1,
      limit: PAGE_LIMIT,
    });
    yield put(fetchSDProblemsSuccess(response));
  } catch {
    const msg = i18n.t('adminSdProblems.toast.loadFailed');
    yield put(fetchSDProblemsFailure(msg));
    toast.error(msg);
  }
}

function* _handleSave(action) {
  const { id, dto, currentPage } = action.payload;
  try {
    if (id) {
      yield call(sdProblemApi.update, { id, data: dto });
      toast.success(i18n.t('adminSdProblems.toast.updated'));
    } else {
      yield call(sdProblemApi.create, dto);
      toast.success(i18n.t('adminSdProblems.toast.created'));
    }
    yield put(saveSDProblemSuccess());
    yield put(fetchSDProblemsRequest(currentPage));
  } catch (error) {
    const msg = error.response?.data?.message || i18n.t('adminSdProblems.toast.saveFailed');
    yield put(saveSDProblemFailure(msg));
    toast.error(msg);
  }
}

function* _handleDelete(action) {
  const { id } = action.payload;
  try {
    yield call(sdProblemApi.remove, id);
    yield put(deleteSDProblemSuccess());
    toast.success(i18n.t('adminSdProblems.toast.deleted'));
    const { problems, page } = yield select((state) => state.sdProblem);
    const targetPage = problems.length === 1 && page > 1 ? page - 1 : page;
    yield put(fetchSDProblemsRequest(targetPage));
  } catch {
    const msg = i18n.t('adminSdProblems.toast.deleteFailed');
    yield put(deleteSDProblemFailure(msg));
    toast.error(msg);
  }
}

export function* watchSDProblemSaga() {
  yield takeLatest(fetchSDProblemsRequest.type, _handleFetch);
  yield takeLatest(saveSDProblemRequest.type, _handleSave);
  yield takeLatest(deleteSDProblemRequest.type, _handleDelete);
}
