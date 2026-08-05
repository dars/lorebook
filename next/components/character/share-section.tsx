import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import type { ShareRow } from '@/lib/share/actions';
import { SharePanel } from './editor/share-panel';

/** 分享區段：包在標準區段標題與卡片內，與其他區段的版面語彙一致。 */
export function SharePanelSection({
  characterId,
  shares,
}: {
  characterId: string;
  shares: ShareRow[];
}) {
  return (
    <CollapsibleSection en="SHARE" cn="分享" initiallyExpanded={false}
      summary={shares.length > 0 ? `${shares.length} 個有效連結` : '尚未分享'}>
      <ParchmentCard className="px-4 py-3">
        <SharePanel characterId={characterId} initial={shares} />
      </ParchmentCard>
    </CollapsibleSection>
  );
}
