import { all, fork } from 'redux-saga/effects';
import authSaga from './authSaga';
import { watchAdminProblemsSaga } from './adminProblemsSaga';
import { watchProfileSaga } from './profileSaga';
import { watchInterviewSetupSaga } from './interviewSetupSaga';
import { watchBehavioralSaga } from './behavioralSaga';
import { watchDsaSessionSaga } from './dsaSessionSaga';
import { watchPracticeDSASaga } from './practiceDSASaga';
import { watchSDProblemSaga } from './sdProblemSaga';
import { watchSDSessionSaga } from './sdSessionSaga';
import { watchSDInterviewerSaga } from './sdInterviewerSaga';
import { watchSDEvaluatorSaga } from './sdEvaluatorSaga';
import { watchWalletSaga } from './walletSaga';
import { watchPaymentSaga } from './paymentSaga';
import { watchQuestionBankAdminSaga } from './questionBankAdminSaga';
import { watchQuestionBankSaga } from './questionBankSaga';
import { watchNotificationsSaga } from './notificationsSaga';
import { watchAdminUsersSaga } from './adminUsersSaga';
import { watchAdminAnalyticsSaga } from './adminAnalyticsSaga';
import { watchNSDSessionSaga } from './nsdSessionSaga';
import { watchNSDInterviewerSaga } from './nsdInterviewerSaga';
import { watchNSDEvaluatorSaga } from './nsdEvaluatorSaga';

export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(watchAdminProblemsSaga),
    fork(watchProfileSaga),
    fork(watchInterviewSetupSaga),
    fork(watchBehavioralSaga),
    fork(watchDsaSessionSaga),
    fork(watchPracticeDSASaga),
    fork(watchSDProblemSaga),
    fork(watchSDSessionSaga),
    fork(watchSDInterviewerSaga),
    fork(watchSDEvaluatorSaga),
    fork(watchWalletSaga),
    fork(watchPaymentSaga),
    fork(watchQuestionBankAdminSaga),
    fork(watchQuestionBankSaga),
    fork(watchNotificationsSaga),
    fork(watchAdminUsersSaga),
    fork(watchAdminAnalyticsSaga),
    fork(watchNSDSessionSaga),
    fork(watchNSDInterviewerSaga),
    fork(watchNSDEvaluatorSaga),
  ]);
}
