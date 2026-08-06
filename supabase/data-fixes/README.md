# 內容庫的譯名修正

這裡的 SQL 修正**匯入後的內容庫資料**，不是 schema。

內容庫由上游 5etools 資料匯入（依 `srd52` 標記過濾），因此**每次重新匯入後
都要重跑這裡的修正**，否則譯名會被蓋回去。migration 不適用——那些是 schema
變更，會在新資料庫上重放；這裡是對既有資料列的內容修正。

每個檔案都寫成可重複執行（重跑不會出錯、也不會改壞已修正的資料）。

## 執行

```bash
for f in supabase/data-fixes/*.sql; do
  supabase db query --linked "$(cat "$f")"
done
```
