import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BANK_NAME, QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { Button } from '../../shared/controls';
import { FloatingShapes, HOME_SHAPES, Logo } from '../../shared/ui';

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
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-4">
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={26} />

      <div className="relative rounded-2xl bg-white/10 px-5 py-2 text-center">
        <div className="text-[10.5px] tracking-wide text-[#cdbfef] uppercase">Кімната</div>
        <div className="text-[26px] font-extrabold tracking-[6px] text-uq-accent">
          {game.roomCode}
        </div>
      </div>

      <div className="relative text-[12.5px] text-[#cdbfef]">
        {DEMO_BANK_NAME} · Multiplayer · {QUIZ_LEN} запитань
      </div>

      <div className="relative flex max-w-[420px] flex-wrap items-center justify-center gap-2">
        {game.players.map((player) => (
          <span
            key={player.name}
            className={`animate-card-in rounded-full px-4 py-2 text-[13px] font-bold ${player.isYou ? 'bg-uq-accent text-[#3a2b00]' : 'bg-white/14 text-white'}`}
            
          >
            {player.name}
            {player.isYou && ' (ви)'}
          </span>
        ))}
      </div>

      <div className="relative h-4 text-[12px] text-white/60">
        очікуємо гравців{dots}
      </div>

      <Button className="relative" onClick={start} disabled={game.players.length < 2}>
        ▶ Почати гру ({game.players.length})
      </Button>
      <div className="relative text-[10.5px] text-white/45">
        Старт у Multiplayer можливий від 2 гравців · у демо гру запускаєте ви
      </div>
    </div>
  );
}
