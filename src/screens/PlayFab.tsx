import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PlayFab.module.css';

/** Floating "play" button for logged-in hosts (prototype's play-fab). */
export function PlayFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={styles.wrap}>
      {open && (
        <button type="button" onClick={() => navigate('/play')} className={styles.playBtn}>
          <span className={styles.playIcon}>▶</span> Грати
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className={styles.pill}
      >
        🎮 Зіграти в гру{' '}
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▲</span>
      </button>
    </div>
  );
}
