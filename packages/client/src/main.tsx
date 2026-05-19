import { ccc } from '@ckb-ccc/connector-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('root container missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ccc.Provider>
      <App />
    </ccc.Provider>
  </StrictMode>,
);
