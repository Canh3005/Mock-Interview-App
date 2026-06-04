import { createSlice } from '@reduxjs/toolkit';

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: null,
    loading: false,
    error: null,
    transactions: [],
    txTotal: 0,
    txPage: 1,
    txLoading: false,
    txFilter: 'all',
    txHasMore: true,
  },
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
    setBalance: (state, action) => {
      state.balance = action.payload;
    },
    resetWallet: (state) => {
      state.balance = null;
      state.loading = false;
      state.error = null;
      state.transactions = [];
      state.txTotal = 0;
      state.txPage = 1;
      state.txLoading = false;
      state.txFilter = 'all';
      state.txHasMore = true;
    },
    fetchTransactionsRequest: (state) => {
      state.txLoading = true;
    },
    fetchTransactionsSuccess: (state, action) => {
      state.txLoading = false;
      state.transactions = action.payload.data;
      state.txTotal = action.payload.total;
      state.txPage = 1;
      state.txHasMore = action.payload.data.length < action.payload.total;
    },
    appendTransactions: (state, action) => {
      state.txLoading = false;
      state.transactions = [...state.transactions, ...action.payload.data];
      state.txPage = action.payload.page;
      state.txHasMore =
        state.transactions.length < action.payload.total;
    },
    fetchTransactionsFailure: (state) => {
      state.txLoading = false;
    },
    setTxFilter: (state, action) => {
      state.txFilter = action.payload;
      state.transactions = [];
      state.txPage = 1;
      state.txHasMore = true;
    },
    loadMoreTransactions: () => {}, // saga handles this
  },
});

export const {
  fetchBalanceRequest,
  fetchBalanceSuccess,
  fetchBalanceFailure,
  setBalance,
  resetWallet,
  fetchTransactionsRequest,
  fetchTransactionsSuccess,
  appendTransactions,
  fetchTransactionsFailure,
  setTxFilter,
  loadMoreTransactions,
} = walletSlice.actions;

export default walletSlice.reducer;
