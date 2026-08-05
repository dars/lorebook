import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { fmtJournalRelativeDate } from '@/lib/journal/format';

export const dynamic = 'force-dynamic';

/**
 * 旅程分頁，對照 Flutter 端的 `JournalPage`。
 *
 * 日誌條目歸屬角色（存在角色文件的 `journalEntries`），因此隨角色切換。
 * 卡片顯示標題、相對日期與內文前兩行。
 */
export default async function JournalPage() {
  const id = (await getCurrentCharacterId())!;
  const { character } = await fetchMyCharacter(id);
  if (!character) return null;

  const entries = [...character.journalEntries].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  return (
    <div className="mx-auto w-full max-w-[700px] px-4">
      <SectionTitle en="JOURNAL" cn="旅程筆記" first />

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <svg viewBox="0 0 24 24" className="size-12 fill-gold" aria-hidden>
            <path d="M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z" />
          </svg>
          <p className="mt-3 text-[14px] font-semibold text-text-primary">
            尚未建立任何日誌
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            日誌編輯尚未移植。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <ParchmentCard key={e.id} className="p-4">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">
                  {e.title || '（無標題）'}
                </span>
                <span className="font-label shrink-0 text-[11px] text-text-secondary">
                  {fmtJournalRelativeDate(new Date(e.updatedAt))}
                </span>
              </div>
              {e.body && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
                  {e.body}
                </p>
              )}
            </ParchmentCard>
          ))}
        </div>
      )}
    </div>
  );
}
