import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/* ---------- floating decorative shapes ---------- */

const SHAPES = ['▲', '●', '■', '◆'] as const;

export interface ShapeSpec {
  glyph?: (typeof SHAPES)[number];
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  spin?: boolean;
  delay?: number;
}

/** Background layer of floating shapes (design board: floatRot / floatSpin360). */
export function FloatingShapes({ shapes }: { shapes: ShapeSpec[] }) {
  return (
    <>
      {shapes.map((shape, index) => (
        <span
          key={index}
          aria-hidden
          className={`pointer-events-none absolute leading-none font-extrabold text-white opacity-[0.13] select-none ${shape.spin ? 'animate-float-spin' : 'animate-float-rot'}`}
          style={{
            fontSize: shape.size,
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
            animationDelay: shape.delay ? `${shape.delay}s` : undefined,
          }}
        >
          {shape.glyph ?? SHAPES[index % SHAPES.length]}
        </span>
      ))}
    </>
  );
}

export const HOME_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 90, top: '6%', left: '5%', spin: true },
  { glyph: '●', size: 44, top: '26%', left: '13%' },
  { glyph: '■', size: 64, top: '56%', left: '6%', spin: true, delay: 2 },
  { glyph: '◆', size: 40, bottom: '8%', left: '20%' },
  { glyph: '◆', size: 82, top: '8%', right: '6%', spin: true, delay: 1 },
  { glyph: '■', size: 42, top: '38%', right: '13%' },
  { glyph: '▲', size: 70, bottom: '10%', right: '7%', spin: true, delay: 3 },
  { glyph: '●', size: 36, top: '64%', right: '20%' },
];

/* ---------- logo ---------- */

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div className="font-extrabold tracking-[-1px] text-white" style={{ fontSize: size }}>
      Uni<span className="animate-logo-glow text-uq-accent">Quiz</span>
    </div>
  );
}

/* ---------- toast ---------- */

interface ToastContextValue {
  toast: (message: string) => void;
}
const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div className="animate-card-in fixed bottom-[26px] left-1/2 z-90 -translate-x-1/2 rounded-[10px] border border-white/14 bg-uq-dark px-4.5 py-[11px] text-[13px] text-white shadow-[0_8px_30px_rgb(0_0_0/0.45)]">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

/* ---------- modal ---------- */

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-[rgb(12_4_34/0.72)] p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-card-in max-h-[90vh] w-[460px] max-w-full overflow-auto rounded-2xl border border-white/12 bg-uq-dark p-[22px] text-white">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold">{title}</h3>
          <button
            type="button"
            aria-label="Закрити"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-[18px] text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- misc ---------- */

/** Convenience for style objects with CSS custom properties. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
