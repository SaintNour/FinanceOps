import { useCallback, useState } from 'react';

/**
 * Central control for the KPI drill-down drawer.  Keeps the drawer
 * state and the current request shape in one place so callers only
 * need `open(metric, extras)` and `close()`.
 */
export function useDrillDown(baseRequest) {
  const [request, setRequest] = useState(null);
  const isOpen = Boolean(request);

  const open = useCallback(
    (metric, extras = {}) => {
      if (!metric) return;
      setRequest({ ...(baseRequest || {}), ...extras, metric });
    },
    [baseRequest],
  );

  const close = useCallback(() => setRequest(null), []);

  return { isOpen, request, open, close };
}
