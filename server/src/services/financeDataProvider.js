import { mockStore } from '../data/mock/mockStore.js';
import { isDatabaseEnabled } from '../config/dataMode.js';
import * as financeRepository from '../db/financeRepository.js';
import { getReconciliationSummary } from './reconciliationReportingService.js';
import { distinctPlatformOptionsFromRows } from '../utils/platformsFromDataset.js';
import { formatPlatformDisplay } from '../utils/normalizers/platform.js';

/**
 * Returns normalized finance rows. Mock data includes source_system = "mock" on each row.
 */
export async function getFinanceDataset() {
  if (!isDatabaseEnabled()) {
    return {
      orders: mockStore.orders,
      payments: mockStore.payments,
      refunds: mockStore.refunds,
      fees: mockStore.fees,
      mode: 'mock',
    };
  }

  const data = await financeRepository.getFinanceDataset();
  return {
    ...data,
    mode: 'database',
  };
}

export async function getDashboardMeta() {
  if (!isDatabaseEnabled()) {
    const platforms = distinctPlatformOptionsFromRows([
      mockStore.orders,
      mockStore.payments,
      mockStore.refunds,
      mockStore.fees,
    ]);
    return {
      database: false,
      hasRows: true,
      freshness: 'mock',
      lastImportAt: null,
      rowCounts: {
        orders: mockStore.orders.length,
        payments: mockStore.payments.length,
        refunds: mockStore.refunds.length,
        fees: mockStore.fees.length,
      },
      platforms,
      reconciliation: null,
    };
  }

  const hasRows = await financeRepository.hasFinanceRows();
  const meta = await financeRepository.getDashboardMeta();
  const keys = await financeRepository.loadDistinctPlatformKeys();
  const platforms = keys
    .sort((a, b) => formatPlatformDisplay(a).localeCompare(formatPlatformDisplay(b)))
    .map((id) => ({ id, label: formatPlatformDisplay(id) }));
  let reconciliation = null;
  try {
    reconciliation = await getReconciliationSummary();
  } catch {
    reconciliation = null;
  }
  return {
    ...meta,
    freshness: hasRows ? 'live' : 'empty',
    platforms,
    reconciliation,
  };
}
