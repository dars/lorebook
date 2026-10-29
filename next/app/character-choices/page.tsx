import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/supabase/server';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { fetchSpells, fetchItems, fetchFeats } from '@/lib/catalog/fetch';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { ProgressionView } from '@/components/progression/progression-view';
export const metadata: Metadata = { title: '成長選擇｜Lorebook' };
export const dynamic = 'force-dynamic';
export default async function CharacterChoicesPage({ searchParams }: {
    searchParams: Promise<{
        mode?: string;
    }>;
}) {
    const auth = await getAuthState();
    if (auth.status === 'unauthenticated')
        redirect('/login');
    if (auth.status === 'unknown')
        return <OfflineNotice />;
    const id = await getCurrentCharacterId();
    if (!id)
        redirect('/character-select');
    const { character } = await fetchMyCharacter(id);
    if (!character)
        redirect('/character-select');
    const [spells, items, feats] = await Promise.all([fetchSpells(), fetchItems(), fetchFeats()]);
    if (spells.error || items.error || feats.error)
        return <OfflineNotice />;
    const context = (await searchParams).mode === 'rest' ? 'rest' : 'backfill';
    return <ProgressionView initial={character} catalog={{ spells: spells.rows, items: items.rows, feats: feats.rows }} context={context}/>;
}
