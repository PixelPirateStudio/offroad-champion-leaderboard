"use client";

import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { playerApi } from "@/services/playerApi";
import AddCashStripeFlow from "@/components/wallet/AddCashStripeFlow";

type Profile = { gains: number; coins: number; coinsTemporal: number };
type RedemptionRecord = {
  redemptionId?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  requestedAt?: string;
};
type TransactionItem = {
  id: string;
  label: string;
  source: string;
  amountLabel: string;
  kind: "pos" | "neg";
};

type TabKey = "wallet" | "add cash" | "transactions";
type AddCashStage = "entry" | "payment" | "success";
type TransferStage = "none" | "method" | "details" | "verify" | "confirm" | "success";
type WithdrawalMethod = "bank" | "paypal";

type BankTransferFormData = {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  email: string;
};

type PayPalTransferFormData = {
  fullName: string;
  paypalEmail: string;
};

type IdentityFormData = {
  legalName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dateOfBirth: string;
  attestationAccepted: boolean;
};

const USD_PER_GM = 0.01;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const TAB_LABELS: Record<TabKey, string> = {
  wallet: "Wallet",
  "add cash": "Add Cash",
  transactions: "Transactions",
};

export default function BetBurn() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("wallet");
  const [addCashAmount, setAddCashAmount] = useState<string>("0.00");
  const [addCashStage, setAddCashStage] = useState<AddCashStage>("entry");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [addCashErr, setAddCashErr] = useState<string | null>(null);
  const [addCashLoading, setAddCashLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [transferStage, setTransferStage] = useState<TransferStage>("none");
  const [transferAmount, setTransferAmount] = useState<string>("0.00");
  const [transferMethod, setTransferMethod] = useState<WithdrawalMethod>("bank");
  const [bankForm, setBankForm] = useState<BankTransferFormData>({
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    email: "",
  });
  const [payPalForm, setPayPalForm] = useState<PayPalTransferFormData>({
    fullName: "",
    paypalEmail: "",
  });
  const [identityForm, setIdentityForm] = useState<IdentityFormData>({
    legalName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    dateOfBirth: "",
    attestationAccepted: false,
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSubmitErr, setTransferSubmitErr] = useState<string | null>(null);

  const mapProfile = (p: Partial<Profile>): Profile => ({
    gains: Number(p.gains) || 0,
    coins: Number(p.coins) || 0,
    coinsTemporal: Number(p.coinsTemporal) || 0,
  });

  const refreshTransactions = async () => {
    try {
      const redemptionsData = await playerApi.getMyRedemptions({ limit: 50, offset: 0 });
      const redemptions = Array.isArray(redemptionsData?.redemptions)
        ? (redemptionsData.redemptions as RedemptionRecord[])
        : [];

      const mapped = redemptions.map((redemption, index) => {
        const numericAmount = Number(redemption.amount || 0);
        const amount = Number.isFinite(numericAmount) ? numericAmount : 0;
        const signedAmount = `-$${Math.abs(amount).toFixed(2)}`;
        const statusLabel = redemption.status ? redemption.status.toUpperCase() : "REQUEST";

        return {
          id: redemption.redemptionId || `tx-${index}`,
          label: `Cash ${statusLabel}`,
          source: "Redemption",
          amountLabel: signedAmount,
          kind: "neg",
        } as TransactionItem;
      });

      setTransactions((prev) => {
        const optimistic = prev.filter(
          (tx) => tx.id.startsWith("stripe-") || tx.id.startsWith("transfer-")
        );

        const merged = [...optimistic];
        for (const tx of mapped) {
          if (!merged.some((item) => item.id === tx.id)) {
            merged.push(tx);
          }
        }

        return merged;
      });
    } catch {
      // keep optimistic/local transaction list if refresh fails
    }
  };

  const safeSyncProfileAfterMutation = async (expectedGains: number | null) => {
    try {
      const serverProfileRaw = (await playerApi.getMyProfile()) as Partial<Profile>;
      const serverProfile = mapProfile(serverProfileRaw);

      setProfile((current) => {
        if (!current) return serverProfile;

        if (typeof expectedGains === "number") {
          const serverMatchesExpected =
            Math.abs(serverProfile.gains - expectedGains) <= 0.0001;

          if (serverMatchesExpected) return serverProfile;

          return {
            ...serverProfile,
            gains: current.gains,
          };
        }

        return {
          ...serverProfile,
          gains: current.gains,
        };
      });
    } catch {
      // keep optimistic balance if profile sync fails
    }

    await refreshTransactions();
  };

  const loadWalletData = async () => {
    setErr(null);
    setTxLoading(true);
    setTxErr(null);

    try {
      const [profileData, redemptionsData] = await Promise.all([
        playerApi.getMyProfile(),
        playerApi.getMyRedemptions({ limit: 50, offset: 0 }),
      ]);

      const p = profileData as Partial<Profile>;
      setProfile(mapProfile(p));

      const redemptions = Array.isArray(redemptionsData?.redemptions)
        ? (redemptionsData.redemptions as RedemptionRecord[])
        : [];

      const mapped = redemptions.map((redemption, index) => {
        const numericAmount = Number(redemption.amount || 0);
        const amount = Number.isFinite(numericAmount) ? numericAmount : 0;
        const signedAmount = `-$${Math.abs(amount).toFixed(2)}`;
        const statusLabel = redemption.status ? redemption.status.toUpperCase() : "REQUEST";

        return {
          id: redemption.redemptionId || `tx-${index}`,
          label: `Cash ${statusLabel}`,
          source: "Redemption",
          amountLabel: signedAmount,
          kind: "neg",
        } as TransactionItem;
      });

      setTransactions(mapped);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load wallet data";
      setErr(message);
      setTxErr(message);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("playerToken")) {
      setIsAuthenticated(true);
      loadWalletData();
    }
  }, []);

  useEffect(() => {
    if (tab !== "add cash") {
      setAddCashStage("entry");
      setStripeClientSecret(null);
      setAddCashErr(null);
      setAddCashLoading(false);
    }

    if (tab !== "wallet") {
      setTransferStage("none");
      setTransferSubmitErr(null);
      setTransferSubmitting(false);
    }
  }, [tab]);

  const sanitizeUsdInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned === "") return "";

    const firstDotIndex = cleaned.indexOf(".");
    if (firstDotIndex === -1) {
      return cleaned.replace(/^0+(?=\d)/, "");
    }

    const wholeRaw = cleaned.slice(0, firstDotIndex).replace(/^0+(?=\d)/, "");
    const fractionRaw = cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
    const fraction = fractionRaw.slice(0, 2);
    const whole = wholeRaw === "" ? "0" : wholeRaw;
    return `${whole}.${fraction}`;
  };

  const parsedAddCashAmount = Number(addCashAmount || "0");
  const maxTransferUsd = profile ? Number((profile.gains * USD_PER_GM).toFixed(2)) : 0;
  const parsedTransferAmount = Number(transferAmount || "0");
  const hasValidTransferAmount =
    Number.isFinite(parsedTransferAmount) &&
    parsedTransferAmount > 0 &&
    parsedTransferAmount <= maxTransferUsd;
  const transferAmountLabel = `$${(hasValidTransferAmount ? parsedTransferAmount : 0).toFixed(2)}`;
  const bankFormReady =
    bankForm.accountHolder.trim() !== "" &&
    bankForm.bankName.trim() !== "" &&
    bankForm.accountNumber.trim() !== "" &&
    bankForm.routingNumber.trim() !== "" &&
    bankForm.email.trim() !== "";
  const payPalFormReady =
    payPalForm.fullName.trim() !== "" && payPalForm.paypalEmail.trim() !== "";
  const detailsFormReady = transferMethod === "bank" ? bankFormReady : payPalFormReady;
  const identityFormReady =
    identityForm.legalName.trim() !== "" &&
    identityForm.address.trim() !== "" &&
    identityForm.city.trim() !== "" &&
    identityForm.state.trim() !== "" &&
    identityForm.zip.trim() !== "" &&
    identityForm.dateOfBirth.trim() !== "" &&
    identityForm.attestationAccepted;

  const withdrawalEmail = transferMethod === "bank" ? bankForm.email : payPalForm.paypalEmail;

  const startStripeAddCashFlow = async () => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setAddCashErr("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      return;
    }

    if (!Number.isFinite(parsedAddCashAmount) || parsedAddCashAmount < 0.5) {
      setAddCashErr("Minimum amount is $0.50");
      return;
    }

    setAddCashLoading(true);
    setAddCashErr(null);

    try {
      const data = await playerApi.createStripePaymentIntent({ amountUsd: parsedAddCashAmount });

      if (!data.clientSecret) {
        throw new Error("Stripe client secret is missing");
      }

      setStripeClientSecret(data.clientSecret);
      setAddCashStage("payment");
    } catch (e: unknown) {
      setAddCashErr(e instanceof Error ? e.message : "Unable to start Stripe flow");
    } finally {
      setAddCashLoading(false);
    }
  };

  const submitTransfer = async () => {
    const transferUsd = Number.isFinite(parsedTransferAmount) ? parsedTransferAmount : 0;
    const baselineGains = profile?.gains ?? 0;
    const gmToDeduct = transferUsd / USD_PER_GM;
    const expectedGains = Math.max(0, Number((baselineGains - gmToDeduct).toFixed(2)));

    if (!hasValidTransferAmount || !detailsFormReady || !identityFormReady) {
      setTransferSubmitErr("Complete all required withdrawal fields before submitting.");
      return;
    }

    setTransferSubmitting(true);
    setTransferSubmitErr(null);

    try {
      const result = await playerApi.createRedemption({
        amount: transferUsd,
        email: withdrawalEmail,
      });

      const transferTx: TransactionItem = {
        id: String(result?.redemptionId || `transfer-${Date.now()}`),
        label: "Withdrawal Submitted",
        source: transferMethod === "bank" ? "Bank Transfer" : "PayPal",
        amountLabel: `-$${transferUsd.toFixed(2)}`,
        kind: "neg",
      };

      setProfile((prev) => {
        if (!prev) return prev;
        const nextGains = Math.max(0, prev.gains - gmToDeduct);
        return {
          ...prev,
          gains: Number(nextGains.toFixed(2)),
        };
      });

      setTransactions((prev) => [transferTx, ...prev]);
      setTransferStage("success");

      void safeSyncProfileAfterMutation(expectedGains);
    } catch (e: unknown) {
      setTransferSubmitErr(e instanceof Error ? e.message : "Withdrawal submission failed");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginErr("Username and password are required.");
      return;
    }
    setLoginLoading(true);
    setLoginErr(null);
    try {
      await playerApi.login(loginUsername.trim(), loginPassword);
      setIsAuthenticated(true);
      await loadWalletData();
    } catch (e: unknown) {
      setLoginErr(e instanceof Error ? e.message : "Login failed. Check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    playerApi.clearSession();
    setIsAuthenticated(false);
    setProfile(null);
    setTransactions([]);
    setTab("wallet");
    setTransferStage("none");
    setAddCashStage("entry");
    setStripeClientSecret(null);
  };

  return (
    <div style={page}>
      <div style={bg}>
        {/* Header (anchored top-left) */}
        <div style={headerBar}>
          <div style={brandRow}>
            <img src="/logo.png" alt="ORC Logo" style={logoImg} />
            <div style={brandText}>ORC Wallet</div>
          </div>
          {isAuthenticated && (
            <button type="button" style={logoutButton} onClick={handleLogout}>
              Log Out
            </button>
          )}
        </div>

        {!isAuthenticated ? (
          /* ── Login form ── */
          <div style={centerLane}>
            <div style={loginPanel}>
              <div style={loginTitle}>Sign In</div>
              <form onSubmit={handleLogin} style={loginForm} noValidate>
                <div style={loginField}>
                  <label style={loginLabel} htmlFor="orc-username">Username</label>
                  <input
                    id="orc-username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    style={loginInput}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <div style={loginField}>
                  <label style={loginLabel} htmlFor="orc-password">Password</label>
                  <input
                    id="orc-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={loginInput}
                    autoComplete="current-password"
                  />
                </div>
                {loginErr && <div style={loginError}>{loginErr}</div>}
                <button type="submit" style={loginSubmitBtn} disabled={loginLoading}>
                  {loginLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        ) : (
        /* ── Authenticated: tabs + content ── */
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
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Content panels */}
          {tab === "wallet" && (
            <>
              {transferStage === "none" && (
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

                    <div style={gm}>{profile ? profile.gains.toFixed(2) : "—"} GM</div>
                    <div style={conversionLine}>
                      {profile ? `$${maxTransferUsd.toFixed(2)}` : "—"}{" "}
                      <span style={conversionMuted}>($0.01 / GM)</span>
                    </div>

                    <div style={transferAmountWrap}>
                      <span style={transferAmountPrefix}>$</span>
                      <input
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(sanitizeUsdInput(e.target.value))}
                        inputMode="decimal"
                        pattern="\\d*(\\.\\d{0,2})?"
                        style={transferAmountInput}
                        aria-label="Transfer amount in USD"
                      />
                      <span style={transferAmountSuffix}>USD</span>
                    </div>

                    <div style={transferHint}>
                      Available: ${maxTransferUsd.toFixed(2)}
                    </div>

                    {!hasValidTransferAmount && (
                      <div style={transferValidationText}>
                        Enter an amount greater than $0.00 and up to ${maxTransferUsd.toFixed(2)}.
                      </div>
                    )}

                    {err && <div style={{ color: "salmon", marginTop: 8 }}>{err}</div>}
                  </div>

                  <button
                    style={primary}
                    type="button"
                    onClick={() => {
                      setTransferSubmitErr(null);
                      if (hasValidTransferAmount) {
                        setTransferStage("method");
                      }
                    }}
                    disabled={!hasValidTransferAmount}
                  >
                    Withdraw
                  </button>
                </div>
              )}

              {transferStage === "method" && (
                <div style={transferScene}>
                  <div style={transferPanel}>
                    <div style={transferPanelTitle}>Choose Withdrawal Method</div>
                    <div style={classificationList}>
                      <button
                        type="button"
                        style={{
                          ...classificationOption,
                          borderColor:
                            transferMethod === "bank"
                              ? "rgba(0,82,180,0.45)"
                              : "rgba(17,17,17,0.15)",
                          background:
                            transferMethod === "bank"
                              ? "rgba(0,82,180,0.08)"
                              : "#fff",
                        }}
                        onClick={() => setTransferMethod("bank")}
                      >
                        <span style={classificationLabel}>Receive to Bank Account</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          ...classificationOption,
                          borderColor:
                            transferMethod === "paypal"
                              ? "rgba(0,82,180,0.45)"
                              : "rgba(17,17,17,0.15)",
                          background:
                            transferMethod === "paypal"
                              ? "rgba(0,82,180,0.08)"
                              : "#fff",
                        }}
                        onClick={() => setTransferMethod("paypal")}
                      >
                        <span style={classificationLabel}>Get paid via PayPal</span>
                      </button>
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage("none")}
                      >
                        Back
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        onClick={() => setTransferStage("details")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "details" && (
                <div style={transferScene}>
                  <div style={transferPanelLarge}>
                    <div style={transferPanelTitle}>
                      {transferMethod === "bank" ? "Bank Account Details" : "PayPal Details"}
                    </div>

                    <div style={formGridSingle}>
                      {transferMethod === "bank" ? (
                        <>
                          <input
                            style={transferInput}
                            placeholder="Account holder name"
                            value={bankForm.accountHolder}
                            onChange={(e) =>
                              setBankForm((prev) => ({ ...prev, accountHolder: e.target.value }))
                            }
                          />
                          <input
                            style={transferInput}
                            placeholder="Bank name"
                            value={bankForm.bankName}
                            onChange={(e) =>
                              setBankForm((prev) => ({ ...prev, bankName: e.target.value }))
                            }
                          />
                          <input
                            style={transferInput}
                            placeholder="Account number"
                            value={bankForm.accountNumber}
                            onChange={(e) =>
                              setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                            }
                          />
                          <input
                            style={transferInput}
                            placeholder="Routing number"
                            value={bankForm.routingNumber}
                            onChange={(e) =>
                              setBankForm((prev) => ({ ...prev, routingNumber: e.target.value }))
                            }
                          />
                          <input
                            style={transferInput}
                            type="email"
                            placeholder="Email for transfer updates"
                            value={bankForm.email}
                            onChange={(e) =>
                              setBankForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <input
                            style={transferInput}
                            placeholder="Full name"
                            value={payPalForm.fullName}
                            onChange={(e) =>
                              setPayPalForm((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                          />
                          <input
                            style={transferInput}
                            type="email"
                            placeholder="PayPal email"
                            value={payPalForm.paypalEmail}
                            onChange={(e) =>
                              setPayPalForm((prev) => ({ ...prev, paypalEmail: e.target.value }))
                            }
                          />
                        </>
                      )}
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage("method")}
                      >
                        Back
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        disabled={!detailsFormReady}
                        onClick={() => setTransferStage("verify")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "verify" && (
                <div style={transferScene}>
                  <div style={transferPanelLarge}>
                    <div style={transferPanelTitle}>Verify Your Identity</div>
                    <div style={formGridSingle}>
                      <input
                        style={transferInput}
                        placeholder="Legal name"
                        value={identityForm.legalName}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, legalName: e.target.value }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="Address"
                        value={identityForm.address}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, address: e.target.value }))
                        }
                      />
                      <div style={formGridTriple}>
                        <input
                          style={transferInput}
                          placeholder="City"
                          value={identityForm.city}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="State"
                          value={identityForm.state}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({ ...prev, state: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="ZIP"
                          value={identityForm.zip}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({ ...prev, zip: e.target.value }))
                          }
                        />
                      </div>
                      <input
                        style={transferInput}
                        type="date"
                        value={identityForm.dateOfBirth}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                        }
                      />
                      <label style={attestationRow}>
                        <input
                          type="checkbox"
                          checked={identityForm.attestationAccepted}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              attestationAccepted: e.target.checked,
                            }))
                          }
                        />
                        I confirm this information is accurate and I authorize ORC to process this withdrawal.
                      </label>
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage("details")}
                      >
                        Back
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        disabled={!identityFormReady}
                        onClick={() => setTransferStage("confirm")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "confirm" && (
                <div style={transferScene}>
                  <div style={confirmTransferPanel}>
                    <div style={confirmTransferTitle}>Confirm Withdrawal</div>
                    <div style={confirmTransferAmount}>{transferAmountLabel} USD</div>

                    <div style={confirmTransferGrid}>
                      <span style={confirmTransferLabel}>Method:</span>
                      <span style={confirmTransferValue}>
                        {transferMethod === "bank" ? "Bank Account" : "PayPal"}
                      </span>
                      <span style={confirmTransferLabel}>Destination:</span>
                      <span style={confirmTransferValue}>{withdrawalEmail}</span>
                      <span style={confirmTransferLabel}>From:</span>
                      <span style={confirmTransferValue}>ORC Wallet</span>
                      <span style={confirmTransferLabel}>Funds will arrive:</span>
                      <span style={confirmTransferValue}>1-3 business days</span>
                      <span style={confirmTransferLabel}>Fee:</span>
                      <span style={confirmTransferValue}>Processed by payout provider</span>
                      <span style={confirmTransferLabel}>Total:</span>
                      <span style={confirmTransferValue}>{transferAmountLabel}</span>
                    </div>

                    {transferSubmitErr && (
                      <div style={transferValidationText}>{transferSubmitErr}</div>
                    )}

                    <button
                      style={transferPrimaryButton}
                      type="button"
                      onClick={() => void submitTransfer()}
                      disabled={transferSubmitting}
                    >
                      {transferSubmitting ? "Submitting..." : "Submit Withdrawal"}
                    </button>
                  </div>
                </div>
              )}

              {transferStage === "success" && (
                <div style={transferScene}>
                  <div style={successPanel}>
                    <div style={successIconCircle} aria-hidden="true">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2 3 7v2h18V7l-9-5Zm7 8H5v8h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-8ZM3 21h18v-2H3v2Z" />
                      </svg>
                    </div>
                    <div style={successTitle}>Your transaction has been sent.</div>
                    <div style={successSub}>
                      We&apos;ll notify you when your transaction is complete. You can check your account for updates.
                    </div>
                    <button
                      style={successButton}
                      type="button"
                      onClick={() => setTransferStage("none")}
                    >
                      View your account
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "add cash" && (
            <div style={addCashWrap}>
              {addCashStage === "entry" && (
                <>
                  <div style={amountPill}>
                    <span style={amountPrefix}>$</span>
                    <input
                      value={addCashAmount}
                      onChange={(e) => setAddCashAmount(sanitizeUsdInput(e.target.value))}
                      inputMode="decimal"
                      pattern="\\d*(\\.\\d{0,2})?"
                      style={amountInput}
                      aria-label="Amount in USD"
                    />
                    <span style={amountSuffix}>USD</span>
                  </div>

                  <div style={addCashDetails}>
                    <div style={detailRow}>
                      <div style={detailIconCircle} aria-hidden="true">
                        $
                      </div>
                      <div style={detailText}>
                        <div style={detailTitle}>Add Cash to</div>
                        <div style={detailSub}>United States Dollar</div>
                      </div>
                    </div>

                    <div style={detailRow}>
                      <div style={detailIcon} aria-hidden="true">
                        <svg
                          width="34"
                          height="34"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 3 2 9v2h20V9L12 3Zm8 8H4v9h2v-7h2v7h2v-7h2v7h2v-7h2v7h2v-9ZM2 22h20v-2H2v2Z" />
                        </svg>
                      </div>
                      <div style={detailText}>
                        <div style={detailTitle}>From</div>
                        <div style={detailSub}>Bank</div>
                      </div>
                    </div>
                  </div>

                  {addCashErr && <div style={addCashError}>{addCashErr}</div>}

                  <button
                    style={addCashContinueButton}
                    type="button"
                    onClick={startStripeAddCashFlow}
                    disabled={addCashLoading}
                  >
                    {addCashLoading ? "Starting..." : "Continue"}
                  </button>
                </>
              )}

              {addCashStage === "payment" && stripeClientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                  <AddCashStripeFlow
                    amountUsd={parsedAddCashAmount}
                    onBack={() => {
                      setAddCashErr(null);
                      setStripeClientSecret(null);
                      setAddCashStage("entry");
                    }}
                    onSuccess={() => {
                      // Stripe webhook finalizes wallet credit server-side.
                      // UI switches to success and refreshes authoritative data.
                      setAddCashStage("success");
                      void loadWalletData();
                    }}
                  />
                </Elements>
              )}

              {addCashStage === "success" && (
                <div style={successPanel}>
                  <div style={successIconCircle} aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2 3 7v2h18V7l-9-5Zm7 8H5v8h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-8ZM3 21h18v-2H3v2Z" />
                    </svg>
                  </div>
                  <div style={successTitle}>Payment submitted.</div>
                  <div style={successSub}>
                    Your wallet will update after Stripe webhook confirmation. Refresh or check transactions shortly.
                  </div>
                  <button
                    style={successButton}
                    type="button"
                    onClick={() => {
                      setTab("wallet");
                      setAddCashStage("entry");
                      setStripeClientSecret(null);
                    }}
                  >
                    View your account
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "transactions" && (
            <div style={txWrap}>
              {txLoading && <div style={txEmptyText}>Loading transactions…</div>}
              {txErr && <div style={txErrorText}>{txErr}</div>}

              {!txLoading && !txErr && transactions.length === 0 && (
                <div style={txEmptyText}>No transactions yet.</div>
              )}

              <ul style={txList}>
                {transactions.map((tx) => (
                  <li key={tx.id} style={txItem}>
                    <div>
                      <div style={txTitle}>{tx.label}</div>
                      <div style={txSub}>{tx.source}</div>
                    </div>
                    <div
                      style={{
                        ...txAmt,
                        color:
                          tx.kind === "pos"
                            ? "rgba(120,255,120,0.9)"
                            : "rgba(255,120,120,0.9)",
                      }}
                    >
                      {tx.amountLabel}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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

/* Header stays anchored */
const headerBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const logoutButton: React.CSSProperties = {
  height: 36,
  minWidth: 90,
  borderRadius: 999,
  border: "1.5px solid rgba(247,208,35,0.4)",
  background: "transparent",
  color: "#F7D023",
  fontWeight: 700,
  fontSize: 13,
  padding: "0 16px",
  marginRight: 56,
  cursor: "pointer",
};

const loginPanel: React.CSSProperties = {
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

const loginTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 28,
  color: "#F7D023",
  marginBottom: 28,
  textAlign: "center",
};

const loginForm: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const loginField: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const loginLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(255,255,255,0.65)",
  letterSpacing: "0.02em",
};

const loginInput: React.CSSProperties = {
  height: 48,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.07)",
  color: "#fff",
  fontSize: 15,
  padding: "0 14px",
  outline: "none",
};

const loginError: React.CSSProperties = {
  color: "salmon",
  fontSize: 13,
  fontWeight: 600,
  marginTop: -6,
};

const loginSubmitBtn: React.CSSProperties = {
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
  overflowY: "auto",
  paddingBottom: 24,
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
  textTransform: "none",
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
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const tokenLabelRow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const tokenIcon: React.CSSProperties = {
  width: 48,
  height: 48,
  objectFit: "contain",
  display: "block",
};

const tokenLabel: React.CSSProperties = {
  color: "#FFBD16",
  fontWeight: 700,
  fontSize: 24,
  lineHeight: 1.1,
};

const gm: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  lineHeight: 1,
};

const conversionLine: React.CSSProperties = {
  marginTop: 6,
  fontSize: 44,
  fontWeight: 800,
  lineHeight: 1,
  opacity: 0.9,
  display: "inline-flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const conversionMuted: React.CSSProperties = {
  marginLeft: 0,
  fontSize: 34,
  fontWeight: 700,
  opacity: 0.75,
  lineHeight: 1,
  transform: "translateY(-2px)",
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

const transferAmountWrap: React.CSSProperties = {
  marginTop: 40,
  width: "min(260px, 90vw)",
  background: "rgba(255,255,255,0.95)",
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  color: "#111",
  boxSizing: "border-box",
};

const transferAmountPrefix: React.CSSProperties = {
  fontWeight: 800,
};

const transferAmountSuffix: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 12,
  marginRight: 2,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const transferAmountInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 16,
  fontWeight: 700,
  color: "#111",
};

const transferHint: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "rgba(255,255,255,0.78)",
};

const transferValidationText: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "salmon",
  fontWeight: 600,
  maxWidth: 280,
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

const addCashDetails: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 30,
  marginTop: 18,
};

const addCashContinueButton: React.CSSProperties = {
  ...primary,
  width: 180,
  marginTop: 14,
};

const addCashError: React.CSSProperties = {
  marginTop: 8,
  color: "salmon",
  fontWeight: 600,
  fontSize: 13,
};

const detailRow: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
};

const detailIconCircle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 999,
  border: "2px solid rgba(255,255,255,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 900,
  fontSize: 20,
  lineHeight: 1,
  flex: "0 0 auto",
};

const detailIcon: React.CSSProperties = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  flex: "0 0 auto",
};

const detailText: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const detailTitle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1.05,
  color: "#fff",
};

const detailSub: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  lineHeight: 1.05,
  color: "rgba(255,255,255,0.55)",
};

const successPanel: React.CSSProperties = {
  marginTop: 40,
  width: "min(520px, 92vw)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.98)",
  padding: "40px 26px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const successIconCircle: React.CSSProperties = {
  width: 90,
  height: 90,
  borderRadius: 999,
  background: "#0052B4",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const successTitle: React.CSSProperties = {
  marginTop: 18,
  color: "#111",
  fontSize: 18,
  fontWeight: 700,
  textAlign: "center",
};

const successSub: React.CSSProperties = {
  marginTop: 10,
  color: "rgba(17,17,17,0.72)",
  fontSize: 13,
  fontWeight: 500,
  textAlign: "center",
  maxWidth: 360,
  lineHeight: 1.4,
};

const successButton: React.CSSProperties = {
  marginTop: 22,
  height: 36,
  minWidth: 180,
  borderRadius: 999,
  border: "none",
  background: "#0052B4",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const transferScene: React.CSSProperties = {
  marginTop: 30,
  width: "min(1100px, 100%)",
  minHeight: 440,
  background: "#E8E8E8",
  borderRadius: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "26px 16px 36px",
  boxSizing: "border-box",
};

const transferPanel: React.CSSProperties = {
  width: "min(520px, 92vw)",
  background: "rgba(255,255,255,0.97)",
  borderRadius: 12,
  padding: 22,
  boxSizing: "border-box",
  color: "#111",
};

const transferPanelLarge: React.CSSProperties = {
  ...transferPanel,
  width: "min(640px, 92vw)",
};

const transferPanelSmall: React.CSSProperties = {
  ...transferPanel,
  width: "min(420px, 92vw)",
  textAlign: "center",
};

const transferPanelTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 14,
};

const transferSubText: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(17,17,17,0.7)",
  marginBottom: 16,
  lineHeight: 1.4,
};

const classificationList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const classificationOption: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 8,
  border: "1px solid rgba(17,17,17,0.12)",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  textAlign: "left",
  padding: "12px 14px",
};

const classificationLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(17,17,17,0.92)",
};

const formGridSingle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const formGridTriple: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 8,
};

const transferInput: React.CSSProperties = {
  width: "100%",
  borderRadius: 6,
  border: "1px solid rgba(17,17,17,0.2)",
  height: 36,
  padding: "0 10px",
  fontSize: 14,
  boxSizing: "border-box",
};

const attestationRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 12,
  lineHeight: 1.35,
  color: "rgba(17,17,17,0.82)",
};

const transferActionsRow: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const transferPrimaryButton: React.CSSProperties = {
  height: 34,
  minWidth: 110,
  borderRadius: 999,
  border: "none",
  background: "#0052B4",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 16px",
};

const transferSecondaryButton: React.CSSProperties = {
  height: 34,
  minWidth: 90,
  borderRadius: 999,
  border: "1px solid rgba(17,17,17,0.22)",
  background: "#fff",
  color: "#111",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 16px",
};

const reviewBlock: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  color: "rgba(17,17,17,0.85)",
};

const reviewItem: React.CSSProperties = {
  lineHeight: 1.4,
};

const confirmTransferPanel: React.CSSProperties = {
  width: "min(520px, 92vw)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.97)",
  padding: "24px 22px",
  boxSizing: "border-box",
  color: "#111",
};

const confirmTransferTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 30,
  fontWeight: 700,
};

const confirmTransferAmount: React.CSSProperties = {
  textAlign: "center",
  marginTop: 8,
  fontSize: 28,
  color: "#0052B4",
  fontWeight: 700,
};

const confirmTransferGrid: React.CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  fontSize: 14,
};

const confirmTransferLabel: React.CSSProperties = {
  color: "rgba(17,17,17,0.7)",
};

const confirmTransferValue: React.CSSProperties = {
  textAlign: "right",
  fontWeight: 600,
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

const txErrorText: React.CSSProperties = {
  marginBottom: 10,
  color: "salmon",
  fontSize: 13,
  fontWeight: 600,
};

const txEmptyText: React.CSSProperties = {
  marginBottom: 10,
  color: "rgba(255,255,255,0.72)",
  fontSize: 14,
  fontWeight: 600,
};

const txAmt: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
};
