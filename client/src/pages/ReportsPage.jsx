import { useCallback, useEffect, useState } from "react";
import api from "../api.js";
import FieldError from "../components/FieldError.jsx";
import { apiErr, formatMoney } from "../utils/format.js";

function monthStartISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("sales");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/reports", { params: { from, to } });
      setReport(data);
    } catch (e) {
      setError(apiErr(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportExcel = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await api.get("/reports/export", {
        params: { from, to },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quickbill-report_${from}_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          setError(json.message || "Export failed");
        } catch {
          setError("Export failed");
        }
      } else {
        setError(apiErr(e));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & export</h1>
          <p className="text-slate-600">
            Sales for the selected dates · stock is current shelf levels
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-700">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting || !report}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </div>

      <FieldError message={error} />

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total sales" value={formatMoney(report.summary.totalSales)} />
            <SummaryCard
              label="Total profit"
              value={formatMoney(report.summary.totalProfit)}
              accent
            />
            <SummaryCard label="Orders" value={String(report.summary.orderCount)} />
            <SummaryCard
              label="Low-stock items"
              value={String(report.summary.lowStockCount)}
              warn={report.summary.lowStockCount > 0}
            />
          </div>

          <div className="flex gap-2 border-b border-slate-200">
            <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
              Sales ({report.sales.length})
            </TabButton>
            <TabButton active={tab === "stock"} onClick={() => setTab("stock")}>
              Stock ({report.stock.length})
            </TabButton>
            <TabButton active={tab === "low"} onClick={() => setTab("low")}>
              Low stock ({report.lowStock.length})
            </TabButton>
          </div>

          {tab === "sales" && (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Profit</Th>
                  <Th>Cashier</Th>
                </tr>
              </thead>
              <tbody>
                {report.sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No sales in this date range
                    </td>
                  </tr>
                ) : (
                  report.sales.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100">
                      <Td className="font-mono font-medium text-brand-800">{row.invoiceNumber}</Td>
                      <Td>{new Date(row.createdAt).toLocaleString()}</Td>
                      <Td>{row.customerName}</Td>
                      <Td className="capitalize">{row.paymentMode}</Td>
                      <Td className="text-right font-semibold">{formatMoney(row.grandTotal)}</Td>
                      <Td className="text-right">{formatMoney(row.profitAmount)}</Td>
                      <Td>{row.cashier}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableWrap>
          )}

          {tab === "stock" && (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Buy</Th>
                  <Th className="text-right">Sell</Th>
                  <Th className="text-right">Stock value</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {report.stock.map((row) => (
                  <tr
                    key={row._id}
                    className={`border-t border-slate-100 ${row.isLowStock ? "bg-amber-50/70" : ""}`}
                  >
                    <Td className="font-medium">{row.name}</Td>
                    <Td className="font-mono text-slate-600">{row.sku}</Td>
                    <Td>{row.category}</Td>
                    <Td className="text-right font-semibold">{row.quantity}</Td>
                    <Td className="text-right">{formatMoney(row.buyingPrice)}</Td>
                    <Td className="text-right">{formatMoney(row.sellingPrice)}</Td>
                    <Td className="text-right">{formatMoney(row.stockValue)}</Td>
                    <Td>
                      {row.isLowStock ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Low
                        </span>
                      ) : (
                        <span className="text-slate-500">OK</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}

          {tab === "low" && (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Alert at</Th>
                </tr>
              </thead>
              <tbody>
                {report.lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No low-stock items right now
                    </td>
                  </tr>
                ) : (
                  report.lowStock.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100 bg-amber-50/50">
                      <Td className="font-medium">{row.name}</Td>
                      <Td className="font-mono">{row.sku}</Td>
                      <Td>{row.category}</Td>
                      <Td className="text-right font-bold text-amber-900">{row.quantity}</Td>
                      <Td className="text-right">{row.lowStockThreshold}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableWrap>
          )}
        </>
      )}

      {!report && !loading && !error && (
        <p className="text-slate-600">Choose a date range and click Apply.</p>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, warn }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        warn
          ? "border-amber-200 bg-amber-50"
          : accent
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-slate-800 ${className}`}>{children}</td>;
}
