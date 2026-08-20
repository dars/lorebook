import { ParchmentCard } from '@/components/ui/decorations';
import { classCn } from '@/lib/creation/data';
import type { CustomSubclass } from '@/lib/subclasses/types';

/**
 * 自訂子職的內容區塊：母職業與各等級特性。
 *
 * 依等級分組呈現，而非平鋪一列——同一級有多個特性是常態（牧師 3 級的生命
 * 領域就有 4 筆），平鋪會讓人分不出哪些是同時取得的。
 *
 * 顯示的等級取自實際有特性的那幾級，不是 `levels` 全部：作者可能只寫到目前
 * 用得到的等級，把空的等級列出來只會讓人以為內容缺漏。
 */
export function SubclassBody({ s }: { s: CustomSubclass }) {
  const levels = [...new Set(s.features.map((f) => f.level))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="mt-3 space-y-3">
      <ParchmentCard className="p-4">
        <div className="flex gap-3 py-1 text-small">
          <span className="w-[110px] shrink-0 text-text-secondary">母職業</span>
          <span className="text-text-primary">
            {classCn(s.classEn)}
            {s.nameEn && (
              <span className="font-label ml-2 text-tiny text-text-primary/70">
                {s.nameEn}
              </span>
            )}
          </span>
        </div>
      </ParchmentCard>

      {levels.length === 0 ? (
        <ParchmentCard className="p-4">
          <p className="text-small text-text-secondary">
            這個子職還沒有填寫任何特性。
          </p>
        </ParchmentCard>
      ) : (
        levels.map((level) => (
          <ParchmentCard key={level} className="p-4">
            <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
              LEVEL {level} · {level} 級
            </div>
            <div className="mt-2 space-y-3">
              {s.features
                .filter((f) => f.level === level)
                .map((f, i) => (
                  <div key={i}>
                    <p className="text-[15px] font-semibold text-text-primary">
                      {f.name}
                    </p>
                    {f.description && (
                      <p className="mt-1 whitespace-pre-wrap text-small leading-relaxed text-text-light">
                        {f.description}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </ParchmentCard>
        ))
      )}
    </div>
  );
}
