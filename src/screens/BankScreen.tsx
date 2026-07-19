import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, BanksApi, GenerationApi, ImagesApi, QuestionsApi } from '../shared/api';
import type { AnswerSetStatus, BankDetailed, GenerationJob, Question } from '../shared/api';
import { Button, TextArea, TextField } from '../shared/controls';
import { ErrorBox } from '../shared/controls';
import { Modal, useToast } from '../shared/ui';
import { ModerationModal } from './bank/DemoModeration';
import type { DemoSet } from './bank/DemoModeration';
import styles from './BankScreen.module.css';
import { TeacherLayout } from './TeacherLayout';

const STATUS_LABELS: Record<AnswerSetStatus, string> = {
  generating: 'генерується',
  self_check: 'самоперевірка',
  in_review: 'на модерації',
  accepted: 'прийнято',
  edited: 'відредаговано',
  regenerating: 'перегенерація',
};

const STATUS_CHIP: Record<AnswerSetStatus, string> = {
  accepted: styles.chipReady,
  edited: styles.chipReady,
  in_review: styles.chipReview,
  generating: styles.chipWorking,
  self_check: styles.chipWorking,
  regenerating: styles.chipWorking,
};

function StatusChip({ question }: { question: Question }) {
  if (!question.answerSet) {
    return <span className={`${styles.chip} ${styles.chipNone}`}>без комплекту</span>;
  }
  const status = question.answerSet.status;
  return (
    <span className={`${styles.chip} ${STATUS_CHIP[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface QuestionFormState {
  text: string;
  referenceAnswer: string;
  imageUrl: string | null;
}

/** Bank editor: questions table + create/edit modal + demo AI moderation. */
export function BankScreen() {
  const { bankId } = useParams<'bankId'>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bank, setBank] = useState<BankDetailed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionFormState>({
    text: '',
    referenceAnswer: '',
    imageUrl: null,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Client-only demo answer sets (until backend generation, tasks 0013-0017).
  const [demoSets, setDemoSets] = useState<Map<string, DemoSet>>(new Map());
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [moderating, setModerating] = useState<Question | null>(null);

  const jobActive = job?.status === 'queued' || job?.status === 'running';

  const effectiveSet = (question: Question): DemoSet | undefined =>
    question.answerSet
      ? undefined // real sets will get their own moderation with tasks 0015+
      : demoSets.get(question.id);

  const startGeneration = async () => {
    if (!bank) return;
    if (bank.questions.length === 0) {
      toast('Спершу додайте запитання');
      return;
    }
    setStarting(true);
    try {
      const started = await GenerationApi.start(bank.id);
      setJob(started);
      toast('Генерацію запущено');
      reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.statusCode === 409) {
        // Already running — pick up the active job and start tracking it.
        toast('Генерація для цього банку вже виконується');
        setJob(await GenerationApi.status(bank.id).catch(() => null));
        return;
      }
      toast(caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером');
    } finally {
      setStarting(false);
    }
  };

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
        setError(
          caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером',
        );
      });
  }, [bankId, navigate, toast]);

  useEffect(reload, [reload]);

  // Pick up a generation that is already active (e.g. after a page refresh).
  useEffect(() => {
    if (!bankId) return;
    GenerationApi.status(bankId)
      .then((current) => {
        if (current.status === 'queued' || current.status === 'running') setJob(current);
      })
      .catch(() => undefined); // status is auxiliary here — bank load reports real errors
  }, [bankId]);

  // Poll while the job is active; the interval dies as soon as jobActive flips off.
  useEffect(() => {
    if (!bankId || !jobActive) return;
    const timer = setInterval(() => {
      GenerationApi.status(bankId)
        .then((next) => {
          setJob(next);
          if (next.status === 'done') {
            toast('Генерація завершена — комплекти чекають модерації');
            reload();
          } else if (next.status === 'failed') {
            reload();
          }
        })
        .catch(() => undefined); // transient polling error — keep trying
    }, 2000);
    return () => clearInterval(timer);
  }, [bankId, jobActive, reload, toast]);

  // Sets still being processed by the worker; done = the rest of the job's total.
  const setsInFlight = ['generating', 'self_check', 'regenerating'].reduce(
    (sum, status) => sum + (job?.countsByStatus?.[status] ?? 0),
    0,
  );
  const setsDone = job ? Math.max(0, job.total - setsInFlight) : 0;

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
      <div className={styles.content}>
        <Link to="/teacher" className={styles.backLink}>
          ← Мої банки
        </Link>

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
        {!error && !bank && <div className={styles.loading}>Завантаження…</div>}

        {bank && (
          <>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>{bank.name} · банк запитань</h2>
                <div className={styles.sub}>
                  {bank.questionCount} запитань · готово до гри: <b>{bank.readyCount}</b>
                </div>
              </div>
              <div className={styles.toolbar}>
                <Button variant="purple" onClick={openCreate}>
                  ＋ Додати запитання
                </Button>
                <Button
                  variant="purple"
                  className={styles.generateBtn}
                  disabled={starting || jobActive}
                  title="Поставити генерацію комплектів у чергу на бекенді"
                  onClick={() => void startGeneration()}
                >
                  {starting || jobActive ? '⏳ Генерується…' : '✨ Згенерувати відповіді (ШІ)'}
                </Button>
                <Button
                  variant="purple"
                  className={styles.mutedBtn}
                  onClick={() => toast('У повній версії: імпорт запитань із DOCX/TXT')}
                >
                  📄 Імпорт з DOCX
                </Button>
                <Button onClick={() => navigate('/live')}>
                  ▶ Запустити live-сесію (демо)
                </Button>
              </div>
            </div>

            {jobActive && job && (
              <div className={styles.genBanner}>
                ⏳ Генерація йде: готово {setsDone} з {job.total}. Комплекти
                зʼявляться в таблиці після завершення.
              </div>
            )}
            {job?.status === 'failed' && (
              <div className={styles.genErrorBanner}>
                ⚠ Генерація не вдалася{job.error ? `: ${job.error}` : ''}. Можна
                запустити ще раз.
              </div>
            )}

            {demoSets.size > 0 && (
              <div className={styles.demoBanner}>
                ⚠ Демо-комплекти живуть лише в цій вкладці і не збережені в базі —
                реальна генерація підключиться з бекенд-таскою 0013.
              </div>
            )}

            {bank.questions.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>❓</div>
                <div className={styles.emptyTitle}>У банку ще немає запитань</div>
                <div className={styles.emptyText}>
                  Додайте перше: текст, за бажанням — зображення та еталонна
                  відповідь для ШІ.
                </div>
                <Button variant="purple" className={styles.emptyBtn} onClick={openCreate}>
                  ＋ Додати запитання
                </Button>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Запитання</th>
                      <th className={styles.thMedia}>Медіа</th>
                      <th className={styles.thReference}>Еталонна відповідь</th>
                      <th className={styles.thSet}>Комплект ШІ</th>
                      <th className={styles.thActions} />
                    </tr>
                  </thead>
                  <tbody>
                    {bank.questions.map((question, index) => (
                      <tr
                        key={question.id}
                        onClick={() => {
                          if (effectiveSet(question)) setModerating(question);
                        }}
                        className={effectiveSet(question) ? styles.rowClickable : ''}
                      >
                        <td>{index + 1}</td>
                        <td className={styles.cellText}>{question.text}</td>
                        <td>
                          {question.imageUrl ? (
                            <img src={question.imageUrl} alt="" className={styles.mediaImg} />
                          ) : (
                            <span className={styles.cellMuted}>—</span>
                          )}
                        </td>
                        <td className={styles.cellReference}>
                          {question.referenceAnswer ?? (
                            <span className={styles.cellMuted}>—</span>
                          )}
                        </td>
                        <td>
                          <StatusChip
                            question={
                              effectiveSet(question)
                                ? { ...question, answerSet: effectiveSet(question) }
                                : question
                            }
                          />
                          {effectiveSet(question) && (
                            <span className={styles.demoMark}>демо</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              title="Редагувати"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(question);
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
                                setDeleting(question);
                              }}
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
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
          <form onSubmit={(event) => void submit(event)} className="modal-form">
            <TextArea
              className={styles.textareaTall}
              autoFocus
              required
              placeholder="Текст запитання (слово, фраза або факт)"
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
            />
            <TextField
              placeholder="Еталонна відповідь (опційно — тоді ШІ згенерує лише дистрактори)"
              value={form.referenceAnswer}
              onChange={(event) => setForm({ ...form, referenceAnswer: event.target.value })}
            />

            <div className={styles.uploadRow}>
              {form.imageUrl ? (
                <div className={styles.imagePreviewWrap}>
                  <img src={form.imageUrl} alt="" className={styles.imagePreview} />
                  <button
                    type="button"
                    title="Прибрати зображення"
                    onClick={() => setForm({ ...form, imageUrl: null })}
                    className={styles.removeImgBtn}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Button
                  variant="purple"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? 'Завантаження…' : '🖼 Додати зображення'}
                </Button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className={styles.hiddenInput}
                onChange={(event) => void pickImage(event.target.files?.[0])}
              />
              <span className={styles.uploadHint}>PNG/JPEG/GIF/WebP · до 5 МБ</span>
            </div>

            {editing !== 'new' && editing.answerSet && (
              <div className={styles.editNote}>
                ℹ️ Правка не чіпає наявний комплект ШІ — за потреби його можна
                перегенерувати окремо (таска 0017).
              </div>
            )}

            <Button type="submit" disabled={busy || !form.text.trim()}>
              {editing === 'new' ? 'Додати' : 'Зберегти'}
            </Button>
          </form>
        </Modal>
      )}

      {moderating && effectiveSet(moderating) && (
        <ModerationModal
          question={moderating}
          set={effectiveSet(moderating)!}
          onClose={() => setModerating(null)}
          onChange={(next) =>
            setDemoSets((previous) => {
              const map = new Map(previous);
              map.set(moderating.id, next);
              return map;
            })
          }
        />
      )}

      {deleting && (
        <Modal title="Видалити запитання?" onClose={() => setDeleting(null)}>
          <p className="modal-text">
            «{deleting.text.slice(0, 80)}
            {deleting.text.length > 80 ? '…' : ''}» буде видалено
            {deleting.answerSet ? ' разом з комплектом відповідей' : ''}.
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
