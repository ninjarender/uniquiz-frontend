import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BOT_NAMES, DEMO_BANK_NAME } from '../../demo/data';
import { ApiError, RoomsApi } from '../../shared/api';
import type { RoomPublicInfo } from '../../shared/api';
import { Button } from '../../shared/controls';
import { FloatingShapes, Logo, useToast } from '../../shared/ui';
import { RoomSettingsModal } from './RoomSettingsModal';
import styles from './ProjectorScreen.module.css';
import type { ShapeSpec } from '../../shared/ui';

const PROJECTOR_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 80, top: '8%', left: '5%', spin: true },
  { glyph: '◆', size: 60, bottom: '10%', right: '6%', spin: true, delay: 2 },
  { glyph: '■', size: 44, top: '20%', right: '12%' },
];

/** Host lobby for a real room: join link, settings + edit (task 0049). Players arrive with WS (0052+). */
function RealRoomLobby({ roomId }: { roomId: string }) {
  const { toast } = useToast();
  const [room, setRoom] = useState<RoomPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const joinUrl = `${window.location.origin}/join/${roomId}`;
  const waiting = room?.status === 'waiting';

  useEffect(() => {
    RoomsApi.publicInfo(roomId)
      .then(setRoom)
      .catch((caught: unknown) => {
        setError(
          caught instanceof ApiError && caught.statusCode === 404
            ? 'Кімнати не існує або її закрито'
            : 'Немає звʼязку з сервером',
        );
      });
  }, [roomId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast('Посилання скопійовано');
    } catch {
      toast('Не вдалося скопіювати — виділіть посилання вручну');
    }
  };

  if (error) return <div className={styles.joinLine}>{error}</div>;
  if (!room) return <div className={styles.joinLine}>Завантаження кімнати…</div>;

  return (
    <>
      <div className={styles.joinLine}>Приєднуйтесь за посиланням:</div>
      <button
        type="button"
        title="Скопіювати посилання"
        className={styles.joinUrlBtn}
        onClick={() => void copyLink()}
      >
        {joinUrl}
      </button>
      <div className={styles.meta}>
        {room.bankName} ·{' '}
        {room.settings.mode === 'solo' ? 'Solo' : 'Multiplayer'} ·{' '}
        {room.settings.questionCount} запитань ·{' '}
        {room.settings.timePerQuestionSeconds} с на запитання
      </div>
      {waiting ? (
        <Button
          variant="purple"
          className={styles.actionBtn}
          onClick={() => setEditing(true)}
        >
          ⚙ Змінити налаштування
        </Button>
      ) : (
        <div className={styles.meta}>
          {room.status === 'in_game'
            ? 'Гра йде — налаштування заблоковано'
            : 'Гру завершено'}
        </div>
      )}
      <div className={styles.note}>
        Гравці зʼявляться тут після підключення лобі до Socket.IO (таски 0051+)
      </div>

      {editing && waiting && (
        <RoomSettingsModal
          roomId={roomId}
          settings={room.settings}
          onClose={() => setEditing(false)}
          onSaved={(info) => {
            setRoom(info);
            setEditing(false);
            toast('Налаштування збережено');
          }}
          onConflict={() => {
            setEditing(false);
            setRoom((previous) =>
              previous ? { ...previous, status: 'in_game' } : previous,
            );
            toast('Гра вже почалася — налаштування більше не змінити');
          }}
        />
      )}
    </>
  );
}

/** T2 - projector view: real host lobby when opened with a roomId, otherwise the demo. */
export function ProjectorScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const roomId = (location.state as { roomId?: string } | null)?.roomId;

  const [players, setPlayers] = useState<string[]>([]);
  const [phase, setPhase] = useState<'waiting' | 'results'>('waiting');
  const code = useMemo(
    () => `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
    [],
  );

  useEffect(() => {
    if (roomId || phase !== 'waiting') return;
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
  }, [roomId, phase]);

  const results = useMemo(
    () =>
      [...BOT_NAMES]
        .slice(0, 4)
        .map((name) => ({ name: name.split(' ')[0], score: 3800 + Math.floor(Math.random() * 1900) }))
        .sort((a, b) => b.score - a.score),
    [],
  );
  const top = results[0]?.score ?? 1;

  if (roomId) {
    return (
      <div className={`grad-bg ${styles.screen}`}>
        <FloatingShapes shapes={PROJECTOR_SHAPES} />
        <div className={styles.logoCorner}><Logo size={22} /></div>
        <RealRoomLobby roomId={roomId} />
      </div>
    );
  }

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
