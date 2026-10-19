"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@devicenagar.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(79,98,247,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 50%)",
    }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "var(--space-4)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <div style={{
            width: 60, height: 60,
            background: "linear-gradient(135deg, var(--brand-500), var(--accent-violet))",
            borderRadius: "var(--radius-xl)", margin: "0 auto var(--space-4)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
            boxShadow: "var(--shadow-brand)",
          }}>
            🛍️
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Unified Ecommerce</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "var(--space-1)" }}>Commerce Management Platform</p>
        </div>

        {/* Card */}
        <div className="card-elevated" style={{ padding: "var(--space-8)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-6)" }}>Sign in to Admin</h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="admin@devicenagar.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: "var(--danger-bg)", color: "var(--danger)",
                borderRadius: "var(--radius-md)", padding: "var(--space-3)",
                fontSize: "0.875rem", border: "1px solid rgba(244,63,94,0.2)",
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "var(--space-2)" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          {/* Quick access hint */}
          <div style={{ marginTop: "var(--space-6)", padding: "var(--space-3)", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Demo credentials:</div>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--brand-400)" }}>
              admin@devicenagar.com / admin123
            </div>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginTop: 2 }}>
              cashier@devicenagar.com / cashier123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
