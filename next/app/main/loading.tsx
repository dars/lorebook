/**
 * 分頁切換時的即時骨架。
 *
 * 主畫面四個分頁都是 `force-dynamic`，每次導覽都要等伺服器查完才回內容。
 * 沒有這個邊界的話，那一兩秒是**完全空白**——使用者會以為點沒中而再點一次。
 *
 * 有了 loading 邊界，Next 會在導覽當下立刻換上這個畫面（而且會預先抓下來），
 * 頁首與導覽列維持可互動，內容就緒後再換掉。
 *
 * 刻意做成「羊皮紙卡的形狀」而非轉圈圈：位置與尺寸貼近真正的內容，
 * 換上真資料時版面不會整個跳一下。
 */
function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-card border border-border bg-surface-1 ${className}`}
    />
  );
}

export default function Loading() {
  return (
    // 不在外層下 aria-hidden——那會連下面的 aria-live 一起藏掉。
    // 骨架本身是空的 div，螢幕閱讀器不會唸出任何東西。
    <div className="mx-auto w-full max-w-[700px] px-4 pt-3">
      {/* 區段標題的細線 */}
      <div className="flex items-center gap-2 pb-2">
        <span className="h-2 w-16 rounded-full bg-border-2" />
        <span className="h-px grow bg-border-2" />
      </div>
      <CardSkeleton className="h-32" />

      <div className="flex items-center gap-2 pb-2 pt-4">
        <span className="h-2 w-20 rounded-full bg-border-2" />
        <span className="h-px grow bg-border-2" />
      </div>
      <CardSkeleton className="h-24" />

      <div className="flex items-center gap-2 pb-2 pt-4">
        <span className="h-2 w-14 rounded-full bg-border-2" />
        <span className="h-px grow bg-border-2" />
      </div>
      <div className="flex gap-2">
        <CardSkeleton className="h-20 flex-1" />
        <CardSkeleton className="h-20 flex-1" />
        <CardSkeleton className="h-20 flex-1" />
      </div>

      {/* 骨架是純視覺的，但仍要讓螢幕閱讀器知道正在載入。 */}
      <p className="sr-only" aria-live="polite">
        載入中…
      </p>
    </div>
  );
}
