# Unified Ecommerce — Project Overview

A modern, production-ready omnichannel commerce platform that bridges online retail with in-store Point of Sale (POS) operations under a single unified inventory and customer database.

---

## 1. Core Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React Server & Client Components)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Session & JWT based, Role-Based Access Control)
- **Styling**: Vanilla CSS Design System with CSS custom properties, responsive layout tokens, and dark theme support
- **Real-Time Updates**: Server-Sent Events (SSE) via `/api/sse` for live inventory sync across online storefront and POS terminals
- **Deployment & Containerization**: Docker & Docker Compose (`docker-compose.yml`, multi-stage `Dockerfile`)

---

## 2. Key Modules & Surfaces

### A. Customer Storefront (`/`)
- **Modern Catalog**: Category browsing, product search, filtering, and responsive product cards.
- **Cart & Checkout**: Real-time stock validation, automated tax calculation (VAT), dynamic cart drawer.
- **Brand Identity**: Clean dark-mode glassmorphic theme with customizable store attributes.

### B. Point of Sale (POS) Terminal (`/admin/pos`)
- **Cashier Register**: Barcode scanning / SKU search, fast cart addition, line-item quantity adjust.
- **Shift & Drawer Management** (`/admin/pos/shifts`): Opening float, cash-in/out, closing reconciliation, shift reports.
- **Offline/Hybrid Resilience**: Instant order creation mapped directly to the POS channel.

### C. Admin Operations & Management (`/admin`)
- **Dashboard**: Real-time metrics for Gross Revenue, Net Profit, Order Volume, Low Stock Alerts, and Sales Channel Split.
- **Products & Catalog** (`/admin/products`): Unified product catalog with variants, SKUs, barcodes, cost vs. retail pricing.
- **Unified Inventory** (`/admin/inventory`, `/admin/inventory/history`): Multi-channel stock management with audit trail for adjustments, restocks, sales, and returns.
- **Orders & Invoicing** (`/admin/orders`, `/admin/invoices`): Unified order tracking across both Web and In-Store POS with printable invoice generation.
- **Customer Profiles** (`/admin/customers`): Centralized customer profiles linking online purchases and physical store POS receipts.
- **Analytics & Reports** (`/admin/analytics`, `/admin/reports`): Revenue by channel, category performance, profit margins, and exportable reports (CSV/PDF).
- **Settings** (`/admin/settings`): Store details, tax rates, receipt headers/footers, and default POS terminal configurations.

---

## 3. Database Schema Highlights

- **`User`**: Role-based permissions (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `CASHIER`, `CUSTOMER`).
- **`Product` / `ProductVariant`**: Master SKU, barcode, brand, category, cost price, and retail price.
- **`Inventory` & `InventoryMovement`**: Quantity on hand, reserved stock, low-stock threshold, location binding, and traceable movement history.
- **`Order` & `OrderItem`**: Unified records tagged with `SalesChannel` (`ONLINE` vs `POS_STORE`), payment status, and fulfillment state.
- **`Shift`**: Cash register management tracking open/close cash balances, transactions count, and discrepancies.
- **`Customer`**: Combined spending, store credits, and loyalty tracking across channels.
- **`Setting`**: Key-value system config for dynamic store branding and localization.

---

## 4. Default Credentials & Ports

- **Storefront & Admin URL**: `http://localhost:3000`
- **Admin Access**: `/admin/login`
  - Admin: `admin@devicenagar.com` / `admin123`
  - Cashier: `cashier@devicenagar.com` / `cashier123`
- **PostgreSQL**: Port `5432` (Database: `devicenagar`)
