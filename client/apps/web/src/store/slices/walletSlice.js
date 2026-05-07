import { createSlice } from '@reduxjs/toolkit';

const walletSlice = createSlice({
  name: 'wallet',
  initialState: { balance: null, loading: false, error: null },
  reducers: {
    fetchBalanceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBalanceSuccess: (state, action) => {
      state.loading = false;
      state.balance = action.payload;
    },
    fetchBalanceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    resetWallet: (state) => {
      state.balance = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  fetchBalanceRequest,
  fetchBalanceSuccess,
  fetchBalanceFailure,
  resetWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
