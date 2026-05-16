import { useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import FieldError from "../components/FieldError.jsx";
import { apiErr, formatMoney } from "../utils/format.js";

export default function InventoryPage() {
  const { user } = useAuth();
  const admin = user?.role === "admin";

  const [low, setLow] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [restock, setRestock] = useState(null);

  const load = async () => {
    setError("");
    try {
      const [rLow, rLogs] = await Promise.all([
        api.get("/inventory/low-stock", { params: { limit: 50 } }),
        api.get("/inventory/logs", { params: { limit: 25 } }),
      ]);
      setLow(rLow.data.items);
      setLogs(rLogs.data.items);
    } catch (e) {
      setError(apiErr(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitRestock = async () => {
    if (!restock) return;
    try {
      await api.post(`/inventory/restock/${restock.id}`, {
        quantity: Number(restock.qty),
        note: restock.note,
      });
      setRestock(null);
      await load();
    } catch (e) {
      setRestock((r) => (r ? { ...r, err: apiErr(e) } : r));
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="text-slate-600">Low-stock shelf checks and movement history</p>
      </div>
      <FieldError message={error} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-amber-950">Needs attention</h2>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-300"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-amber-900/80">
                <th className="pb-2">Product</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Alert at</th>
                {admin && <th className="pb-2 text-right">Restock</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {low.map((p) => (
                <tr key={p._id}>
                  <td className="py-2 font-medium text-slate-900">{p.name}</td>
                  <td className="py-2 font-mono text-slate-600">{p.sku}</td>
                  <td className="py-2 text-right font-bold text-amber-900">{p.quantity}</td>
                  <td className="py-2 text-right text-slate-700">{p.lowStockThreshold}</td>
                  {admin && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-brand-700 hover:underline font-medium"
                        onClick={() =>
                          setRestock({ id: p._id, name: p.name, qty: "10", note: "", err: "" })
                        }
                      >
                        Add stock
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {low.length === 0 && <p className="py-6 text-center text-amber-900/70">All SKUs above threshold</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent inventory logs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2">When</th>
                <th className="py-2">Product</th>
                <th className="py-2">Reason</th>
                <th className="py-2 text-right">Change</th>
                <th className="py-2 text-right">Balance</th>
                <th className="py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-50">
                  <td className="py-2 whitespace-nowrap text-slate-600">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className="font-medium">{l.product?.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{l.product?.sku}</span>
                  </td>
                  <td className="py-2 capitalize text-slate-700">{l.reason}</td>
                  <td className="py-2 text-right font-semibold">{l.change > 0 ? `+${l.change}` : l.change}</td>
                  <td className="py-2 text-right text-slate-600">{l.newQty}</td>
                  <td className="py-2 text-slate-600">{l.user?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {restock && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Restock — {restock.name}</h3>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Units to add
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={restock.qty}
                onChange={(e) => setRestock((r) => (r ? { ...r, qty: e.target.value } : r))}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Note (optional)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={restock.note}
                onChange={(e) => setRestock((r) => (r ? { ...r, note: e.target.value } : r))}
              />
            </label>
            <FieldError message={restock.err} />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setRestock(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={submitRestock}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
