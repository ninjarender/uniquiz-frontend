import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './shared/auth';
import { ToastProvider } from './shared/ui';
import { GameProvider } from './shared/game';
import { BankScreen } from './screens/BankScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GameResume } from './screens/play/GameResume';
import { WsErrorHandler } from './screens/play/WsErrorHandler';
import { JoinScreen } from './screens/play/JoinScreen';
import { LobbyScreen } from './screens/play/LobbyScreen';
import { RoundScreen } from './screens/play/RoundScreen';
import { RoundResultScreen } from './screens/play/RoundResultScreen';
import { FinalScreen } from './screens/play/FinalScreen';
import { ProjectorScreen } from './screens/play/ProjectorScreen';

/** Routes that require a logged-in host; waits for the token check. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) {
    return (
      <div className="grad-bg screen-loading">
        Завантаження…
      </div>
    );
  }
  if (user === null) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Prototype-style click ripple on every element marked with data-ripple. */
function useRipple() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-ripple]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${event.clientX - rect.left - size / 2}px`;
      span.style.top = `${event.clientY - rect.top - size / 2}px`;
      target.appendChild(span);
      setTimeout(() => span.remove(), 650);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

export default function App() {
  useRipple();
  return (
    <ToastProvider>
      <AuthProvider>
        <GameProvider>
        <BrowserRouter>
          {/* Mounted first: its interceptor registers first, so it is the
              last checked - screens override it contextually (task 0070). */}
          <WsErrorHandler />
          <GameResume />
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/play" element={<JoinScreen />} />
            <Route path="/join/:roomId" element={<JoinScreen />} />
            <Route path="/play/lobby" element={<LobbyScreen />} />
            <Route path="/play/round" element={<RoundScreen />} />
            <Route path="/play/result" element={<RoundResultScreen />} />
            <Route path="/play/final" element={<FinalScreen />} />
            <Route path="/live" element={<ProjectorScreen />} />
            <Route
              path="/teacher"
              element={
                <RequireAuth>
                  <DashboardScreen />
                </RequireAuth>
              }
            />
            <Route
              path="/teacher/history"
              element={
                <RequireAuth>
                  <HistoryScreen />
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
        </GameProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
