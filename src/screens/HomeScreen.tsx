import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError } from '../shared/api';
import { useAuth } from '../shared/auth';
import { Button, ErrorBox, TextField } from '../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../shared/ui';
import styles from './HomeScreen.module.css';

type Tab = 'login' | 'register';

/**
 * D1 - the main screen: host login/registration plus the "join a game"
 * pill for players without an account.
 */
export function HomeScreen() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Already logged in -> straight to the dashboard (or where the user came from).
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/teacher', { replace: true });
    }
  }, [user, navigate, location.state]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    emailRef.current?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
        toast('Акаунт створено — вітаємо в UniQuiz!');
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.statusCode === 401 ? 'Невірний email або пароль' : caught.message,
        );
      } else {
        setError('Немає звʼязку з сервером — перевірте, що бекенд запущений');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo />
      <div className={styles.tagline}>
        Тестування без списування: індивідуальні варіанти, відповіді генерує ШІ,
        вміст під спойлерами
      </div>

      <form className={styles.card} onSubmit={(event) => void submit(event)}>
        <div className={styles.tabs}>
          <div
            aria-hidden
            className={styles.tabsIndicator}
            style={{ transform: tab === 'login' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
          >
            Вхід
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
          >
            Реєстрація
          </button>
        </div>

        <div className={styles.fields} key={tab}>
        <TextField
          ref={emailRef}
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          type="password"
          required
          minLength={8}
          placeholder={tab === 'register' ? 'Пароль (мінімум 8 символів)' : 'Пароль'}
          autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button type="submit" disabled={busy}>
          {busy ? '…' : tab === 'login' ? 'Увійти' : 'Створити акаунт'}
        </Button>
        </div>
        <div className={styles.authNote}>В акаунті — ваші тести й банки запитань</div>
      </form>

      <div className={styles.joinLabel}>
        Не хочете реєструватися? Просто приєднайтеся до сесії:
      </div>
      <button type="button" onClick={() => navigate('/play')} className={styles.joinPill}>
        <span className={styles.joinArrow}>➜</span> Приєднатися до гри
      </button>
    </div>
  );
}
