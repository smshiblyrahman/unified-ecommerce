import { eventBus, DomainEvent } from "./event-bus";

// ─────────────────────────────────────────────────────────
// SSE CLIENT REGISTRY
// ─────────────────────────────────────────────────────────

interface SSEClient {
  id: string;
  channel: string;
  controller: ReadableStreamDefaultController;
  createdAt: Date;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();

  // Register a new SSE client
  addClient(id: string, channel: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(id, { id, channel, controller, createdAt: new Date() });
    console.log(`[SSE] Client ${id} connected to channel: ${channel}. Total: ${this.clients.size}`);
  }

  // Remove client on disconnect
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[SSE] Client ${id} disconnected. Total: ${this.clients.size}`);
  }

  // Broadcast to all clients on a channel (or all if channel = '*')
  broadcast(eventType: string, data: Record<string, unknown>, targetChannel?: string): void {
    const message = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`;

    for (const client of this.clients.values()) {
      if (!targetChannel || targetChannel === "*" || client.channel === targetChannel) {
        try {
          client.controller.enqueue(message);
        } catch {
          // Client disconnected without cleanup
          this.clients.delete(client.id);
        }
      }
    }
  }

  // Send to specific client
  sendToClient(clientId: string, eventType: string, data: Record<string, unknown>): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    try {
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(message);
    } catch {
      this.clients.delete(clientId);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton
const globalSSE = globalThis as unknown as { sseService: SSEService | undefined };
export const sseService = globalSSE.sseService ?? new SSEService();
if (process.env.NODE_ENV !== "production") globalSSE.sseService = sseService;

// ─────────────────────────────────────────────────────────
// WIRE EVENT BUS → SSE BROADCASTER
// ─────────────────────────────────────────────────────────

const eventsToForward: Array<{ event: string; channel: string }> = [
  { event: "STOCK_UPDATED", channel: "*" },
  { event: "ORDER_CREATED", channel: "admin" },
  { event: "POS_SALE_COMPLETED", channel: "admin" },
  { event: "ORDER_PAID", channel: "admin" },
  { event: "ORDER_CANCELLED", channel: "admin" },
  { event: "ORDER_REFUNDED", channel: "admin" },
  { event: "STOCK_DEDUCTED", channel: "admin" },
  { event: "STOCK_ADJUSTED", channel: "admin" },
  { event: "SHIFT_OPENED", channel: "pos" },
  { event: "SHIFT_CLOSED", channel: "pos" },
];

for (const { event, channel } of eventsToForward) {
  // @ts-expect-error - dynamic event subscription
  eventBus.subscribe(event, (domainEvent: DomainEvent) => {
    sseService.broadcast(domainEvent.type, domainEvent.payload, channel);
  });
}

export default sseService;
