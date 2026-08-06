import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { playerApi } from "@/services/playerApi";

type StripeStep = "payment" | "confirm";

type AddCashStripeFlowProps = {
  amountUsd: number;
  paymentMethodLabel: string;
  paymentIntentId: string;
  onBack: () => void;
  onPending: () => void;
  onSuccess: () => void;
};

export default function AddCashStripeFlow({
  amountUsd,
  paymentMethodLabel,
  paymentIntentId,
  onBack,
  onPending,
  onSuccess,
}: AddCashStripeFlowProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState<StripeStep>("payment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

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

    if (status === "succeeded" || status === "requires_capture") {
      try {
        const finalizeResult = await playerApi.finalizeStripePaymentIntent({
          paymentIntentId: result.paymentIntent?.id || paymentIntentId,
        });

        if (finalizeResult?.credited) {
          onSuccess();
        } else {
          onPending();
        }
        return;
      } catch (finalizeError) {
        setError(
          finalizeError instanceof Error
            ? finalizeError.message
            : "Payment completed, but wallet finalization failed. Please refresh and try again."
        );
        setBusy(false);
        return;
      }
    }

    if (status === "processing") {
      try {
        await playerApi.finalizeStripePaymentIntent({
          paymentIntentId: result.paymentIntent?.id || paymentIntentId,
        });
      } catch {
        // The backend webhook remains the source of truth for ACH settlement.
      }
      onPending();
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
        {!paymentElementReady && (
          <div style={loadingText}>Loading Stripe payment form...</div>
        )}
        <PaymentElement
          options={{ layout: "tabs" }}
          onReady={() => setPaymentElementReady(true)}
          onLoadError={(event) => {
            setPaymentElementReady(false);
            setError(
              event.error?.message ||
                "Stripe could not load the payment form. Check that the frontend publishable key and backend secret key are both in test mode.",
            );
          }}
        />
      </div>

      {step === "payment" && (
        <div style={panel}>
          <div style={panelTitle}>Enter {paymentMethodLabel} information</div>

          {error && <div style={errorText}>{error}</div>}

          <button
            style={submitButton}
            type="button"
            onClick={handleContinue}
            disabled={busy || !stripe || !elements || !paymentElementReady}
          >
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
            <span style={confirmValue}>{paymentMethodLabel}</span>
            <span style={confirmLabel}>Funds will arrive:</span>
            <span style={confirmValue}>
              {paymentMethodLabel === "Bank Transfer"
                ? "After bank transfer clears"
                : "After payment confirmation"}
            </span>
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
  width: "min(360px, 92vw)",
  marginTop: 0,
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
  minHeight: 180,
};

const loadingText: React.CSSProperties = {
  color: "#444",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 12,
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
  border: "1px solid rgba(17,17,17,0.25)",
  background: "transparent",
  color: "#111",
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
