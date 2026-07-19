import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredGameOver, useGame } from '../../shared/game';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../../shared/ui';
import styles from './ResultShared.module.css';

/**
 * Final (task 0069): leaderboard + the only place the game is revealed -
 * correct answers, explanations and which question was the trap. The payload
 * is stashed per room, so a reload/rejoin after the final still shows the
 * review. "Play again" means a fresh room - this one is done.
 */
export function FinalScreen() {
  const game = useGame();
  const navigate = useNavigate();
  const { toast } = useToast();

  // No live room (deep link/reload without a session) -> the join page.
  useEffect(() => {
    if (!game.room) navigate('/play', { replace: true });
  }, [game.room, navigate]);
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

  if (!game.room) return null;

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

