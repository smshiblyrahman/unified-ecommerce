"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";
import {
  ShoppingBagIcon,
  LayoutDashboardIcon,
  BarChartIcon,
  FileTextIcon,
  TerminalIcon,
  ClipboardListIcon,
  BoxesIcon,
  HistoryIcon,
  UsersIcon,
  ReceiptIcon,
  ClockIcon,
  SettingsIcon,
  ExternalLinkIcon,
} from "@/components/ui/Icons";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  { section: "Overview", href: "/admin", icon: <LayoutDashboardIcon size={18} />, label: "Dashboard" },
  { href: "/admin/analytics", icon: <BarChartIcon size={18} />, label: "Analytics" },
  { href: "/admin/reports", icon: <FileTextIcon size={18} />, label: "Reports" },
  { section: "Commerce", href: "/admin/pos", icon: <TerminalIcon size={18} />, label: "POS Terminal" },
  { href: "/admin/orders", icon: <ClipboardListIcon size={18} />, label: "Orders" },
  { href: "/admin/products", icon: <BoxesIcon size={18} />, label: "Products" },
  { href: "/admin/inventory", icon: <BoxesIcon size={18} />, label: "Inventory" },
  { href: "/admin/inventory/history", icon: <HistoryIcon size={18} />, label: "Stock History" },
  { section: "Customers", href: "/admin/customers", icon: <UsersIcon size={18} />, label: "Customers" },
  { href: "/admin/invoices", icon: <ReceiptIcon size={18} />, label: "Invoices" },
  { section: "POS", href: "/admin/pos/shifts", icon: <ClockIcon size={18} />, label: "Shifts" },
  { section: "System", href: "/admin/settings", icon: <SettingsIcon size={18} />, label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected } = useSSE("admin");
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    fetch("/api/orders?status=PENDING&limit=1")
      .then((r) => r.json())
      .then((d) => setPendingOrders(d.total || 0))
      .catch(() => {});
  }, []);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo__icon" style={{ background: "linear-gradient(135deg, var(--brand-500), var(--accent-violet))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBagIcon size={18} />
          </div>
          <div>
            <div className="sidebar-logo__name">Unified Ecommerce</div>
            <div className="sidebar-logo__sub">Commerce Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                {item.section && (
                  <div className="sidebar-section-label">{item.section}</div>
                )}
                <Link
                  href={item.href}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-link__icon">{item.icon}</span>
                  {item.label}
                  {item.label === "Orders" && pendingOrders > 0 && (
                    <span className="sidebar-link__badge">{pendingOrders}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div
          style={{
            padding: "var(--space-4) var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div className="sse-indicator">
            <div className={`sse-dot ${connected ? "sse-dot--live" : ""}`} />
            {connected ? "Live Realtime Sync" : "Connecting..."}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            {navItems.find((n) =>
              n.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(n.href)
            )?.label ?? "Admin"}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/pos" className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TerminalIcon size={14} />
              <span>Open POS</span>
            </Link>
            <Link href="/" className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ExternalLinkIcon size={14} />
              <span>Storefront</span>
            </Link>
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
