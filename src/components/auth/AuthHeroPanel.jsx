import React from 'react';
import { Flame, Zap, Star, ShieldCheck, MapPin } from 'lucide-react';

export default function AuthHeroPanel({ title = 'HotPot Delights', subtitle = 'Kigali Fast Delivery' }) {
  const perks = [
    { icon: Zap, label: 'Lightning-fast delivery across Kigali (under 30 mins)' },
    { icon: Star, label: 'Authentic gourmet hotpot & freshly fired pizzas' },
    { icon: ShieldCheck, label: 'Live GPS telemetry & secure cashless payments' },
  ];

  return (
    <div className="hidden md:flex flex-col relative w-full md:w-[46%] lg:w-[48%] min-h-full overflow-hidden bg-gradient-to-br from-[#1c0a00] via-[#2a1000] to-[#0c0400] p-8 sm:p-10 justify-between select-none">
      {/* Ambient glowing radial blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-orange-600/25 blur-[90px] animate-soft-glow" />
        <div
          className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-red-600/20 blur-[80px] animate-soft-glow"
          style={{ animationDelay: '2s' }}
        />

        {/* Pulse rings behind delivery hub pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-orange-500/15 auth-pulse-ring-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-orange-500/10 auth-pulse-ring-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full border border-orange-500/5 auth-pulse-ring-1" style={{ animationDelay: '1s' }} />

        {/* City pin accent marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 flex items-center justify-center">
          <MapPin className="w-48 h-48 text-orange-500/40" />
        </div>
      </div>

      {/* Speed-line diagonal stripe pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-35deg, #FF5722 0, #FF5722 1.5px, transparent 0, transparent 40px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-red-500 flex items-center justify-center shadow-xl ring-2 ring-orange-400/30 transition-transform duration-300 hover:scale-105"
          style={{ filter: 'drop-shadow(0 0 14px rgba(255,87,34,0.55))' }}
        >
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-white font-black text-xl tracking-tight block">
            HotPot <span className="text-orange-400">Delights</span>
          </span>
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider block">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Hero Scooter Illustration with Entrance & Continuous Idle Float Animation */}
      <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[340px] flex items-center justify-center">
          {/* Soft speed blur highlight behind scooter */}
          <div className="absolute inset-x-4 bottom-2 h-12 bg-orange-500/25 blur-2xl rounded-full" />
          
          <img
            src="/assets/delivery_rider_hotpot.png"
            alt="HotPot Rwanda delivery scooter courier"
            className="w-full max-h-[300px] object-contain drop-shadow-[0_24px_48px_rgba(255,87,34,0.4)] auth-scooter-entrance cursor-pointer hover:scale-105 transition-transform duration-300"
          />
        </div>
        <p className="mt-4 text-xs font-bold text-orange-300/80 tracking-wide uppercase text-center bg-orange-950/40 border border-orange-500/20 px-4 py-1.5 rounded-full">
          🛵 Kigali Moto Express • 24/7 Hot Delivery
        </p>
      </div>

      {/* Perks Stagger List */}
      <div className="relative z-10 space-y-3 pt-4 border-t border-white/10">
        {perks.map(({ icon: Icon, label }, idx) => (
          <div
            key={label}
            className="flex items-center gap-3"
            style={{ animation: `authFadeUp 0.45s ease-out ${0.15 + idx * 0.1}s both` }}
          >
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span className="text-xs text-white/80 font-medium leading-snug">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
