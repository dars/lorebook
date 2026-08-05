import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyHint } from '@/components/character/primitives';
import { fetchMyCharacters } from '@/lib/characters/fetch';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '我的角色｜Lorebook' };
export const dynamic = 'force-dynamic';

/** 角色清單：唯讀路徑，走 Server Component 直接讀（design D12）。 */
export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { characters, error } = await fetchMyCharacters();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-lg pb-4xl">
      <h1 className="pt-xl font-display text-title text-gold">我的角色</h1>

      {error && <EmptyHint text={`無法載入角色清單（${error}）。`} />}
      {!error && characters.length === 0 && (
        <EmptyHint text="還沒有角色。建角流程尚未移植。" />
      )}

      <ul className="mt-lg">
        {characters.map((c) => (
          <li key={c.id}>
            <Link
              href={`/characters/${c.id}`}
              className="flex items-baseline justify-between gap-md border-b border-border-2 py-md hover:text-gold"
            >
              <span>
                <span className="text-body text-text-primary">{c.name}</span>
                <span className="ml-sm text-small text-text-secondary">
                  {[c.species, c.className].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-small text-gold">{c.level} 級</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
