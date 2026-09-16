# 🍲 HotPot & Gourmet Pizza Delivery Platform (Kigali)

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

A state-of-the-art, full-featured web application for **HotPot Delights** — Kigali's premier gourmet hotpot and artisanal pizza delivery service. Built with high-performance modern web practices, responsive design system, multi-role access (Customer, Kitchen Staff, Delivery Rider, Admin), Google Sign-In authentication, real-time order tracking, and receipt generation.

---

## ✨ Features Breakdown

### 📱 1. Customer Application & Portal
- **Interactive Food Catalog**: Browse authentic hotpot broths, spicy meats, fresh vegetables, handcrafted pizzas, sides, and drinks with custom category filters and instant live search.
- **Google & Multi-Method Authentication**: Fast login/register with simulated Google Auth or email/password credentials.
- **Automatic Geolocation Modal**: Prompt on login asking customers to allow current GPS location or choose custom Kigali neighborhoods (Nyarutarama, Kimironko, Gacuriro, Kiyovu, Kacyiru).
- **Smart Customization Drawer**: Add custom broth spiciness levels (Mild, Medium, Szechuan Extra Spicy), extra toppings, and delivery notes.
- **Dedicated Client Dashboard**:
  - Personal VIP Tier Badge (*Gold VIP*) & HotPot Loyalty Rewards points balance.
  - Active in-progress order tracking cards.
  - Complete order history with digital receipt generator & print support.
  - Favorite items list with 1-click reordering.
  - Referral voucher generator (5,000 RWF reward vouchers).

### 👨‍🍳 2. Kitchen Staff Board
- Real-time kanban board displaying incoming customer orders.
- Single-click status transitions (`Pending` &rarr; `In Preparation` &rarr; `Ready for Pickup`).
- Item breakdown & special kitchen notes highlight.

### 🛵 3. Delivery Rider Dashboard
- Dedicated delivery dispatch portal for riders.
- Interactive order list with customer delivery location, phone number, and items list.
- One-click status updates (`Accept Order` &rarr; `Picked Up / Out for Delivery` &rarr; `Mark Delivered`).
- Earnings and completed deliveries counter.

### 🛡️ 4. Admin Management Portal
- Comprehensive administrative control panel.
- **Food Catalog Management**: Add new meals, edit prices, descriptions, images, or delete items.
- **Order Analytics**: Live revenue charts, total orders count, and status distribution across Kigali.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18 (Hooks, Context/State Management), Vite 5
- **Styling**: Vanilla CSS Design Tokens, Tailwind CSS, Lucide Icons, Glassmorphic Dark Aesthetics
- **State & Storage**: Browser `localStorage` persistence with `apiService` & Event Bus pattern
- **Live Backend API**: Integrated with `https://hotpot-backend-tsae.onrender.com`

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` or `yarn`

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/imanishimwr/pizza.git
   cd pizza
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser to view the app.

4. **Build for Production**
   ```bash
   npm run build
   ```

---

## 🔐 Demo Test Accounts (Quick Role Switcher)

You can switch between any role instantly using the demo bar at the top of the app:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Customer** | `user@hotpot.rw` | `user123` | Order hotpot/pizza, track order, manage dashboard & rewards |
| **Kitchen Staff** | `kitchen@hotpot.rw` | `kitchen123` | View kitchen orders & update preparation statuses |
| **Delivery Rider**| `rider@hotpot.rw` | `rider123` | Accept deliveries, view map addresses, mark delivered |
| **Admin** | `admin@hotpot.rw` | `admin123` | Manage menu items, view revenue & order analytics |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ for HotPot & Pizza Lovers in Kigali.
