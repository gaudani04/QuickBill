import ExcelJS from "exceljs";
import { validationResult } from "express-validator";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { parseDateRangeQuery, formatDateLabel } from "../utils/dateRange.js";

async function buildReport(from, to) {
  const orderFilter = { createdAt: { $gte: from, $lte: to } };

  const [orders, salesAgg, stockProducts] = await Promise.all([
    Order.find(orderFilter)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean(),
    Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$profitAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]),
    Product.find({ active: true })
      .populate("category", "name")
      .sort({ name: 1 })
      .lean(),
  ]);

  const lowStock = stockProducts.filter((p) => p.quantity <= p.lowStockThreshold);

  const agg = salesAgg[0] || { totalSales: 0, totalProfit: 0, orderCount: 0 };

  return {
    dateRange: {
      from: formatDateLabel(from),
      to: formatDateLabel(to),
    },
    summary: {
      totalSales: agg.totalSales,
      totalProfit: agg.totalProfit,
      orderCount: agg.orderCount,
      lowStockCount: lowStock.length,
    },
    sales: orders.map((o) => ({
      _id: o._id,
      invoiceNumber: o.invoiceNumber,
      createdAt: o.createdAt,
      customerName: o.customerName,
      paymentMode: o.paymentMode,
      subtotal: o.subtotal,
      discountAmount: o.discountAmount,
      taxAmount: o.taxAmount,
      grandTotal: o.grandTotal,
      profitAmount: o.profitAmount,
      itemCount: o.items?.length ?? 0,
      cashier: o.createdBy?.name || "—",
    })),
    stock: stockProducts.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || "—",
      buyingPrice: p.buyingPrice,
      sellingPrice: p.sellingPrice,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.quantity <= p.lowStockThreshold,
      stockValue: Math.round(p.buyingPrice * p.quantity * 100) / 100,
    })),
    lowStock: lowStock.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || "—",
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
    })),
  };
}

export async function getReport(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const { from, to } = parseDateRangeQuery(req.query);
    const report = await buildReport(from, to);
    res.json(report);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
}

function money(n) {
  return Number(n ?? 0);
}

async function buildWorkbook(report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QuickBill";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 24 },
  ];
  summary.addRows([
    { metric: "Report from", value: report.dateRange.from },
    { metric: "Report to", value: report.dateRange.to },
    { metric: "Total sales (₹)", value: money(report.summary.totalSales) },
    { metric: "Total profit (₹)", value: money(report.summary.totalProfit) },
    { metric: "Orders in period", value: report.summary.orderCount },
    { metric: "Low-stock SKUs (current)", value: report.summary.lowStockCount },
  ]);
  summary.getRow(1).font = { bold: true };

  const salesSheet = wb.addWorksheet("Sales");
  salesSheet.columns = [
    { header: "Invoice", key: "invoiceNumber", width: 18 },
    { header: "Date", key: "createdAt", width: 20 },
    { header: "Customer", key: "customerName", width: 22 },
    { header: "Payment", key: "paymentMode", width: 10 },
    { header: "Items", key: "itemCount", width: 8 },
    { header: "Subtotal", key: "subtotal", width: 12 },
    { header: "Discount", key: "discountAmount", width: 12 },
    { header: "Tax", key: "taxAmount", width: 10 },
    { header: "Total", key: "grandTotal", width: 12 },
    { header: "Profit", key: "profitAmount", width: 12 },
    { header: "Cashier", key: "cashier", width: 16 },
  ];
  salesSheet.getRow(1).font = { bold: true };
  for (const row of report.sales) {
    salesSheet.addRow({
      ...row,
      createdAt: new Date(row.createdAt).toLocaleString(),
      paymentMode: row.paymentMode?.toUpperCase(),
    });
  }

  const stockSheet = wb.addWorksheet("Stock");
  stockSheet.columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "SKU", key: "sku", width: 14 },
    { header: "Category", key: "category", width: 16 },
    { header: "Qty", key: "quantity", width: 8 },
    { header: "Alert at", key: "lowStockThreshold", width: 10 },
    { header: "Buy price", key: "buyingPrice", width: 12 },
    { header: "Sell price", key: "sellingPrice", width: 12 },
    { header: "Stock value", key: "stockValue", width: 14 },
    { header: "Low stock?", key: "isLowStock", width: 12 },
  ];
  stockSheet.getRow(1).font = { bold: true };
  for (const row of report.stock) {
    stockSheet.addRow({
      ...row,
      isLowStock: row.isLowStock ? "Yes" : "No",
    });
  }

  const lowSheet = wb.addWorksheet("Low stock");
  lowSheet.columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "SKU", key: "sku", width: 14 },
    { header: "Category", key: "category", width: 16 },
    { header: "Qty", key: "quantity", width: 8 },
    { header: "Alert at", key: "lowStockThreshold", width: 10 },
  ];
  lowSheet.getRow(1).font = { bold: true };
  lowSheet.addRows(report.lowStock);

  return wb;
}

export async function exportReport(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const { from, to } = parseDateRangeQuery(req.query);
    const report = await buildReport(from, to);
    const wb = await buildWorkbook(report);
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `quickbill-report_${report.dateRange.from}_${report.dateRange.to}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
}
