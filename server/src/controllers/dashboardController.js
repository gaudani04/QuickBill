import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = startOfToday();
  d.setDate(d.getDate() - 6);
  return d;
}

export async function dashboardSummary(_req, res, next) {
  try {
    const todayStart = startOfToday();
    const weekStart = startOfWeek();

    const [
      todayAgg,
      weekAgg,
      topProducts,
      lowStockCount,
      dailyRevenue,
      profitToday,
      profitWeek,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            sku: { $first: "$items.sku" },
            unitsSold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineSubtotal" },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 8 },
      ]),
      Product.countDocuments({
        active: true,
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      }),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: { _id: null, profit: { $sum: "$profitAmount" } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        { $group: { _id: null, profit: { $sum: "$profitAmount" } } },
      ]),
    ]);

    const lowStockSamples = await Product.find({
      active: true,
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
    })
      .sort({ quantity: 1 })
      .limit(10)
      .select("name sku quantity lowStockThreshold")
      .lean();

    res.json({
      today: {
        revenue: todayAgg[0]?.revenue ?? 0,
        orders: todayAgg[0]?.orders ?? 0,
        profit: profitToday[0]?.profit ?? 0,
      },
      week: {
        revenue: weekAgg[0]?.revenue ?? 0,
        orders: weekAgg[0]?.orders ?? 0,
        profit: profitWeek[0]?.profit ?? 0,
      },
      bestSellers: topProducts.map((r) => ({
        productId: r._id,
        name: r.name,
        sku: r.sku,
        unitsSold: r.unitsSold,
        revenue: r.revenue,
      })),
      lowStock: {
        count: lowStockCount,
        items: lowStockSamples,
      },
      revenueByDay: dailyRevenue.map((d) => ({
        date: d._id,
        revenue: d.revenue,
        orders: d.orders,
      })),
    });
  } catch (e) {
    next(e);
  }
}
