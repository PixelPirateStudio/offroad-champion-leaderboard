/**
 * API Response Transformers
 * Converts Tournament API responses into the format expected by existing components
 */

import {
  LeaderboardResponse,
  LeaderboardEntry as ApiLeaderboardEntry,
} from "../services/tournamentApi";
import {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardData,
  MergedEntry,
  RaceDetails,
} from "./types/leaderboard";
import { PublicUser } from "./types/user";

/**
 * Transform API tournament info into Leaderboard type
 */
export function transformTournamentToLeaderboard(
  response: LeaderboardResponse,
  leaderboardId: string
): Leaderboard {
  const { tournament } = response;

  // Generate a user-friendly name from period and mode
  const modeName = tournament.mode === "singleplayer" ? "Single-Player" : "Multi-Player";
  const periodName =
    tournament.period.charAt(0).toUpperCase() + tournament.period.slice(1);
  const name = `${modeName} ${periodName} Tournament`;

  return {
    id: leaderboardId,
    name,
    description: `Best times in ${tournament.mode} mode`,
    eventId: `${tournament.period}-${tournament.mode}`,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    createdAt: tournament.startDate,
    updatedAt: response.meta.generatedAt,
    reward: "$0", // Will be filled from prize API
  };
}

/**
 * Transform API leaderboard entry into LeaderboardEntry type
 * Uses actual race data from the API's races array
 */
export function transformApiEntryToLeaderboardEntry(
  apiEntry: ApiLeaderboardEntry,
  leaderboardId: string
): LeaderboardEntry {
  // Transform API races to component format
  const races: RaceDetails[] = apiEntry.races.map((race) => ({
    time: race.raceTime * 1000, // Convert seconds to milliseconds
    date: race.timestamp || apiEntry.lastUpdated, // Fallback to lastUpdated if timestamp is missing
    trackID: race.trackId || "track-01", // Fallback to default track if missing
  }));

  return {
    userId: apiEntry.userId,
    leaderboardId,
    races,
    qualified: apiEntry.isQualified,
  };
}

/**
 * Transform API leaderboard entry into MergedEntry type
 */
export function transformApiEntryToMergedEntry(
  apiEntry: ApiLeaderboardEntry,
  leaderboardId: string
): MergedEntry {
  const leaderboardEntry = transformApiEntryToLeaderboardEntry(
    apiEntry,
    leaderboardId
  );

  const publicUser: PublicUser = {
    id: apiEntry.userId,
    username: apiEntry.username,
    name: apiEntry.username, // API doesn't provide separate display name
    countryCode: apiEntry.country,
    avatarURL: undefined, // API doesn't provide avatar
  };

  return {
    ...leaderboardEntry,
    user: publicUser,
  };
}

/**
 * Transform full API response into LeaderboardData format
 */
export function transformLeaderboardResponse(
  response: LeaderboardResponse,
  leaderboardId: string,
  prizeAmount?: string
): LeaderboardData<MergedEntry> {
  const leaderboard = transformTournamentToLeaderboard(response, leaderboardId);

  // Update prize if provided
  if (prizeAmount) {
    leaderboard.reward = prizeAmount;
  }

  const entries = response.leaderboard.map((apiEntry) =>
    transformApiEntryToMergedEntry(apiEntry, leaderboardId)
  );

  return {
    leaderboard,
    entries,
  };
}

/**
 * Get prize string from prize tier
 */
export function formatPrize(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Generate leaderboard ID from period and mode
 */
export function generateLeaderboardId(
  period: "daily" | "weekly" | "monthly",
  mode: "singleplayer" | "multiplayer"
): string {
  return mode === "singleplayer" ? period : `${period}-multi`;
}
