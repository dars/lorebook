import {backfillWarlock} from '../warlock';
import {backfillSorcerer} from '../sorcerer';
import {backfillRanger} from '../ranger';
import {backfillRogue} from '../rogue';
import {backfillMonk} from '../monk';
import {backfillDruid} from '../druid';
import { backfillCleric } from '../cleric';
import { backfillBard } from '../bard';
import { backfillBarbarian } from '../barbarian';
import { abilityModifier } from '../ability';
import { featAbilityOptions } from '../feats';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { applyStartingEquipment, startingEquipmentIssue } from './equipment';
import type { Character, CharacterFeature, Spell, ClassResource } from '@/lib/domain/character';
import { spellFromCatalog } from '@/lib/creation/spell-from-catalog';
import { choiceGroups, type ChoiceCatalog, type ChoiceGroup, type Selections } from './groups';
import { LANGUAGES, TOOLS, originId, featOriginKey } from './options';
import { automaticSpellNames, sameSpellName, normalizePreparedSelections } from './granted-spells';
export type ChoiceContext = 'level' | 'backfill' | 'rest' | 'creation';
export type ChoiceIssue = {
    group: string;
    message: string;
};
const has = (s: Selections, id: string, v: string) => s[id]?.includes(v) ?? false;
const same = (a: string[], b: string[]) => a.length === b.length && a.every(v => b.includes(v));
const removed = (a: string[], b: string[]) => a.filter(v => !b.includes(v)).length;
const baseline = (c: Character) => c.progression?.selections ?? {};
export function replacementLimit(c: Character, g: ChoiceGroup, context: ChoiceContext): number {
    const r = g.replace;
    if (!r)
        return 0;
    if (context === 'level' && r.when === 'level')
        return r.count;
    if (context !== 'rest' || !c.progression?.rest)
        return 0;
    if (r.when === 'long' && c.progression.rest !== 'long') {
        // 記憶法術：法師 5 級後短休可換一個已備法術。
        return g.id === 'prepared' && c.classNameEn === 'Wizard' && c.level >= 5 ? Math.max(0, 1 - (c.progression.restSpent.prepared ?? 0)) : 0;
    }
    if (r.when === 'level')
        return 0;
    return Math.max(0, r.count - (c.progression.restSpent[r.budget ?? g.id] ?? 0));
}
/** 選擇以整份結果驗證，祈喚與來源子選項不能只驗證點下去的那一格。 */
export function validateChoices(c: Character, selections: Selections, catalog: ChoiceCatalog, context: ChoiceContext, requireComplete = true): ChoiceIssue[] {
    selections = normalizePreparedSelections(c, selections, catalog.spells);
    const groups = choiceGroups(c, catalog, selections), issues: ChoiceIssue[] = [];
    const equipmentIssue = startingEquipmentIssue(c, selections, catalog.items);
    if (equipmentIssue)
        issues.push({ group: 'equipment', message: equipmentIssue });
    // 延後只適用於舊選項；本級專長新授予的技能／法術仍須選完。
    const requiredSources = catalog.handledFeatLevel === undefined ? [] : c.features.filter(f => f.source === `專長：Lv${catalog.handledFeatLevel}` && !f.isCustom).map(f => featOriginKey(f.source, f.nameEn));
    const old = baseline(c), budgets: Record<string, number> = {};
    const issue = (g: ChoiceGroup, message: string) => issues.push({ group: g.id, message });
    const pickedSkills = groups.flatMap(g => g.kind === 'skill' ? (selections[g.id] ?? []) : g.kind === 'mixed' ? (selections[g.id] ?? []).filter(v => v.startsWith('skill:')).map(v => v.slice(6)) : []);
    const ownSkills = new Set(c.progression?.grantedSkills ?? []);
    const proficient = new Set([...c.skills.filter(s => s.proficient && !ownSkills.has(s.nameEn)).map(s => s.nameEn), ...pickedSkills]);
    const seen = new Map<string, string>();
    const grantSeen = new Set<string>();
    const shapeNames = new Set<string>();
    for (const g of groups) {
        const v = selections[g.id] ?? [], before = old[g.id] ?? [];
        if (!requireComplete && !v.length && !requiredSources.some(source => g.id.startsWith(`${source}/`)))
            continue;
        if (v.length < (g.minCount??g.count) || v.length > g.count)
            issue(g, `需選 ${g.count} 項，目前 ${v.length} 項。`);
        if (new Set(v).size !== v.length)
            issue(g, '同一項不能重複選取。');
        if (before.length && !same(before, v)) {
            const extra = groups.filter(x => x.kind === 'spell' && x.always).flatMap(x => selections[x.id] ?? []);
            const auto = automaticSpellNames(c, selections);
            const replacedBefore = g.id === 'prepared' ? before.filter(id => !extra.includes(id) && !auto.some(n => sameSpellName(n, catalog.spells.find(s => s.id === id)?.eng_name ?? ''))) : before;
            const validBefore = g.kind==='form'?replacedBefore:replacedBefore.filter(id=>{const o=g.options.find(o=>o.id===id);return o&&!o.disabledReason;});
            const dropped = g.kind==='form'?validBefore.filter(old=>!v.some(next=>{try{return JSON.parse(old).name===JSON.parse(next).name;}catch{return false;}})).length:removed(validBefore, v), limit = replacementLimit(c, g, context);
            const repairingOrigin=g.id.endsWith('/list')&&before.some(id=>g.options.find(o=>o.id===id)?.disabledReason);
            if (dropped > limit && !repairingOrigin)
                issue(g, limit ? `本次最多替換 ${limit} 項。` : '這項選擇目前不能替換。');
            if (g.replace?.budget && dropped) {
                const budget = g.replace.budget ?? g.id;
                budgets[budget] = (budgets[budget] ?? 0) + dropped;
                if (budgets[budget] > limit)
                    issue(g, `同來源合計只能替換 ${limit} 項。`);
            }
        }
        for (const id of v) {
            if (g.kind === 'form') {
                try {
                    const f = JSON.parse(id);
                    if (typeof f.name !== 'string' || !f.name.trim() || f.name.length > 100 || typeof f.cr !== 'number' || f.cr < 0 || f.cr > (c.level >= 8 ? 1 : c.level >= 4 ? .5 : .25) || typeof f.fly !== 'boolean' || (f.fly && c.level < 8) || shapeNames.has(f.name.trim().toLowerCase()))
                        throw Error();
                    shapeNames.add(f.name.trim().toLowerCase());
                }
                catch {
                    issue(g, '形態必須填寫名稱，且 CR 與飛行條件符合目前等級。');
                }
                continue;
            }
            const option = g.options.find(o => o.id === id);
            if (!option) {
                issue(g, '所選項目不在目前合資格清單中。');
                continue;
            }
            if (option.disabledReason) issue(g, `${option.name}：${option.disabledReason}`);
            if (g.kind === 'book' && context !== 'backfill' && !before.includes(id) && (c.spellbook ?? []).some(s => !s.progressionSource && sameSpellName(s.nameEn, catalog.spells.find(x => x.id === id)?.eng_name ?? '')))
                issue(g, '法術書已經有這個法術，免費抄錄請選新的法術。');
            if (option.requires && !has(selections, g.id, option.requires))
                issue(g, `${option.name} 需要 ${option.requires}，不能移除其前置祈喚。`);
            if (g.kind === 'expertise' && !before.includes(id) && c.skills.some(s => s.nameEn === id && s.expertise))
                issue(g, '此技能已經專精，請選另一項。');
            if (g.kind === 'expertise' && !proficient.has(id))
                issue(g, `${option.name} 尚未熟練，不能取得專精。`);
            if (g.kind === 'skill' && context !== 'backfill' && c.skills.some(s => s.nameEn === id && s.proficient && !ownSkills.has(id)) && !before.includes(id))
                issue(g, `${option.name} 已由其他來源熟練，請選另一項。`);
            const grant = g.kind === 'mixed' ? id : ['skill', 'tool', 'language'].includes(g.kind) ? `${g.kind}:${id}` : null;
            if (grant) {
                if (grantSeen.has(grant))
                    issue(g, '同一項熟練不能由多個選擇重複取得。');
                grantSeen.add(grant);
                if (g.kind === 'mixed' && id.startsWith('skill:') && context !== 'backfill' && !before.includes(id) && c.skills.some(s => s.nameEn === id.slice(6) && s.proficient && !ownSkills.has(s.nameEn)))
                    issue(g, '這項技能已熟練，請選另一項技能或工具。');
                if (g.kind === 'tool' && context !== 'backfill' && !before.includes(id) && c.toolProficiencies.includes(option.name) && !c.progression?.grantedTools.includes(option.name))
                    issue(g, '這項工具已熟練，請選另一項。');
                if (g.kind === 'language' && context !== 'backfill' && !before.includes(id) && c.languages.includes(option.name) && !c.progression?.grantedLanguages.includes(option.name))
                    issue(g, '已經會此語言，請選另一種。');
            }
            if (g.family && !(g.family === 'origin' && ['Skilled', 'Magic Initiate'].includes(id))) {
                const key = `${g.family}/${id}`;
                if (seen.has(key))
                    issue(g, `${option.name} 已在另一個來源選過。`);
                else
                    seen.set(key, g.id);
            }
        }
    }
    const scores = Object.fromEntries(Object.entries(c.abilityScores).map(([k, v]) => [k, v.score]));
    for (const g of groups.filter(g => /^feat-\d+\/ability$/.test(g.id))) {
        if (old[g.id]?.length)
            continue;
        const id = selections[g.id]?.[0];
        if (!id)
            continue;
        const feat = catalog.feats?.find(f => f.id === selections[g.id.split('/')[0]]?.[0]);
        const cap = feat ? featAbilityOptions(feat)?.cap ?? 20 : 20;
        for (const part of id.split(',')) {
            const [code, n] = part.split(':');
            const key = code === 'INT' ? 'int_' : code.toLowerCase();
            scores[key] += Number(n);
            if (scores[key] > cap)
                issue(g, `多筆能力值提升合計超過 ${cap}，請重新分配。`);
        }
    }
    // 非重複起源專長不能與背景或其他來源重複；法術新手以不同清單重複。
    const origins = groups.filter(g => g.family === 'origin').flatMap(g => (selections[g.id] ?? []).map(id => ({ id, source: g.id })));
    const lessons = (selections.invocations ?? []).filter(x => x.startsWith('Lessons of the First Ones:')).map(x => ({ id: x.split(':')[1], source: `invocation-origin-${x.split(':')[1]}` }));
    const bg = c.features.find(f => !f.isCustom && f.source.startsWith('背景：'));
    const bgId = bg ? originId(bg.name, bg.nameEn) : '';
    const featOrigins = c.features.filter(f => !f.isCustom && !f.progressionSource && f.source.startsWith('專長') && originId(f.name, f.nameEn)).map(f => ({ id: originId(f.name, f.nameEn), source: featOriginKey(f.source, f.nameEn) }));
    const backfillOrigins = groups.filter(g => /^feat-\d+$/.test(g.id)).flatMap(g => { const f = catalog.feats?.find(f => f.id === selections[g.id]?.[0] && f.data.category === 'O'); return f ? [{ id: f.eng_name ?? '', source: `feat-origin-${g.id}` }] : []; });
    const allOrigins = [...(bgId ? [{ id: bgId, source: 'background-origin' }] : []), ...origins, ...lessons, ...featOrigins, ...backfillOrigins];
    const originSeen = new Set<string>();
    for (const o of allOrigins) {
        if (o.id === 'Skilled')
            continue;
        if(o.id==='Magic Initiate'&&!selections[`${o.source}/list`]?.length) continue;
        const key = o.id === 'Magic Initiate' ? `${o.id}:${selections[`${o.source}/list`]?.[0]}` : o.id;
        if (originSeen.has(key))
            issues.push({ group: o.source, message: '已取得相同專長；法術新手必須選不同職業清單。' });
        originSeen.add(key);
    }
    // 解除父項時可以移除其子項，但不可刪掉無關的已選選項。
    for (const key of Object.keys(old))
        if (groups.some(g => g.id === key) && !(key==='prepared' && old[key].every(id=>!choiceGroups(c,catalog,selections).find(g=>g.id==='prepared')?.options.some(o=>o.id===id))) && !selections[key]?.length && old[key].length)
            issues.push({ group: key, message: '不能清除已完成的選擇。' });
    return issues;
}
export function applyChoices(c: Character, selections: Selections, catalog: ChoiceCatalog, context: ChoiceContext, requireComplete = true): Character {
    selections = normalizePreparedSelections(c, selections, catalog.spells);
    const issues = validateChoices(c, selections, catalog, context, requireComplete);
    if (issues.length)
        throw new Error(issues.map(i => i.message).join(' '));
    const groups = choiceGroups(c, catalog, selections);
    const active = Object.fromEntries(groups.filter(g => selections[g.id] && selections[g.id].length >= (g.minCount??g.count) && selections[g.id].length <= g.count).map(g => [g.id, selections[g.id]]));
    for(const g of groups)if(g.legacyDuplicateIds){
        const kept=(selections[`keep-duplicate:${g.id}`]??[]).filter(id=>g.legacyDuplicateIds!.includes(id)&&(active[g.id]??[]).includes(id));
        if(kept.length)active[`keep-duplicate:${g.id}`]=kept;
    }
    const features: CharacterFeature[] = c.features.filter(f => !f.progressionSource);
    const oldResources = c.resources.filter(r => r.progressionSource);
    const resources: ClassResource[] = c.resources.filter(r => !r.progressionSource);
    const generatedSpells: Spell[] = [], book: Spell[] = [];
    const skills = new Set<string>(), tools = new Set<string>(), languages = new Set<string>(), expertise = new Set<string>();
    const oldSpell = (name: string) => [...c.spells, ...c.cantrips, ...(c.spellbook ?? [])].find(s => !s.homebrewId && (s.nameEn || s.name) === name);
    for (const g of groups) {
        const ids = active[g.id];
        if (!ids)
            continue;
        for (const id of ids) {
            const o = g.options.find(o => o.id === id);
            if (g.kind === 'skill')
                skills.add(id);
            if (g.kind === 'expertise')
                expertise.add(id);
            if (g.kind === 'tool')
                tools.add(id);
            if (g.kind === 'language')
                languages.add(id);
            if (g.kind === 'mixed') {
                if (id.startsWith('skill:'))
                    skills.add(id.slice(6));
                else
                    tools.add(id.slice(5));
            }
            if (g.kind === 'spell' || g.kind === 'book') {
                const s = catalog.spells.find(s => s.id === id)!;
                const name = s.eng_name || s.name;
                const snapshot = { ...(oldSpell(name) ?? spellFromCatalog(s)), progressionSource: g.id, spellAbility: g.ability, alwaysPrepared: g.always, castingSources: g.kind === 'book' ? undefined : [{ source: g.id, title: g.title, ability: g.ability, free: g.unlimited ? 'atWill' as const : g.recovery }], prepared: g.kind !== 'book' };
                if (g.kind === 'book')
                    book.push(snapshot);
                else
                    generatedSpells.push(snapshot);
                if (g.recovery) {
                    const key = `${g.id}/${id}`, old = oldResources.find(r => r.progressionSource === key);
                    resources.push({ name: `${s.name} · 免費施放`, nameEn: '', max: 1, current: old?.current ?? 1, recovery: g.recovery, display: 'pips', dieFaces: 0, unit: '', progressionSource: key });
                }
            }
            else if ((g.kind === 'feature' || g.kind === 'form') && !['equipment', 'equipment-instrument', 'holy-symbol'].includes(g.id) && !g.id.endsWith('/ability') && !g.id.endsWith('/list') && id !== 'already') {
                const label = g.id === 'mastery' ? `武器精通 · ${o?.name ?? id}` : g.kind === 'form' ? `${JSON.parse(id).name} · CR ${JSON.parse(id).cr}${JSON.parse(id).fly ? ' · 飛行' : ''}` : o?.name ?? id;
                const isSub = ['land', 'champion-style', 'hunters-prey', 'defensive-tactics', 'elemental-affinity', 'fiendish-resilience'].includes(g.id);
                const source = g.family === 'origin' ? `專長：${g.id === 'human-origin' ? '人類' : g.title}` : /^feat-\d+$/.test(g.id) ? `專長：Lv${g.level}` : `${isSub ? '子職' : '職業'}：${isSub ? c.subclass : c.className} Lv${g.level}`;
                features.push({ name: label, nameEn: g.kind === 'form' ? '' : catalog.feats?.find(f => f.id === id)?.eng_name ?? catalog.items.find(i => i.id === id)?.eng_name ?? id, source, description: catalog.feats?.find(f => f.id === id) ? ftFlattenEntries(catalog.feats.find(f => f.id === id)!.data.entries) : o?.detail ?? g.detail ?? '', isCustom: g.kind === 'form', progressionSource: g.id });
            }
        }
    }
    for (const name of automaticSpellNames(c, active)) {
        const s = catalog.spells.find(s => sameSpellName(s.eng_name ?? '', name));
        if (!s)
            continue;
        generatedSpells.push({ ...spellFromCatalog(s), progressionSource: 'automatic', spellAbility: c.spellcastingAbility, alwaysPrepared: true });
    }
    if (c.classNameEn === 'Rogue')
        languages.add('Thieves’ Cant');
    if (c.classNameEn === 'Druid')
        languages.add('Druidic');
    const restSpent = { ...(c.progression?.restSpent ?? {}) };
    if (context === 'rest')
        for (const g of groups) {
            const before = normalizePreparedSelections(c, {...baseline(c), ...Object.fromEntries(Object.entries(active).filter(([key])=>key!=='prepared'))}, catalog.spells);
            const n = g.kind==='form'?(baseline(c)[g.id]??[]).filter(old=>!(active[g.id]??[]).some(next=>JSON.parse(old).name===JSON.parse(next).name)).length:removed((g.id==='prepared'?before[g.id]:baseline(c)[g.id]) ?? [], active[g.id] ?? []);
            if (n && g.replace) {
                const key = g.replace.budget ?? g.id;
                restSpent[key] = (restSpent[key] ?? 0) + (g.id==='prepared'&&c.classNameEn==='Wizard'&&c.progression?.rest==='short'?n:g.replace.count >= 99 ? 99 : n);
            }
        }
    const toolName = (id: string) => TOOLS.find(t => t.id === id)?.name ?? id;
    const langName = (id: string) => LANGUAGES.find(t => t.id === id)?.name ?? id;
    const newTools = [...tools].map(toolName), newLang = [...languages].map(langName);
    const progression = { selections: active, rest: c.progression?.rest, restSpent,
        grantedSkills: [...skills].filter(id => c.progression?.grantedSkills.includes(id) || !c.skills.some(s => s.nameEn === id && s.proficient)),
        grantedTools: newTools.filter(v => c.progression?.grantedTools.includes(v) || !c.toolProficiencies.includes(v)),
        grantedLanguages: newLang.filter(v => c.progression?.grantedLanguages.includes(v) || !c.languages.includes(v)) };
    const retain = (list: Spell[]) => (s: Spell) => !s.progressionSource && (!!s.homebrewId || !list.some(v => (v.nameEn || v.name) === (s.nameEn || s.name)));
    // 明確選入名額的舊法術採用既有快照；其餘手動／自創法術原樣保留。
    const dedupe = (arr: Spell[]) => { const result: Spell[] = []; for (const spell of arr) {
        const existing = result.find(x => (x.nameEn || x.name) === (spell.nameEn || spell.name) && x.homebrewId === spell.homebrewId);
        if (existing) {
            existing.alwaysPrepared ||= spell.alwaysPrepared;
            existing.prepared ||= spell.prepared;
            if (spell.castingSources)
                existing.castingSources = [...(existing.castingSources ?? []), ...spell.castingSources.filter(v => !existing.castingSources?.some(x => x.source === v.source))];
        }
        else
            result.push({ ...spell });
    } return result; };
    const equipped = applyStartingEquipment(c, active, catalog.items, context === 'creation');
    const result: Character = { ...equipped, progression, features, resources,
        skills: c.skills.map(s => ({ ...s, proficient: skills.has(s.nameEn) || (s.proficient && !c.progression?.grantedSkills.includes(s.nameEn)), expertise: expertise.has(s.nameEn) || (s.expertise === true && !groups.filter(g => g.kind === 'expertise').some(g => baseline(c)[g.id]?.includes(s.nameEn))) })),
        toolProficiencies: [...new Set([...c.toolProficiencies.filter(v => !c.progression?.grantedTools.includes(v)), ...newTools])],
        languages: [...new Set([...c.languages.filter(v => !c.progression?.grantedLanguages.includes(v)), ...newLang])],
        cantrips: dedupe([...c.cantrips.filter(retain(generatedSpells)), ...generatedSpells.filter(s => s.level === 0)]),
        spells: dedupe([...c.spells.filter(retain(generatedSpells)), ...generatedSpells.filter(s => s.level > 0)]),
        spellbook: dedupe([...(c.spellbook ?? []).filter(retain(book)), ...book]),
    };
    // 只有首次補選才套用能力值；保存、重整與其他來源改選不重複加。
    const abilityScores = { ...result.abilityScores };
    for (const [key, ids] of Object.entries(active))
        if (/^feat-\d+\/ability$/.test(key) && !baseline(c)[key]?.length) {
            const parent = key.split('/')[0];
            const feat = catalog.feats?.find(f => f.id === active[parent]?.[0]);
            const cap = feat ? featAbilityOptions(feat)?.cap ?? 20 : 20;
            for (const part of ids[0].split(',')) {
                const [code, n] = part.split(':');
                const k = (code === 'INT' ? 'int_' : code.toLowerCase()) as keyof Character['abilityScores'];
                const score = Math.min(cap, abilityScores[k].score + Number(n));
                abilityScores[k] = { ...abilityScores[k], score, modifier: abilityModifier(score) };
            }
        }
    const hpDelta = (abilityScores.con.modifier - c.abilityScores.con.modifier) * c.level;
    const ability = (c.spellcastingAbility === 'INT' ? 'int_' : c.spellcastingAbility.toLowerCase()) as keyof Character['abilityScores'];
    return backfillWarlock(backfillSorcerer(backfillRanger(backfillRogue(backfillMonk(backfillDruid(backfillCleric(backfillBard(backfillBarbarian(recalculateChoiceSkills({ ...result, abilityScores, maxHp: result.maxHp + hpDelta, currentHp: result.currentHp + hpDelta, spellAttack: abilityScores[ability] ? c.proficiencyBonus + abilityScores[ability].modifier : result.spellAttack, spellDc: abilityScores[ability] ? 8 + c.proficiencyBonus + abilityScores[ability].modifier : result.spellDc }))))))))));
}
/** 集中重算，升級增加 PB／能力值後亦須使用，否則專精會悄悄退回普通熟練。 */
export function recalculateChoiceSkills(c: Character): Character {
    const s = baseline(c), wis = c.abilityScores.wis.modifier;
    const boosted = has(s, 'divine-order', 'Thaumaturge') ? ['Arcana', 'Religion'] : has(s, 'primal-order', 'Magician') ? ['Arcana', 'Nature'] : [];
    const skills = c.skills.map(skill => {
        const key = skill.abilityType === 'INT' ? 'int_' : skill.abilityType.toLowerCase();
        const mod = c.abilityScores[key as keyof Character['abilityScores']]?.modifier ?? 0;
        const prof = skill.proficient ? c.proficiencyBonus * (skill.expertise ? 2 : 1) : c.classNameEn === 'Bard' && c.level >= 2 ? Math.floor(c.proficiencyBonus / 2) : 0;
        return { ...skill, modifier: mod + prof + (boosted.includes(skill.nameEn) ? Math.max(1, wis) : 0) };
    });
    const alert = c.features.some(f => !f.isCustom && originId(f.name, f.nameEn) === 'Alert') || Object.values(s).some(v => v.includes('Alert') || v.includes('Lessons of the First Ones:Alert'));
    return { ...c, skills, passivePerception: 10 + (skills.find(v => v.nameEn === 'Perception' || v.name === '感知')?.modifier ?? wis), initiative: c.abilityScores.dex.modifier + (alert ? c.proficiencyBonus : 0) };
}
export function beginChoiceRest(c: Character, rest: 'short' | 'long'): Character {
    return { ...c, progression: { selections: { ...baseline(c) }, grantedSkills: c.progression?.grantedSkills ?? [], grantedTools: c.progression?.grantedTools ?? [], grantedLanguages: c.progression?.grantedLanguages ?? [], rest, restSpent: {} } };
}
