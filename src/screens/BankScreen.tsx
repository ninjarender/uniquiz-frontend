import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, BanksApi, ImagesApi, QuestionsApi } from '../shared/api';
import type { AnswerSetStatus, BankDetailed, Question } from '../shared/api';
import { Modal, useToast } from '../shared/ui';
import { TeacherLayout } from './TeacherLayout';

const STATUS_LABELS: Record<AnswerSetStatus, string> = {
  generating: 'генерується',
  self_check: 'самоперевірка',
  in_review: 'на модерації',
  accepted: 'прийнято',
  edited: 'відредаговано',
  regenerating: 'перегенерація',
};

function StatusChip({ question }: { question: Question }) {
  if (!question.answerSet) return <span className="chip chip-none">без комплекту</span>;
  const status = question.answerSet.status;
  return <span className={`chip chip-${status}`}>{STATUS_LABELS[status]}</span>;
}

interface QuestionFormState {
  text: string;
  referenceAnswer: string;
  imageUrl: string | null;
}

/** Bank editor: questions table + create/edit modal with image upload. */
export function BankScreen() {
  const { bankId } = useParams<'bankId'>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bank, setBank] = useState<BankDetailed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionFormState>({ text: '', referenceAnswer: '', imageUrl: null });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    if (!bankId) return;
    setError(null);
    BanksApi.get(bankId)
      .then(setBank)
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.statusCode === 404) {
          toast('Банк не знайдено');
          navigate('/teacher', { replace: true });
          return;
        }
        setError(caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером');
      });
  }, [bankId, navigate, toast]);

  useEffect(reload, [reload]);

  const openCreate = () => {
    setForm({ text: '', referenceAnswer: '', imageUrl: null });
    setEditing('new');
  };
  const openEdit = (question: Question) => {
    setForm({
      text: question.text,
      referenceAnswer: question.referenceAnswer ?? '',
      imageUrl: question.imageUrl ?? null,
    });
    setEditing(question);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await ImagesApi.upload(file);
      setForm((previous) => ({ ...previous, imageUrl: url }));
    } catch (caught) {
      toast(
        caught instanceof ApiError
          ? caught.statusCode === 413
            ? 'Файл завеликий (ліміт 5 МБ)'
            : caught.message
          : 'Помилка завантаження',
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bankId || !editing) return;
    setBusy(true);
    const payload = {
      text: form.text.trim(),
      referenceAnswer: form.referenceAnswer.trim() || undefined,
      imageUrl: form.imageUrl ?? undefined,
    };
    try {
      if (editing === 'new') {
        await QuestionsApi.create(bankId, payload);
        toast('Запитання додано');
      } else {
        await QuestionsApi.update(editing.id, payload);
        toast('Збережено · комплект ШІ не змінювався');
      }
      setEditing(null);
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
      await QuestionsApi.remove(deleting.id);
      setDeleting(null);
      toast('Запитання видалено разом з комплектом');
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
        <Link to="/teacher" className="text-[12.5px] font-semibold text-[#6a4fc0] no-underline hover:underline">
          ← Мої банки
        </Link>

        {error && (
          <div className="uq-error mt-4">
            {error} ·{' '}
            <button type="button" className="cursor-pointer border-none bg-transparent font-bold text-inherit underline" onClick={reload}>
              повторити
            </button>
          </div>
        )}
        {!error && !bank && <div className="mt-8 text-center text-[#777]">Завантаження…</div>}

        {bank && (
          <>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[21px] font-extrabold text-[#2d1b52]">{bank.name} · банк запитань</h2>
                <div className="mt-1 text-[12.5px] text-[#8a7fa8]">
                  {bank.questionCount} запитань · готово до гри: <b>{bank.readyCount}</b>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-purple" onClick={openCreate}>
                  ＋ Додати запитання
                </button>
                <button
                  type="button"
                  className="btn-purple opacity-70"
                  title="Бекенд-таска 0013 ще в роботі"
                  onClick={() => toast('Генерація ШІ підключиться з бекенд-таскою 0013')}
                >
                  ✨ Згенерувати відповіді (ШІ)
                </button>
              </div>
            </div>

            {bank.questions.length === 0 ? (
              <div className="mt-8 rounded-2xl border-2 border-dashed border-[#c9bfe4] p-10 text-center text-[#6a5d8f]">
                <div className="text-[34px]">❓</div>
                <div className="mt-2 font-bold">У банку ще немає запитань</div>
                <div className="mt-1 text-[12.5px]">
                  Додайте перше: текст, за бажанням — зображення та еталонна
                  відповідь для ШІ.
                </div>
                <button type="button" className="btn-purple mt-4" onClick={openCreate}>
                  ＋ Додати запитання
                </button>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(70,23,143,.10)]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f4f0fc] text-left text-[11px] tracking-wide text-[#6a5d8f] uppercase">
                      <th className="w-10 px-4 py-3">#</th>
                      <th className="px-2 py-3">Запитання</th>
                      <th className="w-24 px-2 py-3">Медіа</th>
                      <th className="w-40 px-2 py-3">Еталонна відповідь</th>
                      <th className="w-36 px-2 py-3">Комплект ШІ</th>
                      <th className="w-20 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {bank.questions.map((question, index) => (
                      <tr key={question.id} className="border-t border-[#f0ebfa] align-middle hover:bg-[#faf8ff]">
                        <td className="px-4 py-2.5 font-bold text-[#8a7fa8]">{index + 1}</td>
                        <td className="px-2 py-2.5 text-[#2d1b52]">{question.text}</td>
                        <td className="px-2 py-2.5">
                          {question.imageUrl ? (
                            <img
                              src={question.imageUrl}
                              alt=""
                              className="h-9 w-14 rounded-md object-cover shadow"
                            />
                          ) : (
                            <span className="text-[#c2b8d9]">—</span>
                          )}
                        </td>
                        <td className="truncate px-2 py-2.5 text-[#6a5d8f]">
                          {question.referenceAnswer ?? <span className="text-[#c2b8d9]">—</span>}
                        </td>
                        <td className="px-2 py-2.5"><StatusChip question={question} /></td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Редагувати"
                              onClick={() => openEdit(question)}
                              className="cursor-pointer rounded-md border-none bg-transparent p-1 opacity-60 hover:bg-[#f0ecfa] hover:opacity-100"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              title="Видалити"
                              onClick={() => setDeleting(question)}
                              className="cursor-pointer rounded-md border-none bg-transparent p-1 opacity-60 hover:bg-[#fdecef] hover:opacity-100"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Нове запитання' : 'Редагувати запитання'}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
            <textarea
              className="uq-field min-h-[84px] resize-y"
              autoFocus
              required
              placeholder="Текст запитання (слово, фраза або факт)"
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
            />
            <input
              className="uq-field"
              placeholder="Еталонна відповідь (опційно — тоді ШІ згенерує лише дистрактори)"
              value={form.referenceAnswer}
              onChange={(event) => setForm({ ...form, referenceAnswer: event.target.value })}
            />

            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <div className="relative">
                  <img src={form.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover shadow" />
                  <button
                    type="button"
                    title="Прибрати зображення"
                    onClick={() => setForm({ ...form, imageUrl: null })}
                    className="absolute -top-2 -right-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-[var(--red)] text-[10px] text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-purple"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? 'Завантаження…' : '🖼 Додати зображення'}
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                hidden
                onChange={(event) => void pickImage(event.target.files?.[0])}
              />
              <span className="text-[11px] text-white/50">PNG/JPEG/GIF/WebP · до 5 МБ</span>
            </div>

            {editing !== 'new' && editing.answerSet && (
              <div className="rounded-lg bg-white/8 px-3 py-2 text-[11.5px] text-white/70">
                ℹ️ Правка не чіпає наявний комплект ШІ — за потреби його можна
                перегенерувати окремо (таска 0017).
              </div>
            )}

            <button className="btn-green" type="submit" disabled={busy || !form.text.trim()}>
              {editing === 'new' ? 'Додати' : 'Зберегти'}
            </button>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Видалити запитання?" onClose={() => setDeleting(null)}>
          <p className="text-[13px] text-white/80">
            «{deleting.text.slice(0, 80)}
            {deleting.text.length > 80 ? '…' : ''}» буде видалено
            {deleting.answerSet ? ' разом з комплектом відповідей' : ''}.
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
