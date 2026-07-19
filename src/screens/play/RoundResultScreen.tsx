import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoGame } from '../../demo/engine';
import { FloatingShapes, HOME_SHAPES } from '../../shared/ui';

/** S2 - round outcome + interim leaderboard (trap gets its own reveal). */
export function RoundResultScreen() {
  const game = useDemoGame();
  const navigate = useNavigate();
  const outcome = game.lastOutcome;

  useEffect(() => {
    if (!outcome) navigate('/play', { replace: true });
  }, [outcome, navigate]);

  if (!outcome) return null;

  const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
  const isTrap = outcome.question.isTrap;

  const heading = isTrap
    ? outcome.isCorrect
      ? 'Пастку розгадано!'
      : 'Це було trap-питання!'
    : outcome.isCorrect
      ? 'Правильно!'
      : 'Неправильно';
  const icon = outcome.isCorrect ? '✓' : isTrap ? '🪤' : '✗';
  const iconBg = outcome.isCorrect ? 'var(--green)' : 'var(--red)';

  const next = () => {
    if (game.nextRound() === 'final') navigate('/play/final');
    else navigate('/play/round');
  };

  return (
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-3.5 overflow-hidden px-4">
      <FloatingShapes shapes={HOME_SHAPES} />

      <div
        className="relative flex h-[96px] w-[96px] items-center justify-center rounded-full text-[44px] font-extrabold"
        style={{ background: iconBg, boxShadow: `0 0 0 10px ${outcome.isCorrect ? 'rgba(38,137,12,.25)' : 'rgba(226,27,60,.22)'}`, animation: 'pulse 1.6s ease-in-out infinite' }}
      >
        {icon}
      </div>

      <div className="relative text-[22px] font-extrabold">{heading}</div>
      <div className="relative text-[14px] font-bold text-[var(--accent)]">
        + {Math.round(outcome.gained)} балів
      </div>

      {isTrap && (
        <div className="relative max-w-[340px] rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] text-white/85">
          Усі 4 варіанти були неправильні — максимум балів отримує той, хто не
          обрав нічого. {outcome.question.explanation}
        </div>
      )}
      {!isTrap && !outcome.isCorrect && (
        <div className="relative max-w-[340px] rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] text-white/85">
          Правильна відповідь:{' '}
          <b>{outcome.question.options[outcome.question.correctIndex]}</b>.{' '}
          {outcome.question.explanation}
        </div>
      )}

      <div className="relative w-full max-w-[330px] rounded-xl bg-[var(--dark)] p-3.5">
        <div className="mb-2 text-center text-[10px] tracking-wide text-[#c9b8ec] uppercase">
          Лідерборд
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
            <b>{Math.round(player.score)}</b>
          </div>
        ))}
      </div>

      <button type="button" className="btn-green relative" onClick={next}>
        {game.currentIndex + 1 >= game.questions.length ? 'До підсумків →' : 'Далі →'}
      </button>
    </div>
  );
}
