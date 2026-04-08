// Bet API Service for betting operations

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export interface Bet {
  id: string;
  betAmount: string | number; // API returns string
  trackId: string;
  status: 'open' | 'active' | 'completed' | 'cancelled' | 'expired' | 'refunded' | 'rematch';
  creatorId: string;
  acceptorId: string | null;
  winnerId: string | null;
  creatorRaceValidationId: string | null;
  acceptorRaceValidationId: string | null;
  totalPot: string | number; // API returns string
  houseFee: string | number; // API returns string
  winnerPayout: string | number | null; // API returns string
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
    name: string;
    country: string;
  };
  acceptor?: {
    id: string;
    username: string;
    name: string;
    country: string;
  };
  winner?: {
    id: string;
    username: string;
    name: string;
    country: string;
  };
}

export interface CreateBetRequest {
  betAmount: number;
  trackId: string;
}

export interface CreateBetResponse {
  bet: Bet;
  message: string;
}

export interface AcceptBetResponse {
  bet: Bet;
  message: string;
}

export interface CancelBetResponse {
  message: string;
}

export interface MarketplaceBetsResponse {
  bets: Bet[];
  total: number;
}

export interface UserBetsResponse {
  bets: Bet[];
}

class BetApiService {
  private getHeaders(includeAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'api': API_KEY,
    };

    if (includeAuth) {
      const token = localStorage.getItem('userToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Create a new bet
   */
  async createBet(request: CreateBetRequest): Promise<CreateBetResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/bets`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create bet');
      }

      const data: CreateBetResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while creating bet');
    }
  }

  /**
   * Get marketplace bets (open bets from other users)
   */
  async getMarketplaceBets(): Promise<MarketplaceBetsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/bets/marketplace`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch marketplace bets');
      }

      const data: MarketplaceBetsResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching marketplace bets');
    }
  }

  /**
   * Accept a bet from the marketplace
   */
  async acceptBet(betId: string): Promise<AcceptBetResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/bets/${betId}/accept`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to accept bet');
      }

      const data: AcceptBetResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while accepting bet');
    }
  }

  /**
   * Get user's bets (open, active, and recent completed)
   */
  async getUserBets(): Promise<UserBetsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/bets/my`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user bets');
      }

      const data: UserBetsResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching user bets');
    }
  }

  /**
   * Cancel an open bet (only creator can cancel before acceptance)
   */
  async cancelBet(betId: string): Promise<CancelBetResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/bets/${betId}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel bet');
      }

      const data: CancelBetResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while cancelling bet');
    }
  }
}

export const betApi = new BetApiService();
