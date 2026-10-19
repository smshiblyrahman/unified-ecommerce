import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/services/order.service";
import { SalesChannel, PaymentMethod } from "@prisma/client";

// POST /api/pos/sale — Atomic POS checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      payments,
      customerId,
      userId,
      posTerminalId,
      posShiftId,
      discountAmount,
      discountCode,
      notes,
      customerNote,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: "No payment provided" }, { status: 400 });
    }

    const result = await orderService.createOrder({
      channel: SalesChannel.POS,
      customerId: customerId ?? null,
      userId: userId ?? null,
      posTerminalId: posTerminalId ?? null,
      posShiftId: posShiftId ?? null,
      items: items.map((i: { productId: string; variantId?: string; quantity: number }) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        quantity: i.quantity,
      })),
      payments: payments.map((p: { method: PaymentMethod; amount: number; reference?: string }) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? undefined,
      })),
      discountAmount: discountAmount ?? 0,
      discountCode: discountCode ?? null,
      notes: notes ?? null,
      customerNote: customerNote ?? null,
    });

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      totalAmount: result.order.totalAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaction failed";
    const isStockError = message.toLowerCase().includes("insufficient") || message.toLowerCase().includes("stock");
    return NextResponse.json(
      { error: message, type: isStockError ? "STOCK_ERROR" : "TRANSACTION_ERROR" },
      { status: isStockError ? 409 : 500 }
    );
  }
}
