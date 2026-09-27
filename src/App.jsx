import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/customer/Home';
import ProductDetailsPage from './pages/customer/ProductDetailsPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import LiveTracking from './pages/customer/LiveTracking';
import OrdersHistory from './pages/customer/OrdersHistory';
import KitchenBoard from './pages/kitchen/KitchenBoard';
import RiderDashboard from './pages/delivery/RiderDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './routes/ProtectedRoute';

import CartDrawer from './components/customer/CartDrawer';
import CheckoutModal from './components/customer/CheckoutModal';
import AuthModal from './components/customer/AuthModal';
import LocationModal from './components/LocationModal';
import HelpModal from './components/customer/HelpModal';
import ProfileModal from './components/customer/ProfileModal';
import PostDeliveryFeedbackModal from './components/customer/PostDeliveryFeedbackModal';
import MobileBottomNav from './components/MobileBottomNav';

import {
  session,
  getMeals,
  getOrders,
  createOrder,
  updateOrderStatus as apiUpdateOrderStatus,
  cancelOrder as apiCancelOrder,
  updateOrderNotes as apiUpdateOrderNotes,
  logout as apiLogout,
  refreshSession,
  onAuthLost,
  cart as cartStore,
  wishlist as wishlistStore,
  trackedOrder as trackedOrderStore,
  normalizeRole
} from './services/apiService';
import { eventBus } from './services/eventBus';
import { Bell, Flame, Loader2, AlertTriangle as TriangleAlert, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';

const STAFF_ROLES = ['admin', 'kitchen', 'delivery'];
const POLL_MS = 8000;

function getActiveView(pathname) {
  const p = (pathname || '/').toLowerCase();
  if (p.startsWith('/kitchen')) return 'kitchen';
  if (p.startsWith('/delivery') || p.startsWith('/rider')) return 'delivery';
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/tracking')) return 'tracking';
  if (p.startsWith('/orders')) return 'orders';
  if (p.startsWith('/dashboard')) return 'dashboard';
  if (p.startsWith('/product')) return 'product-detail';
  if (p.startsWith('/login')) return 'login';
  if (p.startsWith('/register')) return 'register';
  return 'menu';
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const view = getActiveView(location.pathname);

  // --- Session ------------------------------------------------------------
  const [user, setUser] = useState(() => session.getUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  // --- Server data --------------------------------------------------------
  const [meals, setMeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mealsError, setMealsError] = useState(null);
  const [ordersError, setOrdersError] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // --- Local UI state -----------------------------------------------------
  const [cart, setCart] = useState(() => cartStore.get());
  const [wishlist, setWishlist] = useState(() => wishlistStore.get());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lang, setLang] = useState('EN');
  const [theme, setTheme] = useState('dark');

  // --- Modals & Overlays --------------------------------------------------
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [orderBusy, setOrderBusy] = useState(false);

  const role = user?.role ? normalizeRole(user.role) : null;
  const isStaff = role !== null && STAFF_ROLES.includes(role);
  const token = session.getToken();

  const toastTimer = useRef(null);
  const showToast = useCallback((message, title = 'Notification', tone = 'info') => {
    setToast({ title, message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light-theme', next === 'light');
      return next;
    });
  }, []);

  // Session validation
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setAuthChecked(true);
      return undefined;
    }

    refreshSession()
      .then((freshUser) => {
        if (cancelled) return;
        if (freshUser) {
          setUser(freshUser);
          setAuthError(null);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAuthError(`Session expired (${err.message}). Signed out for security.`);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const unsub = onAuthLost(() => {
      setUser(null);
      setOrders([]);
      showToast('Session expired. Please sign in again.', 'Signed Out', 'error');
    });
    return unsub;
  }, [showToast]);

  const loadMeals = useCallback(async () => {
    try {
      setMealsError(null);
      setMeals(await getMeals());
    } catch (err) {
      setMeals([]);
      setMealsError(err.message);
    }
  }, []);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const loadOrders = useCallback(
    async ({ silent = true } = {}) => {
      if (!session.isAuthenticated()) {
        setOrders([]);
        return;
      }
      if (!silent) setLoadingOrders(true);
      try {
        const fresh = await getOrders();
        setOrders(fresh);
        setOrdersError(null);
      } catch (err) {
        setOrdersError(err.message);
      } finally {
        if (!silent) setLoadingOrders(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) {
      setOrders([]);
      setOrdersError(null);
      return undefined;
    }
    loadOrders({ silent: false });
    return undefined;
  }, [token, loadOrders]);

  useEffect(() => {
    const id = trackedOrder?.id;
    if (!id || !orders.length) return;
    const found = orders.find((o) => String(o.id) === String(id));
    if (found) setTrackedOrder(found);
  }, [orders, trackedOrder?.id]);

  // Realtime Socket.IO connection
  useEffect(() => {
    if (!token) return undefined;

    const base = (
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : 'http://localhost:5002')
    ).replace(/\/$/, '');

    const socket = io(base, {
      transports: ['websocket', 'polling'],
      auth: { token: session.getToken() },
      reconnectionAttempts: 8,
      reconnectionDelay: 1000
    });

    const upsert = (incoming) =>
      setOrders((prev) => {
        const idx = prev.findIndex((o) => String(o.id) === String(incoming.id));
        if (idx === -1) return [incoming, ...prev];
        const next = [...prev];
        next[idx] = incoming;
        return next;
      });

    socket.on('new_order_placed', (order) => {
      if (!order) return;
      upsert(order);
      eventBus.emit('NEW_ORDER', order, true);
    });

    socket.on('order_status_updated', (order) => {
      if (!order) return;
      upsert(order);
      eventBus.emit('ORDER_STATUS_UPDATE', { orderId: order.id, status: order.status, order }, true);
      if (order.status === 'delivered' && String(order.userId) === String(session.getUser()?.id)) {
        setFeedbackOrder(order);
      }
    });

    socket.on('order_cancelled', (order) => {
      if (!order) return;
      setOrders((prev) => prev.map((o) => (String(o.id) === String(order.id) ? { ...o, status: 'cancelled' } : o)));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token]);

  // State persistence
  useEffect(() => cartStore.set(cart), [cart]);
  useEffect(() => wishlistStore.set(wishlist), [wishlist]);
  useEffect(() => trackedOrderStore.set(trackedOrder?.id || null), [trackedOrder?.id]);

  const addToCart = useCallback((meal, quantity = 1, options = {}) => {
    if (!meal) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => String(i.id) === String(meal.id));
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity, options: { ...next[idx].options, ...options } };
        return next;
      }
      return [...prev, { ...meal, quantity, options }];
    });
  }, []);

  const updateCartQty = useCallback((id, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((i) => String(i.id) !== String(id));
      return prev.map((i) => (String(i.id) === String(id) ? { ...i, quantity: qty } : i));
    });
  }, []);

  const removeCartItem = useCallback((id) => {
    setCart((prev) => prev.filter((i) => String(i.id) !== String(id)));
  }, []);

  const toggleWishlist = useCallback((meal) => {
    if (!meal) return;
    setWishlist((prev) => {
      const exists = prev.some((m) => String(m.id) === String(meal.id));
      return exists ? prev.filter((m) => String(m.id) !== String(meal.id)) : [...prev, meal];
    });
  }, []);

  const requestView = useCallback(
    (targetView) => {
      if (!targetView) return;
      if (targetView === 'menu' || targetView === '/') navigate('/');
      else if (targetView === 'kitchen') navigate('/kitchen');
      else if (targetView === 'delivery' || targetView === 'rider') navigate('/delivery');
      else if (targetView === 'admin') navigate('/admin');
      else if (targetView === 'tracking') navigate('/tracking');
      else if (targetView === 'orders') navigate('/orders');
      else if (targetView === 'dashboard') navigate('/dashboard');
      else if (targetView === 'product-detail' || targetView === 'product') navigate('/product');
      else if (targetView === 'login') navigate('/login');
      else if (targetView === 'register') navigate('/register');
      else if (typeof targetView === 'string' && targetView.startsWith('/')) navigate(targetView);
    },
    [navigate]
  );

  const placeOrder = useCallback(
    async (details) => {
      if (orderBusy) return null;
      if (!cart.length) {
        showToast('Your cart is empty.', 'Empty Cart', 'error');
        return null;
      }
      setOrderBusy(true);
      try {
        const payload = {
          items: cart.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.quantity,
            price: i.price,
            spice: i.options?.spiceLevel || i.spice || null,
            broth: i.options?.broth || i.broth || null,
            specialNote: i.options?.specialNote || i.specialNote || ''
          })),
          customerName: details.name,
          phone: details.phone,
          address: details.address,
          area: details.area || null,
          lat: details.lat || null,
          lng: details.lng || null,
          orderType: details.orderType || 'delivery',
          notes: details.notes || null,
          paymentMethod: details.paymentMethod || 'MTN Mobile Money'
        };

        const created = await createOrder(payload);
        setCart([]);
        setTrackedOrder(created);
        setOrders((prev) => [created, ...prev.filter((o) => String(o.id) !== String(created.id))]);
        showToast(`Order #${created.id} placed! Tracking live now.`, 'Order Placed');
        setIsCheckoutOpen(false);
        navigate('/tracking');
        return created;
      } catch (err) {
        showToast(err.message || 'Could not place your order. Please try again.', 'Order Failed', 'error');
        throw err;
      } finally {
        setOrderBusy(false);
      }
    },
    [cart, orderBusy, showToast, navigate]
  );

  const changeOrderStatus = useCallback(
    async (orderId, newStatus, extra = {}) => {
      try {
        const updated = await apiUpdateOrderStatus(orderId, newStatus, extra);
        setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? updated : o)));
        if (String(trackedOrder?.id) === String(orderId)) setTrackedOrder(updated);
        showToast(`Order #${orderId} updated to ${newStatus}.`, 'Status Updated');
        return updated;
      } catch (err) {
        showToast(err.message || 'Status update failed.', 'Update failed', 'error');
        throw err;
      }
    },
    [trackedOrder?.id, showToast]
  );

  const cancelOrder = useCallback(
    async (orderId) => {
      try {
        const cancelled = await apiCancelOrder(orderId);
        setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? cancelled : o)));
        if (String(trackedOrder?.id) === String(orderId)) setTrackedOrder(cancelled);
        showToast(`Order #${orderId} has been cancelled.`, 'Order Cancelled');
        return cancelled;
      } catch (err) {
        showToast(err.message || 'Could not cancel that order.', 'Cancel failed', 'error');
        throw err;
      }
    },
    [trackedOrder?.id, showToast]
  );

  const setOrderNotes = useCallback(
    async (orderId, notes) => {
      try {
        const updated = await apiUpdateOrderNotes(orderId, notes);
        setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? updated : o)));
        return updated;
      } catch (err) {
        showToast(err.message || 'Could not save that note.', 'Update failed', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const signOut = useCallback(() => {
    apiLogout();
    setUser(null);
    setOrders([]);
    setTrackedOrder(null);
    trackedOrderStore.set(null);
    showToast('You have been signed out.', 'Signed out');
    navigate('/');
  }, [navigate, showToast]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  const showAppChrome = view !== 'login' && view !== 'register';
  const orderActions = { onUpdateStatus: changeOrderStatus, onCancelOrder: cancelOrder, onSetNotes: setOrderNotes };

  // Resolve meal for product detail route
  const productId = searchParams.get('id');
  const mealToRender =
    selectedMeal ||
    (productId ? meals.find((m) => String(m.id) === String(productId)) : null) ||
    meals[0] ||
    null;

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col justify-between selection:bg-primary selection:text-white relative">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl bg-surface-card border border-primary/40 shadow-2xl flex items-center gap-4 animate-toast-enter min-w-[280px] max-w-[92vw]"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toast.tone === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-primary-light text-primary'
            }`}
          >
            {toast.tone === 'error' ? <TriangleAlert className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-text-main">{toast.title}</div>
            <div className="text-xs text-text-muted mt-0.5">{toast.message}</div>
          </div>
        </div>
      )}

      {authError && (
        <div
          role="alert"
          className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-4 py-2 flex items-center gap-2 justify-center"
        >
          <TriangleAlert className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-center">{authError}</span>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="underline font-semibold hover:text-amber-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {ordersError && isStaff && (
        <div
          role="alert"
          className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-xs px-4 py-2 flex items-center gap-2 justify-center"
        >
          <WifiOff className="w-4 h-4" /> Live updates unavailable: {ordersError}
        </div>
      )}

      {showAppChrome && (
        <Header
          view={view}
          onNavigate={requestView}
          cartCount={cart.reduce((acc, item) => acc + (item.quantity || 0), 0)}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAuth={() => navigate('/login')}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenProfile={() => (user ? setIsProfileOpen(true) : navigate('/login'))}
          user={user}
          onLogout={signOut}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          lang={lang}
          setLang={setLang}
          theme={theme}
          toggleTheme={toggleTheme}
          meals={meals}
          onSelectMeal={(meal) => {
            setSelectedMeal(meal);
            navigate(`/product?id=${meal.id}`);
          }}
          hasOrders={orders.length > 0}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex-1 w-full relative">
        {mealsError && view === 'menu' && (
          <ErrorPanel message={mealsError} onRetry={loadMeals} />
        )}

        <Routes>
          {/* Menu / Home */}
          <Route
            path="/"
            element={
              <Home
                meals={meals}
                loading={!meals.length && !mealsError}
                onSelectMeal={(meal) => {
                  setSelectedMeal(meal);
                  navigate(`/product?id=${meal.id}`);
                }}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                cart={cart}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
                onAddToCart={addToCart}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenAuth={() => navigate('/login')}
                signedIn={Boolean(user)}
              />
            }
          />
          <Route path="/store" element={<Navigate to="/" replace />} />

          {/* Auth */}
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={(loggedInUser) => {
                  setUser(loggedInUser);
                  showToast(`Welcome back, ${loggedInUser.name}!`, 'Signed In');
                }}
              />
            }
          />
          <Route
            path="/register"
            element={
              <RegisterPage
                onRegisterSuccess={(loggedInUser) => {
                  setUser(loggedInUser);
                  showToast(`Welcome, ${loggedInUser.name}! Your account is ready.`, 'Account Created');
                }}
              />
            }
          />

          {/* Product Detail */}
          <Route
            path="/product"
            element={
              <ProductDetailsPage
                meal={mealToRender}
                allMeals={meals}
                cart={cart}
                onAddToCart={addToCart}
                onUpdateCartQty={updateCartQty}
                onRemoveCartItem={removeCartItem}
                onOpenCart={() => setIsCartOpen(true)}
                onSelectMeal={(meal) => {
                  setSelectedMeal(meal);
                  navigate(`/product?id=${meal.id}`);
                }}
                onBackToMenu={() => navigate('/')}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
                signedIn={Boolean(user)}
                onOpenAuth={() => navigate('/login')}
              />
            }
          />

          {/* Customer Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'kitchen', 'delivery']}>
                {role === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : role === 'kitchen' ? (
                  <Navigate to="/kitchen" replace />
                ) : role === 'delivery' ? (
                  <Navigate to="/delivery" replace />
                ) : (
                  <CustomerDashboard
                    user={user}
                    orders={orders}
                    cart={cart}
                    loading={loadingOrders}
                    onOpenAuth={() => navigate('/login')}
                    onAddToCart={addToCart}
                    onOpenCart={() => setIsCartOpen(true)}
                    onUpdateUser={(updated) => {
                      session.updateUser(updated);
                      setUser(updated);
                    }}
                    onSelectOrder={(order) => {
                      setTrackedOrder(order);
                      trackedOrderStore.set(order.id);
                      navigate('/tracking');
                    }}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    onExploreMenu={() => navigate('/')}
                    onNavigate={requestView}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Orders History */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'kitchen', 'delivery']}>
                {orders.length ? (
                  <OrdersHistory
                    orders={orders}
                    onSelectOrder={(order) => {
                      setTrackedOrder(order);
                      trackedOrderStore.set(order.id);
                      navigate('/tracking');
                    }}
                    onExploreMenu={() => navigate('/')}
                  />
                ) : (
                  <EmptyState
                    title="No orders yet"
                    body="Once you place an order it will appear here with live tracking."
                    actionLabel="Browse the menu"
                    onAction={() => navigate('/')}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Live Tracking */}
          <Route
            path="/tracking"
            element={
              orders.length || trackedOrder ? (
                <LiveTracking
                  order={trackedOrder?.id ? orders.find((o) => String(o.id) === String(trackedOrder.id)) || trackedOrder : orders[0]}
                  {...orderActions}
                />
              ) : (
                <EmptyState
                  title="Nothing to track"
                  body="Place an order and follow your courier live on the map."
                  actionLabel="Browse the menu"
                  onAction={() => navigate('/')}
                />
              )
            }
          />

          {/* Admin Console */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FullBleed>
                  <AdminDashboard
                    meals={meals}
                    onMealsChange={loadMeals}
                    orders={orders}
                    loading={loadingOrders}
                    error={ordersError}
                    onRetry={() => loadOrders({ silent: false })}
                    {...orderActions}
                    user={user}
                    onGoHome={() => navigate('/')}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          />

          {/* Kitchen Board */}
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
                <FullBleed>
                  <KitchenBoard
                    orders={orders}
                    loading={loadingOrders}
                    meals={meals}
                    user={user}
                    {...orderActions}
                    onGoHome={() => navigate('/')}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          />

          {/* Delivery Fleet */}
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={['delivery', 'admin']}>
                <FullBleed>
                  <RiderDashboard
                    orders={orders}
                    loading={loadingOrders}
                    user={user}
                    {...orderActions}
                    onGoHome={() => navigate('/')}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          />
          <Route path="/rider" element={<Navigate to="/delivery" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Overlays & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          if (!user) {
            navigate('/login');
          } else {
            setIsCheckoutOpen(true);
          }
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        user={user}
        onPlaceOrder={placeOrder}
        isSubmitting={orderBusy}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsAuthOpen(false);
          showToast(`Welcome back, ${loggedInUser.name}!`, 'Signed In');
        }}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <PostDeliveryFeedbackModal
        isOpen={Boolean(feedbackOrder)}
        onClose={() => setFeedbackOrder(null)}
        order={feedbackOrder}
        onSubmitted={(msg) => showToast(msg, 'Thanks for your feedback')}
        onError={(msg) => showToast(msg, 'Could not submit', 'error')}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSaved={(updated) => {
          session.updateUser(updated);
          setUser(updated);
          showToast('Profile updated.', 'Saved');
        }}
        onLogout={signOut}
      />

      {role === 'customer' && (
        <MobileBottomNav
          activeTab={view}
          onNavigate={requestView}
          cartCount={cart.reduce((sum, item) => sum + (item.quantity || 0), 0)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenProfile={() => (user ? setIsProfileOpen(true) : navigate('/login'))}
          hasOrders={orders.length > 0}
        />
      )}

      {showAppChrome && (
        <footer className="border-t border-white/10 bg-surface-dark py-12 px-4 mt-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-3">
              <h4 className="font-extrabold text-white text-lg flex items-center justify-center md:justify-start gap-2">
                <Flame className="w-5 h-5 text-primary" /> HotPot Delights
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Authentic Gourmet Hotpot &amp; Artisanal Pizza Delivery in Kigali.
                <br />
                Crafted fresh with locally sourced ingredients.
              </p>
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
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function FullBleed({ children }) {
  return <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-24">{children}</div>;
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <TriangleAlert className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-red-200 mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-200 text-sm font-semibold hover:bg-red-500/30"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-bold text-text-main">{title}</h2>
      <p className="text-sm text-text-muted mt-2 mb-6">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
