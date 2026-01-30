// Leaderboard related types and interfaces

import { PublicUser } from "./user";


// Represents a leaderboard for a specific tournament event
export type Leaderboard = {
    id: string;
    name: string;
    description?: string; // Optional, brief description of the leaderboard
    eventId: string; // ID of the associated TournamentEvent
    startDate: string; // ISO date string
    endDate: string;   // ISO date string
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
    reward: string; // Description of the reward for the leaderboard
}
// Entry for a user in a leaderboard
export type LeaderboardEntry = {
    userId: string; // ID of the user
    leaderboardId: string; // ID of the ass ociated Leaderboard
    races: RaceDetails[]
    qualified: boolean; // Whether the user qualified for the leaderboard
    // Stats from API (to avoid recalculating)
    cumulativeTime?: number; // in milliseconds
    racesCompleted?: number;
    bestSingleRace?: number; // in milliseconds
    avgRaceTime?: number; // in milliseconds
}
export type RaceDetails = {
    time: number; // Time to completion in milliseconds
    date: string; // ISO date string of the race start
    trackID: string; // ID of the track
}
// Combined type for easier data handling
export type LeaderboardData<T extends LeaderboardEntry | MergedEntry = LeaderboardEntry> = {
    leaderboard: Leaderboard;
    entries: T[];
}

// Merged entry for displaying in the leaderboard, consists of LeaderboardEntry and a user: field
export type MergedEntry = LeaderboardEntry & {
    user: PublicUser;
}

