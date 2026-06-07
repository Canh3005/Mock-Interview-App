import { createSlice } from '@reduxjs/toolkit';

const adminUsersSlice = createSlice({
  name: 'adminUsers',
  initialState: {
    users: [],
    total: 0,
    page: 1,
    limit: 20,
    filters: { search: '', isActive: '' },
    loading: false,
    selectedUser: null,
    detailLoading: false,
    actionLoading: false,
    error: null,
  },
  reducers: {
    fetchUsersRequest: (state) => { state.loading = true; state.error = null; },
    fetchUsersSuccess: (state, { payload }) => {
      state.loading = false;
      state.users = payload.data;
      state.total = payload.total;
      state.page = payload.page;
      state.limit = payload.limit;
    },
    fetchUsersFailure: (state, { payload }) => { state.loading = false; state.error = payload; },

    setFilters: (state, { payload }) => {
      state.filters = { ...state.filters, ...payload };
      state.page = 1;
    },
    setPage: (state, { payload }) => { state.page = payload; },

    fetchUserDetailRequest: (state) => { state.detailLoading = true; state.selectedUser = null; },
    fetchUserDetailSuccess: (state, { payload }) => { state.detailLoading = false; state.selectedUser = payload; },
    fetchUserDetailFailure: (state) => { state.detailLoading = false; },

    setUserActiveRequest: (state) => { state.actionLoading = true; },
    setUserActiveSuccess: (state, { payload: { id, isActive } }) => {
      state.actionLoading = false;
      const user = state.users.find((u) => u.id === id);
      if (user) user.isActive = isActive;
      if (state.selectedUser?.id === id) state.selectedUser.isActive = isActive;
    },
    setUserActiveFailure: (state) => { state.actionLoading = false; },
  },
});

export const {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  setFilters,
  setPage,
  fetchUserDetailRequest,
  fetchUserDetailSuccess,
  fetchUserDetailFailure,
  setUserActiveRequest,
  setUserActiveSuccess,
  setUserActiveFailure,
} = adminUsersSlice.actions;

export default adminUsersSlice.reducer;
