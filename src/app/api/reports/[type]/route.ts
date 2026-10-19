import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyticsService, DateRange } from "@/services/analytics.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "30d") as DateRange;
  const format = searchParams.get("format") || "csv";

  let data: Record<string, unknown>[] = [];

  switch (type) {
    case "sales": {
      const orders = await prisma.order.findMany({
        where: { status: { not: "CANCELLED" } },
        include: { customer: true, items: true, payments: true },
        orderBy: { createdAt: "desc" },
      });
      data = orders.map((o) => ({
        orderNumber: o.orderNumber,
        channel: o.channel,
        status: o.status,
        customer: o.customer?.name || "Walk-in",
        items: o.items.length,
        subtotal: o.subtotal,
        discount: o.discountAmount,
        tax: o.taxAmount,
        total: o.totalAmount,
        date: o.createdAt.toISOString(),
      }));
      break;
    }
    case "products": {
      data = await analyticsService.getTopProducts(100, range);
      break;
    }
    case "inventory": {
      const inventories = await prisma.inventory.findMany({
        include: { product: true, variant: true },
      });
      data = inventories.map((inv) => ({
        product: inv.product.name,
        sku: inv.product.sku || "",
        quantity: inv.quantity,
        reserved: inv.reserved,
        available: inv.quantity - inv.reserved,
        damaged: inv.damaged,
        value: inv.quantity * Number(inv.product.basePrice),
      }));
      break;
    }
    case "customers": {
      const customers = await prisma.customer.findMany({
        where: { isWalkIn: false },
        orderBy: { totalSpent: "desc" },
      });
      data = customers.map((c) => ({
        name: c.name,
        email: c.email || "",
        phone: c.phone || "",
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        memberSince: c.createdAt.toISOString(),
      }));
      break;
    }
    case "payments": {
      const payments = await prisma.payment.findMany({
        include: { order: true },
        orderBy: { createdAt: "desc" },
      });
      data = payments.map((p) => ({
        orderNumber: p.order.orderNumber,
        method: p.method,
        amount: p.amount,
        status: p.status,
        reference: p.reference || "",
        date: p.createdAt.toISOString(),
      }));
      break;
    }
    case "refunds": {
      const returns = await prisma.orderReturn.findMany({
        include: { order: true },
        orderBy: { createdAt: "desc" },
      });
      data = returns.map((r) => ({
        returnNumber: r.returnNumber,
        orderNumber: r.order.orderNumber,
        reason: r.reason || "",
        refundAmount: r.refundAmount,
        status: r.status,
        date: r.createdAt.toISOString(),
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  if (format === "csv") {
    if (data.length === 0) {
      return new Response("No data", { headers: { "Content-Type": "text/csv" } });
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
