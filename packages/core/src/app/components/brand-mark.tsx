export function TookaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect
        x="4"
        y="5.5"
        width="12"
        height="15"
        rx="2.5"
        transform="rotate(-12 10 13)"
        className="fill-brand/40"
      />
      <rect x="8.5" y="3.5" width="12" height="15" rx="2.5" className="fill-brand" />
      <path
        d="M14.5 7.4c0 2.2-1.4 3.6-3.6 3.6 2.2 0 3.6 1.4 3.6 3.6 0-2.2 1.4-3.6 3.6-3.6-2.2 0-3.6-1.4-3.6-3.6Z"
        className="fill-brand-foreground"
      />
    </svg>
  );
}
