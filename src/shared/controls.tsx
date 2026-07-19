import type { ComponentProps, ReactNode } from 'react';
import styles from './controls.module.css';

/* Shared styled primitives; all styling lives in controls.module.css. */

const VARIANT_CLASS = {
  green: styles.btnGreen,
  purple: styles.btnPurple,
  danger: styles.btnDanger,
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof VARIANT_CLASS;
}

export function Button({ variant = 'green', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-ripple
      className={`${styles.btn} ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}

export function TextField({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${styles.field} ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`${styles.field} ${styles.textarea} ${className}`} {...rest} />;
}

/** Contract-error box (401/409/... messages). */
export function ErrorBox({ children }: { children: ReactNode }) {
  return <div className={styles.errorBox}>{children}</div>;
}
