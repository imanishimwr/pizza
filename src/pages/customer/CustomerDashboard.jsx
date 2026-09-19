import React, { useState } from 'react';
import { 
  User, 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Gift, 
  Heart, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  Sparkles,
  CreditCard,
  Award,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';

export default function CustomerDashboard({ 
  user, 
  orders = [], 
  onSelectOrder, 
  onOpenReferral, 
  onOpenProfile, 
  onExploreMenu 
}) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Stats calculations
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((acc, o) => acc + (o.totalRWF || 0), 0);
  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const loyaltyPoints = user?.points || totalOrders * 120 + 450;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Customer Dashboard Left Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 bg-surface-card border border-white/10 rounded-3xl p-5 space-y-6 h-fit sticky top-28 shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg">
            {user?.name ? user.name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div className="font-bold text-sm text-white truncate max-w-[130px]">{user?.name || 'Customer'}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">● Active Session</div>
          </div>
        </div>

        <nav className="space-y-1">
          <button onClick={onExploreMenu} className="w-full p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/40 font-bold text-xs flex items-center gap-2.5 transition-all">
            <Flame className="w-4 h-4" /> Browse Menu
          </button>
          <button onClick={onOpenProfile} className="w-full p-2.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-white text-xs font-semibold flex items-center gap-2.5 transition-all">
            <User className="w-4 h-4 text-blue-400" /> Account Settings
          </button>
          <button onClick={onOpenReferral} className="w-full p-2.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-white text-xs font-semibold flex items-center gap-2.5 transition-all">
            <Gift className="w-4 h-4 text-amber-400" /> Vouchers & Referral
          </button>
        </nav>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1 text-center">
          <div className="text-[10px] uppercase font-bold text-text-subdued">VIP Points</div>
          <div className="text-lg font-mono font-extrabold text-amber-400">{loyaltyPoints} Pts</div>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-950 via-surface-card to-surface-dark border border-primary/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl">
                {user?.name ? user.name[0].toUpperCase() : 'C'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    Welcome back, {user?.name || 'Gourmet Lover'}!
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Gold VIP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {user?.location || 'Nyarutarama, Kigali'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onExploreMenu}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
              >
                <Flame className="w-4 h-4" /> Order Hotpot Now
              </button>
              <button
                onClick={onOpenProfile}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-card border border-white/10 space-y-2 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalOrders}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +2 this week
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/10 space-y-2 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Spent</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalSpent.toLocaleString()} RWF</div>
          <div className="text-[11px] text-text-subdued">Includes hotpot & delivery</div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/10 space-y-2 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">HotPot Rewards</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{loyaltyPoints} PTS</div>
          <div className="text-[11px] text-amber-400/80 cursor-pointer hover:underline" onClick={onOpenReferral}>
            Redeem for free pizza & broth &rarr;
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/10 space-y-2 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Deliveries</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4 animate-spin-slow" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary">{activeOrders.length}</div>
          <div className="text-[11px] text-text-subdued">Real-time rider tracking</div>
        </div>
      </div>

      {/* Main Grid: Active Orders & Order History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Orders & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Live Orders Section */}
          {activeOrders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary animate-pulse" />
                Active Deliveries In-Progress
              </h2>

              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder && onSelectOrder(order)}
                    className="p-5 rounded-2xl bg-gradient-to-r from-primary-dark/40 to-surface-card border border-primary/50 hover:border-primary transition-all cursor-pointer space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-primary">#{order.id}</span>
                        <span className="text-xs text-text-muted">• {order.orderTime}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/40 animate-pulse">
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-white/90">
                          <span>{item.qty}x {item.name}</span>
                          <span className="font-mono text-text-muted">{(item.price * item.qty).toLocaleString()} RWF</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-text-muted">Rider on the way</span>
                      <span className="font-extrabold text-primary flex items-center gap-1">
                        Track Live Map <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Orders History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-text-muted" />
                Recent Orders
              </h2>
              <span className="text-xs text-text-muted">{orders.length} total</span>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center bg-surface-card rounded-2xl border border-white/5 space-y-3">
                <ShoppingBag className="w-10 h-10 text-text-subdued mx-auto" />
                <p className="text-text-muted text-xs">No order history found yet.</p>
                <button
                  onClick={onExploreMenu}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
                >
                  Order HotPot Gourmet
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-white/20 transition-all cursor-pointer space-y-3"
                    onClick={() => onSelectOrder && onSelectOrder(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">#{order.id}</span>
                        <span className="text-xs text-text-muted">• {order.orderTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'delivered' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                          'bg-blue-950/80 text-blue-400 border border-blue-500/40'
                        }`}>
                          {order.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReceipt(order);
                          }}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors text-[10px] flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-primary" /> Receipt
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-text-muted">
                          <span>{item.qty}x {item.name}</span>
                          <span className="font-mono">{(item.price || 0).toLocaleString()} RWF</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-text-muted line-clamp-1">{order.address}</span>
                      <span className="font-mono font-extrabold text-primary">
                        {(order.totalRWF || 0).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Customer Quick Perks & Favorites */}
        <div className="space-y-6">
          {/* Referral & Promo Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 to-surface-card border border-amber-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Refer Friends, Get 5,000 RWF</h3>
                <p className="text-xs text-text-muted">Share your HotPot link with friends in Kigali</p>
              </div>
            </div>
            <button
              onClick={onOpenReferral}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              Get My Voucher Code <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Favorite Hotpot Picks */}
          <div className="p-6 rounded-3xl bg-surface-card border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              Your Favorite HotPot Items
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🍲</span>
                  <div>
                    <div className="font-semibold text-white">Szechuan Spicy HotPot</div>
                    <div className="text-[10px] text-text-muted">Ordered 4 times</div>
                  </div>
                </div>
                <button onClick={onExploreMenu} className="text-primary font-bold hover:underline text-[11px]">
                  Reorder
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🍕</span>
                  <div>
                    <div className="font-semibold text-white">Pepperoni Deluxe Pizza</div>
                    <div className="text-[10px] text-text-muted">Ordered 2 times</div>
                  </div>
                </div>
                <button onClick={onExploreMenu} className="text-primary font-bold hover:underline text-[11px]">
                  Reorder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        order={selectedReceipt}
      />
      </div>
    </div>
  );
}
