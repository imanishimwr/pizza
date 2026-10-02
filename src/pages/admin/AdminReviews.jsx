import React, { useMemo } from 'react';
import { Star, RefreshCw } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { formatWhen } from '../../utils/adminHelpers';
import { ReviewCardSkeleton, KpiCardSkeleton } from '../../components/admin/AdminComponents';

export default function AdminReviews() {
  const { reviews, loadSnapshot, isRefreshing, loading } = useAdmin();

  const reviewList = useMemo(() => (Array.isArray(reviews) ? reviews : []), [reviews]);

  const reviewAverages = useMemo(() => {
    if (reviewList.length === 0) return { pizza: null, rider: null };
    const sum = (pick) => reviewList.reduce((acc, rev) => acc + (Number(pick(rev)) || 0), 0);
    return {
      pizza: sum((rev) => rev.pizzaRating) / reviewList.length,
      rider: sum((rev) => rev.riderRating) / reviewList.length
    };
  }, [reviewList]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {loading && reviewList.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Food rating</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {reviewAverages.pizza === null ? <span className="text-slate-500">&mdash;</span> : reviewAverages.pizza.toFixed(1)}
              </span>
              <span className="text-xs text-amber-400 font-bold">/ 5.0</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {reviewList.length === 0 ? 'No feedback received yet.' : `Mean of ${reviewList.length} reviews.`}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Courier rating</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {reviewAverages.rider === null ? <span className="text-slate-500">&mdash;</span> : reviewAverages.rider.toFixed(1)}
              </span>
              <span className="text-xs text-amber-400 font-bold">/ 5.0</span>
            </div>
            <p className="text-[11px] text-slate-400">Mean courier score.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total feedback</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">{reviewList.length}</span>
              <span className="text-xs text-slate-400">reviews</span>
            </div>
            <p className="text-[11px] text-slate-400">Stored on the server.</p>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" aria-hidden="true" />
            Customer and courier reviews
          </h3>
          <button
            type="button"
            onClick={() => loadSnapshot()}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {loading && reviewList.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ReviewCardSkeleton key={i} />
            ))}
          </div>
        ) : reviewList.length === 0 ? (
          <p className="py-12 text-center text-slate-400 text-xs bg-[#12141A] rounded-2xl border border-slate-800/80">
            No customer reviews logged yet.
          </p>
        ) : (
          <div className="space-y-3">
            {reviewList.map((rev, idx) => (
              <article
                key={rev.id ?? idx}
                className="p-4 rounded-xl bg-[#12141A] border border-slate-800/80 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400">Order #{rev.orderId}</span>
                    {rev.createdAt && <span className="text-[10px] text-slate-400">&middot; {formatWhen(rev.createdAt)}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-orange-400">Food: {rev.pizzaRating}&star;</span>
                    <span className="text-amber-300">Courier: {rev.riderRating}&star;</span>
                  </div>
                </div>
                {rev.comment ? (
                  <blockquote className="text-xs text-slate-300 italic bg-[#1F242D] p-2.5 rounded-lg border border-slate-700/50 m-0">
                    {rev.comment}
                  </blockquote>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No written comment provided.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
