import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useDemoGame } from '../../demo/engine';
import { ApiError, RoomsApi } from '../../shared/api';
import type { RoomPublicInfo } from '../../shared/api';
import { Button, TextField } from '../../shared/controls';
import { FloatingShapes, Logo } from '../../shared/ui';
import type { ShapeSpec } from '../../shared/ui';
import styles from './JoinScreen.module.css';

const JOIN_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 64, top: '7%', left: '8%', spin: true },
  { glyph: '◆', size: 36, top: '24%', right: '10%' },
  { glyph: '●', size: 52, bottom: '20%', left: '9%' },
  { glyph: '■', size: 44, bottom: '8%', right: '12%', spin: true, delay: 2 },
];

/**
 * D2 - joining a session. Two entries:
 * /join/{roomId} — real room from a joinUrl (public info before the nickname form);
 * /play — demo flow with a manual room code (until 0052/0071).
 */
export function JoinScreen() {
  const { roomId } = useParams<'roomId'>();
  const { join } = useDemoGame();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState<RoomPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    setRoom(null);
    setError(null);
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Real join is a Socket.IO event (task 0052); until then the demo engine drives the lobby.
    join(roomId ?? (code.trim() || '482 913'), name.trim() || 'Гість');
    navigate('/play/lobby');
  };

  const loadingRealRoom = roomId && !room && !error;
  const waiting = room?.status === 'waiting';

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={JOIN_SHAPES} />
      <Logo />

      {roomId ? (
        <>
          {loadingRealRoom && <div className={styles.tagline}>Завантаження кімнати…</div>}

          {error && (
            <div className={styles.card}>
              <div className={styles.stateTitle}>😕 {error}</div>
              <div className={styles.note}>
                Перевірте посилання у хоста — або попросіть створити нову кімнату
              </div>
              <Link to="/" className={styles.homeLink}>
                На головну
              </Link>
            </div>
          )}

          {room && !waiting && (
            <div className={styles.card}>
              <div className={styles.stateTitle}>
                {room.status === 'in_game'
                  ? '⏳ Гра вже триває'
                  : '🏁 Гру завершено'}
              </div>
              <div className={styles.note}>
                {room.status === 'in_game'
                  ? 'Приєднатися можна лише до старту. Дочекайтеся наступної гри від хоста.'
                  : 'Ця кімната вже відіграла. Попросіть хоста створити нову.'}
              </div>
              <Link to="/" className={styles.homeLink}>
                На головну
              </Link>
            </div>
          )}

          {room && waiting && (
            <>
              <div className={styles.tagline}>Введіть ваше імʼя, щоб приєднатися</div>
              <form className={styles.card} onSubmit={submit}>
                <div className={styles.roomInfo}>
                  <div className={styles.roomBank}>{room.bankName}</div>
                  <div className={styles.roomSettings}>
                    {room.settings.mode === 'solo' ? 'Solo' : 'Multiplayer'} ·{' '}
                    {room.settings.questionCount} запитань ·{' '}
                    {room.settings.timePerQuestionSeconds} с на запитання
                  </div>
                </div>
                <TextField
                  className={styles.nameField}
                  placeholder="Ваше імʼя"
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button type="submit" disabled={!name.trim()}>
                  ▶ Приєднатися
                </Button>
              </form>
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.tagline}>Введіть код кімнати та ваше імʼя</div>
          <form className={styles.card} onSubmit={submit}>
            <TextField
              className={styles.codeField}
              placeholder="Код кімнати"
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <TextField
              className={styles.nameField}
              placeholder="Ваше імʼя"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit">▶ Приєднатися</Button>
            <div className={styles.note}>Код показує хост — на екрані чи проєкторі</div>
          </form>
          <div className={styles.demoBadge}>
            Демо-режим · приєднання за посиланням — /join/&#123;roomId&#125;
          </div>
        </>
      )}
    </div>
  );
}
