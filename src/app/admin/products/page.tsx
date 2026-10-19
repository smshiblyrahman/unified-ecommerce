"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  basePrice: number;
  costPrice?: number;
  taxRate: number;
  status: string;
  hasVariants: boolean;
  category?: { name: string };
  inventory: Array<{ quantity: number; reserved: number }>;
  createdAt: string;
}

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "badge-success", INACTIVE: "badge-warning",
  DRAFT: "badge-default", ARCHIVED: "badge-danger",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", barcode: "", basePrice: "", costPrice: "", taxRate: "5",
    description: "", initialStock: "0", status: "ACTIVE", imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, status, page]);

  const createProduct = async () => {
    if (!form.name || !form.basePrice) { setCreateError("Name and price are required"); return; }
    setSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: parseFloat(form.basePrice),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
          taxRate: parseFloat(form.taxRate) || 0,
          initialStock: parseInt(form.initialStock) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error || "Failed to create");
        return;
      }
      setShowCreate(false);
      setForm({ name: "", sku: "", barcode: "", basePrice: "", costPrice: "", taxRate: "5", description: "", initialStock: "0", status: "ACTIVE", imageUrl: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⊟ Products</h1>
          <p className="page-subtitle">Master product catalog ({total} products)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Product</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
        <div className="flex items-center gap-3">
          <input className="form-input" style={{ maxWidth: 300 }} placeholder="Search name, SKU, barcode..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-input form-select" style={{ maxWidth: 160 }} value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Available</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No products found</td></tr>
              ) : (
                products.map((product) => {
                  const inv = product.inventory[0];
                  const available = inv ? inv.quantity - inv.reserved : 0;
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>
                          )}
                          <div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.name}</div>
                            {product.barcode && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{product.barcode}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{product.sku || "—"}</td>
                      <td style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{product.category?.name || "—"}</td>
                      <td style={{ fontWeight: 700, color: "var(--brand-400)" }}>{fmt(Number(product.basePrice))}</td>
                      <td style={{ color: "var(--text-muted)" }}>{product.costPrice ? fmt(Number(product.costPrice)) : "—"}</td>
                      <td style={{ fontWeight: 600 }}>{inv?.quantity ?? 0}</td>
                      <td style={{ fontWeight: 700, color: available <= 5 ? (available === 0 ? "var(--danger)" : "var(--warning)") : "var(--success)" }}>
                        {available}
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[product.status] || "badge-default"}`}>{product.status}</span></td>
                    </tr>
                  );
                })
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

      {/* Create Product Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal__header">
              <h3>Add New Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="grid-2" style={{ gap: "var(--space-4)" }}>
                {[
                  { label: "Product Name *", key: "name", placeholder: "e.g. iPhone 15 Pro" },
                  { label: "SKU", key: "sku", placeholder: "e.g. IP15P-001" },
                  { label: "Barcode", key: "barcode", placeholder: "e.g. 8801234567890" },
                  { label: "Image URL", key: "imageUrl", placeholder: "https://..." },
                  { label: "Sale Price (৳) *", key: "basePrice", placeholder: "e.g. 145000" },
                  { label: "Cost Price (৳)", key: "costPrice", placeholder: "e.g. 120000" },
                  { label: "Tax Rate (%)", key: "taxRate", placeholder: "e.g. 5" },
                  { label: "Initial Stock", key: "initialStock", placeholder: "e.g. 100" },
                ].map((f) => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" placeholder={f.placeholder}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: "var(--space-4)" }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Product description..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              {createError && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginTop: "var(--space-3)", fontSize: "0.875rem" }}>
                  ⚠ {createError}
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createProduct} disabled={saving}>
                {saving ? "Creating..." : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
