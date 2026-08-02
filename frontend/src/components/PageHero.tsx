import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  light?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHero({ title, subtitle, light = false, actions, className }: Props) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        <h1
          className={cn(
            'font-serif text-4xl font-bold tracking-tight sm:text-5xl',
            light ? 'text-white' : 'text-ink',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              'mt-2 max-w-xl text-base sm:text-lg',
              light ? 'text-white/80' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
