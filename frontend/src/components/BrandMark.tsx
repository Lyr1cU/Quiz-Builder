import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export function BrandMark({ className }: Props) {
  return (
    <Lightbulb
      className={cn('size-6 text-[var(--gold-from)] transition-transform duration-300', className)}
      strokeWidth={1.6}
      aria-hidden
    />
  );
}
