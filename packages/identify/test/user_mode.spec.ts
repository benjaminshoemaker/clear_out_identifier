import { classifyFromText } from '../src/rules/classify.js';

describe('user keyword classification', () => {
  const allowed = [
    'Electronics > Computers > Computer Accessories > Laptop Chargers & Adapters',
    'Media > Books',
    'Apparel & Accessories > Clothing > Outerwear > Jackets'
  ];

  it('MagSafe adapter → laptop adapters + Apple', () => {
    const text = 'Apple MagSafe AC Power Adapter model A1718 85W';
    const r = classifyFromText(text, allowed);
    expect(r.category).toBe('Electronics > Computers > Computer Accessories > Laptop Chargers & Adapters');
    expect(r.brand).toBe('Apple');
    expect(r.model).toMatch(/A\d{4}/);
  });

  it('ISBN → books', () => {
    const text = 'ISBN 9780306406157';
    const r = classifyFromText(text, allowed);
    expect(r.category).toBe('Media > Books');
  });

  it('Jacket RN → jackets', () => {
    const text = 'Outer shell 100% cotton RN12345 Jacket';
    const r = classifyFromText(text, allowed);
    expect(r.category).toBe('Apparel & Accessories > Clothing > Outerwear > Jackets');
  });
});

