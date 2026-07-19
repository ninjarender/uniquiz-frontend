import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BANK_NAME, QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { clearPlayerSession, useGame } from '../../shared/game';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo } from '../../shared/ui';
import styles from './LobbyScreen.module.css';

/**
 * Lobby. Real room (task 0052): players from the server snapshot, live
 * updates land via the provider; the start button gets wired in 0055.
 * Demo room (manual code, until 0071): bots trickle in, the user starts.
 */
export function LobbyScreen() {
  const demo = useDemoGame();
  const game = useGame();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');
  const real = game.room !== null;

  // No join happened (deep link) -> back to the join screen.
  useEffect(() => {
    if (!real && !demo.nickname) navigate('/play', { replace: true });
  }, [real, demo.nickname, navigate]);

  // Bots trickle into the demo lobby only.
  useEffect(() => {
    if (real) return;
    const timer = setInterval(() => {
      if (!demo.addBot()) clearInterval(timer);
    }, 1400);
    return () => clearInterval(timer);
  }, [real, demo.addBot]);

  useEffect(() => {
    const timer = setInterval(
      () => setDots((previous) => (previous.length >= 3 ? '' : previous + '.')),
      500,
    );
    return () => clearInterval(timer);
  }, []);

  // Kicked between events (e.g. the room died) -> silently back to joining.
  useEffect(() => {
    if (!real) return;
    return game.interceptErrors((wsError) => {
      if (wsError.code !== 'not_a_member') return false;
      const roomId = game.room?.roomId;
      if (roomId) clearPlayerSession(roomId);
      navigate(roomId ? `/join/${roomId}` : '/play', { replace: true });
      return true;
    });
  }, [real, game.interceptErrors, game.room?.roomId, navigate]);

  const start = () => {
    demo.startGame();
    navigate('/play/round');
  };

  /** leave_room + wipe the stored session; back to the join page (0054). */
  const leaveLobby = () => {
    const roomId = game.room?.roomId;
    game.leave();
    navigate(roomId ? `/join/${roomId}` : '/play', { replace: true });
  };

  const meta = game.room
    ? `${game.room.bankName} · ${game.room.settings.mode === 'solo' ? 'Solo' : 'Multiplayer'} · ${game.room.settings.questionCount} запитань`
    : `${DEMO_BANK_NAME} · Multiplayer · ${QUIZ_LEN} запитань`;

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={26} />

      <div className={styles.roomBox}>
        <div className={styles.roomLabel}>Кімната</div>
        <div className={styles.roomCode}>{game.room?.roomId ?? demo.roomCode}</div>
      </div>

      <div className={styles.meta}>{meta}</div>

      <div className={styles.players}>
        {game.room
          ? game.room.players.map((player) => (
              <span
                key={player.id}
                className={`${styles.playerPill} ${player.id === game.playerId ? styles.playerYou : ''}`}
              >
                {player.isHost && '👑 '}
                {player.nickname}
                {player.id === game.playerId && ' (ви)'}
              </span>
            ))
          : demo.players.map((player) => (
              <span
                key={player.name}
                className={`${styles.playerPill} ${player.isYou ? styles.playerYou : ''}`}
              >
                {player.name}
                {player.isYou && ' (ви)'}
              </span>
            ))}
      </div>

      <div className={styles.waiting}>очікуємо гравців{dots}</div>

      {real ? (
        <>
          <div className={styles.note}>Гру запускає хост, коли всі зібралися</div>
          {game.room?.status === 'waiting' && (
            <button type="button" className={styles.leaveLink} onClick={leaveLobby}>
              ← Вийти з кімнати
            </button>
          )}
        </>
      ) : (
        <>
          <Button
            className={styles.startBtn}
            onClick={start}
            disabled={demo.players.length < 2}
          >
            ▶ Почати гру ({demo.players.length})
          </Button>
          <div className={styles.note}>
            Старт у Multiplayer можливий від 2 гравців · у демо гру запускаєте ви
          </div>
        </>
      )}
    </div>
  );
}
