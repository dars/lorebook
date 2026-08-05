import type { ReactNode } from 'react';

/**
 * 視覺語言的基礎元件，逐項對照 Flutter 端的 `lib/app/theme/decorations.dart`。
 *
 * 這些不是「差不多就好」的裝飾——區段標題的英中雙標＋延伸線、卡片的角落括號、
 * 菱形分隔線，是這個 App 的識別。數值（字級、字距、線寬、間距）一律照搬，
 * 不憑感覺調整。
 */

/**
 * 區段標題：英文小標（Inter 10px / w700 / 字距 2）＋ 中文標題，右側以細線
 * 填滿剩餘寬度。
 *
 * Flutter 端以正則把 'BASIC 基本資訊' 拆成英中兩段；此處改為分別傳入——
 * 呼叫端本來就知道兩者，字串再拆一次只是把已知資訊丟掉再撿回來。
 */
export function SectionTitle({
  en,
  cn,
  trailing,
  first = false,
}: {
  en: string;
  cn?: string;
  trailing?: ReactNode;
  /** 頁面中第一個區段：省略上緣間距，避免與頁首的間距疊加。 */
  first?: boolean;
}) {
  return (
    <div className={`flex items-center ${first ? 'pt-0' : 'pt-3'} pb-2`}>
      <span className="font-label text-[10px] font-bold tracking-[2px] text-section-label">
        {en}
      </span>
      {cn && (
        <span className="ml-1.5 text-[14px] font-bold text-text-primary">
          {cn}
        </span>
      )}
      <span className="ml-1.5 h-px grow bg-border-2" />
      {trailing && <span className="ml-1.5">{trailing}</span>}
    </div>
  );
}

/**
 * 羊皮紙卡片：內容區塊的標準容器。
 *
 * Flutter 端是 Material 的 Card，取 theme 的 cardTheme——深色主題下即
 * surface-1 底、border 框、4px 圓角。
 */
export function ParchmentCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-border bg-surface-1 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * 卡片四角的括號裝飾。
 *
 * Flutter 端用 CustomPainter 畫線：距邊 4px、長 16px、outline 色 40% 透明。
 * 此處用四個絕對定位的區塊以 border 表現，視覺結果相同且不需 canvas。
 */
export function CardCorners({ children }: { children: ReactNode }) {
  const base = 'pointer-events-none absolute h-4 w-4 border-border/40';
  return (
    <div className="relative">
      <span className={`${base} left-1 top-1 border-l border-t`} />
      <span className={`${base} right-1 top-1 border-r border-t`} />
      <span className={`${base} bottom-1 left-1 border-b border-l`} />
      <span className={`${base} bottom-1 right-1 border-b border-r`} />
      {children}
    </div>
  );
}

/** 線—菱形—線的分隔。 */
export function DndDivider() {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="h-px grow bg-border/60" />
      <span className="size-2 rotate-45 border border-border/60" />
      <span className="h-px grow bg-border/60" />
    </div>
  );
}

/**
 * 總覽頁資訊格內的單一欄位：上方 9px 小標籤（字距 1.5），下方中文值 15px
 * w600 ＋ 英文值 11px 45% 透明。
 */
export function InfoField({
  label,
  value,
  valueEn = '',
}: {
  label: string;
  value: string;
  valueEn?: string;
}) {
  return (
    <div>
      <div className="font-label text-[9px] tracking-[1.5px] text-section-label">
        {label}
      </div>
      <div className="mt-1">
        <span className="text-[15px] font-semibold text-text-primary">
          {value}
        </span>
        {valueEn && (
          <span className="font-label ml-1.5 text-[11px] text-text-primary/45">
            {valueEn}
          </span>
        )}
      </div>
    </div>
  );
}
