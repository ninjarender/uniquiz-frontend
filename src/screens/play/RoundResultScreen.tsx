import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../shared/game';
import { FloatingShapes, HOME_SHAPES } from '../../shared/ui';
import styles from './ResultShared.module.css';

/**
 * S2 - server round result (task 0068): personal isCorrect/score + the
 * shared leaderboard. The correct option is deliberately absent from the
 * payload (trap stays hidden until the final review) and the server, not a
 * button, drives the transition to the next round / game over.
 */
export function RoundResultScreen() {
  const game = useGame();
  const navigate = useNavigate();
  const result = game.lastRoundResult;

  // Reload/deep link without a result: the round screen sorts itself out.
  useEffect(() => {
    if (!result) navigate('/play/round', { replace: true });
  }, [result, navigate]);

  // Next question started -> back to the round; game_over -> GameResume
  // routes to the final by the finished status.
  useEffect(() => {
    if (
      result &&
      game.currentQuestion &&
      game.currentQuestion.index > result.questionIndex
    ) {
      navigate('/play/round', { replace: true });
    }
  }, [game.currentQuestion, result, navigate]);

  if (!result || !game.room) return null;
  const { yourResult, leaderboard, isLast } = result;
  const noAnswer = yourResult.selectedOptionIndex == null;
  const heading = yourResult.isCorrect
    ? 'Влучно!'
    : noAnswer
      ? 'Без відповіді'
      : 'Не влучили';
  const icon = yourResult.isCorrect ? '✓' : noAnswer ? '⏳' : '✗';
  const playerByNickname = new Map(
    game.room.players.map((player) => [player.nickname, player]),
  );

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />

      <div
        className={`${styles.iconBubble} ${yourResult.isCorrect ? styles.iconCorrect : styles.iconWrong}`}
      >
        {icon}
      </div>

      <div className={styles.heading}>{heading}</div>
      <div className={styles.gained}>+ {yourResult.score} балів · разом {yourResult.totalScore}</div>

      <div className={styles.board}>
        <div className={styles.boardTitle}>
          Лідерборд після питання {result.questionIndex + 1}
        </div>
        {leaderboard.map((entry, index) => {
          const player = playerByNickname.get(entry.nickname);
          const you = entry.nickname === game.room?.players.find((p) => p.id === game.playerId)?.nickname;
          return (
            <div
              key={entry.nickname}
              className={`${styles.row} ${you ? styles.rowYou : ''} ${
                player?.connected === false ? styles.rowOffline : ''
              }`}
            >
              <b className={styles.place}>{index + 1}</b>
              <span className={styles.name}>
                {player?.isHost && '👑 '}
                {entry.nickname}
                {you && ' (ви)'}
                {player?.connected === false && ' 📴'}
              </span>
              <b>{entry.totalScore}</b>
            </div>
          );
        })}
      </div>

      <div className={styles.note}>
        {isLast ? 'Далі — фінальні підсумки…' : 'Наступне питання ось-ось…'}
      </div>
    </div>
  );
}

