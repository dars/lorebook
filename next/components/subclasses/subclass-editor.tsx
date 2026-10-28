'use client';

import { useId } from 'react';

import { FieldLabel } from '@/components/ui/editor-sheet';
import { CLASSES, classCn } from '@/lib/creation/data';
import {
  FEATURE_DESC_MAX,
  FEATURE_NAME_MAX,
  NAME_MAX,
  type CustomSubclass,
  type SubclassFeature,
  featureLevelsFor,
} from '@/lib/subclasses/types';

/**
 * 自訂子職的編輯表單本體（不含 EditorSheet 外框與儲存邏輯）。
 *
 * 只有收藏紀錄頁會用到——自創內容的編輯一律在那裡，升級流程不長出編輯器
 * （見 docs/flutter-parity.md 的〈設計決定〉）。曾經有過的「升級時就地建一個」
 * 連同它的 `lockClass` 已移除。
 */
export const emptySubclass = (classEn = ''): CustomSubclass => ({
  id: '',
  name: '',
  nameEn: '',
  classEn,
  levels: featureLevelsFor(classEn),
  features: [],
});

// 檢視頁（Server Component）也要這個對照，因此本體放在 lib/creation/data.ts；
// 這裡轉出一份，既有的 import 路徑不必跟著改。
export { classCn };

export function SubclassEditor({
  value,
  onChange,
}: {
  value: CustomSubclass;
  onChange: (next: CustomSubclass) => void;
}) {
  const uid = useId();

  const pickClass = (classEn: string) => {
    const levels = featureLevelsFor(classEn);
    onChange({
      ...value,
      classEn,
      levels,
      // 換職業時保留仍在新等級表內的特性，其餘捨棄——
      // 戰士的 7 級特性搬到牧師身上沒有意義。
      features: value.features.filter((f) => levels.includes(f.level)),
    });
  };

  const addFeature = (level: number) =>
    onChange({
      ...value,
      features: [...value.features, { level, name: '', description: '' }],
    });

  const setFeature = (index: number, patch: Partial<SubclassFeature>) =>
    onChange({
      ...value,
      features: value.features.map((f, i) =>
        i === index ? { ...f, ...patch } : f,
      ),
    });

  const removeFeature = (index: number) =>
    onChange({
      ...value,
      features: value.features.filter((_, i) => i !== index),
    });

  return (
    <>
      <FieldLabel htmlFor={`${uid}-name`}>名稱</FieldLabel>
      <input
        id={`${uid}-name`}
        name="subclassName"
        autoComplete="off"
        spellCheck={false}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        maxLength={NAME_MAX}
        placeholder="例：烈焰學派"
        className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary"
      />

      <div className="mt-4">
        <FieldLabel>母職業</FieldLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {CLASSES.map((c) => (
            <button
              key={c.en}
              type="button"
              onClick={() => pickClass(c.en)}
              className={`min-h-11 rounded-chip border text-small ${
                value.classEn === c.en
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border-2 text-text-secondary'
              }`}
            >
              {c.cn}
            </button>
          ))}
        </div>
      </div>

      {value.levels.length > 0 && (
        <div className="mt-4">
          <FieldLabel>特性</FieldLabel>
          <p className="mb-2 text-small text-text-secondary">
            {classCn(value.classEn)}的子職在 {value.levels.join('、')} 級獲得特性。
            3 級必填，其餘可留空。
          </p>

          {value.levels.map((level) => {
            const items = value.features
              .map((f, i) => ({ f, i }))
              .filter(({ f }) => f.level === level);
            return (
              <div key={level} className="mb-3">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-small text-gold">{level} 級</span>
                  {level === 3 && (
                    <span className="text-small text-text-secondary">必填</span>
                  )}
                  <button
                    type="button"
                    onClick={() => addFeature(level)}
                    className="ml-auto min-h-9 text-small text-gold"
                  >
                    ＋ 新增特性
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-small text-text-secondary">
                    尚未新增，點上方的「＋ 新增特性」。
                  </p>
                ) : (
                  items.map(({ f, i }) => (
                    <div
                      key={i}
                      className="mb-2 rounded-card border border-border-2 p-2"
                    >
                      <div className="flex gap-2">
                        <input
                          aria-label={`${level} 級特性名稱`}
                          autoComplete="off"
                          spellCheck={false}
                          value={f.name}
                          onChange={(e) =>
                            setFeature(i, { name: e.target.value })
                          }
                          maxLength={FEATURE_NAME_MAX}
                          placeholder="特性名稱"
                          className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-ui text-text-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          aria-label="移除這個特性"
                          className="min-h-11 min-w-11 text-text-secondary"
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        aria-label={`${level} 級特性說明`}
                        value={f.description}
                        onChange={(e) =>
                          setFeature(i, { description: e.target.value })
                        }
                        maxLength={FEATURE_DESC_MAX}
                        rows={3}
                        placeholder="說明（選填）"
                        className="mt-2 w-full rounded-card border border-border bg-surface-2 p-2 text-ui text-text-primary"
                      />
                    </div>
                  ))
                )}
              </div>
            );
          })}

          <p className="text-small leading-relaxed text-text-secondary">
            特性僅為顯示文字，不會產生規則效果——寫「+2 AC」不會反映在角色卡的
            護甲等級上，數值請自行與 DM 確認。
          </p>
        </div>
      )}
    </>
  );
}
