import { createSlice } from '@reduxjs/toolkit';

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    packages: [],
    packagesLoading: false,
    packagesError: null,
    selectedPackageId: null,
    selectedMethod: 'momo',
    ordering: false,
    orderError: null,
  },
  reducers: {
    fetchPackagesRequest: (state) => {
      state.packagesLoading = true;
      state.packagesError = null;
    },
    fetchPackagesSuccess: (state, action) => {
      state.packagesLoading = false;
      state.packages = action.payload;
    },
    fetchPackagesFailure: (state, action) => {
      state.packagesLoading = false;
      state.packagesError = action.payload;
    },
    selectPackage: (state, action) => {
      state.selectedPackageId = action.payload;
    },
    selectMethod: (state, action) => {
      state.selectedMethod = action.payload;
    },
    createOrderRequest: (state) => {
      state.ordering = true;
      state.orderError = null;
    },
    createOrderSuccess: (state) => {
      state.ordering = false;
    },
    createOrderFailure: (state, action) => {
      state.ordering = false;
      state.orderError = action.payload;
    },
    clearOrderError: (state) => {
      state.orderError = null;
    },
    resetPayment: (state) => {
      state.selectedPackageId = null;
      state.selectedMethod = 'momo';
      state.ordering = false;
      state.orderError = null;
    },
  },
});

export const {
  fetchPackagesRequest,
  fetchPackagesSuccess,
  fetchPackagesFailure,
  selectPackage,
  selectMethod,
  createOrderRequest,
  createOrderSuccess,
  createOrderFailure,
  clearOrderError,
  resetPayment,
} = paymentSlice.actions;

export default paymentSlice.reducer;
