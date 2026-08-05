import { DecisionView } from '@/components/decision/decision-view';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';

export const dynamic = 'force-dynamic';

/** 行動分頁：跑團當下的即時操作。伺服器取資料、client 端編輯（design D12）。 */
export default async function DecisionPage() {
  const id = (await getCurrentCharacterId())!;
  const { character } = await fetchMyCharacter(id);
  if (!character) return null;
  return <DecisionView initial={character} />;
}
