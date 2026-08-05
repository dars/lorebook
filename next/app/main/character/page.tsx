import { CharacterSheetLive } from '@/components/character/character-sheet-live';
import { fetchItems } from '@/lib/catalog/fetch';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { listShares } from '@/lib/share/actions';
import { SharePanelSection } from '@/components/character/share-section';

export const dynamic = 'force-dynamic';

/** 角色分頁：與分享檢視共用同一份 CharacterSheet，差別只在分享區塊是否渲染。 */
export default async function CharacterTabPage() {
  const id = (await getCurrentCharacterId())!;
  const { character } = await fetchMyCharacter(id);
  if (!character) return null;

  const { shares } = await listShares(id);
  // 工具熟練的候選來自內容庫；離線時為空陣列，編輯器據此降級。
  const { rows } = await fetchItems();
  const tools = rows.filter((i) => i.category === 'tool');

  return (
    <CharacterSheetLive
      initial={character}
      tools={tools}
      share={<SharePanelSection characterId={id} shares={shares} />}
    />
  );
}
