import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN, ROUND_TIME_S } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
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
const TICK_MS = 100;

/**
 * S1 - the round. Real game (task 0056): the server owns questions, timing
 * and scoring - the client only picks, confirms via submit_answer and waits;
 * "confirmed" turns on by submit_answer_ack, auto=true fires on the timer's
 * zero for a picked-but-unconfirmed option. Demo (manual code): local engine.
 */
export function RoundScreen() {
  const game = useGame();
  if (game.room) {
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
  return <DemoRound />;
}

const REAL_TICK_MS = 100;

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

function DemoRound() {
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
