import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, BanksApi } from '../shared/api';
import type { Bank } from '../shared/api';
import { useAuth } from '../shared/auth';
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
          <span aria-hidden className="sh spin" style={{ fontSize: 80, right: 110, top: -20 }}>▲</span>
          <span aria-hidden className="sh" style={{ fontSize: 60, right: 24, bottom: -16 }}>●</span>
          <span aria-hidden className="sh" style={{ fontSize: 52, left: -12, bottom: -14 }}>■</span>
          <div className="absolute top-5 right-5 flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/live')}
              className="btn-purple"
              title="Демо-муляж live-сесії (проєктор)"
            >
              ▶ Демо-сесія
            </button>
            <button
              type="button"
              onClick={() => { setName(''); setCreateOpen(true); }}
              className="btn-green"
            >
              ＋ Створити банк
            </button>
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
          </div>
        </section>

        {/* bank grid */}
        {error && (
          <div className="uq-error mt-6">
            {error} · <button type="button" className="cursor-pointer border-none bg-transparent font-bold text-inherit underline" onClick={reload}>повторити</button>
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
            <button type="button" className="btn-purple mt-4" onClick={() => { setName(''); setCreateOpen(true); }}>
              ＋ Створити банк
            </button>
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
                className="cursor-pointer rounded-2xl bg-white p-4 shadow-[0_4px_18px_rgba(70,23,143,.10)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(70,23,143,.16)]"
                style={{ animation: 'cardIn .3s ease both', animationDelay: `${index * 40}ms` }}
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

      {createOpen && (
        <Modal title="Новий банк запитань" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(event) => void submitCreate(event)} className="flex flex-col gap-3">
            <input
              className="uq-field"
              autoFocus
              required
              placeholder="Назва, напр. «Бази даних — Модуль 1»"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="btn-green" type="submit" disabled={busy || !name.trim()}>
              Створити
            </button>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="Перейменувати банк" onClose={() => setRenaming(null)}>
          <form onSubmit={(event) => void submitRename(event)} className="flex flex-col gap-3">
            <input
              className="uq-field"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="btn-purple" type="submit" disabled={busy || !name.trim()}>
              Зберегти
            </button>
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
            <button type="button" className="btn-purple" onClick={() => setDeleting(null)}>
              Скасувати
            </button>
            <button type="button" className="btn-danger" onClick={() => void confirmDelete()} disabled={busy}>
              Видалити
            </button>
          </div>
        </Modal>
      )}
    </TeacherLayout>
  );
}
