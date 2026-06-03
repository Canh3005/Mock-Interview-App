import { call, put, select, takeLatest } from 'redux-saga/effects';
import { paymentApi } from '../../api/payment.api';
import i18n from '../../i18n/config';
import {
  fetchPackagesRequest,
  fetchPackagesSuccess,
  fetchPackagesFailure,
  createOrderRequest,
  createOrderSuccess,
  createOrderFailure,
} from '../slices/paymentSlice';

function* _handleFetchPackages() {
  try {
    const res = yield call(paymentApi.getPackages);
    yield put(fetchPackagesSuccess(res.packages));
  } catch (error) {
    const message = error.response?.data?.message || i18n.t('payment.errors.loadPackages');
    yield put(fetchPackagesFailure(message));
  }
}

function* _handleCreateOrder({ payload }) {
  try {
    const res = yield call(paymentApi.createOrder, payload);
    yield put(createOrderSuccess());
    window.location.href = res.redirectUrl;
  } catch (error) {
    const message = error.response?.data?.message || i18n.t('payment.errors.createOrder');
    yield put(createOrderFailure(message));
  }
}

export function* watchPaymentSaga() {
  yield takeLatest(fetchPackagesRequest.type, _handleFetchPackages);
  yield takeLatest(createOrderRequest.type, _handleCreateOrder);
}
