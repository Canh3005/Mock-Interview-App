import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import './i18n/config'
import { store, sagaMiddleware } from './store/store'
import rootSaga from './store/sagas/rootSaga'
import { Toaster } from 'sonner'

sagaMiddleware.run(rootSaga);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <Toaster theme="dark" position="top-right" />
    </Provider>
  </StrictMode>,
)
