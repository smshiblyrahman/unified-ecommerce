"use client";

import { useEffect, useState } from "react";

interface Shift {
  id: string;
  status: string;
  openingBalance: number;
  cashSales: number;
  cashRefunds: number;
  expectedBalance: number;
  actualBalance?: number;
  variance?: number;
  openedAt: string;
  closedAt?: string;
  terminal: { name: string; identifier: string };
  user: { name: string };
}

const fmt = (n: number) => "৳" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 2 });

export default function POSShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [opening, setOpening] = useState(false);

  const load = async () => {
    const res = await fetch("/api/pos/shifts");
    const data = await res.json();
    setShifts(data.shifts || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openShift = async () => {
    setOpening(true);
    await fetch("/api/pos/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance: parseFloat(openingBalance) || 0, terminalId: "pos-terminal-default" }),
    });
    setOpening(false);
    setShowOpen(false);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">◷ POS Shifts</h1>
          <p className="page-subtitle">Cash register management and shift history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowOpen(true)}>+ Open Shift</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Terminal</th>
                <th>Cashier</th>
                <th>Status</th>
                <th>Opening Balance</th>
                <th>Cash Sales</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Opened</th>
                <th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>No shifts recorded</td></tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td style={{ fontWeight: 500 }}>{shift.terminal?.name || "—"}</td>
                    <td style={{ fontSize: "0.875rem" }}>{shift.user?.name || "—"}</td>
                    <td><span className={`badge ${shift.status === "OPEN" ? "badge-success" : "badge-default"}`}>{shift.status}</span></td>
                    <td>{fmt(shift.openingBalance)}</td>
                    <td style={{ color: "var(--success)" }}>{fmt(shift.cashSales)}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(shift.expectedBalance)}</td>
                    <td>{shift.actualBalance != null ? fmt(shift.actualBalance) : "—"}</td>
                    <td style={{ fontWeight: 700, color: shift.variance != null ? (shift.variance < 0 ? "var(--danger)" : shift.variance > 0 ? "var(--success)" : "var(--text-muted)") : "var(--text-muted)" }}>
                      {shift.variance != null ? (shift.variance >= 0 ? "+" : "") + fmt(shift.variance) : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(shift.openedAt).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {shift.closedAt ? new Date(shift.closedAt).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3>Open New Shift</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowOpen(false)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label">Opening Cash Balance (৳)</label>
                <input className="form-input" type="number" placeholder="e.g. 10000"
                  value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Enter the cash in the register at shift start</div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setShowOpen(false)}>Cancel</button>
              <button className="btn btn-success" onClick={openShift} disabled={opening}>
                {opening ? "Opening..." : "Open Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
