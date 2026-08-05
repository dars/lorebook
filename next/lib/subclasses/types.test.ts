import { describe, expect, it } from 'vitest';

import {
  SUBCLASS_FEATURE_LEVELS,
  cleanFeatures,
  featureLevelsFor,
  isValid,
  validate,
} from './types';

describe('子職特性等級', () => {
  it('12 個職業，全部自 3 級起', () => {
    const entries = Object.entries(SUBCLASS_FEATURE_LEVELS);
    expect(entries).toHaveLength(12);
    for (const [cls, lv] of entries) {
      expect(lv[0], `${cls} 應自 3 級起`).toBe(3);
    }
  });

  it('各職業等級不同——這正是不開放自由填寫的理由', () => {
    expect(featureLevelsFor('Fighter')).toEqual([3, 7, 10, 15, 18]);
    expect(featureLevelsFor('Cleric')).toEqual([3, 6, 17]);
    expect(featureLevelsFor('Rogue')).toEqual([3, 9, 13, 17]);
    expect(featureLevelsFor('Paladin')).toEqual([3, 7, 15, 20]);
  });

  it('未知職業回空陣列，不拋錯', () => {
    expect(featureLevelsFor('不存在的職業')).toEqual([]);
  });
});

describe('結構驗證', () => {
  const base = {
    id: 'x',
    name: '烈焰學派',
    classEn: 'Wizard',
    levels: [3, 6, 10, 14],
    features: [{ level: 3, name: '烈焰親和', description: '' }],
  };

  it('填妥即合法', () => expect(isValid(base)).toBe(true));

  it('名稱為空不合法', () => {
    expect(validate({ ...base, name: '  ' })).toContain('名稱');
  });

  it('母職業無效不合法', () => {
    expect(validate({ ...base, classEn: '' })).toContain('母職業');
  });

  it('缺 3 級特性不合法——3 級是取得子職的等級', () => {
    const r = validate({
      ...base,
      features: [{ level: 6, name: '只有六級', description: '' }],
    });
    expect(r).toContain('3 級');
  });

  it('非 3 級的等級可留空', () => {
    expect(isValid({ ...base, features: [{ level: 3, name: 'A', description: '' }] })).toBe(true);
  });

  it('同一等級多個特性合法——SRD 中同級多筆是常態', () => {
    expect(
      isValid({
        ...base,
        features: [
          { level: 3, name: 'A', description: '' },
          { level: 3, name: 'B', description: '' },
          { level: 3, name: 'C', description: '' },
        ],
      }),
    ).toBe(true);
  });

  it('不檢查平衡——強度是 DM 的職責', () => {
    expect(
      isValid({
        ...base,
        features: [{ level: 3, name: '無敵', description: '你不會受到任何傷害。' }],
      }),
    ).toBe(true);
  });

  it('名稱空白的條目於儲存時剔除', () => {
    expect(
      cleanFeatures([
        { level: 3, name: ' 有名字 ', description: '' },
        { level: 6, name: '   ', description: '寫了說明但沒名字' },
      ]),
    ).toEqual([{ level: 3, name: '有名字', description: '' }]);
  });
});
