import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';

function PageLoader() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="h-4 w-32 rounded bg-[var(--card-2)]" />
      <div className="mt-4 h-20 rounded-xl bg-[var(--card-strong)]" />
    </div>
  );
}

export function Layout() {
  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto w-full max-w-[1700px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <div className="flex w-full min-w-0 flex-col gap-5 lg:gap-6 xl:flex-row xl:items-start">
          <Navbar />
          <main className="min-w-0 w-full flex-1 overflow-x-hidden">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
