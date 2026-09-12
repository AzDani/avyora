/** Écran de chargement (App Router) affiché pendant la navigation vers une page async. */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite" aria-label="Loading">
      <span className="relative grid h-12 w-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-60" />
        <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true" className="relative">
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5" />
          <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
        </svg>
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <span className="block h-full w-1/2 animate-pulse rounded-full bg-brand-400" />
      </span>
    </div>
  );
}
