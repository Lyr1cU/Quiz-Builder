'use client';

import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClick: () => void;
  label: string;
  className?: string;
  'aria-controls'?: string;
};

export function BurgerButton({
  open,
  onClick,
  label,
  className,
  'aria-controls': ariaControls,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={ariaControls}
      aria-label={label}
      className={cn(
        'burger-btn inline-flex size-10 items-center justify-center rounded-full text-white/90 transition-[background-color,color] duration-300 hover:bg-white/10 md:hidden',
        open && 'burger-btn--open bg-white/10 text-white',
        className,
      )}
    >
      <span className="burger-btn__bars" aria-hidden>
        <span className="burger-btn__line burger-btn__line--top" />
        <span className="burger-btn__line burger-btn__line--mid" />
        <span className="burger-btn__line burger-btn__line--bot" />
      </span>
    </button>
  );
}
