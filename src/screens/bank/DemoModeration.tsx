import { useState } from 'react';
import type { AnswerSet, Question } from '../../shared/api';
import { Button, TextArea, TextField } from '../../shared/controls';
import { Modal } from '../../shared/ui';
import styles from './DemoModeration.module.css';

/**
 * Moderation modal for an AI-generated answer set (task 0044).
 * Accept hits the real backend; save-edit and regenerate get wired
 * with tasks 0045-0046 (their buttons are stubbed until then).
 */

export function ModerationModal({
  question,
  set,
  busy,
  onClose,
  onAccept,
}: {
  question: Question;
  set: AnswerSet;
  busy: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AnswerSet>(set);

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

      <div className={styles.actions}>
        {editing ? (
          <>
            <Button variant="purple" onClick={() => { setDraft(set); setEditing(false); }}>
              Скасувати
            </Button>
            <Button disabled title="Збереження правок підключиться з таскою 0045">
              Зберегти правки
            </Button>
          </>
        ) : (
          <>
            <Button variant="purple" onClick={() => setEditing(true)}>✏️ Правити</Button>
            <Button
              variant="purple"
              disabled
              title="Перегенерація підключиться з таскою 0046"
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
