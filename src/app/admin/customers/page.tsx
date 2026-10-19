"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, page]);

  const createCustomer = async () => {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowCreate(false);
    setForm({ name: "", email: "", phone: "", city: "" });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">◉ Customers</h1>
          <p className="page-subtitle">Unified customer profiles — online + POS purchase history ({total} total)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Customer</button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-4) var(--space-5)" }}>
        <input
          className="form-input"
          style={{ maxWidth: 360 }}
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Member Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No customers found</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{c.email || "—"}</td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{c.phone || "—"}</td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{c.city || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{c.totalOrders}</td>
                    <td style={{ fontWeight: 700, color: "var(--brand-400)" }}>{fmt(c.totalSpent)}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td>
                      <Link href={`/admin/orders?customerId=${c.id}`} className="btn btn-ghost btn-sm">Orders →</Link>
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

      {/* Create Customer Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3>New Customer</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {[
                { label: "Full Name *", key: "name", placeholder: "e.g. Rahim Ahmed" },
                { label: "Email", key: "email", placeholder: "email@example.com" },
                { label: "Phone", key: "phone", placeholder: "01711234567" },
                { label: "City", key: "city", placeholder: "Dhaka" },
              ].map((f) => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input
                    className="form-input"
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createCustomer} disabled={saving || !form.name}>
                {saving ? "Saving..." : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
