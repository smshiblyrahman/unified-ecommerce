import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ShoppingBagIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  LaptopIcon,
  HeadphonesIcon,
  WatchIcon,
  PlugIcon,
  PackageIcon,
  ShieldCheckIcon,
  TruckIcon,
  RefreshCwIcon,
  AwardIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { inventory: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}

async function getCategories() {
  return prisma.category.findMany({ take: 6, where: { parentId: null } });
}

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("phone") || n.includes("mobile")) return <SmartphoneIcon size={28} className="text-brand" />;
  if (n.includes("laptop") || n.includes("computer")) return <LaptopIcon size={28} className="text-brand" />;
  if (n.includes("audio") || n.includes("headphone") || n.includes("sound")) return <HeadphonesIcon size={28} className="text-brand" />;
  if (n.includes("watch") || n.includes("wearable")) return <WatchIcon size={28} className="text-brand" />;
  if (n.includes("access") || n.includes("cable") || n.includes("charger")) return <PlugIcon size={28} className="text-brand" />;
  return <PackageIcon size={28} className="text-brand" />;
}

export default async function StorefrontHome() {
  const [products, categories] = await Promise.all([getFeaturedProducts(), getCategories()]);

  const fmt = (n: unknown) =>
    "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Banner */}
      <div style={{ background: "linear-gradient(90deg, #1e1b4b, #312e81, #1e1b4b)", borderBottom: "1px solid var(--border-subtle)", padding: "8px 0", fontSize: "0.75rem", color: "var(--brand-200)", textAlign: "center" }}>
        <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AwardIcon size={14} /> Official 100% Genuine Tech Products in Bangladesh
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <TruckIcon size={14} /> Express Delivery across Dhaka & Nationwide
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="store-nav">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, var(--brand-500), var(--accent-violet))", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(79, 98, 247, 0.4)" }}>
              <ShoppingBagIcon size={20} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Unified Ecommerce</span>
              <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: -2 }}>Tech Emporium</span>
            </div>
          </Link>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {categories.slice(0, 5).map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.slug}`} className="store-nav__link">
                {cat.name}
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Link
              href="/cart"
              className="btn btn-secondary btn-sm"
              aria-label="Shopping Cart"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}
            >
              <ShoppingCartIcon size={16} />
              <span>Cart</span>
            </Link>
            <Link href="/admin" className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Admin Portal</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="store-hero">
        <div className="container" style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "var(--space-12) 0 var(--space-8)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "rgba(79, 98, 247, 0.12)", borderRadius: "var(--radius-full)", border: "1px solid rgba(79, 98, 247, 0.3)", marginBottom: "var(--space-6)", fontSize: "0.8125rem", color: "var(--brand-300)", fontWeight: 600 }}>
            <AwardIcon size={16} /> Bangladesh&apos;s Next-Gen Tech Destination
          </div>
          
          <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "var(--space-5)", lineHeight: 1.1 }}>
            Upgrade Your Lifestyle With<br />
            <span style={{ background: "linear-gradient(135deg, #818cf8 0%, #38bdf8 50%, #34d399 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Next-Level Gadgets
            </span>
          </h1>
          
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: 620, margin: "0 auto var(--space-8)", lineHeight: 1.6 }}>
            Explore genuine smartphones, ultrabooks, audio equipment, and curated tech essentials backed by official warranty and unified commerce fulfillment.
          </p>
          
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products" className="btn btn-primary btn-xl" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", fontSize: "1rem" }}>
              <span>Explore All Products</span>
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/admin/pos" className="btn btn-secondary btn-xl" style={{ padding: "14px 28px", fontSize: "1rem" }}>
              Launch In-Store POS
            </Link>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-8)", marginTop: "var(--space-10)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              <div style={{ color: "var(--success)" }}><CheckIcon size={16} /></div>
              <span>Official Warranty Support</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              <div style={{ color: "var(--success)" }}><CheckIcon size={16} /></div>
              <span>Real-Time Inventory Sync</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              <div style={{ color: "var(--success)" }}><CheckIcon size={16} /></div>
              <span>Fast Doorstep Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section style={{ padding: "var(--space-8) 0", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
            <div className="trust-badge">
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(16, 185, 129, 0.12)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldCheckIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>100% Genuine</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Authentic products with manufacturer warranty</p>
              </div>
            </div>

            <div className="trust-badge">
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(6, 182, 212, 0.12)", color: "var(--info)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TruckIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Express Shipping</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Swift delivery directly to your doorstep</p>
              </div>
            </div>

            <div className="trust-badge">
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(245, 158, 11, 0.12)", color: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RefreshCwIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Hassle-Free Returns</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Easy 7-day replacement policy</p>
              </div>
            </div>

            <div className="trust-badge">
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(139, 92, 246, 0.12)", color: "var(--accent-violet)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AwardIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Unified POS & Web</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Buy in-store or online seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section style={{ padding: "var(--space-12) 0 var(--space-8)" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand-400)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Curated Collections
              </div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Shop by Category</h2>
            </div>
            <Link href="/products" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "var(--brand-400)", fontWeight: 600 }}>
              <span>View All</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "var(--space-4)" }}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="category-chip"
              >
                <div style={{ width: 54, height: 54, borderRadius: "var(--radius-lg)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
                  {getCategoryIcon(cat.name)}
                </div>
                <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>{cat.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: -4 }}>Browse collection</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: "var(--space-8) 0 var(--space-16)" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Handpicked Deals
              </div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Featured Products</h2>
            </div>
            <Link href="/products" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "var(--brand-400)", fontWeight: 600 }}>
              <span>See Full Catalog</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-5)" }}>
            {products.map((product) => {
              const inv = product.inventory[0];
              const available = inv ? inv.quantity - inv.reserved : 0;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="product-card">
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="product-card__img" />
                      ) : (
                        <div className="product-card__img img-placeholder">
                          <PackageIcon size={48} className="text-muted" />
                        </div>
                      )}
                      {available <= 3 && available > 0 && (
                        <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(245, 158, 11, 0.9)", color: "#000", fontWeight: 700, fontSize: "0.6875rem", padding: "3px 8px", borderRadius: "var(--radius-full)", textTransform: "uppercase" }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="product-card__body">
                      {product.category && (
                        <div style={{ fontSize: "0.6875rem", color: "var(--brand-400)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>
                          {product.category.name}
                        </div>
                      )}
                      <h3 className="product-card__name">{product.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "var(--space-3)" }}>
                        <div className="product-card__price">{fmt(product.basePrice)}</div>
                        <div className={`product-card__stock ${available === 0 ? "product-card__stock--out" : available <= 5 ? "product-card__stock--low" : ""}`}>
                          {available === 0 ? "Out of stock" : `${available} in stock`}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: "auto", background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", padding: "var(--space-12) 0 var(--space-6)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "var(--space-8)", marginBottom: "var(--space-10)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-4)" }}>
                <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, var(--brand-500), var(--accent-violet))", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <ShoppingBagIcon size={18} />
                </div>
                <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--text-primary)" }}>Unified Ecommerce</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 320 }}>
                Your trusted omnichannel tech destination in Bangladesh. Integrating online shopping with physical retail point-of-sale.
              </p>
            </div>
            {[
              { title: "Products", links: ["Smartphones", "Laptops", "Audio Devices", "Smart Watches", "Accessories"] },
              { title: "Customer Care", links: ["Order Status", "Warranty Claim", "Return Policy", "Store Locations", "Support"] },
              { title: "Platform", links: ["In-Store POS", "Admin Control", "Unified Inventory", "Privacy Policy", "Terms of Service"] },
            ].map((section) => (
              <div key={section.title}>
                <div style={{ fontWeight: 700, marginBottom: "var(--space-4)", fontSize: "0.875rem", color: "var(--text-primary)" }}>{section.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {section.links.map((link) => (
                    <a key={link} href="#" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-6)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>© 2026 Unified Ecommerce. Built with Next.js & UI/UX Pro Max.</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--brand-400)", fontWeight: 500 }}>Omnichannel POS & Online Commerce</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

