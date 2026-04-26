import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer from './slices/authSlice';
import adminProblemsReducer from './slices/adminProblemsSlice';
import profileReducer from './slices/profileSlice';
import interviewSetupReducer from './slices/interviewSetupSlice';
import behavioralReducer from './slices/behavioralSlice';
import combatOrchestratorReducer from './slices/combatOrchestratorSlice';
import combatEngineReducer from './slices/combatEngineSlice';
import dsaSessionReducer from './slices/dsaSessionSlice'
import practiceDSAReducer from './slices/practiceDSASlice';
import sdProblemReducer from './slices/sdProblemSlice';

export const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminProblems: adminProblemsReducer,
    profile: profileReducer,
    interviewSetup: interviewSetupReducer,
    behavioral: behavioralReducer,
    combatOrchestrator: combatOrchestratorReducer,
    combatEngine: combatEngineReducer,
    dsaSession: dsaSessionReducer,
    practiceDSA: practiceDSAReducer,
    sdProblem: sdProblemReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ 
      thunk: false,
      serializableCheck: {
        ignoredActions: ['profile/uploadDocumentRequest', 'combat/startEngine'],
        ignoredActionPaths: ['payload.file', 'payload.mediaStream', 'payload.videoElement'],
      }
    }).concat(sagaMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

