import { notFound } from 'next/navigation';

import { DemoShell } from '@/components/demo/demo-shell';
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

  return <DemoShell character={character} />;
}
