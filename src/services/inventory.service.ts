import { prisma } from "@/lib/prisma";
import { eventBus } from "./event-bus";
import { SalesChannel, InventoryTransactionType, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface DeductStockParams {
  productId: string;
  variantId?: string | null;
  quantity: number;
  orderId: string;
  channel: SalesChannel;
  userId?: string | null;
  tx?: Prisma.TransactionClient;
}

interface ReserveStockParams {
  productId: string;
  variantId?: string | null;
  quantity: number;
  sessionId?: string;
  customerId?: string;
  ttlMinutes?: number;
}

interface RestoreStockParams {
  productId: string;
  variantId?: string | null;
  quantity: number;
  returnId: string;
  sellable: boolean; // false = mark as damaged
  userId?: string | null;
}

interface AdjustStockParams {
  productId: string;
  variantId?: string | null;
  quantityChange: number; // can be negative
  reason: string;
  userId?: string | null;
}

// ─────────────────────────────────────────────────────────
// INVENTORY SERVICE — SINGLE SOURCE OF TRUTH
// All channels must use ONLY these functions to mutate stock
// ─────────────────────────────────────────────────────────

export const inventoryService = {
  /**
   * Get or create inventory record for product/variant
   */
  async getOrCreateInventory(
    productId: string,
    variantId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const existing = await db.inventory.findFirst({
      where: { productId, variantId: variantId ?? null, locationId: null },
    });
    if (existing) return existing;

    return db.inventory.create({
      data: { productId, variantId: variantId ?? null, quantity: 0 },
    });
  },

  /**
   * Deduct stock atomically when a sale occurs.
   * Must be called inside a Prisma $transaction.
   * Uses SELECT FOR UPDATE to prevent concurrent overselling.
   */
  async deductStock({
    productId,
    variantId,
    quantity,
    orderId,
    channel,
    userId,
    tx,
  }: DeductStockParams): Promise<{ previousStock: number; newStock: number }> {
    const db = tx ?? prisma;

    // Row-level lock via raw query
    const rows = await db.$queryRaw<Array<{ id: string; quantity: number; reserved: number }>>`
      SELECT id, quantity, reserved
      FROM inventories
      WHERE "productId" = ${productId}
        AND ("variantId" = ${variantId ?? null} OR ("variantId" IS NULL AND ${variantId ?? null} IS NULL))
        AND "locationId" IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    if (rows.length === 0) throw new Error("Inventory record not found");
    const inv = rows[0];
    const available = inv.quantity - inv.reserved;

    if (available < quantity) {
      throw new Error(
        `Insufficient stock. Only ${available} unit${available !== 1 ? "s" : ""} available.`
      );
    }

    const newQty = inv.quantity - quantity;

    await db.inventory.update({
      where: { id: inv.id },
      data: { quantity: newQty },
    });

    await db.inventoryTransaction.create({
      data: {
        inventoryId: inv.id,
        type: InventoryTransactionType.SALE,
        previousStock: inv.quantity,
        quantityChange: -quantity,
        newStock: newQty,
        channel,
        orderId,
        userId,
      },
    });

    // Fire event (only outside transaction to avoid blocking)
    if (!tx) {
      eventBus.publish("STOCK_UPDATED", { productId, variantId, newStock: newQty });
      eventBus.publish("STOCK_DEDUCTED", { productId, variantId, quantity, orderId, channel });
    }

    return { previousStock: inv.quantity, newStock: newQty };
  },

  /**
   * Reserve stock for an online checkout session (prevents overselling).
   * Deducts from available (not actual) quantity.
   */
  async reserveStock({
    productId,
    variantId,
    quantity,
    sessionId,
    customerId,
    ttlMinutes = 15,
  }: ReserveStockParams) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; reserved: number }>>`
        SELECT id, quantity, reserved
        FROM inventories
        WHERE "productId" = ${productId}
          AND ("variantId" = ${variantId ?? null} OR ("variantId" IS NULL AND ${variantId ?? null} IS NULL))
          AND "locationId" IS NULL
        LIMIT 1
        FOR UPDATE
      `;

      if (rows.length === 0) throw new Error("Inventory not found");
      const inv = rows[0];
      const available = inv.quantity - inv.reserved;

      if (available < quantity) {
        throw new Error(`Insufficient stock. Only ${available} units available.`);
      }

      // Increase reserved counter
      await tx.inventory.update({
        where: { id: inv.id },
        data: { reserved: { increment: quantity } },
      });

      // Create reservation record
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      const reservation = await tx.stockReservation.create({
        data: {
          inventoryId: inv.id,
          quantity,
          sessionId,
          customerId,
          expiresAt,
          status: "ACTIVE",
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTransactionType.RESERVE,
          previousStock: inv.quantity,
          quantityChange: 0, // reservation doesn't change actual quantity
          newStock: inv.quantity,
          notes: `Reserved ${quantity} for session ${sessionId ?? "unknown"}`,
        },
      });

      eventBus.publish("STOCK_RESERVED", { productId, variantId, quantity, reservationId: reservation.id });

      return reservation;
    });
  },

  /**
   * Release a reservation (abandoned checkout, expired cart).
   */
  async releaseStock(reservationId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
        include: { inventory: true },
      });

      if (!reservation || reservation.status !== "ACTIVE") return;

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED" },
      });

      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: { reserved: { decrement: reservation.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: reservation.inventoryId,
          type: InventoryTransactionType.RELEASE,
          previousStock: reservation.inventory.quantity,
          quantityChange: 0,
          newStock: reservation.inventory.quantity,
          notes: `Released reservation ${reservationId}`,
        },
      });

      const inv = await tx.inventory.findUnique({ where: { id: reservation.inventoryId } });
      eventBus.publish("STOCK_RELEASED", {
        productId: reservation.inventory.productId,
        quantity: reservation.quantity,
        reservationId,
        newAvailable: (inv?.quantity ?? 0) - ((inv?.reserved ?? 0)),
      });
      eventBus.publish("STOCK_UPDATED", {
        productId: reservation.inventory.productId,
        newStock: inv?.quantity ?? 0,
      });
    });
  },

  /**
   * Restore stock after a return.
   * sellable=true: goes back to available stock
   * sellable=false: added to damaged count only
   */
  async restoreStock({ productId, variantId, quantity, returnId, sellable, userId }: RestoreStockParams) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; damaged: number }>>`
        SELECT id, quantity, damaged
        FROM inventories
        WHERE "productId" = ${productId}
          AND ("variantId" = ${variantId ?? null} OR ("variantId" IS NULL AND ${variantId ?? null} IS NULL))
          AND "locationId" IS NULL
        LIMIT 1
        FOR UPDATE
      `;

      if (rows.length === 0) throw new Error("Inventory not found");
      const inv = rows[0];

      const updateData = sellable
        ? { quantity: { increment: quantity } }
        : { damaged: { increment: quantity } };

      await tx.inventory.update({ where: { id: inv.id }, data: updateData });

      const newQty = sellable ? inv.quantity + quantity : inv.quantity;

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: sellable ? InventoryTransactionType.RETURN : InventoryTransactionType.DAMAGE,
          previousStock: inv.quantity,
          quantityChange: sellable ? quantity : 0,
          newStock: newQty,
          returnId,
          userId,
          notes: sellable ? `Return accepted — added to stock` : `Returned damaged — not restocked`,
        },
      });

      eventBus.publish("STOCK_RETURNED", { productId, variantId, quantity, returnId, sellable });
      if (sellable) {
        eventBus.publish("STOCK_UPDATED", { productId, variantId, newStock: newQty });
      }

      return { previousStock: inv.quantity, newStock: newQty };
    });
  },

  /**
   * Manual admin stock adjustment.
   */
  async adjustStock({ productId, variantId, quantityChange, reason, userId }: AdjustStockParams) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
        SELECT id, quantity
        FROM inventories
        WHERE "productId" = ${productId}
          AND ("variantId" = ${variantId ?? null} OR ("variantId" IS NULL AND ${variantId ?? null} IS NULL))
          AND "locationId" IS NULL
        LIMIT 1
        FOR UPDATE
      `;

      if (rows.length === 0) throw new Error("Inventory not found");
      const inv = rows[0];
      const newQty = inv.quantity + quantityChange;

      if (newQty < 0) throw new Error("Adjustment would result in negative stock");

      await tx.inventory.update({ where: { id: inv.id }, data: { quantity: newQty } });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTransactionType.ADJUSTMENT,
          previousStock: inv.quantity,
          quantityChange,
          newStock: newQty,
          userId,
          notes: reason,
        },
      });

      eventBus.publish("STOCK_ADJUSTED", { productId, variantId, quantityChange, newStock: newQty, reason });
      eventBus.publish("STOCK_UPDATED", { productId, variantId, newStock: newQty });

      return { previousStock: inv.quantity, newStock: newQty };
    });
  },

  /**
   * Get current available stock (quantity - reserved) for a product.
   */
  async getAvailableStock(productId: string, variantId?: string | null): Promise<number> {
    const inv = await prisma.inventory.findFirst({
      where: {
        productId,
        variantId: variantId ?? null,
        locationId: null,
      },
    });
    if (!inv) return 0;
    return Math.max(0, inv.quantity - inv.reserved);
  },

  /**
   * Expire old reservations and release their stock.
   */
  async expireReservations() {
    const expired = await prisma.stockReservation.findMany({
      where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    });

    for (const res of expired) {
      await this.releaseStock(res.id);
      await prisma.stockReservation.update({
        where: { id: res.id },
        data: { status: "EXPIRED" },
      });
    }

    return expired.length;
  },
};

export default inventoryService;
