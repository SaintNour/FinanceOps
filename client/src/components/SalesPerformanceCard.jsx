import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../lib/format.js';

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return '?';
  return Number(value).toLocaleString('en-US');
}

/**
 * MANUAL BUBBLE POSITIONING
 * -------------------------
 * x / y are PIXELS relative to the top-left of the bubble playground.
 * Defaults are chosen to fit inside a 640 x 340 playground so no bubble
 * overflows the frame.  At runtime positions get clamped to the measured
 * frame size, and the user can drag each bubble inside the frame.
 */
const BUBBLE_LAYOUT = Object.freeze({
  gross: {
    x: 20,
    y: 115,
    size: 210,
    anim: 'spFloatGross',
    duration: '11.5s',
    delay: '0s',
  },
  net: {
    x: 240,
    y: 55,
    size: 168,
    anim: 'spFloatNet',
    duration: '12.3s',
    delay: '0.8s',
  },
  taxes: {
    x: 418,
    y: 8,
    size: 132,
    anim: 'spFloatTaxes',
    duration: '12.8s',
    delay: '0.4s',
  },
  orders: {
    x: 500,
    y: 200,
    size: 126,
    anim: 'spFloatOrders',
    duration: '10.8s',
    delay: '1.4s',
  },
});

const ACTIVE_SHIFT = Object.freeze({
  gross: { x: 0, y: -4 },
  net: { x: 2, y: -5 },
  orders: { x: 4, y: -3 },
  taxes: { x: -2, y: -4 },
});

const INACTIVE_SHIFT = Object.freeze({
  gross: { x: -4, y: 4 },
  net: { x: 5, y: 4 },
  orders: { x: 6, y: 6 },
  taxes: { x: -6, y: 4 },
});

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

const BUBBLE_METRIC = Object.freeze({
  gross: 'grossRevenue',
  net: 'netRevenue',
  taxes: 'totalTaxCollected',
  orders: 'totalOrders',
});

function Bubble({
  bubbleKey,
  bubble,
  layout,
  position,
  activeBubble,
  isDragging,
  onActivate,
  onPointerDown,
  onDrill,
}) {
  const isActive = activeBubble === bubbleKey;
  const activeShift = ACTIVE_SHIFT[bubbleKey] || { x: 0, y: 0 };
  const inactiveShift = INACTIVE_SHIFT[bubbleKey] || { x: 0, y: 0 };

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${layout.size}px`,
        height: `${layout.size}px`,
        animationName: layout.anim,
        animationDuration: layout.duration,
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDelay: layout.delay,
        animationPlayState: isDragging ? 'paused' : 'running',
        zIndex: isDragging ? 40 : isActive ? 30 : 10,
        transition: isDragging ? 'none' : undefined,
        touchAction: 'none',
      }}
    >
      <button
        type="button"
        onPointerDown={(e) => onPointerDown(e, bubbleKey)}
        onClick={() => onActivate(bubbleKey)}
        onDoubleClick={() => {
          const metric = BUBBLE_METRIC[bubbleKey];
          if (metric && onDrill) onDrill(metric);
        }}
        className="relative h-full w-full rounded-full transition-all duration-500 ease-out"
        style={{
          transform: isActive
            ? `translate(${activeShift.x}px, ${activeShift.y}px) scale(1.045)`
            : `translate(${inactiveShift.x}px, ${inactiveShift.y}px) scale(0.975)`,
          opacity: isActive ? 1 : 0.88,
          filter: isActive ? 'saturate(1.03)' : 'saturate(0.94)',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        {/* outer ambient glow */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full blur-3xl transition-all duration-500"
          style={{
            background: bubble.glowFill,
            opacity: isActive ? 0.78 : 0.42,
            transform: isActive ? 'scale(1.04)' : 'scale(0.96)',
          }}
        />

        {/* main bubble */}
        <span
          className="absolute inset-0 rounded-full border backdrop-blur-[1.5px] transition-all duration-500"
          style={{
            background: bubble.fill,
            borderColor: bubble.border,
            boxShadow: isActive ? bubble.activeShadow : bubble.idleShadow,
          }}
        />

        {/* inner softness */}
        <span
          className="pointer-events-none absolute inset-[8%] rounded-full blur-2xl transition-all duration-500"
          style={{
            background: bubble.innerGlow,
            opacity: isActive ? 0.68 : 0.4,
          }}
        />

        <span className="pointer-events-none relative z-10 flex h-full w-full flex-col items-center justify-center px-4 text-center">
          <span className="text-[10px] uppercase tracking-[0.09em] text-[var(--muted)]">
            {bubble.label}
          </span>
          <span className={bubble.valueClass}>{bubble.value}</span>
          {isActive && onDrill && BUBBLE_METRIC[bubbleKey] && (
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.09em] text-[var(--primary)] opacity-90">
              Double-click to drill in
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

export function SalesPerformanceCard({ summary, onDrill }) {
  const [activeBubble, setActiveBubble] = useState('gross');
  const [positions, setPositions] = useState(() => {
    const initial = {};
    for (const [key, layout] of Object.entries(BUBBLE_LAYOUT)) {
      initial[key] = { x: layout.x, y: layout.y };
    }
    return initial;
  });
  const [draggingKey, setDraggingKey] = useState(null);

  const frameRef = useRef(null);
  const frameSizeRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef(null);

  const measureFrame = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    frameSizeRef.current = { width: rect.width, height: rect.height };
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [key, pos] of Object.entries(prev)) {
        const size = BUBBLE_LAYOUT[key].size;
        const maxX = Math.max(0, rect.width - size);
        const maxY = Math.max(0, rect.height - size);
        const nx = clamp(pos.x, 0, maxX);
        const ny = clamp(pos.y, 0, maxY);
        if (nx !== pos.x || ny !== pos.y) {
          next[key] = { x: nx, y: ny };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useLayoutEffect(() => {
    measureFrame();
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureFrame);
      return () => window.removeEventListener('resize', measureFrame);
    }
    const ro = new ResizeObserver(() => measureFrame());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFrame]);

  const handlePointerDown = useCallback(
    (e, key) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const pos = positions[key];
      dragRef.current = {
        key,
        pointerId: e.pointerId,
        offsetX: e.clientX - rect.left - pos.x,
        offsetY: e.clientY - rect.top - pos.y,
        moved: false,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      setDraggingKey(key);
      setActiveBubble(key);
      e.preventDefault();
    },
    [positions],
  );

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const size = BUBBLE_LAYOUT[drag.key].size;
    const maxX = Math.max(0, rect.width - size);
    const maxY = Math.max(0, rect.height - size);
    const nx = clamp(e.clientX - rect.left - drag.offsetX, 0, maxX);
    const ny = clamp(e.clientY - rect.top - drag.offsetY, 0, maxY);
    drag.moved = true;
    setPositions((prev) => {
      const curr = prev[drag.key];
      if (curr.x === nx && curr.y === ny) return prev;
      return { ...prev, [drag.key]: { x: nx, y: ny } };
    });
  }, []);

  const endDrag = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e && e.pointerId !== drag.pointerId) return;
    try {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        e.currentTarget.releasePointerCapture(drag.pointerId);
      }
    } catch {
      /* noop */
    }
    dragRef.current = null;
    setDraggingKey(null);
  }, []);

  const bubbles = useMemo(() => {
    if (!summary) return null;
    return {
      gross: {
        label: 'Gross Revenue',
        value: formatCurrency(summary.grossRevenue),
        valueClass: 'mt-2 text-[1.9rem] font-semibold leading-none text-[var(--text)]',
        fill:
          'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--primary-soft) 60%, white 8%) 0%, color-mix(in oklab, var(--primary-soft) 38%, transparent) 58%, transparent 100%)',
        border: 'color-mix(in oklab, var(--primary) 18%, transparent)',
        glowFill:
          'radial-gradient(circle, color-mix(in oklab, var(--primary-soft) 38%, transparent) 0%, transparent 72%)',
        innerGlow:
          'radial-gradient(circle, color-mix(in oklab, white 12%, var(--primary-soft) 26%) 0%, transparent 72%)',
        activeShadow: '0 18px 42px color-mix(in oklab, var(--primary-soft) 20%, transparent)',
        idleShadow: '0 10px 24px color-mix(in oklab, var(--primary-soft) 10%, transparent)',
      },
      net: {
        label: 'Net Revenue',
        value: formatCurrency(summary.netRevenue),
        valueClass: 'mt-2 text-[1.05rem] font-semibold leading-none text-[var(--text)]',
        fill:
          'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--chart-2) 24%, white 10%) 0%, color-mix(in oklab, var(--chart-2) 12%, transparent) 58%, transparent 100%)',
        border: 'color-mix(in oklab, var(--chart-2) 16%, transparent)',
        glowFill:
          'radial-gradient(circle, color-mix(in oklab, var(--chart-2) 28%, transparent) 0%, transparent 72%)',
        innerGlow:
          'radial-gradient(circle, color-mix(in oklab, white 12%, var(--chart-2) 16%) 0%, transparent 72%)',
        activeShadow: '0 14px 34px color-mix(in oklab, var(--chart-2) 16%, transparent)',
        idleShadow: '0 8px 18px color-mix(in oklab, var(--chart-2) 8%, transparent)',
      },
      orders: {
        label: 'Orders',
        value: formatCount(summary.totalOrders),
        valueClass: 'mt-2 text-[1rem] font-semibold leading-none text-[var(--text)]',
        fill:
          'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--chart-3) 18%, white 10%) 0%, color-mix(in oklab, var(--chart-3) 10%, transparent) 58%, transparent 100%)',
        border: 'color-mix(in oklab, var(--chart-3) 18%, transparent)',
        glowFill:
          'radial-gradient(circle, color-mix(in oklab, var(--chart-3) 24%, transparent) 0%, transparent 72%)',
        innerGlow:
          'radial-gradient(circle, color-mix(in oklab, white 12%, var(--chart-3) 14%) 0%, transparent 72%)',
        activeShadow: '0 12px 28px color-mix(in oklab, var(--chart-3) 14%, transparent)',
        idleShadow: '0 6px 16px color-mix(in oklab, var(--chart-3) 8%, transparent)',
      },
      taxes: {
        label: 'Taxes',
        value: formatCurrency(
          summary.totalTaxCollected ??
            summary.totalTax ??
            summary.taxAmount ??
            0,
        ),
        valueClass: 'mt-2 text-[1rem] font-semibold leading-none text-[var(--text)]',
        fill:
          'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--chart-4) 20%, white 10%) 0%, color-mix(in oklab, var(--chart-4) 10%, transparent) 58%, transparent 100%)',
        border: 'color-mix(in oklab, var(--chart-4) 18%, transparent)',
        glowFill:
          'radial-gradient(circle, color-mix(in oklab, var(--chart-4) 22%, transparent) 0%, transparent 72%)',
        innerGlow:
          'radial-gradient(circle, color-mix(in oklab, white 10%, var(--chart-4) 14%) 0%, transparent 72%)',
        activeShadow: '0 12px 28px color-mix(in oklab, var(--chart-4) 14%, transparent)',
        idleShadow: '0 6px 16px color-mix(in oklab, var(--chart-4) 8%, transparent)',
      },
    };
  }, [summary]);

  if (!summary || !bubbles) return null;

  return (
    <section className="relative flex min-h-[440px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] transition-all duration-200">
      <style>{`
        /* very subtle, professional floating */
        @keyframes spFloatGross {
          0%, 100% { transform: translate(0px, 0px); }
          25% { transform: translate(1px, -2px); }
          50% { transform: translate(0px, -4px); }
          75% { transform: translate(-1px, -2px); }
        }

        @keyframes spFloatNet {
          0%, 100% { transform: translate(0px, 0px); }
          25% { transform: translate(-1px, -2px); }
          50% { transform: translate(2px, -4px); }
          75% { transform: translate(1px, -2px); }
        }

        @keyframes spFloatOrders {
          0%, 100% { transform: translate(0px, 0px); }
          25% { transform: translate(1px, -1px); }
          50% { transform: translate(-1px, -3px); }
          75% { transform: translate(1px, -2px); }
        }

        @keyframes spFloatTaxes {
          0%, 100% { transform: translate(0px, 0px); }
          25% { transform: translate(-1px, -2px); }
          50% { transform: translate(1px, -4px); }
          75% { transform: translate(-1px, -1px); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[14%] top-[28%] h-56 w-56 rounded-full bg-[var(--primary-soft)]/35 blur-3xl" />
        <div className="absolute left-[38%] top-[18%] h-44 w-44 rounded-full bg-[color:var(--chart-2)]/14 blur-3xl" />
        <div className="absolute left-[70%] top-[62%] h-28 w-28 rounded-full bg-[color:var(--chart-3)]/12 blur-2xl" />
        <div className="absolute left-[18%] top-[6%] h-32 w-32 rounded-full bg-[color:var(--chart-4)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 shrink-0">
        <h3 className="text-sm font-semibold text-[var(--text)]">Sales performance</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Core revenue health at a glance</p>
      </div>

      <div className="relative mt-6 flex min-h-[340px] flex-1 flex-col px-1 pb-1">
        <div
          ref={frameRef}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className="relative mx-auto h-full min-h-[300px] w-full max-w-[640px] flex-1 overflow-hidden rounded-xl"
          style={{ touchAction: 'none' }}
        >
          {Object.entries(bubbles).map(([key, bubble]) => (
            <Bubble
              key={key}
              bubbleKey={key}
              bubble={bubble}
              layout={BUBBLE_LAYOUT[key]}
              position={positions[key]}
              activeBubble={activeBubble}
              isDragging={draggingKey === key}
              onActivate={setActiveBubble}
              onPointerDown={handlePointerDown}
              onDrill={onDrill}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
