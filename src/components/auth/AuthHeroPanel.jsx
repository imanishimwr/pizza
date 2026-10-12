import React, { useState, useEffect, useRef } from 'react';
import { Pizza } from 'lucide-react';

export default function AuthHeroPanel({ isCompact = false }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Auto-rotate hero showcase every 4.5 seconds like on the Home page
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 2);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Mouse Parallax 3D tilt tracking for desktop
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const isGreenTheme = activeSlide % 2 !== 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full overflow-hidden select-none border-b md:border-b-0 md:border-r border-orange-500/20 transition-all duration-700 ${
        isGreenTheme
          ? 'bg-gradient-to-br from-[#04160c] via-[#0b2416] to-[#020e07]'
          : 'bg-gradient-to-br from-[#140602] via-[#240b04] to-[#0c0402]'
      } ${
        isCompact
          ? 'h-44 sm:h-52 p-3 sm:p-4'
          : 'flex flex-col justify-between md:w-[48%] lg:w-[50%] p-4 sm:p-6 lg:p-7'
      }`}
      style={{
        perspective: '1200px',
      }}
    >
      {/* 3D Parallax Root Stage */}
      <div
        className="relative z-10 w-full h-full flex flex-col justify-between transition-transform duration-200 ease-out preserve-3d"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        }}
      >
        {/* Ambient Radial Lights (Dynamic Green <-> Orange/Red based on slide) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700">
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] transition-all duration-700 ${
              isGreenTheme ? 'bg-emerald-600/25' : 'bg-orange-600/20'
            }`}
          />
          <div
            className={`absolute -bottom-10 -left-10 w-64 h-64 rounded-full blur-[75px] transition-all duration-700 ${
              isGreenTheme ? 'bg-teal-600/20' : 'bg-red-600/20'
            }`}
          />
        </div>

        {/* TOP BAR: Clean Minimal Brand Header */}
        <div className="relative z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/80 border border-orange-500/30 p-1 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 ring-1 ring-orange-500/40">
              <img
                src="/hotpot-logo.png"
                alt="HotPot Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-white font-black text-base sm:text-lg tracking-tight block leading-none">
                HotPot
              </span>
              <span className="text-orange-400/90 text-[10px] font-extrabold uppercase tracking-wider block mt-0.5">
                Kigali Express
              </span>
            </div>
          </div>
        </div>

        {/* CENTER 3D SHOWCASE: ROTATES AS ON HOME PAGE BETWEEN (HOTPOT LOGO PIZZA & COURIER) */}
        <div className="relative z-10 my-auto py-3 sm:py-4 flex-1 flex flex-col justify-center items-center text-center">
          <div className="relative min-h-[240px] sm:min-h-[270px] w-full flex items-center justify-center">

            {/* SLIDE 0: HotPot Logo & Welcome to Home of Pizza (With Green <-> Red Dynamic Glow) */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${
                !isGreenTheme
                  ? 'opacity-100 scale-100 rotate-0'
                  : 'opacity-0 scale-95 -rotate-6 pointer-events-none'
              }`}
            >
              <div className="relative group flex flex-col items-center">
                {/* Glowing radial aura ring */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary via-orange-500 to-amber-400 rounded-3xl blur-2xl opacity-60 animate-pulse" />

                {/* Beveled dark glass card like on Home page */}
                <div className="relative p-5 sm:p-6 rounded-3xl bg-black/85 border-2 border-amber-500/50 shadow-2xl flex flex-col items-center text-center space-y-2.5 backdrop-blur-md">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-2xl shadow-primary/50 overflow-hidden group-hover:scale-105 transition-transform">
                      <img
                        src="/hotpot-logo.png"
                        alt="HotPot Logo"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    {/* Animated Pizza floating slice changing color to green & red */}
                    <div
                      className="absolute -top-3 -right-3 text-2xl pizza-float-shift cursor-pointer select-none"
                      title="Fresh Artisanal Pizza"
                    >
                      🍕
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-orange-200 to-amber-400 bg-clip-text text-transparent">
                      HotPot
                    </h3>
                    <p className="text-[11px] font-bold text-amber-300 uppercase tracking-widest mt-0.5">
                      Welcome to the home of pizza 🍕
                    </p>
                  </div>

                  {/* Animated Pizza Badge with Glowing Green <-> Red Dynamic Color Shift */}
                  <div className="pizza-color-shift inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border transition-all duration-700 shadow-md">
                    <Pizza className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black tracking-wide uppercase">Wood-Fired Pizza</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 1: Kigali Moto Express Courier (animate-float-moto as on Home page) */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${
                isGreenTheme
                  ? 'opacity-100 scale-100 translate-x-0'
                  : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
              }`}
            >
              <div className="relative max-w-[260px] sm:max-w-[280px] w-full flex flex-col items-center">
                {/* Emerald ambient glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />

                {/* Floating moto courier with animate-float-moto like on Home page */}
                <div className="relative w-full animate-float-moto flex flex-col items-center">
                  <img
                    src="/assets/delivery_rider_hotpot.png"
                    alt="HotPot motorbike delivery courier"
                    className="w-full max-h-[140px] sm:max-h-[155px] object-cover rounded-2xl shadow-xl border border-white/10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)]"
                  />
                  <div className="mt-2 p-3 sm:p-3.5 w-full rounded-2xl bg-black/75 border border-emerald-500/40 text-center space-y-1 backdrop-blur-md shadow-xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-base animate-bounce">
                      🛵
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-white">Kigali Moto Express</div>
                    <div className="text-[10px] text-emerald-300/80 font-medium">Live courier tracking on every order</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Slide Indicator Dots (Matches Home Page Banner Dots) */}
          <div className="relative z-20 flex justify-center items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setActiveSlide(0)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                !isGreenTheme ? 'w-6 bg-orange-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label="Home of Pizza Showcase"
            />
            <button
              type="button"
              onClick={() => setActiveSlide(1)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                isGreenTheme ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label="Kigali Delivery Courier Showcase"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
