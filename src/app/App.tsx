import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createSessionStore } from '../auth/session';
import { createBankStore } from '../domain/store';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/shell.css';
import { AppRouteTree, type AppServices } from './routes';

function supportsWebMcp(): boolean {
  return typeof document !== 'undefined' && 'modelContext' in document;
}

export function App() {
  const [services] = useState<AppServices>(() => ({
    session: createSessionStore(),
    bankStore: createBankStore(),
    webMcpAvailable: supportsWebMcp(),
  }));

  return (
    <BrowserRouter>
      <AppRouteTree services={services} />
    </BrowserRouter>
  );
}
