import React, { useState, useEffect } from 'react';
import { Zap, Pizza, MapPin } from 'lucide-react';

export default function AuthHeroPanel() {
  // Auto-switch between HotPot Delivery Moto and Official Logo every 3.5 seconds
  const [activeGraphic, setActiveGraphic] = useState('moto'); // 'moto' | 'logo'

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveGraphic((prev) => (prev === 'moto' ? 'logo' : 'moto'));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const perks = [
    {
      icon: Zap,
      title: 'Lightning-Fast Delivery',
      desc: 'Hot gourmet meals delivered across Kigali in under 30 minutes.',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/30',
    },
    {
      icon: Pizza,
      title: 'Authentic Quality',
      desc: 'Freshly prepared hotpot recipes, wood-fired pizzas, and local favorites.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
    },
    {
      icon: MapPin,
      title: 'Live Order Telemetry',
      desc: 'Track your delivery rider in real time from kitchen to doorstep.',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
    },
  ];

  return (
    <div className="hidden md:flex flex-col relative w-full md:w-[48%] lg:w-[50%] min-h-full overflow-hidden bg-gradient-to-br from-[#1b0800] via-[#2c1000] to-[#0d0400] p-6 sm:p-8 lg:p-10 justify-between select-none">
      {/* Ambient glowing radial blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-600/25 blur-[90px] animate-soft-glow" />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-red-600/20 blur-[85px] animate-soft-glow"
          style={{ animationDelay: '2s' }}
        />

        {/* Pulse rings behind delivery hub pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-orange-500/15 auth-pulse-ring-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-orange-500/10 auth-pulse-ring-2" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full border border-orange-500/5 auth-pulse-ring-1"
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      {/* Speed-line diagonal pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-35deg, #FF5722 0, #FF5722 1.5px, transparent 0, transparent 36px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Top Brand Header with Official HotPot Logo */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl bg-black/60 border border-white/20 p-1 flex items-center justify-center shadow-xl shadow-orange-500/20 transition-transform duration-300 hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 12px rgba(255,87,34,0.5))' }}
          >
            <img
              src="/hotpot-logo.png"
              alt="HotPot Official Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight block">
              HotPot <span className="text-orange-400">Delights</span>
            </span>
            <span className="text-white/50 text-[11px] font-semibold uppercase tracking-wider block">
              Kigali Delivery Hub
            </span>
          </div>
        </div>

        {/* Pill Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/60 border border-orange-500/30 text-[10px] font-extrabold text-orange-300 uppercase tracking-wider shadow-sm">
          <span>🚀</span>
          <span>KIGALI EXPRESS • 24/7 HOT DELIVERY</span>
        </div>
      </div>

      {/* Hero Title & Subtitle Copywriting */}
      <div className="relative z-10 mt-6 space-y-2">
        <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
          Hot &amp; Fresh, Delivered to Your Doorstep
        </h2>
        <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed max-w-md">
          Experience Kigali&apos;s finest hotpot, wood-fired pizzas, and gourmet dishes with real-time GPS tracking.
        </p>
      </div>

      {/* Auto-Switching Hero Showcase: HotPot Delivery Moto <-> Official Logo */}
      <div className="relative z-10 my-auto py-4 min-h-[260px] flex items-center justify-center">
        {/* State 1: HotPot Delivery Moto Graphic (Right to Left entrance & motion) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
            activeGraphic === 'moto'
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="relative w-full max-w-[320px] flex items-center justify-center">
            {/* Speed flare behind moto */}
            <div className="absolute inset-x-6 bottom-3 h-10 bg-orange-500/25 blur-xl rounded-full" />
            <img
              src="/assets/delivery_rider_hotpot.png"
              alt="HotPot Kigali delivery moto"
              className="w-full max-h-[250px] object-contain drop-shadow-[0_20px_40px_rgba(255,87,34,0.45)] auth-moto-drive-rtl"
            />
          </div>
          <div className="mt-2 text-[11px] font-bold text-orange-300/90 tracking-wide uppercase flex items-center gap-1.5 bg-black/40 border border-orange-500/20 px-3.5 py-1 rounded-full backdrop-blur-xs">
            <span>🛵</span>
            <span>Live Dispatch • Moto En Route</span>
          </div>
        </div>

        {/* State 2: HotPot Official Logo Showcase with Flame Glow Aura */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
            activeGraphic === 'logo'
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-black/80 border-2 border-orange-500/40 p-3 flex items-center justify-center shadow-2xl auth-logo-showcase">
            <img
              src="/hotpot-logo.png"
              alt="HotPot Official Logo"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm font-black text-white tracking-tight">HotPot Delights Rwanda</div>
            <div className="text-[11px] text-orange-400 font-semibold uppercase tracking-wider">
              The Home of Authentic Pizza &amp; Hotpot
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights (3 Bullet Badges) */}
      <div className="relative z-10 space-y-2.5 pt-3 border-t border-white/10">
        {perks.map(({ icon: Icon, title, desc, color, bgColor, borderColor }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div
              className={`w-7 h-7 rounded-xl ${bgColor} border ${borderColor} flex items-center justify-center shrink-0 mt-0.5`}
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block leading-snug">{title}</span>
              <span className="text-[11px] text-white/60 leading-tight block">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
