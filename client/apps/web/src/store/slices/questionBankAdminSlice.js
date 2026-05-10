import { createSlice } from '@reduxjs/toolkit';

const initialFilters = {
  status: '',
  roleFamily: '',
  level: '',
  type: '',
  competency: '',
  search: '',
};

const initialSetFilters = {
  status: '',
  roleFamily: '',
  level: '',
  search: '',
};

const questionBankAdminSlice = createSlice({
  name: 'questionBankAdmin',
  initialState: {
    probes: [],
    taxonomy: null,
    total: 0,
    page: 1,
    limit: 10,
    filters: initialFilters,
    interviewSets: [],
    setsTotal: 0,
    setsPage: 1,
    setsLimit: 10,
    setFilters: initialSetFilters,
    loading: false,
    setsLoading: false,
    saving: false,
    error: null,
  },
  reducers: {
    fetchTaxonomyRequest: (state) => {
      state.error = null;
    },
    fetchTaxonomySuccess: (state, action) => {
      state.taxonomy = action.payload;
    },
    fetchTaxonomyFailure: (state, action) => {
      state.error = action.payload;
    },

    setProbeFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetProbeFilters: (state) => {
      state.filters = initialFilters;
    },

    setInterviewSetFilters: (state, action) => {
      state.setFilters = { ...state.setFilters, ...action.payload };
    },
    resetInterviewSetFilters: (state) => {
      state.setFilters = initialSetFilters;
    },

    fetchProbesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProbesSuccess: (state, action) => {
      state.loading = false;
      state.probes = action.payload.data;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    },
    fetchProbesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    saveProbeRequest: (state) => {
      state.saving = true;
      state.error = null;
    },
    saveProbeSuccess: (state) => {
      state.saving = false;
    },
    saveProbeFailure: (state, action) => {
      state.saving = false;
      state.error = action.payload;
    },

    transitionProbeRequest: (state) => {
      state.saving = true;
      state.error = null;
    },
    transitionProbeSuccess: (state) => {
      state.saving = false;
    },
    transitionProbeFailure: (state, action) => {
      state.saving = false;
      state.error = action.payload;
    },

    fetchInterviewSetsRequest: (state) => {
      state.setsLoading = true;
      state.error = null;
    },
    fetchInterviewSetsSuccess: (state, action) => {
      state.setsLoading = false;
      state.interviewSets = action.payload.data;
      state.setsTotal = action.payload.total;
      state.setsPage = action.payload.page;
      state.setsLimit = action.payload.limit;
    },
    fetchInterviewSetsFailure: (state, action) => {
      state.setsLoading = false;
      state.error = action.payload;
    },

    saveInterviewSetRequest: (state) => {
      state.saving = true;
      state.error = null;
    },
    saveInterviewSetSuccess: (state) => {
      state.saving = false;
    },
    saveInterviewSetFailure: (state, action) => {
      state.saving = false;
      state.error = action.payload;
    },

    transitionInterviewSetRequest: (state) => {
      state.saving = true;
      state.error = null;
    },
    transitionInterviewSetSuccess: (state) => {
      state.saving = false;
    },
    transitionInterviewSetFailure: (state, action) => {
      state.saving = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTaxonomyRequest,
  fetchTaxonomySuccess,
  fetchTaxonomyFailure,
  setProbeFilters,
  resetProbeFilters,
  setInterviewSetFilters,
  resetInterviewSetFilters,
  fetchProbesRequest,
  fetchProbesSuccess,
  fetchProbesFailure,
  saveProbeRequest,
  saveProbeSuccess,
  saveProbeFailure,
  transitionProbeRequest,
  transitionProbeSuccess,
  transitionProbeFailure,
  fetchInterviewSetsRequest,
  fetchInterviewSetsSuccess,
  fetchInterviewSetsFailure,
  saveInterviewSetRequest,
  saveInterviewSetSuccess,
  saveInterviewSetFailure,
  transitionInterviewSetRequest,
  transitionInterviewSetSuccess,
  transitionInterviewSetFailure,
} = questionBankAdminSlice.actions;

export default questionBankAdminSlice.reducer;
