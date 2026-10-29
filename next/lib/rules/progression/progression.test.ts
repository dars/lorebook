import { describe, expect, it } from 'vitest';
import { Character as Schema } from '@/lib/domain/character';
import { CatalogSpell, CatalogItem, CatalogFeat } from '@/lib/catalog/types';
import { CLASSES, SKILLS } from '@/lib/creation/data';
import { choiceGroups, type ChoiceCatalog, type Selections } from './groups';
import { applyChoices, beginChoiceRest, validateChoices } from './engine';
import { applyLevelUp, planFor } from '../level-up';
const ability = { score: 14, modifier: 2, proficientSave: false };
const character = (cls = 'Fighter', level = 1) => Schema.parse({ id: 'test', name: '測試', className: cls, classNameEn: cls, level, maxHp: 20, currentHp: 7, spellcastingAbility: ['Wizard'].includes(cls) ? 'INT' : ['Bard', 'Sorcerer', 'Warlock'].includes(cls) ? 'CHA' : ['Cleric', 'Druid', 'Paladin', 'Ranger'].includes(cls) ? 'WIS' : '', abilityScores: { str: ability, dex: ability, con: ability, int_: ability, wis: ability, cha: ability }, skills: SKILLS.map(s => ({ name: s.name, nameEn: s.nameEn, abilityType: s.ability, modifier: 2, proficient: ['Arcana', 'History', 'Perception', 'Athletics'].includes(s.nameEn) })) });
const spell = (id: string, level = 0, classes = ['Wizard'], extra = {}) => CatalogSpell.parse({ id, name: id, eng_name: id, level, classes, casting_time: [{ unit: 'action', number: 1 }], ...extra });
const item = (id: string, subcategory: string, properties: string[] = []) => CatalogItem.parse({ id, name: id, eng_name: id, category: 'weapon', subcategory, properties, mastery: ['Vex'] });
const data: ChoiceCatalog = { spells: [...Array.from({ length: 8 }, (_, i) => spell(`cantrip${i}`)), ...Array.from({ length: 12 }, (_, i) => spell(`spell${i}`, 1)), spell('fireball', 3, ['Wizard'], { school: 'V' }), spell('wizard2', 2), spell('Eldritch Blast', 0, ['Warlock'], { damage_inflict: ['force'], range: { distance: { amount: 120 } } }), spell('cleric', 0, ['Cleric'])], items: [item('axe', '軍用近戰'), item('bow', '軍用遠程'), item('dagger', '簡易近戰', ['finesse', 'light']), item('rapier', '軍用近戰', ['finesse']), item('club', '簡易近戰')], feats: [] };
const valid = (c: ReturnType<typeof character>, s: Selections, context: 'backfill' | 'level' | 'rest' = 'backfill') => validateChoices(c, s, data, context, false);
describe('進程選擇', () => {
    it.each(CLASSES.map(c => [c.en]))('%s 1–20 級產生穩定且唯一的來源鍵', cls => { for (let lv = 1; lv <= 20; lv++) {
        const groups = choiceGroups(character(cls, lv), data);
        expect(new Set(groups.map(g => g.id)).size).toBe(groups.length);
        expect(groups.every(g => g.level <= lv && g.count > 0)).toBe(true);
    } });
    it('戰鬥風格在戰士1級、聖騎士與遊俠2級；其他職業不額外取得', () => { for (const cls of CLASSES) {
        expect(choiceGroups(character(cls.en, 1), data).some(g => g.id === 'fighting-style')).toBe(cls.en === 'Fighter');
    } for (const cls of ['Paladin', 'Ranger'])
        expect(choiceGroups(character(cls, 2), data).some(g => g.id === 'fighting-style')).toBe(true); });
    it('野蠻人不能選遠程；盜賊不能選無靈巧輕型的軍武', () => { expect(choiceGroups(character('Barbarian'), data).find(g => g.id === 'mastery')!.options.map(o => o.id)).not.toContain('bow'); const ids = choiceGroups(character('Rogue'), data).find(g => g.id === 'mastery')!.options.map(o => o.id); expect(ids).toContain('rapier'); expect(ids).not.toContain('axe'); });
    it('戰士長休最多換一種精通；重開不能再換', () => { let c = applyChoices(character(), { mastery: ['axe', 'bow', 'dagger'] }, data, 'backfill', false); c = beginChoiceRest(c, 'long'); expect(valid(c, { mastery: ['club', 'rapier', 'dagger'] }, 'rest')).not.toEqual([]); c = applyChoices(c, { mastery: ['club', 'bow', 'dagger'] }, data, 'rest', false); expect(valid(c, { mastery: ['club', 'rapier', 'dagger'] }, 'rest')).not.toEqual([]); });
    it('不能利用補選替換固定分支', () => { const c = applyChoices(character('Cleric'), { 'divine-order': ['Protector'] }, data, 'backfill', false); expect(valid(c, { 'divine-order': ['Thaumaturge'] }, 'backfill')).not.toEqual([]); });
    it('專精必須熟練且不可重複，加值升級後仍為雙倍', () => { let c = character('Rogue', 4); expect(valid(c, { 'expertise-1': ['Arcana', 'Acrobatics'] })).not.toEqual([]); c = applyChoices(c, { 'expertise-1': ['Arcana', 'Perception'] }, data, 'backfill', false); expect(c.skills.find(s => s.nameEn === 'Arcana')!.modifier).toBe(6); expect(c.passivePerception).toBe(16); c = applyLevelUp(c, planFor(c, 0), {}); expect(c.skills.find(s => s.nameEn === 'Arcana')!.modifier).toBe(8); expect(c.passivePerception).toBe(18); });
    it('神聖職責額外戲法不占基本名額，技能加值冪等', () => { let c = character('Cleric'); const s = { 'divine-order': ['Thaumaturge'], 'order-cantrip': ['cleric'] }; c = applyChoices(c, s, data, 'backfill', false); expect(c.cantrips).toHaveLength(1); expect(c.cantrips[0].spellAbility).toBe('WIS'); const twice = applyChoices(c, s, data, 'backfill', false); expect(twice.skills).toEqual(c.skills); expect(twice.cantrips).toEqual(c.cantrips); });
    it('替代戲法聖騎士使用魅力', () => { const spells = [spell('cleric1', 0, ['Cleric']), spell('cleric2', 0, ['Cleric'])]; const c = applyChoices(character('Paladin', 2), { 'fighting-style': ['Blessed Warrior'], 'warrior-cantrips': ['cleric1', 'cleric2'] }, { ...data, spells }, 'backfill', false); expect(c.cantrips.every(s => s.spellAbility === 'CHA')).toBe(true); });
    it('祈喚前置與等級限制不能被替換繞過', () => { let c = character('Warlock', 5); expect(valid(c, { invocations: ['Devouring Blade', 'Pact of the Blade', 'Thirsting Blade', 'Eldritch Mind', 'Armor of Shadows'] })).not.toEqual([]); const s = { invocations: ['Pact of the Blade', 'Thirsting Blade', 'Eldritch Smite', 'Eldritch Mind', 'Armor of Shadows'] }; c = applyChoices(c, s, data, 'backfill', false); expect(valid({ ...c, level: 6 }, { invocations: ['Pact of the Tome', ...s.invocations.slice(1)] }, 'level')).not.toEqual([]); });
    it('超魔為2/4/6個，不是術法點數量', () => { for (const [lv, count] of [[2, 2], [9, 2], [10, 4], [17, 6]])
        expect(choiceGroups(character('Sorcerer', lv), data).find(g => g.id === 'metamagic')?.count).toBe(count); });
    it('野獸形態保存名稱而非數據，限制CR與飛行', () => { const s = { forms: [0, 1, 2, 3].map(i => JSON.stringify({ name: `形態${i}`, cr: .25, fly: false })) }; expect(valid(character('Druid', 2), s)).toEqual([]); s.forms[0] = JSON.stringify({ name: '鳥', cr: .125, fly: true }); expect(valid(character('Druid', 2), s)).not.toEqual([]); });
    it('法師法術書不自動準備，書中才可準備；塑能學者名額獨立', () => { const s = { 'book-1': Array.from({ length: 6 }, (_, i) => `spell${i}`), prepared: ['spell0', 'spell1', 'spell2', 'spell3'] }; const c = applyChoices(character('Wizard'), s, data, 'backfill', false); expect(c.spellbook).toHaveLength(6); expect(c.spells).toHaveLength(4); expect(c.spellbook?.every(s => !s.prepared)).toBe(true); expect(valid(character('Wizard'), { ...s, prepared: ['spell0', 'spell1', 'spell2', 'spell9'] })).not.toEqual([]); const evoker = { ...character('Wizard', 5), subclassEn: 'Evoker' }; expect(choiceGroups(evoker, data).filter(g => g.id.startsWith('evocation')).map(g => g.count)).toEqual([2, 1]); });
    it('自創子職不套用SRD子職選項', () => { const c = { ...character('Ranger', 7), subclassEn: 'Hunter', customSubclass: { id: 'custom', name: '自創獵人', nameEn: 'Hunter', classEn: 'Ranger', levels: [], features: [] } }; expect(choiceGroups(c, data).some(g => g.id === 'hunters-prey')).toBe(false); });
    it('人類額外起源專長與背景來源分開', () => { const c = { ...character(), speciesEn: 'Human', features: [{ name: '警覺', nameEn: 'Alert', description: '', isCustom: false, source: '背景：測試' }] }; expect(valid(c, { 'human-origin': ['Alert'] })).not.toEqual([]); expect(valid(c, { 'human-origin': ['Skilled'], 'human-origin/skills': ['skill:Stealth', 'tool:Flute', 'tool:Drum'] })).toEqual([]); });
    it('補選與JSON往返保持HP、資源與自創內容，不默默升級', () => { let c = character('Fighter', 2); c.features.push({ name: '自己的能力', nameEn: '', source: '自訂', isCustom: true, description: '保留' }); c.resources.push({ name: '資源', nameEn: '', current: 0, max: 1, recovery: 'long', display: 'pips', dieFaces: 0, unit: '' }); c = applyChoices(c, { 'fighting-style': ['Defense'] }, data, 'backfill', false); expect(c.currentHp).toBe(7); expect(c.level).toBe(2); expect(c.resources[0].current).toBe(0); expect(c.features.some(f => f.name === '自己的能力')).toBe(true); expect(Schema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c); });
    it('補選過去ASI只加一次，抵達上限後仍能載入與保存', () => { const c = character('Fighter', 5); const s = { 'feat-4': ['ASI'], 'feat-4/ability': ['CON:2'] }; const next = applyChoices(c, s, data, 'backfill', false); expect(next.abilityScores.con.score).toBe(16); expect(next.maxHp).toBe(25); expect(applyChoices(next, s, data, 'backfill', false).maxHp).toBe(25); });
    it('起始金幣僅首次加入，已領取不補發', () => { let c = character(); c = applyChoices(c, { equipment: ['2'] }, data, 'backfill', false); expect(c.currency.gp).toBe(155); expect(applyChoices(c, { equipment: ['2'] }, data, 'backfill', false).currency.gp).toBe(155); expect(applyChoices(character(), { equipment: ['already'] }, data, 'backfill', false).currency.gp).toBe(0); });
    it('專長內容庫允許起源與風格但史詩要19級', () => { const feats = [CatalogFeat.parse({ id: 'boon', name: '恩賜', eng_name: 'Boon of Fate', data: { category: 'EB', prerequisite: [{ level: 19 }] } })]; expect(choiceGroups(character('Fighter', 4), { ...data, feats }).find(g => g.id === 'feat-4')?.options.some(o => o.id === 'boon')).toBe(false); });
});
describe('來源與替換邊界', () => {
    it('法術新手可選不同清單重複取得，不能與背景使用同一清單', () => {
        const c = { ...character(), speciesEn: 'Human', features: [{ name: '法術新手（牧師）', nameEn: 'Magic Initiate', source: '背景：侍僧', description: '', isCustom: false }] };
        const s = { 'human-origin': ['Magic Initiate'], 'background-origin/list': ['Cleric'], 'human-origin/list': ['Cleric'] };
        expect(valid(c, s).some(e => e.message.includes('不同職業清單'))).toBe(true);
        expect(valid(c, { ...s, 'human-origin/list': ['Wizard'] })).toEqual([]);
    });
    it('法師短休只能換一個已備法術，且不能透過重開頁面重複使用', () => {
        const d = { ...data, spells: Array.from({ length: 12 }, (_, i) => spell(`s${i}`, 1)) };
        let c = character('Wizard', 5);
        const book = d.spells.map(s => ({ name: s.name, nameEn: s.eng_name!, level: s.level, prepared: false }));
        c = Schema.parse({ ...c, spellbook: book });
        const s = { prepared: Array.from({ length: 9 }, (_, i) => `s${i}`) };
        c = applyChoices(c, s, d, 'backfill', false);
        c = beginChoiceRest(c, 'short');
        const next = { prepared: [...s.prepared.slice(1), 's9'] };
        expect(validateChoices(c, next, d, 'rest', false)).toEqual([]);
        c = applyChoices(c, next, d, 'rest', false);
        expect(validateChoices(c, { prepared: [...next.prepared.slice(1), 's10'] }, d, 'rest', false)).not.toEqual([]);
    });
    it('法師精通與招牌法術不占一般已備名額，並建立各自免費施法資源', () => {
        const d = { ...data, spells: [spell('one', 1), spell('two', 2), spell('three-a', 3), spell('three-b', 3)] };
        const c = Schema.parse({ ...character('Wizard', 20), spellbook: d.spells.map(s => ({ name: s.name, nameEn: s.eng_name, level: s.level, prepared: false })) });
        const s = { 'spell-mastery-1': ['one'], 'spell-mastery-2': ['two'], signature: ['three-a', 'three-b'] };
        const groups = choiceGroups(c, d, s);
        expect(groups.find(g => g.id === 'prepared')!.options).toEqual([]);
        const next = applyChoices(c, s, d, 'backfill', false);
        expect(next.spells).toHaveLength(4);
        expect(next.spells.every(s => s.alwaysPrepared)).toBe(true);
        expect(next.resources.filter(r => r.progressionSource?.startsWith('signature/'))).toHaveLength(2);
    });
    it('法術書補登不移除原本手動準備的法術', () => {
        const c = Schema.parse({ ...character('Wizard'), spells: [{ name: 'spell0', nameEn: 'spell0', level: 1 }] });
        const next = applyChoices(c, { 'book-1': Array.from({ length: 6 }, (_, i) => `spell${i}`) }, data, 'backfill', false);
        expect(next.spells[0]).toEqual(c.spells[0]);
    });
    it('魔書不能選已由其他來源知道的戲法', () => {
        const d = { ...data, spells: [...data.spells, spell('other', 0, ['Warlock'])] };
        const groups = choiceGroups(character('Warlock', 2), d, { invocations: ['Pact of the Tome'], cantrips: ['Eldritch Blast', 'other'] });
        expect(groups.find(g => g.id === 'tome-cantrips')!.options.some(o => o.id === 'Eldritch Blast')).toBe(false);
    });
    it('額外法術不會在重新保存時回復免費使用次數', () => {
        const d = { ...data, spells: [spell('arc', 6, ['Warlock'])] };
        let c = applyChoices(character('Warlock', 11), { 'arcanum-6': ['arc'] }, d, 'backfill', false);
        c = { ...c, resources: c.resources.map(r => ({ ...r, current: 0 })) };
        expect(applyChoices(c, { 'arcanum-6': ['arc'] }, d, 'backfill', false).resources[0].current).toBe(0);
    });
    it('內容庫缺起始裝備時回傳可顯示錯誤，而不是在預覽套用時才崩潰', () => {
        expect(valid(character(), { equipment: ['0'] })).toEqual(expect.arrayContaining([expect.objectContaining({ group: 'equipment' })]));
    });
});
it('多筆舊ASI補選合計不得超過上限', () => {
    const c = character('Fighter', 8);
    c.abilityScores.con = { score: 18, modifier: 4, proficientSave: false };
    expect(valid(c, { 'feat-4': ['ASI'], 'feat-4/ability': ['CON:2'], 'feat-6': ['ASI'], 'feat-6/ability': ['CON:2'] })).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('合計超過') })]));
});
it('舊資料同名戲法保留不同來源與施法屬性，不強迫刪除既有選擇', () => {
    const d = { ...data, spells: [spell('shared', 0, ['Cleric', 'Wizard']), spell('extra', 0, ['Wizard']), spell('first', 1, ['Wizard'])] };
    const c = { ...character('Cleric'), speciesEn: 'Human' };
    const s = { 'divine-order': ['Thaumaturge'], 'order-cantrip': ['shared'], 'human-origin': ['Magic Initiate'], 'human-origin/list': ['Wizard'], 'human-origin/ability': ['INT'], 'human-origin/cantrips': ['shared', 'extra'], 'human-origin/spell': ['first'] };
    c.progression={selections:s,grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};
    const next = applyChoices(c, s, d, 'backfill', false);
    expect(next.cantrips.find(s => s.nameEn === 'shared')?.castingSources?.map(s => s.ability)).toEqual(['WIS', 'INT']);
});
it('精通能力名稱不顯示內容庫識別碼', () => {
    const next = applyChoices(character(), { mastery: ['axe', 'bow', 'dagger'] }, data, 'backfill', false);
    expect(next.features[0]).toMatchObject({ nameEn: 'axe', source: '職業：Fighter Lv1' });
});
