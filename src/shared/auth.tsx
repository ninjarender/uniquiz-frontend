import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ApiError, AuthApi, clearToken, getToken, setToken } from './api';
import type { User } from './api';

interface AuthContextValue {
  /** undefined = still checking the stored token */
  user: User | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    AuthApi.me()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.statusCode === 401) clearToken();
        setUser(null);
      });
  }, []);

  const authenticate = useCallback(
    async (action: 'login' | 'register', email: string, password: string) => {
      const { accessToken } =
        action === 'login'
          ? await AuthApi.login(email, password)
          : await AuthApi.register(email, password);
      setToken(accessToken);
      setUser(await AuthApi.me());
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (email, password) => authenticate('login', email, password),
      register: (email, password) => authenticate('register', email, password),
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, authenticate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth outside AuthProvider');
  return context;
}
