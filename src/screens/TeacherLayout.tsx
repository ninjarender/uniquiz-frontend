import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth';
import { FloatingShapes, useToast } from '../shared/ui';
import { PlayFab } from './PlayFab';
import type { ShapeSpec } from '../shared/ui';

const SIDEBAR_SHAPES: ShapeSpec[] = [
  { glyph: '●', size: 40, top: '24%', left: '16px' },
  { glyph: '◆', size: 34, top: '38%', right: '12px' },
  { glyph: '■', size: 44, top: '52%', left: '60px' },
  { glyph: '▲', size: 30, top: '66%', right: '20px' },
  { glyph: '●', size: 38, top: '80%', left: '20px' },
];

/** T1 sidebar layout: glow, floating shapes, Discord-like profile. */
export function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initials = (user?.email ?? '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full bg-[#f4f1fb] text-[#222]">
      <aside className="relative flex w-[230px] shrink-0 flex-col overflow-hidden bg-uq-dark text-white">
        <div
          aria-hidden
          className="animate-glow-pulse pointer-events-none absolute top-1/3 left-1/2 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(123_47_247/0.5),transparent_70%)]"
        />
        <FloatingShapes shapes={SIDEBAR_SHAPES} />
        <button
          type="button"
          onClick={() => navigate('/teacher')}
          className="relative cursor-pointer border-none bg-transparent px-5 py-6 text-left text-[24px] font-extrabold tracking-[-1px] text-white"
        >
          Uni<span className="animate-logo-glow text-uq-accent">Quiz</span>
        </button>

        <nav className="relative flex flex-col gap-1 px-3 text-[13.5px] font-semibold">
          <button type="button" className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-white/12 px-3 py-2.5 text-left text-white">
            <span>📚</span> Мої банки
          </button>
          <button
            type="button"
            onClick={() => toast('Аналітика сесій — після ігрових тасок (0018+)')}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-white/60 transition-all hover:translate-x-1 hover:bg-white/8 hover:text-white"
          >
            <span>📊</span> Аналітика
          </button>
          <button
            type="button"
            onClick={() => toast('Апеляції — академічна фаза (post-MVP)')}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-white/60 transition-all hover:translate-x-1 hover:bg-white/8 hover:text-white"
          >
            <span>⚖️</span> Апеляції
          </button>
          <button
            type="button"
            onClick={() => toast('Налаштування акаунта — поза MVP')}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-white/60 transition-all hover:translate-x-1 hover:bg-white/8 hover:text-white"
          >
            <span>⚙️</span> Налаштування
          </button>
        </nav>

        <div className="relative mt-auto flex items-center gap-2 border-t border-white/10 bg-black/25 px-3 py-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-135 from-[#7b2ff7] to-uq-purple text-[12px] font-extrabold">
            {initials}
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-uq-dark bg-[#3ba55d]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-bold">{user?.email}</div>
            <div className="text-[10.5px] text-white/50">онлайн</div>
          </div>
          <button
            type="button"
            title="Вийти"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="cursor-pointer rounded-md border-none bg-transparent p-1.5 text-[15px] hover:bg-white/10"
          >
            🚪
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      <PlayFab />
    </div>
  );
}
