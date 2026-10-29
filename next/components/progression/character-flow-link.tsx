'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppLink } from '@/components/ui/app-link';
import { flushCharacterChanges } from '@/lib/state/sync';
/** 休息後立即進入選擇頁時，必須先保存休息額度及剛扣過的 HP。 */
export function CharacterFlowLink({ href, children, className, ...aria }: {
    href: string;
    children: ReactNode;
    className?: string;
    'aria-label'?: string;
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
    const router = useRouter();
    return <><AppLink href={href} className={className} {...aria} aria-busy={busy} onClick={async (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return; e.preventDefault(); if (busy)
        return; setBusy(true); const result = await flushCharacterChanges(); if (result) {
        setError(result);
        setBusy(false);
        return;
    } router.push(href); }}>{busy ? '保存中…' : children}</AppLink>{error && <span role="alert" className="text-small text-danger">{error}</span>}</>;
}
