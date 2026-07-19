import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_LEN } from '../../demo/data';
import { useDemoGame } from '../../demo/engine';
import { FloatingShapes, HOME_SHAPES, Logo, useToast } from '../../shared/ui';

/** Final: leaderboard, personal stats, play again / share (features.md). */
export function FinalScreen() {
  const game = useDemoGame();
  const navigate = useNavigate();
  const { toast } = useToast();

  const you = game.players.find((player) => player.isYou);

  useEffect(() => {
    if (!you || game.questions.length === 0) navigate('/play', { replace: true });
  }, [you, game.questions.length, navigate]);

  if (!you) return null;

  const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
  const place = leaderboard.findIndex((player) => player.isYou) + 1;
  // avg response over non-trap questions (N−1), per kb business rules
  const avgSeconds = you.elapsedSum / 1000 / Math.max(QUIZ_LEN - 1, 1);

  const share = async () => {
    const text = `UniQuiz: ${place} місце, ${Math.round(you.score)} балів, ${you.correct}/${QUIZ_LEN} правильних 🏆`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast('Результат скопійовано в буфер');
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const playAgain = () => {
    game.playAgain();
    navigate('/play/round');
  };

  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖';

  return (
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-3.5 overflow-hidden px-4">
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo size={24} />

      <div className="relative text-[46px]" style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>{medal}</div>
      <div className="relative text-[21px] font-extrabold">
        {place} місце · {Math.round(you.score)} балів
      </div>

      <div className="relative flex gap-3 text-center">
        <div className="rounded-xl bg-white/12 px-4 py-2">
          <b className="block text-[17px]">{you.correct}/{QUIZ_LEN}</b>
          <span className="text-[10px] text-white/65">правильних</span>
        </div>
        <div className="rounded-xl bg-white/12 px-4 py-2">
          <b className="block text-[17px]">{avgSeconds.toFixed(1)} с</b>
          <span className="text-[10px] text-white/65">середній час</span>
        </div>
      </div>

      <div className="relative w-full max-w-[330px] rounded-xl bg-[var(--dark)] p-3.5">
        <div className="mb-2 text-center text-[10px] tracking-wide text-[#c9b8ec] uppercase">
          Фінальний лідерборд
        </div>
        {leaderboard.map((player, index) => (
          <div
            key={player.name}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] ${player.isYou ? 'bg-[var(--purple)] outline-2 outline-[var(--accent)]' : ''}`}
          >
            <b className="w-4 text-[var(--accent)]">{index + 1}</b>
            <span className="flex-1 font-semibold">
              {player.name}
              {player.isYou && ' (ви)'}
            </span>
            <span className="text-[10.5px] text-white/55">{player.correct}/{QUIZ_LEN}</span>
            <b>{Math.round(player.score)}</b>
          </div>
        ))}
      </div>

      <div className="relative flex gap-2.5">
        <button type="button" className="btn-green" onClick={playAgain}>
          🔁 Зіграти ще раз
        </button>
        <button type="button" className="btn-purple" onClick={() => void share()}>
          📤 Поділитися
        </button>
      </div>
      <button
        type="button"
        onClick={() => { game.reset(); navigate('/'); }}
        className="relative cursor-pointer border-none bg-transparent text-[11.5px] text-white/50 underline hover:text-white/80"
      >
        на головну
      </button>
    </div>
  );
}
