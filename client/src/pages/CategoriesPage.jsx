import { useEffect, useState } from "react";
import api from "../api.js";
import FieldError from "../components/FieldError.jsx";
import { apiErr } from "../utils/format.js";

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/categories", { params: { limit: 100 } });
      setItems(data.items);
    } catch (e) {
      setError(apiErr(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/categories", { name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(apiErr(err));
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
    } catch (err) {
      alert(apiErr(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="text-slate-600">Group products for faster billing</p>
      </div>

      <form onSubmit={add} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-700">
          New category name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add
        </button>
      </form>
      <FieldError message={error} />

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
        {items.map((c) => (
          <li key={c._id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium text-slate-900">{c.name}</span>
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
              onClick={() => remove(c._id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
