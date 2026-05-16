import { useEffect, useState } from "react";
import api from "../api.js";
import FieldError from "../components/FieldError.jsx";
import { apiErr, formatMoney } from "../utils/format.js";

export default function OrdersPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/orders", {
        params: { page, limit: 15, search: search.trim() || undefined },
      });
      setItems(data.items);
      setMeta(data.meta);
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pdfUrl = (id) => `/api/orders/${id}/pdf`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-600">Invoice history with exact timestamps</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Invoice or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => load(1)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </div>
      </div>

      <FieldError message={error} />

      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((o) => (
                <tr key={o._id}>
                  <td className="px-4 py-3 font-mono font-semibold text-brand-800">{o.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{o.customerName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{o.paymentMode}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(o.grandTotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={pdfUrl(o._id)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between text-sm text-slate-600">
        <span>
          Page {meta.page} of {meta.pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={meta.page <= 1}
            onClick={() => load(meta.page - 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={meta.page >= meta.pages}
            onClick={() => load(meta.page + 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
