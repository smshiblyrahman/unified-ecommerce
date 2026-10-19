"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });

const RANGES = ["today", "yesterday", "7d", "30d", "90d", "year", "all"];
const RANGE_LABELS: Record<string, string> = { today: "Today", yesterday: "Yesterday", "7d": "7 Days", "30d": "30 Days", "90d": "90 Days", year: "This Year", all: "All Time" };
const CHANNEL_COLORS: Record<string, string> = { ONLINE: "#06b6d4", POS: "#8b5cf6", ADMIN: "#f59e0b" };

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [chartData, setChartData] = useState<Array<Record<string, number | string>>>([]);
  const [channels, setChannels] = useState<Array<{ channel: string; revenue: number; orders: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ productId: string; productName: string; unitsSold: number; revenue: number }>>([]);
  const [profit, setProfit] = useState<{ grossRevenue: number; costOfGoodsSold: number; grossProfit: number; margin: string; discounts: number } | null>(null);
  const [categories, setCategories] = useState<Array<{ name: string; revenue: number; percentage: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const [ov, ch, chart, top, pr, cat] = await Promise.all([
        fetch(`/api/analytics?range=${range}`).then((r) => r.json()),
        fetch(`/api/analytics/channels?range=${range}`).then((r) => r.json()),
        fetch(`/api/analytics/chart?range=${range}`).then((r) => r.json()),
        fetch(`/api/analytics/products?range=${range}&limit=10`).then((r) => r.json()),
        fetch(`/api/analytics/profit?range=${range}`).then((r) => r.json()),
        fetch(`/api/analytics/categories?range=${range}`).then((r) => r.json()),
      ]);
      setOverview(ov);
      setChannels(ch);
      setChartData(chart);
      setTopProducts(top);
      setProfit(pr);
      setCategories(cat);
    };
    load();
  }, [range]);

  const CAT_COLORS = ["#4f62f7", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">◈ Analytics</h1>
          <p className="page-subtitle">Complete business intelligence across all channels</p>
        </div>
        {/* Range Selector */}
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

      {/* Revenue Cards */}
      {overview && (
        <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
          {[
            { label: "Gross Sales", value: fmt(overview.grossSales || 0), icon: "💰", color: "#4f62f7" },
            { label: "Net Revenue", value: fmt(overview.netRevenue || 0), icon: "✓", color: "#10b981" },
            { label: "Total Orders", value: (overview.totalOrders || 0).toString(), icon: "📦", color: "#06b6d4" },
            { label: "Avg. Order Value", value: fmt(overview.avgOrderValue || 0), icon: "⊞", color: "#8b5cf6" },
            { label: "Products Sold", value: (overview.productsSold || 0).toString(), icon: "📊", color: "#f59e0b" },
            { label: "Total Customers", value: (overview.totalCustomers || 0).toString(), icon: "👤", color: "#f97316" },
            { label: "Discounts Given", value: fmt(overview.discounts || 0), icon: "🏷️", color: "#f59e0b" },
            { label: "Refunds", value: fmt(overview.refunds || 0), icon: "↩", color: "#f43f5e" },
          ].map((card) => (
            <div key={card.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div className="stat-card__label">{card.label}</div>
                <div className="stat-card__icon" style={{ background: `${card.color}20` }}>{card.icon}</div>
              </div>
              <div className="stat-card__value" style={{ fontSize: "1.5rem" }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue & Channel Charts */}
      <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
        <div className="chart-container">
          <h3 className="chart-title">Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => "৳" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} labelStyle={{ color: "var(--text-primary)" }} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10 }} />
              <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#4f62f7" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="online" name="Online" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="pos" name="POS" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Sales by Channel</h3>
          {channels.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={channels} dataKey="revenue" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => `${entry.channel || ""} ${(((entry.percent as number) || 0) * 100).toFixed(0)}%`}>
                    {channels.map((_, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[channels[i]?.channel] || "#4f62f7"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {channels.map((ch) => (
                  <div key={ch.channel} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: CHANNEL_COLORS[ch.channel] || "#4f62f7" }} />
                      <span style={{ fontSize: "0.875rem" }}>{ch.channel}</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>{fmt(ch.revenue)}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ch.orders} orders</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>No data</div>
          )}
        </div>
      </div>

      {/* Profit & Categories */}
      <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
        {/* Profit Analytics */}
        {profit && (
          <div className="chart-container">
            <h3 className="chart-title">Profit Analytics</h3>
            <div style={{ padding: "4px 0 12px", fontSize: "0.8rem", color: "var(--warning)" }}>⚠ Estimated — operational expenses not included</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {[
                { label: "Gross Revenue", value: fmt(profit.grossRevenue), color: "var(--text-primary)" },
                { label: "Cost of Goods Sold", value: "−" + fmt(profit.costOfGoodsSold), color: "var(--danger)" },
                { label: "Discounts", value: "−" + fmt(profit.discounts), color: "var(--warning)" },
                { label: "Gross Profit", value: fmt(profit.grossProfit), color: "var(--success)", bold: true },
                { label: "Profit Margin", value: profit.margin + "%", color: "var(--success)", bold: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between" style={{ padding: "var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{row.label}</span>
                  <span style={{ fontWeight: row.bold ? 800 : 600, color: row.color, fontSize: row.bold ? "1.0625rem" : "0.9375rem" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="chart-container">
          <h3 className="chart-title">Category Breakdown</h3>
          {categories.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {categories.map((cat, i) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cat.percentage}%</span>
                      <span style={{ fontWeight: 700 }}>{fmt(cat.revenue)}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${cat.percentage}%`, background: CAT_COLORS[i % CAT_COLORS.length], borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>No category data</div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Top Products by Revenue</h3>
        </div>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Avg. Price</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.productId}>
                  <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>#{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{p.productName}</td>
                  <td>{p.unitsSold}</td>
                  <td style={{ fontWeight: 700, color: "var(--brand-400)" }}>{fmt(p.revenue)}</td>
                  <td style={{ color: "var(--text-muted)" }}>{fmt(p.unitsSold > 0 ? p.revenue / p.unitsSold : 0)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No sales data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
