import { useState } from 'react';
import type { AnswerSet, Question } from '../../shared/api';
import { Button, TextArea, TextField } from '../../shared/controls';
import { Modal, useToast } from '../../shared/ui';
import styles from './DemoModeration.module.css';

/**
 * Demo moderation of an AI answer set (prototype's moderation modal).
 * Works on client-side demo sets until backend tasks 0015-0017 land;
 * accept / edit / regenerate only touch local state.
 */

export type DemoSet = AnswerSet & { demo: true };

const DISTRACTOR_POOL = [
  'Це залежить від налаштувань СУБД',
  'Такої операції не існує в SQL',
  'Обидва варіанти еквівалентні',
  'Лише в комерційних СУБД',
];

export function makeDemoSet(question: Question, attempt = 0): DemoSet {
  const correct =
    question.referenceAnswer ?? `Правильна відповідь (демо) — «${question.text.slice(0, 28)}…»`;
  const shift = attempt % DISTRACTOR_POOL.length;
  const distractors = [
    DISTRACTOR_POOL[shift],
    DISTRACTOR_POOL[(shift + 1) % DISTRACTOR_POOL.length],
    DISTRACTOR_POOL[(shift + 2) % DISTRACTOR_POOL.length],
  ];
  const correctIndex = Math.floor(Math.random() * 4);
  const options = [...distractors];
  options.splice(correctIndex, 0, correct);
  return {
    id: `demo-${question.id}-${attempt}`,
    questionId: question.id,
    options,
    correctIndex,
    spareDistractor: DISTRACTOR_POOL[(shift + 3) % DISTRACTOR_POOL.length],
    explanation: 'Демо-пояснення: чому правильний саме цей варіант (згенерує ШІ, таска 0013).',
    status: 'in_review',
    selfCheckPassed: true,
    demo: true,
  };
}

export function ModerationModal({
  question,
  set,
  onClose,
  onChange,
}: {
  question: Question;
  set: DemoSet;
  onClose: () => void;
  onChange: (next: DemoSet) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DemoSet>(set);

  const accept = () => {
    onChange({ ...draft, status: 'accepted' });
    toast('Комплект прийнято (демо · збережеться з таскою 0015)');
    onClose();
  };
  const saveEdit = () => {
    onChange({ ...draft, status: 'edited' });
    toast('Правки збережено (демо · таска 0016)');
    setEditing(false);
  };
  const regenerate = () => {
    const next = makeDemoSet(question, Math.floor(Math.random() * 100));
    setDraft(next);
    onChange(next);
    toast('Перегенеровано (демо · таска 0017)');
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
          draft.spareDistractor
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
          draft.explanation
        )}
      </div>

      <div className={styles.selfCheck}>
        Самоперевірка ШІ: {draft.selfCheckPassed ? '✅ збіг' : '⚠ розбіжність'}
        <span className={styles.demoBadge}>демо</span>
      </div>

      <div className={styles.actions}>
        {editing ? (
          <>
            <Button variant="purple" onClick={() => { setDraft(set); setEditing(false); }}>
              Скасувати
            </Button>
            <Button onClick={saveEdit}>Зберегти правки</Button>
          </>
        ) : (
          <>
            <Button variant="purple" onClick={() => setEditing(true)}>✏️ Правити</Button>
            <Button variant="purple" onClick={regenerate}>↻ Перегенерувати</Button>
            <Button onClick={accept}>✔ Прийняти</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
