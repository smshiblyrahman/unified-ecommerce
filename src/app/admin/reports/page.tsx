"use client";

import { useState } from "react";

const REPORTS = [
  { id: "sales", label: "Sales Report", icon: "📊", desc: "Revenue and orders by period" },
  { id: "products", label: "Product Report", icon: "📦", desc: "Top products, units sold, revenue" },
  { id: "inventory", label: "Inventory Report", icon: "⊠", desc: "Stock levels, movements, value" },
  { id: "customers", label: "Customer Report", icon: "◉", desc: "Customer acquisition and lifetime value" },
  { id: "pos", label: "POS Report", icon: "⊡", desc: "POS sales by terminal, cashier, shift" },
  { id: "payments", label: "Payment Report", icon: "💳", desc: "Revenue by payment method" },
  { id: "refunds", label: "Refund Report", icon: "↩", desc: "Returns and refund analysis" },
  { id: "tax", label: "Tax Report", icon: "📋", desc: "Tax collected by period" },
  { id: "profit", label: "Profit Report", icon: "💰", desc: "Gross profit and margin analysis" },
];

const RANGES = ["today", "7d", "30d", "90d", "year", "all"];
const RANGE_LABELS: Record<string, string> = { today: "Today", "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days", year: "This Year", all: "All Time" };

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("sales");
  const [range, setRange] = useState("30d");
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async (format: "csv" | "json") => {
    setDownloading(true);
    const res = await fetch(`/api/reports/${activeReport}?range=${range}&format=${format}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeReport}-report-${range}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">≡ Reports</h1>
          <p className="page-subtitle">Generate and export detailed business reports</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "var(--space-4)" }}>
        {/* Report List */}
        <div className="card" style={{ padding: "var(--space-3)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)" }}>
            Report Types
          </div>
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                background: activeReport === r.id ? "rgba(79,98,247,0.12)" : "transparent",
                color: activeReport === r.id ? "var(--brand-400)" : "var(--text-secondary)",
                transition: "all var(--transition-fast)",
                marginBottom: "var(--space-1)",
              }}
            >
              <span style={{ fontSize: "1.125rem" }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Report Config */}
        <div>
          <div className="card" style={{ marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "var(--space-4)" }}>
              {REPORTS.find((r) => r.id === activeReport)?.icon} {REPORTS.find((r) => r.id === activeReport)?.label}
            </h2>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <div className="form-label" style={{ marginBottom: "var(--space-2)" }}>Date Range</div>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {RANGES.map((r) => (
                  <button
                    key={r}
                    className={`btn btn-sm ${range === r ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setRange(r)}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => downloadReport("csv")}
                disabled={downloading}
              >
                ↓ Export CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => downloadReport("json")}
                disabled={downloading}
              >
                ↓ Export JSON
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }}>
              {REPORTS.find((r) => r.id === activeReport)?.icon}
            </div>
            <h3 style={{ marginBottom: "var(--space-2)" }}>
              {REPORTS.find((r) => r.id === activeReport)?.label}
            </h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
              {REPORTS.find((r) => r.id === activeReport)?.desc}
              <br />
              Select a date range above and export the report.
            </p>
            <div className="flex gap-3" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary btn-lg" onClick={() => downloadReport("csv")} disabled={downloading}>
                ↓ Download CSV Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
