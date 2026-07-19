import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError } from '../shared/api';
import { useAuth } from '../shared/auth';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../shared/ui';

type Tab = 'login' | 'register';

/**
 * D1 - the main screen: host login/registration plus the "join a game"
 * pill for players without an account (rooms arrive with backend 0018+).
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
      // The user effect above redirects after the auth store updates.
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.statusCode === 401
            ? 'Невірний email або пароль'
            : caught.message,
        );
      } else {
        setError('Немає звʼязку з сервером — перевірте, що бекенд запущений');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden">
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo />
      <div className="relative max-w-[340px] text-center text-[12.5px] leading-relaxed text-[#cdbfef]">
        Тестування без списування: індивідуальні варіанти, відповіді генерує ШІ,
        вміст під спойлерами
      </div>

      <form className="uq-card w-[320px]" onSubmit={(event) => void submit(event)}>
        {/* tabs with a sliding indicator (design: auth-ind spring slide) */}
        <div className="relative grid grid-cols-2 rounded-[10px] bg-white/10 p-1 text-[13px] font-bold">
          <div
            aria-hidden
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[var(--purple)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)]"
            style={{ transform: tab === 'login' ? 'translateX(0)' : 'translateX(calc(100% + 0px))', left: 4 }}
          />
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`relative z-10 cursor-pointer rounded-lg border-none bg-transparent py-2 ${tab === 'login' ? 'text-white' : 'text-white/55'}`}
          >
            Вхід
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`relative z-10 cursor-pointer rounded-lg border-none bg-transparent py-2 ${tab === 'register' ? 'text-white' : 'text-white/55'}`}
          >
            Реєстрація
          </button>
        </div>

        <input
          ref={emailRef}
          className="uq-field"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="uq-field"
          type="password"
          required
          minLength={8}
          placeholder={tab === 'register' ? 'Пароль (мінімум 8 символів)' : 'Пароль'}
          autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <div className="uq-error">{error}</div>}

        <button className="btn-green" type="submit" disabled={busy}>
          {busy ? '…' : tab === 'login' ? 'Увійти' : 'Створити акаунт'}
        </button>
        <div className="text-center text-[11px] text-[#b9a8e6]">
          В акаунті — ваші тести й банки запитань
        </div>
      </form>

      <div className="relative text-[12px] text-[#cdbfef]">
        Не хочете реєструватися? Просто приєднайтеся до сесії:
      </div>
      <button
        type="button"
        onClick={() =>
          toast('Кімнати гри зʼявляться разом із бекенд-тасками 0018+')
        }
        className="relative cursor-pointer rounded-full border-none bg-[linear-gradient(135deg,#2d0e5e,#5b1fb0)] px-6 py-3 text-[14px] font-bold text-white shadow-[0_3px_0_#1b0741] transition-transform hover:scale-[1.03] active:translate-y-[2px]"
      >
        <span className="mr-2 text-[var(--accent)]">➜</span> Приєднатися до гри
      </button>
    </div>
  );
}
