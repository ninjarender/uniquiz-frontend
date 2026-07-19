import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth';
import { FloatingShapes, useToast } from '../shared/ui';
import type { ShapeSpec } from '../shared/ui';
import { PlayFab } from './PlayFab';
import styles from './TeacherLayout.module.css';

const SIDEBAR_SHAPES: ShapeSpec[] = [
  { glyph: '●', size: 40, top: '24%', left: '16px' },
  { glyph: '◆', size: 34, top: '38%', right: '12px' },
  { glyph: '■', size: 44, top: '52%', left: '60px' },
  { glyph: '▲', size: 30, top: '66%', right: '20px' },
  { glyph: '●', size: 38, top: '80%', left: '20px' },
];

/** T1 sidebar layout: glow, floating shapes, Discord-like profile. */
export function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();

  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();
  const onHistory = pathname.startsWith('/teacher/history');

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div aria-hidden className={styles.glow} />
        <FloatingShapes shapes={SIDEBAR_SHAPES} />
        <button type="button" onClick={() => navigate('/teacher')} className={styles.logoBtn}>
          Uni<span className={styles.logoAccent}>Quiz</span>
        </button>

        <nav className={styles.nav}>
          <button
            type="button"
            onClick={() => navigate('/teacher')}
            data-ripple
            className={`${styles.navItem} ${onHistory ? '' : styles.navItemActive}`}
          >
            <span className={styles.navIcon}>📚</span> Мої банки
          </button>
          <button
            type="button"
            onClick={() => navigate('/teacher/history')}
            data-ripple
            className={`${styles.navItem} ${onHistory ? styles.navItemActive : ''}`}
          >
            <span className={styles.navIcon}>🏆</span> Історія ігор
          </button>
          <button
            type="button"
            onClick={() => toast('Аналітика сесій — після ігрових тасок (0018+)')}
            data-ripple
            className={styles.navItem}
          >
            <span className={styles.navIcon}>📊</span> Аналітика
          </button>
          <button
            type="button"
            onClick={() => toast('Апеляції — академічна фаза (post-MVP)')}
            data-ripple
            className={styles.navItem}
          >
            <span className={styles.navIcon}>⚖️</span> Апеляції
          </button>
          <button
            type="button"
            onClick={() => toast('Налаштування акаунта — поза MVP')}
            data-ripple
            className={styles.navItem}
          >
            <span className={styles.navIcon}>⚙️</span> Налаштування
          </button>
        </nav>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {initials}
            <span className={styles.statusDot} />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user?.email}</div>
            <div className={styles.profileRole}>онлайн</div>
          </div>
          <button
            type="button"
            title="Налаштування профілю"
            onClick={() => toast('Налаштування профілю — поза MVP')}
            className={styles.gearBtn}
          >
            <span className={styles.gearIcon}>⚙️</span>
          </button>
          <button
            type="button"
            title="Вийти"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className={styles.logoutBtn}
          >
            🚪
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
      <PlayFab />
    </div>
  );
}
