/**
 * Tournament API Service
 * Handles all public tournament-related API calls to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "KEY";

interface ApiError {
  message: string;
  status?: number;
}

// API Response Types based on the Tournament API documentation

export interface TournamentInfo {
  period: "daily" | "weekly" | "monthly";
  mode: "singleplayer" | "multiplayer";
  startDate: string;
  endDate: string;
  qualifyingRaces: number;
}

export interface ApiRace {
  raceTime: number;
  trackId: string;
  timestamp: string;
  vehicleId: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  country: string;
  cumulativeTime: number;
  racesCompleted: number;
  bestSingleRace: number;
  avgRaceTime: number;
  lastUpdated: string;
  vehicle: string | null;
  isQualified: boolean;
  races: ApiRace[];
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MetaInfo {
  generatedAt: string;
  cacheAge: number;
}

export interface LeaderboardResponse {
  tournament: TournamentInfo;
  leaderboard: LeaderboardEntry[];
  pagination: PaginationInfo;
  meta: MetaInfo;
}

export interface BothModesLeaderboardResponse {
  singleplayer: LeaderboardResponse;
  multiplayer: LeaderboardResponse;
}

export interface UserRanking {
  rank: number | null;
  outOf: number;
  cumulativeTime: number;
}

export interface CurrentRankings {
  daily: {
    singleplayer: UserRanking | null;
    multiplayer: UserRanking | null;
  };
  weekly: {
    singleplayer: UserRanking | null;
    multiplayer: UserRanking | null;
  };
  monthly: {
    singleplayer: UserRanking | null;
    multiplayer: UserRanking | null;
  };
}

export interface ProgressToQualification {
  completed: number;
  required: number;
  qualified: boolean;
}

export interface AllTimeStats {
  totalRaces: number;
  bestDailyRank: number | null;
  bestWeeklyRank: number | null;
  bestMonthlyRank: number | null;
  winRate: number;
  prizesWon: number;
  favoriteVehicle: string | null;
  mostPlayedTrack: string | null;
}

export interface UserStatsResponse {
  user: {
    userId: string;
    username: string;
    country: string;
    accountCreated: string;
  };
  currentRankings: CurrentRankings;
  progressToQualification: {
    daily: ProgressToQualification;
    weekly: ProgressToQualification;
    monthly: ProgressToQualification;
  };
  allTimeStats: AllTimeStats;
}

export interface TournamentSummaryItem {
  period: "daily" | "weekly" | "monthly";
  mode: "singleplayer" | "multiplayer";
  startDate: string;
  endDate: string;
  prizePool: number;
  currentParticipants: number;
  qualifiedPlayers: number;
  currentLeader: {
    username: string;
    time: number;
  };
  timeRemaining: string;
}

export interface TournamentSummaryResponse {
  activeTournaments: TournamentSummaryItem[];
  recentWinners: Record<string, unknown>;
}

export interface GlobalStatsResponse {
  platform: {
    totalPlayers: number;
    activePlayers24h: number;
    totalRacesToday: number;
    averageRaceTime: number;
    prizesDistributedToday: number;
  };
  popularContent: {
    topTracks: unknown[];
    topVehicles: unknown[];
  };
  countryLeaderboard: unknown[];
}

export interface PrizeConfigTier {
  first: number;
  second: number;
  third: number;
}

export interface PrizesResponse {
  daily: {
    singleplayer: PrizeConfigTier;
    multiplayer: PrizeConfigTier;
  };
  weekly: {
    singleplayer: PrizeConfigTier;
    multiplayer: PrizeConfigTier;
  };
  monthly: {
    singleplayer: PrizeConfigTier;
    multiplayer: PrizeConfigTier;
  };
}

class TournamentApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.apiKey = API_KEY;
  }

  private async fetchApi(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api": this.apiKey,
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    console.log("Fetching:", `${this.baseUrl}${endpoint}`);
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

  /**
   * Get tournament leaderboard for a specific period and mode
   * @param period - daily, weekly, or monthly
   * @param mode - singleplayer, multiplayer, or both
   * @param options - Additional query parameters
   */
  async getLeaderboard(params: {
    period: "daily" | "weekly" | "monthly";
    mode: "singleplayer" | "multiplayer" | "both";
    date?: string;
    limit?: number;
    offset?: number;
    country?: string;
  }): Promise<LeaderboardResponse | BothModesLeaderboardResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchApi(
      `/api/v2/tournament/leaderboard?${queryParams.toString()}`
    ) as Promise<LeaderboardResponse | BothModesLeaderboardResponse>;
  }

  /**
   * Get comprehensive tournament statistics for a specific user
   * @param params - User identifier and filters
   */
  async getUserStats(params: {
    userId?: string;
    username?: string;
    period?: "daily" | "weekly" | "monthly" | "all";
    mode?: "singleplayer" | "multiplayer" | "both";
  }): Promise<UserStatsResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.fetchApi(
      `/api/v2/tournament/user-stats?${queryParams.toString()}`
    ) as Promise<UserStatsResponse>;
  }

  /**
   * Get overview of active tournaments with participation stats
   * @param params - Filter parameters
   */
  async getTournamentSummary(params?: {
    period?: "daily" | "weekly" | "monthly" | "active";
    includeWinners?: boolean;
  }): Promise<TournamentSummaryResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.fetchApi(
      `/api/v2/tournament/summary?${queryParams.toString()}`
    ) as Promise<TournamentSummaryResponse>;
  }

  /**
   * Get platform-wide statistics and analytics
   */
  async getGlobalStats(): Promise<GlobalStatsResponse> {
    return this.fetchApi("/api/v2/tournament/global-stats") as Promise<GlobalStatsResponse>;
  }

  /**
   * Get current prize amounts for all tournaments
   */
  async getPrizes(): Promise<PrizesResponse> {
    return this.fetchApi("/api/v2/tournament/prizes") as Promise<PrizesResponse>;
  }
}

export const tournamentApi = new TournamentApiService();
export type { ApiError };
