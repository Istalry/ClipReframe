import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { installDevtools } from './devtools';

import './styles/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root not found');
}

installDevtools();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
