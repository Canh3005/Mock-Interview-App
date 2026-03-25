import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer from './slices/authSlice';
import adminProblemsReducer from './slices/adminProblemsSlice';
import profileReducer from './slices/profileSlice';
import interviewSetupReducer from './slices/interviewSetupSlice';
import behavioralReducer from './slices/behavioralSlice';
import rootSaga from './sagas/rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminProblems: adminProblemsReducer,
    profile: profileReducer,
    interviewSetup: interviewSetupReducer,
    behavioral: behavioralReducer,
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

sagaMiddleware.run(rootSaga);
