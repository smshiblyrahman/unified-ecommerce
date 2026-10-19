"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  previousStock: number;
  quantityChange: number;
  newStock: number;
  channel?: string;
  notes?: string;
  createdAt: string;
  inventory: { product: { id: string; name: string; sku?: string }; variant?: { name: string } };
  order?: { orderNumber: string };
  user?: { name: string };
}

const TYPE_COLORS: Record<string, string> = {
  SALE: "badge-danger", RETURN: "badge-success", ADJUSTMENT: "badge-info",
  RESERVE: "badge-warning", RELEASE: "badge-default", DAMAGE: "badge-danger",
  RESTOCK: "badge-success", INITIAL: "badge-purple",
};

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: "badge-online", POS: "badge-pos", ADMIN: "badge-admin",
};

export default function InventoryHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", channel: "", search: "", page: 1 });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.channel) params.set("channel", filters.channel);
    params.set("page", filters.page.toString());
    params.set("limit", "25");

    fetch(`/api/inventory/history?${params}`)
      .then((r) => r.json())
      .then((d) => { setTransactions(d.transactions || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [filters]);

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">↕ Inventory History</h1>
          <p className="page-subtitle">Every stock movement — traceable to the order, return, or adjustment</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <select className="form-input form-select" style={{ maxWidth: 180 }} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}>
            <option value="">All Types</option>
            {["SALE", "RETURN", "ADJUSTMENT", "RESERVE", "RELEASE", "DAMAGE", "RESTOCK", "INITIAL"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className="form-input form-select" style={{ maxWidth: 180 }} value={filters.channel} onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value, page: 1 }))}>
            <option value="">All Channels</option>
            <option value="ONLINE">Online</option>
            <option value="POS">POS</option>
            <option value="ADMIN">Admin</option>
          </select>
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {total} total records
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Type</th>
                <th>Before</th>
                <th>Change</th>
                <th>After</th>
                <th>Channel</th>
                <th>Reference</th>
                <th>User</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No movements recorded yet</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(tx.createdAt).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{tx.inventory?.product?.name}</div>
                      {tx.inventory?.variant && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tx.inventory.variant.name}</div>}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{tx.inventory?.product?.sku || "—"}</td>
                    <td><span className={`badge ${TYPE_COLORS[tx.type] || "badge-default"}`}>{tx.type}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{tx.previousStock}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: tx.quantityChange > 0 ? "var(--success)" : tx.quantityChange < 0 ? "var(--danger)" : "var(--text-muted)" }}>
                      {fmt(tx.quantityChange)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem" }}>{tx.newStock}</td>
                    <td>{tx.channel ? <span className={`badge ${CHANNEL_COLORS[tx.channel] || "badge-default"}`}>{tx.channel}</span> : "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--brand-400)" }}>{tx.order?.orderNumber || "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tx.user?.name || "System"}</td>
                    <td style={{ fontSize: "0.775rem", color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{tx.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 25 && (
          <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Page {filters.page} of {Math.ceil(total / 25)}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={filters.page === 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= Math.ceil(total / 25)} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
