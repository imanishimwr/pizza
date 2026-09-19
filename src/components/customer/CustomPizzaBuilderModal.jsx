import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ShoppingBag } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CustomPizzaBuilderModal.module.css';

const CRUST_OPTIONS = [
  { id: 'thin', name: 'Thin & Crispy', price: 0, desc: 'Light, crunchy hand-stretched thin base' },
  { id: 'pan', name: 'Classic Pan', price: 1.5, desc: 'Fluffy, golden pan-baked dough' },
  { id: 'stuffed', name: 'Cheese Stuffed Crust', price: 3.0, desc: 'Melted Mozzarella baked into the crust ring' },
  { id: 'garlic', name: 'Garlic Butter Crust', price: 2.0, desc: 'Brushed with herb garlic butter' }
];

const SAUCE_OPTIONS = [
  { id: 'tomato', name: 'Classic Tomato Herb', color: '#dc2626' },
  { id: 'bbq', name: 'Smoky BBQ Sauce', color: '#7c2d12' },
  { id: 'garlic_cream', name: 'Creamy White Garlic', color: '#fef08a' },
  { id: 'spicy', name: 'Fiery Arrabbia', color: '#b91c1c' }
];

const CHEESE_LEVELS = [
  { id: 'light', name: 'Light Cheese', price: 0 },
  { id: 'regular', name: 'Regular Mozzarella', price: 0 },
  { id: 'extra', name: 'Extra Cheese', price: 1.5 },
  { id: 'triple', name: 'Triple Loaded Cheese', price: 2.5 }
];

const AVAILABLE_TOPPINGS = [
  { id: 'pepperoni', name: 'Pepperoni', price: 1.5, category: 'meat', color: '#b91c1c', icon: '🥩' },
  { id: 'chicken', name: 'Grilled Chicken', price: 2.0, category: 'meat', color: '#f59e0b', icon: '🍗' },
  { id: 'beef', name: 'Spicy Beef', price: 2.0, category: 'meat', color: '#78350f', icon: '🥩' },
  { id: 'mushrooms', name: 'Fresh Mushrooms', price: 1.0, category: 'veggie', color: '#a16207', icon: '🍄' },
  { id: 'onions', name: 'Red Onions', price: 0.8, category: 'veggie', color: '#9333ea', icon: '🧅' },
  { id: 'peppers', name: 'Bell Peppers', price: 1.0, category: 'veggie', color: '#16a34a', icon: '🫑' },
  { id: 'olives', name: 'Black Olives', price: 1.0, category: 'veggie', color: '#1e293b', icon: '🫒' },
  { id: 'pineapple', name: 'Sweet Pineapple', price: 1.2, category: 'veggie', color: '#eab308', icon: '🍍' },
  { id: 'jalapenos', name: 'Hot Jalapeños', price: 1.0, category: 'veggie', color: '#15803d', icon: '🌶️' }
];

/**
 * Persist a custom pizza to the backend.
 * @param {Object} customPizza - The pizza object to store.
 */
async function saveCustomPizza(customPizza) {
  try {
    const res = await fetch('/api/custom-pizzas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customPizza)
    });
    if (!res.ok) throw new Error('Failed to save custom pizza');
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default function CustomPizzaBuilderModal({ isOpen, onClose, onAddToCart }) {
  const [size, setSize] = useState('Medium');
  const [crust, setCrust] = useState(CRUST_OPTIONS[0]);
  const [sauce, setSauce] = useState(SAUCE_OPTIONS[0]);
  const [cheese, setCheese] = useState(CHEESE_LEVELS[1]);
  const [selectedToppings, setSelectedToppings] = useState([]); // {toppingId, side}
  const [pizzaName, setPizzaName] = useState('My Custom Masterpiece');

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const basePrice = size === 'Small' ? 8.99 : size === 'Medium' ? 12.99 : 16.99;
  const crustPrice = crust.price;
  const cheesePrice = cheese.price;
  const toppingsPrice = selectedToppings.reduce((sum, item) => {
    const topping = AVAILABLE_TOPPINGS.find(t => t.id === item.toppingId);
    const multiplier = item.side === 'whole' ? 1.0 : 0.6;
    return sum + (topping ? topping.price * multiplier : 0);
  }, 0);
  const totalPrice = (basePrice + crustPrice + cheesePrice + toppingsPrice).toFixed(2);

  const handleToggleTopping = (toppingId, side = 'whole') => {
    setSelectedToppings(prev => {
      const existingIndex = prev.findIndex(t => t.toppingId === toppingId);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.side === side) {
          return prev.filter(t => t.toppingId !== toppingId);
        } else {
          const updated = [...prev];
          updated[existingIndex] = { toppingId, side };
          return updated;
        }
      }
      return [...prev, { toppingId, side }];
    });
  };

  const getToppingPlacement = (toppingId) => {
    const found = selectedToppings.find(t => t.toppingId === toppingId);
    return found ? found.side : null;
  };

  const handleSaveAndAdd = async () => {
    const customPizza = {
      id: `custom-${Date.now()}`,
      name: pizzaName || 'Custom Pizza',
      description: `${size} • ${crust.name} • ${sauce.name} • ${selectedToppings.length} Toppings`,
      price: parseFloat(totalPrice),
      size,
      crust: crust.name,
      sauce: sauce.name,
      cheese: cheese.name,
      toppings: selectedToppings,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      isCustom: true
    };
    await saveCustomPizza(customPizza);
    onAddToCart(customPizza);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap>
          <motion.div
            className={styles.modalBackdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalCard}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="custom-pizza-modal-title"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { duration: 0.2 } }}
              exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.15 } }}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', padding: '10px', borderRadius: '12px' }}>
                    <Sparkles size={22} color="#fff" />
                  </div>
                  <div>
                    <h2 id="custom-pizza-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Custom Pizza Studio</h2>
                    <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: 0 }}>Build your unique flavor combination</p>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6">
                {/* Left Column: Pizza Visual */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Pizza Graphic */}
                  <div style={{
                    position: 'relative',
                    width: size === 'Small' ? '200px' : size === 'Medium' ? '240px' : '270px',
                    height: size === 'Small' ? '200px' : size === 'Medium' ? '240px' : '270px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #eab308 0%, #d97706 60%, #b45309 100%)',
                    boxShadow: '0 12px 30px rgba(249,115,22,0.3), inset 0 0 15px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    border: `6px solid ${crust.id === 'garlic' ? '#fde047' : crust.id === 'stuffed' ? '#f59e0b' : '#92400e'}`
                  }}>
                    {/* Sauce */}
                    <div style={{ position: 'absolute', width: '82%', height: '82%', borderRadius: '50%', backgroundColor: sauce.color, opacity: 0.85 }} />
                    {/* Cheese */}
                    <div style={{ position: 'absolute', width: '74%', height: '74%', borderRadius: '50%', backgroundColor: '#fef08a', opacity: cheese.id === 'light' ? 0.6 : cheese.id === 'extra' ? 0.9 : 0.8 }} />
                    {/* Half split line */}
                    {selectedToppings.some(t => t.side !== 'whole') && (
                      <div style={{ position: 'absolute', width: '2px', height: '74%', background: 'rgba(0,0,0,0.4)', borderStyle: 'dashed' }} />
                    )}
                    {/* Toppings */}
                    {selectedToppings.map(tItem => {
                      const topping = AVAILABLE_TOPPINGS.find(t => t.id === tItem.toppingId);
                      if (!topping) return null;
                      return (
                        <div key={tItem.toppingId} style={{
                          position: 'absolute', width: '100%', height: '100%',
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                          clipPath: tItem.side === 'left' ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' : tItem.side === 'right' ? 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' : 'none'
                        }}>
                          <span style={{ fontSize: '1.2rem', position: 'absolute', top: '25%', left: '30%' }}>{topping.icon}</span>
                          <span style={{ fontSize: '1.2rem', position: 'absolute', top: '60%', left: '25%' }}>{topping.icon}</span>
                          <span style={{ fontSize: '1.2rem', position: 'absolute', top: '40%', right: '30%' }}>{topping.icon}</span>
                          <span style={{ fontSize: '1.2rem', position: 'absolute', bottom: '25%', right: '35%' }}>{topping.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}>
                    <input
                      type="text"
                      value={pizzaName}
                      onChange={e => setPizzaName(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', padding: '8px 12px', textAlign: 'center', fontWeight: 600, width: '100%' }}
                      placeholder="Name your pizza..."
                    />
                    <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '6px' }}>
                      {size} • {crust.name} • {selectedToppings.length} Toppings
                    </p>
                  </div>
                </div>

                {/* Right Column: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Size */}
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '8px', display: 'block' }}>1. Choose Size</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {['Small', 'Medium', 'Large'].map(s => (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          style={{
                            padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            background: size === s ? 'var(--primary-color, #f97316)' : 'rgba(255,255,255,0.06)',
                            color: '#fff', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crust */}
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '8px', display: 'block' }}>2. Crust Style</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {CRUST_OPTIONS.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setCrust(c)}
                          style={{
                            padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                            background: crust.id === c.id ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                            border: crust.id === c.id ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{c.desc}</div>
                          </div>
                          <span style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 600 }}>
                            {c.price > 0 ? `+$${c.price.toFixed(2)}` : 'Free'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sauce & Cheese */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Sauce */}
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '6px', display: 'block' }}>3. Sauce</label>
                      <select
                        value={sauce.id}
                        onChange={e => setSauce(SAUCE_OPTIONS.find(s => s.id === e.target.value))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px', borderRadius: '10px' }}
                      >
                        {SAUCE_OPTIONS.map(s => (
                          <option key={s.id} value={s.id} style={{ background: '#18181b', color: '#fff' }}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Cheese */}
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '6px', display: 'block' }}>4. Cheese</label>
                      <select
                        value={cheese.id}
                        onChange={e => setCheese(CHEESE_LEVELS.find(ch => ch.id === e.target.value))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px', borderRadius: '10px' }}
                      >
                        {CHEESE_LEVELS.map(ch => (
                          <option key={ch.id} value={ch.id} style={{ background: '#18181b', color: '#fff' }}>{ch.name} {ch.price > 0 ? `(+$${ch.price})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Toppings */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8' }}>5. Select Toppings</label>
                      <span style={{ fontSize: '0.75rem', color: '#f97316' }}>Click side (Whole/Left/Right)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {AVAILABLE_TOPPINGS.map(top => {
                        const placement = getToppingPlacement(top.id);
                        return (
                          <div
                            key={top.id}
                            style={{
                              padding: '8px 10px', borderRadius: '10px',
                              background: placement ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                              border: placement ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                              display: 'flex', flexDirection: 'column', gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{top.icon} {top.name}</span>
                              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>+${top.price}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                              {['left', 'whole', 'right'].map(side => (
                                <button
                                  key={side}
                                  onClick={() => handleToggleTopping(top.id, side)}
                                  style={{
                                    flex: 1, padding: '3px 0', fontSize: '0.68rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                                    background: placement === side ? '#f97316' : 'rgba(255,255,255,0.08)',
                                    color: '#fff', textTransform: 'capitalize'
                                  }}
                                >
                                  {side === 'left' ? '👈 L' : side === 'right' ? 'R 👉' : 'Whole'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Total Custom Price:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f97316' }}>${totalPrice}</div>
                </div>
                <button
                  onClick={handleSaveAndAdd}
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ef4444)', border: 'none', color: '#fff',
                    padding: '12px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(249,115,22,0.4)'
                  }}
                >
                  <ShoppingBag size={18} /> Add Custom Pizza to Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}

import { X, Sparkles, Plus, Check, ShoppingBag, Flame, AlertCircle } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { motion, AnimatePresence } from 'framer-motion';

const CRUST_OPTIONS = [
  { id: 'thin', name: 'Thin & Crispy', price: 0, desc: 'Light, crunchy hand-stretched thin base' },
  { id: 'pan', name: 'Classic Pan', price: 1.5, desc: 'Fluffy, golden pan-baked dough' },
  { id: 'stuffed', name: 'Cheese Stuffed Crust', price: 3.0, desc: 'Melted Mozzarella baked into the crust ring' },
  { id: 'garlic', name: 'Garlic Butter Crust', price: 2.0, desc: 'Brushed with herb garlic butter' }
];

const SAUCE_OPTIONS = [
  { id: 'tomato', name: 'Classic Tomato Herb', color: '#dc2626' },
  { id: 'bbq', name: 'Smoky BBQ Sauce', color: '#7c2d12' },
  { id: 'garlic_cream', name: 'Creamy White Garlic', color: '#fef08a' },
  { id: 'spicy', name: 'Fiery Arrabbia', color: '#b91c1c' }
];

const CHEESE_LEVELS = [
  { id: 'light', name: 'Light Cheese', price: 0 },
  { id: 'regular', name: 'Regular Mozzarella', price: 0 },
  { id: 'extra', name: 'Extra Cheese', price: 1.5 },
  { id: 'triple', name: 'Triple Loaded Cheese', price: 2.5 }
];

const AVAILABLE_TOPPINGS = [
  { id: 'pepperoni', name: 'Pepperoni', price: 1.5, category: 'meat', color: '#b91c1c', icon: '🥩' },
  { id: 'chicken', name: 'Grilled Chicken', price: 2.0, category: 'meat', color: '#f59e0b', icon: '🍗' },
  { id: 'beef', name: 'Spicy Beef', price: 2.0, category: 'meat', color: '#78350f', icon: '🥩' },
  { id: 'mushrooms', name: 'Fresh Mushrooms', price: 1.0, category: 'veggie', color: '#a16207', icon: '🍄' },
  { id: 'onions', name: 'Red Onions', price: 0.8, category: 'veggie', color: '#9333ea', icon: '🧅' },
  { id: 'peppers', name: 'Bell Peppers', price: 1.0, category: 'veggie', color: '#16a34a', icon: '🫑' },
  { id: 'olives', name: 'Black Olives', price: 1.0, category: 'veggie', color: '#1e293b', icon: '🫒' },
  { id: 'pineapple', name: 'Sweet Pineapple', price: 1.2, category: 'veggie', color: '#eab308', icon: '🍍' },
  { id: 'jalapenos', name: 'Hot Jalapeños', price: 1.0, category: 'veggie', color: '#15803d', icon: '🌶️' }
];

export default function CustomPizzaBuilderModal({ isOpen, onClose, onAddToCart }) {
  const [size, setSize] = useState('Medium');
  const [crust, setCrust] = useState(CRUST_OPTIONS[0]);
  const [sauce, setSauce] = useState(SAUCE_OPTIONS[0]);
  const [cheese, setCheese] = useState(CHEESE_LEVELS[1]);
  const [selectedToppings, setSelectedToppings] = useState([]); // Array of { toppingId, side: 'whole' | 'left' | 'right' }
  const [pizzaName, setPizzaName] = useState('My Custom Masterpiece');

  if (!isOpen) return null;

  const basePrice = size === 'Small' ? 8.99 : size === 'Medium' ? 12.99 : 16.99;
  const crustPrice = crust.price;
  const cheesePrice = cheese.price;
  const toppingsPrice = selectedToppings.reduce((sum, item) => {
    const topping = AVAILABLE_TOPPINGS.find((t) => t.id === item.toppingId);
    const multiplier = item.side === 'whole' ? 1.0 : 0.6;
    return sum + (topping ? topping.price * multiplier : 0);
  }, 0);

  const totalPrice = (basePrice + crustPrice + cheesePrice + toppingsPrice).toFixed(2);

  const handleToggleTopping = (toppingId, side = 'whole') => {
    setSelectedToppings((prev) => {
      const existingIndex = prev.findIndex((t) => t.toppingId === toppingId);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.side === side) {
          // Remove if clicking same side again
          return prev.filter((t) => t.toppingId !== toppingId);
        } else {
          // Update side
          const updated = [...prev];
          updated[existingIndex] = { toppingId, side };
          return updated;
        }
      } else {
        return [...prev, { toppingId, side }];
      }
    });
  };

  const getToppingPlacement = (toppingId) => {
    const found = selectedToppings.find((t) => t.toppingId === toppingId);
    return found ? found.side : null;
  };

  const handleSaveAndAdd = () => {
    const customPizza = {
      id: `custom-${Date.now()}`,
      name: pizzaName || 'Custom Pizza',
      description: `${size} • ${crust.name} • ${sauce.name} • ${selectedToppings.length} Toppings`,
      price: parseFloat(totalPrice),
      size,
      crust: crust.name,
      sauce: sauce.name,
      cheese: cheese.name,
      toppings: selectedToppings,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      isCustom: true
    };
    onAddToCart(customPizza);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
    }}>
      <div 
        className="modal-card glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto',
          borderRadius: '24px', background: 'var(--bg-card, #18181b)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', padding: '10px', borderRadius: '12px' }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Custom Pizza Studio</h2>
              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: 0 }}>Build your unique flavor combination</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6">
          
          {/* Left Column: Visual Pizza Canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Visual Pizza Graphic */}
            <div style={{
              position: 'relative',
              width: size === 'Small' ? '200px' : size === 'Medium' ? '240px' : '270px',
              height: size === 'Small' ? '200px' : size === 'Medium' ? '240px' : '270px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #eab308 0%, #d97706 60%, #b45309 100%)',
              boxShadow: '0 12px 30px rgba(249,115,22,0.3), inset 0 0 15px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
              border: `6px solid ${crust.id === 'garlic' ? '#fde047' : crust.id === 'stuffed' ? '#f59e0b' : '#92400e'}`
            }}>
              {/* Sauce Layer */}
              <div style={{
                position: 'absolute', width: '82%', height: '82%', borderRadius: '50%',
                backgroundColor: sauce.color, opacity: 0.85
              }} />

              {/* Cheese Layer */}
              <div style={{
                position: 'absolute', width: '74%', height: '74%', borderRadius: '50%',
                backgroundColor: '#fef08a', opacity: cheese.id === 'light' ? 0.6 : cheese.id === 'extra' ? 0.9 : 0.8
              }} />

              {/* Half Split Line if half toppings exist */}
              {selectedToppings.some(t => t.side !== 'whole') && (
                <div style={{ position: 'absolute', width: '2px', height: '74%', background: 'rgba(0,0,0,0.4)', borderStyle: 'dashed' }} />
              )}

              {/* Toppings Rendered Visual Dots */}
              {selectedToppings.map((tItem) => {
                const topping = AVAILABLE_TOPPINGS.find((t) => t.id === tItem.toppingId);
                if (!topping) return null;
                return (
                  <div key={tItem.toppingId} style={{
                    position: 'absolute', width: '100%', height: '100%',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    clipPath: tItem.side === 'left' ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' : tItem.side === 'right' ? 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' : 'none'
                  }}>
                    <span style={{ fontSize: '1.2rem', position: 'absolute', top: '25%', left: '30%' }}>{topping.icon}</span>
                    <span style={{ fontSize: '1.2rem', position: 'absolute', top: '60%', left: '25%' }}>{topping.icon}</span>
                    <span style={{ fontSize: '1.2rem', position: 'absolute', top: '40%', right: '30%' }}>{topping.icon}</span>
                    <span style={{ fontSize: '1.2rem', position: 'absolute', bottom: '25%', right: '35%' }}>{topping.icon}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}>
              <input 
                type="text" 
                value={pizzaName}
                onChange={(e) => setPizzaName(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', borderRadius: '10px', padding: '8px 12px', textAlign: 'center',
                  fontWeight: 600, width: '100%'
                }}
                placeholder="Name your pizza..."
              />
              <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '6px' }}>
                {size} • {crust.name} • {selectedToppings.length} Toppings
              </p>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Size */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '8px', display: 'block' }}>1. Choose Size</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['Small', 'Medium', 'Large'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: size === s ? 'var(--primary-color, #f97316)' : 'rgba(255,255,255,0.06)',
                      color: '#fff', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Crust */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '8px', display: 'block' }}>2. Crust Style</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CRUST_OPTIONS.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCrust(c)}
                    style={{
                      padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                      background: crust.id === c.id ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                      border: crust.id === c.id ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{c.desc}</div>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 600 }}>
                      {c.price > 0 ? `+$${c.price.toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Sauce & Cheese */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '6px', display: 'block' }}>3. Sauce</label>
                <select
                  value={sauce.id}
                  onChange={(e) => setSauce(SAUCE_OPTIONS.find((s) => s.id === e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px', borderRadius: '10px' }}
                >
                  {SAUCE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#18181b', color: '#fff' }}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '6px', display: 'block' }}>4. Cheese</label>
                <select
                  value={cheese.id}
                  onChange={(e) => setCheese(CHEESE_LEVELS.find((ch) => ch.id === e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px', borderRadius: '10px' }}
                >
                  {CHEESE_LEVELS.map((ch) => (
                    <option key={ch.id} value={ch.id} style={{ background: '#18181b', color: '#fff' }}>{ch.name} {ch.price > 0 ? `(+$${ch.price})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Toppings Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8' }}>5. Select Toppings</label>
                <span style={{ fontSize: '0.75rem', color: '#f97316' }}>Click side (Whole/Left/Right)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {AVAILABLE_TOPPINGS.map((top) => {
                  const placement = getToppingPlacement(top.id);
                  return (
                    <div
                      key={top.id}
                      style={{
                        padding: '8px 10px', borderRadius: '10px',
                        background: placement ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                        border: placement ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{top.icon} {top.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>+${top.price}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        {['left', 'whole', 'right'].map((side) => (
                          <button
                            key={side}
                            onClick={() => handleToggleTopping(top.id, side)}
                            style={{
                              flex: 1, padding: '3px 0', fontSize: '0.68rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                              background: placement === side ? '#f97316' : 'rgba(255,255,255,0.08)',
                              color: '#fff', textTransform: 'capitalize'
                            }}
                          >
                            {side === 'left' ? '👈 L' : side === 'right' ? 'R 👉' : 'Whole'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Footer Action Bar */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Total Custom Price:</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f97316' }}>${totalPrice}</div>
          </div>
          <button
            onClick={handleSaveAndAdd}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ef4444)', border: 'none', color: '#fff',
              padding: '12px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(249,115,22,0.4)'
            }}
          >
            <ShoppingBag size={18} /> Add Custom Pizza to Order
          </button>
        </div>

      </div>
    </div>
  );
}
