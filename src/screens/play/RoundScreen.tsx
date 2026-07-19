import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN, ROUND_TIME_S } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { Button } from '../../shared/controls';
import { FloatingShapes } from '../../shared/ui';
import type { CSSVars, ShapeSpec } from '../../shared/ui';
import styles from './RoundScreen.module.css';

const TILE_COLORS = [
  styles.tileRed,
  styles.tileBlue,
  styles.tileYellow,
  styles.tileGreen,
];

const ROUND_SHAPES: ShapeSpec[] = [
  { glyph: '●', size: 54, top: '40%', left: '-14px' },
  { glyph: '◆', size: 48, top: '60%', right: '-12px' },
];


const TILE_ICONS = ['▲', '◆', '●', '■'];
const TICK_MS = 100;

/**
 * S1 - the round, Kahoot-style centered stage: header on top, question in
 * the middle, 2x2 answers + confirm at the bottom. Spoiler masks, shared
 * timer, pick-then-confirm (changeable until confirmed), early finish when
 * everyone confirmed.
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
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={ROUND_SHAPES} />

      <div className={styles.stage}>
        {/* top bar: progress · timer · score */}
        <div className={styles.topBar}>
          <div className={styles.chip}>
            {game.currentIndex + 1} / {QUIZ_LEN}
          </div>
          <div className={styles.ring} style={{ '--left': leftPercent } as CSSVars}>
            {leftSeconds}
          </div>
          <div className={styles.chip}>🏆 {Math.round(you.score)}</div>
        </div>

        {/* question, vertically centered in the remaining space */}
        <div className={styles.questionWrap}>
          <div className={styles.questionCard}>
            <div className={styles.spoiler}>{question.text}</div>
          </div>
        </div>

        {/* answers: 2x2 on desktop, single column on phones */}
        <div className={styles.answers}>
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              disabled={confirmed}
              onClick={() =>
                setSelected((previous) => (previous === index ? null : index))
              }
              className={`${styles.tile} ${TILE_COLORS[index]} ${
                selected === index ? styles.tileSelected : ''
              } ${
                confirmed
                  ? selected === index
                    ? styles.tileLockedSelected
                    : styles.tileDimmed
                  : ''
              }`}
            >
              <span className={styles.tileIcon}>{TILE_ICONS[index]}</span>
              <span className={styles.spoiler}>{option}</span>
              {selected === index && <span className={styles.tileCheck}>✔</span>}
            </button>
          ))}
        </div>

        {/* confirm + waiting, centered */}
        <div className={styles.confirmZone}>
          {!confirmed ? (
            <>
              <Button className={styles.confirmBtn} onClick={() => setConfirmed(true)}>
                {selected === null
                  ? 'Підтвердити без відповіді'
                  : 'Підтвердити відповідь'}
              </Button>
              <div className={styles.hint}>
                Вибір можна змінювати до підтвердження · відкрито може бути лише
                один елемент · копіювання вимкнено
              </div>
            </>
          ) : (
            <div className={styles.waitingBox}>
              <span className={styles.waitingIcon}>⏳</span>
              Відповідь зафіксовано — очікуємо інших гравців ({botsDone}/
              {totalBots})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
