import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  updateProfile,
  onAuthLost,
  cart as cartStore,
  wishlist as wishlistStore,
  trackedOrder as trackedOrderStore
} from './services/apiService';
import { eventBus } from './services/eventBus';
import { notificationService } from './services/notificationService';
import { downloadOrderReceiptPdf } from './utils/receiptGenerator';
import { Bell, Flame, Loader2, AlertTriangle as TriangleAlert, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Routing
//
// The URL only ever chooses WHICH VIEW renders. It never decides what you are
// allowed to see: that comes from the role in the signed server session. The
// previous build derived the role from `window.location.pathname`, which meant
// typing /admin as any signed-in user rendered the admin dashboard.
// ---------------------------------------------------------------------------
const STAFF_ROLES = ['admin', 'kitchen', 'delivery'];

const STAFF_HOME = { admin: '/admin', kitchen: '/kitchen', delivery: '/delivery' };
const ROLE_HOME = { customer: '/dashboard', ...STAFF_HOME };

function routeFromPath(pathname = '/') {
  const path = pathname.toLowerCase();
  if (path.startsWith('/kitchen')) return { view: 'kitchen' };
  if (path.startsWith('/delivery') || path.startsWith('/rider')) return { view: 'delivery' };
  if (path.startsWith('/admin')) return { view: 'admin' };
  if (path.startsWith('/tracking')) return { view: 'tracking' };
  if (path.startsWith('/orders')) return { view: 'orders' };
  if (path.startsWith('/dashboard')) return { view: 'dashboard' };
  if (path.startsWith('/product')) return { view: 'product-detail' };
  return { view: 'menu' };
}

function pathForView(view) {
  if (view === 'kitchen') return '/kitchen';
  if (view === 'delivery') return '/delivery';
  if (view === 'admin') return '/admin';
  if (view === 'tracking') return '/tracking';
  if (view === 'orders') return '/orders';
  if (view === 'dashboard') return '/dashboard';
  if (view === 'product-detail') return '/product';
  return '/';
}

/** Poll faster while the tab is visible, and never poll an unauthenticated tab. */
const POLL_MS = 8000;

export default function App() {
  const [view, setView] = useState(() => routeFromPath(window.location.pathname).view);

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
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'
  );
  const [toast, setToast] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [trackedOrder, setTrackedOrder] = useState(() => {
    const id = trackedOrderStore.get();
    return id ? { id } : null;
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [orderBusy, setOrderBusy] = useState(false);

  const role = user?.role ? String(user.role).toLowerCase() : null;
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

  // -------------------------------------------------------------------------
  // Session validation. The stored token is only trusted after the server
  // confirms it, so an expired or forged session cannot render a staff view.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session.isAuthenticated()) {
        setUser(null);
        setAuthChecked(true);
        return;
      }
      try {
        const fresh = await refreshSession();
        if (!cancelled) {
          setUser(fresh);
          setAuthError(null);
        }
      } catch (err) {
        if (!cancelled) {
          session.clear();
          setUser(null);
          setAuthError(err.message || 'Please sign in again.');
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // A 401 from anywhere in the app drops us back to a signed-out state.
  useEffect(
    () =>
      onAuthLost(() => {
        setUser(null);
        setOrders([]);
        setAuthError('Your session expired. Please sign in again.');
      }),
    []
  );

  // -------------------------------------------------------------------------
  // Menu: public, loaded once.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Orders: the server scopes them by role, so there is no client-side
  // ownership guesswork. A failure surfaces an error instead of a stale list.
  // -------------------------------------------------------------------------
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

  // Resolve the tracked order once the book arrives.
  useEffect(() => {
    const id = trackedOrder?.id;
    if (!id || !orders.length) return;
    const found = orders.find((o) => o.id === id);
    if (found) setTrackedOrder(found);
  }, [orders, trackedOrder?.id]);

  // -------------------------------------------------------------------------
  // Polling + realtime. Two separate effects: the socket lifecycle depends only
  // on the token, so a status change no longer tears down and rebuilds the
  // connection. The previous version had `user`, `currentRole` and
  // `trackedOrder` in the dependency array of the socket effect.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    let timer = null;

    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      timer = setTimeout(async () => {
        await loadOrders();
        schedule();
      }, POLL_MS);
    };

    const onVisible = () => {
      if (!document.hidden) {
        loadOrders();
        schedule();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    schedule();

    return () => {
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, loadOrders]);

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
        const idx = prev.findIndex((o) => o.id === incoming.id);
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
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
    });

    socket.on('rider_fleet_updated', () => {
      // Rider rosters are re-read by RiderDashboard/AdminDashboard on demand.
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token]);

  // Notification side effects read `user` and `trackedOrder` but must not be
  // part of the socket lifecycle, so they live in their own effect.
  useEffect(() => {
    const onNewOrder = (order, crossTab) => {
      if (!crossTab || !order) return;
      if (role === 'customer') return; // customers do not need the incoming-order chime
      showToast(`New order #${order.id} received.`, 'Incoming Order');
      notificationService.playChime('new_order');
      notificationService.sendDesktopNotification(`New order #${order.id}`, {
        body: `Order total: ${Number(order.totalRWF || 0).toLocaleString()} RWF`
      });
    };

    const onStatusChange = ({ orderId, status, order }, crossTab) => {
      if (!crossTab || !status) return;
      const mine = String(order?.userId ?? '') === String(user?.id ?? '');
      const mineTracked = trackedOrder?.id === orderId;

      if (status === 'ready') {
        notificationService.playChime('order_ready');
        if (mine || mineTracked) {
          showToast(`Your order #${orderId} is cooked and packed.`, 'Your meal is ready');
        } else if (role !== 'customer') {
          showToast(`Order #${orderId} is ready for dispatch.`, 'Kitchen update');
        }
      } else if (status === 'delivery') {
        notificationService.playChime('status_update');
        if (mine || mineTracked) showToast(`Order #${orderId} is on the way.`, 'Out for delivery');
        else if (role !== 'customer') showToast(`Order #${orderId} handed to a courier.`, 'Dispatch update');
      } else if (role !== 'customer' || mine || mineTracked) {
        notificationService.playChime('status_update');
        showToast(`Order #${orderId} is now ${status}.`, 'Order updated');
      }
    };

    const offNew = eventBus.on('NEW_ORDER', onNewOrder);
    const offStatus = eventBus.on('ORDER_STATUS_UPDATE', onStatusChange);
    return () => {
      offNew();
      offStatus();
    };
  }, [user, role, trackedOrder?.id, showToast]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const navigate = useCallback(
    (path, nextView) => {
      const target = nextView || routeFromView(path);
      setView(target);
      if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({}, '', path);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  useEffect(() => {
    const onPop = () => setView(routeFromPath(window.location.pathname).view);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Resolve ?id= once the menu is loaded.
  useEffect(() => {
    if (view !== 'product-detail' || !meals.length) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const found = meals.find((m) => String(m.id) === String(id));
    if (found) setSelectedMeal(found);
  }, [view, meals]);

  /** Guarded: a staff view requires a staff session. */
  const requestView = useCallback(
    (nextView) => {
      if (STAFF_ROLES.includes(nextView) && role !== nextView) {
        setIsAuthOpen(true);
        showToast(
          role
            ? 'Your account does not have access to that area.'
            : 'Please sign in to open that dashboard.',
          'Sign in required'
        );
        return;
      }
      navigate(pathForView(nextView), nextView);
    },
    [role, navigate, showToast]
  );

  // -------------------------------------------------------------------------
  // Cart / wishlist
  // -------------------------------------------------------------------------
  const persistCart = useCallback((next) => {
    cartStore.set(next);
    return next;
  }, []);

  const addToCart = useCallback(
    (cartItem) => {
      setCart((prev) => {
        const i = prev.findIndex(
          (item) =>
            item.meal.id === cartItem.meal.id &&
            item.selectedSpice === cartItem.selectedSpice &&
            item.selectedBroth === cartItem.selectedBroth
        );
        const next =
          i === -1
            ? [...prev, cartItem]
            : prev.map((item, idx) =>
                idx === i ? { ...item, quantity: item.quantity + cartItem.quantity } : item
              );
        return persistCart(next);
      });
      setIsCartOpen(true);
      showToast(`Added ${cartItem.meal.name} to your order.`, 'Item added');
    },
    [persistCart, showToast]
  );

  const updateCartQty = useCallback(
    (index, qty) => {
      setCart((prev) => {
        if (qty <= 0) return persistCart(prev.filter((_, i) => i !== index));
        return persistCart(prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item)));
      });
    },
    [persistCart]
  );

  const removeCartItem = useCallback(
    (index) => setCart((prev) => persistCart(prev.filter((_, i) => i !== index))),
    [persistCart]
  );

  const toggleWishlist = useCallback(
    (meal) => {
      setWishlist((prev) => {
        const exists = prev.some((item) => (typeof item === 'string' ? item : item.id) === meal.id);
        const next = exists
          ? prev.filter((item) => (typeof item === 'string' ? item : item.id) !== meal.id)
          : [...prev, meal];
        wishlistStore.set(next);
        return next;
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Order mutations — all of them go to the server, and a failure is reported.
  // -------------------------------------------------------------------------
  const placeOrder = useCallback(
    async (draft) => {
      if (!session.isAuthenticated()) {
        setIsAuthOpen(true);
        showToast('Please sign in to place an order.', 'Sign in required');
        throw new Error('Not signed in.');
      }
      setOrderBusy(true);
      try {
        const order = await createOrder(draft);
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
        setCart(persistCart([]));
        setTrackedOrder(order);
        trackedOrderStore.set(order.id);
        try {
          downloadOrderReceiptPdf(order);
        } catch (err) {
          console.warn('Receipt download failed:', err);
        }
        showToast(`Order #${order.id} placed. Download your receipt.`, 'Order placed');
        navigate('/tracking', 'tracking');
        return order;
      } catch (err) {
        showToast(err.message || 'Could not place your order. Please try again.', 'Order failed', 'error');
        throw err;
      } finally {
        setOrderBusy(false);
      }
    },
    [navigate, persistCart, showToast]
  );

  const changeOrderStatus = useCallback(
    async (orderId, nextStatus) => {
      try {
        const updated = await apiUpdateOrderStatus(orderId, nextStatus);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        if (trackedOrder?.id === orderId) setTrackedOrder(updated);
        showToast(`Order #${orderId} is now ${nextStatus}.`, 'Status updated');
        return updated;
      } catch (err) {
        showToast(err.message || 'Could not update that order.', 'Update failed', 'error');
        throw err;
      }
    },
    [trackedOrder?.id, showToast]
  );

  const cancelOrder = useCallback(
    async (orderId) => {
      try {
        const { order } = await apiCancelOrder(orderId);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
        if (trackedOrder?.id === orderId) setTrackedOrder(order);
        showToast(`Order #${orderId} cancelled.`, 'Order cancelled');
        return order;
      } catch (err) {
        showToast(err.message || 'Could not cancel that order.', 'Cancellation failed', 'error');
        throw err;
      }
    },
    [trackedOrder?.id, showToast]
  );

  const setOrderNotes = useCallback(
    async (orderId, notes) => {
      try {
        const updated = await apiUpdateOrderNotes(orderId, notes);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
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
    navigate('/', 'menu');
  }, [navigate, showToast]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  // A staff view requested without the matching role: explain, don't leak.
  if (STAFF_ROLES.includes(view) && role !== view) {
    return (
      <AccessGate
        view={view}
        signedIn={Boolean(user)}
        onSignIn={() => setIsAuthOpen(true)}
        onGoHome={() => navigate('/', 'menu')}
      >
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setIsAuthOpen(false);
            requestView(view);
          }}
        />
      </AccessGate>
    );
  }

  const showAppChrome = view === 'menu' || view === 'product-detail' || view === 'orders' || view === 'tracking' || view === 'dashboard';

  const orderActions = { onUpdateStatus: changeOrderStatus, onCancelOrder: cancelOrder, onSetNotes: setOrderNotes };

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
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenProfile={() => (user ? setIsProfileOpen(true) : setIsAuthOpen(true))}
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
            navigate(`/product?id=${meal.id}`, 'product-detail');
          }}
          hasOrders={orders.length > 0}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 flex-1 w-full relative">
        {mealsError && view === 'menu' && (
          <ErrorPanel message={mealsError} onRetry={loadMeals} />
        )}

        {view === 'menu' && (
          <Home
            meals={meals}
            loading={!meals.length && !mealsError}
            onSelectMeal={(meal) => {
              setSelectedMeal(meal);
              navigate(`/product?id=${meal.id}`, 'product-detail');
            }}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            cart={cart}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onAddToCart={addToCart}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            signedIn={Boolean(user)}
          />
        )}

        {view === 'product-detail' && (
          <ProductDetailsPage
            meal={selectedMeal}
            allMeals={meals}
            cart={cart}
            onAddToCart={addToCart}
            onUpdateCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onOpenCart={() => setIsCartOpen(true)}
            onSelectMeal={(meal) => {
              setSelectedMeal(meal);
              navigate(`/product?id=${meal.id}`, 'product-detail');
            }}
            onBackToMenu={() => navigate('/', 'menu')}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            signedIn={Boolean(user)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {view === 'dashboard' &&
          (role === 'admin' ? (
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
                onGoHome={() => navigate('/', 'menu')}
              />
            </FullBleed>
          ) : role === 'kitchen' ? (
            <FullBleed>
              <KitchenBoard orders={orders} loading={loadingOrders} meals={meals} user={user} {...orderActions} onGoHome={() => navigate('/', 'menu')} />
            </FullBleed>
          ) : role === 'delivery' ? (
            <FullBleed>
              <RiderDashboard orders={orders} loading={loadingOrders} user={user} {...orderActions} onGoHome={() => navigate('/', 'menu')} />
            </FullBleed>
          ) : (
            <CustomerDashboard
              user={user}
              orders={orders}
              cart={cart}
              loading={loadingOrders}
              onOpenAuth={() => setIsAuthOpen(true)}
              onAddToCart={addToCart}
              onOpenCart={() => setIsCartOpen(true)}
              onUpdateUser={(updated) => {
                session.updateUser(updated);
                setUser(updated);
              }}
              onSelectOrder={(order) => {
                setTrackedOrder(order);
                trackedOrderStore.set(order.id);
                navigate('/tracking', 'tracking');
              }}
              onOpenProfile={() => (user ? setIsProfileOpen(true) : setIsAuthOpen(true))}
              onExploreMenu={() => navigate('/', 'menu')}
              onNavigate={requestView}
            />
          ))}

        {view === 'orders' &&
          (orders.length ? (
            <OrdersHistory
              orders={orders}
              onSelectOrder={(order) => {
                setTrackedOrder(order);
                trackedOrderStore.set(order.id);
                navigate('/tracking', 'tracking');
              }}
              onExploreMenu={() => navigate('/', 'menu')}
            />
          ) : (
            <EmptyState
              title="No orders yet"
              body="Once you place an order it will appear here with live tracking."
              actionLabel="Browse the menu"
              onAction={() => navigate('/', 'menu')}
            />
          ))}

        {view === 'tracking' &&
          (orders.length ? (
            <LiveTracking order={trackedOrder?.id ? orders.find((o) => o.id === trackedOrder.id) || trackedOrder : orders[0]} {...orderActions} />
          ) : (
            <EmptyState
              title="Nothing to track"
              body="Place an order and follow your courier live on the map."
              actionLabel="Browse the menu"
              onAction={() => navigate('/', 'menu')}
            />
          ))}

        {view === 'kitchen' && (
          <FullBleed>
            <KitchenBoard orders={orders} loading={loadingOrders} meals={meals} user={user} {...orderActions} onGoHome={() => navigate('/', 'menu')} />
          </FullBleed>
        )}

        {view === 'delivery' && (
          <FullBleed>
            <RiderDashboard orders={orders} loading={loadingOrders} user={user} {...orderActions} onGoHome={() => navigate('/', 'menu')} />
          </FullBleed>
        )}

        {view === 'admin' && (
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
              onGoHome={() => navigate('/', 'menu')}
            />
          </FullBleed>
        )}
      </main>

      {showAppChrome && (
        <>
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cart={cart}
            onUpdateQty={updateCartQty}
            onRemoveItem={removeCartItem}
            onProceedCheckout={(data) => setCheckoutData(data)}
          />

          <CheckoutModal
            isOpen={Boolean(checkoutData)}
            onClose={() => setCheckoutData(null)}
            checkoutData={checkoutData}
            onOrderPlaced={placeOrder}
            busy={orderBusy}
            user={user}
          />

          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onSuccess={(loggedInUser) => {
              session.updateUser(loggedInUser);
              setUser(loggedInUser);
              setIsAuthOpen(false);
              setIsLocationModalOpen(true);
              navigate(ROLE_HOME[loggedInUser.role] || '/dashboard', 'dashboard');
              showToast(`Welcome back, ${loggedInUser.name}.`, 'Signed in');
            }}
          />

          <LocationModal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            user={user}
            onSave={async ({ address, lat, lng }) => {
              try {
                const updated = await updateProfile({ location: address, lat, lng });
                session.updateUser(updated);
                setUser(updated);
                showToast(`Delivery area set to ${address}.`, 'Location updated');
                return updated;
              } catch (err) {
                showToast(err.message || 'Could not save your location.', 'Error', 'error');
                // Rethrow so the modal can stay open and let the customer retry
                // instead of closing on a write that never happened.
                throw err;
              }
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
              onOpenProfile={() => (user ? setIsProfileOpen(true) : setIsAuthOpen(true))}
              hasOrders={orders.length > 0}
            />
          )}
        </>
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

// ---------------------------------------------------------------------------
function routeFromView(path) {
  return routeFromPath(path).view;
}

function FullBleed({ children }) {
  return <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-28">{children}</div>;
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

function AccessGate({ view, signedIn, onSignIn, onGoHome, children }) {
  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <TriangleAlert className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">This area is restricted</h1>
        <p className="text-sm text-text-muted mb-6">
          {signedIn
            ? `Your account does not have access to the ${view} dashboard.`
            : 'Sign in with a staff account to open this dashboard.'}
        </p>
        <div className="flex gap-3 justify-center">
          {signedIn ? (
            <button type="button" onClick={onGoHome} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold">
              Back to the menu
            </button>
          ) : (
            <button type="button" onClick={onSignIn} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold">
              Sign in
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
