import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { playerApi } from "@/services/playerApi";

type AddCashPayPalFlowProps = {
  amountUsd: number;
  onBack: () => void;
  onApproved: (orderId: string) => void;
};

export default function AddCashPayPalFlow({
  amountUsd,
  onBack,
  onApproved,
}: AddCashPayPalFlowProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return <div>Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID</div>;
  }

  return (
    <div style={wrapper}>
      <div style={panel}>
        <div style={formTitle}>Enter payment information</div>

        <div style={amount}>${amountUsd.toFixed(2)} USD</div>

        <div style={paypalButtonArea}>
          <PayPalScriptProvider
            options={{
              clientId,
              currency: "USD",
              intent: "capture",
            }}
          >
            <PayPalButtons
              style={{
                layout: "vertical",
                shape: "rect",
                label: "paypal",
                height: 40,
              }}
              createOrder={async () => {
                const result = await playerApi.createPayPalOrder({
                  amount: amountUsd,
                  currency: "USD",
                  reference: `paypal-deposit-${Date.now()}`,
                });

                if (!result.orderId) {
                  throw new Error("PayPal order ID was not returned");
                }

                return result.orderId;
              }}
              onApprove={async (data) => {
                if (!data.orderID) {
                  throw new Error("PayPal order ID is missing.");
                }

                onApproved(data.orderID);
              }}
              onCancel={() => {
                console.log("PayPal checkout cancelled");
              }}
              onError={(error) => {
                console.error("PayPal checkout error:", error);
              }}
            />
          </PayPalScriptProvider>
        </div>

        <button type="button" style={backButton} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
};

const panel: React.CSSProperties = {
  width: "min(340px, 92vw)",
  padding: "28px 24px 24px",
  borderRadius: 6,
  border: "1px solid #aaa",
  background: "#fff",
  color: "#111",
  boxSizing: "border-box",
  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
};

const formTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  textAlign: "center",
};

const paypalButtonArea: React.CSSProperties = {
  width: "100%",
};

const backButton: React.CSSProperties = {
  width: "100%",
  height: 38,
  marginTop: 12,
  borderRadius: 999,
  border: "1px solid #aaa",
  background: "#fff",
  color: "#111",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const amount: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 22,
  color: "#0052B4",
  fontSize: 24,
  fontWeight: 600,
  textAlign: "center",
};
