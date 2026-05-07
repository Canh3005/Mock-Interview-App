import { call, put, takeLatest } from 'redux-saga/effects';
import { walletApi } from '../../api/wallet.api';
import {
  fetchBalanceRequest,
  fetchBalanceSuccess,
  fetchBalanceFailure,
  resetWallet,
} from '../slices/walletSlice';
import { loginSuccess, registerSuccess, refreshSuccess, logoutSuccess } from '../slices/authSlice';

function* _handleFetchBalance() {
  try {
    const res = yield call(walletApi.getBalance);
    yield put(fetchBalanceSuccess(res.balance));
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load balance';
    yield put(fetchBalanceFailure(message));
  }
}

function* _handleAuthSuccess() {
  yield put(fetchBalanceRequest());
}

function* _handleLogout() {
  yield put(resetWallet());
}

export function* watchWalletSaga() {
  yield takeLatest(fetchBalanceRequest.type, _handleFetchBalance);
  yield takeLatest(
    [loginSuccess.type, registerSuccess.type, refreshSuccess.type],
    _handleAuthSuccess,
  );
  yield takeLatest(logoutSuccess.type, _handleLogout);
}
