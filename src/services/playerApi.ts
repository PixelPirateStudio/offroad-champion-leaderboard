const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

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

    const data = await r.json();
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

    const data = await r.json();
    if (!r.ok) throw new Error(data?.message || "Failed to fetch profile");
    return data;
  }

  async getMyRedemptions(params: { status?: string; limit?: number; offset?: number } = {}) {
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
    if (typeof params.limit === "number") query.set("limit", String(params.limit));
    if (typeof params.offset === "number") query.set("offset", String(params.offset));

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const r = await fetch(`${this.baseUrl}/api/v2/redemptions/my${suffix}`, {
      method: "GET",
      headers: this.headers(),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.message || "Failed to fetch redemptions");
    return data;
  }
}

export const playerApi = new PlayerApiService();