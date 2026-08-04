const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export type StripePayoutQuote = {
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  feePercent: number;
  fixedFeeCents: number;
};

const MOCK_PROFILE = {
  id: "ea24471a-559f-44b5-8fea-4b6491f9f4ea",
  gains: 80000,
  coins: 30000,
  coinsTemporal: 60000,
};

const MOCK_REDEMPTIONS = [
  {
    redemptionId: "mock-redemption-1",
    amount: "250.00",
    currency: "USD",
    status: "completed",
    requestedAt: new Date().toISOString(),
  },
  {
    redemptionId: "mock-redemption-2",
    amount: "125.00",
    currency: "USD",
    status: "pending",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

class PlayerApiService {
  private baseUrl: string;
  private token: string | null = null;
  private profileId: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("playerToken");
      this.profileId = localStorage.getItem("playerProfileId");
    }
  }

  private headers(extra: Record<string, string> = {}) {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      api: process.env.NEXT_PUBLIC_API_KEY || "KEY",
      ...extra,
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  setSession(token: string, profileId: string) {
    this.token = token;
    this.profileId = profileId;
    if (typeof window !== "undefined") {
      localStorage.setItem("playerToken", token);
      localStorage.setItem("playerProfileId", profileId);
    }
  }

  clearSession() {
    this.token = null;
    this.profileId = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("playerToken");
      localStorage.removeItem("playerProfileId");
    }
  }

  private async readResponse(response: Response) {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!text) {
      return {};
    }

    if (contentType.includes("application/json")) {
      return JSON.parse(text);
    }

    return { message: text };
  }

  async login(username: string, password: string) {
    if (USE_MOCK_API) {
      const token = "mock-token";
      const profileId = MOCK_PROFILE.id;
      this.setSession(token, profileId);
      return {
        token,
        profile: { id: profileId },
        user: { username: username || "mock-user" },
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ username, password }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) throw new Error(data?.message || "Login failed");

    // backend returns { user, profile, token }
    this.setSession(data.token, data.profile.id);
    return data;
  }

  async getMyProfile() {
    if (USE_MOCK_API) {
      return MOCK_PROFILE;
    }

    if (!this.profileId) throw new Error("Missing profileId");
    const r = await fetch(`${this.baseUrl}/api/v2/profiles/${this.profileId}`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await this.readResponse(r);
    if (!r.ok) throw new Error(data?.message || "Failed to fetch profile");
    return data;
  }

  async getMyRedemptions(
    params: { status?: string; limit?: number; offset?: number } = {},
  ) {
    if (USE_MOCK_API) {
      return {
        total: MOCK_REDEMPTIONS.length,
        redemptions: MOCK_REDEMPTIONS,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
    }

    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (typeof params.limit === "number")
      query.set("limit", String(params.limit));
    if (typeof params.offset === "number")
      query.set("offset", String(params.offset));

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const r = await fetch(`${this.baseUrl}/api/v2/redemptions/my${suffix}`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await this.readResponse(r);
    if (!r.ok) throw new Error(data?.message || "Failed to fetch redemptions");
    return data;
  }

  async createStripePaymentIntent(params: {
    amountUsd: number;
    paymentMethodTypes?: Array<"us_bank_account" | "cashapp">;
  }) {
    if (USE_MOCK_API) {
      return {
        clientSecret: "pi_mock_secret",
        paymentIntentId: `pi_mock_${Date.now()}`,
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/stripe/payment-intents`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        amountUsd: params.amountUsd,
        paymentMethodTypes: params.paymentMethodTypes,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok)
      throw new Error(
        data?.message || data?.error || "Failed to create payment intent",
      );
    return data;
  }

  async finalizeStripePaymentIntent(params: { paymentIntentId: string }) {
    if (USE_MOCK_API) {
      return {
        success: true,
        finalized: true,
        paymentIntentId: params.paymentIntentId,
        alreadyProcessed: false,
      };
    }

    const r = await fetch(
      `${this.baseUrl}/api/v2/stripe/payment-intents/${params.paymentIntentId}/finalize`,
      {
        method: "POST",
        headers: this.headers(),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok)
      throw new Error(
        data?.message || data?.error || "Failed to finalize payment",
      );
    return data;
  }

  async createPayPalOrder(params: {
    amount: number;
    currency?: string;
    reference?: string;
  }) {
    if (USE_MOCK_API) {
      return {
        success: true,
        orderId: `paypal_mock_order_${Date.now()}`,
        status: "CREATED",
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/paypal/create-order`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || "USD",
        reference: params.reference || `paypal-deposit-${Date.now()}`,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to create PayPal order",
      );
    }

    return data;
  }

  async capturePayPalOrder(params: { orderId: string }) {
    if (USE_MOCK_API) {
      return {
        success: true,
        orderId: params.orderId,
        status: "COMPLETED",
      };
    }

    if (!this.profileId) {
      throw new Error("Missing profileId");
    }

    const r = await fetch(`${this.baseUrl}/api/v2/paypal/capture-order`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        orderId: params.orderId,
        profileId: this.profileId,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to capture PayPal order",
      );
    }

    return data;
  }

  async createRedemption(params: {
    amount: number;
    email: string;
    paymentMethod: "paypal" | "stripe" | "coinbase" | "chi_money";
  }) {
    if (USE_MOCK_API) {
      return {
        redemptionId: `mock-redemption-${Date.now()}`,
        status: "pending",
        amount: params.amount,
        email: params.email,
        paymentMethod: params.paymentMethod,
      };
    }

    if (!this.profileId) throw new Error("Missing profileId");

    const r = await fetch(`${this.baseUrl}/api/v2/redemptions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        profileId: this.profileId,
        amount: params.amount,
        email: params.email,
        paymentMethod: params.paymentMethod,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) throw new Error(data?.message || "Failed to create redemption");
    return data;
  }

  async createStripePayout(params: { amount: number }) {
    if (USE_MOCK_API) {
      const grossAmountCents = Math.round(params.amount * 100);
      const feeAmountCents = Math.ceil(grossAmountCents * 0.005) + 25;
      const netAmountCents = grossAmountCents - feeAmountCents;

      return {
        success: true,
        redemptionId: `mock-stripe-payout-${Date.now()}`,
        status: "completed",
        amount: (grossAmountCents / 100).toFixed(2),
        grossAmount: (grossAmountCents / 100).toFixed(2),
        feeAmount: (feeAmountCents / 100).toFixed(2),
        netAmount: (netAmountCents / 100).toFixed(2),
        currency: "USD",
      };
    }

    if (!this.profileId) throw new Error("Missing profileId");

    const r = await fetch(`${this.baseUrl}/api/v2/redemptions/stripe-payout`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        profileId: this.profileId,
        amount: params.amount,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to create Stripe payout",
      );
    }
    return data;
  }

  async getStripePayoutQuote(params: {
    amount: number;
  }): Promise<StripePayoutQuote> {
    if (USE_MOCK_API) {
      const grossAmountCents = Math.round(params.amount * 100);
      const feeAmountCents = Math.ceil(grossAmountCents * 0.005) + 25;
      const netAmountCents = grossAmountCents - feeAmountCents;

      if (netAmountCents <= 0) {
        throw new Error(
          "Withdrawal amount must be greater than the Stripe payout fee",
        );
      }

      return {
        grossAmount: (grossAmountCents / 100).toFixed(2),
        feeAmount: (feeAmountCents / 100).toFixed(2),
        netAmount: (netAmountCents / 100).toFixed(2),
        currency: "USD",
        feePercent: 0.5,
        fixedFeeCents: 25,
      };
    }

    const query = new URLSearchParams({ amount: String(params.amount) });
    const r = await fetch(
      `${this.baseUrl}/api/v2/redemptions/stripe-payout/quote?${query}`,
      {
        method: "GET",
        headers: this.headers(),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to quote Stripe payout",
      );
    }
    return data as StripePayoutQuote;
  }

  async getConnectStatus(): Promise<{
    complete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: unknown;
  }> {
    if (USE_MOCK_API) {
      return {
        complete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: null,
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/redemptions/connect/status`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await this.readResponse(r);
    if (!r.ok)
      throw new Error(data?.message || "Failed to fetch connect status");
    return data;
  }

  async getConnectOnboardingUrl(params: {
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ onboardingUrl: string }> {
    if (USE_MOCK_API) {
      return { onboardingUrl: "#" };
    }

    const r = await fetch(
      `${this.baseUrl}/api/v2/redemptions/connect/onboarding`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(params),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok)
      throw new Error(data?.message || "Failed to get onboarding link");
    return data;
  }

  async register(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const { firstName, lastName, email, password } = params;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (USE_MOCK_API) {
      const token = "mock-token";
      const profileId = MOCK_PROFILE.id;
      this.setSession(token, profileId);
      return { token, profile: { id: profileId }, user: { username: email } };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/users`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        username: email,
        password,
        name,
        email,
        type: "username",
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) throw new Error(data?.message || "Registration failed");

    this.setSession(data.token, data.user?.profileId ?? data.profile?.id);
    return data;
  }
}

export const playerApi = new PlayerApiService();
