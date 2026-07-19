import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './ui.module.css';

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
  /** Animation duration in seconds (prototype varies 7-34s per shape). */
  durationS?: number;
}

/** Background layer of floating shapes (design board: floatRot / floatSpin360). */
export function FloatingShapes({ shapes }: { shapes: ShapeSpec[] }) {
  return (
    <>
      {shapes.map((shape, index) => (
        <span
          key={index}
          aria-hidden
          className={`${styles.shape} ${shape.spin ? styles.shapeSpin : ''}`}
          style={{
            fontSize: shape.size,
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
            animationDelay: shape.delay ? `${shape.delay}s` : undefined,
            animationDuration: shape.durationS ? `${shape.durationS}s` : undefined,
          }}
        >
          {shape.glyph ?? SHAPES[index % SHAPES.length]}
        </span>
      ))}
    </>
  );
}

export const HOME_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 90, top: '6%', left: '5%', spin: true, durationS: 26 },
  { glyph: '●', size: 44, top: '26%', left: '13%', durationS: 9 },
  { glyph: '■', size: 64, top: '56%', left: '6%', spin: true, delay: 2, durationS: 30 },
  { glyph: '◆', size: 40, bottom: '8%', left: '20%', durationS: 12 },
  { glyph: '◆', size: 82, top: '8%', right: '6%', spin: true, delay: 1, durationS: 28 },
  { glyph: '■', size: 42, top: '38%', right: '13%', durationS: 8 },
  { glyph: '▲', size: 70, bottom: '10%', right: '7%', spin: true, delay: 3, durationS: 24 },
  { glyph: '●', size: 36, top: '64%', right: '20%', durationS: 11 },
];

/* ---------- logo ---------- */

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div className={styles.logo} style={{ fontSize: size }}>
      Uni<span className={styles.logoAccent}>Quiz</span>
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
      {message && <div className={styles.toast}>{message}</div>}
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
      className={styles.modalBg}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button type="button" aria-label="Закрити" onClick={onClose} className={styles.modalClose}>
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
