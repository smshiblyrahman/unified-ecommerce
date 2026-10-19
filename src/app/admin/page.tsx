"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { useSSE } from "@/hooks/useSSE";

// ─── Types ───────────────────────────────────────────────

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalOrders: number;
  todayOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  newCustomers: number;
  productsSold: number;
  netRevenue: number;
  discounts: number;
  refunds: number;
  lowStock: number;
  outOfStock: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer?: { name: string };
}

interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
}

interface ChannelData {
  channel: string;
  revenue: number;
  orders: number;
}

// ─── Format helpers ───────────────────────────────────────

const fmt = (n: number) =>
  "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ─── Custom tooltip ───────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "12px 16px", minWidth: 160 }}>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{p.name}</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginLeft: "auto" }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [chartData, setChartData] = useState<Array<Record<string, number | string>>>([]);
  const [loading, setLoading] = useState(true);

  const { connected, on } = useSSE("admin");

  const loadData = useCallback(async () => {
    try {
      const [statsRes, ordersRes, topRes, channelRes, chartRes] = await Promise.all([
        fetch("/api/analytics?range=30d"),
        fetch("/api/orders?limit=8"),
        fetch("/api/analytics/products?limit=5"),
        fetch("/api/analytics/channels"),
        fetch("/api/analytics/chart?range=30d"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setRecentOrders(d.orders || []);
      }
      if (topRes.ok) setTopProducts(await topRes.json());
      if (channelRes.ok) setChannelData(await channelRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on real-time events
  useEffect(() => {
    const unsubOrder = on("ORDER_CREATED", () => loadData());
    const unsubPOS = on("POS_SALE_COMPLETED", () => loadData());
    return () => { unsubOrder(); unsubPOS(); };
  }, [on, loadData]);

  const channelBadge = (ch: string) => {
    const map: Record<string, string> = { ONLINE: "badge-online", POS: "badge-pos", ADMIN: "badge-admin" };
    return `badge ${map[ch] || "badge-default"}`;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      CONFIRMED: "badge-success", PENDING: "badge-warning",
      CANCELLED: "badge-danger", REFUNDED: "badge-danger",
      DELIVERED: "badge-success", PROCESSING: "badge-info",
    };
    return `badge ${map[s] || "badge-default"}`;
  };

  const statCards = stats
    ? [
        { label: "Total Revenue", value: fmt(stats.totalRevenue), icon: "💰", color: "#4f62f7" },
        { label: "Today's Revenue", value: fmt(stats.todayRevenue), icon: "📈", color: "#10b981" },
        { label: "Monthly Revenue", value: fmt(stats.monthRevenue), icon: "📅", color: "#06b6d4" },
        { label: "Net Revenue", value: fmt(stats.netRevenue), icon: "✓", color: "#8b5cf6" },
        { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: "📦", color: "#f59e0b" },
        { label: "Today's Orders", value: stats.todayOrders.toString(), icon: "🛍️", color: "#f97316" },
        { label: "Avg. Order Value", value: fmt(stats.avgOrderValue), icon: "⊞", color: "#4f62f7" },
        { label: "Total Customers", value: stats.totalCustomers.toLocaleString(), icon: "👤", color: "#10b981" },
        { label: "Products Sold", value: stats.productsSold.toLocaleString(), icon: "📊", color: "#06b6d4" },
        { label: "Discounts Given", value: fmt(stats.discounts), icon: "🏷️", color: "#f59e0b" },
        { label: "Refunds", value: fmt(stats.refunds), icon: "↩", color: "#f43f5e" },
        { label: "Low Stock", value: stats.lowStock.toString(), icon: "⚠️", color: "#f59e0b" },
      ]
    : [];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading your business overview...</p>
          </div>
        </div>
        <div className="grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString("en-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: "var(--radius-full)",
              background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
              fontSize: "0.8rem",
            }}
          >
            <div
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: connected ? "var(--success)" : "var(--text-muted)",
                boxShadow: connected ? "0 0 6px var(--success)" : "none",
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>{connected ? "Live" : "Connecting"}</span>
          </div>
          <Link href="/admin/pos" className="btn btn-primary btn-sm">⊡ Open POS</Link>
          <Link href="/admin/analytics" className="btn btn-secondary btn-sm">◈ Analytics</Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className="stat-card__label">{card.label}</div>
              <div
                className="stat-card__icon"
                style={{ background: `${card.color}20`, fontSize: "1.25rem" }}
              >
                {card.icon}
              </div>
            </div>
            <div className="stat-card__value">{card.value}</div>
          </div>
        ))}

        {/* Special out-of-stock card */}
        {stats && (
          <div className="stat-card" style={{ borderColor: "rgba(244,63,94,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="stat-card__label">Out of Stock</div>
              <div className="stat-card__icon" style={{ background: "var(--danger-bg)", fontSize: "1.25rem" }}>🚫</div>
            </div>
            <div className="stat-card__value" style={{ color: stats.outOfStock > 0 ? "var(--danger)" : "var(--text-primary)" }}>
              {stats.outOfStock}
            </div>
            <Link href="/admin/inventory" className="text-sm" style={{ color: "var(--text-muted)" }}>View inventory →</Link>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
        {/* Revenue Chart */}
        <div className="chart-container">
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
            <h3 className="chart-title" style={{ margin: 0 }}>Revenue — Last 30 Days</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => "৳" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "0.8rem", color: "var(--text-muted)" }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#4f62f7" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 5, fill: "#4f62f7" }} />
                <Line type="monotone" dataKey="online" name="Online" stroke="#06b6d4" strokeWidth={1.5}
                  dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="pos" name="POS" stroke="#8b5cf6" strokeWidth={1.5}
                  dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              No sales data yet
            </div>
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="chart-container">
          <h3 className="chart-title">Sales by Channel</h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={channelData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="channel" tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#5a5d7a", fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => "৳" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#4f62f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              No channel data yet
            </div>
          )}
          {/* Channel summary */}
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {channelData.map((ch) => (
              <div key={ch.channel} className="flex items-center justify-between">
                <span className={channelBadge(ch.channel)}>{ch.channel}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(ch.revenue)}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ch.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Recent Orders */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Recent Orders</h3>
            <Link href="/admin/orders" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div>
            {recentOrders.length === 0 ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>No orders yet</div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "var(--space-3) var(--space-5)",
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background var(--transition-fast)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{order.orderNumber}</div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      {order.customer?.name ?? "Walk-in"} · {fmtDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={channelBadge(order.channel)}>{order.channel}</span>
                    <span className={statusBadge(order.status)}>{order.status}</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{fmt(order.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Top Products</h3>
            <Link href="/admin/analytics" className="btn btn-ghost btn-sm">Details →</Link>
          </div>
          <div>
            {topProducts.length === 0 ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>No sales data yet</div>
            ) : (
              topProducts.map((p, i) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-3"
                  style={{ padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "var(--radius-sm)",
                      background: "var(--bg-elevated)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-400)",
                      flexShrink: 0,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.productName}
                    </div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      {p.unitsSold} units sold
                    </div>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-400)" }}>
                    {fmt(p.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
