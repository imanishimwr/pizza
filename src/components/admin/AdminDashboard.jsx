import React, { useState } from 'react';
import { Shield, TrendingUp, DollarSign, ShoppingBag, Users, Plus, UtensilsCrossed, Trash2, CheckCircle2, AlertCircle, Edit, RefreshCw } from 'lucide-react';

export default function AdminDashboard({ meals, setMeals, orders }) {
  const [showAddMeal, setShowAddMeal] = useState(false);
  
  // Form fields
  const [newMealName, setNewMealName] = useState('');
  const [newMealPrice, setNewMealPrice] = useState('');
  const [newMealCategory, setNewMealCategory] = useState('hotpot');
  const [newMealDesc, setNewMealDesc] = useState('');
  const [newMealImage, setNewMealImage] = useState('/assets/1122x850_AO.png');
  const [isSpicy, setIsSpicy] = useState(false);

  const totalRevenue = orders.reduce((acc, o) => acc + o.totalRWF, 94000);
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
    alert(`"${newFoodItem.name}" has been added to the menu and is live on the Home page!`);
  };

  const handleDeleteMeal = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      setMeals(meals.filter(m => m.id !== id));
    }
  };

  const handleToggleStock = (id) => {
    setMeals(meals.map(m => m.id === id ? { ...m, outOfStock: !m.outOfStock } : m));
  };

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

        <button
          onClick={() => setShowAddMeal(!showAddMeal)}
          className="btn-primary text-xs py-2.5 px-4 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          {showAddMeal ? 'Close Form' : 'Add New Food Item'}
        </button>
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
            4 Active
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
          <span className="text-[11px] text-emerald-400 font-semibold">Synced with Home Page</span>
        </div>
      </div>

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
                  <td className="p-3 font-mono font-bold text-primary">{meal.price.toLocaleString()} RWF</td>
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
    </div>
  );
}
