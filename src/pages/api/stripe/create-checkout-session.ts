import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amountUsd } = req.body as { amountUsd?: number };

    if (typeof amountUsd !== "number" || !Number.isFinite(amountUsd)) {
      return res.status(400).json({ error: "Invalid amountUsd" });
    }

    // Convert dollars → cents
    const unitAmount = Math.round(amountUsd * 100);

    // Stripe minimum for USD card payments is commonly 50 cents (varies by method/currency)
    if (unitAmount < 50) {
      return res.status(400).json({ error: "Minimum amount is $0.50" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "ORC Wallet — Add Cash" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/orc-wallet?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/orc-wallet?stripe=cancel`,
    });

    // You can redirect using session.url
    return res.status(200).json({ url: session.url });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Stripe error";
    return res.status(500).json({ error: message });
  }
}