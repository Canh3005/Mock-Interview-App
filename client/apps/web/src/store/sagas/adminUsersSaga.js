import { call, put, select, takeLatest } from 'redux-saga/effects';
import { toast } from 'sonner';
import { adminUsersApi } from '../../api/adminUsers.api';
import {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  fetchUserDetailRequest,
  fetchUserDetailSuccess,
  fetchUserDetailFailure,
  setUserActiveRequest,
  setUserActiveSuccess,
  setUserActiveFailure,
  setFilters,
  setPage,
} from '../slices/adminUsersSlice';

function* fetchUsers() {
  try {
    const { page, limit, filters } = yield select((s) => s.adminUsers);
    const data = yield call(adminUsersApi.list, {
      page,
      limit,
      search: filters.search || undefined,
      isActive: filters.isActive !== '' ? filters.isActive : undefined,
    });
    yield put(fetchUsersSuccess(data));
  } catch (err) {
    yield put(fetchUsersFailure(err?.message ?? 'Lỗi tải danh sách'));
  }
}

function* fetchUserDetail({ payload: id }) {
  try {
    const data = yield call(adminUsersApi.getDetail, id);
    yield put(fetchUserDetailSuccess(data));
  } catch {
    yield put(fetchUserDetailFailure());
  }
}

function* setUserActive({ payload: { id, isActive } }) {
  try {
    if (isActive) {
      yield call(adminUsersApi.activate, id);
    } else {
      yield call(adminUsersApi.suspend, id);
    }
    yield put(setUserActiveSuccess({ id, isActive }));
    toast.success(isActive ? 'Tài khoản đã được kích hoạt' : 'Tài khoản đã bị tạm khóa');
  } catch {
    yield put(setUserActiveFailure());
    toast.error('Thao tác thất bại');
  }
}

export function* watchAdminUsersSaga() {
  yield takeLatest([fetchUsersRequest.type, setFilters.type, setPage.type], fetchUsers);
  yield takeLatest(fetchUserDetailRequest.type, fetchUserDetail);
  yield takeLatest(setUserActiveRequest.type, setUserActive);
}
