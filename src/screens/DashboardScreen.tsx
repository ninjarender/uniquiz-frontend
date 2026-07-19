import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, BanksApi } from '../shared/api';
import type { Bank } from '../shared/api';
import { useAuth } from '../shared/auth';
import { Button, ErrorBox, TextField } from '../shared/controls';
import { Modal, useToast } from '../shared/ui';
import { TeacherLayout } from './TeacherLayout';

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#46178F,#7b2ff7)',
  'linear-gradient(135deg,#d89e00,#f2b705)',
  'linear-gradient(135deg,#1368ce,#3f8ef0)',
  'linear-gradient(135deg,#26890c,#4caf2f)',
];
const CARD_ICONS = ['🗄️', '☕', '🌐', '📐', '🧪', '🧬'];

/** T1 - "my banks": hero with stats, bank cards from GET /banks. */
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
          caught instanceof ApiError
            ? caught.message
            : 'Немає звʼязку з сервером',
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
      <div className="mx-auto max-w-[980px] px-7 py-7">
        {/* hero */}
        <section className="grad-bg relative overflow-hidden rounded-2xl p-7 text-white">
          <span aria-hidden className="animate-float-spin pointer-events-none absolute leading-none font-extrabold text-white opacity-[0.13] select-none" style={{ fontSize: 80, right: 110, top: -20 }}>▲</span>
          <span aria-hidden className="animate-float-rot pointer-events-none absolute leading-none font-extrabold text-white opacity-[0.13] select-none" style={{ fontSize: 60, right: 24, bottom: -16 }}>●</span>
          <span aria-hidden className="animate-float-rot pointer-events-none absolute leading-none font-extrabold text-white opacity-[0.13] select-none" style={{ fontSize: 52, left: -12, bottom: -14 }}>■</span>
          <div className="absolute top-5 right-5 flex gap-2">
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
          <h2 className="text-[22px] font-extrabold">
            Привіт{user ? `, ${user.email.split('@')[0]}` : ''}! 👋
          </h2>
          <p className="mt-1 max-w-[430px] text-[12.5px] text-[#cdbfef]">
            Створюйте банки запитань, генеруйте відповіді ШІ та запускайте
            live-сесії з унікальними варіантами.
          </p>
          <div className="mt-5 flex gap-3">
            <div className="rounded-xl bg-white/12 px-4 py-2.5 text-center">
              <b className="block text-[18px]">{banks?.length ?? '—'}</b>
              <span className="text-[10.5px] text-white/70">банків</span>
            </div>
            <div className="rounded-xl bg-white/12 px-4 py-2.5 text-center">
              <b className="block text-[18px]">{banks ? totalQuestions : '—'}</b>
              <span className="text-[10.5px] text-white/70">запитань</span>
            </div>
            <div className="rounded-xl bg-white/12 px-4 py-2.5 text-center" title="Демо-дані до ігрових тасок 0018+">
              <b className="block text-[18px]">3</b>
              <span className="text-[10.5px] text-white/70">сесії (демо)</span>
            </div>
            <div className="rounded-xl bg-white/12 px-4 py-2.5 text-center" title="Демо-дані до ігрових тасок 0018+">
              <b className="block text-[18px]">68 %</b>
              <span className="text-[10.5px] text-white/70">успішність (демо)</span>
            </div>
          </div>
        </section>

        {/* bank grid */}
        {error && (
          <div className="mt-6">
            <ErrorBox>
              {error} ·{' '}
              <button type="button" className="cursor-pointer border-none bg-transparent font-bold text-inherit underline" onClick={reload}>
                повторити
              </button>
            </ErrorBox>
          </div>
        )}
        {!error && banks === null && (
          <div className="mt-8 text-center text-[#777]">Завантаження банків…</div>
        )}
        {banks !== null && banks.length === 0 && (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-[#c9bfe4] p-10 text-center text-[#6a5d8f]">
            <div className="text-[34px]">📚</div>
            <div className="mt-2 font-bold">Поки що жодного банку запитань</div>
            <div className="mt-1 text-[12.5px]">
              Створіть перший — і додавайте запитання, а ШІ згенерує варіанти
              відповідей.
            </div>
            <Button variant="purple" className="mt-4" onClick={() => { setName(''); setCreateOpen(true); }}>
              ＋ Створити банк
            </Button>
          </div>
        )}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(banks ?? []).map((bank, index) => {
            const ready = bank.questionCount
              ? Math.round((bank.readyCount / bank.questionCount) * 100)
              : 0;
            return (
              <article
                key={bank.id}
                onClick={() => navigate(`/teacher/banks/${bank.id}`)}
                className="animate-card-in cursor-pointer rounded-2xl bg-white p-4 shadow-[0_4px_18px_rgba(70,23,143,.10)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(70,23,143,.16)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px]"
                    style={{ background: CARD_GRADIENTS[index % CARD_GRADIENTS.length] }}
                  >
                    {CARD_ICONS[index % CARD_ICONS.length]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-extrabold text-[#2d1b52]">{bank.name}</h3>
                    <div className="text-[11.5px] text-[#8a7fa8]">
                      {bank.questionCount} запитань
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title="Перейменувати"
                      onClick={(event) => { event.stopPropagation(); setName(bank.name); setRenaming(bank); }}
                      className="cursor-pointer rounded-md border-none bg-transparent p-1 text-[14px] opacity-60 hover:bg-[#f0ecfa] hover:opacity-100"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      title="Видалити"
                      onClick={(event) => { event.stopPropagation(); setDeleting(bank); }}
                      className="cursor-pointer rounded-md border-none bg-transparent p-1 text-[14px] opacity-60 hover:bg-[#fdecef] hover:opacity-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-[#8a7fa8]">
                    <span>Готово до гри (ШІ)</span>
                    <b className="text-[#2d1b52]">{bank.readyCount}/{bank.questionCount}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eee7fb]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${ready}%`,
                        background:
                          ready === 100
                            ? 'linear-gradient(90deg,#26890c,#4caf2f)'
                            : 'linear-gradient(90deg,#46178F,#7b2ff7)',
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* bottom panels (prototype T1); session data is demo until 0018+ */}
      <div className="mx-auto max-w-[980px] px-7 pb-24">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-2xl bg-white p-4 shadow-[0_4px_18px_rgb(70_23_143/0.10)]">
            <h4 className="mb-3 flex items-center justify-between text-[13.5px] font-extrabold text-[#2d1b52]">
              📊 Остання сесія · 27 учасників
              <span className="rounded-full bg-[#f0ecfa] px-2 py-0.5 text-[9px] font-bold text-[#6a4fc0] uppercase">демо</span>
            </h4>
            {[
              { name: 'SQL-запити', value: 81, color: 'bg-uq-green' },
              { name: 'Транзакції', value: 63, color: 'bg-uq-yellow' },
              { name: 'Нормалізація', value: 44, color: 'bg-uq-red' },
            ].map((row) => (
              <div key={row.name} className="mb-2 flex items-center gap-2 text-[11.5px] text-[#6a5d8f]">
                <span className="w-[92px] shrink-0 truncate">{row.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee7fb]">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value}%` }} />
                </div>
                <b className="w-10 text-right text-[#2d1b52]">{row.value}%{row.value < 50 ? ' ⚠' : ''}</b>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_4px_18px_rgb(70_23_143/0.10)]">
            <h4 className="mb-3 text-[13.5px] font-extrabold text-[#2d1b52]">⚡ Швидкі дії</h4>
            <button
              type="button"
              onClick={() => navigate('/live')}
              className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-[#f4f0fc] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#2d1b52] transition-transform hover:translate-x-0.5 hover:bg-[#ede7fb]"
            >
              ▶ Запустити live-сесію (демо)
            </button>
            <button
              type="button"
              onClick={() => toast('Генерація ШІ підключиться з бекенд-таскою 0013')}
              className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-[#f4f0fc] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#2d1b52] transition-transform hover:translate-x-0.5 hover:bg-[#ede7fb]"
            >
              ✨ Догенерувати відповіді ШІ
            </button>
            <button
              type="button"
              onClick={() => toast('Апеляції — академічна фаза (post-MVP)')}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-[#f4f0fc] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#2d1b52] transition-transform hover:translate-x-0.5 hover:bg-[#ede7fb]"
            >
              ⚖️ Розглянути апеляції
              <span className="ml-auto rounded-lg bg-uq-red px-1.5 text-[9px] font-bold text-white">2</span>
            </button>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_4px_18px_rgb(70_23_143/0.10)]">
            <h4 className="mb-3 flex items-center justify-between text-[13.5px] font-extrabold text-[#2d1b52]">
              🛡 Захист — активний
              <span className="rounded-full bg-[#f0ecfa] px-2 py-0.5 text-[9px] font-bold text-[#6a4fc0] uppercase">демо</span>
            </h4>
            {[
              ['👁 Спойлер-маска', 'post-MVP'],
              ['🎲 Індивідуальні варіанти', 'post-MVP'],
              ['⏱ Таймер раунду', 'MVP'],
              ['📓 Журнал спойлерів', 'post-MVP'],
            ].map(([name]) => (
              <div key={name} className="mb-1.5 flex items-center justify-between text-[12px] text-[#6a5d8f]">
                <span>{name}</span>
                <b className="rounded-full bg-uq-green/15 px-2 py-0.5 text-[10px] text-[#26890c]">увімк.</b>
              </div>
            ))}
          </section>
        </div>
      </div>

      {createOpen && (
        <Modal title="Новий банк запитань" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(event) => void submitCreate(event)} className="flex flex-col gap-3">
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
          <form onSubmit={(event) => void submitRename(event)} className="flex flex-col gap-3">
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
          <p className="text-[13px] text-white/80">
            «{deleting.name}» буде видалено разом з усіма{' '}
            {deleting.questionCount} запитаннями і комплектами відповідей. Цю
            дію не можна скасувати.
          </p>
          <div className="mt-4 flex justify-end gap-2">
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
