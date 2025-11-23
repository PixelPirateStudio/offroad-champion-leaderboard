# Leaderboard API Documentation

## Overview

This document describes the API endpoints used for fetching and managing leaderboard data in the Offroad Champion tournament system. The API is built on a backend service and consumed by this Next.js frontend application.

**Base URL:** Configured via `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:3000`)

**API Key:** All requests require an `api` header with the value from `NEXT_PUBLIC_API_KEY` (defaults to `"KEY"`)

## Table of Contents

- [Public Tournament Endpoints](#public-tournament-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Authentication](#authentication)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

---

## Public Tournament Endpoints

### 1. Get Leaderboard

Retrieves tournament leaderboard data for a specific period and game mode.

**Endpoint:** `GET /api/v2/tournament/leaderboard`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | Yes | Tournament period: `daily`, `weekly`, or `monthly` |
| `mode` | string | Yes | Game mode: `singleplayer`, `multiplayer`, or `both` |
| `date` | string | No | Specific date for historical data (ISO 8601 format) |
| `limit` | number | No | Number of entries to return (default varies by usage) |
| `offset` | number | No | Pagination offset |
| `country` | string | No | Filter by country code (e.g., `US`, `UK`) |

**Response (single mode):**

```typescript
{
  "tournament": {
    "period": "daily" | "weekly" | "monthly",
    "mode": "singleplayer" | "multiplayer",
    "startDate": "2025-11-23T00:00:00Z",
    "endDate": "2025-11-24T00:00:00Z",
    "qualifyingRaces": 5
  },
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user-123",
      "username": "SpeedRacer",
      "country": "US",
      "cumulativeTime": 305.42,
      "racesCompleted": 5,
      "bestSingleRace": 58.12,
      "avgRaceTime": 61.08,
      "lastUpdated": "2025-11-23T14:30:00Z",
      "vehicle": "rally-car-01",
      "isQualified": true,
      "races": [
        {
          "raceTime": 58.12,
          "trackId": "mountain-pass",
          "timestamp": "2025-11-23T10:15:00Z",
          "vehicleId": "rally-car-01"
        }
        // ... more races
      ]
    }
    // ... more entries
  ],
  "pagination": {
    "total": 1543,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  },
  "meta": {
    "generatedAt": "2025-11-23T15:00:00Z",
    "cacheAge": 60
  }
}
```

**Response (mode: "both"):**

When `mode=both`, the response contains separate leaderboards for both game modes:

```typescript
{
  "singleplayer": {
    // LeaderboardResponse structure
  },
  "multiplayer": {
    // LeaderboardResponse structure
  }
}
```

**Implementation:** `src/services/tournamentApi.ts:232-250`

---

### 2. Get User Statistics

Retrieves comprehensive tournament statistics for a specific user.

**Endpoint:** `GET /api/v2/tournament/user-stats`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No* | User ID to query |
| `username` | string | No* | Username to query (alternative to userId) |
| `period` | string | No | Filter by period: `daily`, `weekly`, `monthly`, or `all` |
| `mode` | string | No | Filter by mode: `singleplayer`, `multiplayer`, or `both` |

*Either `userId` or `username` must be provided.

**Response:**

```typescript
{
  "user": {
    "userId": "user-123",
    "username": "SpeedRacer",
    "country": "US",
    "accountCreated": "2025-01-15T08:00:00Z"
  },
  "currentRankings": {
    "daily": {
      "singleplayer": {
        "rank": 42,
        "outOf": 1543,
        "cumulativeTime": 305.42
      },
      "multiplayer": {
        "rank": 15,
        "outOf": 892,
        "cumulativeTime": 298.12
      }
    },
    "weekly": {
      // Same structure
    },
    "monthly": {
      // Same structure
    }
  },
  "progressToQualification": {
    "daily": {
      "completed": 5,
      "required": 5,
      "qualified": true
    },
    "weekly": {
      // Same structure
    },
    "monthly": {
      // Same structure
    }
  },
  "allTimeStats": {
    "totalRaces": 1247,
    "bestDailyRank": 5,
    "bestWeeklyRank": 12,
    "bestMonthlyRank": 28,
    "winRate": 0.15,
    "prizesWon": 3,
    "favoriteVehicle": "rally-car-01",
    "mostPlayedTrack": "mountain-pass"
  }
}
```

**Implementation:** `src/services/tournamentApi.ts:256-272`

---

### 3. Get Tournament Summary

Retrieves an overview of active tournaments with participation statistics.

**Endpoint:** `GET /api/v2/tournament/summary`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Filter by period: `daily`, `weekly`, `monthly`, or `active` |
| `includeWinners` | boolean | No | Include recent winners data |

**Response:**

```typescript
{
  "activeTournaments": [
    {
      "period": "daily",
      "mode": "singleplayer",
      "startDate": "2025-11-23T00:00:00Z",
      "endDate": "2025-11-24T00:00:00Z",
      "prizePool": 500,
      "currentParticipants": 1543,
      "qualifiedPlayers": 892,
      "currentLeader": {
        "username": "SpeedRacer",
        "time": 305.42
      },
      "timeRemaining": "8h 45m"
    }
    // ... more tournaments
  ],
  "recentWinners": {
    // Winner data (structure varies)
  }
}
```

**Implementation:** `src/services/tournamentApi.ts:278-294`

---

### 4. Get Global Statistics

Retrieves platform-wide statistics and analytics.

**Endpoint:** `GET /api/v2/tournament/global-stats`

**Query Parameters:** None

**Response:**

```typescript
{
  "platform": {
    "totalPlayers": 50423,
    "activePlayers24h": 12543,
    "totalRacesToday": 45821,
    "averageRaceTime": 62.34,
    "prizesDistributedToday": 2500
  },
  "popularContent": {
    "topTracks": [
      // Track data
    ],
    "topVehicles": [
      // Vehicle data
    ]
  },
  "countryLeaderboard": [
    // Country ranking data
  ]
}
```

**Implementation:** `src/services/tournamentApi.ts:300`

---

### 5. Get Prize Configuration

Retrieves current prize amounts for all tournaments.

**Endpoint:** `GET /api/v2/tournament/prizes`

**Query Parameters:** None

**Response:**

```typescript
{
  "daily": {
    "singleplayer": {
      "first": 100.00,
      "second": 50.00,
      "third": 25.00
    },
    "multiplayer": {
      "first": 150.00,
      "second": 75.00,
      "third": 37.50
    }
  },
  "weekly": {
    "singleplayer": {
      "first": 500.00,
      "second": 250.00,
      "third": 125.00
    },
    "multiplayer": {
      "first": 750.00,
      "second": 375.00,
      "third": 187.50
    }
  },
  "monthly": {
    "singleplayer": {
      "first": 2000.00,
      "second": 1000.00,
      "third": 500.00
    },
    "multiplayer": {
      "first": 3000.00,
      "second": 1500.00,
      "third": 750.00
    }
  }
}
```

**Implementation:** `src/services/tournamentApi.ts:307`

---

## Admin Endpoints

Admin endpoints require authentication via Bearer token. See [Authentication](#authentication) section.

### 1. Get Admin Dashboard

Retrieves admin dashboard overview with key metrics.

**Endpoint:** `GET /api/v2/admin/dashboard`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`

**Response:** Dashboard statistics (structure depends on backend implementation)

**Implementation:** `src/services/adminApi.ts:103`

---

### 2. Get Players

Retrieves a list of players with filtering and pagination.

**Endpoint:** `GET /api/v2/admin/players`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by username or user ID |
| `isFrozen` | boolean | No | Filter by frozen status |
| `limit` | number | No | Number of results to return |
| `offset` | number | No | Pagination offset |
| `sortBy` | string | No | Field to sort by |
| `sortOrder` | string | No | `ASC` or `DESC` |

**Implementation:** `src/services/adminApi.ts:107-127`

---

### 3. Get Player Details

Retrieves detailed information about a specific player.

**Endpoint:** `GET /api/v2/admin/players/:userId`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`

**URL Parameters:**
- `userId` - The player's user ID

**Implementation:** `src/services/adminApi.ts:130`

---

### 4. Get Player Races

Retrieves race history for a specific player.

**Endpoint:** `GET /api/v2/admin/players/:userId/races`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`

**URL Parameters:**
- `userId` - The player's user ID

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trackId` | string | No | Filter by track ID |
| `flaggedOnly` | boolean | No | Show only flagged races |
| `limit` | number | No | Number of results to return |
| `offset` | number | No | Pagination offset |

**Implementation:** `src/services/adminApi.ts:249-268`

---

### 5. Freeze/Unfreeze Account

Freezes or unfreezes a player account.

**Endpoints:**
- `POST /api/v2/admin/players/:userId/freeze`
- `POST /api/v2/admin/players/:userId/unfreeze`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`
- `Content-Type: application/json`

**URL Parameters:**
- `userId` - The player's user ID

**Request Body:**

```typescript
{
  "reason": "Explanation for action"
}
```

**Implementation:** `src/services/adminApi.ts:134-146`

---

### 6. Adjust Player Funds

Modifies a player's in-game currency balances.

**Endpoint:** `PATCH /api/v2/admin/players/:userId/funds`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`
- `Content-Type: application/json`

**URL Parameters:**
- `userId` - The player's user ID

**Request Body:**

```typescript
{
  "coins": 1000,           // Optional: permanent coins adjustment
  "gains": 500,            // Optional: gains adjustment
  "coinsTemporal": 250,    // Optional: temporary coins adjustment
  "reason": "Prize award"  // Required: reason for adjustment
}
```

**Implementation:** `src/services/adminApi.ts:149-162`

---

### 7. Get Admin Logs

Retrieves admin action logs with filtering.

**Endpoint:** `GET /api/v2/admin/logs`

**Headers:**
- `Authorization: Bearer <token>`
- `api: <API_KEY>`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `adminId` | string | No | Filter by admin user ID |
| `targetUserId` | string | No | Filter by target user ID |
| `action` | string | No | Filter by action type |
| `startDate` | string | No | Start date (ISO 8601) |
| `endDate` | string | No | End date (ISO 8601) |
| `limit` | number | No | Number of results to return |
| `offset` | number | No | Pagination offset |

**Implementation:** `src/services/adminApi.ts:165-184`

---

### 8. Manage Prize Configuration

Retrieve and update prize amounts for tournaments.

**Get All Prizes:**
- **Endpoint:** `GET /api/v2/admin/prizes`
- **Response:** Same structure as public prizes endpoint

**Get Specific Prize Config:**
- **Endpoint:** `GET /api/v2/admin/prizes/:period/:mode`
- **URL Parameters:**
  - `period` - `daily`, `weekly`, or `monthly`
  - `mode` - `singleplayer` or `multiplayer`

**Update Prize Config:**
- **Endpoint:** `PUT /api/v2/admin/prizes/:period/:mode`
- **URL Parameters:**
  - `period` - `daily`, `weekly`, or `monthly`
  - `mode` - `singleplayer` or `multiplayer`
- **Request Body:**
  ```typescript
  {
    "firstPlacePrize": 100.00,
    "secondPlacePrize": 50.00,
    "thirdPlacePrize": 25.00
  }
  ```

**Implementation:** `src/services/adminApi.ts:187-208`

---

### 9. Race Validation Management

Manage flagged and suspicious races.

**Get Flagged Races:**
- **Endpoint:** `GET /api/v2/admin/races/flagged`
- **Query Parameters:** `userId`, `trackId`, `limit`, `offset`

**Get Race Validation Details:**
- **Endpoint:** `GET /api/v2/admin/races/:validationId`

**Flag Race:**
- **Endpoint:** `POST /api/v2/admin/races/:validationId/flag`
- **Request Body:** `{ "reason": "Suspicious time" }`

**Unflag Race:**
- **Endpoint:** `POST /api/v2/admin/races/:validationId/unflag`
- **Request Body:** `{ "reason": "Verified legitimate" }`

**Implementation:** `src/services/adminApi.ts:211-247`

---

## Authentication

### Admin Login

**Endpoint:** `POST /api/v2/auth/login`

**Headers:**
- `Content-Type: application/json`
- `api: <API_KEY>`

**Request Body:**

```typescript
{
  "username": "admin",
  "password": "password"
}
```

**Response:**

```typescript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  // Additional user data
}
```

**Usage:**
1. Call the login endpoint with credentials
2. Store the returned token in `localStorage` (key: `adminToken`)
3. Include token in `Authorization: Bearer <token>` header for all admin requests

**Implementation:** `src/services/adminApi.ts:80-95`

---

## Data Types

### LeaderboardEntry

Represents a single entry in a leaderboard.

```typescript
{
  rank: number;                  // Position in leaderboard
  userId: string;                // Unique user identifier
  username: string;              // Display name
  country: string;               // Country code (e.g., "US")
  cumulativeTime: number;        // Total time across all races (seconds)
  racesCompleted: number;        // Number of races completed
  bestSingleRace: number;        // Best individual race time (seconds)
  avgRaceTime: number;           // Average time per race (seconds)
  lastUpdated: string;           // ISO 8601 timestamp
  vehicle: string | null;        // Vehicle ID used
  isQualified: boolean;          // Whether player has completed qualifying races
  races: ApiRace[];              // Array of race details
}
```

### ApiRace

Represents a single race result.

```typescript
{
  raceTime: number;              // Race time in seconds
  trackId: string;               // Track identifier
  timestamp: string;             // ISO 8601 timestamp
  vehicleId: string | null;      // Vehicle used (if applicable)
}
```

### TournamentInfo

Describes tournament configuration.

```typescript
{
  period: "daily" | "weekly" | "monthly";
  mode: "singleplayer" | "multiplayer";
  startDate: string;             // ISO 8601 timestamp
  endDate: string;               // ISO 8601 timestamp
  qualifyingRaces: number;       // Required races to qualify for prizes
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

### Error Response Structure

```typescript
{
  "message": "Error description",
  "status": 404,
  // Additional error details may be present
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or request body |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

### Error Handling Implementation

The API service automatically handles errors and throws structured error objects:

```typescript
try {
  const leaderboard = await tournamentApi.getLeaderboard({
    period: "daily",
    mode: "singleplayer"
  });
} catch (error) {
  console.error(error.message); // User-friendly error message
  console.error(error.status);  // HTTP status code
}
```

**Implementation:** `src/services/tournamentApi.ts:189-224` and `src/services/adminApi.ts:38-77`

---

## Usage Examples

### Example 1: Fetch Daily Singleplayer Leaderboard

```typescript
import { tournamentApi } from '@/services/tournamentApi';

// Fetch top 100 entries
const response = await tournamentApi.getLeaderboard({
  period: "daily",
  mode: "singleplayer",
  limit: 100,
  offset: 0
});

console.log(response.tournament.startDate); // "2025-11-23T00:00:00Z"
console.log(response.leaderboard.length);   // 100
console.log(response.pagination.hasMore);   // true
```

### Example 2: Fetch Both Game Modes Simultaneously

```typescript
const response = await tournamentApi.getLeaderboard({
  period: "weekly",
  mode: "both",
  limit: 50
});

// Access singleplayer leaderboard
console.log(response.singleplayer.leaderboard);

// Access multiplayer leaderboard
console.log(response.multiplayer.leaderboard);
```

### Example 3: Filter by Country

```typescript
const response = await tournamentApi.getLeaderboard({
  period: "monthly",
  mode: "multiplayer",
  country: "US",
  limit: 100
});

// All entries will have country === "US"
```

### Example 4: Get User Statistics

```typescript
const stats = await tournamentApi.getUserStats({
  username: "SpeedRacer",
  period: "all"
});

console.log(stats.currentRankings.daily.singleplayer.rank); // 42
console.log(stats.allTimeStats.totalRaces);                  // 1247
console.log(stats.progressToQualification.daily.qualified);  // true
```

### Example 5: Server-Side Rendering (Next.js)

```typescript
// pages/leaderboards/daily.tsx
import { tournamentApi } from '@/services/tournamentApi';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  const [leaderboard, prizes] = await Promise.all([
    tournamentApi.getLeaderboard({
      period: "daily",
      mode: "singleplayer",
      limit: 500
    }),
    tournamentApi.getPrizes()
  ]);

  return {
    props: {
      leaderboard,
      prizeAmount: prizes.daily.singleplayer.first
    }
  };
};
```

### Example 6: Admin - Update Prize Configuration

```typescript
import { adminApi } from '@/services/adminApi';

// Login first
await adminApi.login("admin", "password");

// Update weekly multiplayer prizes
await adminApi.updatePrizeConfig("weekly", "multiplayer", {
  firstPlacePrize: 1000.00,
  secondPlacePrize: 500.00,
  thirdPlacePrize: 250.00
});
```

### Example 7: Admin - Manage Player

```typescript
import { adminApi } from '@/services/adminApi';

// Get player details
const player = await adminApi.getPlayer("user-123");

// Freeze account
await adminApi.freezeAccount("user-123", "Suspicious activity detected");

// Adjust funds as compensation
await adminApi.adjustFunds("user-123", {
  coins: 500,
  reason: "Compensation for downtime"
});

// Get player's race history
const races = await adminApi.getPlayerRaces("user-123", {
  limit: 50,
  flaggedOnly: false
});
```

### Example 8: Parallel Fetching Multiple Leaderboards

```typescript
// Efficiently fetch all 6 leaderboard variations
const [
  dailySingle,
  dailyMulti,
  weeklySingle,
  weeklyMulti,
  monthlySingle,
  monthlyMulti
] = await Promise.all([
  tournamentApi.getLeaderboard({ period: "daily", mode: "singleplayer", limit: 100 }),
  tournamentApi.getLeaderboard({ period: "daily", mode: "multiplayer", limit: 100 }),
  tournamentApi.getLeaderboard({ period: "weekly", mode: "singleplayer", limit: 100 }),
  tournamentApi.getLeaderboard({ period: "weekly", mode: "multiplayer", limit: 100 }),
  tournamentApi.getLeaderboard({ period: "monthly", mode: "singleplayer", limit: 100 }),
  tournamentApi.getLeaderboard({ period: "monthly", mode: "multiplayer", limit: 100 })
]);
```

---

## Implementation Files

- **Tournament API Service:** `src/services/tournamentApi.ts`
- **Admin API Service:** `src/services/adminApi.ts`
- **API Transformers:** `src/utils/apiTransformers.ts`
- **Type Definitions:** Inline in service files

---

## Environment Configuration

Set these environment variables in `.env.local`:

```bash
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# API authentication key
NEXT_PUBLIC_API_KEY=YOUR_API_KEY
```

---

## Notes

- All timestamps are in ISO 8601 format (e.g., `2025-11-23T15:00:00Z`)
- Race times are in **seconds** in API responses but converted to **milliseconds** for UI components
- The API uses server-side rendering (`getServerSideProps`) to ensure fresh data and SEO optimization
- Leaderboard data is cached on the backend; check `meta.cacheAge` for cache freshness
- Admin operations are logged automatically for audit purposes
- Country codes follow ISO 3166-1 alpha-2 standard (e.g., `US`, `UK`, `DE`)

---

## Related Documentation

- Next.js Data Fetching: https://nextjs.org/docs/basic-features/data-fetching
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- API Design Best Practices: https://restfulapi.net/

---

**Last Updated:** 2025-11-23
**API Version:** v2
