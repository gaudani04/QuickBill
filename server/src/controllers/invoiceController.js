import PDFDocument from "pdfkit";
import { Order } from "../models/Order.js";
import { getShopSettings } from "../models/ShopSettings.js";

function formatMoney(n) {
  return `₹ ${Number(n).toFixed(2)}`;
}

export async function streamInvoicePdf(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate("createdBy", "name").lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const shop = await getShopSettings();

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `${order.invoiceNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(20).text(shop.businessName || "Retail Shop", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor("#444");
    if (shop.address) doc.text(shop.address, { align: "center" });
    const contact = [shop.phone, shop.email].filter(Boolean).join(" · ");
    if (contact) doc.text(contact, { align: "center" });
    if (shop.taxId) doc.text(`GST / Tax ID: ${shop.taxId}`, { align: "center" });
    doc.fillColor("#000").moveDown();

    doc.fontSize(14).text("TAX INVOICE", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Invoice No: ${order.invoiceNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Cashier: ${order.createdBy?.name || "—"}`);
    doc.moveDown();

    doc.fontSize(11).text("Bill To", { continued: false });
    doc.fontSize(10);
    doc.text(order.customerName);
    if (order.customerPhone) doc.text(`Phone: ${order.customerPhone}`);
    if (order.customerEmail) doc.text(`Email: ${order.customerEmail}`);
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10).text("Item", 50, tableTop, { width: 180 });
    doc.text("SKU", 240, tableTop, { width: 70 });
    doc.text("Qty", 320, tableTop, { width: 40, align: "right" });
    doc.text("Rate", 370, tableTop, { width: 60, align: "right" });
    doc.text("Amount", 440, tableTop, { width: 90, align: "right" });

    let y = tableTop + 18;
    doc.moveTo(50, y).lineTo(545, y).stroke("#ccc");
    y += 8;

    for (const line of order.items) {
      doc.fontSize(9).text(line.name, 50, y, { width: 180 });
      doc.text(line.sku, 240, y, { width: 70 });
      doc.text(String(line.quantity), 320, y, { width: 40, align: "right" });
      doc.text(formatMoney(line.unitSellingPrice), 370, y, { width: 60, align: "right" });
      doc.text(formatMoney(line.lineSubtotal), 440, y, { width: 90, align: "right" });
      y += 28;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    }

    doc.moveTo(50, y).lineTo(545, y).stroke("#ccc");
    y += 12;

    const payLabel =
      order.paymentMode === "cash"
        ? "Cash"
        : order.paymentMode === "upi"
          ? "UPI"
          : "Card";

    doc.fontSize(10);
    doc.text(`Subtotal: ${formatMoney(order.subtotal)}`, 350, y, { align: "right" });
    y += 16;
    doc.text(`Discount: ${formatMoney(order.discountAmount)}`, 350, y, { align: "right" });
    y += 16;
    doc.text(`Tax (${order.taxPercent}%): ${formatMoney(order.taxAmount)}`, 350, y, {
      align: "right",
    });
    y += 20;
    doc.fontSize(12).text(`Grand Total: ${formatMoney(order.grandTotal)}`, 350, y, {
      align: "right",
    });
    y += 24;
    doc.fontSize(10).text(`Payment: ${payLabel}`, 50, y);

    doc.moveDown(3);
    doc.fontSize(9).fillColor("#666").text("Thank you for your purchase.", 50, doc.y, {
      align: "center",
      width: 495,
    });

    doc.end();
  } catch (e) {
    next(e);
  }
}
