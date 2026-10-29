import type { CatalogItem } from '@/lib/catalog/types';
import type { Equipment } from '@/lib/domain/character';
export function toEquipment(i: CatalogItem): Equipment {
    return {
        name: i.name,
        nameEn: i.eng_name ?? '',
        type: '',
        description: '',
        equipped: false,
        itemType: i.category === 'weapon'
            ? 'weapon'
            : i.category === 'armor'
                ? 'armor'
                : 'gear',
        source: 'catalog',
        quantity: 1,
        quest: false,
        priceCp: i.price_cp ?? 0,
        catalogRef: i.name,
        damage: i.damage_dice ?? '',
        damageType: i.damage_type ?? '',
        finesse: i.properties.some((p) => p.toLowerCase().includes('finesse')),
        properties: i.properties,
        armorCategory: i.armor_category === 'light' ||
            i.armor_category === 'medium' ||
            i.armor_category === 'heavy' ||
            i.armor_category === 'shield'
            ? i.armor_category
            : 'none',
        acBase: i.ac_base ?? 0,
    };
}
