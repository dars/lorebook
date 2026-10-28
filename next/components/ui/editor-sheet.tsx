'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * 編輯用的底部彈出面板，對照 Flutter 端的 `EditorSheetScaffold`。
 *
 * 桌面版限寬 560px 置中；行動版貼底全寬。取消／儲存並排於底部。
 *
 * `size="wide"` 供內含主從式版面者使用（物品目錄），限寬放寬到 1100，
 * 與 Flutter 的 `BoxConstraints(maxWidth: 1100)` 一致。
 *
 * 用原生 <dialog> 而非自製 overlay——焦點鎖定在面板內、關閉後焦點還原到
 * 原本的觸發元件、背景 inert（滑鼠與螢幕閱讀器都到不了）、Esc 關閉，
 * 這四件事都由瀏覽器負責。自製 overlay 只會漏掉其中幾項。
 */
type EditorSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveEnabled?: boolean;
  /**
   * 主要按鈕的標籤。預設「儲存」，但這個面板也被拿來當確認框用，
   * 那時按鈕做的**不是**儲存——確認刪除、確認捨棄變更都是。
   * 標籤與實際行為不符會直接造成誤操作：曾經「捨棄未儲存的日誌」那顆鈕
   * 寫著「儲存」，使用者照著按就把剛寫的內容丟掉了。
   */
  saveLabel?: string;
  /** 破壞性動作用 danger——紅色是「按下去會失去東西」的唯一提示。 */
  saveTone?: 'gold' | 'danger';
  /**
   * 取消鈕的標籤。純閱讀的面板（特性說明、法術詳情）沒有東西可取消，
   * 那裡該寫「關閉」。
   */
  closeLabel?: string;
  /** 'wide'＝1100px，給內含主從式版面的面板。 */
  size?: 'default' | 'wide';
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * open=false 時整個卸載（而非留著隱藏的 dialog）——各編輯器的表單狀態
 * 都靠這次卸載重置，改成常駐會讓下次開啟殘留上一輪的草稿。
 */
export function EditorSheet(props: EditorSheetProps) {
  if (!props.open) return null;
  return <Sheet {...props} />;
}

function Sheet({
  title,
  onClose,
  onSave,
  saveEnabled = true,
  saveLabel = '儲存',
  saveTone = 'gold',
  closeLabel = '取消',
  size = 'default',
  children,
  footer,
}: EditorSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // 掛載即開啟。showModal() 才會進 top layer 並鎖焦點，open 屬性不會。
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc 的預設行為會直接關掉 DOM，但 React 仍以為是開著的——擋下預設，
      // 統一交由 onClose 改 state，開關只有一條路徑。
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 點背景關閉：modal dialog 的背景點擊事件 target 就是 dialog 本身，
      // 面板內的點擊 target 是子元素，因此不需要 stopPropagation。
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      // `hidden open:flex` 不可簡化成 `flex`：作者樣式會蓋過瀏覽器預設的
      // `dialog:not([open]) { display: none }`，面板就會在 showModal()
      // 之前先閃現一格（且不在 top layer、沒有 backdrop）。
      className="fixed inset-0 z-50 m-0 hidden h-auto max-h-none w-auto max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-black/60 open:flex medium:items-center"
    >
      {/* 焦點預設落在第一個可聚焦元素，在含輸入框的面板上會直接彈出手機
          鍵盤、蓋掉半個畫面。改讓面板本身接住焦點：標題會被讀出，Tab 仍
          從第一個控制項開始。 */}
      <div
        autoFocus
        tabIndex={-1}
        className={`flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[16px] border border-border bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] focus:outline-none medium:rounded-card medium:pb-5 ${
          size === 'wide' ? 'max-w-[1100px]' : 'max-w-[560px]'
        }`}
      >
        <h2 id={titleId} className="shrink-0 text-body font-bold text-text-primary">
          {title}
        </h2>
        <div className="mt-4 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-2">{children}</div>
        {footer && <div className="shrink-0 border-t border-border-2 pt-3">{footer}</div>}

        <div className="mt-3 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-card border border-border text-ui text-text-secondary hover:border-text-secondary hover:text-text-primary"
          >
            {closeLabel}
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={!saveEnabled}
              className={`min-h-11 flex-1 rounded-card border text-ui font-bold disabled:opacity-40 ${
                saveTone === 'danger'
                  ? 'border-danger bg-danger/10 text-danger hover:bg-danger/20 disabled:hover:bg-danger/10'
                  : 'border-gold bg-gold/10 text-gold hover:bg-gold/20 disabled:hover:bg-gold/10'
              }`}
            >
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

/**
 * 欄位小標。
 *
 * 有 `htmlFor` 時渲染成真正的 `<label>`：螢幕閱讀器才唸得出欄位名稱，
 * 點標籤也會聚焦到輸入框（手機上等於多一塊可點區）。純標題用途
 * （下方不是單一控制項，而是一組按鈕）則維持 div——`<label>` 指向
 * 一組按鈕沒有意義。
 */
export function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  const className =
    'font-label mb-1.5 block text-eyebrow tracking-[1.5px] text-section-label';
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {children}
      </label>
    );
  }
  return <div className={className}>{children}</div>;
}

/** 區段標題右端的編輯鈕。觸控目標 ≥44px。 */
export function EditIcon({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex size-11 items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 fill-text-secondary group-hover:fill-gold"
        aria-hidden
      >
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
      </svg>
    </button>
  );
}
