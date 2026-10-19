import { prisma } from "@/lib/prisma";
import { eventBus } from "./event-bus";
import { inventoryService } from "./inventory.service";
import {
  SalesChannel,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  reservationId?: string | null;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CreateOrderParams {
  channel: SalesChannel;
  customerId?: string | null;
  userId?: string | null;
  posTerminalId?: string | null;
  posShiftId?: string | null;
  items: CartItem[];
  payments: PaymentEntry[];
  discountAmount?: number;
  discountCode?: string | null;
  shippingAmount?: number;
  shippingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  customerNote?: string | null;
}

// ─────────────────────────────────────────────────────────
// ORDER NUMBER GENERATOR
// ─────────────────────────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const seq = String(count + 1).padStart(5, "0");
  return `ORD-${year}-${seq}`;
}

async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const seq = String(count + 1).padStart(6, "0");
  return `INV-${seq}`;
}

async function generateReturnNumber(): Promise<string> {
  const count = await prisma.orderReturn.count();
  const seq = String(count + 1).padStart(5, "0");
  return `RET-${seq}`;
}

// ─────────────────────────────────────────────────────────
// ORDER SERVICE
// ─────────────────────────────────────────────────────────

export const orderService = {
  /**
   * Create a unified order atomically across all channels.
   * This is the heart of the platform — everything happens in one DB transaction:
   * Validate → Price fetch → Inventory deduction → Order → Items → Payment → Invoice → Events
   */
  async createOrder(params: CreateOrderParams) {
    const {
      channel,
      customerId,
      userId,
      posTerminalId,
      posShiftId,
      items,
      payments,
      discountAmount = 0,
      discountCode,
      shippingAmount = 0,
      shippingAddress,
      notes,
      customerNote,
    } = params;

    // Pre-generate IDs outside transaction
    const orderId = uuidv4();
    const orderNumber = await generateOrderNumber();
    const invoiceNumber = await generateInvoiceNumber();

    // 1. Validate and fetch current product/variant data
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.status !== "ACTIVE") throw new Error(`Product "${product.name}" is not available`);

        let variant = null;
        let unitPrice = Number(product.basePrice);

        if (item.variantId) {
          variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant) throw new Error(`Variant ${item.variantId} not found`);
          if (!variant.isActive) throw new Error(`Variant is not active`);
          unitPrice = Number(variant.price);
        }

        const taxRate = Number(product.taxRate);
        const taxAmount = (unitPrice * item.quantity * taxRate) / 100;
        const totalAmount = unitPrice * item.quantity + taxAmount;

        return {
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice,
          costPrice: variant?.costPrice ? Number(variant.costPrice) : product.costPrice ? Number(product.costPrice) : null,
          taxAmount,
          totalAmount,
          productName: product.name,
          variantName: variant?.name ?? null,
          sku: variant?.sku ?? product.sku ?? null,
          imageUrl: variant?.imageUrl ?? product.imageUrl ?? null,
          reservationId: item.reservationId,
        };
      })
    );

    // 2. Calculate totals
    const subtotal = resolvedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const taxTotal = resolvedItems.reduce((sum, i) => sum + i.taxAmount, 0);
    const totalAmount = subtotal + taxTotal + shippingAmount - discountAmount;

    // 3. Validate payments sum
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    const tolerance = 0.01; // floating point tolerance
    if (Math.abs(paymentTotal - totalAmount) > tolerance) {
      throw new Error(
        `Payment total (৳${paymentTotal.toFixed(2)}) does not match order total (৳${totalAmount.toFixed(2)})`
      );
    }

    // 4. Execute full atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Deduct inventory for each item (with row-level locks)
      for (const item of resolvedItems) {
        await inventoryService.deductStock({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          orderId,
          channel,
          userId,
          tx: tx as Prisma.TransactionClient,
        });

        // Release any reservation that was held
        if (item.reservationId) {
          await tx.stockReservation.update({
            where: { id: item.reservationId },
            data: { status: "CONVERTED" },
          });
          // Decrement reserved counter (already deducted from quantity above)
          const inv = await tx.inventory.findFirst({
            where: { productId: item.productId, variantId: item.variantId ?? null, locationId: null },
          });
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { reserved: { decrement: Math.min(item.quantity, inv.reserved) } },
            });
          }
        }
      }

      // 4b. Create order
      const order = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          channel,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          customerId: customerId ?? null,
          userId: userId ?? null,
          posTerminalId: posTerminalId ?? null,
          posShiftId: posShiftId ?? null,
          subtotal,
          discountAmount,
          discountCode: discountCode ?? null,
          taxAmount: taxTotal,
          shippingAmount,
          totalAmount,
          shippingAddress: (shippingAddress as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          notes: notes ?? null,
          customerNote: customerNote ?? null,
          completedAt: new Date(),
        },
      });

      // 4c. Create order items
      await tx.orderItem.createMany({
        data: resolvedItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          taxAmount: item.taxAmount,
          discountAmount: 0,
          totalAmount: item.totalAmount,
        })),
      });

      // 4d. Create payments
      await tx.payment.createMany({
        data: payments.map((p) => ({
          orderId: order.id,
          method: p.method,
          amount: p.amount,
          status: PaymentStatus.PAID,
          reference: p.reference ?? null,
          notes: p.notes ?? null,
          processedAt: new Date(),
        })),
      });

      // 4e. Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          customerId: customerId ?? null,
          channel,
          subtotal,
          discountAmount,
          taxAmount: taxTotal,
          shippingAmount,
          totalAmount,
          issuedAt: new Date(),
        },
      });

      // 4f. Update customer stats
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: totalAmount },
          },
        });
      }

      // 4g. Audit log
      await tx.auditLog.create({
        data: {
          event: channel === SalesChannel.POS ? "POS_SALE_COMPLETED" : "ORDER_CREATED",
          entityType: "Order",
          entityId: order.id,
          userId: userId ?? null,
          channel,
          metadata: {
            orderNumber,
            invoiceNumber,
            totalAmount,
            itemCount: resolvedItems.length,
          },
        },
      });

      return { order, invoice };
    });

    // 5. Fire domain events (outside transaction)
    eventBus.publish("ORDER_CREATED", {
      orderId: result.order.id,
      orderNumber,
      channel,
      totalAmount,
      customerId,
    });

    eventBus.publish("INVOICE_CREATED", {
      invoiceId: result.invoice.id,
      invoiceNumber,
      orderId: result.order.id,
    });

    if (channel === SalesChannel.POS) {
      eventBus.publish("POS_SALE_COMPLETED", {
        orderId: result.order.id,
        orderNumber,
        totalAmount,
        posTerminalId,
      });
    }

    eventBus.publish("PAYMENT_RECEIVED", {
      orderId: result.order.id,
      amount: totalAmount,
      methods: payments.map((p) => p.method),
    });

    return result;
  },

  /**
   * Process a return — creates return record and triggers inventory restoration.
   */
  async processReturn(params: {
    orderId: string;
    reason: string;
    items: Array<{ orderItemId: string; quantity: number; isDamaged: boolean }>;
    refundMethod?: PaymentMethod;
    addToStock?: boolean;
    userId?: string;
  }) {
    const { orderId, reason, items, refundMethod, addToStock = true, userId } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new Error("Order not found");

    const returnNumber = await generateReturnNumber();

    // Calculate refund amount
    let refundAmount = 0;
    for (const returnItem of items) {
      const orderItem = order.items.find((i) => i.id === returnItem.orderItemId);
      if (!orderItem) throw new Error(`Order item ${returnItem.orderItemId} not found`);
      refundAmount += (Number(orderItem.unitPrice) + Number(orderItem.taxAmount) / orderItem.quantity) * returnItem.quantity;
    }

    const orderReturn = await prisma.$transaction(async (tx) => {
      const ret = await tx.orderReturn.create({
        data: {
          returnNumber,
          orderId,
          reason,
          status: "RECEIVED",
          refundAmount,
          refundMethod: refundMethod ?? null,
          addToStock,
          items: {
            create: items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
              isDamaged: i.isDamaged,
            })),
          },
        },
        include: { items: { include: { orderItem: true } } },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      // Update customer stats
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalSpent: { decrement: refundAmount } },
        });
      }

      // Audit
      await tx.auditLog.create({
        data: {
          event: "ORDER_REFUNDED",
          entityType: "OrderReturn",
          entityId: ret.id,
          userId: userId ?? null,
          channel: order.channel,
          metadata: { returnNumber, refundAmount, orderId },
        },
      });

      return ret;
    });

    // Restore inventory for each returned item
    for (const returnItem of orderReturn.items) {
      const orderItem = order.items.find((i) => i.id === returnItem.orderItemId);
      if (!orderItem) continue;

      await inventoryService.restoreStock({
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        quantity: returnItem.quantity,
        returnId: orderReturn.id,
        sellable: addToStock && !returnItem.isDamaged,
        userId,
      });
    }

    eventBus.publish("ORDER_RETURNED", {
      orderId,
      returnId: orderReturn.id,
      returnNumber,
      refundAmount,
    });

    return orderReturn;
  },
};

export default orderService;
