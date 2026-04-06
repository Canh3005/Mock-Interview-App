import { all, fork } from 'redux-saga/effects';
import authSaga from './authSaga';
import { watchAdminProblemsSaga } from './adminProblemsSaga';
import { watchProfileSaga } from './profileSaga';
import { watchInterviewSetupSaga } from './interviewSetupSaga';
import { watchBehavioralSaga } from './behavioralSaga';
import { watchCombat } from './combatSaga';

export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(watchAdminProblemsSaga),
    fork(watchProfileSaga),
    fork(watchInterviewSetupSaga),
    fork(watchBehavioralSaga),
    fork(watchCombat),
  ]);
}
