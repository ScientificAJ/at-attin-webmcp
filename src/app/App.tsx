import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createSessionStore, type SessionStore } from '../auth/session';
import { EmbeddedAgentRuntime } from '../agent/runtime';
import { createBankStore, type BankStore } from '../domain/store';
import { ToolBridge } from '../webmcp/bridge';
import {
  ConfirmationCoordinator,
  hasTrustedUserActivation,
} from '../webmcp/confirmation';
import { ToolRegistry } from '../webmcp/registry';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/shell.css';
import '../styles/forms.css';
import '../styles/confirmation.css';
import '../styles/product.css';
import '../styles/login.css';
import '../styles/home.css';
import '../styles/accounts.css';
import '../styles/payments.css';
import '../styles/activity.css';
import '../styles/cards.css';
import '../styles/reports.css';
import '../styles/plan.css';
import '../styles/settings.css';
import '../styles/safety-agent.css';
import '../styles/support.css';
import '../styles/agent-console.css';
import { AppRouteTree, type AppServices } from './routes';

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
    const bankStore = createDeferredBankStore(session);
    const confirmationCoordinator = new ConfirmationCoordinator();
    const toolBridge = new ToolBridge(bankStore, confirmationCoordinator);
    const toolRegistry = new ToolRegistry({ bridge: toolBridge });
    const embeddedAgent = new EmbeddedAgentRuntime(toolBridge);
    return {
      session,
      bankStore,
      confirmationCoordinator,
      toolBridge,
      toolRegistry,
      embeddedAgent,
      trustPredicate: hasTrustedUserActivation,
    };
  });

  return (
    <BrowserRouter>
      <AppRouteTree services={services} />
    </BrowserRouter>
  );
}
