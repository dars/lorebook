import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseHomebrew } from './types';

/**
 * 外來內容一律純文字（openspec homebrew-share D11）。
 *
 * 這條約束靠的是「不要去呼叫解析器」，而那種約束會在某次「順手讓它也支援
 * {@dice} 吧」之後靜默失守——沒有型別錯誤，測試也全過。所以這裡直接盯著
 * 檔案內容：檢視元件不得引用 5etools 標記解析層，也不得注入 HTML。
 *
 * 掃描而非 mock 的理由：mock 只能證明「這次呼叫路徑沒用到」，掃描能證明
 * 「整個目錄都沒有這條路」。
 */
describe('檢視元件不得渲染外來標記', () => {
  const dir = join(process.cwd(), 'components/homebrew');
  const files = readdirSync(dir).filter((f) => f.endsWith('.tsx'));

  it('目錄非空——檔名改了要讓測試失敗，而不是靜默通過', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} 不引用標記解析層、不注入 HTML`, () => {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src).not.toMatch(/fivetools/i);
      expect(src).not.toContain('dangerouslySetInnerHTML');
    });
  }
});

describe('parseHomebrew', () => {
  const background = {
    id: 'b1',
    name: '工程師',
    abilities: ['INT', 'DEX', 'CON'],
    skills: ['調查', '奧秘'],
    originFeat: '技藝精湛',
  };

  const subclass = {
    id: 's1',
    name: '烈焰學派',
    classEn: 'Wizard',
    levels: [3, 6, 10, 14],
    features: [{ level: 3, name: '燃焰', description: '{@dice 1d8} 火焰傷害' }],
  };

  it('背景：與手動建立同一組 schema，選填欄位補預設值', () => {
    const r = parseHomebrew('background', background);
    expect(r?.kind).toBe('background');
    // schema 的 default——外來內容不因為少了選填欄位就被擋下。
    expect(r?.kind === 'background' && r.data.originFeatCustom).toBe(false);
  });

  const species = {
    id: 'sp1',
    name: '石裔',
    speedFt: 25,
    sizeMode: 'small',
    traits: [{ name: '石膚', description: '{@damage 1d4} 的鈍擊抗性' }],
    abilities: [{ name: '石工直覺', uses: 'proficiency', recovery: 'long' }],
  };

  it('子職：特性說明原樣保留，標記不被解析也不被剝除', () => {
    const r = parseHomebrew('subclass', subclass);
    expect(r?.kind === 'subclass' && r.data.features[0].description).toBe(
      '{@dice 1d8} 火焰傷害',
    );
  });

  it('種族：特性與能力原樣保留，選填欄位補預設值', () => {
    const r = parseHomebrew('species', species);
    expect(r?.kind).toBe('species');
    expect(r?.kind === 'species' && r.data.traits[0].description).toBe(
      '{@damage 1d4} 的鈍擊抗性',
    );
    // 沒填的英文名、每級額外 HP 走 schema 的 default，不因此被擋下。
    expect(r?.kind === 'species' && r.data.nameEn).toBe('');
    expect(r?.kind === 'species' && r.data.hpPerLevel).toBe(0);
  });

  it('認不得的 kind 回 null——舊版開到新型別的連結不該當掉', () => {
    expect(parseHomebrew('feat', { id: 'x', name: 'y' })).toBeNull();
    expect(parseHomebrew(undefined, background)).toBeNull();
  });

  it('形狀不對回 null，不丟例外', () => {
    // 缺 id / abilities / skills 的殘缺資料
    expect(parseHomebrew('background', { name: '只有名字' })).toBeNull();
    expect(parseHomebrew('subclass', null)).toBeNull();
  });
});
