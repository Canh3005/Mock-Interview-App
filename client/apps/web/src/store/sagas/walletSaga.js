import { call, put, select, takeLatest } from 'redux-saga/effects';
import { walletApi } from '../../api/wallet.api';
import i18n from '../../i18n/config';
import {
  fetchBalanceRequest,
  fetchBalanceSuccess,
  fetchBalanceFailure,
  resetWallet,
  fetchTransactionsRequest,
  fetchTransactionsSuccess,
  appendTransactions,
  fetchTransactionsFailure,
  setTxFilter,
  loadMoreTransactions,
} from '../slices/walletSlice';
import { loginSuccess, registerSuccess, refreshSuccess, logoutSuccess } from '../slices/authSlice';

const TX_LIMIT = 20;

function* _handleFetchBalance() {
  try {
    const res = yield call(walletApi.getBalance);
    yield put(fetchBalanceSuccess(res.balance));
  } catch (error) {
    const message = error.response?.data?.message || i18n.t('wallet.errors.loadBalance');
    yield put(fetchBalanceFailure(message));
  }
}

function* _handleAuthSuccess() {
  yield put(fetchBalanceRequest());
}

function* _handleLogout() {
  yield put(resetWallet());
}

function* _handleFetchTransactions() {
  try {
    const { txFilter } = yield select((s) => s.wallet);
    const res = yield call(walletApi.getTransactions, {
      page: 1,
      limit: TX_LIMIT,
      type: txFilter,
    });
    yield put(fetchTransactionsSuccess(res));
  } catch {
    yield put(fetchTransactionsFailure());
  }
}

function* _handleLoadMore() {
  const { txLoading, txHasMore, txPage, txFilter } = yield select((s) => s.wallet);
  if (txLoading || !txHasMore) return;
  try {
    yield put(fetchTransactionsRequest());
    const res = yield call(walletApi.getTransactions, {
      page: txPage + 1,
      limit: TX_LIMIT,
      type: txFilter,
    });
    yield put(appendTransactions(res));
  } catch {
    yield put(fetchTransactionsFailure());
  }
}

function* _handleSetTxFilter() {
  yield put(fetchTransactionsRequest());
  try {
    const { txFilter } = yield select((s) => s.wallet);
    const res = yield call(walletApi.getTransactions, {
      page: 1,
      limit: TX_LIMIT,
      type: txFilter,
    });
    yield put(fetchTransactionsSuccess(res));
  } catch {
    yield put(fetchTransactionsFailure());
  }
}

export function* watchWalletSaga() {
  yield takeLatest(fetchBalanceRequest.type, _handleFetchBalance);
  yield takeLatest(
    [loginSuccess.type, registerSuccess.type, refreshSuccess.type],
    _handleAuthSuccess,
  );
  yield takeLatest(logoutSuccess.type, _handleLogout);
  yield takeLatest(fetchTransactionsRequest.type, _handleFetchTransactions);
  yield takeLatest(loadMoreTransactions.type, _handleLoadMore);
  yield takeLatest(setTxFilter.type, _handleSetTxFilter);
}
