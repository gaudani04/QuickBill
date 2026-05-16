# QuickBill — Retail Shop Management

Full-stack billing and inventory for stationery/electronics counters: **React + Tailwind**, **Express + MongoDB**, **JWT in HTTP-only cookies**, **MongoDB transactions** for sales and stock.

This guide targets **Windows** with **MongoDB Community Server** and **Node.js** installed locally—**no Docker**.

---

## Prerequisites

- **Windows 10/11**
- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **MongoDB Community Server** ([mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)) — install the **current release**, accept defaults unless you customize paths.
- **mongosh** (MongoDB Shell) — usually installed with the server; otherwise install from [mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell).

---

## Part A — MongoDB Community Server (local replica set)

QuickBill uses **multi-document transactions** (orders + stock). Those require MongoDB to run as a **replica set**. For local development, a **single-node replica set** named **`rs0`** is enough.

### A1. Enable replica set in `mongod.cfg`

1. Find **`mongod.cfg`**. Typical locations:
   - `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`
   - or `C:\ProgramData\MongoDB\MongoDB Server\<version>\mongod.cfg`

2. Open **`mongod.cfg`** as Administrator and add a **`replication`** section (YAML indentation matters):

```yaml
replication:
  replSetName: "rs0"
```

If the file already has `storage:`, `systemLog:`, etc., place **`replication`** at the **same indentation level** as those top-level keys (not nested inside them).

3. Ensure the server listens on localhost (default is usually fine). Typically you will see:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

Keep **`bindIp`** including **`127.0.0.1`** so the app URI below matches.

4. **Restart MongoDB** so the config is loaded:
   - Press **Win + R**, run **`services.msc`**
   - Find **MongoDB Server**
   - Right-click → **Restart**

*(If you start `mongod.exe` manually instead of a service, always pass the same config file, e.g. `mongod.exe --config "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg"` — adjust the path to your version.)*

### A2. Initialize the replica set (one-time)

Open **PowerShell** or **Command Prompt** and run **`mongosh`**:

```bash
mongosh
```

Then paste:

```javascript
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "127.0.0.1:27017" }],
});
```

Wait a few seconds, then check:

```javascript
rs.status();
```

You should see **`set: 'rs0'`** and the member **`stateStr`** becoming **`PRIMARY`** (may show **`STARTUP2`** briefly first).

Type **`exit`** to leave `mongosh`.

### A3. Backend connection string

Use exactly:

```text
mongodb://127.0.0.1:27017/quickbill?replicaSet=rs0
```

The database name **`quickbill`** is created automatically when the app first writes data. **Do not remove `replicaSet=rs0`** — the Node driver needs it to target the replica set so **transactions used by the Order flow keep working**.

---

## Part B — Node backend (Express API)

1. Open a terminal and go to the server folder:

```powershell
cd D:\QuickBill\server
```

*(Adjust the path if your project lives elsewhere.)*

2. Create **`.env`** from the example:

```powershell
copy .env.example .env
```

3. Confirm **`MONGODB_URI`** inside **`.env`** is:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/quickbill?replicaSet=rs0
```

4. Install dependencies and **seed** admin/staff users:

```powershell
npm install
npm run seed
```

5. Start the API:

```powershell
npm run dev
```

You should see a log line that MongoDB connected and the API is listening (default **port 5000**).

**Sanity check:** in a browser or with curl:

- `http://127.0.0.1:5000/api/health` → JSON `{ "ok": true }`

### Seed users (created by `npm run seed`)

If they do not exist yet, the seed script creates:

| Role  | Email             | Password    |
| ----- | ----------------- | ----------- |
| Admin | admin@shop.local  | admin12345 |
| Staff | staff@shop.local  | staff12345 |

Optional overrides (PowerShell, before `npm run seed`):

```powershell
$env:SEED_ADMIN_EMAIL="you@example.com"
$env:SEED_ADMIN_PASSWORD="your-secure-password"
npm run seed
```

---

## Part C — React frontend (Vite)

Open a **second** terminal:

```powershell
cd D:\QuickBill\client
npm install
npm run dev
```

The UI is served at **`http://localhost:5173`**. Vite proxies **`/api`** to **`http://127.0.0.1:5000`**, so keep the backend running at the same time.

Sign in with **`admin@shop.local`** / **`admin12345`** (or the staff user) and complete a test sale to confirm **transactions** and stock updates work.

---

## Optional — run API + UI together

From the repo root **`D:\QuickBill`** (after `npm install` there):

```powershell
npm run dev
```

This runs **`server`** and **`client`** concurrently.

---

## Roles

- **Admin**: categories, products CRUD, shop settings, restock.
- **Staff**: dashboard, new sale, orders/PDF, products (read), inventory view/logs.

---

## Production reminders

- Set a strong **`JWT_SECRET`** and **`COOKIE_SECURE=true`** behind HTTPS.
- Set **`CLIENT_ORIGIN`** to your real SPA URL.

---

## Security notes

- JWT is stored only in an **HTTP-only**, **SameSite=Strict** cookie (no `localStorage` token).
- Deep links to app routes require an active session (SPA redirects to login).
- Session length follows **`JWT_EXPIRES_IN`** (e.g. **`8h`**).
