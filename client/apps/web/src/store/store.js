import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer from './slices/authSlice';
import adminProblemsReducer from './slices/adminProblemsSlice';
import profileReducer from './slices/profileSlice';
import interviewSetupReducer from './slices/interviewSetupSlice';
import behavioralReducer from './slices/behavioralSlice';
import dsaSessionReducer from './slices/dsaSessionSlice'
import practiceDSAReducer from './slices/practiceDSASlice';
import sdProblemReducer from './slices/sdProblemSlice';
import sdSessionReducer from './slices/sdSessionSlice';
import sdInterviewerReducer from './slices/sdInterviewerSlice';
import sdEvaluatorReducer from './slices/sdEvaluatorSlice';
import walletReducer from './slices/walletSlice';
import paymentReducer from './slices/paymentSlice';
import questionBankAdminReducer from './slices/questionBankAdminSlice';
import questionBankReducer from './slices/questionBankSlice';
import notificationsReducer from './slices/notificationsSlice';
import adminUsersReducer from './slices/adminUsersSlice';
import adminAnalyticsReducer from './slices/adminAnalyticsSlice';
import nsdSessionReducer from './slices/nsdSessionSlice';
import nsdInterviewerReducer from './slices/nsdInterviewerSlice';
import nsdEvaluatorReducer from './slices/nsdEvaluatorSlice';

export const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminProblems: adminProblemsReducer,
    profile: profileReducer,
    interviewSetup: interviewSetupReducer,
    behavioral: behavioralReducer,
    dsaSession: dsaSessionReducer,
    practiceDSA: practiceDSAReducer,
    sdProblem: sdProblemReducer,
    sdSession: sdSessionReducer,
    sdInterviewer: sdInterviewerReducer,
    sdEvaluator: sdEvaluatorReducer,
    wallet: walletReducer,
    payment: paymentReducer,
    questionBankAdmin: questionBankAdminReducer,
    questionBank: questionBankReducer,
    notifications: notificationsReducer,
    adminUsers: adminUsersReducer,
    adminAnalytics: adminAnalyticsReducer,
    nsdSession: nsdSessionReducer,
    nsdInterviewer: nsdInterviewerReducer,
    nsdEvaluator: nsdEvaluatorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ 
      thunk: false,
      serializableCheck: {
        ignoredActions: ['profile/uploadDocumentRequest'],
        ignoredActionPaths: ['payload.file'],
      }
    }).concat(sagaMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

