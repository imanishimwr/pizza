import React, { useState } from "react";
import {
  User, ShoppingBag, Clock, MapPin, Gift, Heart, TrendingUp,
  CheckCircle2, ChevronRight, FileText, Sparkles, CreditCard,
  Award, Flame, ArrowUpRight, RefreshCw, Navigation, Radio,
  History, Zap
} from "lucide-react";
import ReceiptModal from "../../components/customer/ReceiptModal";

export default function CustomerDashboard({
  user, orders = [], onSelectOrder, onOpenReferral, onOpenProfile, onExploreMenu
}) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((acc, o) => acc + (o.totalRWF || 0), 0);
  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  );
  const loyaltyPoints = user?.points || totalOrders * 120 + 450;

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";
      case "delivery":
      case "delivering":
        return "bg-amber-950/80 text-amber-400 border-amber-500/40";
      case "preparing":
      case "cooking":
        return "bg-blue-950/80 text-blue-400 border-blue-500/40";
      case "cancelled":
        return "bg-red-950/80 text-red-400 border-red-500/40";
      default:
        return "bg-purple-950/80 text-purple-400 border-purple-500/40";
    }
  };

  const getProgressStep = (status) => {
    const map = { pending: 0, preparing: 1, delivery: 2, delivering: 2, delivered: 3 };
    return map[status?.toLowerCase()] ?? 0;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto pb-24 lg:pb-12 animate-page-enter">

      {/* ── Left Sidebar ── */}
      <aside className="w-full lg:w-64 shrink-0 sticky top-24 h-fit space-y-4">

        {/* Profile Card */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shrink-0 shadow-lg" style={{ background: "linear-gradient(135deg,#AE3200 0%,#E65100 100%)" }}>
              {user?.name ? user.name[0].toUpperCase() : "C"}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">{user?.name || "Customer"}</div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Session
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          <nav className="space-y-2">
            <button onClick={onExploreMenu} className="w-full p-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all shadow-md text-white" style={{ background: "linear-gradient(135deg,#AE3200 0%,#E65100 100%)" }}>
              <Flame className="w-4 h-4 text-yellow-300" /> Browse Menu
            </button>
            <button onClick={onOpenProfile} className="w-full p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all hover:text-white" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#A0A0B0" }}>
              <User className="w-4 h-4 text-blue-400" /> Account Settings
            </button>
            <button onClick={onOpenReferral} className="w-full p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all hover:text-white" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#A0A0B0" }}>
              <Gift className="w-4 h-4 text-amber-400" /> Vouchers &amp; Referral
            </button>
          </nav>
        </div>

        {/* VIP Rewards */}
        <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(28,28,36,0.95) 100%)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: "#6C6C80" }}>VIP Rewards Balance</div>
          <div className="text-2xl font-mono font-extrabold text-amber-400">{loyaltyPoints.toLocaleString()}</div>
          <div className="text-xs font-bold mt-0.5" style={{ color: "rgba(245,158,11,0.6)" }}>Points</div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 space-y-6 min-w-0">

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: "linear-gradient(135deg,rgba(174,50,0,0.22) 0%,rgba(28,28,36,0.98) 70%)", border: "1px solid rgba(174,50,0,0.22)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(174,50,0,0.15) 0%,transparent 70%)" }} />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shrink-0" style={{ background: "linear-gradient(135deg,#AE3200 0%,#E65100 100%)" }}>
                {user?.name ? user.name[0].toUpperCase() : "C"}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Welcome back, {user?.name || "Gourmet Lover"}!
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
                    <Award className="w-3 h-3" /> Gold VIP Member
                  </span>
                </div>
                <p className="text-xs sm:text-sm flex items-center gap-2" style={{ color: "#A0A0B0" }}>
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  {user?.address || user?.location || "Nyarutarama, Kigali"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button onClick={onExploreMenu} className="px-5 py-2.5 rounded-xl font-bold text-xs text-white flex items-center gap-2 transition-all hover:scale-105 shadow-lg" style={{ background: "linear-gradient(135deg,#AE3200 0%,#E65100 100%)", boxShadow: "0 4px 18px rgba(174,50,0,0.4)" }}>
                <Flame className="w-4 h-4 text-yellow-300" /> Order Hotpot Now
              </button>
              <button onClick={onOpenProfile} className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Orders */}
          <div className="group flex flex-col justify-between p-5 rounded-2xl transition-all" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.07)", minHeight: "120px" }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6C6C80" }}>Total Orders</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white tabular-nums">{totalOrders}</div>
            </div>
            <div className="pt-3 mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <TrendingUp className="w-3.5 h-3.5" /> Active account
            </div>
          </div>

          {/* Total Spent */}
          <div className="group flex flex-col justify-between p-5 rounded-2xl transition-all" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.07)", minHeight: "120px" }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6C6C80" }}>Total Spent</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="font-black font-mono text-white leading-tight" style={{ fontSize: totalSpent > 99999 ? "1.1rem" : "1.5rem" }}>
                {totalSpent.toLocaleString()} <span className="text-sm font-semibold" style={{ color: "#A0A0B0" }}>RWF</span>
              </div>
            </div>
            <div className="pt-3 mt-3 text-[11px]" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#6C6C80" }}>
              Gourmet &amp; Kigali delivery
            </div>
          </div>

          {/* Rewards Points */}
          <div className="group flex flex-col justify-between p-5 rounded-2xl transition-all cursor-pointer" onClick={onOpenReferral} style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08) 0%,#1c1c24 100%)", border: "1px solid rgba(245,158,11,0.15)", minHeight: "120px" }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6C6C80" }}>Rewards Points</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-amber-400 tabular-nums">{loyaltyPoints.toLocaleString()}</div>
            </div>
            <div className="pt-3 mt-3 text-[11px] font-semibold text-amber-500 flex items-center gap-1" style={{ borderTop: "1px solid rgba(245,158,11,0.12)" }}>
              Redeem for vouchers <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Active Rides */}
          <div className="group flex flex-col justify-between p-5 rounded-2xl transition-all" style={{ background: activeOrders.length > 0 ? "linear-gradient(135deg,rgba(174,50,0,0.12) 0%,#1c1c24 100%)" : "#1c1c24", border: activeOrders.length > 0 ? "1px solid rgba(174,50,0,0.3)" : "1px solid rgba(255,255,255,0.07)", minHeight: "120px" }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6C6C80" }}>Active Rides</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: activeOrders.length > 0 ? "rgba(174,50,0,0.15)" : "rgba(255,255,255,0.05)", color: activeOrders.length > 0 ? "#FF6B35" : "#6C6C80" }}>
                  {activeOrders.length > 0 ? <Radio className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
                </div>
              </div>
              <div className="text-3xl font-black font-mono tabular-nums" style={{ color: activeOrders.length > 0 ? "#FF6B35" : "#fff" }}>
                {activeOrders.length}
              </div>
            </div>
            <div className="pt-3 mt-3 text-[11px]" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#6C6C80" }}>
              {activeOrders.length > 0 ? "Live rider tracking active" : "Real-time rider tracking"}
            </div>
          </div>
        </div>

        {/* ── 2-col Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* ACTIVE DELIVERIES — live section */}
            {activeOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#AE3200" }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#AE3200" }} />
                  </span>
                  <h2 className="text-base font-extrabold text-white tracking-tight">Active Deliveries</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(174,50,0,0.2)", color: "#FF6B35", border: "1px solid rgba(174,50,0,0.35)" }}>In Progress</span>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,rgba(174,50,0,0.3),transparent)" }} />
                  <span className="text-[11px] font-mono" style={{ color: "#6C6C80" }}>{activeOrders.length} active</span>
                </div>

                <div className="space-y-3">
                  {activeOrders.map((order) => {
                    const step = getProgressStep(order.status);
                    return (
                      <div key={order.id} onClick={() => onSelectOrder && onSelectOrder(order)} className="group cursor-pointer" style={{ background: "linear-gradient(135deg,rgba(174,50,0,0.10) 0%,#1c1c24 100%)", border: "1px solid rgba(174,50,0,0.35)", borderRadius: "16px", padding: "18px 20px", boxShadow: "0 4px 20px rgba(174,50,0,0.1)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm" style={{ color: "#FF6B35" }}>#{order.id}</span>
                            <span className="text-xs" style={{ color: "#6C6C80" }}>• {order.orderTime}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: "currentColor", verticalAlign: "middle" }} />
                            {order.status}
                          </span>
                        </div>

                        {/* Progress dots */}
                        <div className="flex items-center gap-1 mb-2">
                          {["Placed","Preparing","On Way","Done"].map((label, i) => (
                            <React.Fragment key={i}>
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full transition-all" style={{ background: i <= step ? "#FF6B35" : "rgba(255,255,255,0.12)", boxShadow: i === step ? "0 0 6px rgba(255,107,53,0.8)" : "none" }} />
                              </div>
                              {i < 3 && <div className="flex-1 h-px rounded-full" style={{ background: i < step ? "#FF6B35" : "rgba(255,255,255,0.08)" }} />}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="flex justify-between mb-3">
                          {["Placed","Preparing","On Way","Done"].map((label, i) => (
                            <span key={i} className="text-[9px] font-semibold" style={{ color: i <= step ? "#FF6B35" : "#6C6C80" }}>{label}</span>
                          ))}
                        </div>

                        <div className="space-y-1 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span style={{ color: "rgba(255,255,255,0.85)" }}>{item.qty}x {item.name}</span>
                              <span className="font-mono" style={{ color: "#A0A0B0" }}>{(item.price * item.qty).toLocaleString()} RWF</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <span className="flex items-center gap-1.5" style={{ color: "#A0A0B0" }}>
                            <Navigation className="w-3 h-3 text-primary" /> Rider on the way
                          </span>
                          <span className="font-extrabold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "#FF6B35" }}>
                            Track Live Map <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RECENT ORDERS — history */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <History className="w-4 h-4" style={{ color: "#6C6C80" }} />
                <h2 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>Recent Orders</h2>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-[11px] font-mono" style={{ color: "#6C6C80" }}>{orders.length} total</span>
              </div>

              {orders.length === 0 ? (
                <div className="py-14 text-center rounded-2xl space-y-3" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <ShoppingBag className="w-10 h-10 mx-auto" style={{ color: "#6C6C80" }} />
                  <p className="text-xs" style={{ color: "#A0A0B0" }}>No order history yet.</p>
                  <button onClick={onExploreMenu} className="btn-primary text-xs py-2 px-5 inline-flex items-center gap-2 mt-2">Order HotPot Gourmet</button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((order) => (
                    <div key={order.id} className="group cursor-pointer" onClick={() => onSelectOrder && onSelectOrder(order)} style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "14px 16px" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs" style={{ color: "#fbbf24" }}>#{order.id}</span>
                          <span className="text-xs" style={{ color: "#6C6C80" }}>• {order.orderTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedReceipt(order); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#A0A0B0" }}>
                            <FileText className="w-3 h-3 text-primary" /> Receipt
                          </button>
                        </div>
                      </div>
                      <div className="space-y-0.5 mb-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs" style={{ color: "#A0A0B0" }}>
                            <span>{item.qty}x {item.name}</span>
                            <span className="font-mono">{(item.price || 0).toLocaleString()} RWF</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="line-clamp-1 max-w-[60%]" style={{ color: "#6C6C80" }}>{order.address}</span>
                        <span className="font-mono font-extrabold" style={{ color: "#FF6B35" }}>{(order.totalRWF || 0).toLocaleString()} RWF</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Referral */}
            <div className="p-5 rounded-2xl space-y-4" style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08) 0%,#1c1c24 100%)", border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Refer Friends, Get 5,000 RWF</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#A0A0B0" }}>Share your HotPot link with friends in Kigali</p>
                </div>
              </div>
              <button onClick={onOpenReferral} className="w-full py-2.5 rounded-xl font-extrabold text-xs text-black flex items-center justify-center gap-2 shadow-md transition-all hover:brightness-110" style={{ background: "#f59e0b" }}>
                Get My Voucher Code <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Favorites */}
            <div className="p-5 rounded-2xl space-y-4" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary fill-primary" /> Your Favorite HotPot Items
              </h3>
              <div className="space-y-3">
                {[{ emoji: "🍲", name: "Szechuan Spicy HotPot", count: 4 }, { emoji: "🍕", name: "Pepperoni Deluxe Pizza", count: 2 }].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs" style={i === 0 ? { paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" } : {}}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{item.emoji}</span>
                      <div>
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "#6C6C80" }}>Ordered {item.count} times</div>
                      </div>
                    </div>
                    <button onClick={onExploreMenu} className="px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all hover:brightness-110 shrink-0" style={{ background: "rgba(174,50,0,0.12)", border: "1px solid rgba(174,50,0,0.25)", color: "#FF6B35" }}>
                      <RefreshCw className="w-3 h-3" /> Reorder
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-5 rounded-2xl space-y-3" style={{ background: "#1c1c24", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Quick Stats
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Avg. Order Value", value: totalOrders > 0 ? `${Math.round(totalSpent / totalOrders).toLocaleString()} RWF` : "—" },
                  { label: "Orders This Month", value: String(Math.min(totalOrders, 3)) },
                  { label: "Membership Tier", value: "Gold VIP" },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: "#6C6C80" }}>{stat.label}</span>
                    <span className="font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} order={selectedReceipt} />
    </div>
  );
}
