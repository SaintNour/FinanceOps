import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import {
  civilDateFromIso,
  civilDateToIso,
  defaultCustomRangeDays,
} from '../lib/dateKit/index.js';

const PRESETS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

export function ReportingWindowPicker({ range, customFrom, customTo, onChange }) {
  const anchorRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [monthCount, setMonthCount] = useState(2);

  const selectedRange = useMemo(() => {
    if (range !== 'custom' || !customFrom) return undefined;
    const from = civilDateFromIso(customFrom);
    if (Number.isNaN(from.getTime())) return undefined;
    const to = customTo ? civilDateFromIso(customTo) : undefined;
    if (customTo && to && Number.isNaN(to.getTime())) return { from, to: undefined };
    return { from, to: to && !Number.isNaN(to.getTime()) ? to : undefined };
  }, [range, customFrom, customTo]);

  const updatePanelPosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxPanel = Math.min(720, window.innerWidth - 24);
    let left = r.left;
    if (left + maxPanel > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - maxPanel - 12);
    }
    setPanelPos({ top: r.bottom + 8, left });
  };

  useLayoutEffect(() => {
    if (!popoverOpen) return;
    updatePanelPosition();
  }, [popoverOpen]);

  useEffect(() => {
    const updateMonths = () => setMonthCount(window.innerWidth >= 900 ? 2 : 1);
    updateMonths();
    window.addEventListener('resize', updateMonths);
    return () => window.removeEventListener('resize', updateMonths);
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popoverOpen]);

  const handlePresetClick = (presetId) => {
    if (presetId === 'custom') {
      if (range !== 'custom') {
        const d = defaultCustomRangeDays(30);
        onChange({ range: 'custom', customFrom: d.from, customTo: d.to });
      }
      setPopoverOpen((o) => !o);
      return;
    }
    setPopoverOpen(false);
    onChange({ range: presetId, customFrom: '', customTo: '' });
  };

  const popover = popoverOpen
    ? createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] cursor-default bg-black/50 backdrop-blur-[1px] transition-opacity duration-200"
            aria-label="Close calendar"
            onClick={() => setPopoverOpen(false)}
          />
          <div
            className="reporting-daypicker fixed z-[210] max-h-[min(90vh,calc(100vh-6rem))] w-[min(720px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[color:color-mix(in_oklab,var(--bg-elevated)_84%,#020617_16%)] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45)] animate-[calendar-pop_220ms_ease-out]"
            style={{ top: panelPos.top, left: panelPos.left }}
            role="dialog"
            aria-modal="true"
            aria-label="Custom date range"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Custom range</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">Select a start and end date.</p>
              </div>
              <button
                type="button"
                onClick={() => setPopoverOpen(false)}
                className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
              >
                Done
              </button>
            </div>
            <DayPicker
              mode="range"
              weekStartsOn={1}
              numberOfMonths={monthCount}
              selected={selectedRange}
              onSelect={(next) => {
                if (!next?.from) {
                  onChange({ range: 'custom', customFrom: '', customTo: '' });
                  return;
                }
                onChange({
                  range: 'custom',
                  customFrom: civilDateToIso(next.from),
                  customTo: next.to ? civilDateToIso(next.to) : '',
                });
              }}
            />
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div ref={anchorRef} className="relative inline-block max-w-full">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Reporting window
      </p>
      <div className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-strong)] p-1 shadow-inner">
        {PRESETS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => handlePresetClick(r.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4 ${
              range === r.id
                ? 'bg-[var(--primary-soft)] text-[var(--text)] shadow-[var(--shadow)]'
                : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {popover}
    </div>
  );
}
