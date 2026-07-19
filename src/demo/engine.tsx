import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  BOT_NAMES,
  DEMO_BANK,
  MAX_SCORE,
  QUIZ_LEN,
  ROUND_TIME_S,
  scoreFor,
} from './data';
import type { DemoQuestion } from './data';

/**
 * Mock game engine for the demo flow (until backend rooms/WS, tasks 0018+).
 * Implements the kb business rules: pick-then-confirm, early round end when
 * everyone confirmed, score = max(500 − elapsed × penalty, 0), exactly one
 * trap question per game (all four options wrong; no answer → 500).
 */

export interface GameQuestion extends DemoQuestion {
  isTrap: boolean;
}

export interface PlayerState {
  name: string;
  isYou: boolean;
  score: number;
  correct: number;
  /** ms spent answering non-trap questions (for avg response time) */
  elapsedSum: number;
}

export interface RoundOutcome {
  question: GameQuestion;
  selectedIndex: number | null;
  isCorrect: boolean;
  gained: number;
  elapsedSeconds: number;
}

interface DemoGame {
  nickname: string;
  roomCode: string;
  players: PlayerState[];
  questions: GameQuestion[];
  currentIndex: number;
  lastOutcome: RoundOutcome | null;
  join: (roomCode: string, nickname: string) => void;
  addBot: () => boolean;
  startGame: () => void;
  /** Resolves the current round; bots are simulated inside. */
  finishRound: (selectedIndex: number | null, elapsedSeconds: number) => RoundOutcome;
  nextRound: () => 'round' | 'final';
  playAgain: () => void;
  reset: () => void;
}

const DemoGameContext = createContext<DemoGame | null>(null);

function sampleQuestions(): GameQuestion[] {
  const shuffled = [...DEMO_BANK].sort(() => Math.random() - 0.5).slice(0, QUIZ_LEN);
  const trapIndex = Math.floor(Math.random() * shuffled.length);
  return shuffled.map((question, index) => {
    if (index !== trapIndex) return { ...question, isTrap: false };
    // Trap version: the correct option is replaced by the spare distractor.
    const options = [...question.options];
    options[question.correctIndex] = question.spare;
    return { ...question, options, isTrap: true };
  });
}

export function DemoGameProvider({ children }: { children: ReactNode }) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);
  const botPool = useRef<string[]>([]);

  const join = useCallback((code: string, name: string) => {
    setRoomCode(code);
    setNickname(name);
    botPool.current = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    setPlayers([{ name, isYou: true, score: 0, correct: 0, elapsedSum: 0 }]);
    setQuestions([]);
    setCurrentIndex(0);
    setLastOutcome(null);
  }, []);

  const addBot = useCallback((): boolean => {
    const name = botPool.current.pop();
    if (!name) return false;
    setPlayers((previous) => [
      ...previous,
      { name, isYou: false, score: 0, correct: 0, elapsedSum: 0 },
    ]);
    return true;
  }, []);

  const startGame = useCallback(() => {
    setQuestions(sampleQuestions());
    setCurrentIndex(0);
    setPlayers((previous) =>
      previous.map((player) => ({ ...player, score: 0, correct: 0, elapsedSum: 0 })),
    );
    setLastOutcome(null);
  }, []);

  const finishRound = useCallback(
    (selectedIndex: number | null, elapsedSeconds: number): RoundOutcome => {
      const question = questions[currentIndex];
      const isCorrect = question.isTrap
        ? selectedIndex === null
        : selectedIndex === question.correctIndex;
      const gained = question.isTrap
        ? isCorrect
          ? MAX_SCORE
          : 0
        : isCorrect
          ? scoreFor(elapsedSeconds)
          : 0;

      setPlayers((previous) =>
        previous.map((player) => {
          if (player.isYou) {
            return {
              ...player,
              score: player.score + gained,
              correct: player.correct + (isCorrect ? 1 : 0),
              elapsedSum: player.elapsedSum + (question.isTrap ? 0 : elapsedSeconds * 1000),
            };
          }
          // Bots: answer correctly ~62% of the time, in 2-14 s.
          const botElapsed = 2 + Math.random() * 12;
          const botPicked = Math.random() > 0.25; // on a trap most bots get caught
          const botCorrect = question.isTrap ? !botPicked : Math.random() < 0.62;
          const botGained = question.isTrap
            ? botCorrect
              ? MAX_SCORE
              : 0
            : botCorrect
              ? scoreFor(botElapsed)
              : 0;
          return {
            ...player,
            score: player.score + botGained,
            correct: player.correct + (botCorrect ? 1 : 0),
            elapsedSum: player.elapsedSum + (question.isTrap ? 0 : botElapsed * 1000),
          };
        }),
      );

      const outcome: RoundOutcome = {
        question,
        selectedIndex,
        isCorrect,
        gained,
        elapsedSeconds,
      };
      setLastOutcome(outcome);
      return outcome;
    },
    [questions, currentIndex],
  );

  const nextRound = useCallback((): 'round' | 'final' => {
    if (currentIndex + 1 >= questions.length) return 'final';
    setCurrentIndex((previous) => previous + 1);
    return 'round';
  }, [currentIndex, questions.length]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  const reset = useCallback(() => {
    setNickname('');
    setRoomCode('');
    setPlayers([]);
    setQuestions([]);
    setCurrentIndex(0);
    setLastOutcome(null);
  }, []);

  const value = useMemo<DemoGame>(
    () => ({
      nickname,
      roomCode,
      players,
      questions,
      currentIndex,
      lastOutcome,
      join,
      addBot,
      startGame,
      finishRound,
      nextRound,
      playAgain,
      reset,
    }),
    [nickname, roomCode, players, questions, currentIndex, lastOutcome, join, addBot, startGame, finishRound, nextRound, playAgain, reset],
  );

  return <DemoGameContext.Provider value={value}>{children}</DemoGameContext.Provider>;
}

export function useDemoGame(): DemoGame {
  const context = useContext(DemoGameContext);
  if (!context) throw new Error('useDemoGame outside DemoGameProvider');
  return context;
}

export { ROUND_TIME_S };
