"use client";

import { useEffect, useState } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  channel: string;
  totalAmount: number;
  issuedAt: string;
  customer?: { name: string };
  order: {
    orderNumber: string;
    status: string;
    items: Array<{ productName: string; quantity: number; unitPrice: number }>;
    payments: Array<{ method: string; amount: number }>;
  };
}

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 2 });
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-BD", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

const CHANNEL_BADGE: Record<string, string> = { ONLINE: "badge-online", POS: "badge-pos", ADMIN: "badge-admin" };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (channel) params.set("channel", channel);
    const res = await fetch(`/api/invoices?${params}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [channel, page]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">▣ Invoices</h1>
          <p className="page-subtitle">All invoices across all sales channels ({total} total)</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
        <div className="flex items-center gap-3">
          <select className="form-input form-select" style={{ maxWidth: 180 }} value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
            <option value="">All Channels</option>
            <option value="ONLINE">Online</option>
            <option value="POS">POS</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order #</th>
                <th>Channel</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No invoices yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brand-400)" }}>{inv.invoiceNumber}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{inv.order.orderNumber}</td>
                    <td><span className={`badge ${CHANNEL_BADGE[inv.channel] || "badge-default"}`}>{inv.channel}</span></td>
                    <td style={{ fontSize: "0.875rem" }}>{inv.customer?.name || "Walk-in Customer"}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(inv.totalAmount)}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{fmtDate(inv.issuedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(inv)}>View</button>
                        <a
                          href={`/api/invoices/${inv.invoiceNumber}/pdf`}
                          download
                          className="btn btn-secondary btn-sm"
                        >
                          ↓ PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Page {page} of {Math.ceil(total / 20)}</div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3 style={{ fontFamily: "var(--font-mono)", color: "var(--brand-400)" }}>{selected.invoiceNumber}</h3>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Order: {selected.order.orderNumber}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{selected.customer?.name || "Walk-in Customer"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Issued</div>
                  <div>{fmtDate(selected.issuedAt)}</div>
                </div>
              </div>
              {/* Items */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>Line Items</div>
                {selected.order.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "0.875rem" }}>{item.productName}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>× {item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(Number(item.unitPrice) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--brand-400)" }}>{fmt(selected.totalAmount)}</span>
                </div>
              </div>
              {/* Payments */}
              {selected.order.payments?.length > 0 && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Payments</div>
                  {selected.order.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ padding: "var(--space-2) 0" }}>
                      <span className="badge badge-default">{p.method}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨 Print</button>
              <a href={`/api/invoices/${selected.invoiceNumber}/pdf`} download className="btn btn-secondary">↓ PDF</a>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
