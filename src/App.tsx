import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './shared/auth';
import { ToastProvider } from './shared/ui';
import { BankScreen } from './screens/BankScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { HomeScreen } from './screens/HomeScreen';

/** Routes that require a logged-in host; waits for the token check. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) {
    return (
      <div className="grad-bg flex h-full items-center justify-center text-white/80">
        Завантаження…
      </div>
    );
  }
  if (user === null) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route
              path="/teacher"
              element={
                <RequireAuth>
                  <DashboardScreen />
                </RequireAuth>
              }
            />
            <Route
              path="/teacher/banks/:bankId"
              element={
                <RequireAuth>
                  <BankScreen />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
