import type { Metadata } from 'next';
import { AppLink } from '@/components/ui/app-link';
import { LegalBrand } from '@/components/ui/legal-brand';

export const metadata: Metadata = { title: '使用條款 | Lorebook' };

export default function TermsPage() {
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-10 text-body leading-relaxed text-text-primary">
    <LegalBrand />
    <h1 className="mt-4 font-cjk text-heading font-bold">Lorebook 使用條款</h1>
    <p className="mt-2 text-small text-text-secondary">更新日期：2026 年 10 月 28 日</p>
    <div className="mt-8 space-y-7 [&_h2]:mb-2 [&_h2]:font-bold [&_p]:mt-2 [&_a]:underline">
      <section><h2>服務用途</h2><p>Lorebook 是協助管理桌上角色扮演遊戲角色卡、自創內容與冒險筆記的工具，不是遊戲發行商的官方服務。規則計算與文字僅供遊戲參考，實際使用請與主持人確認。</p></section>
      <section><h2>帳號與合理使用</h2><p>請妥善保護你的 Google 帳號，不要分享登入憑證。不得利用本服務從事違法行為、侵害他人權利、存取不屬於你的資料，或干擾服務安全與運作。因安全事件或濫用而需要限制存取時，我們會依情況處理；如有疑問，可聯絡維護者。</p></section>
      <section><h2>你建立與分享的內容</h2><p>你保有自己創作內容的權利，並應確認有權上傳及分享相關文字與圖片。為提供你使用的功能，Lorebook 需要儲存、處理及顯示這些內容；這不代表將內容所有權轉讓給我們。</p><p>分享連結可能被轉傳，圖片網址可公開讀取；撤銷分享不能收回他人已保存或收藏的副本。請勿上傳需要保密的資料。詳細資料處理方式見<a href="/privacy">隱私權政策</a>。</p></section>
      <section><h2>服務變更與資料備份</h2><p>服務可能因維護、網路或供應商問題而中斷，功能也可能調整。我們不保證服務永不中斷或規則內容完全無誤，請自行保留重要角色與紀錄的備份。上述說明不排除適用法律不得排除的責任，也不限制你的法定權利。</p></section>
      <section><h2>聯絡與更新</h2><p>關於服務、內容權利或帳號資料，請聯絡 <a href="mailto:devlin@code4soul.dev">devlin@code4soul.dev</a>。條款調整會更新本頁日期，重大變更會在網站提供通知。</p></section>
    </div>
    <AppLink href="/privacy" className="mt-8 inline-flex min-h-11 items-center text-section-label underline">隱私權政策</AppLink>
  </main>;
}
