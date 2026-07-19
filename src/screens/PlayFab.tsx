import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Floating "play" button for logged-in hosts (prototype's play-fab). */
export function PlayFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <button
          type="button"
          onClick={() => navigate('/play')}
          className="animate-card-in flex cursor-pointer items-center gap-2 rounded-full border-none bg-linear-145 from-[#2ea310] to-[#1f7a08] px-7 py-3.5 text-[16px] font-extrabold text-white shadow-[0_6px_22px_rgb(31_122_8/0.5)] transition-transform hover:scale-105 active:translate-y-[2px]"
        >
          <span className="animate-pulse-big inline-block">▶</span> Грати
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="cursor-pointer rounded-full border-none bg-linear-135 from-uq-dark to-[#5b1fb0] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgb(0_0_0/0.4)] transition-transform hover:scale-[1.04]"
      >
        🎮 Зіграти в гру{' '}
        <span className={`inline-block transition-transform ${open ? 'rotate-180' : ''}`}>▲</span>
      </button>
    </div>
  );
}
