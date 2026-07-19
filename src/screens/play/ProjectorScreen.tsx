import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOT_NAMES, DEMO_BANK_NAME } from '../../demo/data';
import { Button } from '../../shared/controls';
import { FloatingShapes, Logo } from '../../shared/ui';
import styles from './ProjectorScreen.module.css';
import type { ShapeSpec } from '../../shared/ui';

const PROJECTOR_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 80, top: '8%', left: '5%', spin: true },
  { glyph: '◆', size: 60, bottom: '10%', right: '6%', spin: true, delay: 2 },
  { glyph: '■', size: 44, top: '20%', right: '12%' },
];

/** T2 - projector view: join code + players, then the results podium. */
export function ProjectorScreen() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<string[]>([]);
  const [phase, setPhase] = useState<'waiting' | 'results'>('waiting');
  const code = useMemo(
    () => `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
    [],
  );

  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = setInterval(() => {
      setPlayers((previous) => {
        if (previous.length >= BOT_NAMES.length) {
          clearInterval(timer);
          return previous;
        }
        return [...previous, BOT_NAMES[previous.length]];
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [phase]);

  const results = useMemo(
    () =>
      [...BOT_NAMES]
        .slice(0, 4)
        .map((name) => ({ name: name.split(' ')[0], score: 3800 + Math.floor(Math.random() * 1900) }))
        .sort((a, b) => b.score - a.score),
    [],
  );
  const top = results[0]?.score ?? 1;

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={PROJECTOR_SHAPES} />
      <div className={styles.logoCorner}><Logo size={22} /></div>
      <div className={styles.demoBadge}>Демо · проєктор</div>

      {phase === 'waiting' ? (
        <>
          <div className={styles.joinLine}>
            Приєднуйтесь на <b className={styles.joinHost}>uniquiz.university.ua</b> · код кімнати:
          </div>
          <div className={styles.code}>{code}</div>
          <div className={styles.meta}>
            {DEMO_BANK_NAME} · учасників: {players.length}
          </div>
          <div className={styles.players}>
            {players.map((name) => (
              <span
                key={name}
                className={styles.playerPill}
                
              >
                {name}
              </span>
            ))}
          </div>
          <Button className={`${styles.actionBtn} ${styles.startNote}`} onClick={() => setPhase('results')}>
            Завершити демо-сесію → підсумки
          </Button>
        </>
      ) : (
        <>
          <div className={styles.title}>Підсумки сесії</div>
          <div className={styles.podium}>
            {results.map((row, index) => (
              <div key={row.name} className={styles.barWrap}>
                <div className={styles.barName}>{row.name}</div>
                <div
                  className={`${styles.bar} ${index === 0 ? styles.barLeader : ''}`}
                  style={{
                    height: `${(row.score / top) * 240}px`,
                    animationDelay: `${index * 120}ms`,
                  }}
                >
                  {row.score}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.note}>
            В аналітиці згодом: успішність за темами, аномальні запитання,
            підозрілі патерни відкриття спойлерів
          </div>
          <Button variant="purple" className={styles.actionBtn} onClick={() => navigate('/teacher')}>
            ← до кабінету
          </Button>
        </>
      )}
    </div>
  );
}
