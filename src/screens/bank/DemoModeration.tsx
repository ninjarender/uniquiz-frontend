import { useState } from 'react';
import type { AnswerSet, Question } from '../../shared/api';
import { Button, TextArea, TextField } from '../../shared/controls';
import { Modal, useToast } from '../../shared/ui';

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
      <div className="mb-3 rounded-xl bg-white/8 px-4 py-3 text-[13.5px] font-bold">
        {question.text}
      </div>

      <div className="flex flex-col gap-2">
        {draft.options.map((option, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] ${
              index === draft.correctIndex
                ? 'bg-uq-green/22 outline-1 outline-uq-green'
                : 'bg-white/8'
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
                  className="!py-1.5 text-[12.5px]"
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
                <span className="w-4 text-center">
                  {index === draft.correctIndex ? '✅' : '·'}
                </span>
                <span>{option}</span>
                {index === draft.correctIndex && (
                  <span className="ml-auto text-[10px] font-bold text-[#7fe25a] uppercase">
                    правильна
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11.5px] text-white/65">
        <b className="text-white/85">Запасний дистрактор (для trap):</b>{' '}
        {editing ? (
          <TextField
            className="mt-1 !py-1.5 text-[12px]"
            value={draft.spareDistractor ?? ''}
            onChange={(event) => setDraft({ ...draft, spareDistractor: event.target.value })}
          />
        ) : (
          draft.spareDistractor
        )}
      </div>

      <div className="mt-2 text-[11.5px] text-white/65">
        <b className="text-white/85">Пояснення:</b>{' '}
        {editing ? (
          <TextArea
            className="mt-1 min-h-[64px] text-[12px]"
            value={draft.explanation ?? ''}
            onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
          />
        ) : (
          draft.explanation
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-white/55">
        Самоперевірка ШІ: {draft.selfCheckPassed ? '✅ збіг' : '⚠ розбіжність'}
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-bold text-uq-accent uppercase">
          демо
        </span>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
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
