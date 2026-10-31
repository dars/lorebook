import type {ReactNode} from 'react';
import type {Character} from '@/lib/domain/character';
import {CollapsibleSection} from '@/components/ui/collapsible-section';
import {CharacterPdfExport} from '../character-pdf-export';

export function CharacterSettingsTab({c,growthTools,share}:{c:Character;growthTools?:ReactNode;share?:ReactNode}) {
  return <div className="px-4 pb-10">
    {growthTools&&<CollapsibleSection en="GROWTH" cn="角色成長" first>
      <p className="text-small leading-relaxed text-text-secondary">補齊建角或升級時尚未完成的選擇，不會提升角色等級。</p>
      {growthTools}
    </CollapsibleSection>}
    <CollapsibleSection en="EXPORT" cn="匯出角色卡" first={!growthTools}>
      <CharacterPdfExport c={c}/>
    </CollapsibleSection>
    {share}
  </div>;
}
