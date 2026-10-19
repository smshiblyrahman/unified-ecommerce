"use client";

import { useEffect, useRef, useCallback, useReducer } from "react";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface SSEMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface SSEState {
  connected: boolean;
  lastEvent: SSEMessage | null;
  stockUpdates: Record<string, number>; // productId → latest stock
  pendingOrders: number;
}

type SSEAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "MESSAGE"; message: SSEMessage }
  | { type: "STOCK_UPDATED"; productId: string; newStock: number }
  | { type: "ORDER_CREATED" };

function sseReducer(state: SSEState, action: SSEAction): SSEState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true };
    case "DISCONNECTED":
      return { ...state, connected: false };
    case "MESSAGE":
      return { ...state, lastEvent: action.message };
    case "STOCK_UPDATED":
      return {
        ...state,
        stockUpdates: { ...state.stockUpdates, [action.productId]: action.newStock },
      };
    case "ORDER_CREATED":
      return { ...state, pendingOrders: state.pendingOrders + 1 };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────

export function useSSE(channel: "admin" | "pos" | "store" = "admin") {
  const [state, dispatch] = useReducer(sseReducer, {
    connected: false,
    lastEvent: null,
    stockUpdates: {},
    pendingOrders: 0,
  });

  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, ((msg: SSEMessage) => void)[]>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/sse?channel=${channel}`);
    esRef.current = es;

    es.addEventListener("CONNECTED", () => {
      dispatch({ type: "CONNECTED" });
    });

    es.addEventListener("STOCK_UPDATED", (e) => {
      const data = JSON.parse(e.data);
      dispatch({ type: "STOCK_UPDATED", productId: data.productId, newStock: data.newStock });
      const handlers = handlersRef.current.get("STOCK_UPDATED") ?? [];
      handlers.forEach((h) => h({ type: "STOCK_UPDATED", payload: data, timestamp: data.timestamp }));
    });

    es.addEventListener("ORDER_CREATED", (e) => {
      const data = JSON.parse(e.data);
      dispatch({ type: "ORDER_CREATED" });
      const handlers = handlersRef.current.get("ORDER_CREATED") ?? [];
      handlers.forEach((h) => h({ type: "ORDER_CREATED", payload: data, timestamp: data.timestamp }));
    });

    const genericEvents = [
      "POS_SALE_COMPLETED", "STOCK_DEDUCTED", "STOCK_ADJUSTED", "STOCK_RESERVED",
      "STOCK_RELEASED", "ORDER_PAID", "ORDER_CANCELLED", "ORDER_REFUNDED",
      "SHIFT_OPENED", "SHIFT_CLOSED", "INVOICE_CREATED", "PAYMENT_RECEIVED",
    ];

    for (const event of genericEvents) {
      es.addEventListener(event, (e) => {
        const data = JSON.parse(e.data);
        const msg: SSEMessage = { type: event, payload: data, timestamp: data.timestamp };
        dispatch({ type: "MESSAGE", message: msg });
        const handlers = handlersRef.current.get(event) ?? [];
        handlers.forEach((h) => h(msg));
      });
    }

    es.onerror = () => {
      dispatch({ type: "DISCONNECTED" });
      es.close();
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(() => connect(), 3000);
    };
  }, [channel]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  // Register event handlers
  const on = useCallback((event: string, handler: (msg: SSEMessage) => void) => {
    const handlers = handlersRef.current.get(event) ?? [];
    handlersRef.current.set(event, [...handlers, handler]);
    return () => {
      const h = handlersRef.current.get(event) ?? [];
      handlersRef.current.set(event, h.filter((fn) => fn !== handler));
    };
  }, []);

  return { ...state, on };
}
