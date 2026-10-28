import Image from 'next/image';
import { AppLink } from './app-link';

export function LegalBrand() {
  return <header className="mb-8 border-b border-border pb-5">
    <AppLink href="/login" aria-label="Lorebook 首頁" className="inline-flex min-h-11 items-center gap-3">
      <Image src="/images/app-icon-192.png" alt="" width={44} height={44} className="rounded-lg" />
      <span className="font-display text-heading text-section-label">Lorebook</span>
    </AppLink>
  </header>;
}
