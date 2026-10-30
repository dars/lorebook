/** SRD 5.2.1 職業能力索引；頁碼為 PDF 印刷頁碼。中文為 Lorebook 摘譯。 */
export type GuideClass = {
  en: string; cn: string; page: number; endPage: number;
  features: Record<number, string>;
  subclass: { name: string; page: number; features: Record<number, string> };
  reminders: string[];
};

export const GUIDE_CLASSES: GuideClass[] = [
  {
    en: 'Barbarian', cn: '野蠻人', page: 28, endPage: 30,
    features: { 1: '狂暴 Rage・無甲防禦 Unarmored Defense', 2: '危險感知 Danger Sense・魯莽攻擊 Reckless Attack', 3: '原初知識 Primal Knowledge', 5: '額外攻擊 Extra Attack・快速移動 Fast Movement', 7: '野性直覺 Feral Instinct・本能猛撲 Instinctive Pounce', 9: '殘暴打擊 Brutal Strike', 11: '不屈狂暴 Relentless Rage', 13: '精通殘暴打擊 Improved Brutal Strike', 15: '持續狂暴 Persistent Rage', 17: '精通殘暴打擊：增強 Improved Brutal Strike (Enhanced)', 18: '不屈之力 Indomitable Might', 20: '原初勇士 Primal Champion' },
    subclass: { name: '狂戰士道途 Path of the Berserker', page: 30, features: { 3: '狂亂 Frenzy', 6: '無心狂暴 Mindless Rage', 10: '報復 Retaliation', 14: '威嚇氣勢 Intimidating Presence' } },
    reminders: ['長休後可替換 1 種精通武器。', '殘暴打擊的效果在命中時選擇，不是升級時永久選定。狂暴中的原初知識也不另外授予技能熟練。'],
  },
  {
    en: 'Bard', cn: '吟遊詩人', page: 31, endPage: 35,
    features: { 1: '吟遊激勵 Bardic Inspiration・施法 Spellcasting', 2: '萬事通 Jack of All Trades', 5: '激勵之源 Font of Inspiration', 7: '反魅惑 Countercharm', 10: '魔法祕密 Magical Secrets', 18: '卓越激勵 Superior Inspiration', 20: '創生真言 Words of Creation' },
    subclass: { name: '學識學院 College of Lore', page: 35, features: { 3: '語出驚人 Cutting Words', 14: '無雙技藝 Peerless Skill' } },
    reminders: ['每升 1 級吟遊詩人，可替換 1 個戲法及 1 個已備法術。', '10 級起，新增或替換已備法術可從吟遊詩人、牧師、德魯伊、法師清單選；不是一次額外取得一組法術。', '學識學院 6 級魔法發現的兩個法術另外計算；之後每升吟遊詩人等級可替換其中 1 個。'],
  },
  {
    en: 'Cleric', cn: '牧師', page: 36, endPage: 40,
    features: { 1: '施法 Spellcasting', 2: '引導神力 Channel Divinity：神聖火花、驅散不死皆取得', 5: '灼燒不死 Sear Undead', 10: '神聖干預 Divine Intervention', 14: '精通祝福打擊 Improved Blessed Strikes', 20: '高等神聖干預 Greater Divine Intervention' },
    subclass: { name: '生命領域 Life Domain', page: 40, features: { 3: '生命門徒 Disciple of Life・維持生命 Preserve Life・領域法術', 5: '新增生命領域法術', 6: '祝福醫者 Blessed Healer', 7: '新增生命領域法術', 9: '新增生命領域法術', 17: '至高治療 Supreme Healing' } },
    reminders: ['每升牧師等級可替換 1 個牧師戲法；長休後可重新準備整份牧師法術清單。', '神聖火花與驅散不死都會獲得；每次使用引導神力才選效果。神聖干預也在使用當下選法術。'],
  },
  {
    en: 'Druid', cn: '德魯伊', page: 41, endPage: 46,
    features: { 1: '施法 Spellcasting・德魯伊語 Druidic', 2: '荒野變身 Wild Shape：2次、最高 CR 1/4・荒野夥伴 Wild Companion', 4: '荒野變身：2次、最高 CR 1/2', 6: '荒野變身：3次', 8: '荒野變身：3次、最高 CR 1，允許飛行', 17: '荒野變身：4次', 5: '荒野復甦 Wild Resurgence', 15: '精通元素之怒 Improved Elemental Fury', 18: '野獸施法 Beast Spells', 20: '大德魯伊 Archdruid' },
    subclass: { name: '大地結社 Circle of the Land', page: 46, features: { 3: '大地之助 Land’s Aid', 5: '新增結社法術', 6: '自然復甦 Natural Recovery', 7: '新增結社法術', 9: '新增結社法術', 10: '自然守護 Nature’s Ward', 14: '自然庇所 Nature’s Sanctuary' } },
    reminders: ['荒野變身：2–5級2次、6–16級3次、17–20級4次；短休恢復1次、長休恢復全部。最高 CR：2級1/4、4級1/2、8級1；8級起可飛行。', '每升德魯伊等級可替換 1 個德魯伊戲法；長休後可重新準備整份法術清單，並替換 1 個已知野獸形態。', '大地結社的地形於每次長休後選擇：乾旱、極地、溫帶、熱帶；結社法術隨地形改變，不是永久子職分支。'],
  },
  {
    en: 'Fighter', cn: '戰士', page: 47, endPage: 49,
    features: { 1: '回氣 Second Wind', 2: '動作如潮 Action Surge・戰術思維 Tactical Mind', 5: '額外攻擊 Extra Attack・戰術移步 Tactical Shift', 9: '不屈 Indomitable・戰術大師 Tactical Master', 11: '額外攻擊：共 3 次 Two Extra Attacks', 13: '不屈：2 次・研究攻擊 Studied Attacks', 17: '動作如潮：2 次・不屈：3 次', 20: '額外攻擊：共 4 次 Three Extra Attacks' },
    subclass: { name: '勇士 Champion', page: 49, features: { 3: '精通重擊 Improved Critical・卓越運動員 Remarkable Athlete', 10: '英雄戰士 Heroic Warrior', 15: '高等重擊 Superior Critical', 18: '倖存者 Survivor' } },
    reminders: ['每升戰士等級可替換 1 個戰鬥風格專長；每次長休後可替換 1 種精通武器。', '戰術大師的推撞、削弱、緩速替代效果在攻擊時選擇，不需升級時永久選定。'],
  },
  {
    en: 'Monk', cn: '武僧', page: 49, endPage: 52,
    features: { 1: '武藝 Martial Arts・無甲防禦 Unarmored Defense', 2: '武僧專注 Monk’s Focus・無甲移動 Unarmored Movement・異常代謝 Uncanny Metabolism', 3: '撥擋攻擊 Deflect Attacks', 4: '緩落 Slow Fall', 5: '額外攻擊 Extra Attack・震懾擊 Stunning Strike', 6: '強化打擊 Empowered Strikes', 7: '反射閃避 Evasion', 9: '特技移動 Acrobatic Movement', 10: '高度專注 Heightened Focus・自我恢復 Self-Restoration', 13: '撥擋能量 Deflect Energy', 14: '自律倖存者 Disciplined Survivor', 15: '完美專注 Perfect Focus', 18: '卓越防禦 Superior Defense', 20: '身心合一 Body and Mind' },
    subclass: { name: '散打武者 Warrior of the Open Hand', page: 52, features: { 3: '散打技巧 Open Hand Technique', 6: '混元體 Wholeness of Body', 11: '迅捷步伐 Fleet Step', 17: '滲透勁 Quivering Palm' } },
    reminders: ['2 級的連擊、耐心防禦、疾風步都能使用；這些不是永久三選一。', '散打技巧的附加效果、強化打擊的傷害類型，都是使用時才選擇。'],
  },
  {
    en: 'Paladin', cn: '聖騎士', page: 53, endPage: 57,
    features: { 1: '聖療 Lay On Hands・施法 Spellcasting', 2: '聖騎士斬擊 Paladin’s Smite', 3: '引導神力 Channel Divinity', 5: '額外攻擊 Extra Attack・忠誠坐騎 Faithful Steed', 6: '守護靈光 Aura of Protection', 9: '斥退敵人 Abjure Foes', 10: '勇氣靈光 Aura of Courage', 11: '光輝打擊 Radiant Strikes', 14: '復原之觸 Restoring Touch', 18: '靈光擴展 Aura Expansion' },
    subclass: { name: '奉獻之誓 Oath of Devotion', page: 56, features: { 3: '神聖武器 Sacred Weapon・誓言法術', 5: '新增誓言法術', 7: '奉獻靈光 Aura of Devotion', 9: '新增誓言法術', 13: '新增誓言法術', 15: '守護斬擊 Smite of Protection', 17: '新增誓言法術', 20: '神聖光環 Holy Nimbus' } },
    reminders: ['長休後可替換 1 個已備聖騎士法術，並重選精通武器種類。', '若選祝福戰士，每升聖騎士等級可替換其中 1 個牧師戲法。基本聖騎士沒有戰士那項每級替換戰鬥風格的規則。'],
  },
  {
    en: 'Ranger', cn: '遊俠', page: 57, endPage: 61,
    features: { 1: '施法 Spellcasting・宿敵 Favored Enemy', 5: '額外攻擊 Extra Attack', 6: '漫遊者 Roving', 10: '不倦 Tireless', 13: '不屈獵手 Relentless Hunter', 14: '自然面紗 Nature’s Veil', 17: '精準獵手 Precise Hunter', 18: '野性感官 Feral Senses', 20: '屠敵者 Foe Slayer' },
    subclass: { name: '獵人 Hunter', page: 61, features: { 3: '獵人知識 Hunter’s Lore', 11: '高等獵物 Superior Hunter’s Prey', 15: '高等獵人防禦 Superior Hunter’s Defense' } },
    reminders: ['長休後可替換 1 個已備遊俠法術，並重選精通武器種類。', '若選德魯伊戰士，每升遊俠等級可替換其中 1 個德魯伊戲法。基本遊俠沒有戰士那項每級替換戰鬥風格的規則。', '獵人 3 級獵物與 7 級防禦戰術的選項，都可在短休或長休後切換。'],
  },
  {
    en: 'Rogue', cn: '盜賊', page: 61, endPage: 64,
    features: { 1: '偷襲 Sneak Attack・盜賊黑話 Thieves’ Cant', 2: '靈巧動作 Cunning Action', 3: '穩定瞄準 Steady Aim', 5: '狡詐打擊 Cunning Strike・直覺閃避 Uncanny Dodge', 7: '反射閃避 Evasion・可靠才能 Reliable Talent', 11: '精通狡詐打擊 Improved Cunning Strike', 14: '詭詐打擊 Devious Strikes', 15: '圓滑心智 Slippery Mind', 18: '飄忽不定 Elusive', 20: '幸運一擊 Stroke of Luck' },
    subclass: { name: '竊賊 Thief', page: 64, features: { 3: '快手 Fast Hands・梁上君子 Second-Story Work', 9: '高等潛行 Supreme Sneak', 13: '使用魔法裝置 Use Magic Device', 17: '竊賊反射 Thief’s Reflexes' } },
    reminders: ['長休後可重選精通武器種類（僅限簡易武器或具靈巧／輕型屬性的軍用武器）。', '狡詐打擊與詭詐打擊的效果，是偷襲時支付傷害骰選用；不需在升級時永久挑選。'],
  },
  {
    en: 'Sorcerer', cn: '術士', page: 64, endPage: 70,
    features: { 1: '施法 Spellcasting・天生術法 Innate Sorcery', 2: '魔力之源 Font of Magic', 5: '術法恢復 Sorcerous Restoration', 7: '術法化身 Sorcery Incarnate', 20: '奧術昇華 Arcane Apotheosis' },
    subclass: { name: '龍族術法 Draconic Sorcery', page: 69, features: { 3: '龍族韌性 Draconic Resilience・龍族法術', 5: '新增龍族法術', 7: '新增龍族法術', 9: '新增龍族法術', 14: '龍翼 Dragon Wings', 18: '巨龍伙伴 Dragon Companion' } },
    reminders: ['每升術士等級，可各替換 1 個戲法、1 個已備法術、1 個已知超魔選項。', '超魔在 2、10、17 級各新增 2 項，合計為 2／4／6 項；術法點總數不等於超魔選項數。'],
  },
  {
    en: 'Warlock', cn: '邪術師', page: 70, endPage: 76,
    features: { 1: '契約魔法 Pact Magic', 2: '魔法詭計 Magical Cunning', 9: '聯繫宗主 Contact Patron', 20: '祕法大師 Eldritch Master' },
    subclass: { name: '邪魔宗主 Fiend Patron', page: 76, features: { 3: '黑暗賜福 Dark One’s Blessing・宗主法術', 5: '新增宗主法術', 6: '黑暗之幸 Dark One’s Own Luck', 7: '新增宗主法術', 9: '新增宗主法術', 14: '墜入煉獄 Hurl Through Hell' } },
    reminders: ['每升邪術師等級，可各替換 1 個戲法、1 個已備法術及 1 個祈喚。祈喚須符合先決條件，且不能替換仍被其他已知祈喚依賴的項目。', '取得祕法奧秘後，每升邪術師等級可替換其中 1 個法術，必須保持相同環數。它不使用契約法術位。', '魔刃契約、魔鏈契約、魔書契約都是祈喚選項，沒有獨立的 3 級「契約恩賜」選擇。魔書的戲法與儀式法術在召喚書本時選。'],
  },
  {
    en: 'Wizard', cn: '法師', page: 77, endPage: 82,
    features: { 1: '施法 Spellcasting・儀式專家 Ritual Adept・奧術回復 Arcane Recovery', 5: '記憶法術 Memorize Spell' },
    subclass: { name: '塑能師 Evoker', page: 82, features: { 3: '強效戲法 Potent Cantrip', 6: '法術塑形 Sculpt Spells', 10: '強化塑能 Empowered Evocation', 14: '超載導能 Overchannel' } },
    reminders: ['長休後可替換 1 個法師戲法，並從法術書重新準備整份法術清單；5 級起短休後還能替換 1 個已備法術。', '每級免費加入法術書的 2 個法術，與已備法術上限是不同概念；冒險中抄錄的法術另外處理。', '18 級的法術精通在長休後可替換其中 1 個，須同環且符合施法時間限制。'],
  },
];
