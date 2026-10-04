import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAdminAnalytics, getRiders, getReviews } from '../services/apiService';
import { eventBus } from '../services/eventBus';
import { SNACKBAR_MS, SNAPSHOT_POLL_MS } from '../utils/adminHelpers';
import { getAdminCache, setAdminCache, getSyncLocalCache } from '../utils/adminIndexedDB';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AdminCtx = createContext(null);

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — wraps AdminLayout and provides shared server state
// ---------------------------------------------------------------------------
export function AdminProvider({
  children,
  orders = [],
  meals = [],
  onMealsChange,
  onDeleteMeal,
  onUpdateStatus,
  onCancelOrder,
  onDeleteOrder,
  onSetNotes,
  user,
  onGoHome,
  loading,
  error,
  onRetry
}) {
  // Hydrate immediately from synchronous local storage cache for instant 1st paint
  const [analytics, setAnalytics] = useState(() => getSyncLocalCache('analytics'));
  const [analyticsError, setAnalyticsError] = useState(null);
  const [riders, setRiders] = useState(() => getSyncLocalCache('riders') || []);
  const [ridersError, setRidersError] = useState(null);
  const [reviews, setReviews] = useState(() => getSyncLocalCache('reviews') || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [banner, setBanner] = useState(null);
  const bannerTimer = useRef(null);

  // Asynchronously hydrate from IndexedDB if more recent
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cachedAnalytics, cachedRiders, cachedReviews] = await Promise.all([
        getAdminCache('analytics'),
        getAdminCache('riders'),
        getAdminCache('reviews')
      ]);
      if (!mounted) return;
      if (cachedAnalytics) setAnalytics((prev) => prev || cachedAnalytics);
      if (Array.isArray(cachedRiders) && cachedRiders.length > 0) {
        setRiders((prev) => (prev.length > 0 ? prev : cachedRiders));
      }
      if (Array.isArray(cachedReviews) && cachedReviews.length > 0) {
        setReviews((prev) => (prev.length > 0 ? prev : cachedReviews));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Cache orders & meals whenever they are passed in
  useEffect(() => {
    if (Array.isArray(orders) && orders.length > 0) {
      setAdminCache('orders', orders);
    }
  }, [orders]);

  useEffect(() => {
    if (Array.isArray(meals) && meals.length > 0) {
      setAdminCache('meals', meals);
    }
  }, [meals]);

  const announce = useCallback((tone, text) => {
    setBanner({ tone, text });
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), SNACKBAR_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(bannerTimer.current), []);

  const loadSnapshot = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setIsRefreshing(true);
    const results = await Promise.allSettled([
      getAdminAnalytics(),
      getRiders(),
      getReviews()
    ]);
    const [analyticsResult, ridersResult, reviewsResult] = results;

    if (analyticsResult.status === 'fulfilled') {
      const freshAnalytics = analyticsResult.value || null;
      setAnalytics(freshAnalytics);
      setAnalyticsError(null);
      if (freshAnalytics) setAdminCache('analytics', freshAnalytics);
    } else {
      setAnalyticsError(analyticsResult.reason?.message || 'Could not load analytics.');
    }

    if (ridersResult.status === 'fulfilled') {
      const freshRiders = Array.isArray(ridersResult.value) ? ridersResult.value : [];
      setRiders(freshRiders);
      setRidersError(null);
      if (freshRiders.length > 0) setAdminCache('riders', freshRiders);
    } else {
      setRidersError(ridersResult.reason?.message || 'Could not load the rider fleet.');
    }

    if (reviewsResult.status === 'fulfilled') {
      const freshReviews = Array.isArray(reviewsResult.value) ? reviewsResult.value : [];
      setReviews(freshReviews);
      if (freshReviews.length > 0) setAdminCache('reviews', freshReviews);
    }

    setHasLoadedInitial(true);
    if (!quiet) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadSnapshot();
    const timer = window.setInterval(() => {
      if (!document.hidden) loadSnapshot({ quiet: true });
    }, SNAPSHOT_POLL_MS);
    const offNew     = eventBus.on('NEW_ORDER',           () => loadSnapshot({ quiet: true }));
    const offStatus  = eventBus.on('ORDER_STATUS_UPDATE',  () => loadSnapshot({ quiet: true }));
    const offDeleted = eventBus.on('ORDER_DELETED',        () => loadSnapshot({ quiet: true }));
    const offFleet   = eventBus.on('RIDER_FLEET_UPDATED',  (fleet) => {
      if (Array.isArray(fleet)) setRiders(fleet);
      else loadSnapshot({ quiet: true });
    });
    return () => {
      window.clearInterval(timer);
      offNew();
      offStatus();
      offDeleted();
      offFleet();
    };
  }, [loadSnapshot]);

  const value = useMemo(
    () => ({
      // server data
      analytics, analyticsError,
      riders, setRiders, ridersError,
      reviews,
      isRefreshing, loadSnapshot,
      // prop-provided orders / meals
      orders, meals, onMealsChange, onDeleteMeal,
      // actions
      onUpdateStatus, onCancelOrder, onDeleteOrder, onSetNotes,
      // user / nav
      user, onGoHome, loading, error, onRetry,
      // ui
      hasLoadedInitial,
      soundEnabled, setSoundEnabled,
      announce, banner,
    }),
    [
      analytics, analyticsError,
      riders, ridersError,
      reviews,
      isRefreshing, loadSnapshot,
      orders, meals, onMealsChange, onDeleteMeal,
      onUpdateStatus, onCancelOrder, onDeleteOrder, onSetNotes,
      user, onGoHome, loading, error, onRetry,
      hasLoadedInitial, soundEnabled, banner, announce
    ]
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
