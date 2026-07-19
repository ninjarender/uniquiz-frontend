import { useEffect, useState } from 'react';
import { useGame } from '../../shared/game';
import styles from './ClosingBanner.module.css';

/**
 * Lobby-timeout warning (room_closing_soon, task 0064): a counting-down
 * banner shared by the lobby and the host's projector. Renders nothing until
 * the warning arrives; the provider clears closingAt when the game starts.
 */
export function ClosingBanner() {
  const { closingAt } = useGame();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (closingAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [closingAt]);

  if (closingAt === null) return null;
  const leftSeconds = Math.max(Math.ceil((closingAt - now) / 1000), 0);
  const minutes = Math.floor(leftSeconds / 60);
  const seconds = String(leftSeconds % 60).padStart(2, '0');

  return (
    <div className={styles.banner}>
      ⏳ Кімната закриється через {minutes}:{seconds} — час починати гру
    </div>
  );
}
