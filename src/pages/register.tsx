"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { playerApi } from "@/services/playerApi";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await playerApi.register({ firstName, lastName, email: email.trim(), password });
      setRegisteredEmail(email.trim());
      setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={bg}>
        {/* Header — identical to login page */}
        <div style={headerBar}>
          <div style={brandRow}>
            <img src="/logo.png" alt="ORC Logo" style={logoImg} />
            <div style={brandText}>ORC Wallet</div>
          </div>
        </div>

        <div style={centerLane}>
          <div style={panel}>
            {registered ? (
              <>
                <div style={panelTitle}>You&apos;re all set!</div>
                <p style={successMsg}>
                  Account created. You can now log in using:<br />
                  <strong style={successEmail}>{registeredEmail}</strong>
                </p>
                <a href="/orc-wallet" style={successBtn}>Go to Sign In</a>
              </>
            ) : (
            <>
            <div style={panelTitle}>Create an account</div>

            <form onSubmit={handleSubmit} style={form} noValidate>
              <div style={field}>
                <label style={label} htmlFor="reg-firstname">First name</label>
                <input
                  id="reg-firstname"
                  style={input}
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={field}>
                <label style={label} htmlFor="reg-lastname">Last name</label>
                <input
                  id="reg-lastname"
                  style={input}
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div style={field}>
                <label style={label} htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  style={input}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={field}>
                <label style={label} htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  style={input}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span style={hint}>Minimum 8 characters</span>
              </div>

              {error && <div style={errorText}>{error}</div>}

              <button type="submit" style={submitBtn} disabled={loading}>
                {loading ? "Creating account…" : "Continue"}
              </button>
            </form>

            <p style={loginPrompt}>
              Already have an account?{" "}
              <a href="/orc-wallet" style={loginLink}>Log in</a>
            </p>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles — mirrors orc-wallet.tsx login styles exactly ── */

const page: React.CSSProperties = {
  height: "100vh",
  width: "100vw",
  margin: 0,
  padding: 0,
  background: "#000",
  overflowX: "hidden",
  overflowY: "auto",
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

const headerBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
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

const centerLane: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 90,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  pointerEvents: "auto",
  overflowY: "auto",
  paddingBottom: 24,
};

const panel: React.CSSProperties = {
  width: "min(420px, 92vw)",
  marginTop: 64,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  padding: 36,
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const panelTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 28,
  color: "#F7D023",
  marginBottom: 28,
  textAlign: "center",
};

const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(255,255,255,0.65)",
  letterSpacing: "0.02em",
};

const input: React.CSSProperties = {
  height: 48,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.07)",
  color: "#fff",
  fontSize: 15,
  padding: "0 14px",
  outline: "none",
};

const errorText: React.CSSProperties = {
  color: "salmon",
  fontSize: 13,
  fontWeight: 600,
  marginTop: -6,
};

const hint: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.40)",
  marginTop: 2,
};

const submitBtn: React.CSSProperties = {
  height: 50,
  borderRadius: 999,
  border: "none",
  background: "#FFBD17",
  color: "#000",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  marginTop: 6,
};

const loginPrompt: React.CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  color: "rgba(255,255,255,0.65)",
  marginTop: 20,
  marginBottom: 0,
};

const loginLink: React.CSSProperties = {
  color: "#FFBD17",
  fontWeight: 600,
  textDecoration: "none",
};

const successMsg: React.CSSProperties = {
  fontSize: 15,
  color: "rgba(255,255,255,0.80)",
  textAlign: "center",
  lineHeight: 1.7,
  marginBottom: 28,
};

const successEmail: React.CSSProperties = {
  color: "#F7D023",
  fontWeight: 700,
  display: "block",
  marginTop: 8,
  fontSize: 16,
};

const successBtn: React.CSSProperties = {
  display: "block",
  height: 50,
  borderRadius: 999,
  border: "none",
  background: "#FFBD17",
  color: "#000",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  textAlign: "center",
  lineHeight: "50px",
  textDecoration: "none",
};
