import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import type { SessionStore } from '../auth/session';
import { BankShell } from '../components/BankShell';
import type { BankState } from '../domain/models';
import type { BankStore } from '../domain/store';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SectionIndexPage } from '../pages/SectionIndexPage';

export interface AppServices {
  session: SessionStore;
  bankStore: BankStore;
  webMcpAvailable: boolean;
}

const ServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('At Attin services are unavailable');
  }
  return services;
}

export function useSignedIn(): boolean {
  const { session } = useAppServices();
  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.isSignedIn(),
    () => false,
  );
}

export function useBankState(): Readonly<BankState> {
  const { bankStore } = useAppServices();
  return useSyncExternalStore(
    (listener) => bankStore.subscribe(listener),
    () => bankStore.getState(),
    () => bankStore.getState(),
  );
}

function ProtectedRoute() {
  const signedIn = useSignedIn();
  const location = useLocation();
  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

interface AppRouteTreeProps {
  services: AppServices;
  children?: ReactNode;
}

export function AppRouteTree({ services }: AppRouteTreeProps) {
  return (
    <ServicesContext.Provider value={services}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<BankShell />}>
            <Route index element={<HomePage />} />
            <Route
              path="accounts"
              element={(
                <SectionIndexPage
                  eyebrow="Accounts"
                  title="Your accounts"
                  description="Review every fictional ATC balance, transaction, statement, and linked card."
                  links={[{ label: 'Cards', to: '/accounts/cards' }]}
                />
              )}
            />
            <Route
              path="accounts/cards"
              element={(
                <SectionIndexPage
                  eyebrow="Accounts"
                  title="Cards"
                  description="Manage card status, limits, payment controls, travel mode, and replacement."
                  links={[{ label: 'Back to accounts', to: '/accounts' }]}
                />
              )}
            />
            <Route
              path="payments"
              element={(
                <SectionIndexPage
                  eyebrow="Payments"
                  title="Payments"
                  description="Pay trusted people, move ATC, and review scheduled or recurring payments."
                />
              )}
            />
            <Route
              path="activity"
              element={(
                <SectionIndexPage
                  eyebrow="Activity"
                  title="Activity"
                  description="Search transaction history, update categories, add notes, and open disputes."
                />
              )}
            />
            <Route
              path="reports"
              element={(
                <SectionIndexPage
                  eyebrow="Reports"
                  title="Reports"
                  description="Understand spending, income, cash flow, budgets, subscriptions, and savings."
                  links={[{ label: 'Plan', to: '/reports/plan' }]}
                />
              )}
            />
            <Route
              path="reports/plan"
              element={(
                <SectionIndexPage
                  eyebrow="Reports"
                  title="Plan"
                  description="Shape monthly budgets and savings goals around upcoming fictional payments."
                  links={[{ label: 'Back to reports', to: '/reports' }]}
                />
              )}
            />
            <Route
              path="settings"
              element={(
                <SectionIndexPage
                  eyebrow="Settings"
                  title="Settings"
                  description="Control alerts, accessibility, support, trusted contacts, and agent safety."
                  links={[
                    { label: 'Support', to: '/settings/support' },
                    { label: 'Safety & Agent', to: '/settings/agent' },
                  ]}
                />
              )}
            />
            <Route
              path="settings/support"
              element={(
                <SectionIndexPage
                  eyebrow="Settings"
                  title="Support"
                  description="Open local support cases and find plain-language help for fictional banking."
                  links={[{ label: 'Back to settings', to: '/settings' }]}
                />
              )}
            />
            <Route
              path="settings/agent"
              element={(
                <SectionIndexPage
                  eyebrow="Settings"
                  title="Safety & Agent"
                  description="The agent can prepare anything. Only you can approve it."
                  links={[{ label: 'Back to settings', to: '/settings' }]}
                />
              )}
            />
            <Route path="cards" element={<Navigate to="/accounts/cards" replace />} />
            <Route path="plan" element={<Navigate to="/reports/plan" replace />} />
            <Route path="support" element={<Navigate to="/settings/support" replace />} />
            <Route path="safety-agent" element={<Navigate to="/settings/agent" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ServicesContext.Provider>
  );
}
