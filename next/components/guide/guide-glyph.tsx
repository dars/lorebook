import { ClassIcon } from '@/components/ui/class-icon';

export function GuideGlyph({ kind, className = 'size-5' }: { kind: string; className?: string }) {
  if (kind !== 'dice' && kind !== 'spark') return <ClassIcon name={kind} className={className} />;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'dice' ? <path d="m12 2 9 5v10l-9 5-9-5V7Zm0 0L7 15h10Zm-9 5 4 8-4 2m18-10-4 8 4 2M7 15l5 7 5-7" /> : kind === 'spark' ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 3v3m-1.5-1.5h3" /> : null}
    </svg>
  );
}
