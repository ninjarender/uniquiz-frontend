import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, BanksApi } from '../shared/api';
import type { Bank } from '../shared/api';
import { useAuth } from '../shared/auth';
import { Button, ErrorBox, TextField } from '../shared/controls';
import { Modal, useToast } from '../shared/ui';
import type { ShapeSpec } from '../shared/ui';
import { FloatingShapes } from '../shared/ui';
import styles from './DashboardScreen.module.css';
import { TeacherLayout } from './TeacherLayout';

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#46178F,#7b2ff7)',
  'linear-gradient(135deg,#d89e00,#f2b705)',
  'linear-gradient(135deg,#1368ce,#3f8ef0)',
  'linear-gradient(135deg,#26890c,#4caf2f)',
];
const CARD_ICONS = ['🗄️', '☕', '🌐', '📐', '🧪', '🧬'];

const HERO_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 80, top: '-20px', right: '110px', spin: true },
  { glyph: '●', size: 60, right: '24px', bottom: '-16px' },
  { glyph: '■', size: 52, left: '-12px', bottom: '-14px' },
];

const SESSION_TOPICS = [
  { name: 'SQL-запити', value: 81, fill: styles.topicGreen },
  { name: 'Транзакції', value: 63, fill: styles.topicYellow },
  { name: 'Нормалізація', value: 44, fill: styles.topicRed },
];

const SHIELD_ROWS = [
  '👁 Спойлер-маска',
  '🎲 Індивідуальні варіанти',
  '⏱ Таймер раунду',
  '📓 Журнал спойлерів',
];

/** T1 - "my banks": hero with stats, bank cards from GET /banks, demo panels. */
export function DashboardScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Bank | null>(null);
  const [deleting, setDeleting] = useState<Bank | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setError(null);
    BanksApi.list()
      .then(setBanks)
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером',
        ),
      );
  }, []);

  useEffect(reload, [reload]);

  const totalQuestions = (banks ?? []).reduce(
    (sum, bank) => sum + bank.questionCount,
    0,
  );

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const bank = await BanksApi.create(name.trim());
      setCreateOpen(false);
      setName('');
      toast(`Банк «${bank.name}» створено`);
      reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : 'Помилка мережі');
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    setBusy(true);
    try {
      await BanksApi.rename(renaming.id, name.trim());
      setRenaming(null);
      toast('Перейменовано');
      reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : 'Помилка мережі');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await BanksApi.remove(deleting.id);
      setDeleting(null);
      toast('Банк видалено разом із запитаннями');
      reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : 'Помилка мережі');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TeacherLayout>
      <div className={styles.content}>
        <section className={`grad-bg ${styles.hero}`}>
          <FloatingShapes shapes={HERO_SHAPES} />
          <div className={styles.heroActions}>
            <Button
              variant="purple"
              onClick={() => navigate('/live')}
              title="Демо-муляж live-сесії (проєктор)"
            >
              ▶ Демо-сесія
            </Button>
            <Button onClick={() => { setName(''); setCreateOpen(true); }}>
              ＋ Створити банк
            </Button>
          </div>
          <h2 className={styles.heroTitle}>
            Привіт{user ? `, ${user.email.split('@')[0]}` : ''}! 👋
          </h2>
          <p className={styles.heroSub}>
            Створюйте банки запитань, генеруйте відповіді ШІ та запускайте
            live-сесії з унікальними варіантами.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.statBox}>
              <b className={styles.statValue}>{banks?.length ?? '—'}</b>
              <span className={styles.statLabel}>банків</span>
            </div>
            <div className={styles.statBox}>
              <b className={styles.statValue}>{banks ? totalQuestions : '—'}</b>
              <span className={styles.statLabel}>запитань</span>
            </div>
            <div className={styles.statBox} title="Демо-дані до ігрових тасок 0018+">
              <b className={styles.statValue}>3</b>
              <span className={styles.statLabel}>сесії (демо)</span>
            </div>
            <div className={styles.statBox} title="Демо-дані до ігрових тасок 0018+">
              <b className={styles.statValue}>68 %</b>
              <span className={styles.statLabel}>успішність (демо)</span>
            </div>
          </div>
        </section>

        {error && (
          <div className={styles.errorWrap}>
            <ErrorBox>
              {error} ·{' '}
              <button type="button" className={styles.retryBtn} onClick={reload}>
                повторити
              </button>
            </ErrorBox>
          </div>
        )}
        {!error && banks === null && (
          <div className={styles.loading}>Завантаження банків…</div>
        )}
        {banks !== null && banks.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📚</div>
            <div className={styles.emptyTitle}>Поки що жодного банку запитань</div>
            <div className={styles.emptyText}>
              Створіть перший — і додавайте запитання, а ШІ згенерує варіанти
              відповідей.
            </div>
            <Button
              variant="purple"
              className={styles.emptyBtn}
              onClick={() => { setName(''); setCreateOpen(true); }}
            >
              ＋ Створити банк
            </Button>
          </div>
        )}
        <div className={styles.grid}>
          {(banks ?? []).map((bank, index) => {
            const ready = bank.questionCount
              ? Math.round((bank.readyCount / bank.questionCount) * 100)
              : 0;
            return (
              <article
                key={bank.id}
                onClick={() => navigate(`/teacher/banks/${bank.id}`)}
                className={styles.card}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={styles.cardTop}>
                  <div
                    className={styles.cardIcon}
                    style={{ background: CARD_GRADIENTS[index % CARD_GRADIENTS.length] }}
                  >
                    {CARD_ICONS[index % CARD_ICONS.length]}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{bank.name}</h3>
                    <div className={styles.cardMeta}>{bank.questionCount} запитань</div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      title="Перейменувати"
                      onClick={(event) => {
                        event.stopPropagation();
                        setName(bank.name);
                        setRenaming(bank);
                      }}
                      className={styles.iconBtn}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      title="Видалити"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleting(bank);
                      }}
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className={styles.progressBlock}>
                  <div className={styles.progressLabel}>
                    <span>Готово до гри (ШІ)</span>
                    <b>{bank.readyCount}/{bank.questionCount}</b>
                  </div>
                  <div className={styles.track}>
                    <div
                      className={`${styles.fill} ${ready === 100 ? styles.fillDone : ''}`}
                      style={{ width: `${ready}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* bottom panels (prototype T1); session data is demo until 0018+ */}
      <div className={styles.panelsWrap}>
        <div className={styles.panels}>
          <section className={styles.panel}>
            <h4 className={styles.panelTitle}>
              📊 Остання сесія · 27 учасників
              <span className={styles.demoBadge}>демо</span>
            </h4>
            {SESSION_TOPICS.map((row) => (
              <div key={row.name} className={styles.topicRow}>
                <span className={styles.topicName}>{row.name}</span>
                <div className={styles.topicTrack}>
                  <div
                    className={`${styles.topicFill} ${row.fill}`}
                    style={{ width: `${row.value}%` }}
                  />
                </div>
                <b className={styles.topicValue}>
                  {row.value}%{row.value < 50 ? ' ⚠' : ''}
                </b>
              </div>
            ))}
          </section>

          <section className={styles.panel}>
            <h4 className={styles.panelTitle}>⚡ Швидкі дії</h4>
            <button type="button" onClick={() => navigate('/live')} className={styles.quickBtn}>
              ▶ Запустити live-сесію (демо)
            </button>
            <button
              type="button"
              onClick={() => toast('Генерація ШІ підключиться з бекенд-таскою 0013')}
              className={styles.quickBtn}
            >
              ✨ Догенерувати відповіді ШІ
            </button>
            <button
              type="button"
              onClick={() => toast('Апеляції — академічна фаза (post-MVP)')}
              className={styles.quickBtn}
            >
              ⚖️ Розглянути апеляції
              <span className={styles.appealBadge}>2</span>
            </button>
          </section>

          <section className={styles.panel}>
            <h4 className={styles.panelTitle}>
              🛡 Захист — активний
              <span className={styles.demoBadge}>демо</span>
            </h4>
            {SHIELD_ROWS.map((row) => (
              <div key={row} className={styles.shieldRow}>
                <span>{row}</span>
                <b className={styles.onChip}>увімк.</b>
              </div>
            ))}
          </section>
        </div>
      </div>

      {createOpen && (
        <Modal title="Новий банк запитань" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(event) => void submitCreate(event)} className="modal-form">
            <TextField
              autoFocus
              required
              placeholder="Назва, напр. «Бази даних — Модуль 1»"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              Створити
            </Button>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="Перейменувати банк" onClose={() => setRenaming(null)}>
          <form onSubmit={(event) => void submitRename(event)} className="modal-form">
            <TextField
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button variant="purple" type="submit" disabled={busy || !name.trim()}>
              Зберегти
            </Button>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Видалити банк?" onClose={() => setDeleting(null)}>
          <p className="modal-text">
            «{deleting.name}» буде видалено разом з усіма {deleting.questionCount}{' '}
            запитаннями і комплектами відповідей. Цю дію не можна скасувати.
          </p>
          <div className="modal-actions">
            <Button variant="purple" onClick={() => setDeleting(null)}>
              Скасувати
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={busy}>
              Видалити
            </Button>
          </div>
        </Modal>
      )}
    </TeacherLayout>
  );
}
