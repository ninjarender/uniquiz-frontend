import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { useGame } from '../../shared/game';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../../shared/ui';
import styles from './ResultShared.module.css';

/** Final: leaderboard, personal stats, play again / share (features.md). */
export function FinalScreen() {
  const real = useGame();
  // Real finished room (routed here by the room_state snapshot, task 0058):
  // minimal leaderboard until the full game_over review lands in 0069.
  if (real.room) return <RealFinal />;
  return <DemoFinal />;
}

function RealFinal() {
  const game = useGame();
  const leaderboard =
    game.gameOver?.leaderboard ?? game.room?.leaderboard ?? [];
  const me = game.room?.players.find((player) => player.id === game.playerId);
  const hostNickname = game.room?.players.find((player) => player.isHost)?.nickname;
  const place =
    leaderboard.findIndex((entry) => entry.nickname === me?.nickname) + 1;
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖';

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={24} />

      <div className={styles.medal}>{medal}</div>
      <div className={styles.heading}>Гру завершено</div>

      <div className={styles.board}>
        <div className={styles.boardTitle}>Фінальний лідерборд</div>
        {leaderboard.map((entry, index) => (
          <div
            key={entry.nickname}
            className={`${styles.row} ${entry.nickname === me?.nickname ? styles.rowYou : ''}`}
          >
            <span className={styles.place}>{index + 1}</span>
            <span className={styles.name}>
              {entry.nickname === hostNickname && '👑 '}
              {entry.nickname}
              {entry.nickname === me?.nickname && ' (ви)'}
            </span>
            <span>{entry.totalScore}</span>
          </div>
        ))}
      </div>
      <div className={styles.note}>
        Розбір запитань і trap — після підключення фінального ревью (0069)
      </div>
    </div>
  );
}

function DemoFinal() {
  const game = useDemoGame();
  const navigate = useNavigate();
  const { toast } = useToast();

  const you = game.players.find((player) => player.isYou);

  useEffect(() => {
    if (!you || game.questions.length === 0) navigate('/play', { replace: true });
  }, [you, game.questions.length, navigate]);

  if (!you) return null;

  const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
  const place = leaderboard.findIndex((player) => player.isYou) + 1;
  // avg response over non-trap questions (N−1), per kb business rules
  const avgSeconds = you.elapsedSum / 1000 / Math.max(QUIZ_LEN - 1, 1);

  const share = async () => {
    const text = `UniQuiz: ${place} місце, ${Math.round(you.score)} балів, ${you.correct}/${QUIZ_LEN} правильних 🏆`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast('Результат скопійовано в буфер');
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const playAgain = () => {
    game.playAgain();
    navigate('/play/round');
  };

  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖';

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={24} />

      <div className={styles.medal}>{medal}</div>
      <div className={styles.heading}>
        {place} місце · {Math.round(you.score)} балів
      </div>

      <div className={styles.stats}>
        <div className={styles.statBox}>
          <b className={styles.statValue}>{you.correct}/{QUIZ_LEN}</b>
          <span className={styles.statLabel}>правильних</span>
        </div>
        <div className={styles.statBox}>
          <b className={styles.statValue}>{avgSeconds.toFixed(1)} с</b>
          <span className={styles.statLabel}>середній час</span>
        </div>
      </div>

      <div className={styles.board}>
        <div className={styles.boardTitle}>Фінальний лідерборд</div>
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
            <span className={styles.small}>{player.correct}/{QUIZ_LEN}</span>
            <b>{Math.round(player.score)}</b>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button onClick={playAgain}>🔁 Зіграти ще раз</Button>
        <Button variant="purple" onClick={() => void share()}>
          📤 Поділитися
        </Button>
      </div>
      <button
        type="button"
        onClick={() => { game.reset(); navigate('/'); }}
        className={styles.homeLink}
      >
        на головну
      </button>
    </div>
  );
}
