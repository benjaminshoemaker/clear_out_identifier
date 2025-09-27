export const taxonomy = [
    { id: 'books', synonyms: ['book', 'novel', 'paperback', 'hardcover', 'isbn'] },
    { id: 'electronics', synonyms: ['gadget', 'device', 'phone', 'camera', 'laptop'] },
    { id: 'kitchenware', synonyms: ['pan', 'skillet', 'pot', 'utensil', 'cookware'] },
    { id: 'clothing', synonyms: ['jacket', 'shirt', 'jeans', 'pants', 'coat', 'apparel'] },
    { id: 'toys', synonyms: ['toy', 'lego', 'doll', 'action figure'] },
    { id: 'tools', synonyms: ['drill', 'saw', 'hammer', 'driver'] },
    { id: 'ceramics', synonyms: ['mug', 'cup', 'plate', 'bowl'] },
    { id: 'furniture', synonyms: ['chair', 'table', 'sofa', 'desk'] },
    { id: 'appliances', synonyms: ['mixer', 'blender', 'toaster'] },
    { id: 'sports', synonyms: ['ball', 'bat', 'racket', 'helmet'] },
    { id: 'bags', synonyms: ['backpack', 'bag', 'purse'] },
    { id: 'shoes', synonyms: ['sneaker', 'boot', 'shoe'] },
    { id: 'audio', synonyms: ['speaker', 'headphone', 'earbud'] },
    { id: 'photography', synonyms: ['dslr', 'lens', 'tripod'] },
    { id: 'office', synonyms: ['printer', 'stapler', 'folder'] },
    { id: 'garden', synonyms: ['hose', 'shovel', 'rake'] },
    { id: 'pet', synonyms: ['leash', 'bowl', 'toy'] },
    { id: 'beauty', synonyms: ['makeup', 'perfume', 'aerosol'] },
    { id: 'baby', synonyms: ['stroller', 'crib', 'toy'] },
    { id: 'gaming', synonyms: ['console', 'controller', 'gamepad'] },
    { id: 'bedding', synonyms: ['blanket', 'pillow', 'sheet'] },
    { id: 'lighting', synonyms: ['lamp', 'bulb', 'light'] },
    { id: 'automotive', synonyms: ['tire', 'wiper', 'battery'] },
    { id: 'misc', synonyms: ['misc', 'unknown'] },
];
export const brandLexicon = {
    sony: 'Sony',
    samsung: 'Samsung',
    apple: 'Apple',
    kitchenaid: 'KitchenAid',
    cuisinart: 'Cuisinart',
    nike: 'Nike',
    adidas: 'Adidas',
    levis: "Levi's",
    lodge: 'Lodge',
    ikea: 'IKEA',
    dewalt: 'DeWalt',
    bosch: 'Bosch',
};
export function normalizeBrand(text) {
    if (!text)
        return undefined;
    const key = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const exact = brandLexicon[key];
    if (exact)
        return exact;
    // fuzzy startswith
    for (const k of Object.keys(brandLexicon)) {
        if (key.startsWith(k))
            return brandLexicon[k];
    }
    return text;
}
export function canonicalCategory(hint) {
    if (!hint)
        return 'misc';
    const t = hint.toLowerCase();
    for (const c of taxonomy) {
        if (c.id === t)
            return c.id;
        if (c.synonyms.some((s) => t.includes(s)))
            return c.id;
    }
    return 'misc';
}
//# sourceMappingURL=taxonomy.js.map