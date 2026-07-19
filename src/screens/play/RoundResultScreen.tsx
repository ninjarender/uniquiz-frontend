import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoGame } from '../../demo/engine';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES } from '../../shared/ui';
import styles from './ResultShared.module.css';

/** S2 - round outcome + interim leaderboard (trap gets its own reveal). */
export function RoundResultScreen() {
  const game = useDemoGame();
  const navigate = useNavigate();
  const outcome = game.lastOutcome;

  useEffect(() => {
    if (!outcome) navigate('/play', { replace: true });
  }, [outcome, navigate]);

  if (!outcome) return null;

  const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
  const isTrap = outcome.question.isTrap;

  const heading = isTrap
    ? outcome.isCorrect
      ? 'Пастку розгадано!'
      : 'Це було trap-питання!'
    : outcome.isCorrect
      ? 'Правильно!'
      : 'Неправильно';
  const icon = outcome.isCorrect ? '✓' : isTrap ? '🪤' : '✗';

  const next = () => {
    if (game.nextRound() === 'final') navigate('/play/final');
    else navigate('/play/round');
  };

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />

      <div
        className={`${styles.iconBubble} ${outcome.isCorrect ? styles.iconCorrect : styles.iconWrong}`}
      >
        {icon}
      </div>

      <div className={styles.heading}>{heading}</div>
      <div className={styles.gained}>+ {Math.round(outcome.gained)} балів</div>

      {isTrap && (
        <div className={styles.note}>
          Усі 4 варіанти були неправильні — максимум балів отримує той, хто не
          обрав нічого. {outcome.question.explanation}
        </div>
      )}
      {!isTrap && !outcome.isCorrect && (
        <div className={styles.note}>
          Правильна відповідь:{' '}
          <b>{outcome.question.options[outcome.question.correctIndex]}</b>.{' '}
          {outcome.question.explanation}
        </div>
      )}

      <div className={styles.board}>
        <div className={styles.boardTitle}>Лідерборд</div>
        {leaderboard.map((player, index) => (
          <div
            key={player.name}
            className={`${styles.row} ${player.isYou ? styles.rowYou : ''}`}
          >
            <b className={styles.place}>{index + 1}</b>
            <span className={styles.name}>
              {player.name}
              {player.isYou && ' (ви)'}
            </span>
            <b>{Math.round(player.score)}</b>
          </div>
        ))}
      </div>

      <Button className={styles.nextBtn} onClick={next}>
        {game.currentIndex + 1 >= game.questions.length ? 'До підсумків →' : 'Далі →'}
      </Button>
    </div>
  );
}
