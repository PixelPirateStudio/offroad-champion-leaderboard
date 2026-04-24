import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  }

  try {
    const { amountUsd } = req.body as { amountUsd?: number };

    if (typeof amountUsd !== "number" || !Number.isFinite(amountUsd)) {
      return res.status(400).json({ error: "Invalid amountUsd" });
    }

    const amountInCents = Math.round(amountUsd * 100);

    if (amountInCents < 50) {
      return res.status(400).json({ error: "Minimum amount is $0.50" });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: "ORC Wallet - Add Cash",
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Stripe error";
    return res.status(500).json({ error: message });
  }
}
