import React from 'react';
import {
  UtensilsCrossed, Flame, CheckCircle2, AlertTriangle, ShieldCheck,
  Thermometer, Clock, Layers, Sparkles
} from 'lucide-react';
import { useKitchen } from '../../context/KitchenContext';

export default function KitchenStations() {
  const { aggregatedPrepList, activeStation, setActiveStation, pendingOrders, preparingOrders } = useKitchen();

  const totalDishesToCook = aggregatedPrepList.reduce((acc, it) => acc + it.totalQty, 0);

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5 space-y-4 font-sans">
      {/* 1. AGGREGATED BATCH TOTALS */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
              What to Cook
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Total of each dish for new ({pendingOrders.length}) and cooking ({preparingOrders.length}) orders.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
              {totalDishesToCook} items ({aggregatedPrepList.length} kinds)
            </span>
          </div>
        </div>

        {aggregatedPrepList.length === 0 ? (
          <div className="py-14 text-center text-xs text-text-subdued space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-50" />
            <p className="font-bold text-white">Nothing to cook!</p>
            <p className="text-[11px]">New orders will show here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {aggregatedPrepList.map((dish, idx) => (
              <div
                key={idx}
                className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-white">{dish.name}</span>
                  <span className="w-8 h-8 rounded-lg bg-amber-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-md shrink-0">
                    {dish.totalQty}x
                  </span>
                </div>
                <div className="text-[11px] text-text-muted">
                  Orders:{' '}
                  <span className="font-mono text-amber-400 font-bold">
                    {dish.orders.map(id => `#${id}`).join(', ')}
                  </span>
                </div>
                {dish.spiceNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {dish.spiceNotes.map((sp, sIdx) => (
                      <span key={sIdx} className="text-[9px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-500/30 font-bold">
                        🔥 {sp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. EQUIPMENT & STATION OPERATIONAL STATUS */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
        <div className="border-b border-white/10 pb-3">
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Kitchen Status
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Heat and supplies at each spot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Station 1: Stoves & Wok */}
          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Stove Area
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                OK
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Active Master Broths:</span>
                <span className="font-bold text-white">4 Vats Simmering</span>
              </div>
              <div className="flex justify-between">
                <span>Target Simmer Temp:</span>
                <span className="font-mono text-amber-300 font-bold">92°C - 95°C</span>
              </div>
              <div className="flex justify-between">
                <span>Burner Efficiency:</span>
                <span className="text-emerald-400 font-bold">100% OK</span>
              </div>
            </div>
          </div>

          {/* Station 2: Stone Pizza Oven */}
          <div className="p-4 rounded-xl bg-black/40 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                Pizza Oven
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                READY
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Deck Temperature:</span>
                <span className="font-mono text-orange-300 font-bold">320°C</span>
              </div>
              <div className="flex justify-between">
                <span>Dough Balls Proofed:</span>
                <span className="font-bold text-white">32 Artisan Rounds</span>
              </div>
              <div className="flex justify-between">
                <span>Stone Heat Retention:</span>
                <span className="text-emerald-400 font-bold">Optimal</span>
              </div>
            </div>
          </div>

          {/* Station 3: Packaging & QC */}
          <div className="p-4 rounded-xl bg-black/40 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Packing Area
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                ACTIVE
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Thermal Soup Buckets:</span>
                <span className="font-bold text-white">85 Units Stocked</span>
              </div>
              <div className="flex justify-between">
                <span>Tamper-Proof Seals:</span>
                <span className="font-mono text-blue-300 font-bold">Available</span>
              </div>
              <div className="flex justify-between">
                <span>Courier Handover Bay:</span>
                <span className="text-emerald-400 font-bold">Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
