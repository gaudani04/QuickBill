import { useEffect, useState } from "react";
import api from "../api.js";
import FieldError from "../components/FieldError.jsx";
import { apiErr } from "../utils/format.js";

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings");
        setForm({
          businessName: data.businessName || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          taxId: data.taxId || "",
        });
      } catch (e) {
        setError(apiErr(e));
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.patch("/settings", form);
      setSaved(true);
    } catch (err) {
      setError(apiErr(err));
    }
  };

  if (!form) {
    return <p className="text-slate-600">Loading settings…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shop settings</h1>
        <p className="text-slate-600">Shown on every PDF invoice</p>
      </div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Business name
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Address
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Phone
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          GST / Tax ID
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.taxId}
            onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
          />
        </label>
        <FieldError message={error} />
        {saved && <p className="text-sm font-medium text-emerald-700">Saved successfully.</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
