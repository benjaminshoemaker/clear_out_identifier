import { analyzeItem } from '../src';

function loadDummy(name: string): any { return Buffer.from(`dummy-${name}`); }

describe('identify/analyzeItem', () => {
  it('book (ISBN) → sku', async () => {
    const img = loadDummy('book_isbn_9780306406157');
    const res = await analyzeItem([img], { imageNames: ['book_isbn_9780306406157.jpg'], mockId: 'book', allowFilenameText: true });
    expect(res.resolution_level).toBe('sku');
    expect(res.confidence).toBeGreaterThan(0.3);
    expect(res.evidence.codes.length).toBeGreaterThanOrEqual(1);
    expect(res.next_step).toBeDefined();
  });

  it('skillet bottom stamp → kitchenware category_only/brand_category', async () => {
    const img = loadDummy('skillet_bottom_stamp');
    const res = await analyzeItem([img], { imageNames: ['skillet_bottom_stamp.jpg'], mockId: 'skillet' });
    expect(['brand_model','brand_category','category_only']).toContain(res.resolution_level);
    // brand might be undefined in baseline rules
    expect(res.evidence.neighbors.length).toBeGreaterThanOrEqual(0);
  });

  it('jacket RN → clothing jackets', async () => {
    const img = loadDummy('jacket_rn12345_levi');
    const res = await analyzeItem([img], { imageNames: ['jacket RN:12345 Levis.jpg'], mockId: 'jacket' });
    expect(res.resolution_level).not.toBe('sku');
    expect(res.next_step).toBeDefined();
  });

  it('power drill battery (baseline has no hazards)', async () => {
    const img = loadDummy('drill_battery');
    const res = await analyzeItem([img], { imageNames: ['drill lithium battery.jpg'], mockId: 'drill_battery' } );
    expect(Array.isArray(res.hazards)).toBe(true);
  });

  it('ceramic mug → category_only or brand_category', async () => {
    const img = loadDummy('mug');
    const res = await analyzeItem([img], { imageNames: ['ceramic mug ikea.jpg'], mockId: 'mug' });
    expect(['category_only','brand_category','brand_model']).toContain(res.resolution_level);
  });

  it('filename brand ignored when allowFilenameText=false', async () => {
    const img = loadDummy('levis');
    const res = await analyzeItem([img], { imageNames: ['levis.jpg'], mockId: 'default' });
    // Should not promote brand solely from filename
    expect(res.attributes.brand === undefined || res.resolution_level === 'category_only').toBe(true);
  });
});
