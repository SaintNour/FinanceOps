import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme, THEMES } from '../lib/theme.js';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Theme
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`rounded-lg border border-solid px-2 py-1.5 text-xs font-semibold leading-5 capitalize transition-colors duration-200 ${
              theme === t
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
