"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSSE } from "@/hooks/useSSE";

// ─── Types ───────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  basePrice: number;
  taxRate: number;
  inventory: Array<{ quantity: number; reserved: number }>;
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  inventory: Array<{ quantity: number; reserved: number }>;
}

interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  imageUrl?: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  availableStock: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
}

interface PaymentEntry {
  method: string;
  amount: string;
}

type PaymentMethod = "CASH" | "CARD" | "MOBILE_BANKING" | "BANK_TRANSFER" | "OTHER";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "CASH", label: "Cash", icon: "💵" },
  { value: "CARD", label: "Card", icon: "💳" },
  { value: "MOBILE_BANKING", label: "Mobile Pay", icon: "📱" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: "🏦" },
  { value: "OTHER", label: "Other", icon: "⋯" },
];

const fmt = (n: number) => "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 2 });

// ─── POS PAGE ────────────────────────────────────────────

export default function POSPage() {
  // Products & Search
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInput, setDiscountInput] = useState("");

  // Customer
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Payment
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "CASH", amount: "" }]);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [notes, setNotes] = useState("");

  // Sale result
  const [saleResult, setSaleResult] = useState<{
    orderNumber: string; invoiceNumber: string; totalAmount: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const { on } = useSSE("pos");

  // ─── Load Products ──────────────────────────────────────

  const loadProducts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/products?search=${encodeURIComponent(q)}&status=ACTIVE&limit=20`
        : `/api/products?status=ACTIVE&limit=30`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, loadProducts]);

  // Real-time stock update
  useEffect(() => {
    return on("STOCK_UPDATED", (msg) => {
      const { productId, newStock } = msg.payload as { productId: string; newStock: number };
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, inventory: [{ quantity: newStock, reserved: 0 }] }
            : p
        )
      );
      // Also update cart stock
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, availableStock: newStock } : item
        )
      );
    });
  }, [on]);

  // ─── Cart Operations ────────────────────────────────────

  const getAvailableStock = (product: Product, variantId?: string) => {
    if (variantId) {
      const v = product.variants.find((v) => v.id === variantId);
      const inv = v?.inventory[0];
      return inv ? inv.quantity - inv.reserved : 0;
    }
    const inv = product.inventory[0];
    return inv ? inv.quantity - inv.reserved : 0;
  };

  const addToCart = (product: Product, variantId?: string) => {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : null;
    const unitPrice = variant ? Number(variant.price) : Number(product.basePrice);
    const available = getAvailableStock(product, variantId);

    if (available === 0) {
      setError("This product is out of stock");
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.variantId === variantId
      );
      if (existing) {
        if (existing.quantity >= existing.availableStock) {
          setError(`Only ${existing.availableStock} units available`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id && i.variantId === variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          productName: product.name,
          variantName: variant?.name,
          sku: variant?.sku ?? product.sku,
          imageUrl: product.imageUrl ?? undefined,
          unitPrice,
          taxRate: Number(product.taxRate),
          quantity: 1,
          availableStock: available,
        },
      ];
    });
    setError("");
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i !== idx) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.availableStock) {
            setError(`Only ${item.availableStock} units available`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
    setError("");
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Totals ─────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.taxRate) / 100, 0);
  const grandTotal = Math.max(0, subtotal + taxTotal - discountAmount);
  const paymentTotal = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = Math.max(0, grandTotal - paymentTotal);
  const change = Math.max(0, paymentTotal - grandTotal);

  // ─── Customer Search ────────────────────────────────────

  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=5`);
      const data = await res.json();
      setCustomerResults(data.customers || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ─── Complete Sale ────────────────────────────────────

  const completeSale = async () => {
    if (cart.length === 0) { setError("Cart is empty"); return; }
    if (Math.abs(paymentTotal - grandTotal) > 0.01) {
      setError(`Payment mismatch. Remaining: ${fmt(remaining)}`);
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
          })),
          payments: payments
            .filter((p) => parseFloat(p.amount) > 0)
            .map((p) => ({ method: p.method, amount: parseFloat(p.amount) })),
          customerId: customer?.id ?? "customer-walkin",
          discountAmount,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Transaction failed");
        return;
      }

      setSaleResult({
        orderNumber: data.orderNumber,
        invoiceNumber: data.invoiceNumber,
        totalAmount: data.totalAmount,
      });

      // Reset
      setCart([]);
      setPayments([{ method: "CASH", amount: "" }]);
      setDiscountAmount(0);
      setDiscountInput("");
      setCustomer(null);
      setNotes("");
      setShowPaymentPanel(false);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "var(--space-4)" }}>
        <div>
          <h1 className="page-title">⊡ POS Terminal</h1>
          <p className="page-subtitle">Point of Sale — POS-01</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm">◷ Shifts</button>
          <button className="btn btn-secondary btn-sm">◉ Customers</button>
        </div>
      </div>

      {/* Sale Success Modal */}
      {saleResult && (
        <div className="modal-overlay" onClick={() => setSaleResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--success)" }}>
                  ✓ Sale Completed!
                </h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSaleResult(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }}>🎉</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", marginBottom: "var(--space-2)" }}>
                  {fmt(Number(saleResult.totalAmount))}
                </div>
                <p style={{ color: "var(--text-muted)" }}>Transaction Complete</p>
                <div className="divider" />
                <div className="flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-3)" }}>
                  <span className="text-muted">Order #</span>
                  <strong>{saleResult.orderNumber}</strong>
                </div>
                <div className="flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)" }}>
                  <span className="text-muted">Invoice #</span>
                  <strong>{saleResult.invoiceNumber}</strong>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨 Print Receipt</button>
              <a
                href={`/api/invoices/${saleResult.invoiceNumber}/pdf`}
                download
                className="btn btn-secondary"
              >
                ↓ Download PDF
              </a>
              <button className="btn btn-primary" onClick={() => { setSaleResult(null); searchRef.current?.focus(); }}>
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pos-layout">
        {/* ── LEFT: Products ── */}
        <div className="pos-products">
          {/* Search Bar */}
          <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
            <input
              ref={searchRef}
              autoFocus
              className="form-input"
              placeholder="🔍 Search product name, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Product Grid */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 200, borderRadius: "var(--radius-md)" }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--text-muted)" }}>
                No products found
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => {
                  const available = getAvailableStock(product);
                  return (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => addToCart(product)}
                      style={{ opacity: available === 0 ? 0.5 : 1, cursor: available === 0 ? "not-allowed" : "pointer" }}
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="product-card__img" />
                      ) : (
                        <div className="product-card__img img-placeholder">📦</div>
                      )}
                      <div className="product-card__body">
                        <div className="product-card__name">{product.name}</div>
                        {product.sku && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>
                            {product.sku}
                          </div>
                        )}
                        <div className="product-card__price">{fmt(Number(product.basePrice))}</div>
                        <div className={`product-card__stock ${available <= 5 && available > 0 ? "product-card__stock--low" : available === 0 ? "product-card__stock--out" : ""}`}>
                          {available === 0 ? "Out of stock" : available <= 5 ? `Only ${available} left` : `${available} in stock`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="pos-cart">
          <div className="pos-cart__header flex items-center justify-between">
            <span>Cart ({cart.length} items)</span>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setCart([])}>
                Clear
              </button>
            )}
          </div>

          {/* Customer */}
          <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)", position: "relative" }}>
            {customer ? (
              <div className="flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{customer.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{customer.phone || customer.email}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setCustomer(null)}>✕</button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  style={{ fontSize: "0.875rem" }}
                  placeholder="👤 Search customer (or walk-in)..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                  onFocus={() => setShowCustomerSearch(true)}
                />
                {showCustomerSearch && customerResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 4,
                    boxShadow: "var(--shadow-lg)",
                  }}>
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        style={{ width: "100%", padding: "var(--space-3)", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", borderBottom: "1px solid var(--border-subtle)" }}
                        onClick={() => { setCustomer(c); setCustomerSearch(""); setShowCustomerSearch(false); }}
                      >
                        <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.phone || c.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="pos-cart__items">
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>🛒</div>
                <p>Add products from the left panel</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.productId}-${item.variantId}`} className="pos-cart__item">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📦</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.productName}
                    </div>
                    {item.variantName && (
                      <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{item.variantName}</div>
                    )}
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--brand-400)" }}>
                      {fmt(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(idx, -1)}>−</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(idx, 1)}>+</button>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      style={{ fontSize: "0.7rem", color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="pos-cart__footer">
            {/* Discount */}
            <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
              <input
                className="form-input"
                style={{ fontSize: "0.875rem" }}
                placeholder="Discount (৳)"
                value={discountInput}
                onChange={(e) => {
                  setDiscountInput(e.target.value);
                  setDiscountAmount(parseFloat(e.target.value) || 0);
                }}
              />
            </div>

            {/* Notes */}
            <textarea
              className="form-input"
              style={{ fontSize: "0.8rem", resize: "none", height: 52, marginBottom: "var(--space-3)" }}
              placeholder="Customer note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {/* Totals */}
            <div className="pos-total-row">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="pos-total-row" style={{ color: "var(--success)" }}>
                <span>Discount</span><span>−{fmt(discountAmount)}</span>
              </div>
            )}
            <div className="pos-total-row">
              <span>Tax</span><span>{fmt(taxTotal)}</span>
            </div>
            <div className="pos-total-row pos-total-row--grand">
              <span>Total</span><span style={{ color: "var(--brand-400)" }}>{fmt(grandTotal)}</span>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "var(--danger-bg)", color: "var(--danger)",
                borderRadius: "var(--radius-md)", padding: "var(--space-3)",
                fontSize: "0.8125rem", margin: "var(--space-3) 0",
                border: "1px solid rgba(244,63,94,0.2)",
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Payment Toggle */}
            {!showPaymentPanel ? (
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "var(--space-3)", fontSize: "1rem", padding: "0.75rem" }}
                onClick={() => {
                  if (cart.length === 0) { setError("Cart is empty"); return; }
                  setShowPaymentPanel(true);
                  setPayments([{ method: "CASH", amount: grandTotal.toFixed(2) }]);
                }}
                disabled={cart.length === 0}
              >
                💳 Proceed to Payment
              </button>
            ) : (
              <div style={{ marginTop: "var(--space-3)" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--text-secondary)" }}>
                  Payment Methods
                </div>

                {payments.map((payment, idx) => (
                  <div key={idx} className="flex items-center gap-2" style={{ marginBottom: "var(--space-2)" }}>
                    <select
                      className="form-input form-select"
                      style={{ fontSize: "0.8125rem", flex: 1 }}
                      value={payment.method}
                      onChange={(e) => setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      style={{ fontSize: "0.8125rem", width: 100 }}
                      type="number"
                      placeholder="Amount"
                      value={payment.amount}
                      onChange={(e) => setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))}
                    />
                    {payments.length > 1 && (
                      <button className="btn btn-ghost btn-icon" style={{ color: "var(--danger)" }}
                        onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
                    )}
                  </div>
                ))}

                <button className="btn btn-ghost btn-sm" onClick={() => setPayments((prev) => [...prev, { method: "CASH", amount: "" }])}>
                  + Add Payment
                </button>

                {/* Payment summary */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginTop: "var(--space-3)" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Paid</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: paymentTotal >= grandTotal ? "var(--success)" : "var(--text-primary)" }}>
                      {fmt(paymentTotal)}
                    </span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Remaining</span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--danger)" }}>{fmt(remaining)}</span>
                    </div>
                  )}
                  {change > 0 && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Change</span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--success)" }}>{fmt(change)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2" style={{ marginTop: "var(--space-3)" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentPanel(false)}>
                    ← Back
                  </button>
                  <button
                    className="btn btn-success"
                    style={{ flex: 2, fontSize: "0.9375rem", padding: "0.75rem" }}
                    onClick={completeSale}
                    disabled={processing || remaining > 0}
                  >
                    {processing ? "Processing..." : "✓ Complete Sale"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
