import type { ComponentProps } from 'react';

/* Shared Tailwind-styled primitives (design board buttons/fields). */

const BUTTON_VARIANTS = {
  green:
    'bg-linear-145 from-[#2ea310] to-[#1f7a08] shadow-[0_3px_0_#145505] active:shadow-[0_1px_0_#145505]',
  purple:
    'bg-linear-135 from-uq-dark to-[#5b1fb0] shadow-[0_3px_0_#1b0741] active:shadow-[0_1px_0_#1b0741]',
  danger:
    'bg-linear-145 from-uq-red to-[#b0132d] shadow-[0_3px_0_#7a0d1f] active:shadow-[0_1px_0_#7a0d1f]',
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof BUTTON_VARIANTS;
}

export function Button({ variant = 'green', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-lg border-none px-4 py-2.5 text-[13.5px] font-bold text-white transition-[transform,filter] duration-100 hover:brightness-110 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

const FIELD_CLASS =
  'w-full rounded-lg border-none bg-white px-3 py-[11px] text-[13.5px] text-[#222] outline-none placeholder:text-[#999] focus:shadow-[0_0_0_3px_rgb(255_208_47/0.55)]';

export function TextField({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${FIELD_CLASS} ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`${FIELD_CLASS} resize-y ${className}`} {...rest} />;
}

/** Contract-error box (401/409/... messages). */
export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-uq-red/55 bg-uq-red/18 px-3 py-2 text-[12.5px] text-[#ffb3c0]">
      {children}
    </div>
  );
}
