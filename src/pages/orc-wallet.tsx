"use client";

import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { playerApi, type StripePayoutQuote } from "@/services/playerApi";
import AddCashStripeFlow from "@/components/wallet/AddCashStripeFlow";
import AddCashPayPalFlow from "@/components/wallet/AddCashPayPalFlow";
import {
  FaUniversity,
  FaGlobeAmericas,
  FaPaypal,
  FaStripe,
} from "react-icons/fa";
import { SiCashapp, SiCoinbase } from "react-icons/si";
import { US } from "country-flag-icons/react/3x2";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
countries.registerLocale(enLocale);
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

type AddCashStage =
  | "entry"
  | "payment"
  | "paypal-checkout"
  | "confirm"
  | "success";

type AddCashMethod = "bank_transfer" | "cashapp" | "paypal" | "coinbase";
type AddCashOutcome = "credited" | "pending";

type TransferStage =
  | "none"
  | "tax-classification"
  | "w9"
  | "w8ben"
  | "tax-review"
  | "tax-submission-complete"
  | "method"
  | "details"
  | "verify"
  | "confirm"
  | "success";
type WithdrawalMethod = "bank" | "paypal" | "stripe";
type PayoutMethod = "bank" | "paypal" | "stripe" | "coinbase";

type TaxClassification = "us" | "non-us";

type W9FormData = {
  fullName: string;
  businessName: string;
  federalTaxClassification: string;
  ssnEin: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  signature: string;
  certified: boolean;
};

type W8BENFormData = {
  fullName: string;
  country: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dateOfBirth: string;
  signature: string;
  certified: boolean;
};

type BankTransferFormData = {
  accountHolder: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
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
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

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
  const [approvedPayPalOrderId, setApprovedPayPalOrderId] = useState<
    string | null
  >(null);
  const [addCashMethod, setAddCashMethod] =
    useState<AddCashMethod>("bank_transfer");
  const [addCashOutcome, setAddCashOutcome] =
    useState<AddCashOutcome>("pending");

  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<
    string | null
  >(null);
  const [addCashErr, setAddCashErr] = useState<string | null>(null);
  const [addCashLoading, setAddCashLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [transferStage, setTransferStage] = useState<TransferStage>("none");

  const [taxClassification, setTaxClassification] =
    useState<TaxClassification | null>(null);

  const countryOptions = Object.entries(
    countries.getNames("en", { select: "official" }),
  )
    .map(([code, name]) => ({
      code,
      name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [w9Form, setW9Form] = useState<W9FormData>({
    fullName: "",
    businessName: "",
    federalTaxClassification: "Individual / Sole Proprietor",
    ssnEin: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    signature: "",
    certified: false,
  });

  const [w8benForm, setW8BENForm] = useState<W8BENFormData>({
    fullName: "",
    country: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    dateOfBirth: "",
    signature: "",
    certified: false,
  });

  const [transferAmount, setTransferAmount] = useState<string>("0.00");
  const [transferMethod, setTransferMethod] =
    useState<WithdrawalMethod>("bank");
  const [selectedPayoutMethod, setSelectedPayoutMethod] =
    useState<PayoutMethod | null>(null);
  const [bankForm, setBankForm] = useState<BankTransferFormData>({
    accountHolder: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
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
  const [transferSubmitErr, setTransferSubmitErr] = useState<string | null>(
    null,
  );
  const [connectLoading, setConnectLoading] = useState(false);
  const [stripePayoutQuote, setStripePayoutQuote] =
    useState<StripePayoutQuote | null>(null);

  const mapProfile = (p: Partial<Profile>): Profile => ({
    gains: Number(p.gains) || 0,
    coins: Number(p.coins) || 0,
    coinsTemporal: Number(p.coinsTemporal) || 0,
  });

  const refreshTransactions = async () => {
    try {
      const redemptionsData = await playerApi.getMyRedemptions({
        limit: 50,
        offset: 0,
      });
      const redemptions = Array.isArray(redemptionsData?.redemptions)
        ? (redemptionsData.redemptions as RedemptionRecord[])
        : [];

      const mapped = redemptions.map((redemption, index) => {
        const numericAmount = Number(redemption.amount || 0);
        const amount = Number.isFinite(numericAmount) ? numericAmount : 0;
        const signedAmount = `-$${Math.abs(amount).toFixed(2)}`;
        const statusLabel = redemption.status
          ? redemption.status.toUpperCase()
          : "REQUEST";

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
          (tx) =>
            tx.id.startsWith("stripe-") ||
            tx.id.startsWith("paypal-") ||
            tx.id.startsWith("transfer-"),
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
      const serverProfileRaw =
        (await playerApi.getMyProfile()) as Partial<Profile>;
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
        const statusLabel = redemption.status
          ? redemption.status.toUpperCase()
          : "REQUEST";

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
          (tx) =>
            tx.id.startsWith("stripe-") ||
            tx.id.startsWith("paypal-") ||
            tx.id.startsWith("transfer-"),
        );
        const merged = [...optimistic];
        for (const tx of mapped) {
          if (!merged.some((item) => item.id === tx.id)) {
            merged.push(tx);
          }
        }
        return merged;
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load wallet data";
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

  // After Stripe Connect onboarding redirect, refresh connect status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connectParam = params.get("connect");
    if (
      (connectParam === "return" || connectParam === "refresh") &&
      localStorage.getItem("playerToken")
    ) {
      void playerApi.getConnectStatus().catch(() => {});
      // Clean up the query param without a full page reload
      const url = new URL(window.location.href);
      url.searchParams.delete("connect");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (tab !== "add cash") {
      setAddCashStage("entry");
      setStripeClientSecret(null);
      setStripePaymentIntentId(null);
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
  const selectedPaymentLabel =
    addCashMethod === "bank_transfer"
      ? "Bank Transfer"
      : addCashMethod === "cashapp"
        ? "Cash App Pay"
        : addCashMethod === "paypal"
          ? "PayPal"
          : "Coinbase";
  const maxTransferUsd = profile
    ? Number((profile.gains * USD_PER_GM).toFixed(2))
    : 0;
  const parsedTransferAmount = Number(transferAmount || "0");
  const hasValidTransferAmount =
    Number.isFinite(parsedTransferAmount) &&
    parsedTransferAmount > 0 &&
    parsedTransferAmount <= maxTransferUsd;
  const transferAmountLabel = `$${(hasValidTransferAmount ? parsedTransferAmount : 0).toFixed(2)}`;
  const stripePayoutFeeLabel = `$${Number(
    stripePayoutQuote?.feeAmount || 0,
  ).toFixed(2)}`;
  const stripePayoutNetLabel = `$${Number(
    stripePayoutQuote?.netAmount || 0,
  ).toFixed(2)}`;
  const payoutSuccessAmountLabel =
    transferMethod === "stripe" && stripePayoutQuote
      ? stripePayoutNetLabel
      : transferAmountLabel;
  const bankFormReady =
    bankForm.accountHolder.trim() !== "" &&
    bankForm.routingNumber.trim() !== "" &&
    bankForm.accountNumber.trim() !== "" &&
    bankForm.accountType.trim() !== "";
  const payPalFormReady =
    payPalForm.fullName.trim() !== "" && payPalForm.paypalEmail.trim() !== "";
  const detailsFormReady =
    transferMethod === "stripe"
      ? true
      : transferMethod === "bank"
        ? bankFormReady
        : payPalFormReady;
  const identityFormReady =
    identityForm.legalName.trim() !== "" &&
    identityForm.address.trim() !== "" &&
    identityForm.city.trim() !== "" &&
    identityForm.state.trim() !== "" &&
    identityForm.zip.trim() !== "" &&
    identityForm.dateOfBirth.trim() !== "" &&
    identityForm.attestationAccepted;

  const w9FormReady =
    w9Form.fullName.trim() !== "" &&
    w9Form.federalTaxClassification.trim() !== "" &&
    w9Form.ssnEin.trim() !== "" &&
    w9Form.address.trim() !== "" &&
    w9Form.city.trim() !== "" &&
    w9Form.state.trim() !== "" &&
    w9Form.zip.trim() !== "" &&
    w9Form.signature.trim() !== "" &&
    w9Form.certified;

  const w8benFormReady =
    w8benForm.fullName.trim() !== "" &&
    w8benForm.country.trim() !== "" &&
    w8benForm.address.trim() !== "" &&
    w8benForm.city.trim() !== "" &&
    w8benForm.state.trim() !== "" &&
    w8benForm.zip.trim() !== "" &&
    w8benForm.dateOfBirth.trim() !== "" &&
    w8benForm.signature.trim() !== "" &&
    w8benForm.certified;

  const withdrawalEmail =
    transferMethod === "paypal" ? payPalForm.paypalEmail : "";

  const maskTaxId = (taxId: string) => {
    const visibleCharacters = taxId.slice(-4);

    return visibleCharacters ? `XXX-XX-${visibleCharacters}` : "Not provided";
  };

  const formatAddress = (
    address: string,
    city: string,
    state: string,
    zip: string,
  ) => {
    return [address, city, state, zip]
      .filter((part) => part.trim() !== "")
      .join(", ");
  };

  const formatReviewDate = (date: string) => {
    if (!date) return "";

    const [year, month, day] = date.split("-");

    if (!year || !month || !day) return date;

    return `${month}/${day}/${year}`;
  };

  const getCountryDisplayName = (countryCode: string) => {
    if (!countryCode) return "";

    return (
      countries.getName(countryCode, "en", {
        select: "official",
      }) || countryCode
    );
  };

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
      if (USE_MOCK_API) {
        const paymentIntentId = `pi_mock_${Date.now()}`;
        const depositTx: TransactionItem = {
          id: `stripe-${paymentIntentId}`,
          label: "Cash Added",
          source: selectedPaymentLabel,
          amountLabel: `+$${parsedAddCashAmount.toFixed(2)}`,
          kind: "pos",
        };

        setTransactions((prev) => [depositTx, ...prev]);
        setAddCashOutcome("credited");
        setAddCashStage("success");
        return;
      }

      const data = await playerApi.createStripePaymentIntent({
        amountUsd: parsedAddCashAmount,
        paymentMethodTypes:
          addCashMethod === "bank_transfer" ? ["us_bank_account"] : ["cashapp"],
      });

      if (!data.clientSecret) {
        throw new Error("Stripe client secret is missing");
      }

      if (!data.paymentIntentId) {
        throw new Error("Stripe payment intent id is missing");
      }

      setStripeClientSecret(data.clientSecret);
      setStripePaymentIntentId(data.paymentIntentId);
      setAddCashStage("payment");
    } catch (e: unknown) {
      setAddCashErr(
        e instanceof Error ? e.message : "Unable to start Stripe flow",
      );
    } finally {
      setAddCashLoading(false);
    }
  };

  const startPayPalAddCashFlow = () => {
    if (!Number.isFinite(parsedAddCashAmount) || parsedAddCashAmount < 0.5) {
      setAddCashErr("Minimum amount is $0.50");
      return;
    }

    setAddCashErr(null);
    setApprovedPayPalOrderId(null);
    setAddCashStage("paypal-checkout");
  };

  const captureApprovedPayPalOrder = async () => {
    if (!approvedPayPalOrderId) {
      setAddCashErr("No approved PayPal order was found.");
      return;
    }

    setAddCashLoading(true);
    setAddCashErr(null);

    try {
      await playerApi.capturePayPalOrder({
        orderId: approvedPayPalOrderId,
      });

      const depositTx: TransactionItem = {
        id: `paypal-${approvedPayPalOrderId}`,
        label: "Cash Added",
        source: "PayPal",
        amountLabel: `+$${parsedAddCashAmount.toFixed(2)}`,
        kind: "pos",
      };

      setTransactions((prev) => [depositTx, ...prev]);
      setAddCashOutcome("credited");
      setAddCashStage("success");
      void loadWalletData();
    } catch (error: unknown) {
      setAddCashErr(
        error instanceof Error
          ? error.message
          : "Unable to capture the PayPal payment.",
      );
    } finally {
      setAddCashLoading(false);
    }
  };

  const startCoinbaseComingSoon = () => {
    setAddCashErr("Coinbase payment option is coming soon.");
  };

  const prepareStripePayout = async () => {
    if (!hasValidTransferAmount) {
      setTransferSubmitErr("Enter a valid withdrawal amount.");
      return;
    }

    setTransferSubmitting(true);
    setConnectLoading(true);
    setTransferSubmitErr(null);

    try {
      if (!USE_MOCK_API) {
        const status = await playerApi.getConnectStatus();

        if (!status.complete || !status.payoutsEnabled) {
          const origin = window.location.origin;
          const { onboardingUrl } = await playerApi.getConnectOnboardingUrl({
            returnUrl: `${origin}/orc-wallet?connect=return`,
            refreshUrl: `${origin}/orc-wallet?connect=refresh`,
          });
          window.location.href = onboardingUrl;
          return;
        }
      }

      const quote = await playerApi.getStripePayoutQuote({
        amount: parsedTransferAmount,
      });
      setStripePayoutQuote(quote);
      setTransferMethod("stripe");
      setTransferStage("confirm");
    } catch (e: unknown) {
      setTransferSubmitErr(
        e instanceof Error ? e.message : "Unable to prepare Stripe payout",
      );
    } finally {
      setConnectLoading(false);
      setTransferSubmitting(false);
    }
  };

  const submitStripePayout = async () => {
    const transferUsd = Number.isFinite(parsedTransferAmount)
      ? parsedTransferAmount
      : 0;
    const baselineGains = profile?.gains ?? 0;
    const gmToDeduct = transferUsd / USD_PER_GM;
    const expectedGains = Math.max(
      0,
      Number((baselineGains - gmToDeduct).toFixed(2)),
    );

    if (!hasValidTransferAmount) {
      setTransferSubmitErr("Enter a valid withdrawal amount.");
      return;
    }

    setTransferSubmitting(true);
    setTransferSubmitErr(null);

    try {
      const result = await playerApi.createStripePayout({
        amount: transferUsd,
      });

      setStripePayoutQuote((current) => ({
        grossAmount: String(
          result?.grossAmount || current?.grossAmount || transferUsd,
        ),
        feeAmount: String(result?.feeAmount || current?.feeAmount || 0),
        netAmount: String(
          result?.netAmount || current?.netAmount || transferUsd,
        ),
        currency: String(result?.currency || current?.currency || "USD"),
        feePercent: current?.feePercent || 0,
        fixedFeeCents: current?.fixedFeeCents || 0,
      }));

      const transferTx: TransactionItem = {
        id: String(result?.redemptionId || `stripe-payout-${Date.now()}`),
        label: "Withdrawal Submitted",
        source: "Stripe",
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
      setTransferMethod("stripe");
      setTransferStage("success");
      void safeSyncProfileAfterMutation(expectedGains);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Stripe withdrawal submission failed";
      setTransferSubmitErr(message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    const transferUsd = Number.isFinite(parsedTransferAmount)
      ? parsedTransferAmount
      : 0;
    const baselineGains = profile?.gains ?? 0;
    const gmToDeduct = transferUsd / USD_PER_GM;
    const expectedGains = Math.max(
      0,
      Number((baselineGains - gmToDeduct).toFixed(2)),
    );

    if (!hasValidTransferAmount || !detailsFormReady) {
      setTransferSubmitErr(
        "Complete all required withdrawal fields before submitting.",
      );
      return;
    }

    setTransferSubmitting(true);
    setTransferSubmitErr(null);

    try {
      const result = await playerApi.createRedemption({
        amount: transferUsd,
        email: withdrawalEmail,
        paymentMethod: transferMethod === "paypal" ? "paypal" : "chi_money",
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
      setTransferSubmitErr(
        e instanceof Error ? e.message : "Withdrawal submission failed",
      );
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
      setLoginErr(
        e instanceof Error
          ? e.message
          : "Login failed. Check your credentials.",
      );
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
    setStripePayoutQuote(null);
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
            <div style={accountActions}>
              <button
                type="button"
                style={accountIconButton}
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z" />
                </svg>
              </button>

              <span style={accountDivider} />
            </div>
          )}
        </div>

        {!isAuthenticated ? (
          /* ── Login form ── */
          <div style={centerLane}>
            <div style={loginPanel}>
              <div style={loginTitle}>Sign In</div>
              <form onSubmit={handleLogin} style={loginForm} noValidate>
                <div style={loginField}>
                  <label style={loginLabel} htmlFor="orc-username">
                    Email Address
                  </label>
                  <input
                    id="orc-username"
                    type="email"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    style={loginInput}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div style={loginField}>
                  <label style={loginLabel} htmlFor="orc-password">
                    Password
                  </label>
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
                <button
                  type="submit"
                  style={loginSubmitBtn}
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
              <p style={registerPrompt}>
                Don&apos;t have an account?{" "}
                <a href="/register" style={registerLink}>
                  Create one
                </a>
              </p>
            </div>
          </div>
        ) : (
          /* ── Authenticated: tabs + content ── */
          <div style={centerLane}>
            {/* Tabs (centered) */}
            <div style={tabsWrap}>
              <div style={tabsPill}>
                {(["wallet", "add cash", "transactions"] as TabKey[]).map(
                  (t) => (
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
                  ),
                )}
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

                      <div style={balanceLine}>
                        <span style={gm}>
                          {profile ? profile.gains.toFixed(2) : "—"} GM
                        </span>

                        <span style={gmRate}>$0.01/GM</span>
                      </div>

                      <div style={transferAmountWrap}>
                        <span style={transferAmountPrefix}>$</span>

                        <input
                          value={transferAmount}
                          onChange={(e) => {
                            setTransferAmount(
                              sanitizeUsdInput(e.target.value),
                            );
                            setStripePayoutQuote(null);
                          }}
                          inputMode="decimal"
                          pattern="\\d*(\\.\\d{0,2})?"
                          style={transferAmountInput}
                          aria-label="Transfer amount in USD"
                        />
                      </div>

                      {/* <div style={transferHint}>
                        Available: ${maxTransferUsd.toFixed(2)}
                      </div> */}

                      {!hasValidTransferAmount && (
                        <div style={transferValidationText}>
                          Enter an amount greater than $0.00 and up to $
                          {maxTransferUsd.toFixed(2)}.
                        </div>
                      )}

                      {err && (
                        <div style={{ color: "salmon", marginTop: 8 }}>
                          {err}
                        </div>
                      )}
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
                      Transfer
                    </button>
                  </div>
                )}

                {transferStage === "tax-classification" && (
                  <div style={taxClassificationScene}>
                    <div style={taxClassificationPanel}>
                      <div style={taxClassificationTitle}>
                        Tax Classification
                      </div>

                      <div style={taxClassificationDivider} />

                      <div style={taxClassificationQuestion}>
                        For tax purposes, are you a <strong>US person?</strong>
                      </div>

                      <div style={taxClassificationOptions}>
                        <button
                          type="button"
                          style={taxClassificationOption}
                          onClick={() => setTaxClassification("us")}
                        >
                          <span
                            style={{
                              ...figmaRadioOuter,
                              borderColor:
                                taxClassification === "us"
                                  ? "#2E80C9"
                                  : "#B7C3CE",
                            }}
                          >
                            {taxClassification === "us" && (
                              <span style={figmaRadioInner} />
                            )}
                          </span>

                          <span style={taxIconWrap}>
                            <US title="United States flag" style={usFlagIcon} />
                          </span>

                          <span style={taxClassificationOptionText}>
                            I am a <strong>US Person</strong> (Complete Form
                            W-9)
                          </span>
                        </button>

                        <button
                          type="button"
                          style={taxClassificationOption}
                          onClick={() => setTaxClassification("non-us")}
                        >
                          <span
                            style={{
                              ...figmaRadioOuter,
                              borderColor:
                                taxClassification === "non-us"
                                  ? "#2E80C9"
                                  : "#B7C3CE",
                            }}
                          >
                            {taxClassification === "non-us" && (
                              <span style={figmaRadioInner} />
                            )}
                          </span>

                          <span style={taxIconWrap}>
                            <FaGlobeAmericas size={22} color="#4F6F9F" />
                          </span>

                          <span style={taxClassificationOptionText}>
                            No, I am not a US Person (Complete Form W-8BEN)
                          </span>
                        </button>
                      </div>

                      <div style={taxButtonRow}>
                        <button
                          type="button"
                          style={taxBackButton}
                          onClick={() => {
                            setTaxClassification(null);
                            setTransferStage("none");
                          }}
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          style={{
                            ...taxContinueButton,
                            opacity: taxClassification ? 1 : 0.5,
                            cursor: taxClassification
                              ? "pointer"
                              : "not-allowed",
                          }}
                          disabled={!taxClassification}
                          onClick={() => {
                            if (taxClassification === "us") {
                              setTransferStage("w9");
                            } else {
                              setTransferStage("w8ben");
                            }
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {transferStage === "w9" && (
                  <div style={taxFormScene}>
                    <div style={taxFormPanel}>
                      <div style={taxFormTitle}>W-9 Form (U.S. Person)</div>

                      <div style={taxFormDivider} />

                      <div style={taxFormTwoColumns}>
                        <label style={taxFormField}>
                          <span style={taxFormLabel}>Full Name</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w9Form.fullName}
                            onChange={(e) =>
                              setW9Form((prev) => ({
                                ...prev,
                                fullName: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>
                            Business Name (Optional)
                          </span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w9Form.businessName}
                            onChange={(e) =>
                              setW9Form((prev) => ({
                                ...prev,
                                businessName: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>
                          Federal Tax Classification
                        </span>
                        <select
                          style={taxFormSelect}
                          value={w9Form.federalTaxClassification}
                          onChange={(e) =>
                            setW9Form((prev) => ({
                              ...prev,
                              federalTaxClassification: e.target.value,
                            }))
                          }
                        >
                          <option value="Individual / Sole Proprietor">
                            Individual / Sole Proprietor
                          </option>
                          <option value="C Corporation">C Corporation</option>
                          <option value="S Corporation">S Corporation</option>
                          <option value="Partnership">Partnership</option>
                          <option value="Trust / Estate">Trust / Estate</option>
                          <option value="Limited Liability Company">
                            Limited Liability Company
                          </option>
                        </select>
                      </label>

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>
                          Social Security Number (SSN) or EIN
                        </span>
                        <input
                          type="text"
                          style={taxFormInput}
                          value={w9Form.ssnEin}
                          onChange={(e) =>
                            setW9Form((prev) => ({
                              ...prev,
                              ssnEin: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>Address</span>
                        <input
                          type="text"
                          style={taxFormInput}
                          value={w9Form.address}
                          onChange={(e) =>
                            setW9Form((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <div style={taxFormLocationGrid}>
                        <label style={taxFormField}>
                          <span style={taxFormLabel}>City</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w9Form.city}
                            onChange={(e) =>
                              setW9Form((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>State</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w9Form.state}
                            onChange={(e) =>
                              setW9Form((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>Zip Code</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w9Form.zip}
                            onChange={(e) =>
                              setW9Form((prev) => ({
                                ...prev,
                                zip: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div style={taxFormBottomGrid}>
                        <div>
                          <label style={taxFormField}>
                            <span style={taxFormLabel}>Signature</span>
                            <input
                              type="text"
                              style={taxFormInput}
                              value={w9Form.signature}
                              onChange={(e) =>
                                setW9Form((prev) => ({
                                  ...prev,
                                  signature: e.target.value,
                                }))
                              }
                            />
                          </label>

                          <label style={taxCertificationRow}>
                            <input
                              type="checkbox"
                              checked={w9Form.certified}
                              style={{
                                transform: "scale(1.40)",
                                cursor: "pointer",
                                accentColor: "#348FD3",
                              }}
                              onChange={(e) =>
                                setW9Form((prev) => ({
                                  ...prev,
                                  certified: e.target.checked,
                                }))
                              }
                            />

                            <span>
                              I certify that the information provided is
                              correct.
                            </span>
                          </label>
                        </div>

                        <div style={taxFormActions}>
                          <button
                            type="button"
                            style={{
                              ...taxFormContinueButton,
                              opacity: w9FormReady ? 1 : 0.5,
                              cursor: w9FormReady ? "pointer" : "not-allowed",
                            }}
                            disabled={!w9FormReady}
                            onClick={() => setTransferStage("tax-review")}
                          >
                            Continue
                          </button>

                          <div style={taxFormLinkRow}>
                            <button
                              type="button"
                              style={taxFormLinkButton}
                              onClick={() =>
                                setTransferStage("tax-classification")
                              }
                            >
                              Back
                            </button>

                            <button
                              type="button"
                              style={taxFormLinkButton}
                              onClick={() => {
                                setTransferStage("none");
                                setTaxClassification(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {transferStage === "w8ben" && (
                  <div style={taxFormScene}>
                    <div style={taxFormPanel}>
                      <div style={taxFormTitle}>
                        W-8BEN Form (Non-U.S. Person)
                      </div>

                      <div style={taxFormDivider} />

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>Full Name</span>
                        <input
                          type="text"
                          style={taxFormInput}
                          value={w8benForm.fullName}
                          onChange={(e) =>
                            setW8BENForm((prev) => ({
                              ...prev,
                              fullName: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>Country of Citizenship</span>
                        <select
                          style={taxFormSelect}
                          value={w8benForm.country}
                          onChange={(e) =>
                            setW8BENForm((prev) => ({
                              ...prev,
                              country: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select a country</option>

                          {countryOptions.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={taxFormField}>
                        <span style={taxFormLabel}>Personal Address</span>
                        <input
                          type="text"
                          style={taxFormInput}
                          value={w8benForm.address}
                          onChange={(e) =>
                            setW8BENForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <div style={taxFormLocationGrid}>
                        <label style={taxFormField}>
                          <span style={taxFormLabel}>City</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w8benForm.city}
                            onChange={(e) =>
                              setW8BENForm((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>State</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w8benForm.state}
                            onChange={(e) =>
                              setW8BENForm((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>Zip Code</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w8benForm.zip}
                            onChange={(e) =>
                              setW8BENForm((prev) => ({
                                ...prev,
                                zip: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div style={taxFormTwoColumns}>
                        <label style={taxFormField}>
                          <span style={taxFormLabel}>Date of Birth</span>
                          <input
                            type="date"
                            style={taxFormInput}
                            value={w8benForm.dateOfBirth}
                            onChange={(e) =>
                              setW8BENForm((prev) => ({
                                ...prev,
                                dateOfBirth: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <label style={taxFormField}>
                          <span style={taxFormLabel}>Signature</span>
                          <input
                            type="text"
                            style={taxFormInput}
                            value={w8benForm.signature}
                            onChange={(e) =>
                              setW8BENForm((prev) => ({
                                ...prev,
                                signature: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label style={taxCertificationRow}>
                        <input
                          type="checkbox"
                          checked={w8benForm.certified}
                          style={{
                            transform: "scale(1.35)",
                            cursor: "pointer",
                            accentColor: "#348FD3",
                          }}
                          onChange={(e) =>
                            setW8BENForm((prev) => ({
                              ...prev,
                              certified: e.target.checked,
                            }))
                          }
                        />

                        <span>
                          I certify that the information provided is correct.
                        </span>
                      </label>

                      <div style={taxFormBottomGrid}>
                        <div />

                        <div style={taxFormActions}>
                          <button
                            type="button"
                            style={{
                              ...taxFormContinueButton,
                              opacity: w8benFormReady ? 1 : 0.5,
                              cursor: w8benFormReady
                                ? "pointer"
                                : "not-allowed",
                            }}
                            disabled={!w8benFormReady}
                            onClick={() => setTransferStage("tax-review")}
                          >
                            Continue
                          </button>

                          <div style={taxFormLinkRow}>
                            <button
                              type="button"
                              style={taxFormLinkButton}
                              onClick={() =>
                                setTransferStage("tax-classification")
                              }
                            >
                              Back
                            </button>

                            <button
                              type="button"
                              style={taxFormLinkButton}
                              onClick={() => {
                                setTransferStage("none");
                                setTaxClassification(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {transferStage === "tax-review" && (
                  <div style={taxReviewScene}>
                    <div style={taxReviewPanel}>
                      <div style={taxReviewTitle}>Review Your Information</div>

                      <div style={taxReviewDivider} />

                      <div style={taxReviewSummaryHeading}>
                        {taxClassification === "us"
                          ? "W-9 Form"
                          : "W-8BEN Form"}{" "}
                        <span style={taxReviewSummaryLink}>Summary</span>
                      </div>

                      <div style={taxReviewDivider} />

                      {taxClassification === "us" ? (
                        <div style={taxReviewDetails}>
                          <div>
                            <strong>Full Name:</strong> {w9Form.fullName}
                          </div>

                          {w9Form.businessName.trim() !== "" && (
                            <div>
                              <strong>Business Name:</strong>{" "}
                              {w9Form.businessName}
                            </div>
                          )}

                          <div>
                            <strong>Tax ID:</strong> {maskTaxId(w9Form.ssnEin)}
                          </div>

                          <div>
                            <strong>Address:</strong>{" "}
                            {formatAddress(
                              w9Form.address,
                              w9Form.city,
                              w9Form.state,
                              w9Form.zip,
                            )}
                          </div>

                          <div>
                            <strong>Tax Classification:</strong>{" "}
                            {w9Form.federalTaxClassification}
                          </div>
                        </div>
                      ) : (
                        <div style={taxReviewDetails}>
                          <div>
                            <strong>Full Name:</strong> {w8benForm.fullName}
                          </div>

                          <div>
                            <strong>Country of Citizenship:</strong>{" "}
                            {getCountryDisplayName(w8benForm.country)}
                          </div>

                          <div>
                            <strong>Address:</strong>{" "}
                            {formatAddress(
                              w8benForm.address,
                              w8benForm.city,
                              w8benForm.state,
                              w8benForm.zip,
                            )}
                          </div>

                          <div>
                            <strong>Date of Birth:</strong>{" "}
                            {formatReviewDate(w8benForm.dateOfBirth)}
                          </div>
                        </div>
                      )}

                      <div style={taxReviewButtonRow}>
                        <button
                          type="button"
                          style={taxReviewSubmitButton}
                          onClick={() =>
                            setTransferStage("tax-submission-complete")
                          }
                        >
                          Submit
                        </button>

                        <button
                          type="button"
                          style={taxReviewBackButton}
                          onClick={() =>
                            setTransferStage(
                              taxClassification === "us" ? "w9" : "w8ben",
                            )
                          }
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {transferStage === "tax-submission-complete" && (
                  <div style={taxSubmissionScene}>
                    <div style={taxSubmissionPanel}>
                      <div style={taxSubmissionTitle}>Submission Complete!</div>

                      <div style={taxSubmissionDivider} />

                      <p style={taxSubmissionMessage}>
                        Your tax information has been submitted successfully.
                        You can now proceed with your withdrawal.
                      </p>

                      <button
                        type="button"
                        style={taxSubmissionContinueButton}
                        onClick={() => setTransferStage("confirm")}
                      >
                        Continue
                      </button>

                      {/* <button
        type="button"
        style={taxSubmissionBackButton}
        onClick={() => setTransferStage("tax-review")}
      >
        Back
      </button> */}
                    </div>
                  </div>
                )}

                {transferStage === "method" && (
                  <div style={transferScene}>
                    <div style={payoutMethodPanel}>
                      <div style={payoutMethodTitle}>
                        Off-Road Champion Payout
                      </div>

                      <div style={payoutMethodDivider} />

                      <div style={payoutMethodSubtitle}>
                        Claim Your Prize Money
                      </div>

                      <p style={payoutMethodMessage}>
                        You&apos;ve won {transferAmountLabel}!
                        <br />
                        Choose how you would like to receive your payout.
                      </p>

                      <div style={payoutMethodOptions}>
                        <button
                          type="button"
                          style={{
                            ...payoutMethodOption,
                            ...bankPayoutOption,
                            ...(selectedPayoutMethod === "bank"
                              ? bankPayoutOptionSelected
                              : {}),
                          }}
                          onClick={() => {
                            setTransferSubmitErr(null);
                            setSelectedPayoutMethod("bank");
                          }}
                        >
                          <span style={payoutIconSlot}>
                            <FaUniversity
                              size={36}
                              style={bankIconGraphic}
                              aria-hidden="true"
                            />
                          </span>

                          <span style={bankPayoutText}>
                            Deposit to Bank Account
                          </span>
                        </button>

                        <button
                          type="button"
                          style={{
                            ...payoutMethodOption,
                            ...(selectedPayoutMethod === "paypal"
                              ? payoutMethodOptionSelected
                              : {}),
                          }}
                          onClick={() => {
                            setTransferSubmitErr(null);
                            setSelectedPayoutMethod("paypal");
                          }}
                        >
                          <span style={payoutIconSlot} aria-hidden="true">
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              style={payoutLogoGraphic}
                            >
                              <path
                                fill="#003087"
                                d="M7.2 2h6.1c3.4 0 5.5 1.8 5.1 4.9-.5 4-3.2 5.7-6.8 5.7H10l-.9 5.7H5.3L7.2 2Z"
                              />

                              <path
                                fill="#009CDE"
                                d="M10.1 7.1h4.2c2.9 0 4.7 1.5 4.3 4.2-.4 3.4-2.8 4.9-5.8 4.9h-1.5l-.7 4.8H7.1l2-13.9Z"
                              />
                            </svg>
                          </span>

                          <span style={payoutLabelGroup}>
                            <span style={payoutActionText}>Get paid via</span>
                            <strong style={paypalBrandText}>PayPal</strong>
                          </span>
                        </button>

                        <button
                          type="button"
                          style={{
                            ...payoutMethodOption,
                            ...(selectedPayoutMethod === "stripe"
                              ? payoutMethodOptionSelected
                              : {}),
                          }}
                          onClick={() => {
                            setTransferSubmitErr(null);
                            setSelectedPayoutMethod("stripe");
                          }}
                        >
                          <span style={payoutIconSlot} aria-hidden="true">
                            <FaStripe size={42} color="#635BFF" />
                          </span>

                          <span style={payoutLabelGroup}>
                            <span style={payoutActionText}>Withdraw with</span>
                            <strong style={payoutBrandText}>Stripe</strong>
                          </span>
                        </button>

                        <button
                          type="button"
                          style={{
                            ...payoutMethodOption,
                            ...(selectedPayoutMethod === "coinbase"
                              ? payoutMethodOptionSelected
                              : {}),
                          }}
                          onClick={() => {
                            setTransferSubmitErr(null);
                            setSelectedPayoutMethod("coinbase");
                          }}
                        >
                          <span style={payoutIconSlot} aria-hidden="true">
                            <SiCoinbase size={38} color="#0052FF" />
                          </span>

                          <span style={payoutLabelGroup}>
                            <span style={payoutActionText}>Withdraw with</span>
                            <strong style={payoutBrandText}>Coinbase</strong>
                          </span>
                        </button>
                      </div>

                      <div style={payoutMethodActions}>
                        <button
                          type="button"
                          style={transferSecondaryButton}
                          onClick={() => {
                            setSelectedPayoutMethod(null);
                            setStripePayoutQuote(null);
                            setTransferStage("none");
                          }}
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          disabled={
                            !selectedPayoutMethod ||
                            transferSubmitting ||
                            connectLoading
                          }
                          style={{
                            ...transferPrimaryButton,
                            opacity:
                              selectedPayoutMethod &&
                              !transferSubmitting &&
                              !connectLoading
                                ? 1
                                : 0.5,
                            cursor:
                              selectedPayoutMethod &&
                              !transferSubmitting &&
                              !connectLoading
                              ? "pointer"
                              : "not-allowed",
                          }}
                          onClick={() => {
                            if (selectedPayoutMethod === "bank") {
                              setTransferMethod("bank");
                              setTransferStage("details");
                              return;
                            }

                            if (selectedPayoutMethod === "paypal") {
                              setTransferMethod("paypal");
                              setTransferStage("details");
                              return;
                            }

                            if (selectedPayoutMethod === "stripe") {
                              setTransferMethod("stripe");
                              void prepareStripePayout();
                              return;
                            }

                            if (selectedPayoutMethod === "coinbase") {
                              setTransferSubmitErr(
                                "Coinbase payout integration is coming soon.",
                              );
                            }
                          }}
                        >
                          {transferSubmitting || connectLoading
                            ? "Connecting..."
                            : "Continue"}
                        </button>
                      </div>

                      {transferSubmitErr && (
                        <div style={payoutMethodError}>{transferSubmitErr}</div>
                      )}
                    </div>
                  </div>
                )}

                {transferStage === "details" && (
                  <div style={transferScene}>
                    {transferMethod === "bank" ? (
                      <div style={bankDetailsPanel}>
                        <div style={bankDetailsTitle}>Bank Account Details</div>

                        <div style={bankDetailsSubtitle}>
                          Securely transfer funds to your bank account.
                        </div>

                        <div style={bankDetailsDivider} />

                        <div style={bankDetailsForm}>
                          <label style={bankDetailsField}>
                            <span style={bankDetailsLabel}>Full Name</span>

                            <input
                              type="text"
                              style={bankDetailsInput}
                              value={bankForm.accountHolder}
                              onChange={(event) =>
                                setBankForm((previous) => ({
                                  ...previous,
                                  accountHolder: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label style={bankDetailsField}>
                            <span style={bankDetailsLabel}>Routing Number</span>

                            <input
                              type="text"
                              inputMode="numeric"
                              style={bankDetailsInput}
                              value={bankForm.routingNumber}
                              onChange={(event) =>
                                setBankForm((previous) => ({
                                  ...previous,
                                  routingNumber: event.target.value.replace(
                                    /\D/g,
                                    "",
                                  ),
                                }))
                              }
                            />
                          </label>

                          <label style={bankDetailsField}>
                            <span style={bankDetailsLabel}>Account Number</span>

                            <input
                              type="text"
                              inputMode="numeric"
                              style={bankDetailsInput}
                              value={bankForm.accountNumber}
                              onChange={(event) =>
                                setBankForm((previous) => ({
                                  ...previous,
                                  accountNumber: event.target.value.replace(
                                    /\D/g,
                                    "",
                                  ),
                                }))
                              }
                            />
                          </label>

                          <label style={bankDetailsField}>
                            <span style={bankDetailsLabel}>Account Type</span>

                            <select
                              style={bankDetailsSelect}
                              value={bankForm.accountType}
                              onChange={(event) =>
                                setBankForm((previous) => ({
                                  ...previous,
                                  accountType: event.target.value as
                                    | "checking"
                                    | "savings",
                                }))
                              }
                            >
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                            </select>
                          </label>
                        </div>

                        <div style={bankDetailsActions}>
                          <button
                            type="button"
                            style={bankDetailsBackButton}
                            onClick={() => setTransferStage("method")}
                          >
                            Back
                          </button>

                          <button
                            type="button"
                            disabled={!bankFormReady}
                            style={{
                              ...bankDetailsNextButton,
                              opacity: bankFormReady ? 1 : 0.5,
                              cursor: bankFormReady ? "pointer" : "not-allowed",
                            }}
                            onClick={() => setTransferStage("verify")}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={paypalDetailsPanel}>
                        <div style={paypalDetailsHeader}>
                          <span style={paypalDetailsLogo} aria-hidden="true">
                            <svg width="44" height="44" viewBox="0 0 24 24">
                              <path
                                fill="#003087"
                                d="M7.2 2h6.1c3.4 0 5.5 1.8 5.1 4.9-.5 4-3.2 5.7-6.8 5.7H10l-.9 5.7H5.3L7.2 2Z"
                              />

                              <path
                                fill="#009CDE"
                                d="M10.1 7.1h4.2c2.9 0 4.7 1.5 4.3 4.2-.4 3.4-2.8 4.9-5.8 4.9h-1.5l-.7 4.8H7.1l2-13.9Z"
                              />
                            </svg>
                          </span>

                          <span style={paypalDetailsBrand}>PayPal</span>
                        </div>

                        <p style={paypalDetailsMessage}>
                          Login to your PayPal account to receive your{" "}
                          <strong>{transferAmountLabel}</strong> payout from
                          Off-Road Champion.
                        </p>

                        <div style={paypalDetailsSpacer} />

                        <div style={paypalDetailsDivider} />

                        <div style={paypalDetailsForm}>
                          <label style={paypalDetailsField}>
                            <span style={paypalDetailsLabel}>Full Name</span>

                            <input
                              type="text"
                              style={paypalDetailsInput}
                              value={payPalForm.fullName}
                              onChange={(event) =>
                                setPayPalForm((previous) => ({
                                  ...previous,
                                  fullName: event.target.value,
                                }))
                              }
                              autoComplete="name"
                            />
                          </label>

                          <label style={paypalDetailsField}>
                            <span style={paypalDetailsLabel}>PayPal Email</span>

                            <input
                              type="email"
                              style={paypalDetailsInput}
                              value={payPalForm.paypalEmail}
                              onChange={(event) =>
                                setPayPalForm((previous) => ({
                                  ...previous,
                                  paypalEmail: event.target.value,
                                }))
                              }
                              autoComplete="email"
                            />
                          </label>
                        </div>

                        <div style={paypalDetailsActions}>
                          <button
                            type="button"
                            style={paypalDetailsBackButton}
                            onClick={() => setTransferStage("method")}
                          >
                            Back
                          </button>

                          <button
                            type="button"
                            disabled={!payPalFormReady}
                            style={{
                              ...paypalDetailsNextButton,
                              opacity: payPalFormReady ? 1 : 0.5,
                              cursor: payPalFormReady
                                ? "pointer"
                                : "not-allowed",
                            }}
                            onClick={() => {
                              setTransferSubmitErr(null);
                              setTransferStage("confirm");
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
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
                            setIdentityForm((prev) => ({
                              ...prev,
                              legalName: e.target.value,
                            }))
                          }
                        />
                        <input
                          style={transferInput}
                          placeholder="Address"
                          value={identityForm.address}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                        />
                        <div style={formGridTriple}>
                          <input
                            style={transferInput}
                            placeholder="City"
                            value={identityForm.city}
                            onChange={(e) =>
                              setIdentityForm((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }
                          />
                          <input
                            style={transferInput}
                            placeholder="State"
                            value={identityForm.state}
                            onChange={(e) =>
                              setIdentityForm((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                          />
                          <input
                            style={transferInput}
                            placeholder="ZIP"
                            value={identityForm.zip}
                            onChange={(e) =>
                              setIdentityForm((prev) => ({
                                ...prev,
                                zip: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <input
                          style={transferInput}
                          type="date"
                          value={identityForm.dateOfBirth}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              dateOfBirth: e.target.value,
                            }))
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
                          I confirm this information is accurate and I authorize
                          ORC to process this withdrawal.
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
                  <div style={addCashConfirmScene}>
                    <div style={addCashConfirmPanel}>
                      <div style={addCashConfirmTitle}>
                        {transferMethod === "stripe"
                          ? "Confirm Stripe Withdrawal"
                          : "Confirm"}
                      </div>

                      <div style={addCashConfirmAmount}>
                        {transferMethod === "stripe"
                          ? stripePayoutNetLabel
                          : transferAmountLabel}{" "}
                        USD
                      </div>

                      <div style={addCashConfirmDetails}>
                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>To:</span>
                          <span style={addCashConfirmValue}>
                            {transferMethod === "bank"
                              ? "Bank Account"
                              : transferMethod === "stripe"
                                ? "Stripe connected account"
                                : "PayPal"}
                          </span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>From:</span>
                          <span style={addCashConfirmValue}>ORC Wallet</span>
                        </div>

                        {transferMethod !== "stripe" && (
                          <div style={addCashConfirmRow}>
                            <span style={addCashConfirmLabel}>Destination:</span>
                            <span style={addCashConfirmValue}>
                              {withdrawalEmail}
                            </span>
                          </div>
                        )}

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>
                            Funds will arrive:
                          </span>
                          <span style={addCashConfirmValue}>
                            {transferMethod === "stripe"
                              ? "Stripe payout schedule applies"
                              : "1–3 business days"}
                          </span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>
                            {transferMethod === "stripe"
                              ? "Wallet deduction:"
                              : "Fee:"}
                          </span>
                          <span style={addCashConfirmValue}>
                            {transferMethod === "stripe"
                              ? transferAmountLabel
                              : "Processed by payout provider"}
                          </span>
                        </div>

                        {transferMethod === "stripe" && (
                          <div style={addCashConfirmRow}>
                            <span style={addCashConfirmLabel}>
                              Stripe payout fee:
                            </span>
                            <span style={addCashConfirmValue}>
                              -{stripePayoutFeeLabel}
                            </span>
                          </div>
                        )}

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>
                            {transferMethod === "stripe"
                              ? "Winner receives:"
                              : "Total:"}
                          </span>
                          <span style={addCashConfirmValue}>
                            {transferMethod === "stripe"
                              ? stripePayoutNetLabel
                              : transferAmountLabel}
                          </span>
                        </div>
                      </div>

                      {transferSubmitErr && (
                        <div style={addCashConfirmError}>
                          {transferSubmitErr}
                        </div>
                      )}

                      <button
                        type="button"
                        style={addCashConfirmPrimaryButton}
                        onClick={() =>
                          void (transferMethod === "stripe"
                            ? submitStripePayout()
                            : submitTransfer())
                        }
                        disabled={transferSubmitting}
                      >
                        {transferSubmitting ? "Submitting..." : "Transfer"}
                      </button>

                      <button
                        type="button"
                        style={addCashConfirmBackButton}
                        onClick={() =>
                          setTransferStage(
                            transferMethod === "stripe"
                              ? "method"
                              : "details",
                          )
                        }
                        disabled={transferSubmitting}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {transferStage === "success" && (
                  <div style={payoutSuccessScene}>
                    <div style={payoutSuccessPanel}>
                      <div style={payoutSuccessHeading}>Congratulations!</div>

                      <div style={payoutSuccessAmount}>
                        Your payout of <strong>{payoutSuccessAmountLabel}</strong>{" "}
                        is on its way
                      </div>

                      <div style={payoutSuccessDivider} />

                      <div style={payoutSuccessMessage}>
                        {transferMethod === "bank"
                          ? "Funds will be deposited into your bank account soon."
                          : transferMethod === "stripe"
                            ? "Stripe is processing your connected-account payout."
                            : "Funds will be sent to your PayPal account soon."}
                      </div>

                      <div style={payoutSuccessCheckCircle} aria-hidden="true">
                        <svg
                          width="62"
                          height="62"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12.5L9.5 17L19 7"
                            stroke="#FFFFFF"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div style={payoutSuccessDetails}>
                        <div style={payoutSuccessDetailBlock}>
                          <div style={payoutSuccessDetailHeading}>
                            <span
                              style={payoutSuccessSmallCheck}
                              aria-hidden="true"
                            >
                              ✓
                            </span>

                            <span>
                              {transferMethod === "bank"
                                ? "Deposit to:"
                                : transferMethod === "stripe"
                                  ? "Payout provider:"
                                  : "Send to:"}
                            </span>
                          </div>

                          <div style={payoutSuccessDetailValue}>
                            {transferMethod === "bank"
                              ? `${
                                  bankForm.accountType === "checking"
                                    ? "Checking"
                                    : "Savings"
                                }: ••••${bankForm.accountNumber.slice(-4) || "----"}`
                              : transferMethod === "stripe"
                                ? "Stripe connected account"
                                : payPalForm.paypalEmail}
                          </div>
                        </div>

                        <div style={payoutSuccessDetailDivider} />

                        <div style={payoutSuccessDetailBlock}>
                          <div style={payoutSuccessDetailHeading}>
                            <span
                              style={payoutSuccessSmallCheck}
                              aria-hidden="true"
                            >
                              ✓
                            </span>

                            <span>Estimated arrival time</span>
                          </div>

                          <div style={payoutSuccessDetailValue}>
                            {transferMethod === "bank"
                              ? "1–2 Business Days"
                              : transferMethod === "stripe"
                                ? "Stripe processing time applies"
                                : "PayPal processing time applies"}
                          </div>
                        </div>

                        <div style={payoutSuccessDetailDivider} />
                      </div>

                      <button
                        type="button"
                        style={payoutSuccessButton}
                        onClick={() => {
                          setTransferStage("none");
                          setTransferAmount("0.00");
                          setTransferSubmitErr(null);
                          setSelectedPayoutMethod(null);
                          setStripePayoutQuote(null);
                          void loadWalletData();
                        }}
                      >
                        Return to Off-Road Champion
                      </button>
                      <button
                        type="button"
                        style={payoutSuccessAccountButton}
                        onClick={() => {
                          setTransferStage("none");
                          setTransferAmount("0.00");
                          setTransferSubmitErr(null);
                          setSelectedPayoutMethod(null);
                          setStripePayoutQuote(null);
                          void loadWalletData();
                        }}
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
                  <div style={addCashEntryContent}>
                    <div style={amountPill}>
                      <div style={amountContent}>
                        <span style={amountPrefix}>$</span>

                        <input
                          value={addCashAmount}
                          onChange={(e) =>
                            setAddCashAmount(sanitizeUsdInput(e.target.value))
                          }
                          inputMode="decimal"
                          pattern="\\d*(\\.\\d{0,2})?"
                          style={amountInput}
                          aria-label="Amount in USD"
                        />

                        <span style={amountSuffix}>USD</span>
                      </div>
                    </div>

                    <div style={addCashDetails}>
                      <div style={detailsConnector} aria-hidden="true" />

                      <div style={detailRow}>
                        <div style={detailIconColumn}>
                          <div style={detailIconCircle} aria-hidden="true">
                            $
                          </div>
                        </div>

                        <div style={detailText}>
                          <div style={detailTitle}>Add Cash to</div>
                          <div style={detailSub}>United States Dollar</div>
                        </div>
                      </div>

                      <div style={{ ...detailRow, marginTop: 34 }}>
                        <div style={detailIconColumn}>
                          <div style={detailIcon} aria-hidden="true">
                            <FaUniversity size={24} color="#FFFFFF" />
                          </div>
                        </div>

                        <div style={detailText}>
                          <div style={detailTitle}>From</div>
                          <div style={detailSub}>{selectedPaymentLabel}</div>
                        </div>
                      </div>
                    </div>

                    <div style={paymentMethodList}>
                      <button
                        type="button"
                        style={{
                          ...paymentMethodButton,
                          borderColor:
                            addCashMethod === "bank_transfer"
                              ? "#FFBD17"
                              : "rgba(255,255,255,0.55)",
                        }}
                        onClick={() => setAddCashMethod("bank_transfer")}
                      >
                        <span style={addCashMethodIconSlot} aria-hidden="true">
                          <FaUniversity size={22} color="#FFFFFF" />
                        </span>
                        <span style={addCashMethodLabel}>Bank Transfer (ACH)</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          ...paymentMethodButton,
                          borderColor:
                            addCashMethod === "cashapp"
                              ? "#FFBD17"
                              : "rgba(255,255,255,0.55)",
                        }}
                        onClick={() => setAddCashMethod("cashapp")}
                      >
                        <span style={addCashMethodIconSlot} aria-hidden="true">
                          <SiCashapp size={24} color="#00D64F" />
                        </span>
                        <span style={addCashMethodLabel}>Cash App Pay</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          ...paymentMethodButton,
                          borderColor:
                            addCashMethod === "paypal"
                              ? "#FFBD17"
                              : "rgba(255,255,255,0.55)",
                        }}
                        onClick={() => setAddCashMethod("paypal")}
                      >
                        <span style={addCashMethodIconSlot} aria-hidden="true">
                          <FaPaypal size={24} color="#009CDE" />
                        </span>
                        <span style={addCashMethodLabel}>PayPal</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          ...paymentMethodButton,
                          borderColor:
                            addCashMethod === "coinbase"
                              ? "#FFBD17"
                              : "rgba(255,255,255,0.55)",
                        }}
                        onClick={() => setAddCashMethod("coinbase")}
                      >
                        <span style={addCashMethodIconSlot} aria-hidden="true">
                          <SiCoinbase size={25} color="#4D7CFE" />
                        </span>
                        <span style={addCashMethodLabel}>Coinbase</span>
                        <span style={addCashComingSoon}>Coming soon</span>
                      </button>
                    </div>

                    {addCashErr && <div style={addCashError}>{addCashErr}</div>}

                    <button
                      style={addCashContinueButton}
                      type="button"
                      onClick={
                        addCashMethod === "bank_transfer" ||
                        addCashMethod === "cashapp"
                          ? startStripeAddCashFlow
                          : addCashMethod === "paypal"
                            ? startPayPalAddCashFlow
                            : startCoinbaseComingSoon
                      }
                      disabled={addCashLoading}
                    >
                      {addCashLoading ? "Starting..." : "Continue"}
                    </button>
                  </div>
                )}

                {addCashStage === "payment" &&
                  stripeClientSecret &&
                  stripePaymentIntentId && (
                    <div style={addCashPaymentScene}>
                      <Elements
                        stripe={stripePromise}
                        options={{ clientSecret: stripeClientSecret }}
                      >
                        <AddCashStripeFlow
                          amountUsd={parsedAddCashAmount}
                          paymentMethodLabel={selectedPaymentLabel}
                          onBack={() => {
                            setAddCashErr(null);
                            setStripeClientSecret(null);
                            setStripePaymentIntentId(null);
                            setAddCashStage("entry");
                          }}
                          paymentIntentId={stripePaymentIntentId}
                          onPending={() => {
                            const depositTx: TransactionItem = {
                              id: `stripe-pending-${stripePaymentIntentId || Date.now()}`,
                              label: "Cash Pending",
                              source: selectedPaymentLabel,
                              amountLabel: `+$${parsedAddCashAmount.toFixed(2)}`,
                              kind: "pos",
                            };
                            setTransactions((prev) => [depositTx, ...prev]);
                            setAddCashOutcome("pending");
                            setAddCashStage("success");
                            void loadWalletData();
                          }}
                          onSuccess={() => {
                            // Wallet credit is finalized server-side after Stripe confirmation.
                            const depositTx: TransactionItem = {
                              id: `stripe-${stripePaymentIntentId || Date.now()}`,
                              label: "Cash Added",
                              source: selectedPaymentLabel,
                              amountLabel: `+$${parsedAddCashAmount.toFixed(2)}`,
                              kind: "pos",
                            };
                            setTransactions((prev) => [depositTx, ...prev]);
                            setAddCashOutcome("credited");
                            setAddCashStage("success");
                            void loadWalletData();
                          }}
                        />
                      </Elements>
                    </div>
                  )}

                {addCashStage === "paypal-checkout" && (
                  <div style={addCashPaymentScene}>
                    <AddCashPayPalFlow
                      amountUsd={parsedAddCashAmount}
                      onBack={() => {
                        setAddCashErr(null);
                        setApprovedPayPalOrderId(null);
                        setAddCashStage("entry");
                      }}
                      onApproved={async (orderId) => {
                        setApprovedPayPalOrderId(orderId);
                        setAddCashErr(null);
                        setAddCashStage("confirm");
                      }}
                    />
                  </div>
                )}

                {addCashStage === "confirm" && (
                  <div style={addCashConfirmScene}>
                    <div style={addCashConfirmPanel}>
                      <div style={addCashConfirmTitle}>Confirm</div>

                      <div style={addCashConfirmAmount}>
                        ${parsedAddCashAmount.toFixed(2)} USD
                      </div>

                      <div style={addCashConfirmDetails}>
                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>To:</span>
                          <span style={addCashConfirmValue}>USD Wallet</span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>From:</span>
                          <span style={addCashConfirmValue}>
                            {selectedPaymentLabel}
                          </span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>
                            Funds will arrive:
                          </span>
                          <span style={addCashConfirmValue}>Instantly</span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>Fee:</span>
                          <span style={addCashConfirmValue}>Free</span>
                        </div>

                        <div style={addCashConfirmRow}>
                          <span style={addCashConfirmLabel}>Total:</span>
                          <span style={addCashConfirmValue}>
                            ${parsedAddCashAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {addCashErr && (
                        <div style={addCashConfirmError}>{addCashErr}</div>
                      )}

                      <button
                        style={addCashConfirmPrimaryButton}
                        type="button"
                        onClick={captureApprovedPayPalOrder}
                        disabled={addCashLoading}
                      >
                        {addCashLoading ? "Processing..." : "Add cash now"}
                      </button>

                      <button
                        style={addCashConfirmBackButton}
                        type="button"
                        onClick={() => setAddCashStage("paypal-checkout")}
                        disabled={addCashLoading}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {addCashStage === "success" && (
                  <div style={addCashSuccessScene}>
                    <div style={successPanel}>
                      <div style={successIconCircle} aria-hidden="true">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2 3 7v2h18V7l-9-5Zm7 8H5v8h2v-6h2v6h2v-6h2v6h2v-6h2v6h2v-8ZM3 21h18v-2H3v2Z" />
                        </svg>
                      </div>
                      <div style={successTitle}>
                        {addCashOutcome === "credited"
                          ? "Cash added to your wallet."
                          : "Your bank transfer is pending."}
                      </div>
                      <div style={successSub}>
                        {addCashOutcome === "credited"
                          ? "Your wallet balance has been updated."
                          : "We'll update your wallet after Stripe confirms the transfer. ACH payments can take several business days to clear."}
                      </div>
                      <button
                        style={successButton}
                        type="button"
                        onClick={() => {
                          setTab("wallet");
                          setAddCashStage("entry");
                          setStripeClientSecret(null);
                          setStripePaymentIntentId(null);
                        }}
                      >
                        View your account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "transactions" && (
              <div style={txWrap}>
                {txLoading && (
                  <div style={txEmptyText}>Loading transactions…</div>
                )}
                {txErr && <div style={txErrorText}>{txErr}</div>}

                {!txLoading && !txErr && transactions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 8,
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: "2px 4px",
                      }}
                      onClick={() => setTransactions([])}
                    >
                      Clear
                    </button>
                  </div>
                )}

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
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
  // "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  color: "#fff",
};

const bg: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  padding: "clamp(12px, 2vw, 24px)",
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

const accountActions: React.CSSProperties = {
  position: "absolute",
  top: 18,
  right: 62,
  height: 28,
  display: "flex",
  alignItems: "center",
  gap: 10,
  zIndex: 30,
};

const accountIconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const accountDivider: React.CSSProperties = {
  width: 1,
  height: 26,
  background: "rgba(255,255,255,0.75)",
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

const registerPrompt: React.CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  color: "rgba(255,255,255,0.65)",
  marginTop: 20,
  marginBottom: 0,
};

const registerLink: React.CSSProperties = {
  color: "#FFBD17",
  fontWeight: 600,
  textDecoration: "none",
};

const brandRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const logoImg: React.CSSProperties = {
  width: "clamp(44px, 7vw, 60px)",
  height: "clamp(44px, 7vw, 60px)",
};

const brandText: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "clamp(28px, 5vw, 48px)",
  color: "#F7D023",
};

/* Center lane: this is the key */
const centerLane: React.CSSProperties = {
  position: "relative",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  pointerEvents: "auto",
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
  width: "fit-content",
  margin: "38px auto 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  // gap: 45,
};

const walletInfo: React.CSSProperties = {
  width: 360,
  flexShrink: 0,
};

const tokenLabelRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginBottom: 7,
};

const tokenIcon: React.CSSProperties = {
  width: 28,
  height: 28,
  objectFit: "contain",
};

const tokenLabel: React.CSSProperties = {
  color: "#ffbd17",
  fontSize: 17,
  fontWeight: 700,
};

const gm: React.CSSProperties = {
  color: "#F4E8D2",
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 700,
};

const gmRate: React.CSSProperties = {
  color: "#F4E8D2",
  fontSize: 17,
  fontWeight: 400,
  fontStyle: "italic",
};

const balanceLine: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  whiteSpace: "nowrap",
};

const primary: React.CSSProperties = {
  minWidth: 179,
  height: 29,
  marginLeft: 40,
  border: "none",
  borderRadius: 999,
  background: "#0052B3",
  color: "#fff",
  fontSize: 17,
  fontWeight: 700,
  cursor: "pointer",
};

const transferAmountWrap: React.CSSProperties = {
  width: 200,
  height: 34,
  marginTop: 9,
  borderRadius: 999,
  background: "#dedede",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 18px",
  boxSizing: "border-box",
};

const transferAmountPrefix: React.CSSProperties = {
  color: "#4B4B4B",
  fontSize: 22,
  fontWeight: 400,
};

const transferAmountInput: React.CSSProperties = {
  width: 125,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#4B4B4B",
  fontSize: 22,
  textAlign: "center",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
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
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const addCashEntryContent: React.CSSProperties = {
  width: "min(380px, 90vw)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const amountPill: React.CSSProperties = {
  width: 380,
  maxWidth: "90vw",
  height: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#D9D9D9",
  borderRadius: 999,
  color: "#111",
  boxSizing: "border-box",
};

const amountContent: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  whiteSpace: "nowrap",
};

const amountPrefix: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 400,
  lineHeight: 1,
};

const amountInput: React.CSSProperties = {
  width: 76,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#111",
  fontSize: 32,
  fontWeight: 400,
  lineHeight: 1,
  padding: 0,
  margin: 0,
  // fontFamily: "Arial, sans-serif",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const amountSuffix: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 400,
  lineHeight: 1,
};

const addCashDetails: React.CSSProperties = {
  width: "100%",
  position: "relative",
  marginTop: 18,
};

const paymentMethodList: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 12,
};

const paymentMethodButton: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 7,
  border: "2px solid rgba(255,255,255,0.35)",
  borderColor: "#FFBD17",
  background: "rgba(20,20,20,0.72)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 16px",
  textAlign: "left",
  transition: "background 0.2s ease, border-color 0.2s ease",
};

const addCashMethodIconSlot: React.CSSProperties = {
  width: 30,
  height: 30,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const addCashMethodLabel: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const addCashComingSoon: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
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
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr)",
  columnGap: 12,
  alignItems: "start",
};

const detailIconColumn: React.CSSProperties = {
  width: 36,
  display: "flex",
  justifyContent: "center",
  position: "relative",
  zIndex: 2,
};

const detailIconCircle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "none",
  background: "#fff",
  color: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 24px",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
  // fontFamily: "Arial, sans-serif",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const detailIcon: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // color: "#FFFFFF",
  flexShrink: 0,
  position: "relative",
  zIndex: 2,
};

const detailsConnector: React.CSSProperties = {
  position: "absolute",
  left: 17.5,
  top: 34,
  width: 1,
  height: 50,
  background: "rgba(255,255,255,0.8)",
  zIndex: 1,
};

const detailText: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const detailTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 400,
  lineHeight: 1.05,
  color: "#FFFFFF",
};

const detailSub: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 400,
  lineHeight: 1.08,
  color: "rgba(255,255,255,0.38)",
};

const successPanel: React.CSSProperties = {
  width: "100%",
  maxWidth: 700,

  display: "flex",
  flexDirection: "column",
  alignItems: "center",

  background: "transparent",

  padding: "0 20px",
  boxSizing: "border-box",
};

const successIconCircle: React.CSSProperties = {
  width: "clamp(82px, 10vw, 120px)",
  height: "clamp(82px, 10vw, 120px)",
  borderRadius: 999,
  background: "#0052B4",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const successTitle: React.CSSProperties = {
  marginTop: 28,
  color: "#111",
  fontSize: "clamp(18px, 2vw, 22px)",
  fontWeight: 700,
  textAlign: "center",
};

const successSub: React.CSSProperties = {
  marginTop: 24,
  color: "#555",
  fontSize: "clamp(15px, 1.6vw, 18px)",
  fontWeight: 400,
  textAlign: "center",
  maxWidth: 520,
  lineHeight: 1.6,
};

const successButton: React.CSSProperties = {
  marginTop: 40,
  height: 36,
  minWidth: 180,
  borderRadius: 999,
  border: "none",
  background: "#0052B4",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const addCashSuccessScene: React.CSSProperties = {
  marginTop: 28,
  width: "100vw",
  height: "calc(100vh - 260px)",
  minHeight: 520,
  background: "#FFFFFF",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  boxSizing: "border-box",
  padding: "24px 16px",
};

const addCashPaymentScene: React.CSSProperties = {
  width: "100vw",
  minHeight: "calc(100vh - 210px)",
  marginTop: 28,
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "28px 16px 48px",
  boxSizing: "border-box",
};

const transferScene: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  minHeight: 650,
  background: "#D9D9D9",

  display: "flex",
  justifyContent: "center",
  alignItems: "center",

  boxSizing: "border-box",
};

const taxClassificationScene: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  minHeight: "calc(100vh - 210px)",
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "52px 16px 80px",
  boxSizing: "border-box",
  marginLeft: "calc(50% - 50vw)",
};

const taxClassificationPanel: React.CSSProperties = {
  width: "min(760px, 94vw)",
  minHeight: 430,
  background: "#FFFFFF",
  borderRadius: 20,
  padding: "46px 56px 42px",
  boxSizing: "border-box",
  color: "#111111",
};

const taxClassificationTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.2,
  color: "#111111",
};

const taxClassificationDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  marginTop: 7,
  background: "#C9C9C9",
};

const taxClassificationQuestion: React.CSSProperties = {
  marginTop: 26,
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.4,
  color: "#222222",
};

const taxClassificationOptions: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginTop: 16,
};

const taxClassificationOption: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "7px 14px",
  border: "none",
  borderRadius: 0,
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "#D7E9FC",
  color: "#111111",
  cursor: "pointer",
  textAlign: "left",
  boxSizing: "border-box",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const figmaRadioOuter: React.CSSProperties = {
  width: 19,
  height: 19,
  borderRadius: "50%",
  border: "1px solid #B7C3CE",
  background: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};

const figmaRadioInner: React.CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: "50%",
  background: "#2E80C9",
};

const taxIconWrap: React.CSSProperties = {
  width: 24,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const usFlagIcon: React.CSSProperties = {
  width: 24,
  height: 16,
  display: "block",
};

const taxClassificationOptionText: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.25,
  color: "#111111",
  whiteSpace: "nowrap",
};

const taxContinueButton: React.CSSProperties = {
  width: 150,
  height: 42,
  border: "none",
  borderRadius: 4,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const taxButtonRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 42,
};

const taxBackButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#0052B4",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: "0",
};

const taxFormScene: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  minHeight: "calc(100vh - 210px)",
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "28px 16px 70px",
  boxSizing: "border-box",
};

const taxFormPanel: React.CSSProperties = {
  width: "min(900px, 94vw)",
  background: "#FFFFFF",
  borderRadius: 28,
  padding: "50px 68px 42px",
  boxSizing: "border-box",
  color: "#111111",
};

const taxFormTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 31,
  fontWeight: 700,
  lineHeight: 1.2,
  color: "#111111",
};

const taxFormDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  marginTop: 22,
  marginBottom: 28,
  background: "#BDBDBD",
};

const taxFormTwoColumns: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 38,
};

const taxFormField: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 0,
  marginBottom: 26,
};

const taxFormLabel: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#222222",
};

const taxFormInput: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: "1px solid #CFCFCF",
  borderRadius: 5,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 14px",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const taxFormSelect: React.CSSProperties = {
  ...taxFormInput,
  background: "#F3F3F3",
};

const taxFormLocationGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 0.8fr 1.2fr",
  gap: 26,
};

const taxFormBottomGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 260px",
  gap: 40,
  alignItems: "end",
};

const taxCertificationRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 15,
  fontWeight: 500,

  color: "#222222",
};

const taxFormActions: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 12,
};

const taxFormContinueButton: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: "none",
  borderRadius: 5,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 17,
  fontWeight: 700,
};

const taxFormLinkRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const taxFormLinkButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#075896",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  padding: "3px 0",
};

const taxReviewScene: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  minHeight: "calc(100vh - 210px)",
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "38px 16px 80px",
  boxSizing: "border-box",
};

const taxReviewPanel: React.CSSProperties = {
  width: "min(760px, 94vw)",
  minHeight: 420,
  background: "#FFFFFF",
  borderRadius: 24,
  padding: "48px 62px 44px",
  boxSizing: "border-box",
  color: "#111111",
};

const taxReviewTitle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#111111",
};

const taxReviewDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  background: "#BDBDBD",
  marginTop: 20,
};

const taxReviewSummaryHeading: React.CSSProperties = {
  marginTop: 22,
  fontSize: 15,
  fontWeight: 700,
  color: "#111111",
};

const taxReviewSummaryLink: React.CSSProperties = {
  color: "#348FD3",
  fontWeight: 700,
};

const taxReviewDetails: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 24,
  fontSize: 14,
  lineHeight: 1.4,
  color: "#111111",
};

const taxReviewButtonRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 16,
  marginTop: 56,
};

const taxReviewSubmitButton: React.CSSProperties = {
  width: 170,
  height: 42,
  border: "none",
  borderRadius: 5,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const taxReviewBackButton: React.CSSProperties = {
  width: 170,
  height: 42,
  border: "none",
  borderRadius: 5,
  background: "#BDBDBD",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const taxSubmissionScene: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  minHeight: "calc(100vh - 210px)",
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "34px 16px 80px",
  boxSizing: "border-box",
};

const taxSubmissionPanel: React.CSSProperties = {
  width: "min(680px, 94vw)",
  minHeight: 330,
  background: "#FFFFFF",
  borderRadius: 24,
  padding: "48px 64px 38px",
  boxSizing: "border-box",
  color: "#111111",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const taxSubmissionTitle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#111111",
  textAlign: "center",
};

const taxSubmissionDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  background: "#BDBDBD",
  marginTop: 24,
};

const taxSubmissionMessage: React.CSSProperties = {
  maxWidth: 500,
  margin: "38px auto 0",
  color: "#111111",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.7,
  textAlign: "center",
};

const taxSubmissionContinueButton: React.CSSProperties = {
  width: 220,
  height: 44,
  marginTop: 34,
  border: "none",
  borderRadius: 5,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

// const taxSubmissionBackButton: React.CSSProperties = {
//   marginTop: 12,
//   border: "none",
//   background: "transparent",
//   color: "#075896",
//   fontSize: 15,
//   fontWeight: 600,
//   cursor: "pointer",
//   padding: "4px 12px",
// };

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

const transferPanelTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 14,
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

const bankDetailsPanel: React.CSSProperties = {
  width: "min(520px, 92vw)",
  padding: "28px 34px 26px",
  borderRadius: 22,
  background: "#FFFFFF",
  color: "#111111",
  boxSizing: "border-box",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const bankDetailsTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 21,
  fontWeight: 800,
  lineHeight: 1.25,
};

const bankDetailsSubtitle: React.CSSProperties = {
  marginTop: 8,
  color: "#333333",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
};

const bankDetailsDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  margin: "14px 0 20px",
  background: "#BEBEBE",
};

const bankDetailsForm: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 15,
};

const bankDetailsField: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const bankDetailsLabel: React.CSSProperties = {
  color: "#222222",
  fontSize: 12,
  fontWeight: 500,
};

const bankDetailsInput: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 11px",
  border: "1px solid #C7C7C7",
  borderRadius: 4,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const bankDetailsSelect: React.CSSProperties = {
  ...bankDetailsInput,
  cursor: "pointer",
};

const bankDetailsActions: React.CSSProperties = {
  width: "100%",
  marginTop: 28,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const bankDetailsBackButton: React.CSSProperties = {
  height: 36,
  minWidth: 92,
  padding: "0 18px",
  border: "1px solid #BDBDBD",
  borderRadius: 999,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const bankDetailsNextButton: React.CSSProperties = {
  width: 150,
  height: 38,
  border: "none",
  borderRadius: 4,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
};

const payoutMethodPanel: React.CSSProperties = {
  width: "min(440px, 92vw)",
  background: "#FFFFFF",
  border: "1px solid #A8A8A8",
  borderRadius: 7,
  padding: "24px 28px",
  boxSizing: "border-box",
  color: "#111111",
};

const payoutMethodTitle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const payoutMethodDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  margin: "18px 0",
  background: "#8A8A8A",
};

const payoutMethodSubtitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const payoutMethodMessage: React.CSSProperties = {
  margin: "18px 0",
  color: "#222222",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.55,
};

const payoutMethodOptions: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const payoutMethodOption: React.CSSProperties = {
  width: "100%",
  height: 58,
  border: "2px solid #C7C7C7",
  borderRadius: 7,
  background: "#FFFFFF",
  color: "#111111",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
  padding: "4px 16px",
  fontSize: 20,
  fontWeight: 600,
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "visible",
};

const payoutMethodOptionSelected: React.CSSProperties = {
  borderColor: "#FFBD17",
  background: "#faf0db",
  boxShadow: "0 0 0 1px rgba(255,189,23,0.3)",
};

const payoutMethodActions: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const payoutActionText: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  color: "#111111",
  lineHeight: 1,
};

const payoutMethodError: React.CSSProperties = {
  marginTop: 14,
  color: "#C62828",
  fontSize: 13,
  textAlign: "center",
};

const payoutIconSlot: React.CSSProperties = {
  width: 54,
  height: 42,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "visible",
};

const payoutLogoGraphic: React.CSSProperties = {
  display: "block",
  transform: "scale(1.28)",
  transformOrigin: "center",
};

const bankIconGraphic: React.CSSProperties = {
  display: "block",
  transform: "scale(1.15)",
  transformOrigin: "center",
};

const payoutLabelGroup: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};
const bankPayoutOption: React.CSSProperties = {
  borderColor: "#1D63E9",
  background: "#2463E8",
  color: "#FFFFFF",
};

const bankPayoutOptionSelected: React.CSSProperties = {
  borderColor: "#FFBD17",
  background: "#2463E8",
  boxShadow: "0 0 0 2px rgba(255,189,23,0.45)",
};

const bankPayoutText: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#FFFFFF",
};

const paypalBrandText: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  lineHeight: 1,
};

const payoutBrandText: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#111111",
  lineHeight: 1,
};

const addCashConfirmScene: React.CSSProperties = {
  width: "100vw",
  minHeight: "calc(100vh - 210px)",
  marginTop: 28,
  padding: "48px 16px",
  background: "#FFFFFF",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  boxSizing: "border-box",
};

const addCashConfirmPanel: React.CSSProperties = {
  width: "min(360px, 90vw)",
  padding: "34px 32px 28px",
  background: "#FFFFFF",
  color: "#111111",
  boxSizing: "border-box",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const addCashConfirmTitle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
  color: "#111111",
  fontSize: 32,
  fontWeight: 500,
  lineHeight: 1.1,
};

const addCashConfirmAmount: React.CSSProperties = {
  marginTop: 12,
  textAlign: "center",
  color: "#0052B4",
  fontSize: 27,
  fontWeight: 500,
  lineHeight: 1.15,
};

const addCashConfirmDetails: React.CSSProperties = {
  width: "100%",
  marginTop: 34,
  display: "flex",
  flexDirection: "column",
  gap: 13,
};

const addCashConfirmRow: React.CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  alignItems: "baseline",
  columnGap: 20,
};

const addCashConfirmLabel: React.CSSProperties = {
  color: "#777777",
  fontSize: 15,
  fontWeight: 400,
  textAlign: "left",
};

const addCashConfirmValue: React.CSSProperties = {
  color: "#222222",
  fontSize: 15,
  fontWeight: 500,
  textAlign: "right",
};

const addCashConfirmPrimaryButton: React.CSSProperties = {
  width: "100%",
  height: 38,
  marginTop: 34,
  border: "none",
  borderRadius: 999,
  background: "#0052B4",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const addCashConfirmBackButton: React.CSSProperties = {
  width: "100%",
  height: 36,
  marginTop: 10,
  border: "none",
  background: "transparent",
  color: "#0052B4",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const addCashConfirmError: React.CSSProperties = {
  marginTop: 16,
  color: "#B00020",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
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

const paypalDetailsPanel: React.CSSProperties = {
  width: "min(520px, 92vw)",
  minHeight: 500,
  padding: "26px 36px 24px",
  borderRadius: 22,
  background: "#FFFFFF",
  color: "#111111",
  boxSizing: "border-box",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
  display: "flex",
  flexDirection: "column",
};

const paypalDetailsHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

const paypalDetailsLogo: React.CSSProperties = {
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const paypalDetailsBrand: React.CSSProperties = {
  color: "#111111",
  fontSize: 26,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: "-0.03em",
};

const paypalDetailsMessage: React.CSSProperties = {
  maxWidth: 360,
  margin: "10px 0 0",
  color: "#222222",
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.35,
};

const paypalDetailsSpacer: React.CSSProperties = {
  height: 32,
};

const paypalDetailsDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  marginBottom: 18,
  background: "#BDBDBD",
};

const paypalDetailsForm: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const paypalDetailsField: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const paypalDetailsLabel: React.CSSProperties = {
  color: "#222222",
  fontSize: 12,
  fontWeight: 500,
};

const paypalDetailsInput: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 11px",
  border: "1px solid #C7C7C7",
  borderRadius: 4,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const paypalDetailsActions: React.CSSProperties = {
  width: "100%",
  marginTop: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const paypalDetailsBackButton: React.CSSProperties = {
  height: 36,
  minWidth: 92,
  padding: "0 18px",
  border: "1px solid #BDBDBD",
  borderRadius: 999,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const paypalDetailsNextButton: React.CSSProperties = {
  width: 150,
  height: 38,
  border: "none",
  borderRadius: 4,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
};

const payoutSuccessScene: React.CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 210px)",
  marginTop: 28,
  padding: "34px 16px 70px",
  background: "#D9D9D9",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  boxSizing: "border-box",
};

const payoutSuccessPanel: React.CSSProperties = {
  width: "min(620px, 94vw)",
  padding: "30px 60px 56px",
  borderRadius: 28,
  background: "#FFFFFF",
  color: "#111111",
  boxSizing: "border-box",
  textAlign: "center",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const payoutSuccessHeading: React.CSSProperties = {
  color: "#0AA125",
  fontSize: 29,
  fontWeight: 800,
  lineHeight: 1.2,
};

const payoutSuccessAmount: React.CSSProperties = {
  marginTop: 5,
  color: "#111111",
  fontSize: 19,
  fontWeight: 500,
  lineHeight: 1.4,
};

const payoutSuccessDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  margin: "14px 0 28px",
  background: "#B8B8B8",
};

const payoutSuccessMessage: React.CSSProperties = {
  color: "#111111",
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.45,
  textAlign: "left",
};

const payoutSuccessCheckCircle: React.CSSProperties = {
  width: 94,
  height: 94,
  margin: "28px auto 20px",
  borderRadius: "50%",
  background: "#09A522",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const payoutSuccessDetails: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  textAlign: "left",
};

const payoutSuccessDetailBlock: React.CSSProperties = {
  padding: "0 22px",
};

const payoutSuccessDetailHeading: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#111111",
  fontSize: 18,
  fontWeight: 500,
};

const payoutSuccessSmallCheck: React.CSSProperties = {
  width: 17,
  height: 17,
  borderRadius: 2,
  background: "#0AA52B",
  color: "#FFFFFF",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1,
};

const payoutSuccessDetailValue: React.CSSProperties = {
  marginTop: 18,
  marginLeft: 27,
  color: "#111111",
  fontSize: 18,
  fontWeight: 500,
};

const payoutSuccessDetailDivider: React.CSSProperties = {
  width: "100%",
  height: 1,
  margin: "20px 0 30px",
  background: "#B8B8B8",
};

const payoutSuccessButton: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: "none",
  borderRadius: 4,
  background: "#348FD3",
  color: "#FFFFFF",
  fontSize: 17,
  fontWeight: 700,
  cursor: "pointer",
};

const payoutSuccessButtonGroup: React.CSSProperties = {
  width: "min(340px, 100%)",
  margin: "12px auto 0",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 10,
};

const payoutSuccessAccountButton: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #348FD3",
  borderRadius: 4,
  background: "#FFFFFF",
  color: "#237DBD",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};
