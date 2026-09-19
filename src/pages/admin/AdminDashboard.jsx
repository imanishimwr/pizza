import React, { useState, useEffect, useRef } from 'react';
import { Shield, TrendingUp, DollarSign, ShoppingBag, Users, Plus, UtensilsCrossed, Trash2, CheckCircle2, AlertCircle, Edit, RefreshCw, MapPin, Bike, Navigation, Download, Tag, UserCheck, Calendar, Check, X } from 'lucide-react';
import L from 'leaflet';

export default function AdminDashboard({ meals = [], setMeals, orders = [], onUpdateStatus }) {
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedAdminTrackOrder, setSelectedAdminTrackOrder] = useState(null);
  
  // Date range filter
  const [dateFilter, setDateFilter] = useState('all'); // all | today | week

  // Vouchers state
  const [vouchers, setVouchers] = useState([
    { code: 'KIGALIFREE', type: 'Free Delivery', value: '1,500 RWF Off', status: 'ACTIVE' },
    { code: 'BOGOPIZZA', type: 'Discount', value: '3,000 RWF Off', status: 'ACTIVE' },
  ]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherVal, setNewVoucherVal] = useState('');

  // Fleet Riders
  const [assignedRiders, setAssignedRiders] = useState({});

  const adminMapRef = useRef(null);
  const adminMapInstanceRef = useRef(null);
  const adminRiderMarkerRef = useRef(null);
  const adminAnimFrameRef = useRef(null);
  
  // Form fields
  const [newMealName, setNewMealName] = useState('');
  const [newMealPrice, setNewMealPrice] = useState('');
  const [newMealCategory, setNewMealCategory] = useState('hotpot');
  const [newMealDesc, setNewMealDesc] = useState('');
  const [newMealImage, setNewMealImage] = useState('/assets/1122x850_AO.png');
  const [isSpicy, setIsSpicy] = useState(false);

  // Edit meal fields
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('hotpot');
  const [editDesc, setEditDesc] = useState('');

  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalRWF || 0), 94000);
  const totalOrdersCount = orders.length + 18;

  const handleAddMeal = (e) => {
    e.preventDefault();
    if (!newMealName || !newMealPrice) return;

    const newFoodItem = {
      id: `hp-food-${Date.now()}`,
      name: newMealName,
      category: newMealCategory,
      price: parseInt(newMealPrice),
      rating: 5.0,
      reviews: 1,
      image: newMealImage || '/assets/1122x850_AO.png',
      fallbackImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      description: newMealDesc || 'Delicious hotpot & gourmet dish prepared fresh by our kitchen staff.',
      spicy: isSpicy,
      prepTime: '15-20 min',
      outOfStock: false
    };

    setMeals([newFoodItem, ...meals]);
    setNewMealName('');
    setNewMealPrice('');
    setNewMealDesc('');
    setShowAddMeal(false);
  };

  const handleOpenEdit = (meal) => {
    setEditingMeal(meal);
    setEditName(meal.name);
    setEditPrice(meal.price);
    setEditCategory(meal.category);
    setEditDesc(meal.description || '');
  };

  const handleSaveEditMeal = (e) => {
    e.preventDefault();
    if (!editingMeal) return;

    setMeals(meals.map(m => m.id === editingMeal.id ? {
      ...m,
      name: editName,
      price: parseInt(editPrice),
      category: editCategory,
      description: editDesc
    } : m));

    setEditingMeal(null);
  };

  const handleDeleteMeal = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      setMeals(meals.filter(m => m.id !== id));
    }
  };

  const handleToggleStock = (id) => {
    setMeals(meals.map(m => m.id === id ? { ...m, outOfStock: !m.outOfStock } : m));
  };

  const handleAddVoucher = (e) => {
    e.preventDefault();
    if (!newVoucherCode || !newVoucherVal) return;
    setVouchers([...vouchers, {
      code: newVoucherCode.toUpperCase(),
      type: 'Discount',
      value: `${newVoucherVal} RWF Off`,
      status: 'ACTIVE'
    }]);
    setNewVoucherCode('');
    setNewVoucherVal('');
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Order ID', 'Customer Name', 'Phone', 'Address', 'Distance (km)', 'ETA (min)', 'Total RWF', 'Status'],
      ...orders.map(o => [
        o.id,
        `"${o.customerName || 'Aline Uwase'}"`,
        o.phone || '0788000001',
        `"${o.address || 'Kigali'}"`,
        o.distanceKm || 3.5,
        o.etaMinutes || 20,
        o.totalRWF || 0,
        o.status
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HotPot_Kigali_Orders_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hot Pot Kigali Store Coordinates (Exact Location)
  const hotpotKigaliCoords = [-1.9702, 30.1250];
  const clientDestCoords = [-1.9360, 30.0820];

  useEffect(() => {
    if (!selectedAdminTrackOrder) return;
    if (!adminMapRef.current) return;

    if (adminMapInstanceRef.current) {
      adminMapInstanceRef.current.remove();
      adminMapInstanceRef.current = null;
    }

    const map = L.map(adminMapRef.current).setView(hotpotKigaliCoords, 14);
    adminMapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Restaurant HQ Marker
    const hqIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#AE3200;color:white;padding:4px 8px;border-radius:15px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🍲 Hot Pot Kigali Store</div>'
    });
    L.marker(hotpotKigaliCoords, { icon: hqIcon }).addTo(map).bindPopup('<b>Hot Pot Kigali Store (-1.9702, 30.1250)</b>').openPopup();

    // Client Destination Marker
    const destIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#128731;color:white;padding:4px 8px;border-radius:15px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🏠 Customer Spot</div>'
    });
    L.marker(clientDestCoords, { icon: destIcon }).addTo(map).bindPopup(`<b>${selectedAdminTrackOrder.address || 'Customer Location'}</b>`);

    // Polyline Route
    L.polyline([hotpotKigaliCoords, clientDestCoords], {
      color: '#AE3200',
      weight: 4,
      dashArray: '8, 8'
    }).addTo(map);

    // Rider Icon
    const riderIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#2563eb;color:white;padding:4px 8px;border-radius:15px;font-size:11px;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.6);border:2px solid #60a5fa">🛵 Rider Eric (GPS Live)</div>'
    });

    adminRiderMarkerRef.current = L.marker(hotpotKigaliCoords, { icon: riderIcon }).addTo(map);

    let step = 0.3;
    let dir = 1;
    const animateAdminRider = () => {
      step += 0.0009 * dir;
      if (step >= 0.95) dir = -1;
      if (step <= 0.1) dir = 1;

      const lat = hotpotKigaliCoords[0] + (clientDestCoords[0] - hotpotKigaliCoords[0]) * step;
      const lng = hotpotKigaliCoords[1] + (clientDestCoords[1] - hotpotKigaliCoords[1]) * step;

      if (adminRiderMarkerRef.current) {
        adminRiderMarkerRef.current.setLatLng([lat, lng]);
      }

      adminAnimFrameRef.current = requestAnimationFrame(animateAdminRider);
    };

    adminAnimFrameRef.current = requestAnimationFrame(animateAdminRider);

    return () => {
      if (adminAnimFrameRef.current) cancelAnimationFrame(adminAnimFrameRef.current);
      if (adminMapInstanceRef.current) {
        adminMapInstanceRef.current.remove();
        adminMapInstanceRef.current = null;
      }
    };
  }, [selectedAdminTrackOrder]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="p-6 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">HotPot Executive Admin Portal</h2>
            <p className="text-xs text-purple-200/80">Logged in as: admin@hotpot-delights.com</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs py-2.5 px-4 bg-emerald-950 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV Report
          </button>

          <button
            onClick={() => setShowAddMeal(!showAddMeal)}
            className="btn-primary text-xs py-2.5 px-4 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            {showAddMeal ? 'Close Form' : 'Add New Food Item'}
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            {totalRevenue.toLocaleString()} RWF
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% from last week
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-text-main">
            {totalOrdersCount} Orders
          </div>
          <span className="text-[11px] text-text-muted">Avg basket: 18,500 RWF</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase">Active Kitchen Queue</span>
            <UtensilsCrossed className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-text-main">
            {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length} Active
          </div>
          <span className="text-[11px] text-blue-400 font-semibold">Avg prep time: 18 min</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase">Live Food Items</span>
            <UtensilsCrossed className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-text-main">
            {meals.length} Items Live
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold">Synced with Customer Home</span>
        </div>
      </div>

      {/* Edit Meal Modal */}
      {editingMeal && (
        <form onSubmit={handleSaveEditMeal} className="p-6 rounded-2xl bg-surface-card border border-amber-500/40 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-amber-300">Edit Dish details: {editingMeal.name}</h3>
            <button type="button" onClick={() => setEditingMeal(null)} className="text-text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Dish Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Price (RWF)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main"
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
            <label className="text-xs font-bold text-text-muted block mb-1">Description</label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary text-xs py-2 px-5">Save Modifications</button>
            <button type="button" onClick={() => setEditingMeal(null)} className="btn-secondary text-xs py-2 px-4">Cancel</button>
          </div>
        </form>
      )}

      {/* Add Meal Form Drawer */}
      {showAddMeal && (
        <form onSubmit={handleAddMeal} className="p-6 rounded-2xl bg-surface-card border border-purple-500/40 space-y-4 animate-fade-in">
          <h3 className="text-base font-bold text-text-main">Add New Food Stuff to Menu</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Food Name</label>
              <input
                type="text"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                required
                placeholder="e.g. Szechuan Beef Dumplings"
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Price in RWF</label>
              <input
                type="number"
                value={newMealPrice}
                onChange={(e) => setNewMealPrice(e.target.value)}
                required
                placeholder="15000"
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1">Category</label>
              <select
                value={newMealCategory}
                onChange={(e) => setNewMealCategory(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
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
            <label className="text-xs font-bold text-text-muted block mb-1">Food Description</label>
            <input
              type="text"
              value={newMealDesc}
              onChange={(e) => setNewMealDesc(e.target.value)}
              placeholder="e.g. Fresh handmade noodles with spicy ground pork sauce..."
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-text-main font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isSpicy}
                onChange={(e) => setIsSpicy(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              Spicy Dish 🔥
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary text-xs py-2.5 px-5">
              Save Food & Sync to Home
            </button>
            <button type="button" onClick={() => setShowAddMeal(false)} className="btn-secondary text-xs py-2.5 px-4">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Menu Catalog Table */}
      <div className="p-6 rounded-2xl bg-surface-card border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-main">Live Food Catalog Management ({meals.length} Items)</h3>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Live Synced with Customer Home Page
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-muted">
            <thead className="bg-black/40 text-text-subdued uppercase font-bold border-b border-white/10">
              <tr>
                <th className="p-3">Dish Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price (RWF)</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {meals.map(meal => (
                <tr key={meal.id} className="hover:bg-white/5">
                  <td className="p-3 font-bold text-text-main flex items-center gap-3">
                    <img 
                      src={meal.image} 
                      alt={meal.name} 
                      className="w-10 h-10 rounded-lg object-cover bg-black/40" 
                      onError={(e) => { e.target.src = meal.fallbackImage; }} 
                    />
                    <div>
                      <div className="font-bold text-text-main">{meal.name}</div>
                      <div className="text-[10px] text-text-subdued line-clamp-1">{meal.description}</div>
                    </div>
                  </td>
                  <td className="p-3 capitalize font-semibold">{meal.category}</td>
                  <td className="p-3 font-mono font-bold text-primary">{(meal.price || 0).toLocaleString()} RWF</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleStock(meal.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        meal.outOfStock
                          ? 'bg-red-950 text-red-400 border border-red-500/40'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {meal.outOfStock ? 'Out of Stock' : 'In Stock'}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(meal)}
                      className="p-1.5 text-text-subdued hover:text-amber-400 transition-colors"
                      title="Edit dish details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal.id, meal.name)}
                      className="p-1.5 text-text-subdued hover:text-red-400 transition-colors"
                      title="Delete food item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher & Promo Code Manager */}
      <div className="p-6 rounded-2xl bg-surface-card border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-text-main flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-400" />
          Voucher & Promo Code Management
        </h3>

        <form onSubmit={handleAddVoucher} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newVoucherCode}
            onChange={(e) => setNewVoucherCode(e.target.value)}
            placeholder="PROMO CODE (e.g. SUMMER2026)"
            className="bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          />
          <input
            type="number"
            value={newVoucherVal}
            onChange={(e) => setNewVoucherVal(e.target.value)}
            placeholder="Discount in RWF (e.g. 2000)"
            className="bg-surface-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button type="submit" className="btn-primary text-xs py-2 px-4">Create Promo Code</button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {vouchers.map((v, i) => (
            <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-amber-400">{v.code}</div>
                <div className="text-[10px] text-text-muted">{v.value}</div>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {v.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Live Delivery Geocoding & Order Monitor */}
      <div className="p-6 rounded-2xl bg-surface-card border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-main flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Live Order Geocoding & Delivery Destination Monitor
            </h3>
            <p className="text-xs text-text-muted">Real-Time Kigali GPS Coordinates & Customer Locations</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/40">
            {orders.length} Active Customer Orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-muted">
            <thead className="bg-black/40 text-text-subdued uppercase font-bold border-b border-white/10">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer & Phone</th>
                <th className="p-3">Delivery Address / GPS</th>
                <th className="p-3">Assign Rider</th>
                <th className="p-3">Admin Status Control</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-text-muted">
                    No active orders found. New orders placed by customers will display here with live geocoded GPS coordinates.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="p-3 font-mono font-bold text-amber-400">#{o.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-text-main">{o.customerName || 'Aline Uwase'}</div>
                      <div className="text-[10px] text-text-subdued">{o.phone || '0788000001'}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-text-main flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        {o.address || 'KG 9 Ave, Nyarutarama, Kigali'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        GPS: {o.area ? `Sector: ${o.area}` : 'Kigali Live GPS Verified'}
                      </div>
                    </td>
                    
                    {/* Rider Assign dropdown */}
                    <td className="p-3">
                      <select
                        value={assignedRiders[o.id] || 'Eric Mugisha'}
                        onChange={(e) => setAssignedRiders({ ...assignedRiders, [o.id]: e.target.value })}
                        className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] text-white"
                      >
                        <option value="Eric Mugisha">Eric Mugisha (Motorcycle)</option>
                        <option value="Jean-Paul Nsengiyumva">Jean-Paul N. (Express)</option>
                        <option value="Patrick Kamanzi">Patrick K. (Electric Bike)</option>
                      </select>
                    </td>

                    {/* Admin Status Override */}
                    <td className="p-3">
                      <select
                        value={o.status || 'pending'}
                        onChange={(e) => onUpdateStatus && onUpdateStatus(o.id, e.target.value)}
                        className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-[11px] font-bold text-amber-400 uppercase"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() => setSelectedAdminTrackOrder(o)}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Navigation className="w-3 h-3" />
                        Track Rider GPS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal / Live Map Drawer for Admin Tracking */}
        {selectedAdminTrackOrder && (
          <div className="p-4 rounded-2xl bg-black/60 border border-blue-500/40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bike className="w-4 h-4 text-blue-400" />
                  Admin Rider Live GPS Monitor — Order #{selectedAdminTrackOrder.id}
                </h4>
                <p className="text-[11px] text-text-muted">
                  Store Origin: Hot Pot Kigali (-1.9702, 30.1250) $\rightarrow$ Destination: {selectedAdminTrackOrder.address}
                </p>
              </div>

              <button
                onClick={() => setSelectedAdminTrackOrder(null)}
                className="btn-secondary text-xs px-3 py-1 text-red-400 border-red-500/30"
              >
                Close Map
              </button>
            </div>

            <div className="h-80 rounded-xl overflow-hidden border border-white/10 relative">
              <div ref={adminMapRef} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
