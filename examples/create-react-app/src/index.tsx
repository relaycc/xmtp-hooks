import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { XmtpProvider } from '@relaycc/xmtp-hooks';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <XmtpProvider config={{ worker: new Worker('/worker.js') }}>
        <App />
      </XmtpProvider>
    </BrowserRouter>
  </React.StrictMode>
);
