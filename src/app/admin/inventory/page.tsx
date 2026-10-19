"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSSE } from "@/hooks/useSSE";

interface InventoryItem {
  id: string;
  quantity: number;
  reserved: number;
  damaged: number;
  lowStockThreshold: number;
  product: { id: string; name: string; sku?: string; imageUrl?: string; basePrice: number };
  variant?: { id: string; name: string; sku?: string };
}

interface DashboardData {
  totalProducts: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
}

const fmt = (n: number) => "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });

export default function InventoryPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const { on } = useSSE("admin");

  const load = useCallback(async () => {
    const [dashRes, invRes] = await Promise.all([
      fetch("/api/inventory"),
      fetch("/api/products?status=ACTIVE&limit=100"),
    ]);
    if (dashRes.ok) {
      const dashData = await dashRes.json();
      setDashboard(dashData);
    }
    if (invRes.ok) {
      const data = await invRes.json();
      const items: InventoryItem[] = (data.products || []).flatMap((p: {
        id: string; name: string; sku?: string; imageUrl?: string; basePrice: number;
        inventory: Array<{ id: string; quantity: number; reserved: number; damaged: number; lowStockThreshold: number }>;
        variants: Array<{ id: string; name: string; sku?: string; inventory: Array<{ id: string; quantity: number; reserved: number; damaged: number; lowStockThreshold: number }> }>;
      }) => {
        if (p.inventory.length === 0) return [];
        return p.inventory.map((inv: { id: string; quantity: number; reserved: number; damaged: number; lowStockThreshold: number }) => ({
          ...inv,
          product: { id: p.id, name: p.name, sku: p.sku, imageUrl: p.imageUrl, basePrice: Number(p.basePrice) },
        }));
      });
      setInventory(items);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return on("STOCK_UPDATED", () => load());
  }, [on, load]);

  const filtered = inventory.filter(
    (item) =>
      !search ||
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const doAdjust = async () => {
    if (!adjustModal || !adjustQty || !adjustReason) return;
    setAdjusting(true);
    await fetch("/api/inventory/adjust", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: adjustModal.product.id,
        variantId: adjustModal.variant?.id ?? null,
        quantityChange: parseInt(adjustQty),
        reason: adjustReason,
      }),
    });
    setAdjustModal(null);
    setAdjustQty("");
    setAdjustReason("");
    setAdjusting(false);
    load();
  };

  const statCards = dashboard ? [
    { label: "Total Products", value: dashboard.totalProducts, icon: "📦", color: "#4f62f7" },
    { label: "Total Quantity", value: dashboard.totalQuantity, icon: "⊠", color: "#06b6d4" },
    { label: "Available", value: dashboard.availableQuantity, icon: "✓", color: "#10b981" },
    { label: "Reserved", value: dashboard.reservedQuantity, icon: "⏳", color: "#f59e0b" },
    { label: "Damaged", value: dashboard.damagedQuantity, icon: "⚠", color: "#f43f5e" },
    { label: "Inventory Value", value: fmt(dashboard.inventoryValue), icon: "💰", color: "#8b5cf6" },
    { label: "Low Stock", value: dashboard.lowStockCount, icon: "📉", color: "#f97316" },
    { label: "Out of Stock", value: dashboard.outOfStockCount, icon: "🚫", color: "#f43f5e" },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⊠ Inventory</h1>
          <p className="page-subtitle">Central stock management — all channels</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/inventory/history" className="btn btn-secondary">↕ History</Link>
          <Link href="/admin/products" className="btn btn-primary">+ Add Product</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 90 }} />
          ))
        ) : (
          statCards.map((card) => (
            <div key={card.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div className="stat-card__label">{card.label}</div>
                <div className="stat-card__icon" style={{ background: `${card.color}20` }}>{card.icon}</div>
              </div>
              <div className="stat-card__value" style={{ fontSize: "1.5rem" }}>{card.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Inventory Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>All Inventory</h3>
          <input
            className="form-input"
            style={{ maxWidth: 260, fontSize: "0.875rem" }}
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrapper" style={{ borderRadius: 0, border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Damaged</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const available = item.quantity - item.reserved;
                const status =
                  item.quantity === 0
                    ? { label: "Out of Stock", cls: "badge-danger" }
                    : available <= item.lowStockThreshold
                    ? { label: "Low Stock", cls: "badge-warning" }
                    : { label: "In Stock", cls: "badge-success" };

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>
                        )}
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.product.name}</div>
                          {item.variant && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.variant.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{item.product.sku || "—"}</td>
                    <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ color: item.reserved > 0 ? "var(--warning)" : "var(--text-muted)" }}>{item.reserved}</td>
                    <td style={{ fontWeight: 700, color: available <= 5 ? (available === 0 ? "var(--danger)" : "var(--warning)") : "var(--success)" }}>{available}</td>
                    <td style={{ color: item.damaged > 0 ? "var(--danger)" : "var(--text-muted)" }}>{item.damaged}</td>
                    <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setAdjustModal(item); setAdjustQty(""); setAdjustReason(""); }}>
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No inventory records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3>Adjust Stock — {adjustModal.product.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAdjustModal(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Current Stock</span>
                  <strong style={{ fontSize: "1.25rem" }}>{adjustModal.quantity}</strong>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label">Quantity Change (+ to add, − to remove)</label>
                <input className="form-input" type="number" placeholder="e.g. 10 or -5" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
                {adjustQty && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>New stock: {adjustModal.quantity + (parseInt(adjustQty) || 0)}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <input className="form-input" placeholder="e.g. Stock count correction, damaged goods..." value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doAdjust} disabled={adjusting || !adjustQty || !adjustReason}>
                {adjusting ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
