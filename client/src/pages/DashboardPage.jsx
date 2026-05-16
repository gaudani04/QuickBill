import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../api.js";
import { apiErr, formatMoney } from "../utils/format.js";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d } = await api.get("/dashboard/summary");
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(apiErr(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-slate-600">Loading dashboard…</p>;
  }

  const chartData = data.revenueByDay.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Today and this week at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's sales" value={formatMoney(data.today.revenue)} hint={`${data.today.orders} orders`} />
        <StatCard title="Today's profit" value={formatMoney(data.today.profit)} hint="After discounts, before tax" accent />
        <StatCard title="Week revenue" value={formatMoney(data.week.revenue)} hint={`${data.week.orders} orders`} />
        <StatCard title="Week profit" value={formatMoney(data.week.profit)} hint="Estimated margin" accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Revenue (last 7 days)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Low stock</h2>
            <p className="mt-1 text-3xl font-bold text-amber-700">{data.lowStock.count}</p>
            <p className="text-sm text-slate-600">SKU at or below threshold</p>
            <ul className="mt-4 space-y-2 text-sm">
              {data.lowStock.items.map((p) => (
                <li key={p._id} className="flex justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <span className="truncate font-medium text-slate-800">{p.name}</span>
                  <span className="text-slate-600">
                    {p.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Best sellers (week)</h2>
            <ul className="mt-3 space-y-2">
              {data.bestSellers.map((b) => (
                <li key={String(b.productId)} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-slate-800">{b.name}</span>
                  <span className="text-slate-600">{b.unitsSold} sold</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, hint, accent }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
