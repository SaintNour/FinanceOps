export const THEMES = ['dark', 'light', 'pink'];
export const THEME_STORAGE_KEY = 'erps-theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && THEMES.includes(stored)) return stored;
  return 'dark';
}

export function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', next);
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }
  return next;
}
