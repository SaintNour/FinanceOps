import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchFeesByPlatform,
  fetchFeesByType,
  fetchFinanceMeta,
  fetchFinanceSummary,
  fetchOrders,
  fetchRefundReasons,
  fetchRefundTrend,
  fetchRefunds,
  fetchRevenueTrend,
} from '../api/financeApi.js';
import { toUserFacingApiError } from '../api/userError.js';

const defaultState = {
  summary: null,
  revenueTrend: null,
  refundTrend: null,
  feesByPlatform: null,
  feesByType: null,
  refundReasons: null,
  orders: [],
  refunds: [],
};
const TABLE_FETCH_LIMIT = 300;

export function useFinanceDashboard({ range, customFrom, customTo, platform, status, sourceSystem }) {
  const [data, setData] = useState(defaultState);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = useMemo(() => {
    if (range === 'custom' && (!customFrom || !customTo)) return null;
    const q = {};
    if (range === 'custom') {
      q.from = customFrom;
      q.to = customTo;
    } else {
      q.range = range;
    }
    if (platform) q.platform = platform;
    if (status) q.status = status;
    if (sourceSystem) q.source_system = sourceSystem;
    return q;
  }, [range, customFrom, customTo, platform, status, sourceSystem]);

  const ordersQuery = useMemo(
    () => (query ? { ...query, limit: TABLE_FETCH_LIMIT } : null),
    [query],
  );

  const refundsQuery = useMemo(() => {
    if (!query) return null;
    const q = { ...query, limit: TABLE_FETCH_LIMIT };
    return q;
  }, [query]);

  const load = useCallback(async () => {
    if (!query || !ordersQuery || !refundsQuery) {
      setLoading(false);
      setError(null);
      setData(defaultState);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [m, summary, rev, ref, fees, feesType, refundReasons, orders, refunds] =
        await Promise.all([
          fetchFinanceMeta().catch(() => null),
          fetchFinanceSummary(query),
          fetchRevenueTrend(query),
          fetchRefundTrend(query),
          fetchFeesByPlatform(query),
          fetchFeesByType(query),
          fetchRefundReasons(query),
          fetchOrders(ordersQuery),
          fetchRefunds(refundsQuery),
        ]);
      setMeta(m);
      setData({
        summary,
        revenueTrend: rev,
        refundTrend: ref,
        feesByPlatform: fees,
        feesByType: feesType,
        refundReasons,
        orders,
        refunds,
      });
    } catch (e) {
      setError(toUserFacingApiError(e, 'Unable to load dashboard data. Please try again.'));
      setData(defaultState);
    } finally {
      setLoading(false);
    }
  }, [query, ordersQuery, refundsQuery]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, meta, loading, error, reload: load };
}
