import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Clock, MapPin, Radio, History,
  Settings, ChevronRight, ChevronLeft, User, Menu, X, Flame
} from 'lucide-react';
import { ROUTES } from '../../App';

export default function CustomerLayout({
  user,
  cart,
  onOpenCart,
  onExploreMenu,
  onOpenProfile,
  onNavigate
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cartTotalItems = Array.isArray(cart) ? cart.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) : 0;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '';
  const profileName = user?.name || '';

  const activePath = location.pathname;

  const NAV_LINKS = [
    { path: ROUTES.dashboard, label: 'Dashboard Overview', icon: LayoutDashboard },
    { path: ROUTES.tracking, label: 'Live Order Radar', icon: Radio },
    { path: ROUTES.orders, label: 'Order History', icon: History },
    { path: ROUTES.dashboard + '/profile', label: 'Profile & Address Book', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0F1117] text-slate-300 font-sans selection:bg-orange-500/30 overflow-hidden">
      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#14171F] border-r border-slate-800 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 shrink-0 border-b border-slate-800 bg-[#10131A]">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                <Flame className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-base font-black text-white tracking-tight truncate">
                HOTPOT <span className="text-orange-400">CUSTOMER</span>
              </span>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-6">
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2.5 block mb-2">
                Main Menu
              </span>
            )}
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = activePath === link.path || (link.path === ROUTES.dashboard + '/profile' && activePath.includes('profile'));
              
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === ROUTES.dashboard}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-11 ${
                    isActive
                      ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-[1.01]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`flex-1 text-left truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                    {link.label}
                  </span>
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">
                Quick Actions
              </span>
            )}
            <button
              onClick={() => navigate(ROUTES.home)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Explore Food Menu</span>
            </button>
            <button
              onClick={onOpenCart}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1A1D24] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className={`truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>My Food Cart</span>
              </div>
              {cartTotalItems > 0 && !isSidebarCollapsed && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white font-mono text-[10px] font-bold">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#10131A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm border border-white/10">
              {initial || <User className="w-4 h-4" />}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{profileName || 'Customer'}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                    Signed in
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-[#14171F] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
            >
              <Menu className="w-5 h-5 text-orange-400" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white truncate">
                {profileName ? `Welcome back, ${profileName}!` : 'Welcome back!'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-[#1A1D24] border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} <span className="text-[10px] text-slate-500">CAT</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
          <Outlet context={{ user, onNavigate }} />
        </main>
      </div>
    </div>
  );
}
