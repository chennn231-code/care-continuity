import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import './styles.css';

const isV2Prototype = window.location.pathname === '/' || window.location.pathname.startsWith('/v2/prototype');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {isV2Prototype ? <App /> : <AuthProvider><App /></AuthProvider>}
    </BrowserRouter>
  </StrictMode>
);
