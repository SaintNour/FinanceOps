import { generateMockFinanceData } from './generateMockFinanceData.js';

const snapshot = generateMockFinanceData();

/**
 * In-memory mock store. Replace with DB / external API adapters in Phase 2+.
 */
export const mockStore = {
  orders: snapshot.orders,
  payments: snapshot.payments,
  refunds: snapshot.refunds,
  fees: snapshot.fees,
};
