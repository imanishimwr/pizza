import React from 'react';
import { Shield, User, ChefHat, Bike, Zap } from 'lucide-react';

const DEMO_CREDENTIALS = [
  {
    roleKey: 'admin',
    name: 'Admin',
    email: 'admin@hotpot.rw',
    password: 'Admin1234!',
    icon: Shield,
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-400 hover:bg-red-500/30',
    description: 'Full store management, analytics & dispatch'
  },
  {
    roleKey: 'customer',
    name: 'Customer',
    email: 'user@hotpot.rw',
    password: 'Customer1234!',
    icon: User,
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/30',
    description: 'Browse gourmet menu, cart & live tracking'
  },
  {
    roleKey: 'kitchen',
    name: 'Kitchen',
    email: 'kitchen@hotpot.rw',
    password: 'Kitchen1234!',
    icon: ChefHat,
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/30',
    description: 'Live order board, prep & fulfillment tickets'
  },
  {
    roleKey: 'delivery',
    name: 'Rider',
    email: 'rider@hotpot.rw',
    password: 'Rider1234!',
    icon: Bike,
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/30',
    description: 'Active deliveries, handover PIN verification & GPS'
  }
];

export default function QuickLoginHelper({ onSelect, onInstantLogin, disabled = false }) {
  return (
    <div className="mt-2.5 p-2 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Quick Demo
        </span>
        <span className="text-[9px] text-slate-400 dark:text-white/40">1-click login</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {DEMO_CREDENTIALS.map((demo) => {
          const Icon = demo.icon;
          return (
            <button
              key={demo.roleKey}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (typeof onInstantLogin === 'function') {
                  onInstantLogin(demo.email, demo.password);
                } else if (typeof onSelect === 'function') {
                  onSelect(demo.email, demo.password);
                }
              }}
              title={`1-click login as ${demo.name}: ${demo.description}`}
              className={`btn-3d-demo py-1.5 px-2 rounded-xl border text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${demo.badgeColor}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-black tracking-tight whitespace-nowrap">{demo.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
