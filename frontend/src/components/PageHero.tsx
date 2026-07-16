type Props = {
  title: string;
  subtitle?: string;
  light?: boolean;
};

export function PageHero({ title, subtitle, light = false }: Props) {
  return (
    <div className="mb-8">
      <h1
        className={`font-serif text-4xl font-semibold tracking-tight sm:text-5xl ${
          light ? 'text-white' : 'text-[var(--ink)]'
        }`}
      >
        {title}
      </h1>
      {subtitle && (
        <p className={`mt-2 text-sm sm:text-base ${light ? 'text-white/75' : 'text-[var(--muted)]'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
