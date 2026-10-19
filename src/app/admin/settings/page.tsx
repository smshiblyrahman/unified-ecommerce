"use client";

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⊛ Settings</h1>
          <p className="page-subtitle">Store configuration and system settings</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-3)", height: "fit-content" }}>
          {["Store Info", "Invoice Settings", "POS Settings", "Tax Settings", "Payment Methods", "Notifications"].map((item) => (
            <button
              key={item}
              style={{
                display: "block", width: "100%", padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                textAlign: "left", fontSize: "0.875rem", color: "var(--text-secondary)",
                background: "none", marginBottom: "var(--space-1)",
                transition: "background var(--transition-fast)",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "var(--space-6)" }}>Store Information</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {[
              { label: "Store Name", defaultValue: "Unified Ecommerce" },
              { label: "Tagline", defaultValue: "Your Trusted Tech Partner" },
              { label: "Email", defaultValue: "info@devicenagar.com" },
              { label: "Phone", defaultValue: "01700000000" },
              { label: "Address", defaultValue: "House 12, Road 5, Banani, Dhaka-1213" },
            ].map((f) => (
              <div key={f.label} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" defaultValue={f.defaultValue} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "var(--space-3)", paddingTop: "var(--space-2)" }}>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
