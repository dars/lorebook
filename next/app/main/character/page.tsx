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

  // 三筆查詢彼此不相依，一定要平行——串起來就是三趟往返疊加，正是切到這個
  // 分頁特別慢的原因。角色那筆與 layout 共用同一次查詢（fetchMyCharacter 已
  // 用 cache() 記憶化）。
  const [{ character }, { shares }, { rows }] = await Promise.all([
    fetchMyCharacter(id),
    listShares(id),
    // 工具熟練的候選來自內容庫；離線時為空陣列，編輯器據此降級。
    fetchItems(),
  ]);
  if (!character) return null;

  const tools = rows.filter((i) => i.category === 'tool');

  return (
    <CharacterSheetLive
      initial={character}
      tools={tools}
      catalog={rows}
      share={<SharePanelSection characterId={id} shares={shares} />}
    />
  );
}
