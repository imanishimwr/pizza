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
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminCatalog from './pages/admin/AdminCatalog';
import AdminOrders from './pages/admin/AdminOrders';
import AdminFleet from './pages/admin/AdminFleet';
import AdminSales from './pages/admin/AdminSales';
import AdminReviews from './pages/admin/AdminReviews';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './routes/ProtectedRoute';

import CartDrawer from './components/customer/CartDrawer';
import CheckoutModal from './components/customer/CheckoutModal';
import AuthModal from './components/customer/AuthModal';
import ConfirmModal from './components/common/ConfirmModal';
import LocationModal from './components/LocationModal';
import HelpPage from './pages/customer/HelpPage';
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
  deleteOrder as apiDeleteOrder,
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
import { getAdminCache, setAdminCache, getSyncLocalCache } from './utils/adminIndexedDB';

const STAFF_ROLES = ['admin', 'kitchen', 'delivery'];
const POLL_MS = 8000;

// ---------------------------------------------------------------------------
// Route map — single source of truth for all role-based paths
// ---------------------------------------------------------------------------
export const ROUTES = {
  home:       '/',
  login:      '/login',
  register:   '/register',
  product:    '/product',
  help:       '/help',
  // Customer portal
  dashboard:  '/hotpotcustomer/dashboard',
  orders:     '/hotpotcustomer/orders',
  tracking:   '/hotpotcustomer/tracking',
  // Staff portals
  admin:      '/hotpotadmin',
  kitchen:    '/hotpotkitchen',
  delivery:   '/hotpotrider',
};

function getActiveView(pathname) {
  const p = (pathname || '/').toLowerCase();
  if (p.startsWith('/hotpotkitchen')) return 'kitchen';
  if (p.startsWith('/hotpotrider')) return 'delivery';
  if (p.startsWith('/hotpotadmin')) return 'admin';
  if (p.startsWith('/hotpotcustomer/tracking')) return 'tracking';
  if (p.startsWith('/hotpotcustomer/orders')) return 'orders';
  if (p.startsWith('/hotpotcustomer')) return 'dashboard';
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
  const [meals, setMeals] = useState(() => getSyncLocalCache('meals') || []);
  const [orders, setOrders] = useState(() => getSyncLocalCache('orders') || []);
  const [mealsError, setMealsError] = useState(null);
  const [ordersError, setOrdersError] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Asynchronously hydrate meals & orders from IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cachedMeals, cachedOrders] = await Promise.all([
        getAdminCache('meals'),
        getAdminCache('orders')
      ]);
      if (!mounted) return;
      if (Array.isArray(cachedMeals) && cachedMeals.length > 0) {
        setMeals((prev) => (prev.length > 0 ? prev : cachedMeals));
      }
      if (Array.isArray(cachedOrders) && cachedOrders.length > 0) {
        setOrders((prev) => (prev.length > 0 ? prev : cachedOrders));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

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
        setSessionExpiredOpen(true);
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
      setSessionExpiredOpen(true);
    });
    return unsub;
  }, []);

  const loadMeals = useCallback(async () => {
    try {
      setMealsError(null);
      const fresh = await getMeals();
      setMeals(fresh);
      if (Array.isArray(fresh) && fresh.length > 0) {
        setAdminCache('meals', fresh);
      }
    } catch (err) {
      setMeals([]);
      setMealsError(err.message);
    }
  }, []);

  const removeMeal = useCallback((mealId) => {
    setMeals((prev) => {
      const filtered = prev.filter((m) => String(m.id) !== String(mealId));
      setAdminCache('meals', filtered);
      return filtered;
    });
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
        if (Array.isArray(fresh) && fresh.length > 0) {
          setAdminCache('orders', fresh);
        }
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

    const rawBase =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : null);
    if (!rawBase) {
      console.error(
        '[socket] VITE_SOCKET_URL or VITE_API_BASE_URL must be set. '
        + 'Add it to your .env file.'
      );
      return undefined;
    }
    const base = rawBase.replace(/\/$/, '');

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
      eventBus.emit('NEW_ORDER', order);
    });

    socket.on('order_status_updated', (order) => {
      if (!order) return;
      upsert(order);
      eventBus.emit('ORDER_STATUS_UPDATE', { orderId: order.id, status: order.status, order });
      if (order.status === 'delivered' && String(order.userId) === String(session.getUser()?.id)) {
        setFeedbackOrder(order);
      }
    });

    socket.on('order_cancelled', (order) => {
      if (!order) return;
      setOrders((prev) => prev.map((o) => (String(o.id) === String(order.id) ? { ...o, status: 'cancelled' } : o)));
    });

    socket.on('order_deleted', ({ orderId } = {}) => {
      if (!orderId) return;
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(orderId)));
      eventBus.emit('ORDER_DELETED', { orderId });
    });

    socket.on('meal_catalog_updated', () => {
      loadMeals();
      eventBus.emit('MEAL_CATALOG_UPDATED');
    });

    socket.on('rider_fleet_updated', (fleet) => {
      eventBus.emit('RIDER_FLEET_UPDATED', fleet);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, loadMeals]);

  // State persistence
  useEffect(() => cartStore.set(cart), [cart]);
  useEffect(() => wishlistStore.set(wishlist), [wishlist]);
  useEffect(() => trackedOrderStore.set(trackedOrder?.id || null), [trackedOrder?.id]);

  const addToCart = useCallback((mealOrPayload, quantity = 1, options = {}) => {
    if (!mealOrPayload) return;
    const isPayload = Boolean(mealOrPayload.meal);
    const meal = isPayload ? mealOrPayload.meal : mealOrPayload;
    const qty = Math.max(1, Number(isPayload ? mealOrPayload.quantity : quantity) || 1);
    const selectedSpice = isPayload
      ? (mealOrPayload.selectedSpice ?? mealOrPayload.options?.selectedSpice ?? null)
      : (options.selectedSpice ?? options.spiceLevel ?? null);
    const selectedBroth = isPayload
      ? (mealOrPayload.selectedBroth ?? mealOrPayload.options?.selectedBroth ?? null)
      : (options.selectedBroth ?? options.broth ?? null);
    const specialNote = isPayload
      ? (mealOrPayload.specialNote ?? mealOrPayload.options?.specialNote ?? '')
      : (options.specialNote ?? '');

    setCart((prev) => {
      const idx = prev.findIndex(
        (i) =>
          String(i.id || i.meal?.id) === String(meal.id) &&
          (i.selectedSpice || null) === (selectedSpice || null) &&
          (i.selectedBroth || null) === (selectedBroth || null)
      );

      if (idx > -1) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + qty,
          specialNote: specialNote || next[idx].specialNote
        };
        return next;
      }

      const newItem = {
        meal,
        id: meal.id,
        name: meal.name,
        price: Number(meal.price) || 0,
        quantity: qty,
        selectedSpice,
        selectedBroth,
        specialNote,
        options: {
          selectedSpice,
          selectedBroth,
          specialNote
        }
      };
      return [...prev, newItem];
    });
  }, []);

  const updateCartQty = useCallback((idOrIndex, qty) => {
    setCart((prev) => {
      let index = -1;
      if (typeof idOrIndex === 'number' && idOrIndex >= 0 && idOrIndex < prev.length) {
        index = idOrIndex;
      } else {
        index = prev.findIndex((i) => String(i.id || i.meal?.id) === String(idOrIndex));
      }
      if (index === -1) return prev;
      if (qty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  }, []);

  const removeCartItem = useCallback((idOrIndex) => {
    setCart((prev) => {
      if (typeof idOrIndex === 'number' && idOrIndex >= 0 && idOrIndex < prev.length) {
        return prev.filter((_, idx) => idx !== idOrIndex);
      }
      return prev.filter((i) => String(i.id || i.meal?.id) !== String(idOrIndex));
    });
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
      if (targetView === 'menu' || targetView === '/') navigate(ROUTES.home);
      else if (targetView === 'kitchen') navigate(ROUTES.kitchen);
      else if (targetView === 'delivery' || targetView === 'rider') navigate(ROUTES.delivery);
      else if (targetView === 'admin') navigate(ROUTES.admin);
      else if (targetView === 'tracking') navigate(ROUTES.tracking);
      else if (targetView === 'orders') navigate(ROUTES.orders);
      else if (targetView === 'dashboard') navigate(ROUTES.dashboard);
      else if (targetView === 'product-detail' || targetView === 'product') navigate(ROUTES.product);
      else if (targetView === 'login') navigate(ROUTES.login);
      else if (targetView === 'register') navigate(ROUTES.register);
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
            id: i.meal?.id || i.id,
            name: i.meal?.name || i.name,
            qty: i.quantity,
            price: Number(i.meal?.price ?? i.price) || 0,
            spice: i.selectedSpice || i.options?.selectedSpice || i.options?.spiceLevel || i.spice || null,
            broth: i.selectedBroth || i.options?.selectedBroth || i.options?.broth || null,
            specialNote: i.specialNote || i.options?.specialNote || ''
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
        navigate(ROUTES.tracking);
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

  const removeOrder = useCallback(
    async (orderId) => {
      let previousOrders = [];
      // 1. Optimistically remove from state and cache immediately
      setOrders((prev) => {
        previousOrders = prev;
        const filtered = prev.filter((o) => String(o.id) !== String(orderId));
        setAdminCache('orders', filtered);
        return filtered;
      });
      if (String(trackedOrder?.id) === String(orderId)) setTrackedOrder(null);

      // 2. Sync deletion to backend
      try {
        await apiDeleteOrder(orderId);
        showToast(`Order #${orderId} deleted permanently.`, 'Order Deleted');
      } catch (err) {
        // Rollback on failure
        setOrders(previousOrders);
        setAdminCache('orders', previousOrders);
        showToast(err.message || 'Could not delete that order.', 'Delete failed', 'error');
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
  const orderActions = {
    onUpdateStatus: changeOrderStatus,
    onCancelOrder: cancelOrder,
    onDeleteOrder: removeOrder,
    onSetNotes: setOrderNotes
  };

  // Resolve meal for product detail route
  const productId = searchParams.get('id');
  const mealToRender =
    (productId ? meals.find((m) => String(m.id) === String(productId)) : null) ||
    selectedMeal ||
    null;

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col justify-between selection:bg-primary selection:text-white relative">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl bg-surface-card border border-primary/40 shadow-2xl flex items-center gap-4 animate-toast-enter min-w-70 max-w-[92vw]"
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
          onOpenAuth={() => navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search))}
          onOpenHelp={() => navigate('/help')}
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
        <Routes>
          {/* Menu / Home */}
          <Route
            path="/"
            element={
              <Home
                meals={meals}
                loading={!meals.length && !mealsError}
                error={mealsError}
                onRetry={loadMeals}
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
                onOpenAuth={() => navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search))}
                signedIn={Boolean(user)}
              />
            }
          />
          <Route path="/store" element={<Navigate to="/" replace />} />
          {/* Legacy aliases */}
          <Route path="/dashboard" element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="/orders" element={<Navigate to={ROUTES.orders} replace />} />
          <Route path="/tracking" element={<Navigate to={ROUTES.tracking} replace />} />
          <Route path="/admin" element={<Navigate to={ROUTES.admin} replace />} />
          <Route path="/kitchen" element={<Navigate to={ROUTES.kitchen} replace />} />
          <Route path="/delivery" element={<Navigate to={ROUTES.delivery} replace />} />
          <Route path="/rider" element={<Navigate to={ROUTES.delivery} replace />} />

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
                onOpenAuth={() => navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search))}
              />
            }
          />

          {/* ── Customer Portal ── */}
          <Route
            path={ROUTES.dashboard}
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'kitchen', 'delivery']}>
                {role === 'admin' ? (
                  <Navigate to={ROUTES.admin} replace />
                ) : role === 'kitchen' ? (
                  <Navigate to={ROUTES.kitchen} replace />
                ) : role === 'delivery' ? (
                  <Navigate to={ROUTES.delivery} replace />
                ) : (
                  <CustomerDashboard
                    user={user}
                    orders={orders}
                    cart={cart}
                    loading={loadingOrders}
                    onOpenAuth={() => navigate(ROUTES.login)}
                    onAddToCart={addToCart}
                    onOpenCart={() => setIsCartOpen(true)}
                    onUpdateUser={(updated) => {
                      session.updateUser(updated);
                      setUser(updated);
                    }}
                    onSelectOrder={(order) => {
                      setTrackedOrder(order);
                      trackedOrderStore.set(order.id);
                      navigate(ROUTES.tracking);
                    }}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    onExploreMenu={() => navigate(ROUTES.home)}
                    onNavigate={requestView}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Orders History */}
          <Route
            path={ROUTES.orders}
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'kitchen', 'delivery']}>
                {orders.length ? (
                  <OrdersHistory
                    orders={orders}
                    onSelectOrder={(order) => {
                      setTrackedOrder(order);
                      trackedOrderStore.set(order.id);
                      navigate(ROUTES.tracking);
                    }}
                    onExploreMenu={() => navigate(ROUTES.home)}
                  />
                ) : (
                  <EmptyState
                    title="No orders yet"
                    body="Once you place an order it will appear here with live tracking."
                    actionLabel="Browse the menu"
                    onAction={() => navigate(ROUTES.home)}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Live Tracking */}
          <Route
            path={ROUTES.tracking}
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
                  onAction={() => navigate(ROUTES.home)}
                />
              )
            }
          />

          {/* ── Admin Portal ── */}
          <Route
            path={ROUTES.admin}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FullBleed>
                  <AdminLayout
                    meals={meals}
                    onMealsChange={loadMeals}
                    onDeleteMeal={removeMeal}
                    orders={orders}
                    loading={loadingOrders}
                    error={ordersError}
                    onRetry={() => loadOrders({ silent: false })}
                    {...orderActions}
                    user={user}
                    onGoHome={() => navigate(ROUTES.home)}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="catalog" element={<AdminCatalog />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="fleet" element={<AdminFleet />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Route>

          {/* ── Kitchen Portal ── */}
          <Route
            path={ROUTES.kitchen}
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
                <FullBleed>
                  <KitchenBoard
                    orders={orders}
                    loading={loadingOrders}
                    meals={meals}
                    user={user}
                    {...orderActions}
                    onGoHome={() => navigate(ROUTES.home)}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          />

          {/* ── Rider Portal ── */}
          <Route
            path={ROUTES.delivery}
            element={
              <ProtectedRoute allowedRoles={['delivery', 'admin']}>
                <FullBleed>
                  <RiderDashboard
                    orders={orders}
                    loading={loadingOrders}
                    user={user}
                    {...orderActions}
                    onGoHome={() => navigate(ROUTES.home)}
                  />
                </FullBleed>
              </ProtectedRoute>
            }
          />

          {/* Help & FAQ */}
          <Route path="/help" element={<HelpPage />} />

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

      {/* Session Expired / JWT Invalidation Modal */}
      <ConfirmModal
        isOpen={sessionExpiredOpen}
        onClose={() => setSessionExpiredOpen(false)}
        onConfirm={() => {
          setSessionExpiredOpen(false);
          navigate('/login');
        }}
        title="Session Expired"
        message="Your session has expired or your account permissions have changed. Please sign in again to continue."
        confirmText="Sign in again"
        cancelText="Dismiss"
        tone="auth"
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
