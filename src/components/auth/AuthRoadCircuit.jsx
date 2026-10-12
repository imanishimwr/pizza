import React from 'react';

/**
 * AuthRoadCircuit: A continuous 3D delivery road circuit running around the login card
 * where the HotPot motorcycle crosses smoothly in an endless circuit past the HotPot Logo Hub,
 * instead of turning back directly.
 */
export default function AuthRoadCircuit({ children }) {
  return (
    <div className="relative w-full max-w-4xl mx-auto my-1 sm:my-2 pt-4 pb-4 px-1 sm:px-2 perspective-3d-stage">


      {/* =========================================================================
          3. 3D MOTORCYCLE RUNNING CONTINUOUSLY AROUND THE LOGIN PAGE (NEVER TURNS BACK)
          ========================================================================= */}
      <div
        className="absolute w-24 sm:w-32 md:w-36 h-20 sm:h-28 md:h-30 pointer-events-none select-none z-35 auth-moto-circuit"
        style={{
          transformOrigin: 'center center',
          mixBlendMode: 'screen',
        }}
      >
        {/* Headlight Beam Projection Cone */}
        <div
          className="absolute top-5 sm:top-7 -right-14 sm:-right-20 w-24 sm:w-32 h-12 sm:h-16 pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(ellipse at 0% 50%, rgba(255, 230, 160, 0.85) 0%, rgba(255, 170, 50, 0.3) 45%, transparent 75%)',
            clipPath: 'polygon(0% 40%, 100% 0%, 100% 100%, 0% 60%)',
            filter: 'blur(2px)',
          }}
        />

        {/* Headlight Core Glow */}
        <div className="absolute top-8 sm:top-10 right-2 w-3 h-3 rounded-full bg-amber-200 blur-[2px] shadow-[0_0_14px_#ffe082] z-20" />

        {/* Taillight Red Glow */}
        <div className="absolute top-9 sm:top-12 left-1 w-3 h-3 rounded-full bg-red-500 blur-[2px] shadow-[0_0_12px_#ff2222] z-20" />

        {/* 3D HotPot Motorcycle Visual Graphic (Pure black background blends seamlessly) */}
        <img
          src="/assets/hotpot_moto_3d.jpg"
          alt="HotPot 3D Delivery Moto"
          className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(255,87,34,0.35)]"
          style={{
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* =========================================================================
          4. THE LOGIN PAGE (Nested Inside the 3D Circuit)
          ========================================================================= */}
      <div className="relative z-20 card-3d-stage rounded-3xl overflow-hidden bg-white dark:bg-[#14121a]">
        {children}
      </div>
    </div>
  );
}
