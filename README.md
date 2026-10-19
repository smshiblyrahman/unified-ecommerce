# Unified Ecommerce Platform

An omnichannel commerce and Point of Sale (POS) application built with Next.js 16, PostgreSQL, Prisma, NextAuth, and real-time Server-Sent Events (SSE).

---

## Features

- **Storefront**: High-converting catalog, search, category filters, and live cart drawer.
- **In-Store POS Terminal**: Real-time sales register (`/admin/pos`), barcode/SKU search, quick tender, and receipt generation.
- **POS Shift Management**: Register opening floats, cash drawer audit, drop tracking, and shift reconciliation (`/admin/pos/shifts`).
- **Unified Inventory**: Central stock management across web and physical retail locations with full stock movement history (`/admin/inventory`, `/admin/inventory/history`).
- **Orders & Invoices**: Unified tracking for online orders and in-store transactions with printable invoice views (`/admin/orders`, `/admin/invoices`).
- **Admin Dashboard & Analytics**: Gross revenue, profit margin calculations, channel breakdown, and report exporting (`/admin`, `/admin/analytics`, `/admin/reports`).
- **Real-Time Synchronization**: Instant stock decrementing across storefront and POS via Server-Sent Events (`/api/sse`).

---

## Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Database & ORM**: PostgreSQL & Prisma ORM
- **Authentication**: NextAuth.js (Role-based access: Super Admin, Admin, Manager, Cashier, Customer)
- **Styling**: Vanilla CSS Design System with CSS variables and dark-mode glassmorphic aesthetics
- **Containerization**: Docker & Docker Compose

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- PostgreSQL or Docker Desktop

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file from `.env` or set the following:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/devicenagar?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Unified Ecommerce"
NEXT_PUBLIC_CURRENCY_SYMBOL="৳"
```

### 4. Database Setup & Seed
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Running with Docker

```bash
docker compose up -d --build
```

---

## Default Access & Credentials

- **Storefront**: `http://localhost:3000`
- **Admin Login**: `http://localhost:3000/admin/login`
  - **Admin**: `admin@devicenagar.com` / `admin123`
  - **Cashier**: `cashier@devicenagar.com` / `cashier123`

---

## License
MIT
