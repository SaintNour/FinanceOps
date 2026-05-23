import { Link, useLocation } from 'react-router-dom';
import { ENABLE_RECONCILIATION } from '../lib/features.js';
import { ThemeSwitcher } from './ThemeSwitcher.jsx';

const allLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/refunds', label: 'Refunds' },
  { to: '/import', label: 'Data import' },
  { to: '/periods', label: 'Periods' },
  { to: '/audit', label: 'Audit log' },
  { to: '/reconciliation', label: 'Reconciliation' },
];

const NAV_ITEM_BASE =
  'block w-full rounded-xl border border-solid px-3 py-2 text-sm font-medium leading-5 tracking-normal transition-colors duration-200 will-change-[background-color,color,border-color]';
const NAV_ITEM_INACTIVE =
  'border-[var(--border)] bg-[var(--card-strong)] text-[var(--muted)] hover:text-[var(--text)]';
const NAV_ITEM_ACTIVE =
  'border-[var(--primary)] bg-[var(--sidebar-active)] text-[var(--text)]';

export function Navbar() {
  const location = useLocation();
  const links = ENABLE_RECONCILIATION
    ? allLinks
    : allLinks.filter((link) => link.to !== '/reconciliation');

  return (
    <aside
      className="h-fit w-full shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-3 shadow-[var(--shadow)] xl:sticky xl:top-5 xl:w-[216px] xl:basis-[216px]"
      style={{ contain: 'layout style' }}
    >
      <nav className="space-y-1.5">
        {links.map((l) => {
          const active =
            l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              aria-current={active ? 'page' : undefined}
              className={`${NAV_ITEM_BASE} ${active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <ThemeSwitcher />
    </aside>
  );
}
