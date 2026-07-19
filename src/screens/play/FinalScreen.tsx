import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { getStoredGameOver, useGame } from '../../shared/game';
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

/**
 * Full server final (task 0069): leaderboard + the only place the game is
 * revealed - correct answers, explanations and which question was the trap.
 * The payload is stashed per room, so a reload/rejoin after the final still
 * shows the review. "Play again" means a fresh room - this one is done.
 */
function RealFinal() {
  const game = useGame();
  const navigate = useNavigate();
  const { toast } = useToast();
  const over =
    game.gameOver ?? (game.room ? getStoredGameOver(game.room.roomId) : null);
  const leaderboard = over?.leaderboard ?? game.room?.leaderboard ?? [];
  const me = game.room?.players.find((player) => player.id === game.playerId);
  const hostNickname = game.room?.players.find((player) => player.isHost)?.nickname;
  const myEntry = leaderboard.find((entry) => entry.nickname === me?.nickname);
  const place =
    leaderboard.findIndex((entry) => entry.nickname === me?.nickname) + 1;
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖';

  const share = async () => {
    const text = `UniQuiz: ${place} місце, ${myEntry?.totalScore ?? 0} балів, ${
      myEntry?.correctAnswers ?? 0
    }/${over?.review.length ?? '?'} правильних 🏆`;
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

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={24} />

      <div className={styles.medal}>{medal}</div>
      <div className={styles.heading}>
        {place > 0 ? `${place} місце · ${myEntry?.totalScore ?? 0} балів` : 'Гру завершено'}
      </div>

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
            <span className={styles.small}>
              {entry.correctAnswers} прав.
              {entry.avgResponseMs != null && ` · ${(entry.avgResponseMs / 1000).toFixed(1)} с`}
            </span>
            <b>{entry.totalScore}</b>
          </div>
        ))}
      </div>

      {over ? (
        <div className={styles.review}>
          <div className={styles.boardTitle}>Розбір запитань</div>
          {over.review.map((item) => (
            <div key={item.index} className={styles.reviewItem}>
              <div className={styles.reviewQ}>
                {item.index + 1}. {item.text}
              </div>
              {item.isTrap ? (
                <div className={styles.trapBadge}>
                  🪤 Це була пастка — правильної відповіді не існувало.
                  Максимум балів отримав той, хто не обрав нічого.
                </div>
              ) : (
                <div className={styles.reviewCorrect}>
                  ✓ {item.correctIndex != null ? item.options[item.correctIndex] : '—'}
                </div>
              )}
              {item.explanation && (
                <div className={styles.reviewExplain}>{item.explanation}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.note}>
          Розбір недоступний після перепідключення — але результат зафіксовано
        </div>
      )}

      <div className={styles.finalActions}>
        <Button onClick={() => void share()}>📣 Поділитися</Button>
        {me?.isHost ? (
          <Button variant="purple" onClick={() => navigate('/teacher')}>
            🔁 Нова кімната
          </Button>
        ) : (
          <Button variant="purple" onClick={() => navigate('/')}>
            На головну
          </Button>
        )}
      </div>
      {me?.isHost && (
        <div className={styles.note}>
          «Ще раз» — це нова кімната з того самого банку: ця вже закрита
        </div>
      )}
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
