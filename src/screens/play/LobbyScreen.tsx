import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { START_ERROR_TEXT, clearPlayerSession, useGame } from '../../shared/game';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../../shared/ui';
import { ClosingBanner } from './ClosingBanner';
import styles from './LobbyScreen.module.css';

/**
 * Lobby (task 0052): players from the live server snapshot, the host starts
 * the game (0055), leave/close/handover flows per the ws contract.
 */
export function LobbyScreen() {
  const game = useGame();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dots, setDots] = useState('');
  const me = game.room?.players.find((player) => player.id === game.playerId);

  // No live room (deep link/reload without a session) -> the join page.
  // A just-closed room keeps the screen so the player reads why.
  useEffect(() => {
    if (!game.room && !game.roomClosed) navigate('/play', { replace: true });
  }, [game.room, game.roomClosed, navigate]);

  useEffect(() => {
    const timer = setInterval(
      () => setDots((previous) => (previous.length >= 3 ? '' : previous + '.')),
      500,
    );
    return () => clearInterval(timer);
  }, []);

  // The crown moved to us (host_changed, 0063): the start button appears by
  // itself (it renders off me.isHost) - say it out loud too.
  const amHost = me?.isHost === true;
  const wasHost = useRef(amHost);
  useEffect(() => {
    if (amHost && !wasHost.current) toast('Тепер ви хост кімнати');
    wasHost.current = amHost;
  }, [amHost, toast]);

  // Host changed the game settings (settings_updated, 0062): the meta line
  // is already live from the snapshot - add an unobtrusive toast on top.
  const settings = game.room?.settings;
  const prevSettings = useRef(settings);
  useEffect(() => {
    const previous = prevSettings.current;
    prevSettings.current = settings;
    if (!settings || !previous) return;
    const changed =
      previous.mode !== settings.mode ||
      previous.questionCount !== settings.questionCount ||
      previous.timePerQuestionSeconds !== settings.timePerQuestionSeconds;
    if (changed) toast('Хост оновив налаштування гри');
  }, [settings, toast]);

  // Kicked between events (e.g. the room died) -> silently back to joining;
  // start_game rejections (host path, 0055) -> a human toast.
  useEffect(() => {
    return game.interceptErrors((wsError) => {
      const startText = START_ERROR_TEXT[wsError.code];
      if (startText) {
        toast(startText);
        return true;
      }
      if (wsError.code !== 'not_a_member') return false;
      const roomId = game.room?.roomId;
      if (roomId) clearPlayerSession(roomId);
      navigate(roomId ? `/join/${roomId}` : '/play', { replace: true });
      return true;
    });
  }, [game.interceptErrors, game.room?.roomId, navigate, toast]);

  /** leave_room + wipe the stored session; back to the join page (0054). */
  const leaveLobby = () => {
    const roomId = game.room?.roomId;
    game.leave();
    navigate(roomId ? `/join/${roomId}` : '/play', { replace: true });
  };

  // The server closed the room (task 0065): a human dead-end instead of a
  // frozen lobby - the session is already wiped by the provider.
  if (game.roomClosed) {
    return (
      <div className={`grad-bg ${styles.screen}`}>
        <FloatingShapes shapes={HOME_SHAPES} />
        <Logo size={26} />
        <div className={styles.closedCard}>
          <div className={styles.closedTitle}>😕 Кімнату закрито</div>
          <div className={styles.note}>
            {game.roomClosed.reason === 'lobby_timeout'
              ? 'Лобі простояло надто довго без старту гри.'
              : 'Кімната більше не існує.'}{' '}
            Попросіть хоста створити нову кімнату.
          </div>
          <Link to="/" className={styles.closedLink}>На головну</Link>
        </div>
      </div>
    );
  }

  if (!game.room) return null;

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={26} />

      <div className={styles.roomBox}>
        <div className={styles.roomLabel}>Кімната</div>
        <div className={styles.roomCode}>{game.room.roomId}</div>
      </div>

      <div className={styles.meta}>
        {game.room.bankName} ·{' '}
        {game.room.settings.mode === 'solo' ? 'Solo' : 'Multiplayer'} ·{' '}
        {game.room.settings.questionCount} запитань
      </div>

      <ClosingBanner />

      <div className={styles.players}>
        {game.room.players.map((player) => (
          <span
            key={player.id}
            title={player.connected === false ? 'Втратив звʼязок' : undefined}
            className={`${styles.playerPill} ${player.id === game.playerId ? styles.playerYou : ''} ${
              player.connected === false ? styles.playerOffline : ''
            }`}
          >
            {player.isHost && '👑 '}
            {player.nickname}
            {player.id === game.playerId && ' (ви)'}
            {player.connected === false && ' 📴'}
          </span>
        ))}
      </div>

      <div className={styles.waiting}>очікуємо гравців{dots}</div>

      {me?.isHost && game.room.status === 'waiting' ? (
        <>
          <Button
            className={styles.startBtn}
            onClick={() => game.startGame()}
            disabled={
              game.room.settings.mode === 'solo'
                ? game.room.players.length !== 1
                : game.room.players.length < 2
            }
          >
            ▶ Почати гру ({game.room.players.length})
          </Button>
          <div className={styles.note}>
            {game.room.settings.mode === 'solo'
              ? 'Solo: грає лише хост'
              : 'Старт у Multiplayer можливий від 2 гравців'}
          </div>
        </>
      ) : (
        <div className={styles.note}>Гру запускає хост, коли всі зібралися</div>
      )}
      {game.room.status === 'waiting' && (
        <button type="button" className={styles.leaveLink} onClick={leaveLobby}>
          ← Вийти з кімнати
        </button>
      )}
    </div>
  );
}
