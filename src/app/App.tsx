import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createSessionStore, type SessionStore } from '../auth/session';
import { createBankStore, type BankStore } from '../domain/store';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/shell.css';
import { AppRouteTree, type AppServices } from './routes';

function supportsWebMcp(): boolean {
  return typeof document !== 'undefined' && 'modelContext' in document;
}

function createDeferredBankStore(session: SessionStore): BankStore {
  let activeStore: BankStore | null = null;
  const listeners = new Set<() => void>();

  const initialize = () => {
    if (!activeStore && session.isSignedIn()) {
      activeStore = createBankStore();
      activeStore.subscribe(() => {
        for (const listener of listeners) listener();
      });
    }
  };
  session.subscribe(initialize);

  const requireStore = (): BankStore => {
    initialize();
    if (!activeStore) {
      throw new Error('Banking state is unavailable before sign in');
    }
    return activeStore;
  };

  return {
    getState: () => requireStore().getState(),
    transact: (...args) => requireStore().transact(...args),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => requireStore().reset(),
  };
}

export function App() {
  const [services] = useState<AppServices>(() => {
    const session = createSessionStore();
    return {
      session,
      bankStore: createDeferredBankStore(session),
      webMcpAvailable: supportsWebMcp(),
    };
  });

  return (
    <BrowserRouter>
      <AppRouteTree services={services} />
    </BrowserRouter>
  );
}
