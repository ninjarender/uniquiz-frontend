import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN, ROUND_TIME_S } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { Button } from '../../shared/controls';
import { FloatingShapes } from '../../shared/ui';
import type { CSSVars } from '../../shared/ui';
import styles from './RoundScreen.module.css';
import type { ShapeSpec } from '../../shared/ui';

const ROUND_SHAPES: ShapeSpec[] = [
  { glyph: '●', size: 54, top: '40%', left: '-14px' },
  { glyph: '◆', size: 48, top: '60%', right: '-12px' },
];

const TILE_COLORS = ['bg-uq-red', 'bg-uq-blue', 'bg-uq-yellow', 'bg-uq-green'];
const TILE_ICONS = ['▲', '◆', '●', '■'];
const TICK_MS = 100;

/**
 * S1 - the round: shared timer, spoiler masks, pick-then-confirm
 * (changeable until confirmed), early finish when everyone confirmed.
 */
export function RoundScreen() {
  const game = useDemoGame();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [leftMs, setLeftMs] = useState(ROUND_TIME_S * 1000);
  const [botsDone, setBotsDone] = useState(0);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const question = game.questions[game.currentIndex];
  const you = game.players.find((player) => player.isYou);
  const totalBots = game.players.length - 1;

  // Deep link without a game -> join screen.
  useEffect(() => {
    if (!question) navigate('/play', { replace: true });
  }, [question, navigate]);

  const finish = useCallback(
    (choice: number | null) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const elapsedSeconds = Math.min(
        (Date.now() - startRef.current) / 1000,
        ROUND_TIME_S,
      );
      game.finishRound(choice, elapsedSeconds);
      navigate('/play/result');
    },
    [game, navigate],
  );

  // Round timer; on timeout the last selected option is auto-submitted (kb rule).
  useEffect(() => {
    const timer = setInterval(() => {
      const left = ROUND_TIME_S * 1000 - (Date.now() - startRef.current);
      setLeftMs(Math.max(left, 0));
      if (left <= 0) finish(selected);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [finish, selected]);

  // Bots confirm one by one; when everyone confirmed - early finish.
  useEffect(() => {
    if (totalBots <= 0) return;
    const timers = Array.from({ length: totalBots }, (_, index) =>
      setTimeout(
        () => setBotsDone((previous) => Math.min(previous + 1, totalBots)),
        2500 + Math.random() * 9000 + index * 900,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [totalBots]);

  useEffect(() => {
    if (confirmed && botsDone >= totalBots) {
      const timeout = setTimeout(() => finish(selected), 700);
      return () => clearTimeout(timeout);
    }
  }, [confirmed, botsDone, totalBots, finish, selected]);

  if (!question || !you) return null;

  const leftSeconds = Math.ceil(leftMs / 1000);
  const leftPercent = (leftMs / (ROUND_TIME_S * 1000)) * 100;

  return (
    <div className="grad-bg relative flex h-full flex-col overflow-hidden">
      <FloatingShapes shapes={ROUND_SHAPES} />

      {/* top bar: progress · timer · score */}
      <div className="relative flex items-center justify-between px-4 pt-4">
        <div className="rounded-full bg-white/12 px-3.5 py-1.5 text-[12.5px] font-bold">
          {game.currentIndex + 1} / {QUIZ_LEN}
        </div>
        <div className={styles.ring} style={{ '--left': leftPercent } as CSSVars}>
          {leftSeconds}
        </div>
        <div className="rounded-full bg-white/12 px-3.5 py-1.5 text-[12.5px] font-bold">
          🏆 {Math.round(you.score)}
        </div>
      </div>

      {/* question card with a spoiler mask */}
      <div className="group relative mx-4 mt-4 rounded-2xl bg-uq-dark p-5 text-center text-[15px] leading-snug font-bold select-none">
        <div className="blur-[7px] transition-[filter] duration-100 group-hover:blur-none">
          {question.text}
        </div>
      </div>

      {/* answers */}
      <div className="relative mx-4 mt-4 grid flex-1 auto-rows-min gap-2.5">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            disabled={confirmed}
            onClick={() => setSelected((previous) => (previous === index ? null : index))}
            className={`group flex cursor-pointer items-center gap-2.5 rounded-xl border-none px-3 py-[13px] text-left text-[13.5px] font-semibold text-white outline-3 transition-[transform,outline-color,filter] duration-100 select-none ${TILE_COLORS[index]} ${
              selected === index
                ? 'scale-[1.02] outline-uq-accent'
                : 'outline-transparent'
            } ${
              confirmed
                ? selected === index
                  ? 'cursor-default'
                  : 'cursor-default brightness-75 saturate-[0.72]'
                : 'hover:-translate-y-px hover:brightness-105'
            }`}
          >
            <span className="text-[16px]">{TILE_ICONS[index]}</span>
            <span className="blur-[7px] transition-[filter] duration-100 group-hover:blur-none">
              {option}
            </span>
            {selected === index && <span className="ml-auto text-uq-accent">✔</span>}
          </button>
        ))}
      </div>

      {/* confirm + waiting */}
      <div className="relative px-4 pb-5">
        {!confirmed ? (
          <>
            <Button className="w-full" onClick={() => setConfirmed(true)}>
              {selected === null ? 'Підтвердити без відповіді' : 'Підтвердити відповідь'}
            </Button>
            <div className="mt-2 text-center text-[10.5px] text-white/50">
              Вибір можна змінювати до підтвердження · відкрито може бути лише
              один елемент · копіювання вимкнено
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center text-[12.5px] text-white/80">
            <span className="mr-1 inline-block animate-pulse">⏳</span>
            Відповідь зафіксовано — очікуємо інших гравців ({botsDone}/{totalBots})
          </div>
        )}
      </div>
    </div>
  );
}
