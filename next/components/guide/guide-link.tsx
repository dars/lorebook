import { AppLink } from '@/components/ui/app-link';

export function GuideLink() {
  return (
    <AppLink href="/guide/classes" className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-border pt-2 text-body text-gold hover:underline">
      <span>職業成長指南<span className="ml-2 text-small text-text-secondary">查看各級選擇</span></span>
      <span aria-hidden="true">↗</span>
    </AppLink>
  );
}
