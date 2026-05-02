import { all, fork } from 'redux-saga/effects';
import authSaga from './authSaga';
import { watchAdminProblemsSaga } from './adminProblemsSaga';
import { watchProfileSaga } from './profileSaga';
import { watchInterviewSetupSaga } from './interviewSetupSaga';
import { watchBehavioralSaga } from './behavioralSaga';
import { watchCombat } from './combatSaga';
import { watchDsaSessionSaga } from './dsaSessionSaga';
import { watchPracticeDSASaga } from './practiceDSASaga';
import { watchSDProblemSaga } from './sdProblemSaga';
import { watchSDSessionSaga } from './sdSessionSaga';
import { watchSDInterviewerSaga } from './sdInterviewerSaga';

export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(watchAdminProblemsSaga),
    fork(watchProfileSaga),
    fork(watchInterviewSetupSaga),
    fork(watchBehavioralSaga),
    fork(watchCombat),
    fork(watchDsaSessionSaga),
    fork(watchPracticeDSASaga),
    fork(watchSDProblemSaga),
    fork(watchSDSessionSaga),
    fork(watchSDInterviewerSaga),
  ]);
}
