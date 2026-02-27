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
type TransferStage =
  | "none"
  | "classification"
  | "w9"
  | "w8ben"
  | "review"
  | "submitted"
  | "confirm"
  | "success";

type TaxResidency = "us" | "non_us";

type TransferFormData = {
  fullName: string;
  businessName: string;
  federalTaxClass: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxId: string;
  attestationAccepted: boolean;
  signatureName: string;
};

type W8BenFormData = {
  fullName: string;
  countryOfCitizenship: string;
  permanentAddress: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  foreignTaxId: string;
  usTin: string;
  dateOfBirth: string;
  attestationAccepted: boolean;
  signatureName: string;
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
  const [err, setErr] = useState<string | null>(null);
  const [devLoginLoading, setDevLoginLoading] = useState(false);
  const [devLoginErr, setDevLoginErr] = useState<string | null>(null);
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
  const [taxResidency, setTaxResidency] = useState<TaxResidency>("us");
  const [transferForm, setTransferForm] = useState<TransferFormData>({
    fullName: "",
    businessName: "",
    federalTaxClass: "Individual / Sole Proprietor",
    address: "",
    city: "",
    state: "",
    zip: "",
    taxId: "",
    attestationAccepted: false,
    signatureName: "",
  });
  const [w8BenForm, setW8BenForm] = useState<W8BenFormData>({
    fullName: "",
    countryOfCitizenship: "",
    permanentAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    foreignTaxId: "",
    usTin: "",
    dateOfBirth: "",
    attestationAccepted: false,
    signatureName: "",
  });

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
    loadWalletData();
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
  const selectedTaxForm = taxResidency === "us" ? "W-9" : "W-8BEN";

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
      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: parsedAddCashAmount }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to start Stripe flow");
      }

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

  const submitTransfer = () => {
    const transferUsd = Number.isFinite(parsedTransferAmount) ? parsedTransferAmount : 0;
    const baselineGains = profile?.gains ?? 0;
    const gmToDeduct = transferUsd / USD_PER_GM;
    const expectedGains = Math.max(0, Number((baselineGains - gmToDeduct).toFixed(2)));

    const transferTx: TransactionItem = {
      id: `transfer-${Date.now()}`,
      label: "Transfer Submitted",
      source: "Wallet Transfer",
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
  };

  const w9FormReady =
    transferForm.fullName.trim() !== "" &&
    transferForm.address.trim() !== "" &&
    transferForm.city.trim() !== "" &&
    transferForm.state.trim() !== "" &&
    transferForm.zip.trim() !== "" &&
    transferForm.taxId.trim() !== "" &&
    transferForm.attestationAccepted &&
    transferForm.signatureName.trim() !== "";

  const w8FormReady =
    w8BenForm.fullName.trim() !== "" &&
    w8BenForm.countryOfCitizenship.trim() !== "" &&
    w8BenForm.permanentAddress.trim() !== "" &&
    w8BenForm.city.trim() !== "" &&
    w8BenForm.postalCode.trim() !== "" &&
    w8BenForm.country.trim() !== "" &&
    w8BenForm.dateOfBirth.trim() !== "" &&
    w8BenForm.country.toLowerCase() !== "united states" &&
    w8BenForm.country.toLowerCase() !== "us" &&
    w8BenForm.country.toLowerCase() !== "usa" &&
    w8BenForm.attestationAccepted &&
    w8BenForm.signatureName.trim() !== "";

  const handleDevSeedLogin = async () => {
    setDevLoginLoading(true);
    setDevLoginErr(null);

    try {
      await playerApi.login("donna", "donnapass");
      await loadWalletData();
    } catch (e: unknown) {
      setDevLoginErr(e instanceof Error ? e.message : "Seeded login failed");
    } finally {
      setDevLoginLoading(false);
    }
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
          {process.env.NODE_ENV !== "production" && (
            <div style={devActions}>
              <button
                type="button"
                style={devLoginButton}
                onClick={handleDevSeedLogin}
                disabled={devLoginLoading}
              >
                {devLoginLoading ? "Logging in..." : "Login Seed User"}
              </button>
              {devLoginErr && <div style={devLoginError}>{devLoginErr}</div>}
            </div>
          )}
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
                      setTaxResidency("us");
                      setTransferForm((prev) => ({
                        ...prev,
                        federalTaxClass: "Individual / Sole Proprietor",
                      }));
                      if (hasValidTransferAmount) {
                        setTransferStage("classification");
                      }
                    }}
                    disabled={!hasValidTransferAmount}
                  >
                    Transfer
                  </button>
                </div>
              )}

              {transferStage === "classification" && (
                <div style={transferScene}>
                  <div style={transferPanel}>
                    <div style={transferPanelTitle}>Tax Classification</div>
                    <div style={classificationList}>
                      <button
                        type="button"
                        style={{
                          ...classificationOption,
                          borderColor:
                            taxResidency === "us"
                              ? "rgba(0,82,180,0.45)"
                              : "rgba(17,17,17,0.15)",
                          background:
                            taxResidency === "us"
                              ? "rgba(0,82,180,0.08)"
                              : "#fff",
                        }}
                        onClick={() => setTaxResidency("us")}
                      >
                        <span style={classificationLabel}>🇺🇸 I am a U.S. Person (complete W-9)</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          ...classificationOption,
                          borderColor:
                            taxResidency === "non_us"
                              ? "rgba(0,82,180,0.45)"
                              : "rgba(17,17,17,0.15)",
                          background:
                            taxResidency === "non_us"
                              ? "rgba(0,82,180,0.08)"
                              : "#fff",
                        }}
                        onClick={() => setTaxResidency("non_us")}
                      >
                        <span style={classificationLabel}>🌐 I am a non-U.S. person (complete W-8BEN)</span>
                      </button>
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        onClick={() => setTransferStage(taxResidency === "us" ? "w9" : "w8ben")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "w9" && (
                <div style={transferScene}>
                  <div style={transferPanelLarge}>
                    <div style={transferPanelTitle}>W-9 Form (U.S. Person)</div>

                    <div style={formGridSingle}>
                      <input
                        style={transferInput}
                        placeholder="Legal name"
                        value={transferForm.fullName}
                        onChange={(e) =>
                          setTransferForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="Business name / DBA (optional)"
                        value={transferForm.businessName}
                        onChange={(e) =>
                          setTransferForm((prev) => ({ ...prev, businessName: e.target.value }))
                        }
                      />
                      <select
                        style={transferInput}
                        value={transferForm.federalTaxClass}
                        onChange={(e) =>
                          setTransferForm((prev) => ({ ...prev, federalTaxClass: e.target.value }))
                        }
                      >
                        <option>Individual / Sole Proprietor</option>
                        <option>C-Corp</option>
                        <option>S-Corp</option>
                        <option>Partnership</option>
                        <option>LLC (Single Member)</option>
                        <option>Other</option>
                      </select>
                      <input
                        style={transferInput}
                        placeholder="Address"
                        value={transferForm.address}
                        onChange={(e) =>
                          setTransferForm((prev) => ({ ...prev, address: e.target.value }))
                        }
                      />
                      <div style={formGridTriple}>
                        <input
                          style={transferInput}
                          placeholder="City"
                          value={transferForm.city}
                          onChange={(e) =>
                            setTransferForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="State"
                          value={transferForm.state}
                          onChange={(e) =>
                            setTransferForm((prev) => ({ ...prev, state: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="ZIP"
                          value={transferForm.zip}
                          onChange={(e) =>
                            setTransferForm((prev) => ({ ...prev, zip: e.target.value }))
                          }
                        />
                      </div>
                      <input
                        style={transferInput}
                        placeholder="TIN (SSN or EIN)"
                        value={transferForm.taxId}
                        onChange={(e) =>
                          setTransferForm((prev) => ({ ...prev, taxId: e.target.value }))
                        }
                      />

                      <label style={attestationRow}>
                        <input
                          type="checkbox"
                          checked={transferForm.attestationAccepted}
                          onChange={(e) =>
                            setTransferForm((prev) => ({
                              ...prev,
                              attestationAccepted: e.target.checked,
                            }))
                          }
                        />
                        Under penalties of perjury, I certify this information is true and I am a US person for tax purposes.
                      </label>

                      <input
                        style={transferInput}
                        placeholder="Typed signature"
                        value={transferForm.signatureName}
                        onChange={(e) =>
                          setTransferForm((prev) => ({
                            ...prev,
                            signatureName: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage("classification")}
                      >
                        Back
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        disabled={!w9FormReady}
                        onClick={() => setTransferStage("review")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "w8ben" && (
                <div style={transferScene}>
                  <div style={transferPanelLarge}>
                    <div style={transferPanelTitle}>W-8BEN Form (Non-U.S. Person)</div>

                    <div style={formGridSingle}>
                      <input
                        style={transferInput}
                        placeholder="Legal name"
                        value={w8BenForm.fullName}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="Country of citizenship"
                        value={w8BenForm.countryOfCitizenship}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({
                            ...prev,
                            countryOfCitizenship: e.target.value,
                          }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="Permanent address"
                        value={w8BenForm.permanentAddress}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({
                            ...prev,
                            permanentAddress: e.target.value,
                          }))
                        }
                      />
                      <div style={formGridTriple}>
                        <input
                          style={transferInput}
                          placeholder="City"
                          value={w8BenForm.city}
                          onChange={(e) =>
                            setW8BenForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="Region"
                          value={w8BenForm.region}
                          onChange={(e) =>
                            setW8BenForm((prev) => ({ ...prev, region: e.target.value }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="Postal code"
                          value={w8BenForm.postalCode}
                          onChange={(e) =>
                            setW8BenForm((prev) => ({ ...prev, postalCode: e.target.value }))
                          }
                        />
                      </div>
                      <input
                        style={transferInput}
                        placeholder="Country (non-US)"
                        value={w8BenForm.country}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({ ...prev, country: e.target.value }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="Foreign tax ID (optional)"
                        value={w8BenForm.foreignTaxId}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({
                            ...prev,
                            foreignTaxId: e.target.value,
                          }))
                        }
                      />
                      <input
                        style={transferInput}
                        placeholder="US TIN (optional)"
                        value={w8BenForm.usTin}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({ ...prev, usTin: e.target.value }))
                        }
                      />
                      <input
                        style={transferInput}
                        type="date"
                        value={w8BenForm.dateOfBirth}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({
                            ...prev,
                            dateOfBirth: e.target.value,
                          }))
                        }
                      />

                      <label style={attestationRow}>
                        <input
                          type="checkbox"
                          checked={w8BenForm.attestationAccepted}
                          onChange={(e) =>
                            setW8BenForm((prev) => ({
                              ...prev,
                              attestationAccepted: e.target.checked,
                            }))
                          }
                        />
                        Under penalties of perjury, I certify that I am the beneficial owner and a non-US person.
                      </label>

                      <input
                        style={transferInput}
                        placeholder="Typed signature"
                        value={w8BenForm.signatureName}
                        onChange={(e) =>
                          setW8BenForm((prev) => ({
                            ...prev,
                            signatureName: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage("classification")}
                      >
                        Back
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        disabled={!w8FormReady}
                        onClick={() => setTransferStage("review")}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "review" && (
                <div style={transferScene}>
                  <div style={transferPanel}>
                    <div style={transferPanelTitle}>Review Your Information</div>
                    <div style={reviewBlock}>
                      <div style={reviewItem}><strong>Form Type:</strong> {selectedTaxForm}</div>
                      {taxResidency === "us" ? (
                        <>
                          <div style={reviewItem}><strong>Name:</strong> {transferForm.fullName}</div>
                          <div style={reviewItem}><strong>Tax Class:</strong> {transferForm.federalTaxClass}</div>
                          <div style={reviewItem}><strong>Address:</strong> {transferForm.address}, {transferForm.city}, {transferForm.state} {transferForm.zip}</div>
                          <div style={reviewItem}><strong>TIN:</strong> ••••{transferForm.taxId.slice(-4)}</div>
                        </>
                      ) : (
                        <>
                          <div style={reviewItem}><strong>Name:</strong> {w8BenForm.fullName}</div>
                          <div style={reviewItem}><strong>Citizenship:</strong> {w8BenForm.countryOfCitizenship}</div>
                          <div style={reviewItem}><strong>Address:</strong> {w8BenForm.permanentAddress}, {w8BenForm.city}, {w8BenForm.region} {w8BenForm.postalCode}, {w8BenForm.country}</div>
                          <div style={reviewItem}><strong>DOB:</strong> {w8BenForm.dateOfBirth}</div>
                        </>
                      )}
                    </div>

                    <div style={transferActionsRow}>
                      <button
                        style={transferSecondaryButton}
                        type="button"
                        onClick={() => setTransferStage(taxResidency === "us" ? "w9" : "w8ben")}
                      >
                        Edit
                      </button>
                      <button
                        style={transferPrimaryButton}
                        type="button"
                        onClick={() => setTransferStage("submitted")}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferStage === "submitted" && (
                <div style={transferScene}>
                  <div style={transferPanelSmall}>
                    <div style={transferPanelTitle}>Submission Complete!</div>
                    <div style={transferSubText}>
                      Your tax form has been submitted successfully. You can continue with your transfer.
                    </div>
                    <button
                      style={transferPrimaryButton}
                      type="button"
                      onClick={() => setTransferStage("confirm")}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {transferStage === "confirm" && (
                <div style={transferScene}>
                  <div style={confirmTransferPanel}>
                    <div style={confirmTransferTitle}>Confirm</div>
                    <div style={confirmTransferAmount}>{transferAmountLabel} USD</div>

                    <div style={confirmTransferGrid}>
                      <span style={confirmTransferLabel}>To:</span>
                      <span style={confirmTransferValue}>Off-Road Champion Wallet</span>
                      <span style={confirmTransferLabel}>From:</span>
                      <span style={confirmTransferValue}>USD Wallet</span>
                      <span style={confirmTransferLabel}>Funds will arrive:</span>
                      <span style={confirmTransferValue}>Instantly</span>
                      <span style={confirmTransferLabel}>Fee:</span>
                      <span style={confirmTransferValue}>$0.00</span>
                      <span style={confirmTransferLabel}>Total:</span>
                      <span style={confirmTransferValue}>{transferAmountLabel}</span>
                    </div>

                    <button
                      style={transferPrimaryButton}
                      type="button"
                      onClick={submitTransfer}
                    >
                      Transfer
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
                    style={{ ...primary, width: 180 }}
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
                      const baselineGains = profile?.gains ?? 0;
                      const gmToAdd = parsedAddCashAmount / USD_PER_GM;
                      const expectedGains = Number((baselineGains + gmToAdd).toFixed(2));

                      setProfile((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          gains: Number((prev.gains + gmToAdd).toFixed(2)),
                        };
                      });

                      const successTx: TransactionItem = {
                        id: `stripe-${Date.now()}`,
                        label: "Add Cash",
                        source: "Stripe",
                        amountLabel: `+$${parsedAddCashAmount.toFixed(2)}`,
                        kind: "pos",
                      };
                      setTransactions((prev) => [successTx, ...prev]);
                      setAddCashStage("success");

                      void safeSyncProfileAfterMutation(expectedGains);
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
                  <div style={successTitle}>Your transaction has been sent.</div>
                  <div style={successSub}>
                    We&apos;ll notify you when your transaction is complete. You can check your account for updates.
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

const devActions: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
};

const devLoginButton: React.CSSProperties = {
  height: 32,
  minWidth: 132,
  borderRadius: 999,
  border: "none",
  background: "rgba(0,82,180,0.95)",
  color: "#fff",
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer",
  fontSize: 12,
};

const devLoginError: React.CSSProperties = {
  color: "salmon",
  fontSize: 11,
  fontWeight: 600,
  maxWidth: 220,
  textAlign: "right",
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
  marginTop: 12,
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
  gap: 22,
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
