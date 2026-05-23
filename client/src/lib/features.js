function envFlagEnabled(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export const ENABLE_RECONCILIATION = envFlagEnabled(
  import.meta.env.VITE_ENABLE_RECONCILIATION,
);
