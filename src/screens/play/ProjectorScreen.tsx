import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, RoomsApi, getHostNickname, getHostToken } from '../../shared/api';
import type { RoomPublicInfo } from '../../shared/api';
import { START_ERROR_TEXT, useGame } from '../../shared/game';
import { serverNow } from '../../shared/server-clock';
import type { ActiveQuestion } from '../../shared/ws-protocol';
import { Button } from '../../shared/controls';
import { FloatingShapes, Logo, useToast } from '../../shared/ui';
import { ClosingBanner } from './ClosingBanner';
import { RoomSettingsModal } from './RoomSettingsModal';
import styles from './ProjectorScreen.module.css';
import type { ShapeSpec } from '../../shared/ui';

const PROJECTOR_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 80, top: '8%', left: '5%', spin: true },
  { glyph: '◆', size: 60, bottom: '10%', right: '6%', spin: true, delay: 2 },
  { glyph: '■', size: 44, top: '20%', right: '12%' },
];

const HALL_TILE_ICONS = ['▲', '◆', '●', '■'];
const HALL_TILE_COLORS = [
  styles.hallTileRed,
  styles.hallTileBlue,
  styles.hallTileYellow,
  styles.hallTileGreen,
];

/**
 * The current question mirrored for the hall (task 0067): same snapshot the
 * players got - no correctIndex, no isTrap, the same server-clock countdown.
 */
function HallQuestion({
  question,
  questionCount,
}: {
  question: ActiveQuestion;
  questionCount: number;
}) {
  const totalMs = question.timeLimitSeconds * 1000;
  const [leftMs, setLeftMs] = useState(totalMs);

  useEffect(() => {
    const deadline = question.questionStartTime + totalMs;
    const timer = setInterval(
      () => setLeftMs(Math.max(deadline - serverNow(), 0)),
      200,
    );
    return () => clearInterval(timer);
  }, [question.questionStartTime, totalMs]);

  return (
    <>
      <div className={styles.meta}>
        Питання {question.index + 1} / {questionCount} · ⏱{' '}
        {Math.ceil(leftMs / 1000)} с
      </div>
      <div className={styles.hallQuestion}>{question.text}</div>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className={styles.hallImage} />
      )}
      <div className={styles.hallAnswers}>
        {question.options.map((option, index) => (
          <div key={index} className={`${styles.hallTile} ${HALL_TILE_COLORS[index]}`}>
            <span className={styles.hallTileIcon}>{HALL_TILE_ICONS[index]}</span>
            {option}
          </div>
        ))}
      </div>
      <div className={styles.note}>Гравці відповідають на своїх екранах</div>
    </>
  );
}

/**
 * Host lobby for a real room: join link, settings + edit (task 0049).
 * The projector takes the host seat over WS (hostToken from room creation),
 * so players are live and the start button drives start_game (task 0055).
 */
function RealRoomLobby({ roomId }: { roomId: string }) {
  const { toast } = useToast();
  const game = useGame();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const joinUrl = `${window.location.origin}/join/${roomId}`;
  const live = game.room?.roomId === roomId ? game.room : null;
  const settings = live?.settings ?? room?.settings;
  const status = live?.status ?? room?.status;
  const waiting = status === 'waiting';
  const me = live?.players.find((player) => player.id === game.playerId);

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

  // Take the host seat: resume the stored session (reload) or a fresh
  // join_room with the creator's token and nickname from the room form.
  useEffect(() => {
    // A closed room is gone - never try to take the seat back (0065).
    if (live || game.roomClosed) return;
    const hostToken = getHostToken(roomId);
    if (!hostToken) return;
    if (!game.rejoin(roomId)) {
      game.join({
        roomId,
        nickname: getHostNickname(roomId) ?? 'Ведучий',
        hostToken,
      });
    }
  }, [roomId, live, game.roomClosed, game.rejoin, game.join]);

  // start_game rejections land here as toasts with human wording.
  useEffect(() => {
    return game.interceptErrors((wsError) => {
      const text = START_ERROR_TEXT[wsError.code];
      if (!text) return false;
      toast(text);
      return true;
    });
  }, [game.interceptErrors, toast]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast('Посилання скопійовано');
    } catch {
      toast('Не вдалося скопіювати — виділіть посилання вручну');
    }
  };

  // The lobby idled past the timeout (task 0065): explain and lead back.
  if (game.roomClosed) {
    return (
      <>
        <div className={styles.joinLine}>
          😕 Кімнату закрито: лобі простояло надто довго без старту гри.
        </div>
        <Button variant="purple" className={styles.actionBtn} onClick={() => navigate('/teacher')}>
          ← до кабінету
        </Button>
      </>
    );
  }

  if (error) return <div className={styles.joinLine}>{error}</div>;
  if (!room && !live) return <div className={styles.joinLine}>Завантаження кімнати…</div>;

  const canStart =
    settings?.mode === 'solo'
      ? live?.players.length === 1
      : (live?.players.length ?? 0) >= 2;

  const playerPills = live && (
    <div className={styles.players}>
      {live.players.map((player) => (
        <span
          key={player.id}
          title={player.connected === false ? 'Втратив звʼязок' : undefined}
          className={`${styles.playerPill} ${
            player.connected === false ? styles.playerOffline : ''
          }`}
        >
          {player.isHost && '👑 '}
          {player.nickname}
          {player.connected === false && ' 📴'}
        </span>
      ))}
    </div>
  );

  // game_started flips the snapshot to in_game (task 0066); the hall sees
  // the same question the players do (task 0067) and the shared leaderboard
  // between rounds (round_result, task 0068).
  if (status === 'in_game') {
    const roundOver =
      game.lastRoundResult !== null &&
      game.lastRoundResult.questionIndex === game.currentQuestion?.index;
    if (roundOver && game.lastRoundResult) {
      return (
        <>
          <div className={styles.joinLine}>
            Лідерборд після питання {game.lastRoundResult.questionIndex + 1}
          </div>
          <div className={styles.hallBoard}>
            {game.lastRoundResult.leaderboard.map((entry, index) => {
              const player = live?.players.find((p) => p.nickname === entry.nickname);
              return (
                <div
                  key={entry.nickname}
                  className={`${styles.hallRow} ${
                    player?.connected === false ? styles.playerOffline : ''
                  }`}
                >
                  <b className={styles.hallPlace}>{index + 1}</b>
                  <span className={styles.hallName}>
                    {player?.isHost && '👑 '}
                    {entry.nickname}
                    {player?.connected === false && ' 📴'}
                  </span>
                  <b>{entry.totalScore}</b>
                </div>
              );
            })}
          </div>
          <div className={styles.note}>
            {game.lastRoundResult.isLast
              ? 'Далі — фінальні підсумки…'
              : 'Наступне питання ось-ось…'}
          </div>
        </>
      );
    }
    if (game.currentQuestion) {
      return (
        <HallQuestion
          question={game.currentQuestion}
          questionCount={game.gameStarted?.questionCount ?? settings?.questionCount ?? 0}
        />
      );
    }
    return (
      <>
        <div className={styles.joinLine}>🎮 Гра триває</div>
        <div className={styles.meta}>
          {live?.bankName ?? room?.bankName} ·{' '}
          {game.gameStarted?.questionCount ?? settings?.questionCount} запитань ·{' '}
          {game.gameStarted?.timePerQuestionSeconds ?? settings?.timePerQuestionSeconds}{' '}
          с на запитання
        </div>
        {playerPills}
        <div className={styles.note}>Очікуємо перше питання…</div>
      </>
    );
  }

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
        {live?.bankName ?? room?.bankName} ·{' '}
        {settings?.mode === 'solo' ? 'Solo' : 'Multiplayer'} ·{' '}
        {settings?.questionCount} запитань ·{' '}
        {settings?.timePerQuestionSeconds} с на запитання
      </div>

      <ClosingBanner />

      {playerPills}

      {waiting ? (
        <>
          {me?.isHost && (
            <Button className={styles.actionBtn} onClick={() => game.startGame()} disabled={!canStart}>
              ▶ Почати гру ({live?.players.length ?? 0})
            </Button>
          )}
          <Button
            variant="purple"
            className={styles.actionBtn}
            onClick={() => setEditing(true)}
          >
            ⚙ Змінити налаштування
          </Button>
          {me?.isHost && !canStart && (
            <div className={styles.note}>
              {settings?.mode === 'solo'
                ? 'Solo: у кімнаті має бути рівно 1 гравець — ви'
                : 'Старт у Multiplayer можливий від 2 гравців'}
            </div>
          )}
        </>
      ) : (
        (() => {
          // Final podium for the hall (game_over, 0069).
          const board =
            game.gameOver?.leaderboard ?? live?.leaderboard ?? [];
          const top = board[0]?.totalScore || 1;
          return (
            <>
              <div className={styles.title}>Підсумки гри</div>
              <div className={styles.podium}>
                {board.slice(0, 4).map((entry, index) => (
                  <div key={entry.nickname} className={styles.barWrap}>
                    <div className={styles.barName}>{entry.nickname}</div>
                    <div
                      className={`${styles.bar} ${index === 0 ? styles.barLeader : ''}`}
                      style={{
                        height: `${Math.max((entry.totalScore / top) * 240, 40)}px`,
                        animationDelay: `${index * 120}ms`,
                      }}
                    >
                      {entry.totalScore}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.note}>
                Розбір питань і trap — на екранах гравців
              </div>
            </>
          );
        })()
      )}

      {editing && waiting && settings && (
        <RoomSettingsModal
          roomId={roomId}
          settings={settings}
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

/** T2 - projector view; needs a roomId (created from the bank screen). */
export function ProjectorScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const roomId = (location.state as { roomId?: string } | null)?.roomId;

  if (roomId) {
    return (
      <div className={`grad-bg ${styles.screen}`}>
        <FloatingShapes shapes={PROJECTOR_SHAPES} />
        <div className={styles.logoCorner}><Logo size={22} /></div>
        <RealRoomLobby roomId={roomId} />
      </div>
    );
  }

  // No room attached (direct /live visit): nothing to project.
  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={PROJECTOR_SHAPES} />
      <div className={styles.logoCorner}><Logo size={22} /></div>
      <div className={styles.joinLine}>
        Проєктор відкривається з кімнати: створіть її на екрані банку
      </div>
      <Button variant="purple" className={styles.actionBtn} onClick={() => navigate('/teacher')}>
        ← до кабінету
      </Button>
    </div>
  );
}
