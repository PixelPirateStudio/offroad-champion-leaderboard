import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type StripeStep = "payment" | "confirm";

type AddCashStripeFlowProps = {
  amountUsd: number;
  onBack: () => void;
  onSuccess: () => void;
};

export default function AddCashStripeFlow({
  amountUsd,
  onBack,
  onSuccess,
}: AddCashStripeFlowProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState<StripeStep>("payment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!elements) return;

    setBusy(true);
    setError(null);

    const submitResult = await elements.submit();
    if (submitResult.error) {
      setError(submitResult.error.message || "Please check your payment details.");
      setBusy(false);
      return;
    }

    setStep("confirm");
    setBusy(false);
  };

  const handleAddCashNow = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orc-wallet`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed. Please try again.");
      setBusy(false);
      return;
    }

    const status = result.paymentIntent?.status;

    if (
      status === "succeeded" ||
      status === "processing" ||
      status === "requires_capture"
    ) {
      onSuccess();
      return;
    }

    if (!status) {
      setError("Additional authentication may be required. Please complete the Stripe prompt and try again.");
      setBusy(false);
      return;
    }

    setError(`Payment status: ${status}. Please try again.`);
    setBusy(false);
  };

  return (
    <div style={flowWrap}>
      <div style={step === "payment" ? elementWrap : hiddenElementMount}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {step === "payment" && (
        <div style={panel}>
          <div style={panelTitle}>Enter payment information</div>

          {error && <div style={errorText}>{error}</div>}

          <button style={submitButton} type="button" onClick={handleContinue} disabled={busy || !stripe || !elements}>
            {busy ? "Loading..." : "Continue"}
          </button>

          <button style={backButton} type="button" onClick={onBack} disabled={busy}>
            Back
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div style={confirmPanel}>
          <div style={confirmTitle}>Confirm</div>
          <div style={confirmAmount}>${amountUsd.toFixed(2)} USD</div>

          <div style={confirmGrid}>
            <span style={confirmLabel}>To:</span>
            <span style={confirmValue}>USD Wallet</span>
            <span style={confirmLabel}>From:</span>
            <span style={confirmValue}>Bank</span>
            <span style={confirmLabel}>Funds will arrive:</span>
            <span style={confirmValue}>Instantly</span>
            <span style={confirmLabel}>Fee:</span>
            <span style={confirmValue}>Free</span>
            <span style={confirmLabel}>Total:</span>
            <span style={confirmValue}>${amountUsd.toFixed(2)}</span>
          </div>

          {error && <div style={errorText}>{error}</div>}

          <button style={submitButton} type="button" onClick={handleAddCashNow} disabled={busy || !stripe || !elements}>
            {busy ? "Processing..." : "Add cash now"}
          </button>

          <button
            style={backButton}
            type="button"
            onClick={() => {
              setError(null);
              setStep("payment");
            }}
            disabled={busy}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}

const flowWrap: React.CSSProperties = {
  width: "min(420px, 92vw)",
  marginTop: 44,
  marginBottom: 24,
};

const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.98)",
  borderRadius: 12,
  padding: 24,
  boxSizing: "border-box",
};

const panelTitle: React.CSSProperties = {
  color: "#111",
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 16,
};

const elementWrap: React.CSSProperties = {
  marginTop: 12,
  background: "#fff",
  borderRadius: 8,
  padding: 12,
};

const hiddenElementMount: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

const submitButton: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  height: 38,
  borderRadius: 999,
  border: "none",
  background: "#0052B4",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const backButton: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.4)",
  background: "transparent",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const errorText: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: "#B00020",
  fontWeight: 600,
};

const confirmPanel: React.CSSProperties = {
  background: "rgba(255,255,255,0.98)",
  borderRadius: 12,
  padding: 24,
  boxSizing: "border-box",
  color: "#111",
};

const confirmTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 30,
  fontWeight: 700,
  lineHeight: 1.1,
};

const confirmAmount: React.CSSProperties = {
  textAlign: "center",
  marginTop: 8,
  fontSize: 28,
  color: "#0052B4",
  fontWeight: 700,
};

const confirmGrid: React.CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  fontSize: 14,
};

const confirmLabel: React.CSSProperties = {
  color: "rgba(17,17,17,0.7)",
};

const confirmValue: React.CSSProperties = {
  textAlign: "right",
  fontWeight: 600,
};
