import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BANK_NAME, QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo } from '../../shared/ui';
import styles from './LobbyScreen.module.css';

/** Lobby: players joining live (bots), bank + mode, the demo user starts. */
export function LobbyScreen() {
  const game = useDemoGame();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  // No join happened (deep link) -> back to the join screen.
  useEffect(() => {
    if (!game.nickname) navigate('/play', { replace: true });
  }, [game.nickname, navigate]);

  // Bots trickle into the lobby.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!game.addBot()) clearInterval(timer);
    }, 1400);
    return () => clearInterval(timer);
  }, [game.addBot]);

  useEffect(() => {
    const timer = setInterval(
      () => setDots((previous) => (previous.length >= 3 ? '' : previous + '.')),
      500,
    );
    return () => clearInterval(timer);
  }, []);

  const start = () => {
    game.startGame();
    navigate('/play/round');
  };

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={26} />

      <div className={styles.roomBox}>
        <div className={styles.roomLabel}>Кімната</div>
        <div className={styles.roomCode}>{game.roomCode}</div>
      </div>

      <div className={styles.meta}>
        {DEMO_BANK_NAME} · Multiplayer · {QUIZ_LEN} запитань
      </div>

      <div className={styles.players}>
        {game.players.map((player) => (
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

      <Button className={styles.startBtn} onClick={start} disabled={game.players.length < 2}>
        ▶ Почати гру ({game.players.length})
      </Button>
      <div className={styles.note}>
        Старт у Multiplayer можливий від 2 гравців · у демо гру запускаєте ви
      </div>
    </div>
  );
}
