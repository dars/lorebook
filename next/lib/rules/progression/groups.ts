import {normalizeOrigins, fixedBackgroundList, magicInitiateSources} from './origins';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { featAbilityOptions, featPrereqUnmet } from '../feats';
import { startingOptions, STARTING } from './equipment';
import { automaticSpellNames, sameSpellName } from './granted-spells';
import type { CatalogItem, CatalogSpell, CatalogFeat } from '@/lib/catalog/types';
import type { Character } from '@/lib/domain/character';
import { CLASSES, SKILLS } from '@/lib/creation/data';
import { CANTRIPS_KNOWN, PREPARED_SPELLS, CLASS_PROGRESSION, maxSpellRingFor, asiLevelsFor } from '../level-tables';
import { castKindOf } from '@/lib/creation/spell-from-catalog';
import { ARTISAN_TOOLS, DAMAGE, INSTRUMENTS, INVOCATIONS, LANGUAGES, METAMAGIC, ORIGINS, STYLES, TOOLS, opts, originId, featOriginKey, type Option } from './options';
export type Selections = Record<string, string[]>;
export type ChoiceCatalog = {
    spells: CatalogSpell[];
    items: CatalogItem[];
    feats?: CatalogFeat[];
    /** 本次升級由主表單處理的專長等級，避免另開一次補選名額。 */
    handledFeatLevel?: number;
};
export type ChoiceGroup = {
    id: string;
    title: string;
    level: number;
    count: number;
    minCount?: number;
    legacyDuplicateIds?: string[];
    options: Option[];
    kind: 'feature' | 'skill' | 'expertise' | 'tool' | 'language' | 'spell' | 'book' | 'form' | 'mixed';
    detail?: string;
    family?: string;
    replace?: {
        when: 'level' | 'long' | 'short';
        count: number;
    minCount?: number;
        budget?: string;
    };
    ability?: string;
    always?: boolean;
    recovery?: 'short' | 'long';
    unlimited?: boolean;
};
const skillOptions = SKILLS.map(s => ({ id: s.nameEn, name: s.name }));
const asOptions = (spells: CatalogSpell[]) => spells.map(s => ({ id: s.id, name: s.name, detail: `${s.eng_name ?? ''} · ${s.level === 0 ? '戲法' : `${s.level} 環`}`, description: ftFlattenEntries(s.entries) }));
const knownKey = (s: {
    name: string;
    nameEn: string;
}) => s.nameEn || s.name;
/** 不依靠翻譯文字判斷子職。自訂快照永遠不套 SRD 子職的額外規則。 */
export function hasSrdSubclass(c: Character): boolean {
    if (c.customSubclass)
        return false;
    const aliases: Record<string, string[]> = { Bard: ['College of Lore'], Druid: ['Circle of the Land'], Fighter: ['Champion'], Ranger: ['Hunter'], Sorcerer: ['Draconic Sorcery', 'Draconic Bloodline'], Warlock: ['Fiend Patron', 'The Fiend'], Wizard: ['Evoker', 'School of Evocation'] };
    return (aliases[c.classNameEn] ?? []).includes(c.subclassEn);
}
export function choiceGroups(c: Character, catalog: ChoiceCatalog, selected: Selections = c.progression?.selections ?? {}): ChoiceGroup[] {
    selected=normalizeOrigins(c,selected);
    const cls = c.classNameEn, lv = c.level, groups: ChoiceGroup[] = [];
    const values = (key: string) => selected[key] ?? [];
    const chosen = (key: string, id: string) => values(key).includes(id);
    const add = (g: ChoiceGroup) => { if (lv >= g.level && g.count > 0)
        groups.push({...g,options:g.options.map(o=>({...o}))}); };
    const simple = (id: string, title: string, level: number, count: number, options: Option[], extra: Partial<ChoiceGroup> = {}) => add({ id, title, level, count, options, kind: 'feature', ...extra });
    const all = (family: string) => groups.filter(g => g.family === family).flatMap(g => values(g.id));
    const spellOptions = (classes: string[], min: number, max: number, predicate: (s: CatalogSpell) => boolean = () => true) => catalog.spells.filter(s => s.level >= min && s.level <= max && (!classes.length || s.classes.some(k => classes.includes(k))) && predicate(s));
    const spell = (id: string, title: string, level: number, count: number, classes: string[], min: number, max: number, extra: Partial<ChoiceGroup> = {}, predicate: (s: CatalogSpell) => boolean = () => true) => simple(id, title, level, count, asOptions(spellOptions(classes, min, max, predicate)), { kind: 'spell', ability: c.spellcastingAbility, ...extra });
    simple('equipment', '職業起始裝備', 1, 1, [...startingOptions(cls, catalog.items), { id: 'already', name: '已經領取', detail: '只登記，不再加入裝備與金幣；供既有角色補選使用。' }]);
    if (STARTING[cls]?.[Number(values('equipment')[0])]?.items.length) {
        if (cls === 'Bard')
            simple('equipment-instrument', '起始裝備 · 樂器', 1, 1, INSTRUMENTS);
        if (['Cleric', 'Paladin'].includes(cls))
            simple('holy-symbol', '起始裝備 · 聖徽', 1, 1, opts(['Amulet|護符', 'Emblem|徽記', 'Reliquary|聖物匣']));
    }
    const maxRing = maxSpellRingFor(CLASS_PROGRESSION[cls], lv);
    const baseCantrips = CANTRIPS_KNOWN[cls]?.[lv - 1] ?? 0;
    spell('cantrips', '職業戲法', 1, baseCantrips, [cls], 0, 0, { family: 'base-cantrips', replace: { when: cls === 'Wizard' ? 'long' : 'level', count: 1 } });
    if (cls === 'Wizard') {
        for (let l = 1; l <= lv; l++)
            spell(`book-${l}`, `法術書 · ${l} 級取得`, l, l === 1 ? 6 : 2, ['Wizard'], 1, maxSpellRingFor(CLASS_PROGRESSION.Wizard, l), { kind: 'book', family: 'book' });
    }
    const bookIds = () => new Set([...all('book'), ...(c.spellbook ?? []).flatMap(s => catalog.spells.filter(v => (v.eng_name || v.name) === knownKey(s)).map(v => v.id))]);
    const prepared = PREPARED_SPELLS[cls]?.[lv - 1] ?? 0;
    const preparedClasses = cls === 'Bard' && lv >= 10 ? ['Bard', 'Cleric', 'Druid', 'Wizard'] : [cls];
    // 法師的已備候選在子職法術書建立後重新篩選。
    spell('prepared', '職業已備法術', 1, prepared, preparedClasses, 1, maxRing, { family: 'prepared', replace: { when: ['Bard', 'Sorcerer', 'Warlock'].includes(cls) ? 'level' : 'long', count: ['Cleric', 'Druid', 'Wizard'].includes(cls) ? 99 : 1 } });
    const skill = (id: string, title: string, level: number, count: number, from = skillOptions, expertise = false) => simple(id, title, level, count, from, { kind: expertise ? 'expertise' : 'skill', family: expertise ? 'expertise' : 'skill' });
    const language = (id: string, title: string, level: number, count: number, options = LANGUAGES) => simple(id, title, level, count, options, { kind: 'language', family: 'language' });
    language('creation-languages', '額外語言', 1, 2, LANGUAGES.slice(1, 10));
    const style = (id: string, level: number, extra: Option[] = []) => simple(id, '戰鬥風格', level, 1, [...STYLES, ...extra], { detail: 'SRD 5.2.1 收錄四種戰鬥風格；此處只列 SRD 內容。', family: 'style', replace: cls === 'Fighter' ? { when: 'level', count: 1, budget: 'style' } : undefined });
    for (const level of asiLevelsFor(cls)) {
        if (level > lv || level === catalog.handledFeatLevel)
            continue;
        const id = `feat-${level}`;
        const recorded = c.features.some(f => !f.progressionSource && new RegExp(`Lv\\s*${level}\\b`).test(f.source) && (f.nameEn === 'Ability Score Improvement' || /^(專長|史詩恩賜)/.test(f.source)));
        if (recorded && !selected[id])
            continue;
        const eligible = (catalog.feats ?? []).filter(f => f.eng_name !== 'Ability Score Improvement' && (featPrereqUnmet(f, c, level) === null || values(id).includes(f.id)) && (!(f.data.category === 'EB') || level >= 19));
        simple(id, `${level} 級 · 能力值提升或專長`, level, 1, [{ id: 'already', name: '已經套用', detail: '只登記；保留目前能力值與既有專長。' }, { id: 'ASI', name: '能力值提升', detail: '一項 +2 或兩項各 +1，最高 20。' }, ...eligible.map(f => ({ id: f.id, name: f.name, detail: f.eng_name ?? '' }))]);
        const feat = eligible.find(f => chosen(id, f.id));
        const boost = feat ? featAbilityOptions(feat) : null;
        const codes = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        const names = ['力量', '敏捷', '體質', '智力', '感知', '魅力'];
        const score = (code: string) => c.abilityScores[(code === 'INT' ? 'int_' : code.toLowerCase()) as keyof Character['abilityScores']].score;
        if (chosen(id, 'ASI'))
            simple(`${id}/ability`, '能力值提升 · 分配', level, 1, [...codes.map((a, i) => ({ id: `${a}:2`, name: `${names[i]} +2` })), ...codes.flatMap((a, i) => codes.slice(i + 1).map(b => ({ id: `${a}:1,${b}:1`, name: `${names[i]} +1、${names[codes.indexOf(b)]} +1` })))].filter(o => values(`${id}/ability`).includes(o.id) || o.id.split(',').every(v => { const [a, n] = v.split(':'); return score(a) + Number(n) <= 20; })));
        if (boost)
            simple(`${id}/ability`, '專長 · 能力加值', level, 1, boost.from.filter(a => score(a) < boost.cap || values(`${id}/ability`).includes(`${a}:1`)).map(a => ({ id: `${a}:1`, name: `${names[codes.indexOf(a)]} +1` })));
        if (feat?.data.category === 'O')
            selected = { ...selected, [`feat-origin-${id}`]: [feat.eng_name ?? ''] };
    }
    // 各來源獨立保存，不能以「總共知道幾個」吃掉額外授予的名額。
    if (['Barbarian', 'Fighter', 'Paladin', 'Ranger', 'Rogue'].includes(cls)) {
        const count = cls === 'Fighter' ? 3 + Number(lv >= 4) + Number(lv >= 10) + Number(lv >= 16) : cls === 'Barbarian' ? 2 + Number(lv >= 4) + Number(lv >= 10) : 2;
        const weapons = catalog.items.filter(w => w.category === 'weapon' && w.mastery.length > 0 && (cls !== 'Barbarian' || w.subcategory.includes('近戰')) && (cls !== 'Rogue' || w.subcategory.includes('簡易') || w.properties.some(p => /^(finesse|light)/i.test(p))));
        simple('mastery', '武器精通', 1, count, weapons.map(w => ({ id: w.id, name: w.name, detail: `${w.eng_name} · ${w.mastery.join('、')}` })), { replace: { when: 'long', count: ['Barbarian', 'Fighter'].includes(cls) ? 1 : 99 } });
    }
    if (cls === 'Barbarian')
        skill('primal-skill', '原初知識 · 技能', 3, 1, skillOptions.filter(s => CLASSES.find(x => x.en === cls)!.skillChoices.includes(s.name)));
    if (cls === 'Bard') {
        skill('expertise-2', '專精', 2, 2, skillOptions, true);
        skill('expertise-9', '額外專精', 9, 2, skillOptions, true);
        simple('instruments', '樂器熟練', 1, 3, INSTRUMENTS, { kind: 'tool', family: 'tool' });
    }
    if (cls === 'Cleric') {
        simple('divine-order', '神聖職責', 1, 1, opts(['Protector|守護者|取得軍用武器與重甲訓練。', 'Thaumaturge|奇術師|額外牧師戲法；奧秘及宗教加感知修正（至少 +1）。']));
        if (chosen('divine-order', 'Thaumaturge'))
            spell('order-cantrip', '奇術師 · 額外戲法', 1, 1, ['Cleric'], 0, 0, { always: true, ability: 'WIS', replace: { when: 'level', count: 1, budget: 'cantrips' } });
        simple('blessed-strikes', '祝福打擊', 7, 1, opts(['Divine Strike|神聖打擊|每回合一次武器命中 +1d8 黯蝕或光輝；14 級增至 2d8。', 'Potent Spellcasting|強效施法|牧師戲法傷害加感知修正；14 級傷害戲法可賦予暫時生命。']));
    }
    if (cls === 'Druid') {
        simple('primal-order', '原初職責', 1, 1, opts(['Magician|術法師|額外德魯伊戲法；奧秘及自然加感知修正（至少 +1）。', 'Warden|守衛|取得軍用武器與中甲訓練。']));
        if (chosen('primal-order', 'Magician'))
            spell('order-cantrip', '術法師 · 額外戲法', 1, 1, ['Druid'], 0, 0, { always: true, ability: 'WIS', replace: { when: 'level', count: 1, budget: 'cantrips' } });
        simple('forms', '荒野形態', 2, lv >= 8 ? 8 : lv >= 4 ? 6 : 4, [], { kind: 'form', detail: `自行記錄野獸名稱與 CR；最高 CR ${lv >= 8 ? '1' : lv >= 4 ? '1/2' : '1/4'}，${lv >= 8 ? '允許' : '禁止'}飛行。`, replace: { when: 'long', count: 1 } });
        simple('elemental-fury', '元素之怒', 7, 1, opts(['Potent Spellcasting|強效施法|德魯伊戲法傷害加感知修正；15 級延伸法術射程。', 'Primal Strike|原初打擊|每回合一次武器／野獸命中 +1d8 元素傷害；15 級增至 2d8。']));
    }
    if (cls === 'Fighter')
        style('fighting-style', 1);
    if (cls === 'Monk')
        simple('monk-tool', '工具熟練', 1, 1, [...ARTISAN_TOOLS, ...INSTRUMENTS], { kind: 'tool', family: 'tool' });
    if (cls === 'Paladin' || cls === 'Ranger') {
        const pal = cls === 'Paladin';
        const alt = pal ? 'Blessed Warrior' : 'Druidic Warrior';
        style('fighting-style', 2, opts([`${alt}|${pal ? '祝福戰士' : '德魯伊戰士'}|改學兩個額外戲法。`]));
        if (chosen('fighting-style', alt))
            spell('warrior-cantrips', `${pal ? '祝福戰士' : '德魯伊戰士'} · 額外戲法`, 2, 2, [pal ? 'Cleric' : 'Druid'], 0, 0, { ability: pal ? 'CHA' : 'WIS', always: true, replace: { when: 'level', count: 1 } });
    }
    if (cls === 'Ranger') {
        skill('deft-expertise', '熟練探索者 · 專精', 2, 1, skillOptions, true);
        language('deft-languages', '熟練探索者 · 語言', 2, 2);
        skill('expertise-9', '額外專精', 9, 2, skillOptions, true);
    }
    if (cls === 'Rogue') {
        skill('expertise-1', '專精', 1, 2, skillOptions, true);
        skill('expertise-6', '額外專精', 6, 2, skillOptions, true);
        language('cant-language', '黑話之外的語言', 1, 1);
    }
    if (cls === 'Sorcerer')
        simple('metamagic', '超魔', 2, 2 + Number(lv >= 10) * 2 + Number(lv >= 17) * 2, METAMAGIC, { replace: { when: 'level', count: 1 } });
    if (cls === 'Wizard')
        skill('scholar', '學者 · 專精', 2, 1, skillOptions.filter(s => ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Religion'].includes(s.id)), true);
    const origin = (id: string, title: string, level: number) => simple(id, title, level, 1, ORIGINS, { family: 'origin' });
    if (c.speciesEn === 'Human')
        origin('human-origin', '人類 · 額外起源專長', 1);
    // 背景專長已有名稱，但過去沒有其內部選擇。僅辨識內建專長，不猜自創內容。
    const bg = c.features.find(f => !f.isCustom && f.source.startsWith('背景：'));
    const bgOrigin = bg ? originId(bg.name, bg.nameEn) : '';
    if (bgOrigin)
        selected = { ...selected, 'background-origin': [bgOrigin] };
    for (const f of c.features)
        if (!f.isCustom && !f.progressionSource && f.source.startsWith('專長') && originId(f.name, f.nameEn))
            selected = { ...selected, [featOriginKey(f.source, f.nameEn)]: [originId(f.name, f.nameEn)] };
    if (cls === 'Warlock') {
        const invCount = lv >= 18 ? 10 : lv >= 15 ? 9 : lv >= 12 ? 8 : lv >= 9 ? 7 : lv >= 7 ? 6 : lv >= 5 ? 5 : lv >= 2 ? 3 : 1;
        const eligibleCantrips = catalog.spells.filter(s => s.level === 0 && ((s.classes.includes('Warlock') && (values('cantrips').includes(s.id) || (!selected.cantrips && c.cantrips.some(x => !x.homebrewId && !x.progressionSource && x.nameEn === s.eng_name)))) || values('tome-cantrips').includes(s.id)));
        const repeating: Option[] = [];
        for (const s of eligibleCantrips) {
            if (!s.damage_inflict.length)
                continue;
            repeating.push({ id: `Agonizing Blast:${s.id}`, name: `苦痛魔爆 · ${s.name}`, level: 2, detail: '此戲法的傷害擲骰加魅力修正。' });
            const distance = (s.range.distance ?? {}) as {
                amount?: number;
            };
            if ((distance.amount ?? 0) >= 10)
                repeating.push({ id: `Eldritch Spear:${s.id}`, name: `祕法長矛 · ${s.name}`, level: 2, detail: '射程增加邪術師等級 ×30 呎。' });
            // SRD 邪術師可選的攻擊擲骰戲法固定清單，不能把豁免戲法算成攻擊。
            if (['Eldritch Blast', 'Chill Touch', 'Poison Spray', 'Fire Bolt', 'Ray of Frost', 'Shocking Grasp', 'Starry Wisp', 'Thorn Whip', 'True Strike'].includes(s.eng_name ?? ''))
                repeating.push({ id: `Repelling Blast:${s.id}`, name: `斥退魔爆 · ${s.name}`, level: 2, detail: '命中大型或更小目標可推離 10 呎。' });
        }
        for (const f of ORIGINS)
            repeating.push({ id: `Lessons of the First Ones:${f.id}`, name: `先人教誨 · ${f.name}`, level: 2, detail: f.detail });
        simple('invocations', '祕法祈喚', 1, invCount, [...INVOCATIONS, ...repeating].filter(o => (o.level ?? 1) <= lv), { replace: { when: 'level', count: 1 } });
        for (const v of values('invocations'))
            if (v.startsWith('Lessons of the First Ones:'))
                selected = { ...selected, [`invocation-origin-${v.split(':')[1]}`]: [v.split(':')[1]] };
        for (const [l, ring] of [[11, 6], [13, 7], [15, 8], [17, 9]])
            spell(`arcanum-${ring}`, `祕法奧秘 · ${ring} 環`, l, 1, ['Warlock'], ring, ring, { always: true, ability: 'CHA', recovery: 'long', replace: { when: 'level', count: 1, budget: 'arcanum' } });
        if (chosen('invocations', 'Pact of the Tome')) {
            spell('tome-cantrips', '魔書 · 戲法', 1, 3, [], 0, 0, { always: true, ability: 'CHA', replace: { when: 'short', count: 99 } });
            spell('tome-rituals', '魔書 · 儀式', 1, 2, [], 1, 1, { always: true, ability: 'CHA', replace: { when: 'short', count: 99 } }, s => s.ritual);
        }
    }
    if (hasSrdSubclass(c)) {
        if (cls === 'Bard') {
            skill('lore-skills', '學識學院 · 額外技能', 3, 3);
            spell('lore-spells', '魔法發現', 6, 2, ['Cleric', 'Druid', 'Wizard'], 0, maxRing, { always: true, replace: { when: 'level', count: 1 } });
        }
        if (cls === 'Druid')
            simple('land', '大地結社 · 地形', 3, 1, opts(['Arid|乾旱', 'Polar|極地', 'Temperate|溫帶', 'Tropical|熱帶']), { replace: { when: 'long', count: 1 } });
        if (cls === 'Fighter')
            style('champion-style', 7);
        if (cls === 'Ranger') {
            simple('hunters-prey', '獵物', 3, 1, opts(['Colossus Slayer|巨像屠夫|每回合一次對受傷目標加 1d8 武器傷害。', 'Horde Breaker|破陣者|每回合一次可額外攻擊原目標 5 呎內另一個合資格目標。']), { replace: { when: 'short', count: 1 } });
            simple('defensive-tactics', '防禦戰術', 7, 1, opts(['Escape the Horde|逃離敵群|對你的機會攻擊有劣勢。', 'Multiattack Defense|多重攻擊防禦|命中你的敵人，該回合後續攻擊有劣勢。']), { replace: { when: 'short', count: 1 } });
        }
        if (cls === 'Sorcerer')
            simple('elemental-affinity', '龍族 · 元素親和', 6, 1, DAMAGE.slice(0, 5));
        if (cls === 'Warlock')
            simple('fiendish-resilience', '邪魔韌性 · 抗性', 10, 1, DAMAGE, { replace: { when: 'short', count: 1 } });
        if (cls === 'Wizard') {
            spell('evocation-3', '塑能學者 · 初始法術書', 3, 2, ['Wizard'], 1, 2, { kind: 'book', family: 'book' }, s => s.school === 'V' || s.school === 'Evocation' || s.school_name === '塑能');
            for (const l of [5, 7, 9, 11, 13, 15, 17])
                spell(`evocation-${l}`, `塑能學者 · ${l} 級法術書`, l, 1, ['Wizard'], 1, maxSpellRingFor(CLASS_PROGRESSION[cls], l), { kind: 'book', family: 'book' }, s => s.school === 'V' || s.school === 'Evocation' || s.school_name === '塑能');
        }
    }
    // 起源專長的額外選擇由來源鍵分隔，Skilled 可重複，Magic Initiate 需不同清單。
    for (const [source, arr] of Object.entries(selected)) {
        if (!groups.some(g => g.id === source && g.family === 'origin') && source !== 'background-origin' && !source.startsWith('invocation-origin-') && !source.startsWith('feat-origin-'))
            continue;
        if (arr.includes('Skilled'))
            simple(`${source}/skills`, '熟練 · 三項技能或工具', 1, 3, [...skillOptions.map(o => ({ ...o, id: `skill:${o.id}` })), ...TOOLS.map(o => ({ ...o, id: `tool:${o.id}` }))], { kind: 'mixed', family: 'mixed' });
        if (arr.includes('Magic Initiate')) {
            const inferred = source === 'background-origin' ? fixedBackgroundList(c) : '';
            const prefix=source==='background-origin'?'背景':source==='human-origin'?'人類額外專長':source.replace(/^feat-origin-/, '');
            simple(`${source}/list`, `${prefix} · 法術新手 · 法術清單`, 1, 1, opts(['Cleric|牧師', 'Druid|德魯伊', 'Wizard|法師']).filter(o => !inferred || o.id === inferred));
            const list = values(`${source}/list`)[0] || inferred;
            const listGroup=groups.find(g=>g.id===`${source}/list`)!;
            listGroup.detail='再次取得法術新手時，必須選不同的職業法術清單。';
            // 固定背景清單優先；舊人類來源若撞名，應改人類來源而不是把唯一背景選項鎖死。
            if(!inferred) for(const o of listGroup.options) if(magicInitiateSources(c,selected).some(other=>other!==source&&values(`${other}/list`).includes(o.id))) o.disabledReason='其他法術新手來源已使用此清單';
            simple(`${source}/ability`, `${prefix} · 法術新手 · 施法屬性`, 1, 1, opts(['INT|智力', 'WIS|感知', 'CHA|魅力']));
            if (list) {
                const ability = values(`${source}/ability`)[0];
                spell(`${source}/cantrips`, `${prefix} · 法術新手 · 戲法`, 1, 2, [list], 0, 0, { always: true, ability, replace: { when: 'level', count: 1, budget: source } });
                spell(`${source}/spell`, `${prefix} · 法術新手 · 一環法術`, 1, 1, [list], 1, 1, { always: true, ability, recovery: 'long', replace: { when: 'level', count: 1, budget: source } });
            }
        }
    }
    if (cls === 'Wizard') {
        const ids = bookIds();
        const isBook = (s: CatalogSpell) => ids.has(s.id);
        spell('spell-mastery-1', '法術精通 · 一環動作法術', 18, 1, ['Wizard'], 1, 1, { always: true, unlimited: true, replace: { when: 'long', count: 1, budget: 'spell-mastery' } }, s => isBook(s) && castKindOf(s.casting_time) === 'action');
        spell('spell-mastery-2', '法術精通 · 二環動作法術', 18, 1, ['Wizard'], 2, 2, { always: true, unlimited: true, replace: { when: 'long', count: 1, budget: 'spell-mastery' } }, s => isBook(s) && castKindOf(s.casting_time) === 'action');
        spell('signature', '招牌法術 · 三環', 20, 2, ['Wizard'], 3, 3, { always: true, recovery: 'short' }, isBook);
        const g = groups.find(g => g.id === 'prepared');
        if (g)
            g.options = g.options.filter(o => ids.has(o.id));
    }
    // 所有戲法來源雙向檢查：職業、職責、專長與子職皆不能用新名額重複學習。
    for(const g of groups.filter(g=>g.kind==='spell')) for(const o of g.options){
        const spell=catalog.spells.find(s=>s.id===o.id);
        if(spell?.level!==0)continue;
        const other=groups.some(x=>x.kind==='spell'&&x.id!==g.id&&values(x.id).includes(o.id));
        const known=c.cantrips.some(x=>!x.homebrewId&&x.progressionSource!==g.id&&(!!x.progressionSource||g.id!=='cantrips')&&sameSpellName(x.nameEn,spell.eng_name??''));
        const priorOwners=groups.filter(x=>x.kind==='spell'&&c.progression?.selections[x.id]?.includes(o.id));
        const duplicateLegacy=priorOwners.length>1&&priorOwners[priorOwners.length-1].id!==g.id;
        if(duplicateLegacy||((other||known)&&!c.progression?.selections[g.id]?.includes(o.id)))o.disabledReason='角色已由其他來源學會此戲法，請選另一個';
    }
    // 內容範圍內已無新戲法時，讓玩家明確保留舊來源，不假造第八個法術。
    for(const g of groups.filter(g=>g.kind==='spell')){
        const old=c.progression?.selections[g.id]??[];
        const duplicates=g.options.filter(o=>old.includes(o.id)&&o.disabledReason==='角色已由其他來源學會此戲法，請選另一個');
        const alternatives=g.options.filter(o=>!o.disabledReason&&!values(g.id).includes(o.id));
        if(duplicates.length&&!alternatives.length){
            g.legacyDuplicateIds=duplicates.map(o=>o.id);
            g.detail=[g.detail,'目前清單沒有可補選的不同戲法。可保留既有重複選擇並繼續保存；不同戲法總數不會因此增加，日後仍可依替換規則調整來源。'].filter(Boolean).join(' ');
            for(const o of duplicates)if(values(`keep-duplicate:${g.id}`).includes(o.id))delete o.disabledReason;
        }
    }
    const discoveries = groups.find(g => g.id === 'lore-spells');
    if (discoveries) for (const o of discoveries.options) {
        const name = catalog.spells.find(s => s.id === o.id)?.eng_name ?? '';
        const other = groups.some(g => g.kind === 'spell' && g.id !== discoveries.id && values(g.id).includes(o.id));
        const known = [...c.cantrips, ...c.spells].some(s => !s.homebrewId && s.progressionSource !== discoveries.id && sameSpellName(s.nameEn, name));
        if ((other || known) && !c.progression?.selections[discoveries.id]?.includes(o.id)) o.disabledReason = '已由其他來源學會此法術，請選另一個';
    }
    const alwaysIds = new Set(groups.filter(g => g.kind === 'spell' && g.always).flatMap(g => values(g.id)));
    const automatic = automaticSpellNames(c, selected);
    const basePrepared = groups.find(g => g.id === 'prepared');
    if (basePrepared && (automatic.length || [...alwaysIds].some(id=>catalog.spells.some(s=>s.id===id&&s.level>0)))) {
        basePrepared.minCount=cls==='Ranger'?basePrepared.count:0;
        basePrepared.detail=cls==='Ranger'?'獵人印記始終準備、不占名額；請另外選滿職業已備法術。':'始終準備法術另列、不占一般名額；空出的名額可稍後補選。';
    }
    if (basePrepared)
        basePrepared.options = basePrepared.options.filter(o => !alwaysIds.has(o.id) && !automatic.some(n => sameSpellName(n, catalog.spells.find(s => s.id === o.id)?.eng_name ?? '')));
    for (const g of groups.filter(g => g.id === 'tome-cantrips' || g.id === 'tome-rituals')) {
        const other = new Set(groups.filter(x => x.kind === 'spell' && x.id !== g.id && !x.id.startsWith('tome-')).flatMap(x => values(x.id)));
        g.options = g.options.filter(o => !other.has(o.id) && ![...c.cantrips, ...c.spells].some(s => !s.progressionSource && !s.homebrewId && sameSpellName(s.nameEn, catalog.spells.find(x => x.id === o.id)?.eng_name ?? '')));
    }
    for (const g of groups.filter(g => g.kind === 'book'))
        for (const o of g.options) {
            const elsewhere=groups.some(other=>other.kind==='book'&&other.id!==g.id&&values(other.id).includes(o.id));
            const recorded=(c.spellbook??[]).some(s=>s.progressionSource && s.progressionSource!==g.id && sameSpellName(s.nameEn,catalog.spells.find(x=>x.id===o.id)?.eng_name??''));
            if(elsewhere||recorded) o.disabledReason='已由其他來源加入法術書';
            if (!c.progression?.selections[g.id]?.includes(o.id) && (c.spellbook ?? []).some(s => !s.progressionSource && sameSpellName(s.nameEn, catalog.spells.find(x => x.id === o.id)?.eng_name ?? '')))
                o.detail = `${o.detail ?? ''} · 已在法術書（補登時可歸入此來源）`;
        }
    const pendingSkills = groups.flatMap(g => g.kind === 'skill' ? values(g.id) : g.kind === 'mixed' ? values(g.id).filter(v => v.startsWith('skill:')).map(v => v.slice(6)) : []);
    for (const g of groups)
        for (const o of g.options) {
            if (g.family === 'origin' && bgOrigin === o.id && !['Skilled', 'Magic Initiate'].includes(o.id))
                o.disabledReason = '背景已取得，請選另一個專長';
            if (g.kind === 'skill') {
                const own = c.progression?.selections[g.id]?.includes(o.id);
                const existing = c.skills.some(s => s.nameEn === o.id && s.proficient && !c.progression?.grantedSkills.includes(o.id));
                const other = groups.some(x => x.id !== g.id && (x.kind === 'skill' && values(x.id).includes(o.id) || x.kind === 'mixed' && values(x.id).includes(`skill:${o.id}`)));
                if (other || (existing && !own)) o.disabledReason = '此技能已熟練，請選另一項';
            }
            if (g.kind === 'mixed' && !values(g.id).includes(o.id)) {
                const skillName = o.id.startsWith('skill:') ? o.id.slice(6) : '';
                if (skillName && (c.skills.some(s => s.nameEn === skillName && s.proficient && !c.progression?.grantedSkills.includes(skillName)) || groups.some(other => other.id !== g.id && (other.kind === 'skill' && values(other.id).includes(skillName) || other.kind === 'mixed' && values(other.id).includes(o.id)))))
                    o.disabledReason = '此技能已熟練，請選另一項';
            }
            if(g.kind==='language'){
                const own=c.progression?.selections[g.id]?.includes(o.id);
                const other=groups.some(x=>x.kind==='language'&&x.id!==g.id&&values(x.id).includes(o.id));
                const known=o.id==='Common'||c.languages.some(v=>v===o.name||v===o.id);
                if(other||(!own&&known))o.disabledReason='已學會此語言，請選另一種';
            }
            if (g.kind === 'expertise') {
                const other = groups.some(x=>x.kind==='expertise'&&x.id!==g.id&&values(x.id).includes(o.id));
                const own = c.progression?.selections[g.id]?.includes(o.id);
                if(other || (!own && c.skills.some(s=>s.nameEn===o.id&&s.expertise))) o.disabledReason='此技能已專精，請選另一項';
            }
            if (g.kind === 'expertise' && !c.skills.some(s => s.nameEn === o.id && s.proficient) && !pendingSkills.includes(o.id))
                o.disabledReason = '需要先取得此技能熟練';
            if (o.requires && !values(g.id).includes(o.requires))
                o.disabledReason = `需要先選 ${o.requires}`;
        }
    if (cls === 'Bard' && basePrepared) {
        basePrepared.detail = [basePrepared.detail, lv >= 10 ? '魔法奧祕 · 10 級已解鎖：新增／替換的已備法術可選詩人、牧師、德魯伊、法師清單，共用原本已備名額，並非額外法術。每次升級仍只能替換 1 個舊法術。' : '魔法奧祕於 10 級解鎖跨職業清單，目前只能選詩人法術。'].filter(Boolean).join(' ');
        if (lv >= 10) for (const o of basePrepared.options) {
            const spell = catalog.spells.find(s => s.id === o.id);
            const names: Record<string,string> = {Bard:'詩人',Cleric:'牧師',Druid:'德魯伊',Wizard:'法師'};
            o.detail = `${o.detail} · ${spell?.classes.filter(k=>names[k]).map(k=>names[k]).join('／')}`;
        }
    }
    return groups;
}
