import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Home from './components/customer/Home';
import FoodDetailModal from './components/customer/FoodDetailModal';
import CartDrawer from './components/customer/CartDrawer';
import CheckoutModal from './components/customer/CheckoutModal';
import LiveTracking from './components/customer/LiveTracking';
import AuthModal from './components/customer/AuthModal';
import CustomerDashboard from './components/customer/CustomerDashboard';
import OrdersHistory from './components/customer/OrdersHistory';
import ReferralModal from './components/customer/ReferralModal';
import HelpModal from './components/customer/HelpModal';
import ProfileModal from './components/customer/ProfileModal';
import LocationModal from './components/LocationModal';
import KitchenBoard from './components/kitchen/KitchenBoard';
import RiderDashboard from './components/delivery/RiderDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import { apiService } from './services/apiService';
import { eventBus } from './services/eventBus';
import { notificationService } from './services/notificationService';
import { Bell, CheckCircle2, Flame } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('customer'); // customer | kitchen | delivery | admin
  const [activeTab, setActiveTab] = useState('menu'); // menu | orders | tracking | dashboard
  
  // Dynamic Persistent Food Catalog & Orders State
  const [meals, setMeals] = useState(() => apiService.getMeals());
  const [orders, setOrders] = useState(() => apiService.getOrders());
  const [user, setUser] = useState(() => apiService.getUser());
  const [cart, setCart] = useState([]);
  
  // Toast Alert State
  const [toast, setToast] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals & Drawers
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [trackedOrder, setTrackedOrder] = useState(orders[0] || null);

  // Cross-Tab Event Listeners & Audio Notifications
  useEffect(() => {
    const unsubOrder = eventBus.on('NEW_ORDER', (newOrder, isCrossTab) => {
      if (isCrossTab) {
        setOrders(apiService.getOrders());
        showToast(`New Order #${newOrder.id} received!`, 'Incoming Order');
        notificationService.playChime('new_order');
        notificationService.sendDesktopNotification(`New Order #${newOrder.id}`, {
          body: `Order total: ${newOrder.totalRWF} RWF`
        });
      }
    });

    const unsubStatus = eventBus.on('ORDER_STATUS_UPDATE', ({ orderId, status }, isCrossTab) => {
      if (isCrossTab) {
        setOrders(apiService.getOrders());
        showToast(`Order #${orderId} status changed to ${status.toUpperCase()}`, 'Order Updated');
        notificationService.playChime('status_update');
      }
    });

    return () => {
      unsubOrder();
      unsubStatus();
    };
  }, []);

  // Save changes to localStorage automatically
  useEffect(() => {
    apiService.saveMeals(meals);
  }, [meals]);

  useEffect(() => {
    apiService.saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    apiService.saveUser(user);
  }, [user]);

  // Toast alert trigger
  const showToast = (message, title = 'Notification') => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };


  // Cart Operations
  const handleAddToCart = (cartItem) => {
    setCart((prev) => [...prev, cartItem]);
    setIsCartOpen(true);
    showToast(`Added ${cartItem.meal.name} to order!`, 'Item Added');
  };

  const handleUpdateQty = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
    } else {
      setCart((prev) => {
        const next = [...prev];
        next[index].quantity = newQty;
        return next;
      });
    }
  };

  const handleRemoveCartItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Order Operations
  const handleOrderPlaced = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setTrackedOrder(newOrder);
    setActiveTab('tracking');

    // Trigger event notification & chime
    eventBus.emit('NEW_ORDER', newOrder);
    notificationService.playChime('new_order');
    showToast(`Order #${newOrder.id} placed successfully! Kitchen is on it.`, 'Order Placed');
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (trackedOrder && trackedOrder.id === orderId) {
      setTrackedOrder((prev) => ({ ...prev, status: newStatus }));
    }
    
    // Broadcast status change to other tabs & play audio chime
    eventBus.emit('ORDER_STATUS_UPDATE', { orderId, status: newStatus });
    notificationService.playChime('status_update');
    showToast(`Order #${orderId} status updated to: ${newStatus.toUpperCase()}`, 'Status Update');
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col justify-between selection:bg-primary selection:text-white relative">
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl bg-surface-card border border-primary/40 shadow-2xl flex items-center gap-4 animate-toast-enter min-w-[320px]">
          <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce-short" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-text-main">{toast.title}</div>
            <div className="text-xs text-text-muted mt-0.5">{toast.message}</div>
          </div>
          {/* Progress bar simulation */}
          <div className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-xl animate-[shimmer_4s_linear]" style={{ width: '100%' }}></div>
        </div>
      )}

      {/* Header with Role Switcher */}
      <Header
        currentRole={currentRole}
        onSwitchRole={setCurrentRole}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenReferral={() => setIsReferralOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        user={user}
        onLogout={() => setUser(null)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
        <div key={activeTab + currentRole} className="animate-page-enter">
          {/* Customer Portal */}
          {currentRole === 'customer' && (
          <>
            {activeTab === 'menu' && (
              <Home
                meals={meals}
                onSelectMeal={setSelectedMeal}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            )}

            {activeTab === 'tracking' && (
              <LiveTracking order={trackedOrder || orders[0]} />
            )}

            {(activeTab === 'orders' || activeTab === 'dashboard') && (
              <CustomerDashboard
                user={user}
                orders={orders}
                onSelectOrder={(order) => {
                  setTrackedOrder(order);
                  setActiveTab('tracking');
                }}
                onOpenReferral={() => setIsReferralOpen(true)}
                onOpenProfile={() => setIsProfileOpen(true)}
                onExploreMenu={() => setActiveTab('menu')}
              />
            )}
          </>
        )}

        {/* Kitchen Staff Portal */}
        {currentRole === 'kitchen' && (
          <KitchenBoard
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {/* Delivery Rider Portal */}
        {currentRole === 'delivery' && (
          <RiderDashboard
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {/* Admin Portal */}
        {currentRole === 'admin' && (
          <AdminDashboard
            meals={meals}
            setMeals={setMeals}
            orders={orders}
          />
        )}
        </div>
      </main>

      {/* Modals & Drawers */}
      <FoodDetailModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={(data) => setCheckoutData(data)}
      />

      <CheckoutModal
        isOpen={!!checkoutData}
        onClose={() => setCheckoutData(null)}
        checkoutData={checkoutData}
        onOrderPlaced={handleOrderPlaced}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          if (u.role) setCurrentRole(u.role);
          if (!u.location) setIsLocationModalOpen(true);
        }}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSetLocation={(loc) => {
          setUser(prev => ({ ...prev, location: loc }));
          showToast(`Location set to: ${loc}`, 'Location Updated');
        }}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSaveUser={(u) => setUser(u)}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-surface-dark py-12 px-4 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-lg flex items-center justify-center md:justify-start gap-2">
              <Flame className="w-5 h-5 text-primary" /> HotPot Delights
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Authentic Gourmet Hotpot & Pizza Delivery in Kigali.<br/>
              Made with fresh, locally sourced ingredients.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Download Our App</h4>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button className="bg-white text-black px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.33-.79 3.83-.71 1.63.09 2.87.69 3.55 1.77-3.01 1.7-2.5 5.56.39 6.78-.71 1.78-1.55 3.32-2.85 4.33zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.35-1.92 4.34-3.74 4.25z"/></svg>
                App Store
              </button>
              <button className="bg-white text-black px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.5 14.1l-6-3.3v-4.1l6 3.4c.5.3.8.8.8 1.4s-.3 1.1-.8 1.4c-.1.1-.1.1-.2.2-1.3.7-4.4 2.4-5.8 3.2v-4.2l6-3.4zm-11 5.9V4.1c0-.6.3-1.1.8-1.4.3-.2.6-.2.9-.1l4.8 2.7v13.4l-4.8 2.7c-.3.2-.6.2-.9.1-.5-.2-.8-.8-.8-1.4z"/></svg>
                Google Play
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Contact Us</h4>
            <div className="text-xs text-text-muted space-y-1">
              <p>KG 9 Ave, Nyarutarama, Kigali</p>
              <p>+250 788 000 001</p>
              <p>hello@hotpotdelights.rw</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center justify-center gap-2 text-center text-[11px] text-text-subdued">
          <p className="font-semibold text-text-muted">
            HotPot Delights © {new Date().getFullYear()} — Premium Kigali Dining Experience
          </p>
          <p>Live Backend: <span className="font-mono text-primary">hotpot-backend-tsae.onrender.com</span></p>
        </div>
      </footer>
    </div>
  );
}
