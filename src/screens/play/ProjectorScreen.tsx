import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOT_NAMES, DEMO_BANK_NAME } from '../../demo/data';
import { FloatingShapes, Logo } from '../../shared/ui';
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
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden px-6 text-center">
      <FloatingShapes shapes={PROJECTOR_SHAPES} />
      <div className="absolute top-4 left-5"><Logo size={22} /></div>
      <div className="absolute top-4 right-5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wide text-[var(--accent)] uppercase">
        Демо · проєктор
      </div>

      {phase === 'waiting' ? (
        <>
          <div className="relative text-[14px] text-[#cdbfef]">
            Приєднуйтесь на <b className="text-white">uniquiz.university.ua</b> · код кімнати:
          </div>
          <div
            className="relative text-[72px] font-extrabold tracking-[10px] text-[var(--accent)]"
            style={{ textShadow: '0 0 34px rgba(255,208,47,.35)' }}
          >
            {code}
          </div>
          <div className="relative text-[12.5px] text-white/60">
            {DEMO_BANK_NAME} · учасників: {players.length}
          </div>
          <div className="relative flex max-w-[640px] flex-wrap items-center justify-center gap-2.5">
            {players.map((name) => (
              <span
                key={name}
                className="rounded-full bg-white/14 px-5 py-2.5 text-[15px] font-bold"
                style={{ animation: 'cardIn .35s ease both' }}
              >
                {name}
              </span>
            ))}
          </div>
          <button type="button" className="btn-green relative mt-2" onClick={() => setPhase('results')}>
            Завершити демо-сесію → підсумки
          </button>
        </>
      ) : (
        <>
          <div className="relative text-[30px] font-extrabold">Підсумки сесії</div>
          <div className="relative flex items-end gap-4">
            {results.map((row, index) => (
              <div key={row.name} className="flex flex-col items-center gap-1.5">
                <div className="text-[13px] font-bold">{row.name}</div>
                <div
                  className="flex w-[86px] items-start justify-center rounded-t-xl pt-2 text-[12px] font-extrabold text-[#2a1259]"
                  style={{
                    height: `${(row.score / top) * 240}px`,
                    background: index === 0
                      ? 'linear-gradient(180deg,#ffd02f,#e8b400)'
                      : 'linear-gradient(180deg,#a98ff2,#7b5fd0)',
                    boxShadow: index === 0 ? '0 0 26px rgba(255,208,47,.35)' : undefined,
                    animation: 'cardIn .5s ease both',
                    animationDelay: `${index * 120}ms`,
                  }}
                >
                  {row.score}
                </div>
              </div>
            ))}
          </div>
          <div className="relative max-w-[520px] text-[12px] text-white/60">
            В аналітиці згодом: успішність за темами, аномальні запитання,
            підозрілі патерни відкриття спойлерів
          </div>
          <button type="button" className="btn-purple relative" onClick={() => navigate('/teacher')}>
            ← до кабінету
          </button>
        </>
      )}
    </div>
  );
}
