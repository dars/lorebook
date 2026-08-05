import { JournalView } from '@/components/journal/journal-view';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';

export const dynamic = 'force-dynamic';

/** 旅程分頁。日誌歸屬角色（存在角色文件內），因此隨角色切換。 */
export default async function JournalPage() {
  const id = (await getCurrentCharacterId())!;
  const { character } = await fetchMyCharacter(id);
  if (!character) return null;
  return <JournalView initial={character} />;
}
