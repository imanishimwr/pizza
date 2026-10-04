// ---------------------------------------------------------------------------
// Shared presentational components for admin pages
// ---------------------------------------------------------------------------
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatRwf } from '../../utils/adminHelpers';

// ─── Row ────────────────────────────────────────────────────────────────────
export function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white truncate">{value}</span>
    </div>
  );
}

// ─── Field ──────────────────────────────────────────────────────────────────
export function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-400 uppercase mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
const TONE_CLASS = {
  emerald: 'text-emerald-400 bg-emerald-500/20',
  blue:    'text-blue-400 bg-blue-500/20',
  amber:   'text-amber-400 bg-amber-500/20',
  orange:  'text-orange-400 bg-orange-500/20',
  purple:  'text-purple-400 bg-purple-500/20',
  slate:   'text-slate-400 bg-slate-700/30'
};

export function StatCard({ title, value, icon, tone = 'emerald', caption }) {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${TONE_CLASS[tone] || TONE_CLASS.emerald}`}>{icon}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-3">{value}</div>
      <p className="text-[11px] text-slate-400 mt-2">{caption}</p>
    </div>
  );
}

// ─── Pager ──────────────────────────────────────────────────────────────────
export function Pager({ page, pageCount, onChange, noun = 'items' }) {
  return (
    <nav className="flex items-center justify-center gap-2 pt-4" aria-label={`${noun} pagination`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 disabled:opacity-30 text-white"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      <span className="text-xs text-slate-400 font-bold px-3">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="p-2 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 disabled:opacity-30 text-white"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

// ─── ModalShell ─────────────────────────────────────────────────────────────
export function ModalShell({ title, icon, onClose, label, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-[#1A1D24] border border-slate-800 rounded-2xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            {icon}
            <span className="truncate">{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label={label}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── RevenueChart ─────────────────────────────────────────────────────────
const CHART_W = 600;
const CHART_H = 220;
const PAD_X = 44;
const PAD_Y = 28;

export function RevenueChart({ data, mode, hoveredKey, onHover }) {
  const maxRev = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.rev), 1);
    const magnitude = 10 ** Math.max(0, String(Math.round(highest)).length - 1);
    return Math.ceil(highest / magnitude) * magnitude;
  }, [data]);

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD_X + (i * (CHART_W - 2 * PAD_X)) / Math.max(1, data.length - 1),
        y: CHART_H - PAD_Y - (d.rev / maxRev) * (CHART_H - 2 * PAD_Y)
      })),
    [data, maxRev]
  );

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length
    ? `${pathD} L ${points[points.length - 1].x} ${CHART_H - PAD_Y} L ${points[0].x} ${CHART_H - PAD_Y} Z`
    : '';

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-125">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-56 select-none"
          role="img"
          aria-label="Revenue per day over the last seven days"
        >
          <defs>
            <linearGradient id="adminChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = PAD_Y + pct * (CHART_H - 2 * PAD_Y);
            const value = Math.round(maxRev * (1 - pct));
            return (
              <g key={pct}>
                <line x1={PAD_X} y1={y} x2={CHART_W - PAD_X} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <text x={PAD_X - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                  {formatRwf(value)}
                </text>
              </g>
            );
          })}

          {mode === 'line' && points.length > 0 && (
            <>
              <path d={areaD} fill="url(#adminChartAreaGrad)" />
              <path d={pathD} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {mode === 'bar' &&
            points.map((p) => (
              <rect
                key={p.key}
                x={p.x - 16}
                y={p.y}
                width={32}
                height={Math.max(0, CHART_H - PAD_Y - p.y)}
                rx="6"
                fill="url(#adminBarGrad)"
                opacity={0.85}
              />
            ))}

          {points.map((p) => {
            const isHovered = hoveredKey === p.key;
            return (
              <g
                key={p.key}
                onMouseEnter={() => onHover(p.key)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(p.key)}
                onBlur={() => onHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`${p.label}: ${formatRwf(p.rev)} RWF across ${p.orders} orders`}
                className="cursor-pointer outline-none"
              >
                {mode === 'line' && (
                  <circle cx={p.x} cy={p.y} r={isHovered ? 7 : 4} fill="#f97316" stroke="#ffffff" strokeWidth="2" />
                )}
                <rect x={p.x - 30} y={PAD_Y} width={60} height={CHART_H - 2 * PAD_Y} fill="transparent" />
                <text x={p.x} y={CHART_H - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#94a3b8">
                  {p.day}
                </text>
                {isHovered && (
                  <g>
                    <rect
                      x={p.x - 62}
                      y={p.y - 44}
                      width="124"
                      height="36"
                      rx="8"
                      fill="#12141A"
                      stroke="rgba(249,115,22,0.6)"
                      strokeWidth="1"
                    />
                    <text x={p.x} y={p.y - 30} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                      {formatRwf(p.rev)} RWF
                    </text>
                    <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="9" fill="#94a3b8">
                      {p.orders} orders
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Skeletons for Zero-Layout-Shift Loading ────────────────────────────────

export function KpiCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-slate-700/50 rounded" />
        <div className="w-8 h-8 rounded-xl bg-slate-700/40" />
      </div>
      <div className="h-8 w-32 bg-slate-700/60 rounded mt-2" />
      <div className="h-3 w-40 bg-slate-800 rounded" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="h-5 w-36 bg-slate-700/60 rounded" />
          <div className="h-3 w-48 bg-slate-800 rounded" />
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-xl" />
      </div>
      <div className="h-44 sm:h-52 w-full bg-[#12141A] rounded-xl flex items-end justify-between p-6 gap-3">
        {[40, 65, 30, 80, 50, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-700/40 rounded-t-lg transition-all"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-4 animate-pulse">
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-slate-700/60 rounded" />
            <div className="h-4 w-20 bg-slate-700/40 rounded-full" />
          </div>
          <div className="h-3 w-28 bg-slate-700/40 rounded" />
        </div>
        <div className="space-y-1 text-right">
          <div className="h-5 w-24 bg-slate-700/60 rounded" />
          <div className="h-3 w-16 bg-slate-800 rounded ml-auto" />
        </div>
      </div>
      <div className="space-y-2 py-2">
        <div className="h-3 w-full bg-slate-800/60 rounded" />
        <div className="h-3 w-4/5 bg-slate-800/40 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center">
        <div className="h-9 w-28 bg-slate-800 rounded-xl" />
        <div className="h-9 w-20 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

export function MealCardSkeleton() {
  return (
    <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-pulse flex flex-col">
      <div className="h-44 w-full bg-slate-800/60" />
      <div className="p-4 space-y-3 flex-1">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-slate-700/60 rounded" />
          <div className="h-4 w-20 bg-slate-700/40 rounded" />
        </div>
        <div className="h-3 w-full bg-slate-800/70 rounded" />
        <div className="h-3 w-3/4 bg-slate-800/50 rounded" />
      </div>
      <div className="p-4 pt-0 border-t border-slate-800/80 flex gap-2">
        <div className="h-9 flex-1 bg-slate-800 rounded-xl" />
        <div className="h-9 w-10 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

export function RiderCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-700/50" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-28 bg-slate-700/60 rounded" />
          <div className="h-3 w-20 bg-slate-800 rounded" />
        </div>
      </div>
      <div className="space-y-2 bg-[#12141A] p-3 rounded-xl border border-slate-800/60">
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="h-3 w-40 bg-slate-800/70 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-slate-800 rounded-lg" />
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowsSkeleton({ cols = 5, rows = 6 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3.5 rounded-xl bg-[#12141A] border border-slate-800/80 flex items-center justify-between gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-3.5 bg-slate-700/40 rounded ${c === 0 ? 'w-24' : c === cols - 1 ? 'w-20' : 'w-16'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700/50" />
          <div className="h-4 w-24 bg-slate-700/60 rounded" />
        </div>
        <div className="h-4 w-20 bg-slate-700/40 rounded" />
      </div>
      <div className="h-3 w-full bg-slate-800/80 rounded" />
      <div className="h-3 w-4/5 bg-slate-800/60 rounded" />
    </div>
  );
}

export { default as ConfirmModal } from '../common/ConfirmModal';

