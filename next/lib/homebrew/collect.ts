import { HOMEBREW_KIND, type HomebrewContent } from './types';

/**
 * 收藏時要寫進來源表的那一列。
 *
 * 抽成純函式是為了讓它測得到——收藏的正確性幾乎全在這一列的內容上：新 id
 * 有沒有換、文件裡那份 id 有沒有跟著換、提升欄位對不對、來源標記有沒有帶。
 * 這些放在 Server Action 裡就只能靠真的跑一次兩個帳號才驗得出來。
 */
export function collectRow(
  content: HomebrewContent,
  opts: {
    /** 新產生的 id。**不得沿用來源的 id**（openspec homebrew-share D2）。 */
    id: string;
    userId: string;
    token: string;
    sourceUpdatedAt: string | null;
    note?: string;
  },
): Record<string, unknown> {
  // 文件裡也有一份 id，一併換掉——留著來源的 id 會讓文件與列的主鍵不一致，
  // 之後編輯就寫到別的地方去了。
  const copy = { ...content.data, id: opts.id };

  return {
    id: opts.id,
    user_id: opts.userId,
    ...HOMEBREW_KIND[content.kind].columns(copy),
    data: copy,
    source_token: opts.token,
    source_updated_at: opts.sourceUpdatedAt,
    // 空白備註存 null 而非空字串：查詢時「有沒有備註」是一個判斷，不是兩個。
    source_note: opts.note?.trim() || null,
  };
}
