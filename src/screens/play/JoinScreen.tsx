import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useDemoGame } from '../../demo/engine';
import { FloatingShapes, Logo } from '../../shared/ui';
import type { ShapeSpec } from '../../shared/ui';

const JOIN_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 64, top: '7%', left: '8%', spin: true },
  { glyph: '◆', size: 36, top: '24%', right: '10%' },
  { glyph: '●', size: 52, bottom: '20%', left: '9%' },
  { glyph: '■', size: 44, bottom: '8%', right: '12%', spin: true, delay: 2 },
];

/** D2 - joining a session: room code + nickname (demo engine). */
export function JoinScreen() {
  const { join } = useDemoGame();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    join(code.trim() || '482 913', name.trim() || 'Гість');
    navigate('/play/lobby');
  };

  return (
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden">
      <FloatingShapes shapes={JOIN_SHAPES} />
      <Logo />
      <div className="relative text-[12.5px] text-[#cdbfef]">
        Введіть код кімнати та ваше імʼя
      </div>

      <form className="uq-card w-[300px]" onSubmit={submit}>
        <input
          className="uq-field text-center text-[17px] font-extrabold tracking-[4px]"
          placeholder="Код кімнати"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <input
          className="uq-field text-center"
          placeholder="Ваше імʼя"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn-green" type="submit">▶ Приєднатися</button>
        <div className="text-center text-[11px] text-[#b9a8e6]">
          Код показує хост — на екрані чи проєкторі
        </div>
      </form>

      <div className="relative mt-2 rounded-full bg-white/10 px-4 py-1.5 text-[10.5px] font-bold tracking-wide text-[var(--accent)] uppercase">
        Демо-режим · кімнати підключаться з бекендом (0018+)
      </div>
    </div>
  );
}
