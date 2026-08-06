-- 力量技能的譯名統一為官方繁中譯名「運動」（Athletics）。
--
-- 只改 5etools 的技能標記，**不做全文取代**——「體能」在中文裡是一般用語，
-- 內容庫中有 6 處是誤判：
--   · 5 個幻術法術的「因為物體能穿過它」（物體＋能）
--   · 鬥士子職的「卓越的體能」（體力之意）
-- 全文取代會把它們變成「物運動穿過它」「卓越的運動」。
--
-- 順帶補上 items 兩筆缺少中文顯示名的標記（原本畫面上顯示英文 Athletics）。
--
-- 可重複執行：條件比對的是舊字串，改過的列不會再被選中。

update public.spells
set data = replace(data::text, '{@skill Athletics|XPHB|體能}', '{@skill Athletics|XPHB|運動}')::jsonb
where data::text like '%{@skill Athletics|XPHB|體能}%';

update public.class_features
set data = replace(data::text, '{@skill Athletics|XPHB|體能}', '{@skill Athletics|XPHB|運動}')::jsonb
where data::text like '%{@skill Athletics|XPHB|體能}%';

update public.backgrounds
set data = replace(data::text, '{@skill Athletics|XPHB|體能}', '{@skill Athletics|XPHB|運動}')::jsonb
where data::text like '%{@skill Athletics|XPHB|體能}%';

-- items 的標記沒有第三參數，畫面會退回顯示英文名；補上中文。
update public.items
set data = replace(data::text, '{@skill Athletics|XPHB}', '{@skill Athletics|XPHB|運動}')::jsonb
where data::text like '%{@skill Athletics|XPHB}%';
