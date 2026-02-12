"use client";

import { useMemo, useState } from "react";

type TabKey = "wallet" | "add cash" | "transactions";

export default function BetBurn() {
  const [tab, setTab] = useState<TabKey>("wallet");

  const titleText = useMemo(() => {
    if (tab === "wallet") return "BET AND BURN (WALLET)";
    if (tab === "add cash") return "BET AND BURN (ADD CASH)";
    return "BET AND BURN (TRANSACTIONS)";
  }, [tab]);

  return (
    <div style={page}>
      <div style={bg}>
        {/* Header (anchored top-left) */}
        <div style={headerBar}>
          <div style={brandRow}>
            <img src="/logo.png" alt="ORC Logo" style={logoImg} />
            <div style={brandText}>ORC Wallet</div>
          </div>

          <div style={close} aria-label="Close">
            ×
          </div>
        </div>

        {/* CENTERED LANE: tabs + content */}
        <div style={centerLane}>
          {/* Tabs (centered) */}
          <div style={tabsWrap}>
            <div style={tabsPill}>
              {(["wallet", "add cash", "transactions"] as TabKey[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    ...tabBtn,
                    background: tab === t ? "#FFBD17" : "#464646",
                    color: tab === t ? "#000" : "#fff",
                  }}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content panels */}
          {tab === "wallet" && (
            <div style={walletRow}>
              <div style={walletInfo}>
                <div style={tokenLabelRow}>
                  <img
                    src="/assets/gimme-token.png"
                    alt="Gimmie Token"
                    style={tokenIcon}
                  />
                  <span style={tokenLabel}>Gimmie Tokens</span>
                </div>

                <div style={gm}>520.00 GM</div>
                <div style={usd}>$50.20 <span style={usdMuted}>$0.01/GM</span></div>
              </div>

              <button style={primary} type="button">
                Transfer
              </button>
            </div>
          )}

          {tab === "add cash" && (
            <div style={addCashWrap}>
              <div style={amountPill}>
                <span style={amountPrefix}>$</span>
                <input
                  defaultValue="0.00"
                  style={amountInput}
                  aria-label="Amount in USD"
                />
                <span style={amountSuffix}>USD</span>
              </div>

              <label style={checkRow}>
                <input type="checkbox" />
                <span>Add Cash to United States Dollar</span>
              </label>

              <div style={meta}>
                <div style={muted}>From</div>
                <div>Chimoney</div>
              </div>

              <button style={{ ...primary, width: 180 }} type="button">
                Preview
              </button>
            </div>
          )}

          {tab === "transactions" && (
            <div style={txWrap}>
              <ul style={txList}>
                {[
                  ["VLT Tournament Win", "-$45", "neg"],
                  ["VLT Tournament Win", "+$45", "pos"],
                  ["Cash Payout", "+$45", "pos"],
                  ["GM Tournament Win", "+$45", "pos"],
                ].map(([label, amt, kind], i) => (
                  <li key={i} style={txItem}>
                    <div>
                      <div style={txTitle}>{label}</div>
                      <div style={txSub}>ORC Wallet</div>
                    </div>
                    <div
                      style={{
                        ...txAmt,
                        color:
                          kind === "pos"
                            ? "rgba(120,255,120,0.9)"
                            : "rgba(255,120,120,0.9)",
                      }}
                    >
                      {amt}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------- styles -------- */

const page: React.CSSProperties = {
  height: "100vh",
  width: "100vw",
  margin: 0,
  padding: 0,
  background: "#000",
  overflow: "hidden",
  fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  color: "#fff",
};

const bg: React.CSSProperties = {
  height: "100%",
  width: "100%",
  padding: 24,
  boxSizing: "border-box",
  background:
    "linear-gradient(rgba(0,0,0,0.76), rgba(0,0,0,0.76)), url('/bg.jpg') center/cover",
  position: "relative",
};

/* Header stays anchored */
const headerBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const brandRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const logoImg: React.CSSProperties = {
  width: 60,
  height: 60,
};

const brandText: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 48,
  color: "#F7D023",
};

const close: React.CSSProperties = {
  fontSize: 22,
  opacity: 0.85,
  cursor: "pointer",
  padding: "4px 8px",
};

/* Top caption */
const pageTitle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
};

/* Center lane: this is the key */
const centerLane: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 90, // under header/title
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center", // centers tabs + panels
  pointerEvents: "auto",
};

const tabsWrap: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  marginTop: 12,
};

const tabsPill: React.CSSProperties = {
  width: "min(860px, 92vw)",
  background: "#272626",
  borderRadius: 45,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  height: 45,
  borderRadius: 28,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  textTransform: "lowercase",
};

/* Wallet layout centered inside lane */
const walletRow: React.CSSProperties = {
  width: "min(980px, 92vw)",
  marginTop: 44,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 24,
};

const walletInfo: React.CSSProperties = {
  textAlign: "center",
};

const tokenLabelRow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const tokenIcon: React.CSSProperties = {
  width: 18,
  height: 18,
  objectFit: "contain",
  display: "block",
};

const tokenLabel: React.CSSProperties = {
  color: "#FFBD16",
  fontWeight: 700,
  fontSize: 14,
};

const gm: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const usd: React.CSSProperties = {
  marginTop: 6,
  opacity: 0.9,
};

const usdMuted: React.CSSProperties = {
  opacity: 0.7,
  marginLeft: 6,
};

const primary: React.CSSProperties = {
  padding: "12px 28px",
  background: "#0052B4",
  border: "none",
  borderRadius: 999,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 140,
};

/* Add Cash centered */
const addCashWrap: React.CSSProperties = {
  marginTop: 56,
  width: "min(340px, 92vw)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const amountPill: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(255,255,255,0.92)",
  borderRadius: 999,
  padding: "12px 14px",
  color: "#111",
};

const amountPrefix: React.CSSProperties = { fontWeight: 800 };
const amountSuffix: React.CSSProperties = { fontWeight: 800 };

const amountInput: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 18,
  fontWeight: 800,
};

const checkRow: React.CSSProperties = {
  width: "100%",
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 12,
  color: "rgba(255,255,255,0.8)",
};

const meta: React.CSSProperties = {
  width: "100%",
  fontSize: 12,
  color: "rgba(255,255,255,0.85)",
};

const muted: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
};

/* Transactions centered */
const txWrap: React.CSSProperties = {
  width: "min(980px, 92vw)",
  marginTop: 40,
};

const txList: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const txItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
};

const txTitle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 14,
};

const txSub: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
};

const txAmt: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
};
