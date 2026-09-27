# 🍲 HotPot & Gourmet Pizza Delivery (Kigali)

Ordering, kitchen dispatch, rider handover and administration for **HotPot Delights** — a gourmet
hotpot and artisanal pizza delivery service in Kigali, Rwanda.

---

## Architecture

```
src/                     React 18 + Vite single-page app
  App.jsx                Shell: routing, session, polling, realtime, cart
  services/apiService.js The only place that talks to the API. Throws; never fakes data.
  services/eventBus.js   Cross-tab event fan-out (BroadcastChannel)
  data/mockData.js       UI configuration only — no meals, orders or revenue
Pizza-Backend/
  server.js              Express 5 + Socket.IO. All authorization lives here.
  neonClient.js          The only data access layer. All SQL lives here.
  migrate.js             The single authoritative, idempotent schema.
  seed.js                Inserts only. Emits no DDL.
  test/                  Unit tests for the pure data-layer rules
```

### Two rules worth knowing

1. **Authorization is server-side.** Roles come from the signed JWT. The URL picks which *view*
   renders; it never grants access. `GET /api/orders` returns only your own orders unless you are
   staff. Editing a menu item, assigning a rider or reading analytics all require the matching role.
2. **A failed request is an error, not an empty list.** `apiService` throws on every non-2xx and on
   network failure. There is no silent `localStorage` fallback and no hardcoded rider fleet, because
   both previously produced dashboards showing "0 orders, 0 revenue" while looking perfectly healthy.

### Data conventions

| Concern | Rule |
| --- | --- |
| Database columns | `snake_case` |
| API responses | `camelCase` only — mapped in one place, in `neonClient.js` |
| Money | `NUMERIC` in Postgres, integer RWF in JS. No floating point. |
| `orders.status` | lowercase, DB `CHECK` enforced: `pending`, `preparing`, `ready`, `delivery`, `delivered`, `cancelled` |
| Roles | lowercase: `customer`, `kitchen`, `delivery`, `admin` |

Order status moves forward only (`pending → preparing → ready → delivery → delivered`),
`cancelled` is reachable from any non-terminal state, and `delivered`/`cancelled` are terminal.
The transition is validated in the data layer, so no client can skip the kitchen.

### The handover PIN

Assigning a rider mints a 6-digit code. The customer and staff can read it; **the rider never can**.
To collect the order, the rider has to type in the number the customer gave them. A blank code is
an error, not a bypass, and the correct code is never included in the failure message.

---

## Getting started

Requires Node.js 20 or newer.

```bash
# 1. Install
npm install
npm --prefix Pizza-Backend install

# 2. Configure
cp .env.example .env.local
cp Pizza-Backend/.env.example Pizza-Backend/.env
# then fill in DATABASE_URL and JWT_SECRET in Pizza-Backend/.env

# 3. Create the schema and the menu, plus any staff accounts
npm run setup:api

# 4. Run both processes (two terminals)
npm run server    # API + realtime on :5002
npm run dev       # app on :3000
```

Generate a signing key with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The API **refuses to start** if `JWT_SECRET` is missing or under 32 characters, or if
`DATABASE_URL` is unset. There is no fallback secret.

### Staff accounts

`npm run seed` creates an admin, kitchen and delivery account from the `ADMIN_*`, `KITCHEN_*` and
`DELIVERY_*` environment variables. If those are unset it seeds only the menu and says so. There
are no credentials in this repository.

To promote an existing account, sign in as an admin and use
`PATCH /api/admin/users/:id/role`. Self-registration can only ever create a `customer` — the `role`
field is not read from the request body.

### Optional integrations

Both are off by default and the app degrades honestly rather than pretending:

- **Google Sign-In** — set `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend).
  Without it the button is hidden and only email/password works. The backend verifies the ID token
  against Google; there is no demo fallback that accepts an arbitrary string.
- **Mobile Money checkout** — `POST /api/payments/momo-checkout` returns `501 Not Implemented`.
  It never returns a fake `PENDING_USER_PIN` receipt. Wire up an MTN merchant account and call
  `PATCH /api/orders/:id/payment` from their webhook to enable it.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including `react-hooks/rules-of-hooks` |
| `npm test` | Vitest (API client, receipt generation, auth modal) |
| `npm run verify` | lint + test + build — the full gate |
| `npm --prefix Pizza-Backend test` | Data-layer unit tests (no database needed) |
| `npm --prefix Pizza-Backend run migrate` | Apply the schema (idempotent) |
| `npm --prefix Pizza-Backend run seed` | Seed the menu and staff accounts |

`react-hooks/rules-of-hooks` is an **error**, not a warning. Several screens used to call `useState`
after an early `return`, which threw at runtime; that class of bug now fails the build.

---

## ⚠️ Rotate anything that was ever committed

Earlier revisions of this repository contained live credentials in tracked files. They are removed
from the working tree but **still exist in git history**, and one of them was a real JWT signing
key that was duplicated across three source files. If this repository was ever deployed or shared:

1. **Rotate `JWT_SECRET`.** Every previously issued token was signed with the committed value, so
   they are all forgeable. Setting a new one invalidates them all.
2. **Rotate every seeded staff password** (`admin@hotpot.rw`, `cooker@hotpot.rw`, `chef@hotpot.rw`)
   and the `admin@hotpotdelights.rw` account whose bcrypt hash was committed in source.
3. **Rotate the database credentials** in `DATABASE_URL` and check the Neon access logs.
4. Purge the secrets from history (`git filter-repo`, or rewrite and force-push) if the repository
   is or was public.

Rotating the signing key is the single most important step: it is what makes the leaked session
material worthless.

---

## Notes on the map

Live tracking uses Leaflet with OpenStreetMap tiles. Marker icons are built with `divIcon` and all
interpolated customer data is escaped — an order's `customerName` is attacker-controlled input and
was previously injected raw into the popup HTML.

---

## License

UNLICENSED.
