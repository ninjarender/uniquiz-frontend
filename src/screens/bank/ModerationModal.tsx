import { useEffect, useState } from 'react';
import { ApiError } from '../../shared/api';
import type { AnswerSet, AnswerSetPatch, Question } from '../../shared/api';
import { Button, ErrorBox, TextArea, TextField } from '../../shared/controls';
import { Modal } from '../../shared/ui';
import styles from './ModerationModal.module.css';

/**
 * Moderation modal for an AI-generated answer set (tasks 0044-0046):
 * accept, host edit and regenerate all go through the backend.
 */

export function ModerationModal({
  question,
  set,
  busy,
  onClose,
  onAccept,
  onRegenerate,
  onSave,
}: {
  question: Question;
  set: AnswerSet;
  busy: boolean;
  onClose: () => void;
  onAccept: () => void;
  onRegenerate: () => void;
  /** Rejections surface next to the edit form, not as a toast. */
  onSave: (patch: AnswerSetPatch) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AnswerSet>(set);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Follow background updates of the set, but never clobber an edit in progress.
  useEffect(() => {
    if (!editing) setDraft(set);
  }, [set, editing]);

  // Contract AnswerSetPatch: only the fields that actually changed.
  const buildPatch = (): AnswerSetPatch => {
    const patch: AnswerSetPatch = {};
    if (draft.options.some((option, index) => option !== set.options[index])) {
      patch.options = draft.options.map((option) => option.trim());
    }
    if (draft.correctIndex !== set.correctIndex) patch.correctIndex = draft.correctIndex;
    if ((draft.spareDistractor ?? '') !== (set.spareDistractor ?? '')) {
      patch.spareDistractor = (draft.spareDistractor ?? '').trim();
    }
    if ((draft.explanation ?? '') !== (set.explanation ?? '')) {
      patch.explanation = (draft.explanation ?? '').trim();
    }
    return patch;
  };

  const saveEdit = async () => {
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      // Contract requires min one field — nothing changed, just leave edit mode.
      setFormError(null);
      setEditing(false);
      return;
    }
    if (patch.options && patch.options.some((option) => option.length === 0)) {
      setFormError('Усі 4 варіанти мають бути заповнені');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSave(patch);
      setEditing(false);
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Модерація комплекту відповідей" onClose={onClose}>
      <div className={styles.questionBox}>{question.text}</div>

      <div className={styles.options}>
        {draft.options.map((option, index) => (
          <div
            key={index}
            className={`${styles.option} ${
              index === draft.correctIndex ? styles.optionCorrect : ''
            }`}
          >
            {editing ? (
              <>
                <input
                  type="radio"
                  name="correct"
                  checked={index === draft.correctIndex}
                  onChange={() => setDraft({ ...draft, correctIndex: index })}
                />
                <TextField
                  className={styles.optionField}
                  value={option}
                  onChange={(event) => {
                    const options = [...draft.options];
                    options[index] = event.target.value;
                    setDraft({ ...draft, options });
                  }}
                />
              </>
            ) : (
              <>
                <span className={styles.optionMark}>
                  {index === draft.correctIndex ? '✅' : '·'}
                </span>
                <span>{option}</span>
                {index === draft.correctIndex && (
                  <span className={styles.correctTag}>правильна</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className={styles.metaLine}>
        <b className={styles.metaLabel}>Запасний дистрактор (для trap):</b>{' '}
        {editing ? (
          <TextField
            className={`${styles.optionField} ${styles.metaField}`}
            value={draft.spareDistractor ?? ''}
            onChange={(event) => setDraft({ ...draft, spareDistractor: event.target.value })}
          />
        ) : (
          draft.spareDistractor ?? '—'
        )}
      </div>

      <div className={styles.metaLine}>
        <b className={styles.metaLabel}>Пояснення:</b>{' '}
        {editing ? (
          <TextArea
            className={styles.metaTextarea}
            value={draft.explanation ?? ''}
            onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
          />
        ) : (
          draft.explanation ?? '—'
        )}
      </div>

      <div className={styles.selfCheck}>
        Самоперевірка ШІ: {set.selfCheckPassed ? '✅ збіг' : '⚠ розбіжність'}
      </div>

      {editing && formError && <ErrorBox>{formError}</ErrorBox>}

      <div className={styles.actions}>
        {editing ? (
          <>
            <Button
              variant="purple"
              disabled={saving}
              onClick={() => {
                setDraft(set);
                setFormError(null);
                setEditing(false);
              }}
            >
              Скасувати
            </Button>
            <Button disabled={saving} onClick={() => void saveEdit()}>
              {saving ? 'Збереження…' : 'Зберегти правки'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="purple" onClick={() => setEditing(true)}>✏️ Правити</Button>
            <Button
              variant="purple"
              disabled={busy}
              title="Повернути комплект на перегенерацію (потім знову на модерацію)"
              onClick={onRegenerate}
            >
              ↻ Перегенерувати
            </Button>
            <Button
              disabled={busy || set.status !== 'in_review'}
              title={
                set.status !== 'in_review'
                  ? 'Комплект уже поза модерацією'
                  : 'Прийняти комплект у гру'
              }
              onClick={onAccept}
            >
              ✔ Прийняти
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
