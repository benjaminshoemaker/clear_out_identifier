export interface ActionEstimate {
  price_low?: number;
  price_high?: number;
  fees?: number; // absolute amount
  net?: number; // mid - fees
}

export const pricing = {
  async getEstimate(input: { category: string; brand?: string }): Promise<ActionEstimate> {
    const cat = (input.category || 'misc').toLowerCase();
    // Deterministic ranges by category
    const ranges: Record<string, [number, number]> = {
      kitchenware: [15, 35],
      clothing: [8, 22],
      electronics: [25, 80],
      books: [5, 15],
      misc: [10, 30],
    };
    const [low, high] = ranges[cat] || ranges.misc;
    const mid = (low + high) / 2;
    const feeRate = 0.12;
    const fees = Math.round(mid * feeRate * 100) / 100;
    const net = Math.round((mid - fees) * 100) / 100;
    return { price_low: low, price_high: high, fees, net };
  },
};

