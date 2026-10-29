/** SRD 5.2.1 pp. 72–74, 87–88。中文為 Lorebook 摘譯。 */
export type Option = {
    id: string;
    name: string;
    detail?: string;
    description?: string;
    disabledReason?: string;
    requires?: string;
    level?: number;
    priceCp?: number;
};
export const opts = (pairs: string[]): Option[] => pairs.map((v) => { const [id, name, detail] = v.split('|'); return { id, name: name ?? id, detail }; });
export const STYLES = opts([
    'Archery|箭術|遠程武器攻擊擲骰 +2。', 'Defense|防禦|穿輕、中或重甲時 AC +1。',
    'Great Weapon Fighting|巨武器戰鬥|雙手持用雙手／多用途近戰武器，傷害骰的 1、2 視為 3。',
    'Two-Weapon Fighting|雙武器戰鬥|輕型武器額外攻擊可加能力修正傷害。',
]);
export const METAMAGIC = opts([
    'Careful Spell|謹慎法術|1 術法點，保護至多魅力修正數量的生物通過豁免；成功減半的傷害改為零。',
    'Distant Spell|遠距法術|1 術法點；射程至少 5 呎的法術加倍，觸及改為 30 呎。',
    'Empowered Spell|強效法術|1 術法點；重擲至多魅力修正顆傷害骰，可與其他超魔併用。',
    'Extended Spell|延時法術|1 術法點；持續至少 1 分鐘的法術時間加倍，至多 24 小時，維持專注豁免有優勢。',
    'Heightened Spell|升階法術|2 術法點；指定一個目標對此法術的豁免有劣勢。',
    'Quickened Spell|瞬發法術|2 術法點；動作法術改附贈動作，同回合不能另施放一環以上法術。',
    'Seeking Spell|追蹤法術|1 術法點；未命中的法術攻擊重擲，可與其他超魔併用。',
    'Subtle Spell|精妙法術|1 術法點；省略言語、姿勢及無價格且不消耗的材料。',
    'Transmuted Spell|轉化法術|1 術法點；強酸、寒冷、火焰、閃電、毒素、雷鳴之間替換傷害類型。',
    'Twinned Spell|孿生法術|1 術法點；對升環可增加目標的法術，視為提高一環。',
]);
export const ORIGINS = opts(['Alert|警覺|先攻加入熟練加值，可與自願同伴交換先攻。', 'Magic Initiate|法術新手|選牧師／德魯伊／法師清單：2 戲法、1 一環法術與施法屬性。', 'Savage Attacker|野蠻攻擊者|每回合一次武器命中，可擲兩組武器傷害骰並取其一。', 'Skilled|熟練|任選三項技能或工具熟練，可重複取得。']);
export const INVOCATIONS: Option[] = [
    ...opts(['Armor of Shadows|陰影護甲|可對自己無限施放法師護甲。', 'Eldritch Mind|祕法心智|維持專注的體質豁免有優勢。', 'Pact of the Blade|魔刃契約|以附贈動作建立契約武器，可使用魅力攻擊。', 'Pact of the Chain|魔鏈契約|取得尋獲魔寵，可用魔法動作免費施放。', 'Pact of the Tome|魔書契約|休息後召喚魔書，選 3 戲法與 2 個一環儀式。']),
    ...opts(['Devil’s Sight|魔鬼視界|120 呎內可正常看見微光及魔法與非魔法黑暗。', 'Fiendish Vigor|邪魔活力|無限施放虛假生命，獲得最大暫時生命值。', 'Mask of Many Faces|千面之貌|無限施放易容術。', 'Misty Visions|迷霧幻象|無限施放無聲幻影。', 'Otherworldly Leap|異界躍動|對自己無限施放跳躍術。']).map(x => ({ ...x, level: 2 })),
    ...opts(['Ascendant Step|昇騰步伐|對自己無限施放浮空術。', 'Gaze of Two Minds|雙心凝視|以附贈動作借用自願生物感官，可從其位置施法。', 'Gift of the Depths|深淵贈禮|水下呼吸、游泳速度；每天一次水下呼吸法術。', 'Master of Myriad Forms|萬形之主|無限施放變身術。', 'One with Shadows|與影合一|在微光或黑暗中無限施放隱形術。']).map(x => ({ ...x, level: 5 })),
    { id: 'Thirsting Blade', name: '飢渴魔刃', level: 5, requires: 'Pact of the Blade', detail: '契約武器取得額外攻擊。' },
    { id: 'Eldritch Smite', name: '祕法斬擊', level: 5, requires: 'Pact of the Blade', detail: '命中可消耗契約法術位造成額外力場傷害並擊倒。' },
    { id: 'Investment of the Chain Master', name: '魔鏈主宰的投資', level: 5, requires: 'Pact of the Chain', detail: '召喚魔寵時選飛行或游泳速度；其他強化於使用時決定。' },
    { id: 'Lifedrinker', name: '飲命者', level: 9, requires: 'Pact of the Blade', detail: '契約武器每回合一次 +1d6 傷害，可消耗生命骰恢復生命。' },
    { id: 'Gift of the Protectors', name: '守護者贈禮', level: 9, requires: 'Pact of the Tome', detail: '魔書中登記的生物降至 0 HP 時可改為 1；長休恢復。' },
    { id: 'Devouring Blade', name: '吞噬魔刃', level: 12, requires: 'Thirsting Blade', detail: '契約武器每次攻擊動作可攻擊三次。' },
    { id: 'Whispers of the Grave', name: '墳墓低語', level: 7, detail: '無限施放死者交談。' },
    { id: 'Visions of Distant Realms', name: '異域視界', level: 9, detail: '無限施放祕法眼。' },
    { id: 'Witch Sight', name: '巫術視界', level: 15, detail: '取得 30 呎真實視覺。' },
];
export const LANGUAGES = opts(['Common|通用語', 'Common Sign Language|通用手語', 'Draconic|龍語', 'Dwarvish|矮人語', 'Elvish|精靈語', 'Giant|巨人語', 'Gnomish|侏儒語', 'Goblin|地精語', 'Halfling|半身人語', 'Orc|獸人語', 'Abyssal|深淵語', 'Celestial|天界語', 'Deep Speech|深潛語', 'Druidic|德魯伊語', 'Infernal|煉獄語', 'Primordial|原初語', 'Sylvan|精類語', 'Thieves’ Cant|盜賊黑話', 'Undercommon|地底通用語']);
export const INSTRUMENTS = opts(['Bagpipes|風笛', 'Drum|鼓', 'Dulcimer|揚琴', 'Flute|長笛', 'Horn|號角', 'Lute|魯特琴', 'Lyre|里拉琴', 'Pan Flute|排笛', 'Shawm|雙簧管', 'Viol|提琴']);
export const ARTISAN_TOOLS = opts(['Alchemist’s Supplies|煉金工具', 'Brewer’s Supplies|釀酒工具', 'Calligrapher’s Supplies|書法工具', 'Carpenter’s Tools|木匠工具', 'Cartographer’s Tools|製圖工具', 'Cobbler’s Tools|鞋匠工具', 'Cook’s Utensils|廚具', 'Glassblower’s Tools|玻璃工匠工具', 'Jeweler’s Tools|珠寶匠工具', 'Leatherworker’s Tools|皮匠工具', 'Mason’s Tools|石匠工具', 'Painter’s Supplies|畫具', 'Potter’s Tools|陶匠工具', 'Smith’s Tools|鐵匠工具', 'Tinker’s Tools|修補匠工具', 'Weaver’s Tools|織工工具', 'Woodcarver’s Tools|木雕工具']);
export const TOOLS = [...ARTISAN_TOOLS, ...INSTRUMENTS, ...opts(['Disguise Kit|易容工具', 'Forgery Kit|偽造工具', 'Herbalism Kit|草藥工具', 'Navigator’s Tools|領航工具', 'Poisoner’s Kit|製毒工具', 'Thieves’ Tools|盜賊工具', 'Dice Set|骰子組', 'Dragonchess Set|龍棋', 'Playing Card Set|紙牌', 'Three-Dragon Ante Set|三龍牌'])];
export const DAMAGE = opts(['Acid|強酸', 'Cold|寒冷', 'Fire|火焰', 'Lightning|閃電', 'Poison|毒素', 'Thunder|雷鳴', 'Necrotic|黯蝕', 'Radiant|光輝', 'Psychic|心靈', 'Bludgeoning|鈍擊', 'Piercing|穿刺', 'Slashing|揮砍']);
/** 舊資料只有中文名稱；限定既有 SRD 對照，不能把自訂同名專長當官方。 */
export function originId(name: string, nameEn = ''): string {
    if (ORIGINS.some(o => o.id === nameEn))
        return nameEn;
    if (name.includes('法術新手'))
        return 'Magic Initiate';
    if (['野蠻打擊', '野蠻攻擊者'].includes(name))
        return 'Savage Attacker';
    if (name === '警覺')
        return 'Alert';
    if (['熟練', '技藝精湛'].includes(name))
        return 'Skilled';
    return '';
}
export const featOriginKey = (source: string, name: string) => `feat-origin-${source}-${name}`;
