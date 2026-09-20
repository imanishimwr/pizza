import React, { useState, useEffect, useRef, useMemo } from 'react';
import AddFoodItemModal from '../../components/admin/AddFoodItemModal';
import {
  Shield, TrendingUp, DollarSign, ShoppingBag, Users, Plus, UtensilsCrossed,
  Trash2, CheckCircle2, AlertCircle, Edit, RefreshCw, MapPin, Bike, Navigation,
  Download, Tag, UserCheck, Calendar, Check, X, BarChart3, LineChart, Sparkles,
  Layers, ChevronRight, Activity, Clock, Search, Filter, ChevronLeft, Eye,
  Percent, ArrowUpRight, Flame, PieChart, ChefHat, Copy, CheckCircle, Phone
} from 'lucide-react';
import L from 'leaflet';
import { apiService } from '../../services/apiService';

export default function AdminDashboard({
  meals = [],
  setMeals,
  orders = [],
  onUpdateStatus,
  user: initialUser
}) {
  // Navigation Tabs: 'overview' | 'catalog' | 'orders' | 'vouchers'
  const [activeTab, setActiveTab] = useState('overview');

  const [user] = useState(() => initialUser || apiService.getUser() || {
    name: 'System Administrator',
    email: 'admin@hotpot.rw',
    role: 'ADMIN'
  });

  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [chartMode, setChartMode] = useState('line'); // 'line' | 'bar'
  const [hoveredDay, setHoveredDay] = useState(null);
  const [copyToast, setCopyToast] = useState('');

  // Map refs for Admin Tracking Modal
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [riderSpeed, setRiderSpeed] = useState('36 km/h');
  const [riderDistanceRemaining, setRiderDistanceRemaining] = useState('2.1 km');

  // Search & Pagination states
  const [mealSearch, setMealSearch] = useState('');
  const [mealCategoryFilter, setMealCategoryFilter] = useState('all');
  const [mealPage, setMealPage] = useState(1);
  const mealsPerPage = 6;

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 6;

  // Sales & Transactions Report Filter States
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState('all');
  const [salesPage, setSalesPage] = useState(1);
  const salesPerPage = 8;

  // Active display orders (strictly live backend orders from Neon DB)
  const displayOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  const readyOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'ready');
  }, [displayOrders]);

  // Sold orders (handed over to rider / out for delivery or delivered)
  const soldOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'delivery' || o.status === 'delivered');
  }, [displayOrders]);

  const soldRevenue = useMemo(() => {
    return soldOrders.reduce((acc, o) => acc + (Number(o.totalRWF) || 0), 0);
  }, [soldOrders]);

  const soldItemsCount = useMemo(() => {
    return soldOrders.reduce((acc, o) => acc + (o.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0), 0);
  }, [soldOrders]);

  const filteredSoldOrders = useMemo(() => {
    return soldOrders.filter(o => {
      const matchSearch =
        !salesSearch.trim() ||
        String(o.id || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
        String(o.customerName || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
        String(o.phone || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
        (o.items || []).some(it => String(it.name || '').toLowerCase().includes(salesSearch.toLowerCase()));

      const matchPay =
        salesPaymentFilter === 'all' ||
        String(o.paymentMethod || '').toLowerCase().includes(salesPaymentFilter.toLowerCase());

      const matchStatus =
        salesStatusFilter === 'all' || o.status === salesStatusFilter;

      return matchSearch && matchPay && matchStatus;
    });
  }, [soldOrders, salesSearch, salesPaymentFilter, salesStatusFilter]);

  const totalSalesPages = Math.ceil(filteredSoldOrders.length / salesPerPage) || 1;
  const paginatedSoldOrders = useMemo(() => {
    const start = (salesPage - 1) * salesPerPage;
    return filteredSoldOrders.slice(start, start + salesPerPage);
  }, [filteredSoldOrders, salesPage, salesPerPage]);

  const handleExportSalesCSV = () => {
    if (soldOrders.length === 0) {
      alert("No sold transactions recorded yet.");
      return;
    }
    const headers = ["Order ID", "Date", "Customer Name", "Phone", "Delivery Address", "Items Sold", "Payment Method", "Total RWF", "Status"];
    const rows = soldOrders.map(o => [
      `"${o.id}"`,
      `"${o.orderTime || o.created_at || 'N/A'}"`,
      `"${o.customerName || 'Customer'}"`,
      `"${o.phone || ''}"`,
      `"${o.deliveryAddress || ''}"`,
      `"${(o.items || []).map(i => `${i.qty}x ${i.name}`).join('; ')}"`,
      `"${o.paymentMethod || 'MTN MoMo'}"`,
      o.totalRWF || 0,
      `"${o.status}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HotPot_Sales_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Vouchers state (loaded from Neon DB)
  const [vouchers, setVouchers] = useState([]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherVal, setNewVoucherVal] = useState('');
  const [newVoucherDesc, setNewVoucherDesc] = useState('');
  const [isAddingVoucher, setIsAddingVoucher] = useState(false);

  // Fleet Riders
  const [assignedRiders, setAssignedRiders] = useState({});

  // Edit meal fields
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('hotpot');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Computed metrics directly from database orders
  const [analytics, setAnalytics] = useState({ totalRevenueRWF: 0, totalOrdersCount: 0, activeOrdersCount: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalRevenue = useMemo(() => {
    if (analytics.totalRevenueRWF > 0) return analytics.totalRevenueRWF;
    return displayOrders.reduce((acc, o) => acc + (Number(o.totalRWF) || 0), 0);
  }, [analytics.totalRevenueRWF, displayOrders]);

  const totalOrdersCount = useMemo(() => {
    if (analytics.totalOrdersCount > 0) return analytics.totalOrdersCount;
    return displayOrders.length;
  }, [analytics.totalOrdersCount, displayOrders]);

  const activeKitchenCount = useMemo(() => {
    if (analytics.activeOrdersCount > 0) return analytics.activeOrdersCount;
    return displayOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
  }, [analytics.activeOrdersCount, displayOrders]);

  const avgOrderValue = useMemo(() => {
    return totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  }, [totalRevenue, totalOrdersCount]);

  // Compute 7-day live revenue trend directly from database orders
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      buckets.push({ day: dayName, dateStr: d.toISOString().slice(0, 10), rev: 0, orders: 0 });
    }

    if (displayOrders.length > 0) {
      for (const o of displayOrders) {
        const oDate = o.created_at ? new Date(o.created_at) : new Date();
        const oDateStr = oDate.toISOString().slice(0, 10);
        const bucket = buckets.find(b => b.dateStr === oDateStr);
        const orderRev = Number(o.totalRWF) || 0;
        if (bucket) {
          bucket.rev += orderRev;
          bucket.orders += 1;
        } else {
          buckets[buckets.length - 1].rev += orderRev;
          buckets[buckets.length - 1].orders += 1;
        }
      }
    }
    return buckets;
  }, [displayOrders]);

  const loadAdminData = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const [vouchs, stats] = await Promise.all([
        apiService.getVouchers(),
        apiService.getAdminAnalytics(token)
      ]);
      if (Array.isArray(vouchs)) setVouchers(vouchs);
      if (stats) setAnalytics(stats);
    } catch (err) {
      // Fallback gracefully
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Hot Pot Kigali Coordinates (-1.9702, 30.1250)
  const restaurantCoords = [-1.9702, 30.1250];
  const deliveryCoords = [-1.9360, 30.0820];

  // Leaflet Map for Admin Tracking Modal
  useEffect(() => {
    if (!trackingOrder || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView(restaurantCoords, 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Restaurant Kitchen Marker
    const restIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#AE3200;color:white;padding:5px 10px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🍲 HotPot Kitchen</div>'
    });
    L.marker(restaurantCoords, { icon: restIcon }).addTo(map).bindPopup('<b>HotPot Delights Kitchen (Cooker Ready)</b>').openPopup();

    // Client Destination Marker
    const destIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#128731;color:white;padding:5px 10px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">📍 ' + (trackingOrder.customerName || 'Client') + '</div>'
    });
    L.marker(deliveryCoords, { icon: destIcon }).addTo(map).bindPopup('<b>' + (trackingOrder.address || 'Kigali Destination') + '</b>');

    // Route Polyline
    L.polyline([restaurantCoords, deliveryCoords], {
      color: '#AE3200',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.8
    }).addTo(map);

    // Rider Marker
    const riderName = assignedRiders[trackingOrder.id] || trackingOrder.riderName || 'Eric M. (Moto #1)';
    const riderIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#2563eb;color:white;padding:4px 8px;border-radius:15px;font-size:11px;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.6);border:2px solid #60a5fa">🛵 ' + riderName + '</div>'
    });

    const startLat = restaurantCoords[0];
    const startLng = restaurantCoords[1];
    const endLat = deliveryCoords[0];
    const endLng = deliveryCoords[1];

    riderMarkerRef.current = L.marker([startLat, startLng], { icon: riderIcon }).addTo(map);

    let progress = trackingOrder.status === 'ready' ? 0.05 : trackingOrder.status === 'delivery' ? 0.5 : 0.95;
    let direction = 1;

    const animateRider = () => {
      if (trackingOrder.status === 'delivery') {
        progress += 0.0008 * direction;
        if (progress >= 0.92) direction = -1;
        if (progress <= 0.1) direction = 1;
      }

      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng([currentLat, currentLng]);
      }

      const distLeft = ((1 - progress) * (trackingOrder?.distanceKm || 3.5)).toFixed(1);
      setRiderDistanceRemaining(`${distLeft} km`);
      setRiderSpeed(trackingOrder.status === 'delivery' ? `${Math.floor(32 + Math.random() * 10)} km/h` : '0 km/h (At Kitchen)');

      animFrameRef.current = requestAnimationFrame(animateRider);
    };

    animFrameRef.current = requestAnimationFrame(animateRider);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trackingOrder, assignedRiders]);

  // Called by AddFoodItemModal when a new dish is saved
  const handleMealSaved = (newItem) => {
    if (setMeals) setMeals(prev => [newItem, ...prev]);
  };

  const handleOpenEdit = (meal) => {
    setEditingMeal(meal);
    setEditName(meal.name);
    setEditPrice(meal.price);
    setEditCategory(meal.category);
    setEditDesc(meal.description || '');
  };

  const handleSaveEditMeal = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;
    setIsSavingEdit(true);

    try {
      const token = localStorage.getItem('token');
      const updated = await apiService.updateMeal(editingMeal.id, {
        name: editName,
        price: parseInt(editPrice),
        category: editCategory,
        description: editDesc
      }, token);

      if (setMeals) setMeals(meals.map(m => m.id === editingMeal.id ? updated : m));
      setEditingMeal(null);
    } catch (err) {
      if (setMeals) setMeals(meals.map(m => m.id === editingMeal.id ? { ...m, name: editName, price: parseInt(editPrice), category: editCategory, description: editDesc } : m));
      setEditingMeal(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMeal = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the menu catalog?`)) {
      try {
        const token = localStorage.getItem('token');
        await apiService.deleteMeal(id, token);
        if (setMeals) setMeals(meals.filter(m => m.id !== id));
      } catch (err) {
        if (setMeals) setMeals(meals.filter(m => m.id !== id));
      }
    }
  };

  const handleToggleStock = async (id) => {
    try {
      const meal = meals.find(m => m.id === id);
      const token = localStorage.getItem('token');
      const updated = await apiService.updateMeal(id, { outOfStock: !meal.outOfStock }, token);
      if (setMeals) setMeals(meals.map(m => m.id === id ? updated : m));
    } catch (err) {
      if (setMeals) setMeals(meals.map(m => m.id === id ? { ...m, outOfStock: !m.outOfStock } : m));
    }
  };

  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucherCode || !newVoucherVal) return;
    setIsAddingVoucher(true);
    
    try {
      const token = localStorage.getItem('token');
      const created = await apiService.createVoucher({
        code: newVoucherCode.toUpperCase().trim(),
        discountAmount: parseFloat(newVoucherVal),
        description: newVoucherDesc.trim() || 'Promo Discount'
      }, token);
      
      setVouchers([created, ...vouchers]);
      setNewVoucherCode('');
      setNewVoucherVal('');
      setNewVoucherDesc('');
    } catch (err) {
      setVouchers([
        { id: `vouch-${Date.now()}`, code: newVoucherCode.toUpperCase().trim(), discountAmount: parseFloat(newVoucherVal), description: newVoucherDesc.trim() || 'Promo Discount' },
        ...vouchers
      ]);
      setNewVoucherCode('');
      setNewVoucherVal('');
      setNewVoucherDesc('');
    } finally {
      setIsAddingVoucher(false);
    }
  };

  const handleCopyVoucher = (code) => {
    navigator.clipboard?.writeText(code);
    setCopyToast(`Copied code ${code}!`);
    setTimeout(() => setCopyToast(''), 2500);
  };

  const handleExportCSV = () => {
    const dataToExport = displayOrders;
    if (dataToExport.length === 0) {
      alert("No orders available to export.");
      return;
    }
    const csvRows = [
      ['Order ID', 'Customer Name', 'Phone', 'Address', 'Total RWF', 'Status', 'Date'],
      ...dataToExport.map(o => [
        o.id,
        `"${o.customerName || 'Customer'}"`,
        o.phone || 'N/A',
        `"${o.address || 'Kigali'}"`,
        o.totalRWF || 0,
        o.status,
        o.created_at || new Date().toISOString()
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HotPot_Orders_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Helpers
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
      case 'ready':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-400/60 font-bold animate-pulse';
      case 'delivery':
      case 'delivering':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'preparing':
      case 'cooking':
        return 'bg-blue-950/80 text-blue-400 border-blue-500/40';
      case 'cancelled':
        return 'bg-red-950/80 text-red-400 border-red-500/40';
      default:
        return 'bg-purple-950/80 text-purple-400 border-purple-500/40';
    }
  };

  const getTrackingStepNumber = (status) => {
    const map = { pending: 1, preparing: 2, cooking: 2, ready: 3, delivery: 4, delivering: 4, delivered: 5 };
    return map[status?.toLowerCase()] ?? 1;
  };

  // Filtered Catalog
  const filteredMeals = useMemo(() => {
    return meals.filter(m => {
      const matchCategory = mealCategoryFilter === 'all' || m.category?.toLowerCase() === mealCategoryFilter.toLowerCase();
      const matchSearch = !mealSearch.trim() || m.name?.toLowerCase().includes(mealSearch.toLowerCase()) || m.description?.toLowerCase().includes(mealSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [meals, mealCategoryFilter, mealSearch]);

  const totalMealPages = Math.max(1, Math.ceil(filteredMeals.length / mealsPerPage));
  const paginatedMeals = filteredMeals.slice((mealPage - 1) * mealsPerPage, mealPage * mealsPerPage);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return displayOrders.filter(o => {
      const matchStatus = orderStatusFilter === 'all' || o.status?.toLowerCase() === orderStatusFilter.toLowerCase();
      const q = orderSearch.toLowerCase().trim();
      const matchSearch = !q ||
        o.id?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.address?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [displayOrders, orderStatusFilter, orderSearch]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

  // SVG Chart Geometry
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxRev = useMemo(() => {
    const highest = Math.max(...weeklyData.map(d => d.rev), 10000);
    return Math.ceil(highest / 10000) * 10000;
  }, [weeklyData]);

  const points = weeklyData.map((d, i) => {
    const x = paddingX + (i * (chartWidth - 2 * paddingX)) / (weeklyData.length - 1);
    const y = chartHeight - paddingY - (d.rev / maxRev) * (chartHeight - 2 * paddingY);
    return { x, y, day: d.day, rev: d.rev, orders: d.orders };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* 1. Hero / Admin Profile Header (Matching CustomerDashboard VIP Banner) */}
      <div className="bg-gradient-to-br from-surface-dark via-surface-card to-surface-dark border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Admin Identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full bg-[#121218] rounded-2xl sm:rounded-3xl flex items-center justify-center">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#121218] flex items-center justify-center" title="System Online">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user?.name || 'System Administrator'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Neon PostgreSQL Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-1 flex items-center gap-2">
                <span>{user?.email || 'admin@hotpot.rw'}</span>
                <span>•</span>
                <span className="text-text-subdued font-mono">Kigali Operations HQ</span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setShowAddMeal(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-white/5"
              title="Export Orders Report"
            >
              <Download className="w-4 h-4 text-accent-gold" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={loadAdminData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-primary/40 text-text-muted hover:text-white transition-all hover:bg-white/5"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Hero Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/5">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col">
            <span className="text-[11px] text-text-muted font-medium">Gross Revenue</span>
            <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 mt-0.5">
              {totalRevenue.toLocaleString()} RWF
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col">
            <span className="text-[11px] text-text-muted font-medium">Total Orders</span>
            <span className="text-base sm:text-lg font-mono font-bold text-white mt-0.5">
              {totalOrdersCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col">
            <span className="text-[11px] text-text-muted font-medium">Cooker Ready (Dispatch)</span>
            <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {readyOrders.length} Ready
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col">
            <span className="text-[11px] text-text-muted font-medium">Active In Kitchen</span>
            <span className="text-base sm:text-lg font-mono font-bold text-amber-400 mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              {activeKitchenCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── Cooker Confirmed Ready Notification Strip for Admin ── */}
      {readyOrders.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/50 to-surface-card border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  Cooker Confirmed: {readyOrders.length} Order(s) Ready for Dispatch! 🍲
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Head chef / kitchen cookers have finished preparing & packaging these orders at HotPot HQ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('orders');
                setOrderStatusFilter('ready');
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View & Dispatch Ready Orders</span>
            </button>

            {readyOrders[0] && (
              <button
                onClick={() => setTrackingOrder(readyOrders[0])}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Track First Ready Order"
              >
                <Navigation className="w-4 h-4 text-accent-gold" />
                <span className="hidden sm:inline">Track #{readyOrders[0].id}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Sleek Tab Navigation Strip (Matching CustomerDashboard pill tabs) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-card/80 border border-white/10 rounded-2xl backdrop-blur-md overflow-x-auto no-scrollbar shadow-lg">
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: TrendingUp },
          { id: 'catalog', label: 'Menu Catalog', icon: UtensilsCrossed, badge: meals.length },
          { id: 'orders', label: 'Live Orders & Dispatch', icon: ShoppingBag, badge: displayOrders.length },
          { id: 'sales', label: 'Sales & Financial Reports', icon: DollarSign, badge: soldOrders.length },
          { id: 'vouchers', label: 'Vouchers & Promos', icon: Tag, badge: vouchers.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.02]'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-text-muted'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & ANALYTICS                             */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-card border border-white/10 hover:border-emerald-500/30 transition-all shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Total Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-3">
                {totalRevenue.toLocaleString()} <span className="text-xs text-text-muted font-sans font-normal">RWF</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-2">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>100% Live DB Synchronized</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-card border border-white/10 hover:border-primary/30 transition-all shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Total Orders</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-3">
                {totalOrdersCount}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium mt-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>Real-time customer transactions</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-card border border-white/10 hover:border-amber-500/30 transition-all shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Cooker Ready / Active</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <ChefHat className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-3 flex items-center gap-2">
                {readyOrders.length} Ready
                {readyOrders.length > 0 && (
                  <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">
                    Dispatch Now
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeKitchenCount} currently in cooking</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-card border border-white/10 hover:border-purple-500/30 transition-all shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Average Ticket Size</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono mt-3">
                {avgOrderValue.toLocaleString()} <span className="text-xs text-text-muted font-sans font-normal">RWF</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-purple-400 font-bold mt-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Per completed basket</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Chart Card */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-card border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  7-Day Revenue & Session Trendline
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Calculated dynamically from real database order volumes across Kigali
                </p>
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    chartMode === 'line' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Line</span>
                </button>
                <button
                  onClick={() => setChartMode('bar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    chartMode === 'bar' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar</span>
                </button>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 select-none overflow-visible">
                  <defs>
                    <linearGradient id="adminChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = paddingY + pct * (chartHeight - 2 * paddingY);
                    const val = Math.round(maxRev * (1 - pct));
                    return (
                      <g key={idx}>
                        <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="monospace">
                          {val > 0 ? `${(val / 1000).toFixed(0)}k` : '0'}
                        </text>
                      </g>
                    );
                  })}

                  {/* Line Chart */}
                  {chartMode === 'line' && (
                    <>
                      <path d={areaD} fill="url(#adminChartAreaGrad)" />
                      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {points.map((pt, idx) => {
                        const isHovered = hoveredDay === pt.day;
                        return (
                          <g key={idx} onMouseEnter={() => setHoveredDay(pt.day)} onMouseLeave={() => setHoveredDay(null)} className="cursor-pointer">
                            <circle cx={pt.x} cy={pt.y} r={isHovered ? 7 : 4} fill="#f97316" stroke="#ffffff" strokeWidth="2" className="transition-all" />
                            {isHovered && (
                              <g>
                                <rect x={pt.x - 55} y={pt.y - 42} width="110" height="34" rx="8" fill="#181824" stroke="rgba(249,115,22,0.6)" strokeWidth="1" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
                                <text x={pt.x} y={pt.y - 28} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                                  {pt.rev.toLocaleString()} RWF
                                </text>
                                <text x={pt.x} y={pt.y - 14} textAnchor="middle" fontSize="9" fill="#9ca3af">
                                  {pt.orders} orders
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* Bar Chart */}
                  {chartMode === 'bar' && (
                    <>
                      {points.map((pt, idx) => {
                        const barWidth = 32;
                        const barHeight = Math.max(4, chartHeight - paddingY - pt.y);
                        const isHovered = hoveredDay === pt.day;
                        return (
                          <g key={idx} onMouseEnter={() => setHoveredDay(pt.day)} onMouseLeave={() => setHoveredDay(null)} className="cursor-pointer">
                            <rect
                              x={pt.x - barWidth / 2}
                              y={pt.y}
                              width={barWidth}
                              height={barHeight}
                              rx="6"
                              fill="url(#adminBarGrad)"
                              opacity={isHovered ? 1 : 0.85}
                              className="transition-all"
                            />
                            {isHovered && (
                              <g>
                                <rect x={pt.x - 55} y={pt.y - 38} width="110" height="30" rx="6" fill="#181824" stroke="rgba(249,115,22,0.6)" strokeWidth="1" />
                                <text x={pt.x} y={pt.y - 22} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                                  {pt.rev.toLocaleString()} RWF
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* Day Labels */}
                  {weeklyData.map((item, idx) => {
                    const x = paddingX + (idx * (chartWidth - 2 * paddingX)) / (weeklyData.length - 1);
                    return (
                      <text key={idx} x={x} y={chartHeight - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#a1a1aa">
                        {item.day}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Operations Pulse & Recent Orders Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="p-5 sm:p-6 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center justify-between">
                <span>Order Pipeline Status</span>
                <span className="text-xs text-text-muted font-normal">{displayOrders.length} Total</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-purple-400" /> Pending</span>
                    <span className="font-bold text-white">{displayOrders.filter(o => o.status === 'pending').length}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(displayOrders.filter(o => o.status === 'pending').length / Math.max(1, displayOrders.length)) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><ChefHat className="w-3.5 h-3.5 text-blue-400" /> Preparing in Kitchen</span>
                    <span className="font-bold text-white">{displayOrders.filter(o => o.status === 'preparing').length}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(displayOrders.filter(o => o.status === 'preparing').length / Math.max(1, displayOrders.length)) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cooker Confirmed Ready</span>
                    <span className="font-bold text-emerald-400">{readyOrders.length}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(readyOrders.length / Math.max(1, displayOrders.length)) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><Bike className="w-3.5 h-3.5 text-amber-400" /> Out for Delivery</span>
                    <span className="font-bold text-white">{displayOrders.filter(o => o.status === 'delivery' || o.status === 'delivering').length}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(displayOrders.filter(o => o.status === 'delivery' || o.status === 'delivering').length / Math.max(1, displayOrders.length)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders List Preview */}
            <div className="p-5 sm:p-6 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Recent Orders
                </h4>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {displayOrders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setTrackingOrder(order)}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/40 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>#{order.id}</span>
                        <span className="text-text-muted font-normal">• {order.customerName || 'Customer'}</span>
                      </div>
                      <div className="text-[11px] text-text-subdued mt-0.5">
                        {order.items?.length || 1} items • {order.address || 'Kigali'}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{(order.totalRWF || 0).toLocaleString()} RWF</div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 capitalize ${getStatusBadge(order.status)}`}>
                          {order.status === 'ready' ? 'Cooker Ready' : order.status}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrackingOrder(order);
                        }}
                        className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                        title="Track this order live"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {displayOrders.length === 0 && (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No orders in database yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MENU CATALOG                                     */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search, Category Filter, and Add Dish */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={mealSearch}
                onChange={(e) => { setMealSearch(e.target.value); setMealPage(1); }}
                placeholder="Search dish name, description..."
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
              {mealSearch && (
                <button onClick={() => setMealSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'hotpot', label: 'Hotpot' },
                { id: 'pizzas', label: 'Pizzas' },
                { id: 'broths', label: 'Broths' },
                { id: 'noodles', label: 'Noodles' },
                { id: 'sides', label: 'Sides' },
                { id: 'drinks', label: 'Drinks' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setMealCategoryFilter(cat.id); setMealPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    mealCategoryFilter === cat.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface-card text-text-muted hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddMeal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dish</span>
            </button>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedMeals.map((meal) => (
              <div
                key={meal.id}
                className="bg-surface-card border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-black">
                    <img
                      src={meal.image || meal.fallbackImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'}
                      alt={meal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                        {meal.category}
                      </span>
                      {meal.spicy && (
                        <span className="px-2 py-1 rounded-lg bg-red-950/80 backdrop-blur-md border border-red-500/30 text-[10px] font-bold text-red-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-red-500" />
                          Spicy
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleStock(meal.id)}
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold border transition-all ${
                        meal.outOfStock
                          ? 'bg-red-950/90 text-red-400 border-red-500/40'
                          : 'bg-emerald-950/90 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {meal.outOfStock ? 'Sold Out' : 'In Stock'}
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-white text-sm line-clamp-1">{meal.name}</h4>
                      <span className="font-mono font-bold text-primary text-sm whitespace-nowrap">
                        {(meal.price || 0).toLocaleString()} RWF
                      </span>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2">{meal.description || 'Delicious dish freshly prepared.'}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => handleOpenEdit(meal)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-main font-bold text-xs flex items-center justify-center gap-1.5 border border-white/5 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5 text-primary" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteMeal(meal.id, meal.name)}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all"
                    title="Delete meal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredMeals.length === 0 && (
            <div className="py-16 text-center text-text-muted text-sm bg-surface-card rounded-2xl border border-white/5">
              No menu items matched your search criteria.
            </div>
          )}

          {/* Pagination */}
          {totalMealPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setMealPage(p => Math.max(1, p - 1))}
                disabled={mealPage === 1}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-muted font-bold px-3">
                Page {mealPage} of {totalMealPages}
              </span>
              <button
                onClick={() => setMealPage(p => Math.min(totalMealPages, p + 1))}
                disabled={mealPage === totalMealPages}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LIVE ORDERS & DISPATCH                           */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter, Search & Status Strip */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                placeholder="Search by ID, customer name, phone..."
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
              {orderSearch && (
                <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'ready', label: `Cooker Ready (${readyOrders.length})` },
                { id: 'pending', label: 'Pending' },
                { id: 'preparing', label: 'Cooking' },
                { id: 'delivery', label: 'On Way' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => { setOrderStatusFilter(st.id); setOrderPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    orderStatusFilter === st.id
                      ? 'bg-primary text-white shadow-md'
                      : st.id === 'ready' && readyOrders.length > 0
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-surface-card text-text-muted hover:text-white border border-white/5'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-sm">#{order.id}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${getStatusBadge(order.status)}`}>
                          {order.status === 'ready' ? '🍲 Cooker Confirmed Ready' : order.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-text-main mt-1">{order.customerName || 'Customer'}</div>
                      <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span>📞 {order.phone || 'N/A'}</span>
                        <span>•</span>
                        <span>📍 {order.address || 'Kigali'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black font-mono text-primary">
                        {(order.totalRWF || 0).toLocaleString()} RWF
                      </div>
                      <div className="text-[10px] text-text-subdued font-mono mt-0.5">
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-2 space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-xs text-text-muted flex items-center justify-between">
                        <span>
                          <strong className="text-white">{item.qty || 1}x</strong> {item.name}
                          {item.spice && <span className="text-orange-400 text-[10px] ml-1">({item.spice})</span>}
                          {item.broth && <span className="text-amber-300 text-[10px] ml-1">[{item.broth}]</span>}
                        </span>
                        <span className="font-mono text-white text-[11px]">{(item.price || 0).toLocaleString()} RWF</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Transitions, Rider Assignment & Live Tracking */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-text-subdued uppercase">Update:</span>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => onUpdateStatus?.(order.id, 'preparing')}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all"
                      >
                        Accept & Cook
                      </button>
                    )}
                    {(order.status === 'preparing' || order.status === 'ready') && (
                      <button
                        onClick={() => onUpdateStatus?.(order.id, 'delivery')}
                        className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-600 hover:text-white transition-all"
                      >
                        Dispatch to Rider
                      </button>
                    )}
                    {order.status === 'delivery' && (
                      <button
                        onClick={() => onUpdateStatus?.(order.id, 'delivered')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => onUpdateStatus?.(order.id, 'cancelled')}
                        className="px-2 py-1 rounded-lg bg-red-950/40 text-red-400 border border-red-500/30 text-[11px] font-bold hover:bg-red-600 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Track Order Modal Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTrackingOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary text-primary hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Track Order</span>
                    </button>

                    {/* Rider Assignment */}
                    <div className="flex items-center gap-1 text-xs">
                      <select
                        value={assignedRiders[order.id] || order.riderName || ''}
                        onChange={(e) => {
                          const rName = e.target.value;
                          setAssignedRiders(prev => ({ ...prev, [order.id]: rName }));
                        }}
                        className="bg-surface-dark border border-white/10 rounded-lg px-2 py-1 text-[11px] text-text-main focus:outline-none focus:border-primary"
                      >
                        <option value="">Rider: Auto</option>
                        <option value="Emmanuel N. (Moto #1)">Emmanuel N.</option>
                        <option value="Jean-Paul M. (Moto #2)">Jean-Paul M.</option>
                        <option value="Eric K. (Moto #3)">Eric K.</option>
                        <option value="Sandrine U. (Moto #4)">Sandrine U.</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="py-16 text-center text-text-muted text-sm bg-surface-card rounded-2xl border border-white/5">
              No orders matched your search or status filter.
            </div>
          )}

          {/* Pagination */}
          {totalOrderPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                disabled={orderPage === 1}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-muted font-bold px-3">
                Page {orderPage} of {totalOrderPages}
              </span>
              <button
                onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                disabled={orderPage === totalOrderPages}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: SALES & FINANCIAL TRANSACTIONS REPORT              */}
      {/* ======================================================== */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sales Top Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-surface-card to-surface-card border border-emerald-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Total Sales Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {soldRevenue.toLocaleString()} <span className="text-xs text-text-muted font-sans font-normal">RWF</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Handed to courier / Sold items</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-surface-card to-surface-card border border-blue-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Sold Transactions</span>
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {soldOrders.length}
              </div>
              <div className="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
                <Bike className="w-3.5 h-3.5" />
                <span>Dispatched or Delivered</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-surface-card to-surface-card border border-purple-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Dishes Delivered</span>
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {soldItemsCount}
              </div>
              <div className="text-[11px] text-purple-300 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Cooked & Fulfilled</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-surface-card to-surface-card border border-amber-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Avg. Sale Ticket</span>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {(soldOrders.length > 0 ? Math.round(soldRevenue / soldOrders.length) : 0).toLocaleString()} <span className="text-xs text-text-muted font-sans font-normal">RWF</span>
              </div>
              <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Per completed sale</span>
              </div>
            </div>
          </div>

          {/* Sales Toolbar & Export */}
          <div className="p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={salesSearch}
                  onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
                  placeholder="Search sales by order #, customer, dish..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-emerald-500"
                />
                {salesSearch && (
                  <button onClick={() => setSalesSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white">✕</button>
                )}
              </div>

              {/* Payment Filter */}
              <select
                value={salesPaymentFilter}
                onChange={(e) => { setSalesPaymentFilter(e.target.value); setSalesPage(1); }}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Payment Methods</option>
                <option value="momo">MTN Mobile Money</option>
                <option value="airtel">Airtel Money</option>
                <option value="card">Credit / Debit Card</option>
                <option value="cash">Cash on Delivery</option>
              </select>

              {/* Status Filter */}
              <select
                value={salesStatusFilter}
                onChange={(e) => { setSalesStatusFilter(e.target.value); setSalesPage(1); }}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Sold Statuses</option>
                <option value="delivery">In Delivery (Rider Active)</option>
                <option value="delivered">Delivered & Closed</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportSalesCSV}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Sales CSV Ledger</span>
            </button>
          </div>

          {/* Sales Transaction Ledger Table */}
          <div className="space-y-3">
            {paginatedSoldOrders.length === 0 ? (
              <div className="p-12 text-center bg-surface-card rounded-2xl border border-dashed border-white/10 text-xs text-text-subdued space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-text-subdued opacity-40" />
                <div className="font-bold text-white text-sm">No Sold Transactions Recorded</div>
                <p className="text-text-muted">Orders handed to couriers by kitchen cookers will appear here in the live financial ledger.</p>
              </div>
            ) : (
              paginatedSoldOrders.map(order => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-surface-card border border-white/10 hover:border-emerald-500/40 shadow-xl transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-emerald-400 text-base">#{order.id}</span>
                      <span className="text-sm font-bold text-white">{order.customerName || 'Customer'}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SOLD & PAID
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted font-mono">{order.orderTime || order.created_at || 'Today'}</span>
                      <span className="text-base font-black text-white font-mono">
                        {Number(order.totalRWF || 0).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Delivery & Customer Info */}
                    <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">Customer & Delivery:</span>
                      <div className="text-text-main font-semibold">{order.customerName || 'Customer'}</div>
                      <div className="text-text-muted flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-400" />
                        <span>{order.phone || '+250 788 000 000'}</span>
                      </div>
                      <div className="text-text-muted truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{order.deliveryAddress || 'Kigali'}</span>
                      </div>
                    </div>

                    {/* Items Sold Breakdown */}
                    <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">Items Purchased:</span>
                      <div className="space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-text-main text-[11px]">
                            <span>{item.qty}x {item.name}</span>
                            <span className="font-mono text-amber-400 font-bold">{Number(item.price || 0).toLocaleString()} RWF</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial / Courier Actions */}
                    <div className="space-y-2 bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-text-muted block">Payment & Fulfillment:</span>
                        <div className="text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <span>Payment Method:</span>
                          <span className="text-white font-mono font-bold uppercase">{order.paymentMethod || 'MTN MoMo'}</span>
                        </div>
                        <div className="text-blue-400 font-semibold text-[11px] mt-0.5">
                          Status: <span className="uppercase font-bold">{order.status === 'delivery' ? 'Out on Road (Rider Active)' : 'Delivered to Door'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setTrackingOrder(order)}
                        className="w-full py-2 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5 text-accent-gold" />
                        <span>Inspect GPS & Live Courier Route</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sales Pagination */}
          {totalSalesPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                disabled={salesPage === 1}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-muted font-bold px-3">
                Page {salesPage} of {totalSalesPages}
              </span>
              <button
                onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
                disabled={salesPage === totalSalesPages}
                className="p-2 rounded-xl bg-surface-card border border-white/10 disabled:opacity-30 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: VOUCHERS & PROMOS                                */}
      {/* ======================================================== */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6 animate-fade-in">
          {/* Create Voucher Card */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-card border border-white/10 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base sm:text-lg font-black text-white mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Create Promotional Discount Voucher
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Promos created here are stored in Neon PostgreSQL and can be applied during checkout by customers.
            </p>

            <form onSubmit={handleAddVoucher} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Voucher Code</label>
                <input
                  type="text"
                  required
                  value={newVoucherCode}
                  onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HOTPOT2026"
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:border-primary uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Discount Amount (RWF)</label>
                <input
                  type="number"
                  required
                  min="500"
                  step="500"
                  value={newVoucherVal}
                  onChange={(e) => setNewVoucherVal(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newVoucherDesc}
                  onChange={(e) => setNewVoucherDesc(e.target.value)}
                  placeholder="e.g. VIP Weekend Offer"
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isAddingVoucher}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingVoucher ? 'Creating...' : 'Create Voucher'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Vouchers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vouchers.map((vouch, idx) => (
              <div
                key={vouch.id || idx}
                className="p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-3 relative overflow-hidden group hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-primary text-base tracking-wider">
                    {vouch.code}
                  </span>
                  <button
                    onClick={() => handleCopyVoucher(vouch.code)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                    title="Copy voucher code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-2xl font-black text-white font-mono">
                  -{(vouch.discountAmount || 0).toLocaleString()} <span className="text-xs text-text-muted font-sans font-normal">RWF</span>
                </div>

                <p className="text-xs text-text-muted">{vouch.description || 'Active promotional discount'}</p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-text-subdued">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle className="w-3 h-3" /> Active in Checkout
                  </span>
                </div>
              </div>
            ))}

            {vouchers.length === 0 && (
              <div className="col-span-full py-12 text-center text-text-muted text-xs bg-surface-card rounded-2xl border border-white/5">
                No active promo vouchers found. Create your first voucher above!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Food Item Modal */}
      <AddFoodItemModal
        isOpen={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSave={handleMealSaved}
      />

      {/* ── Admin Live GPS Tracking & Dispatch Inspector Modal ── */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-surface-card border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-4xl shadow-2xl space-y-5 animate-scale-in my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Live Order Tracking: #{trackingOrder.id}
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${getStatusBadge(trackingOrder.status)}`}>
                      {trackingOrder.status === 'ready' ? '🍲 Cooker Confirmed Ready' : trackingOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {trackingOrder.customerName || 'Customer'} • 📞 {trackingOrder.phone || 'N/A'} • 📍 {trackingOrder.address || 'Kigali'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTrackingOrder(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper progress (5 steps) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3.5 bg-black/40 rounded-2xl border border-white/5 text-xs">
              {[
                { step: 1, label: 'Order Received', desc: 'In DB' },
                { step: 2, label: 'Kitchen Cooking', desc: 'Simmering' },
                { step: 3, label: 'Cooker Ready 🍲', desc: 'Freshly Packed' },
                { step: 4, label: 'Out for Delivery 🏍️', desc: 'Rider En Route' },
                { step: 5, label: 'Delivered 🎉', desc: 'Completed' },
              ].map((s) => {
                const stepNum = getTrackingStepNumber(trackingOrder.status);
                const isPassed = stepNum >= s.step;
                const isCurrent = stepNum === s.step;
                return (
                  <div
                    key={s.step}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-primary/20 border-primary text-white font-bold shadow-md'
                        : isPassed
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-white/[0.02] border-white/5 text-text-subdued'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{s.label}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{s.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Map & Rider Live Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/10 relative shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute top-3 left-3 z-[400] bg-surface-dark/95 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-xs shadow-xl space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-primary" />
                    <span>{assignedRiders[trackingOrder.id] || trackingOrder.riderName || 'Eric M. (Moto #1)'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-400">
                    Speed: {riderSpeed} • Dist: {riderDistanceRemaining}
                  </div>
                </div>
              </div>

              {/* Order Info & Quick Dispatch Controls */}
              <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-text-muted">
                    Ordered Dishes
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {trackingOrder.items?.map((it, idx) => (
                      <div key={idx} className="text-xs text-text-muted flex justify-between">
                        <span><strong>{it.qty}x</strong> {it.name}</span>
                        <span className="font-mono text-white">{(it.price || 0).toLocaleString()} RWF</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                    <span className="text-text-muted">Total:</span>
                    <span className="font-mono font-black text-primary text-sm">
                      {(trackingOrder.totalRWF || 0).toLocaleString()} RWF
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${trackingOrder.phone || '0788000000'}`}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10"
                    >
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>Call Client</span>
                    </a>

                    {trackingOrder.status === 'ready' && (
                      <button
                        onClick={() => {
                          onUpdateStatus?.(trackingOrder.id, 'delivery');
                          setTrackingOrder(prev => ({ ...prev, status: 'delivery' }));
                        }}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Dispatch Rider</span>
                      </button>
                    )}

                    {trackingOrder.status === 'delivery' && (
                      <button
                        onClick={() => {
                          onUpdateStatus?.(trackingOrder.id, 'delivered');
                          setTrackingOrder(prev => ({ ...prev, status: 'delivered' }));
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Delivered</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-card border border-white/10 rounded-2xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary" />
                Edit Dish: {editingMeal.name}
              </h3>
              <button onClick={() => setEditingMeal(null)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Price (RWF)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="hotpot">Hotpot Combos</option>
                    <option value="broths">Spicy Broths</option>
                    <option value="pizzas">Gourmet Pizzas</option>
                    <option value="noodles">Noodles & Rice</option>
                    <option value="sides">Sides & Dim Sum</option>
                    <option value="drinks">Refreshments</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Description</label>
                <textarea
                  rows="3"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
