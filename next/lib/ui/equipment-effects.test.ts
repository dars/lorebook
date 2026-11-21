import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Character, Equipment } from '@/lib/domain/character';
import { InventoryTab } from '@/components/character/tabs/rest-tabs';
import { AbilitiesTab } from '@/components/character/tabs/abilities-tab';
import { CharacterPrintSheet } from '@/components/character/character-print-sheet';
import { ItemEditor } from '@/components/character/editors/item-editor';

const fixture = () => Character.parse({ id: 'ui', name: '測試角色', proficiencyBonus: 2,
  abilityScores: Object.fromEntries(['str', 'dex', 'con', 'int_', 'wis', 'cha'].map(key => [key, { score: 14, modifier: 2, proficientSave: true }])),
  skills: [{ name: '運動', nameEn: 'Athletics', abilityType: 'STR', modifier: 4, proficient: true }],
  equipment: [Equipment.parse({ name: '食人魔力量護手', itemType: 'gear', equipped: true, requiresAttunement: true, attuned: true, effects: [{ kind: 'abilityFloor', ability: 'str', value: 19 }] })],
});

describe('裝備效果呈現', () => {
  it('一般裝備有明確穿戴入口，唯讀版本只有狀態與效果', () => {
    const c = fixture();
    const html = renderToStaticMarkup(createElement(InventoryTab, { c, onToggleEquipped: () => {} }));
    expect(html).toContain('aria-label="卸下 食人魔力量護手"');
    expect(html).toContain('力量至少 19');
    expect(html).toContain('已同調');
    const readOnly = renderToStaticMarkup(createElement(InventoryTab, { c }));
    expect(readOnly).not.toContain('aria-label="卸下');
    expect(readOnly).toContain('力量至少 19');
  });
  it('屬性與列印均顯示有效數值、基礎值及來源', () => {
    const c = fixture();
    const html = renderToStaticMarkup(createElement(AbilitiesTab, { c }));
    expect(html).toContain('基礎 14');
    expect(html).toContain('食人魔力量護手');
    expect(html).toContain('+6');
    const printed = renderToStaticMarkup(createElement(CharacterPrintSheet, { c }));
    expect(printed).toContain('<td>19</td>');
    expect(printed).toContain('力量：基礎 14');
    expect(printed).toContain('力量至少 19');
    expect(printed).toContain('<td>+6</td>');
  });
  it('物品編輯只設定可裝備與同調，實際穿戴留在清單', () => {
    const initial = fixture().equipment[0];
    const render = () => renderToStaticMarkup(createElement(ItemEditor, { open: true, initial, onClose: () => {}, onSave: () => {} }));
    const html = render();
    expect(html).toContain('可裝備');
    expect(html).not.toContain('已裝備／穿戴');
    expect(html).toContain('需要同調');
    expect(html).toContain('效果 1 數值');
    initial.itemType = 'consumable';
    expect(render()).not.toContain('可裝備');
  });
});


describe('普通物品裝備入口', () => {
  it('只替可裝備的物品顯示穿戴按鈕', () => {
    const c = fixture();
    c.equipment = [Equipment.parse({ name: '繩索', equippable: false }), Equipment.parse({ name: '護手', equippable: true })];
    const html = renderToStaticMarkup(createElement(InventoryTab, { c, onToggleEquipped: () => {} }));
    expect(html).not.toContain('aria-label="裝備 繩索"');
    expect(html).toContain('aria-label="裝備 護手"');
  });
});
