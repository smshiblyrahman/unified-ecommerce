"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSSE } from "@/hooks/useSSE";

interface Order {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  discountAmount: number;
  createdAt: string;
  customer?: { name: string; email?: string; phone?: string };
  user?: { name: string };
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  payments: Array<{ method: string; amount: number }>;
  invoice?: { invoiceNumber: string };
}

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 2 });
const fmtDate = (s: string) => new Date(s).toLocaleString("en-BD", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

const CHANNEL_BADGE: Record<string, string> = { ONLINE: "badge-online", POS: "badge-pos", ADMIN: "badge-admin" };
const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "badge-success", PENDING: "badge-warning", CANCELLED: "badge-danger",
  REFUNDED: "badge-danger", DELIVERED: "badge-success", PROCESSING: "badge-info",
  PARTIALLY_REFUNDED: "badge-warning",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: "", status: "", page: 1 });
  const [selected, setSelected] = useState<Order | null>(null);

  const { on } = useSSE("admin");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.status) params.set("status", filters.status);
    params.set("page", filters.page.toString());
    params.set("limit", "20");
    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { return on("ORDER_CREATED", () => load()); }, [on, load]);
  useEffect(() => { return on("POS_SALE_COMPLETED", () => load()); }, [on, load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">◳ Orders</h1>
          <p className="page-subtitle">Unified orders — all channels ({total} total)</p>
        </div>
        <Link href="/admin/reports" className="btn btn-secondary btn-sm">Export Report</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <select className="form-input form-select" style={{ maxWidth: 160 }} value={filters.channel} onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value, page: 1 }))}>
            <option value="">All Channels</option>
            <option value="ONLINE">Online</option>
            <option value="POS">POS</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select className="form-input form-select" style={{ maxWidth: 180 }} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="">All Statuses</option>
            {["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div style={{ marginLeft: "auto", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Showing {orders.length} of {total}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Channel</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No orders yet</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => setSelected(order)}>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--brand-400)" }}>{order.orderNumber}</td>
                    <td><span className={`badge ${CHANNEL_BADGE[order.channel] || "badge-default"}`}>{order.channel}</span></td>
                    <td>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{order.customer?.name || "Walk-in"}</div>
                      {order.customer?.phone && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.customer.phone}</div>}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{order.items?.length || 0} item(s)</td>
                    <td style={{ fontWeight: 700 }}>{fmt(order.totalAmount)}</td>
                    <td>
                      {order.payments?.map((p, i) => (
                        <span key={i} className="badge badge-default" style={{ marginRight: 2, fontSize: "0.7rem" }}>{p.method}</span>
                      ))}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[order.status] || "badge-default"}`}>{order.status}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--brand-400)", fontFamily: "var(--font-mono)" }}>
                      {order.invoice?.invoiceNumber || "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(order.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm">→</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Page {filters.page} of {Math.ceil(total / 20)}</div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={filters.page === 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= Math.ceil(total / 20)} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3 style={{ fontFamily: "var(--font-mono)", color: "var(--brand-400)" }}>{selected.orderNumber}</h3>
                <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                  <span className={`badge ${CHANNEL_BADGE[selected.channel] || "badge-default"}`}>{selected.channel}</span>
                  <span className={`badge ${STATUS_BADGE[selected.status] || "badge-default"}`}>{selected.status}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{selected.customer?.name || "Walk-in Customer"}</div>
                  {selected.customer?.phone && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{selected.customer.phone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Created</div>
                  <div style={{ fontWeight: 500 }}>{fmtDate(selected.createdAt)}</div>
                  {selected.invoice && (
                    <div style={{ fontSize: "0.8rem", color: "var(--brand-400)", fontFamily: "var(--font-mono)" }}>
                      Invoice: {selected.invoice.invoiceNumber}
                    </div>
                  )}
                </div>
              </div>
              {/* Items */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>Order Items</div>
                {selected.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "0.875rem" }}>{item.productName}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>× {item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(Number(item.unitPrice) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                {Number(selected.discountAmount) > 0 && (
                  <div className="flex items-center justify-between" style={{ marginBottom: 4, color: "var(--success)" }}>
                    <span style={{ fontSize: "0.875rem" }}>Discount</span>
                    <span style={{ fontWeight: 600 }}>−{fmt(selected.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--brand-400)" }}>{fmt(selected.totalAmount)}</span>
                </div>
              </div>
              {/* Payments */}
              {selected.payments?.length > 0 && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Payments</div>
                  {selected.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ padding: "var(--space-2) 0" }}>
                      <span className="badge badge-default">{p.method}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal__footer">
              {selected.invoice && (
                <a href={`/api/invoices/${selected.invoice.invoiceNumber}/pdf`} download className="btn btn-secondary">↓ Download Invoice</a>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
