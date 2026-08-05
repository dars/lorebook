// OpenNext 的 Cloudflare 轉接器設定。
//
// 刻意不啟用 R2 增量快取（樣板預設）：本站沒有 ISR 需求——分享頁必須是即時
// 活資料（character-share 規格），角色頁是登入後的動態內容。加了只是多一個
// 會壞的地方。日後若出現可快取的靜態內容再開。
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
