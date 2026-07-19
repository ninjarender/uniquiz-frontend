import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../shared/game';
import { serverNow } from '../../shared/server-clock';
import type { ActiveQuestion } from '../../shared/ws-protocol';
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
const REAL_TICK_MS = 100;

/**
 * S1 - the round (task 0056): the server owns questions, timing and scoring;
 * the client only picks, confirms via submit_answer and waits. "Confirmed"
 * turns on by submit_answer_ack, auto=true fires on the timer's zero for a
 * picked-but-unconfirmed option.
 */
export function RoundScreen() {
  const game = useGame();
  const navigate = useNavigate();

  // No live game (deep link/reload without a session) -> the join page.
  useEffect(() => {
    if (!game.room && !game.roomClosed) navigate('/play', { replace: true });
  }, [game.room, game.roomClosed, navigate]);

  if (!game.room) return null;
  // Keyed by question: pick/sent state resets with every question_started.
  return game.currentQuestion ? (
    <RealRound key={game.currentQuestion.index} question={game.currentQuestion} />
  ) : (
    <div className={`grad-bg ${styles.screen}`}>
      <div className={styles.waitingBox}>
        <span className={styles.waitingIcon}>⏳</span>
        Очікуємо запитання…
      </div>
    </div>
  );
}

function RealRound({ question }: { question: ActiveQuestion }) {
  const game = useGame();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const totalMs = question.timeLimitSeconds * 1000;
  const [leftMs, setLeftMs] = useState(totalMs);
  const sentRef = useRef(false);

  // The server confirmed this round's answer - the pick is final.
  const confirmed =
    game.lastAnswerAck?.accepted === true &&
    game.lastAnswerAck.questionIndex === question.index;

  const submit = useCallback(
    (auto: boolean, choice: number | null) => {
      if (sentRef.current || choice === null) return;
      sentRef.current = true;
      setSent(true);
      game.submitAnswer({
        gameId: question.gameId,
        questionIndex: question.index,
        selectedOptionIndex: choice,
        auto,
      });
    },
    [game.submitAnswer, question.gameId, question.index],
  );

  // Countdown to the server-side round close: questionStartTime + limit in
  // the server's clock frame, compared against serverNow() (task 0057).
  // On zero: auto-send the picked option; with no pick send nothing - the
  // server records "no answer" itself.
  useEffect(() => {
    const deadline = question.questionStartTime + totalMs;
    const timer = setInterval(() => {
      const left = Math.max(deadline - serverNow(), 0);
      setLeftMs(left);
      if (left > 0) return;
      clearInterval(timer);
      setTimedOut(true);
      setSelected((choice) => {
        submit(true, choice);
        return choice;
      });
    }, REAL_TICK_MS);
    return () => clearInterval(timer);
  }, [question.questionStartTime, totalMs, submit]);

  // The round closed before our submit landed -> "time is up", await results.
  useEffect(() => {
    return game.interceptErrors((wsError) => {
      if (wsError.code !== 'question_finished') return false;
      setTimedOut(true);
      return true;
    });
  }, [game.interceptErrors]);

  // This round's result arrived -> the result screen takes over (task 0068).
  useEffect(() => {
    if (game.lastRoundResult?.questionIndex === question.index) {
      navigate('/play/result', { replace: true });
    }
  }, [game.lastRoundResult, question.index, navigate]);

  const questionCount =
    game.gameStarted?.questionCount ?? game.room?.settings.questionCount ?? 0;
  const totalScore = game.lastRoundResult?.yourResult.totalScore ?? 0;
  const leftSeconds = Math.ceil(leftMs / 1000);
  const leftPercent = (leftMs / totalMs) * 100;
  const locked = sent || confirmed || timedOut;

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={ROUND_SHAPES} />

      <div className={styles.stage}>
        <div className={styles.topBar}>
          <div className={styles.chip}>
            {question.index + 1} / {questionCount}
          </div>
          <div className={styles.ring} style={{ '--left': leftPercent } as CSSVars}>
            {leftSeconds}
          </div>
          <div className={styles.chip}>🏆 {totalScore}</div>
        </div>

        <div className={styles.questionWrap}>
          <div className={styles.questionCard}>
            <div className={styles.spoiler}>{question.text}</div>
          </div>
        </div>

        <div className={styles.answers}>
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              disabled={locked}
              onClick={() =>
                setSelected((previous) => (previous === index ? null : index))
              }
              className={`${styles.tile} ${TILE_COLORS[index]} ${
                selected === index ? styles.tileSelected : ''
              } ${
                locked
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

        <div className={styles.confirmZone}>
          {timedOut && !confirmed ? (
            <div className={styles.waitingBox}>
              <span className={styles.waitingIcon}>⌛</span>
              Час вийшов — очікуємо результат раунду
            </div>
          ) : confirmed || sent ? (
            <div className={styles.waitingBox}>
              <span className={styles.waitingIcon}>⏳</span>
              {confirmed
                ? 'Відповідь зафіксовано — очікуємо інших гравців'
                : 'Фіксуємо відповідь…'}
            </div>
          ) : (
            <>
              <Button
                className={styles.confirmBtn}
                disabled={selected === null}
                onClick={() => submit(false, selected)}
              >
                {selected === null ? 'Оберіть відповідь' : 'Підтвердити відповідь'}
              </Button>
              <div className={styles.hint}>
                Вибір можна змінювати до підтвердження · без вибору відповідь не
                надсилається · копіювання вимкнено
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

