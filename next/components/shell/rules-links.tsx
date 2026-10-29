import { AppLink } from '@/components/ui/app-link';
import { ClassIcon } from '@/components/ui/class-icon';
import { ParchmentCard } from '@/components/ui/decorations';
import { GuideGlyph } from '@/components/guide/guide-glyph';

/** 正式與試玩設定共用相同的資料查閱入口。 */
export function RulesLinks() {
  const links = [
    { href: '/guide/classes', label: '職業成長指南', icon: <GuideGlyph kind="dice" /> },
    { href: '/catalog/spells', label: '法術一覽', icon: <ClassIcon name="Wizard" className="size-5" /> },
    { href: '/catalog/items', label: '裝備一覽', icon: <ClassIcon name="Fighter" className="size-5" /> },
  ];
  return (
    <ParchmentCard className="p-4">
      <h2 className="text-body font-semibold text-text-primary">規則與指南</h2>
      <nav aria-label="規則與指南" className="mt-2 divide-y divide-border">
        {links.map(({ href, label, icon }) => (
          <AppLink key={href} href={href} prefetch={false} className="flex min-h-11 items-center gap-3 rounded-sm py-2 text-body text-gold hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            {icon}<span className="flex-1">{label}</span><span aria-hidden="true">›</span>
          </AppLink>
        ))}
      </nav>
    </ParchmentCard>
  );
}
