import { notFound } from 'next/navigation';

import { CharacterSheetLive } from '@/components/character/character-sheet-live';
import { CharacterHeader } from '@/components/shell/character-header';
import { DEMO_CHARACTERS, findDemoCharacter } from '@/lib/demo/characters';

/** 靜態資料，可在建置時預渲染——不需登入也不查資料庫。 */
export function generateStaticParams() {
  return DEMO_CHARACTERS.map((c) => ({ id: c.id }));
}

export default async function DemoCharacterPage({
  params,
}: PageProps<'/demo/[id]'>) {
  const { id } = await params;
  const character = findDemoCharacter(id);
  if (!character) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CharacterHeader c={character} />
      <div className="mx-auto w-full max-w-[1100px] flex-1">
        {/* 試玩不提供分享：訪客的角色不存在雲端，連結無從指向。
            persist=false：可操作但不推雲端。 */}
        <CharacterSheetLive initial={character} tools={[]} persist={false} />
      </div>
    </div>
  );
}
