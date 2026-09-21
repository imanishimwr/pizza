import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Home from './pages/customer/Home';
import ProductDetailsPage from './pages/customer/ProductDetailsPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import LiveTracking from './pages/customer/LiveTracking';
import OrdersHistory from './pages/customer/OrdersHistory';
import KitchenBoard from './pages/kitchen/KitchenBoard';
import RiderDashboard from './pages/delivery/RiderDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CartDrawer from './components/customer/CartDrawer';
import CheckoutModal from './components/customer/CheckoutModal';
import AuthModal from './components/customer/AuthModal';
import LocationModal from './components/LocationModal';
import ReferralModal from './components/customer/ReferralModal';
import HelpModal from './components/customer/HelpModal';
import ProfileModal from './components/customer/ProfileModal';
import CustomPizzaBuilderModal from './components/customer/CustomPizzaBuilderModal';
import MobileBottomNav from './components/MobileBottomNav';
import { apiService } from './services/apiService';
import { eventBus } from './services/eventBus';
import { notificationService } from './services/notificationService';
import { Bell, Flame } from 'lucide-react';
import { io } from 'socket.io-client';

function getRouteFromPath(pathname) {
  const path = (pathname || '/').toLowerCase();
  if (path.startsWith('/kitchen')) return { role: 'kitchen', tab: 'kitchen' };
  if (path.startsWith('/delivery') || path.startsWith('/rider')) return { role: 'delivery', tab: 'delivery' };
  if (path.startsWith('/admin')) return { role: 'admin', tab: 'admin' };
  if (path.startsWith('/tracking')) return { role: 'customer', tab: 'tracking' };
  if (path.startsWith('/orders')) return { role: 'customer', tab: 'orders' };
  if (path.startsWith('/dashboard')) return { role: 'customer', tab: 'dashboard' };
  if (path.startsWith('/product')) return { role: 'customer', tab: 'product-detail' };
  return { role: 'customer', tab: 'menu' };
}

export default function App() {
  const initialRoute = typeof window !== 'undefined'
    ? getRouteFromPath(window.location.pathname)
    : { role: 'customer', tab: 'menu' };

  const [currentRole, setCurrentRole] = useState(initialRoute.role);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [meals, setMeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(() => apiService.getUser());
  const [cart, setCart] = useState(() => apiService.getCart());
  const [wishlist, setWishlist] = useState(() => apiService.getWishlist());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lang, setLang] = useState('EN');
  const [theme, setTheme] = useState('dark');
  const [toast, setToast] = useState(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };
  const [selectedMeal, setSelectedMeal] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) {
        try {
          const cached = localStorage.getItem('hotpot_meals_v1');
          const list = cached ? JSON.parse(cached) : [];
          if (Array.isArray(list)) {
            const found = list.find((meal) => String(meal.id) === String(id));
            if (found) return found;
          }
        } catch (e) {}
      }
    }
    return null;
  });
  const [trackedOrder, setTrackedOrder] = useState(() => {
    const savedId = apiService.getTrackedOrderId();
    return savedId ? { id: savedId } : null; // We will enrich this once orders load
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  // Client-specific orders filter (client sees ONLY their own orders, admin sees ALL orders)
  const clientOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    if (!user) {
      const savedTrackedId = apiService.getTrackedOrderId();
      return savedTrackedId ? orders.filter(o => o.id === savedTrackedId) : [];
    }
    return orders.filter(o => {
      const matchUserId = o.userId && user.id && String(o.userId) === String(user.id);
      const matchEmail = (o.userEmail && user.email && o.userEmail.toLowerCase() === user.email.toLowerCase()) || 
                         (o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase());
      const matchPhone = o.phone && user.phone && o.phone.trim() === user.phone.trim();
      const matchName = o.customerName && user.name && o.customerName.toLowerCase().trim() === user.name.toLowerCase().trim();
      const matchTracked = apiService.getTrackedOrderId() === o.id;
      return matchUserId || matchEmail || matchPhone || matchName || matchTracked;
    });
  }, [orders, user]);

  const showToast = useCallback((message, title = 'Notification') => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load Initial Data from Backend
  useEffect(() => {
    const loadData = async () => {
      const fetchedMeals = await apiService.getMeals();
      setMeals(fetchedMeals);

      const fetchedOrders = await apiService.getOrders();
      setOrders(fetchedOrders);

      const trackedId = apiService.getTrackedOrderId();
      if (trackedId) {
        const found = fetchedOrders.find(o => o.id === trackedId);
        if (found) setTrackedOrder(found);
      }
    };
    loadData();
  }, []);

  // Sync state to local storage is no longer primary for meals/orders, but keeping it for offline fallback if needed.
  useEffect(() => {
    if (meals.length > 0) apiService.saveMeals?.(meals);
  }, [meals]);

  useEffect(() => {
    if (orders.length > 0) apiService.saveOrders?.(orders);
  }, [orders]);

  useEffect(() => {
    apiService.saveUser(user);
  }, [user]);

  useEffect(() => {
    apiService.saveCart(cart);
  }, [cart]);

  useEffect(() => {
    apiService.saveWishlist(wishlist);
  }, [wishlist]);

  useEffect(() => {
    // 1. Live Socket.IO connection for instant real-time synchronization
    const backendUrl = 'http://localhost:5000';
    let socket;
    try {
      socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on('new_order_placed', (newOrder) => {
        if (!newOrder) return;
        setOrders((prev) => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev;
          return [newOrder, ...prev];
        });
        eventBus.emit('NEW_ORDER', newOrder, true);
      });

      socket.on('order_status_updated', (updatedOrder) => {
        if (!updatedOrder) return;
        setOrders((prev) => {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        });
        eventBus.emit('ORDER_STATUS_UPDATE', { orderId: updatedOrder.id, status: updatedOrder.status, order: updatedOrder }, true);
      });

      socket.on('order_cancelled', (cancelledOrder) => {
        if (!cancelledOrder) return;
        setOrders((prev) => {
          return prev.map(o => o.id === cancelledOrder.id ? { ...o, status: 'cancelled' } : o);
        });
      });
    } catch (e) {
      console.warn('Socket.io connection initialization error:', e);
    }

    // 2. Background Heartbeat Polling every 3.5 seconds to guarantee 100% real-time data sync without user refresh
    const pollInterval = setInterval(async () => {
      try {
        const freshOrders = await apiService.getOrders();
        if (Array.isArray(freshOrders)) {
          setOrders(freshOrders);
        }
      } catch (err) {
        // quiet suppression on background poll
      }
    }, 3500);

    const unsubOrder = eventBus.on('NEW_ORDER', async (newOrder, isCrossTab) => {
      if (isCrossTab) {
        const freshOrders = await apiService.getOrders();
        setOrders(Array.isArray(freshOrders) ? freshOrders : []);
        showToast(`New Order #${newOrder.id} received!`, 'Incoming Order');
        notificationService.playChime('new_order');
        notificationService.sendDesktopNotification(`New Order #${newOrder.id}`, {
          body: `Order total: ${newOrder.totalRWF} RWF`,
        });
      }
    });

    const unsubStatus = eventBus.on('ORDER_STATUS_UPDATE', async ({ orderId, status }, isCrossTab) => {
      const freshOrders = await apiService.getOrders();
      setOrders(Array.isArray(freshOrders) ? freshOrders : []);

      const matchingOrder = Array.isArray(freshOrders) ? freshOrders.find(o => o.id === orderId) : null;
      const isMyOrder = (trackedOrder && trackedOrder.id === orderId) || (user && matchingOrder && matchingOrder.userId === user.id);
      const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN' || currentRole === 'admin';

      if (status === 'ready') {
        notificationService.playChime('order_ready');
        if (isAdmin) {
          showToast(`Cooker confirmed Order #${orderId} is freshly prepared & packed! Ready for rider dispatch.`, '🍲 Kitchen Order Ready');
          notificationService.sendDesktopNotification(`Order #${orderId} Ready!`, {
            body: `Cooker has confirmed Order #${orderId} is ready for delivery dispatch.`
          });
        } else if (isMyOrder) {
          showToast(`Your Order #${orderId} is freshly cooked and ready! Moto rider is preparing for pickup.`, '🎉 Your Meal is Ready!');
          notificationService.sendDesktopNotification('Your Food is Ready! 🍲', {
            body: `Order #${orderId} is cooked & packed! Watch the live tracking map.`
          });
        } else {
          showToast(`Order #${orderId} is ready from the kitchen!`, 'Kitchen Update');
        }
      } else if (status === 'delivery') {
        notificationService.playChime('status_update');
        if (isAdmin) {
          const rev = matchingOrder?.totalRWF ? `${Number(matchingOrder.totalRWF).toLocaleString()} RWF` : '';
          showToast(`Order #${orderId} ${rev ? `(${rev}) ` : ''}sold & handed to rider! Logged in Sales Report.`, '💰 Order Sold & Dispatched');
          notificationService.sendDesktopNotification(`Sale Recorded: #${orderId}`, {
            body: `Order #${orderId} handed to courier. Sale saved in Admin Financial Report.`
          });
        } else if (isMyOrder) {
          showToast(`Your Order #${orderId} has been handed to the rider and is on its way!`, '🛵 Out for Delivery');
        } else {
          showToast(`Order #${orderId} handed to delivery rider.`, 'Delivery Update');
        }
      } else {
        notificationService.playChime('status_update');
        showToast(`Order #${orderId} status updated to: ${status.toUpperCase()}`, 'Order Updated');
      }
    });

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollInterval);
      unsubOrder();
      unsubStatus();
    };
  }, [showToast, user, currentRole, trackedOrder]);

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromPath(window.location.pathname);
      setCurrentRole(route.role);
      setActiveTab(route.tab);
      if (route.tab === 'product-detail') {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
          const found = meals.find((meal) => String(meal.id) === String(id));
          if (found) setSelectedMeal(found);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [meals]);

  const handleNavigate = (path, tabName, roleName) => {
    const targetRole = roleName || (
      path.includes('kitchen')
        ? 'kitchen'
        : path.includes('delivery') || path.includes('rider')
          ? 'delivery'
          : path.includes('admin')
            ? 'admin'
            : 'customer'
    );

    const targetTab = tabName || (
      path.includes('tracking')
        ? 'tracking'
        : path.includes('orders')
          ? 'orders'
          : path.includes('dashboard')
            ? 'dashboard'
            : path.includes('product')
              ? 'product-detail'
              : 'menu'
    );

    setCurrentRole(targetRole);
    setActiveTab(targetTab);

    if (typeof window !== 'undefined' && window.history) {
      if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({}, '', path);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectMeal = (meal) => {
    setSelectedMeal(meal);
    handleNavigate(`/product?id=${meal.id}`, 'product-detail', 'customer');
  };

  const handleToggleWishlist = (meal) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => (typeof item === 'string' ? item === meal.id : item.id === meal.id));
      const next = exists
        ? prev.filter((item) => (typeof item === 'string' ? item !== meal.id : item.id !== meal.id))
        : [...prev, meal];

      apiService.saveWishlist(next);
      showToast(
        exists ? `Removed ${meal.name} from wishlist` : `Added ${meal.name} to wishlist!`,
        exists ? 'Wishlist Updated' : 'Saved to Wishlist'
      );
      return next;
    });
  };

  const handleAddToCart = (cartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.meal.id === cartItem.meal.id &&
          item.selectedSpice === cartItem.selectedSpice &&
          item.selectedBroth === cartItem.selectedBroth
      );

      let next;
      if (existingIndex !== -1) {
        next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + cartItem.quantity,
        };
      } else {
        next = [...prev, cartItem];
      }

      apiService.saveCart(next);
      return next;
    });

    setIsCartOpen(true);
    showToast(`Added ${cartItem.meal.name} to order!`, 'Item Added');
  };

  const handleUpdateQty = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      next[index].quantity = newQty;
      apiService.saveCart(next);
      return next;
    });
  };

  const handleRemoveCartItem = (index) => {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== index);
      apiService.saveCart(next);
      return next;
    });
  };

  const handleOrderPlaced = async (newOrder) => {
    try {
      const createdOrder = await apiService.createOrder({
        ...newOrder,
        userId: user ? user.id : null,
        userEmail: user ? user.email : (newOrder.email || null),
        customerName: user?.name || newOrder.customerName || 'Customer',
        phone: user?.phone || newOrder.phone || ''
      });

      setOrders((prev) => {
        const next = [createdOrder, ...prev];
        return next;
      });

      setCart([]);
      setTrackedOrder(createdOrder);
      apiService.setTrackedOrderId(createdOrder.id);

      eventBus.emit('NEW_ORDER', createdOrder);
      notificationService.playChime('new_order');
      showToast(`Order #${createdOrder.id} placed successfully! Kitchen is on it.`, 'Order Placed');
      handleNavigate('/tracking', 'tracking', 'customer');
    } catch (e) {
      showToast('Failed to place order. Please try again.', 'Error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token'); // Use auth token for admin
      const updatedOrder = await apiService.updateOrderStatus(orderId, newStatus, null, token);
      
      setOrders((prev) => {
        const next = prev.map((order) => (order.id === orderId ? updatedOrder : order));
        return next;
      });

      if (trackedOrder && trackedOrder.id === orderId) {
        setTrackedOrder(updatedOrder);
      }

      eventBus.emit('ORDER_STATUS_UPDATE', { orderId, status: newStatus, order: updatedOrder });
      
      if (newStatus === 'ready') {
        notificationService.playChime('order_ready');
        showToast(`Order #${orderId} is confirmed READY by cooker! Ready for rider dispatch.`, '🍲 Kitchen Order Ready');
      } else {
        notificationService.playChime('status_update');
        showToast(`Order #${orderId} status updated to: ${newStatus.toUpperCase()}`, 'Status Update');
      }
    } catch (e) {
      showToast('Failed to update order status.', 'Error');
    }
  };

  const handleCancelOrder = (orderId) => {
    setOrders((prev) => {
      const next = prev.map((order) => (order.id === orderId ? { ...order, status: 'cancelled' } : order));
      apiService.saveOrders(next);
      return next;
    });

    if (trackedOrder && trackedOrder.id === orderId) {
      setTrackedOrder((prev) => ({ ...prev, status: 'cancelled' }));
    }

    showToast(`Order #${orderId} has been cancelled successfully.`, 'Order Cancelled');
  };

  const handleModifyOrder = (orderId, updatedFields) => {
    setOrders((prev) => {
      const next = prev.map((order) => (order.id === orderId ? { ...order, ...updatedFields } : order));
      apiService.saveOrders(next);
      return next;
    });

    if (trackedOrder && trackedOrder.id === orderId) {
      setTrackedOrder((prev) => ({ ...prev, ...updatedFields }));
    }

    showToast(`Order #${orderId} details updated!`, 'Order Modified');
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col justify-between selection:bg-primary selection:text-white relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl bg-surface-card border border-primary/40 shadow-2xl flex items-center gap-4 animate-toast-enter min-w-[320px]">
          <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce-short" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-text-main">{toast.title}</div>
            <div className="text-xs text-text-muted mt-0.5">{toast.message}</div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-xl" style={{ width: '100%' }}></div>
        </div>
      )}

      <Header
        currentRole={currentRole}
        onSwitchRole={(role) => handleNavigate(role === 'kitchen' ? '/kitchen' : role === 'delivery' ? '/delivery' : role === 'admin' ? '/admin' : '/', 'menu', role)}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenReferral={() => setIsReferralOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        user={user}
        onLogout={() => {
          setUser(null);
          apiService.saveUser(null);
          showToast('You have been logged out.', 'Signed Out');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab === 'dashboard' ? '/dashboard' : tab === 'orders' ? '/orders' : tab === 'tracking' ? '/tracking' : '/', tab, 'customer')}
        onNavigate={handleNavigate}
        lang={lang}
        setLang={setLang}
        theme={theme}
        toggleTheme={toggleTheme}
        meals={meals}
        onSelectMeal={handleSelectMeal}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 flex-1 w-full relative">
        <div key={activeTab + currentRole} className="animate-page-enter">
          {currentRole === 'customer' && (
            <>
              {activeTab === 'menu' && (
                <Home
                  meals={meals}
                  onSelectMeal={handleSelectMeal}
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  cart={cart}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onOpenCustomBuilder={() => setIsCustomBuilderOpen(true)}
                  onAddToCart={handleAddToCart}
                  onOpenCart={() => setIsCartOpen(true)}
                />
              )}

              {activeTab === 'product-detail' && (
                <ProductDetailsPage
                  meal={selectedMeal || meals[0]}
                  allMeals={meals}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQty={handleUpdateQty}
                  onRemoveCartItem={handleRemoveCartItem}
                  onOpenCart={() => setIsCartOpen(true)}
                  onSelectMeal={handleSelectMeal}
                  onBackToMenu={() => handleNavigate('/', 'menu', 'customer')}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                />
              )}

              {activeTab === 'dashboard' && (
                (user?.role || '').toUpperCase() === 'ADMIN' ? (
                  <AdminDashboard
                    meals={meals}
                    setMeals={setMeals}
                    orders={orders}
                    onUpdateStatus={handleUpdateOrderStatus}
                    user={user}
                  />
                ) : (user?.role || '').toUpperCase() === 'KITCHEN' ? (
                  <KitchenBoard
                    orders={orders}
                    onUpdateStatus={handleUpdateOrderStatus}
                    user={user}
                    meals={meals}
                  />
                ) : (user?.role || '').toUpperCase() === 'DELIVERY' || (user?.role || '').toUpperCase() === 'RIDER' ? (
                  <RiderDashboard orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
                ) : (
                  <CustomerDashboard
                    user={user}
                    orders={clientOrders}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    onAddToCart={handleAddToCart}
                    onOpenCart={() => setIsCartOpen(true)}
                    onUpdateUser={(updatedUser) => {
                      setUser(updatedUser);
                      apiService.saveUser(updatedUser);
                    }}
                    onSelectOrder={(order) => {
                      setTrackedOrder(order);
                      apiService.setTrackedOrderId(order.id);
                      handleNavigate('/tracking', 'tracking', 'customer');
                    }}
                    onOpenReferral={() => setIsReferralOpen(true)}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    onExploreMenu={() => handleNavigate('/', 'menu', 'customer')}
                  />
                )
              )}

              {activeTab === 'orders' && (
                <OrdersHistory
                  orders={clientOrders}
                  onAddToCart={handleAddToCart}
                  onSelectOrder={(order) => {
                    setTrackedOrder(order);
                    apiService.setTrackedOrderId(order.id);
                    handleNavigate('/tracking', 'tracking', 'customer');
                  }}
                />
              )}

              {activeTab === 'tracking' && (
                <LiveTracking
                  order={trackedOrder || clientOrders[0]}
                  onCancelOrder={handleCancelOrder}
                  onModifyOrder={handleModifyOrder}
                />
              )}
            </>
          )}

          {currentRole === 'kitchen' && (
            <KitchenBoard
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              user={user}
              meals={meals}
            />
          )}
          {currentRole === 'delivery' && <RiderDashboard orders={orders} onUpdateStatus={handleUpdateOrderStatus} />}
          {currentRole === 'admin' && (
            <AdminDashboard
              meals={meals}
              setMeals={setMeals}
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              user={user}
            />
          )}
        </div>
      </main>

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
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          apiService.saveUser(loggedInUser);
          
          const userRole = (loggedInUser.role || 'customer').toLowerCase();
          
          handleNavigate(
            userRole === 'kitchen'
              ? '/kitchen'
              : userRole === 'delivery'
                ? '/delivery'
                : userRole === 'admin'
                  ? '/admin'
                  : '/dashboard',
            userRole === 'customer' ? 'dashboard' : userRole,
            userRole
          );
          
          // Only ask customers to set location for delivery
          if (userRole === 'customer') {
            setIsLocationModalOpen(true);
          }
        }}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSetLocation={(loc) => {
          const updated = { ...(user || {}), location: loc };
          setUser(updated);
          apiService.saveUser(updated);
          showToast(`Location set to: ${loc}`, 'Location Updated');
        }}
      />

      <ReferralModal isOpen={isReferralOpen} onClose={() => setIsReferralOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSaveUser={(profileUser) => {
          setUser(profileUser);
          apiService.saveUser(profileUser);
          showToast('Profile saved successfully!', 'Profile Saved');
        }}
      />

      <CustomPizzaBuilderModal
        isOpen={isCustomBuilderOpen}
        onClose={() => setIsCustomBuilderOpen(false)}
        onAddToCart={(customItem) => {
          handleAddToCart(customItem);
          showToast(`${customItem.name} added to cart!`, 'Custom Pizza Created');
        }}
      />

      {currentRole === 'customer' && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => handleNavigate(tab === 'menu' ? '/' : `/${tab}`, tab, 'customer')}
          cartCount={cart.reduce((sum, item) => sum + (item.qty || 1), 0)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenCustomBuilder={() => setIsCustomBuilderOpen(true)}
          onOpenProfile={() => (user ? setIsProfileOpen(true) : setIsAuthOpen(true))}
        />
      )}

      <footer className="border-t border-white/10 bg-surface-dark py-12 px-4 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-lg flex items-center justify-center md:justify-start gap-2">
              <Flame className="w-5 h-5 text-primary" /> HotPot Delights
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Authentic Gourmet Hotpot & Artisanal Pizza Delivery in Kigali.<br />
              Crafted fresh with locally sourced ingredients.
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
        </div>
      </footer>
    </div>
  );
}
