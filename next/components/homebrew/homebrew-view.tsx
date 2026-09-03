import type { ReactNode } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { HOMEBREW_KIND, type HomebrewContent } from '@/lib/homebrew/types';
import { BackgroundBody } from './background-body';
import { SpeciesBody } from './species-body';
import { SubclassBody } from './subclass-body';

/**
 * 自創內容檢視頁的骨架。
 *
 * 所有型別共用同一副外殼（型別標示、名稱、最後更新時間、行動區、免責說明），
 * 差別只在中間那塊內容區。新增型別是在下方的 switch 加一支，而不是複製一份
 * 頁面（openspec homebrew-share design D8）。
 *
 * **這裡的每一個字都是別人寫的。** 一律當純文字渲染：不進標記解析路徑，也
 * 不做任何形式的 HTML 注入（D11）。`lib/homebrew/plain-text.test.ts` 直接掃
 * 這個目錄的原始碼把關——那種約束會在某次「順手支援一下」之後靜默失守。
 */
export function HomebrewView({
  content,
  sourceUpdatedAt,
  actions,
}: {
  content: HomebrewContent;
  sourceUpdatedAt: string | null;
  /** 收藏等行動。未登入或尚未實作時可不給。 */
  actions?: ReactNode;
}) {
  const def = HOMEBREW_KIND[content.kind];

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10"
    >
      <SectionTitle en="SHARED HOMEBREW" cn="他人分享的自創內容" first />

      <ParchmentCard className="p-4">
        <p className="text-tiny text-text-secondary">{def.label}</p>
        <h1 className="font-display mt-1 text-heading font-bold text-gold">
          {content.data.name}
        </h1>
        {sourceUpdatedAt && (
          // 分享看的是作者當下的資料，因此「最後更新」是判斷新舊的唯一依據。
          <p className="mt-1 text-tiny text-text-secondary">
            最後更新：
            {new Date(sourceUpdatedAt).toLocaleString('zh-TW', {
              hour12: false,
            })}
          </p>
        )}
      </ParchmentCard>

      {content.kind === 'background' && <BackgroundBody b={content.data} />}
      {content.kind === 'subclass' && <SubclassBody s={content.data} />}
      {content.kind === 'species' && <SpeciesBody s={content.data} />}

      {actions && <div className="mt-5">{actions}</div>}

      <p className="mt-6 text-tiny leading-relaxed text-text-secondary">
        自創內容由使用者自行撰寫，僅為顯示文字，不會產生規則效果，也未經任何
        平衡審核。是否採用請與你的 DM 確認。
      </p>
    </main>
  );
}
