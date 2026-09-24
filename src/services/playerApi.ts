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

export type CoinbaseAsset = "BTC" | "ETH" | "SOL";

export type CoinbaseDepositQuote = {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feePercent: number;
  // gains credited on the net amount, after the fee
  gains: number;
  currency: string;
};

export type CoinbasePayoutQuote = {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feePercent: number;
  currency: string;
  // only set if an asset was passed with the quote request
  asset?: CoinbaseAsset;
  assetAmount?: number;
  unitPriceUsd?: number;
};

export type CoinbaseDeposit = {
  depositId: string;
  status: "pending" | "expired" | "completed" | "failed";
  asset: CoinbaseAsset;
  assetAmount: number;
  receivedAssetAmount: number;
  receivedUsd: number;
  address: string;
  addressId: string;
  network: string;
  expiresAt: string;
  transactionHash: string | null;
  transactionIds: string[];
  createdAt?: string;
} & CoinbaseDepositQuote;

export type WalletTransaction = {
  id: string;
  type: "deposit" | "payout";
  direction: "credit" | "debit";
  provider: string;
  status: string;
  grossAmount: number;
  feeAmount: number | null;
  netAmount: number;
  walletGains: number;
  currency: string;
  asset: string | null;
  assetAmount: number | null;
  transactionHash: string | null;
  providerTransactionId: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type GameCurrency = "gold" | "silver";

export type WalletConversion = {
  success: boolean;
  currency: GameCurrency;
  amountUsd: number;
  gainsCost: number;
  coinsToAdd: number;
  ratePerUsd: number;
  profile: {
    id: string;
    gains: number;
    coins: number;
    silver: number;
    coinsTemporal: number;
  };
};

const MOCK_PROFILE = {
  id: "ea24471a-559f-44b5-8fea-4b6491f9f4ea",
  gains: 80000,
  coins: 30000,
  silver: 4500,
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

const COINBASE_MOCK_DEPOSIT_FEE = 2;
const COINBASE_MOCK_PAYOUT_FEE = 4;
const GAINS_PER_USD = 100;
const GOLD_PER_USD = 100;
const SILVER_PER_USD = 10000;
const MOCK_COINBASE_PRICES: Record<CoinbaseAsset, number> = {
  BTC: 50000,
  ETH: 2500,
  SOL: 100,
};
const MOCK_COINBASE_DEPOSITS = new Map<string, CoinbaseDeposit>();

// same rounding as the backend (fee rounds up to the cent) so mock mode
// doesn't show different numbers than the real API
const mockCoinbaseQuote = (
  amountUsd: number,
  feePercent: number,
): CoinbaseDepositQuote => {
  const grossAmount = Math.round(amountUsd * 100) / 100;
  const feeAmount = Math.ceil(grossAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;

  return {
    grossAmount,
    feeAmount,
    netAmount,
    feePercent,
    gains: netAmount * GAINS_PER_USD,
    currency: "USD",
  };
};

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

    // non-JSON usually means express' default HTML error page - don't dump
    // that into the UI, just use the status line
    if (contentType.includes("text/html") || text.trimStart().startsWith("<")) {
      return {
        message: `${response.status} ${response.statusText}`.trim(),
      };
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

  async getMyDeposits(params: { limit?: number; offset?: number } = {}) {
    if (USE_MOCK_API) {
      return {
        total: 0,
        deposits: [],
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
    }

    const query = new URLSearchParams();

    if (typeof params.limit === "number") {
      query.set("limit", String(params.limit));
    }

    if (typeof params.offset === "number") {
      query.set("offset", String(params.offset));
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";

    const r = await fetch(`${this.baseUrl}/api/v2/deposits/my${suffix}`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await this.readResponse(r);

    if (!r.ok) {
      throw new Error(data?.message || "Failed to fetch deposit transactions");
    }

    return data;
  }

  async getMyTransactions(
    params: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<{
    total: number;
    transactions: WalletTransaction[];
    limit: number;
    offset: number;
  }> {
    const query = new URLSearchParams();

    if (params.status) query.set("status", params.status);
    if (typeof params.limit === "number") {
      query.set("limit", String(params.limit));
    }
    if (typeof params.offset === "number") {
      query.set("offset", String(params.offset));
    }

    if (USE_MOCK_API) {
      const transactions = MOCK_REDEMPTIONS.map((redemption) => ({
        id: redemption.redemptionId,
        type: "payout" as const,
        direction: "debit" as const,
        provider: "mock",
        status: redemption.status,
        grossAmount: Number(redemption.amount),
        feeAmount: null,
        netAmount: Number(redemption.amount),
        walletGains: Number(redemption.amount) * GAINS_PER_USD,
        currency: redemption.currency,
        asset: null,
        assetAmount: null,
        transactionHash: null,
        providerTransactionId: null,
        createdAt: redemption.requestedAt,
        processedAt: null,
      }));

      return {
        total: transactions.length,
        transactions,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const r = await fetch(
      `${this.baseUrl}/api/v2/transactions/my${suffix}`,
      {
        method: "GET",
        headers: this.headers(),
      },
    );
    const data = await this.readResponse(r);

    if (!r.ok) {
      throw new Error(data?.message || "Failed to fetch transaction history");
    }

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

  async getCoinbaseAssets(): Promise<{ assets: CoinbaseAsset[] }> {
    if (USE_MOCK_API) {
      return { assets: ["BTC", "ETH", "SOL"] };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/coinbase/assets`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to load Coinbase assets",
      );
    }
    return data as { assets: CoinbaseAsset[] };
  }

  async getCoinbaseDepositQuote(params: {
    amountUsd: number;
  }): Promise<CoinbaseDepositQuote> {
    if (USE_MOCK_API) {
      return mockCoinbaseQuote(params.amountUsd, COINBASE_MOCK_DEPOSIT_FEE);
    }

    const query = new URLSearchParams({ amountUsd: String(params.amountUsd) });
    const r = await fetch(
      `${this.baseUrl}/api/v2/coinbase/deposit/quote?${query}`,
      {
        method: "GET",
        headers: this.headers(),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to quote crypto deposit",
      );
    }
    return data as CoinbaseDepositQuote;
  }

  async getCoinbasePayoutQuote(params: {
    amountUsd: number;
    asset?: CoinbaseAsset;
  }): Promise<CoinbasePayoutQuote> {
    if (USE_MOCK_API) {
      return mockCoinbaseQuote(params.amountUsd, COINBASE_MOCK_PAYOUT_FEE);
    }

    const query = new URLSearchParams({ amountUsd: String(params.amountUsd) });
    if (params.asset) query.set("asset", params.asset);

    const r = await fetch(
      `${this.baseUrl}/api/v2/coinbase/payout/quote?${query}`,
      {
        method: "GET",
        headers: this.headers(),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to quote crypto payout",
      );
    }
    return data as CoinbasePayoutQuote;
  }

  async createCoinbaseDeposit(params: {
    amountUsd: number;
    asset: CoinbaseAsset;
  }): Promise<CoinbaseDeposit> {
    if (USE_MOCK_API) {
      const quote = mockCoinbaseQuote(
        params.amountUsd,
        COINBASE_MOCK_DEPOSIT_FEE,
      );
      const depositId = `mock-deposit-${Date.now()}`;
      const deposit: CoinbaseDeposit = {
        ...quote,
        depositId,
        status: "pending",
        asset: params.asset,
        assetAmount: Number(
          (params.amountUsd / MOCK_COINBASE_PRICES[params.asset]).toFixed(8),
        ),
        receivedAssetAmount: 0,
        receivedUsd: 0,
        address: `mock_${params.asset.toLowerCase()}_receive_address`,
        addressId: `mock-address-${Date.now()}`,
        network:
          params.asset === "BTC"
            ? "bitcoin"
            : params.asset === "ETH"
              ? "ethereum"
              : "solana",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        transactionHash: null,
        transactionIds: [],
        createdAt: new Date().toISOString(),
      };

      MOCK_COINBASE_DEPOSITS.set(depositId, deposit);
      return deposit;
    }

    const r = await fetch(`${this.baseUrl}/api/v2/coinbase/deposits`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to create crypto deposit",
      );
    }
    return data as CoinbaseDeposit;
  }

  async getCoinbaseDeposit(depositId: string): Promise<CoinbaseDeposit> {
    if (USE_MOCK_API) {
      const deposit = MOCK_COINBASE_DEPOSITS.get(depositId);

      if (!deposit) throw new Error("Crypto deposit not found");
      return deposit;
    }

    const r = await fetch(
      `${this.baseUrl}/api/v2/coinbase/deposits/${depositId}?refresh=true`,
      {
        method: "GET",
        headers: this.headers(),
      },
    );

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to check crypto deposit",
      );
    }
    return data as CoinbaseDeposit;
  }

  async createCoinbasePayout(params: {
    amount: number;
    asset: CoinbaseAsset;
    address: string;
  }) {
    if (USE_MOCK_API) {
      const quote = mockCoinbaseQuote(params.amount, COINBASE_MOCK_PAYOUT_FEE);

      return {
        ...quote,
        redemptionId: `mock-coinbase-payout-${Date.now()}`,
        status: "completed",
        asset: params.asset,
        assetAmount: 0,
        transactionHash: null,
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/coinbase/payouts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        amount: params.amount,
        asset: params.asset,
        address: params.address,
      }),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Crypto withdrawal failed",
      );
    }
    return data;
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

  async convertWalletCurrency(params: {
    amountUsd: number;
    currency: GameCurrency;
  }): Promise<WalletConversion> {
    if (USE_MOCK_API) {
      const rate =
        params.currency === "gold" ? GOLD_PER_USD : SILVER_PER_USD;
      const gainsCost = Number((params.amountUsd * GAINS_PER_USD).toFixed(2));
      const coinsToAdd = Math.floor(params.amountUsd * rate);

      if (MOCK_PROFILE.gains < gainsCost) {
        throw new Error("Insufficient wallet balance.");
      }

      MOCK_PROFILE.gains = Number((MOCK_PROFILE.gains - gainsCost).toFixed(2));

      if (params.currency === "gold") {
        MOCK_PROFILE.coins += coinsToAdd;
      } else {
        MOCK_PROFILE.silver += coinsToAdd;
      }

      return {
        success: true,
        currency: params.currency,
        amountUsd: Number(params.amountUsd.toFixed(2)),
        gainsCost,
        coinsToAdd,
        ratePerUsd: rate,
        profile: { ...MOCK_PROFILE },
      };
    }

    const r = await fetch(`${this.baseUrl}/api/v2/wallet/convert`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    const data = await this.readResponse(r);
    if (!r.ok) {
      throw new Error(
        data?.message || data?.error || "Failed to convert wallet balance",
      );
    }
    return data as WalletConversion;
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
