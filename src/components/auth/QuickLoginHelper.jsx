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
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Demo Quick-Login
        </span>
        <span className="text-[10px] text-text-subdued">1-click test access</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
              title={`Click to test as ${demo.name} (${demo.description})`}
              className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${demo.badgeColor}`}
            >
              <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate">{demo.name}</div>
                <div className="text-[10px] opacity-75 truncate">{demo.email}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
