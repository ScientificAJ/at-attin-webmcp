import {
  createContext,
  useEffect,
  useContext,
  useRef,
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
import type { EmbeddedAgentRuntime } from '../agent/runtime';
import { BankShell } from '../components/BankShell';
import type { BankState } from '../domain/models';
import type { BankStore } from '../domain/store';
import { HomePage } from '../pages/HomePage';
import { ActivityPage } from '../pages/ActivityPage';
import { AccountsPage } from '../pages/AccountsPage';
import { CardsPage } from '../pages/CardsPage';
import { LoginPage } from '../pages/LoginPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { PlanPage } from '../pages/PlanPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SafetyAgentPage } from '../pages/SafetyAgentPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SupportPage } from '../pages/SupportPage';
import type { ToolBridge } from '../webmcp/bridge';
import type { ConfirmationCoordinator } from '../webmcp/confirmation';
import type { TrustPredicate } from '../webmcp/contracts';
import type { ToolRegistry } from '../webmcp/registry';

export interface AppServices {
  session: SessionStore;
  bankStore: BankStore;
  webMcpAvailable: boolean;
  confirmationCoordinator: ConfirmationCoordinator;
  toolBridge: ToolBridge;
  toolRegistry: ToolRegistry;
  embeddedAgent: EmbeddedAgentRuntime;
  trustPredicate: TrustPredicate;
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

function WebMcpRuntimeBoundary() {
  const { toolBridge, toolRegistry } = useAppServices();
  const location = useLocation();
  const previousLocation = useRef(location.key);

  useEffect(() => {
    if (previousLocation.current !== location.key) {
      toolBridge.cancel('navigation');
      previousLocation.current = location.key;
    }
  }, [location.key, toolBridge]);

  useEffect(() => () => toolRegistry.dispose(), [toolRegistry]);
  return null;
}

interface AppRouteTreeProps {
  services: AppServices;
  children?: ReactNode;
}

export function AppRouteTree({ services }: AppRouteTreeProps) {
  return (
    <ServicesContext.Provider value={services}>
      <WebMcpRuntimeBoundary />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<BankShell />}>
            <Route index element={<HomePage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/cards" element={<CardsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route
              path="activity"
              element={<ActivityPage />}
            />
            <Route
              path="reports"
              element={<ReportsPage />}
            />
            <Route path="reports/plan" element={<PlanPage />} />
            <Route
              path="settings"
              element={<SettingsPage />}
            />
            <Route path="settings/support" element={<SupportPage />} />
            <Route path="settings/agent" element={<SafetyAgentPage />} />
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
