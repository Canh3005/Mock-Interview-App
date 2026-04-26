import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { sdProblemApi } from '../../api/sdProblem.api';
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
    const msg = 'Không thể tải danh sách problem.';
    yield put(fetchSDProblemsFailure(msg));
    toast.error(msg);
  }
}

function* _handleSave(action) {
  const { id, dto, currentPage } = action.payload;
  try {
    if (id) {
      yield call(sdProblemApi.update, { id, data: dto });
      toast.success('Đã cập nhật problem.');
    } else {
      yield call(sdProblemApi.create, dto);
      toast.success('Đã tạo problem mới.');
    }
    yield put(saveSDProblemSuccess());
    yield put(fetchSDProblemsRequest(currentPage));
  } catch (error) {
    const msg = error.response?.data?.message || 'Lưu thất bại.';
    yield put(saveSDProblemFailure(msg));
    toast.error(msg);
  }
}

function* _handleDelete(action) {
  const { id } = action.payload;
  try {
    yield call(sdProblemApi.remove, id);
    yield put(deleteSDProblemSuccess());
    toast.success('Đã xóa problem.');
    const { problems, page } = yield select((state) => state.sdProblem);
    const targetPage = problems.length === 1 && page > 1 ? page - 1 : page;
    yield put(fetchSDProblemsRequest(targetPage));
  } catch {
    const msg = 'Xóa thất bại.';
    yield put(deleteSDProblemFailure(msg));
    toast.error(msg);
  }
}

export function* watchSDProblemSaga() {
  yield takeLatest(fetchSDProblemsRequest.type, _handleFetch);
  yield takeLatest(saveSDProblemRequest.type, _handleSave);
  yield takeLatest(deleteSDProblemRequest.type, _handleDelete);
}
