/**
 * Admin API Service
 * Handles all admin-related API calls to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiError {
  message: string;
  status?: number;
}

class AdminApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("adminToken");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("adminToken", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
    }
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api": process.env.NEXT_PUBLIC_API_KEY || "KEY",
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = {
        message: "An error occurred",
        status: response.status,
      };

      try {
        const errorData = await response.json();
        error.message = errorData.message || errorData.error || error.message;
      } catch {
        error.message = response.statusText || error.message;
      }

      throw error;
    }

    return response.json();
  }

  // Authentication
  async login(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", api: process.env.NEXT_PUBLIC_API_KEY || "KEY" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async logout() {
    this.clearToken();
  }

  // Dashboard
  async getDashboard() {
    return this.fetchWithAuth("/api/v2/admin/dashboard");
  }

  // Player Management
  async getPlayers(
    params: {
      search?: string;
      isFrozen?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchWithAuth(
      `/api/v2/admin/players?${queryParams.toString()}`
    );
  }

  async getPlayer(userId: string) {
    return this.fetchWithAuth(`/api/v2/admin/players/${userId}`);
  }

  // Account Actions
  async freezeAccount(userId: string, reason: string) {
    return this.fetchWithAuth(`/api/v2/admin/players/${userId}/freeze`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async unfreezeAccount(userId: string, reason: string) {
    return this.fetchWithAuth(`/api/v2/admin/players/${userId}/unfreeze`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // Fund Management
  async adjustFunds(
    userId: string,
    data: {
      coins?: number;
      gains?: number;
      coinsTemporal?: number;
      reason: string;
    }
  ) {
    return this.fetchWithAuth(`/api/v2/admin/players/${userId}/funds`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Admin Logs
  async getLogs(
    params: {
      adminId?: string;
      targetUserId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchWithAuth(`/api/v2/admin/logs?${queryParams.toString()}`);
  }

  // Prize Configuration
  async getPrizes() {
    return this.fetchWithAuth("/api/v2/admin/prizes");
  }

  async getPrizeConfig(period: string, mode: string) {
    return this.fetchWithAuth(`/api/v2/admin/prizes/${period}/${mode}`);
  }

  async updatePrizeConfig(
    period: string,
    mode: string,
    data: {
      firstPlacePrize: number;
      secondPlacePrize: number;
      thirdPlacePrize: number;
    }
  ) {
    return this.fetchWithAuth(`/api/v2/admin/prizes/${period}/${mode}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Race Validation Management
  async getFlaggedRaces(
    params: {
      userId?: string;
      trackId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchWithAuth(
      `/api/v2/admin/races/flagged?${queryParams.toString()}`
    );
  }

  async getRaceValidation(validationId: string) {
    return this.fetchWithAuth(`/api/v2/admin/races/${validationId}`);
  }

  async flagRace(validationId: string, reason: string) {
    return this.fetchWithAuth(`/api/v2/admin/races/${validationId}/flag`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async unflagRace(validationId: string, reason: string) {
    return this.fetchWithAuth(`/api/v2/admin/races/${validationId}/unflag`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async getPlayerRaces(
    userId: string,
    params: {
      trackId?: string;
      flaggedOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchWithAuth(
      `/api/v2/admin/players/${userId}/races?${queryParams.toString()}`
    );
  }
}

export const adminApi = new AdminApiService();
export type { ApiError };
