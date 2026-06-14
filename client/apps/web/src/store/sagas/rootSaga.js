import { all, fork } from 'redux-saga/effects';
import authSaga from './authSaga';
import { watchAdminProblemsSaga } from './adminProblemsSaga';
import { watchProfileSaga } from './profileSaga';
import { watchInterviewSetupSaga } from './interviewSetupSaga';
import { watchBehavioralSaga } from './behavioralSaga';
import { watchDsaSessionSaga } from './dsaSessionSaga';
import { watchPracticeDSASaga } from './practiceDSASaga';
import { watchWalletSaga } from './walletSaga';
import { watchPaymentSaga } from './paymentSaga';
import { watchQuestionBankAdminSaga } from './questionBankAdminSaga';
import { watchQuestionBankSaga } from './questionBankSaga';
import { watchNotificationsSaga } from './notificationsSaga';
import { watchAdminUsersSaga } from './adminUsersSaga';
import { watchAdminAnalyticsSaga } from './adminAnalyticsSaga';
import { watchNSDProblemSaga } from './nsdProblemSaga';
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
    fork(watchWalletSaga),
    fork(watchPaymentSaga),
    fork(watchQuestionBankAdminSaga),
    fork(watchQuestionBankSaga),
    fork(watchNotificationsSaga),
    fork(watchAdminUsersSaga),
    fork(watchAdminAnalyticsSaga),
    fork(watchNSDProblemSaga),
    fork(watchNSDSessionSaga),
    fork(watchNSDInterviewerSaga),
    fork(watchNSDEvaluatorSaga),
  ]);
}
