export interface RecyclingLocation {
  name: string;
  distance: number; // miles
  hours: string;
}

export const locations = {
  async findRecycling(zip: string, material?: string): Promise<RecyclingLocation[]> {
    const seed = (zip || '00000').slice(-3);
    // Create deterministic distances based on zip
    const base = parseInt(seed, 10) || 0;
    const d1 = 0.8 + ((base % 10) / 10);
    const d2 = 2.4 + (((base + 3) % 20) / 10);
    const d3 = 6.2 + (((base + 7) % 30) / 10);
    const mat = (material || 'recycling');
    return [
      { name: `GreenCycle Center (${mat})`, distance: Math.round(d1 * 10) / 10, hours: '9am–6pm' },
      { name: `EcoDrop Depot`, distance: Math.round(d2 * 10) / 10, hours: '10am–8pm' },
      { name: `City Waste Facility`, distance: Math.round(d3 * 10) / 10, hours: '7am–4pm' },
    ];
  },
};

