import { useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import FieldError from "../components/FieldError.jsx";
import { apiErr, formatMoney } from "../utils/format.js";

export default function ProductsPage() {
  const { user } = useAuth();
  const admin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [categories, setCategories] = useState([]);

  const load = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/products", {
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

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories", { params: { limit: 100 } });
        setCategories(data.items);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openCreate = () => {
    setModal({
      mode: "create",
      form: {
        name: "",
        sku: "",
        category: categories[0]?._id || "",
        buyingPrice: "",
        sellingPrice: "",
        quantity: "0",
        barcode: "",
        lowStockThreshold: "10",
      },
    });
  };

  const openEdit = (p) => {
    setModal({
      mode: "edit",
      id: p._id,
      form: {
        name: p.name,
        sku: p.sku,
        category: p.category?._id || p.category,
        buyingPrice: String(p.buyingPrice),
        sellingPrice: String(p.sellingPrice),
        quantity: String(p.quantity),
        barcode: p.barcode || "",
        lowStockThreshold: String(p.lowStockThreshold ?? 10),
      },
    });
  };

  const saveProduct = async () => {
    if (!modal) return;
    const payload = {
      name: modal.form.name.trim(),
      sku: modal.form.sku.trim(),
      category: modal.form.category,
      buyingPrice: Number(modal.form.buyingPrice),
      sellingPrice: Number(modal.form.sellingPrice),
      quantity: Number(modal.form.quantity),
      barcode: modal.form.barcode.trim(),
      lowStockThreshold: Number(modal.form.lowStockThreshold),
    };
    try {
      if (modal.mode === "create") {
        await api.post("/products", payload);
      } else {
        await api.patch(`/products/${modal.id}`, payload);
      }
      setModal(null);
      await load(meta.page);
    } catch (e) {
      setModal((m) => (m ? { ...m, saveError: apiErr(e) } : m));
    }
  };

  const deactivate = async (id) => {
    if (!confirm("Remove this product from the catalog?")) return;
    try {
      await api.delete(`/products/${id}`);
      await load(meta.page);
    } catch (e) {
      alert(apiErr(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600">Search by name, SKU, or barcode</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => load(1)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Search
          </button>
          {admin && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add product
            </button>
          )}
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Buy</th>
                <th className="px-4 py-3 text-right">Sell</th>
                <th className="px-4 py-3 text-right">Qty</th>
                {admin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p._id} className={p.quantity <= p.lowStockThreshold ? "bg-amber-50/60" : ""}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{p.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.buyingPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{p.quantity}</td>
                  {admin && (
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-brand-700 hover:underline mr-3" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => deactivate(p._id)}>
                        Remove
                      </button>
                    </td>
                  )}
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

      {modal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {modal.mode === "create" ? "New product" : "Edit product"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.name}
                  onChange={(e) =>
                    setModal((m) => (m ? { ...m, form: { ...m.form, name: e.target.value } } : m))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">SKU</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase"
                  value={modal.form.sku}
                  onChange={(e) =>
                    setModal((m) => (m ? { ...m, form: { ...m.form, sku: e.target.value } } : m))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Category</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.category}
                  onChange={(e) =>
                    setModal((m) => (m ? { ...m, form: { ...m.form, category: e.target.value } } : m))
                  }
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Buying price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.buyingPrice}
                  onChange={(e) =>
                    setModal((m) =>
                      m ? { ...m, form: { ...m.form, buyingPrice: e.target.value } } : m
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Selling price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.sellingPrice}
                  onChange={(e) =>
                    setModal((m) =>
                      m ? { ...m, form: { ...m.form, sellingPrice: e.target.value } } : m
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Quantity</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.quantity}
                  onChange={(e) =>
                    setModal((m) =>
                      m ? { ...m, form: { ...m.form, quantity: e.target.value } } : m
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Low-stock alert at</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.lowStockThreshold}
                  onChange={(e) =>
                    setModal((m) =>
                      m ? { ...m, form: { ...m.form, lowStockThreshold: e.target.value } } : m
                    )
                  }
                />
              </label>
              <label className="sm:col-span-2 block text-sm">
                <span className="font-medium text-slate-700">Barcode (optional)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={modal.form.barcode}
                  onChange={(e) =>
                    setModal((m) =>
                      m ? { ...m, form: { ...m.form, barcode: e.target.value } } : m
                    )
                  }
                />
              </label>
            </div>
            <FieldError message={modal.saveError} />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={saveProduct}
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
