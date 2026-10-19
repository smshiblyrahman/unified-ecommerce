import EventEmitter from "events";

// ─────────────────────────────────────────────────────────
// DOMAIN EVENTS
// ─────────────────────────────────────────────────────────

export type DomainEventType =
  | "ORDER_CREATED"
  | "ORDER_PAID"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED"
  | "ORDER_RETURNED"
  | "POS_SALE_COMPLETED"
  | "STOCK_RESERVED"
  | "STOCK_RELEASED"
  | "STOCK_DEDUCTED"
  | "STOCK_RETURNED"
  | "STOCK_ADJUSTED"
  | "INVOICE_CREATED"
  | "PAYMENT_RECEIVED"
  | "SHIFT_OPENED"
  | "SHIFT_CLOSED"
  | "STOCK_UPDATED";

export interface DomainEvent {
  type: DomainEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

class CommerceEventBus extends EventEmitter {
  publish(event: DomainEventType, payload: Record<string, unknown>): boolean {
    const domainEvent: DomainEvent = { type: event, payload, timestamp: new Date() };
    return super.emit(event, domainEvent);
  }

  subscribe(event: DomainEventType, listener: (event: DomainEvent) => void): this {
    return super.on(event, listener);
  }

  unsubscribe(event: DomainEventType, listener: (event: DomainEvent) => void): this {
    return super.off(event, listener);
  }
}

const globalEventBus = globalThis as unknown as { eventBus: CommerceEventBus | undefined };
export const eventBus = globalEventBus.eventBus ?? new CommerceEventBus();
if (process.env.NODE_ENV !== "production") globalEventBus.eventBus = eventBus;

export default eventBus;
