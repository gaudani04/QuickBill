import { useEffect, useMemo, useState } from "react";
import api from "../api.js";
import FieldError from "../components/FieldError.jsx";
import { apiErr, formatMoney } from "../utils/format.js";
import { useNavigate } from "react-router-dom";

export default function NewSalePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/products", { params: { limit: 50 } });
        if (!cancelled) setProducts(data.items);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  const addLine = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === p._id);
      if (idx >= 0) {
        const next = [...prev];
        if (next[idx].quantity >= p.quantity) return prev;
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      if (p.quantity < 1) return prev;
      return [...prev, { productId: p._id, name: p.name, sku: p.sku, maxQty: p.quantity, quantity: 1, price: p.sellingPrice }];
    });
  };

  const setQty = (productId, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const capped = Math.min(q, l.maxQty);
        return { ...l, quantity: capped };
      })
    );
  };

  const removeLine = (productId) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const afterDisc = subtotal - discount;
  const tax = afterDisc * ((Number(taxPercent) || 0) / 100);
  const grand = afterDisc + tax;

  const placeOrder = async () => {
    setError("");
    if (!cart.length) {
      setError("Add at least one product");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        customerName,
        customerPhone,
        discountAmount: discount,
        taxPercent: Number(taxPercent) || 0,
        paymentMode,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      navigate(`/orders`, { state: { highlight: data._id } });
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New sale</h1>
          <p className="text-slate-600">Tap products to add — quantities cannot exceed shelf stock</p>
        </div>
        <input
          placeholder="Search product name, SKU, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => addLine(p)}
              disabled={p.quantity < 1}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-brand-400 disabled:opacity-40"
            >
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs font-mono text-slate-500">{p.sku}</p>
              <p className="mt-2 text-lg font-bold text-brand-700">{formatMoney(p.sellingPrice)}</p>
              <p className="text-xs text-slate-600">In stock: {p.quantity}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50">
        <h2 className="text-lg font-semibold text-slate-900">Bill</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Customer name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone (optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {cart.length === 0 && <p className="py-6 text-center text-slate-500">Cart is empty</p>}
          {cart.map((l) => (
            <div key={l.productId} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.name}</p>
                <p className="text-xs font-mono text-slate-500">{l.sku}</p>
              </div>
              <input
                type="number"
                min={1}
                max={l.maxQty}
                value={l.quantity}
                onChange={(e) => setQty(l.productId, e.target.value)}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
              />
              <span className="w-24 text-right font-semibold">{formatMoney(l.price * l.quantity)}</span>
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeLine(l.productId)}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Discount (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tax (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Payment
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>- {formatMoney(discount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(grand)}</span>
          </div>
        </div>

        <FieldError message={error} />

        <button
          type="button"
          disabled={busy}
          onClick={placeOrder}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Complete sale"}
        </button>
      </div>
    </div>
  );
}
