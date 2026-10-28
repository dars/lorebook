import type { Metadata } from 'next';
import { AppLink } from '@/components/ui/app-link';
import { LegalBrand } from '@/components/ui/legal-brand';

export const metadata: Metadata = {
  title: '隱私權政策 | Lorebook',
  description: 'Lorebook 如何處理登入資料、角色內容、圖片、分享與本機快取。',
};

export default function PrivacyPage() {
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-10 text-body leading-relaxed text-text-primary">
    <LegalBrand />
    <h1 className="mt-4 font-cjk text-heading font-bold">Lorebook 隱私權政策</h1>
    <p className="mt-2 text-small text-text-secondary">更新日期：2026 年 10 月 28 日</p>
    <div className="mt-8 space-y-7 [&_h2]:mb-2 [&_h2]:text-body [&_h2]:font-bold [&_p]:mt-2 [&_a]:underline">
      <section><h2>適用範圍與聯絡方式</h2><p>本政策適用於 lorebook.code4soul.dev 的 Lorebook 角色卡與冒險紀錄服務。關於資料處理、存取、更正或刪除，請聯絡 Lorebook 維護者：<a href="mailto:devlin@code4soul.dev">devlin@code4soul.dev</a>。</p></section>
      <section><h2>我們處理哪些資料、用於什麼目的</h2>
        <p>Google 登入：透過 Google 與 Supabase 接收帳號識別碼、電子郵件，以及 Google 提供的基本個人資料（例如名稱與頭像），用來識別帳號、維持登入及將雲端資料歸屬於你。Lorebook 不取得你的 Google 密碼；目前的登入功能不要求讀取 Gmail、Google 雲端硬碟或聯絡人。</p>
        <p>你建立的內容：角色卡、角色圖片、冒險筆記、自創內容、收藏與分享紀錄，用來提供編輯、儲存、跨裝置同步及你主動使用的分享功能。請勿在內容中放入不必要的個人資料或他人的敏感資料。</p>
        <p>技術與聯絡資料：網站與基礎設施服務可能處理 IP 位址、請求時間、瀏覽器資訊及錯誤紀錄，以傳送頁面、維護安全與排查問題。你寄送支援信件時，我們會使用信件中的聯絡資訊與內容處理你的請求。</p>
      </section>
      <section><h2>Cookies 與裝置上的資料</h2><p>我們使用必要的登入 Cookies、角色選擇紀錄、本機偏好、表單草稿與離線快取。部分角色頁面與圖片可能儲存在你的瀏覽器，讓你在離線時仍可閱讀。登出會要求清除私人頁面快取；在共用裝置上，建議登出並清除網站資料。清除瀏覽器資料不會同時刪除雲端資料；尚未同步的草稿可能因此遺失。</p></section>
      <section><h2>分享內容與圖片的可見性</h2><p>建立角色或自創內容分享連結後，任何取得連結的人都可能在未登入的情況下查看分享內容。你可以撤銷連結，但無法收回他人已下載、截圖或收藏的副本。</p><p>角色圖片儲存在可公開讀取的圖片空間：即使沒有建立角色分享連結，知道圖片網址的人仍可能讀取圖片。請勿上傳需要保密的照片或資料。移除圖片後，既有快取或他人保存的副本不一定立即消失。</p></section>
      <section><h2>服務供應商與資料傳輸</h2><p>我們使用 Google 提供登入、Supabase 提供身分驗證與資料及圖片儲存、Cloudflare 提供網站託管與傳輸。這些供應商會依其服務角色處理必要資料，資料可能在你所在國家或地區以外處理。詳見 <a href="https://policies.google.com/privacy">Google</a>、<a href="https://supabase.com/privacy">Supabase</a> 與 <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> 的隱私權說明。</p><p>Lorebook 不出售個人資料，也不將 Google 登入資料用於廣告投放。除提供服務所需的供應商、你主動分享的情況，或依法必須配合的要求外，不會將個人資料提供給其他人。</p></section>
      <section><h2>保留、刪除與你的選擇</h2><p>資料在提供服務與維護安全所需期間保留。目前刪除角色是軟刪除，會從正常角色清單中移除，但不等於立即從資料庫永久清除；撤銷分享也會保留撤銷紀錄。</p><p>如需查詢、更正、匯出或永久刪除帳號及相關資料，請從登入所用的電子郵件寄信至上述聯絡信箱。我們會確認請求者身分與資料範圍後處理，並說明無法立即清除的備份、依法保留資料或他人持有的副本。請勿寄送密碼或驗證碼。</p><p>你也可以在 <a href="https://myaccount.google.com/connections">Google 帳戶的第三方連結設定</a>撤銷 Lorebook 的存取權。撤銷 Google 授權不會自動刪除既有 Lorebook 雲端資料。</p></section>
      <section><h2>安全與政策更新</h2><p>我們使用加密連線與帳號存取控制保護資料，但無法保證任何網路服務絕對安全。功能或資料處理方式改變時，會更新本頁與更新日期；重大變更會在網站提供通知。本政策不限制適用法律賦予你的權利。</p></section>
    </div>
    <AppLink href="/terms" className="mt-8 inline-flex min-h-11 items-center text-section-label underline">使用條款</AppLink>
  </main>;
}
