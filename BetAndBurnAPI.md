# Bet and Burn API Documentation

## Overview

The betting system allows users to create and accept wager-based challenges where each player bets a specific amount of "gains" (in-game currency). The system automatically deducts the bet amount from players' balances when creating or accepting bets, applies a 25% house fee on completion, and pays out the winner. The "burn" aspect refers to the house fee being removed from circulation (25% of the total pot).

**Base URL**: `/api/v2/bets`

### Automatic Bet Completion

The betting system is **integrated with the race submission API** to enable automatic bet completion. When players submit their race results with a `betId`, the system:

1. Records the race validation
2. Links the race validation to the bet (creator or acceptor)
3. **Automatically determines the winner** when both players have submitted (fastest time wins)
4. Completes the bet and pays out the winner
5. Handles edge cases:
   - **Ties** (within 0.01s): Sets bet status to `'rematch'`
   - **Flagged races**: Winner determined by valid race, or refunded if both flagged
   - **One flagged**: Opponent wins by default

This means **admins no longer need to manually complete most bets** - they complete automatically when both players finish racing.

## Authentication & Middleware

All endpoints require:
- **API Key**: Header `api: <api_key>`
- **JWT Authentication**: `Authorization: Bearer <token>`
- **Not Frozen**: User accounts that create or accept bets cannot be frozen (`checkNotFrozen` middleware)
- **Admin Role**: Admin-only endpoints require `role: 'admin'`

## Database Schema

### Bet Model

**Table**: `bets`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `creator_id` | UUID | User who created the bet (FK to users) |
| `acceptor_id` | UUID | User who accepted the bet (FK to users, nullable) |
| `bet_amount` | DECIMAL(10,2) | Amount each player bets (min: 0.01, max: 10,000.00) |
| `house_fee` | DECIMAL(10,2) | 25% house fee calculated from total pot |
| `type` | ENUM | `'live'` (direct challenge) or `'open'` (marketplace) |
| `status` | ENUM | `'open'`, `'active'`, `'completed'`, `'cancelled'`, `'refunded'`, `'rematch'` |
| `winner_id` | UUID | User who won the bet (FK to users, nullable) |
| `creator_race_validation_id` | UUID | Race validation record for creator (FK, nullable) |
| `acceptor_race_validation_id` | UUID | Race validation record for acceptor (FK, nullable) |
| `metadata` | JSONB | Historical data and additional info (deleted user info, previous race validations) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `expires_at` | TIMESTAMP | When the bet expires if not accepted (24 hours from creation) |

### Bet Statuses

- **`open`**: Created, waiting for acceptor
- **`active`**: Accepted, race in progress
- **`completed`**: Race finished, winner paid
- **`cancelled`**: Cancelled by creator before acceptance
- **`refunded`**: Refunded due to error/timeout
- **`rematch`**: Tie occurred, participants must race again

### Bet Types

- **`live`**: Direct challenge to specific user
- **`open`**: Open bet available in marketplace

### Database Constraints

- `bet_amount > 0` (positive amounts only)
- `house_fee >= 0` (non-negative)
- `winner_id` must be either `creator_id` or `acceptor_id`
- `creator_id != acceptor_id` (cannot bet against yourself)

---

## User Endpoints

### 1. Get Marketplace Bets

Retrieve all open bets available for acceptance (excludes the authenticated user's own bets).

**Endpoint**: `GET /api/v2/bets/marketplace`

**Authentication**: JWT + API Key

**Query Parameters**:
```typescript
{
  limit?: number;    // Default: 50, Max: 1000 (ignored if period is specified)
  offset?: number;   // Default: 0 (ignored if period is specified)
  period?: '7d' | '30d' | '365d';  // Optional: Filter by time period
}
```

**Behavior**:
- **Without `period`**: Returns paginated results using `limit` and `offset`
- **With `period`**: Returns ALL bets from the specified time period, bypassing `limit` and `offset`
  - `'7d'`: Last 7 days
  - `'30d'`: Last 30 days
  - `'365d'`: Last 365 days

**Response** (200 OK) - Without period:
```json
{
  "bets": [
    {
      "id": "uuid",
      "creatorId": "uuid",
      "betAmount": "100.00",
      "houseFee": "50.00",
      "type": "open",
      "status": "open",
      "expiresAt": "2026-04-09T12:00:00Z",
      "createdAt": "2026-04-08T12:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "player123"
      }
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0,
  "period": null
}
```

**Response** (200 OK) - With period:
```json
{
  "bets": [
    {
      "id": "uuid",
      "creatorId": "uuid",
      "betAmount": "100.00",
      "houseFee": "50.00",
      "type": "open",
      "status": "open",
      "expiresAt": "2026-04-09T12:00:00Z",
      "createdAt": "2026-04-01T12:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "player123"
      }
    }
  ],
  "total": 123,
  "limit": 123,
  "offset": 0,
  "period": "7d"
}
```

---

### 2. Get User's Bets

Retrieve bets created or accepted by the authenticated user.

**Endpoint**: `GET /api/v2/bets/my`

**Authentication**: JWT + API Key

**Query Parameters**:
```typescript
{
  status?: 'open' | 'active' | 'completed' | 'cancelled' | 'refunded' | 'rematch';
  limit?: number;    // Default: 50, Max: 1000
  offset?: number;   // Default: 0
}
```

**Response** (200 OK):
```json
{
  "bets": [
    {
      "id": "uuid",
      "creatorId": "uuid",
      "acceptorId": "uuid",
      "betAmount": "100.00",
      "houseFee": "50.00",
      "type": "open",
      "status": "active",
      "createdAt": "2026-04-08T12:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "player123"
      },
      "acceptor": {
        "id": "uuid",
        "username": "player456"
      },
      "winner": null
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

### 3. Get Specific Bet

Retrieve details of a specific bet by ID.

**Endpoint**: `GET /api/v2/bets/:betId`

**Authentication**: JWT + API Key

**Path Parameters**:
- `betId` (UUID): Bet ID

**Response** (200 OK):
```json
{
  "id": "uuid",
  "creatorId": "uuid",
  "acceptorId": "uuid",
  "betAmount": "100.00",
  "houseFee": "50.00",
  "type": "open",
  "status": "completed",
  "winnerId": "uuid",
  "creatorRaceValidationId": "uuid",
  "acceptorRaceValidationId": "uuid",
  "metadata": {},
  "createdAt": "2026-04-08T12:00:00Z",
  "updatedAt": "2026-04-08T13:00:00Z",
  "expiresAt": "2026-04-09T12:00:00Z",
  "creator": {
    "id": "uuid",
    "username": "player123"
  },
  "acceptor": {
    "id": "uuid",
    "username": "player456"
  },
  "winner": {
    "id": "uuid",
    "username": "player456"
  }
}
```

---

### 4. Create Bet

Create a new bet. Deducts `betAmount` from creator's gains balance.

**Endpoint**: `POST /api/v2/bets`

**Authentication**: JWT + API Key + Not Frozen

**Request Body**:
```json
{
  "betAmount": 100.00
}
```

**Validation**:
- `betAmount`: number, min: 0.01, max: 10,000.00, precision: 2 decimal places

**Business Logic**:
1. Validates bet amount (0.01 - 10,000.00)
2. Verifies user exists and is not frozen
3. Atomically deducts `betAmount` from user's `profile.gains`
4. Creates bet with status `'open'`
5. Sets expiry to 24 hours from creation
6. Calculates house fee: `(betAmount * 2) * 0.25`

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Bet created successfully",
  "bet": {
    "id": "uuid",
    "creatorId": "uuid",
    "betAmount": "100.00",
    "houseFee": "50.00",
    "status": "open",
    "type": "open",
    "expiresAt": "2026-04-09T12:00:00Z",
    "createdAt": "2026-04-08T12:00:00Z"
  }
}
```

**Error Responses**:
- `400`: Insufficient gains, invalid bet amount
- `403`: Account is frozen
- `404`: User or profile not found

---

### 5. Accept Bet

Accept an open bet. Deducts `betAmount` from acceptor's gains balance.

**Endpoint**: `POST /api/v2/bets/:betId/accept`

**Authentication**: JWT + API Key + Not Frozen

**Path Parameters**:
- `betId` (UUID): Bet ID

**Request Body**:
```json
{}
```
(Empty body, but must be valid JSON)

**Business Logic**:
1. Locks bet row to prevent race conditions
2. Verifies bet is still `'open'` and not expired
3. Ensures acceptor is not the creator
4. Verifies acceptor is not frozen
5. Atomically deducts `betAmount` from acceptor's `profile.gains`
6. Updates bet status to `'active'` and sets `acceptorId`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Bet accepted successfully",
  "bet": {
    "id": "uuid",
    "creatorId": "uuid",
    "acceptorId": "uuid",
    "betAmount": "100.00",
    "houseFee": "50.00",
    "status": "active",
    "createdAt": "2026-04-08T12:00:00Z",
    "updatedAt": "2026-04-08T12:30:00Z"
  }
}
```

**Error Responses**:
- `400`: Bet no longer available, expired, or cannot accept own bet
- `403`: Account is frozen
- `404`: Bet or acceptor not found

---

### 6. Cancel Bet

Cancel an open bet (creator only, before acceptance). Refunds `betAmount` to creator.

**Endpoint**: `POST /api/v2/bets/:betId/cancel`

**Authentication**: JWT + API Key

**Path Parameters**:
- `betId` (UUID): Bet ID

**Business Logic**:
1. Locks bet row
2. Verifies user is the creator
3. Ensures bet is still `'open'`
4. Refunds `betAmount` to creator's `profile.gains`
5. Updates bet status to `'cancelled'`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Bet cancelled successfully",
  "bet": {
    "id": "uuid",
    "creatorId": "uuid",
    "betAmount": "100.00",
    "status": "cancelled",
    "createdAt": "2026-04-08T12:00:00Z",
    "updatedAt": "2026-04-08T12:15:00Z"
  }
}
```

**Error Responses**:
- `400`: Can only cancel bets that have not been accepted
- `403`: Only the bet creator can cancel the bet
- `404`: Bet or creator not found

---

## Race Submission Integration

### 7. Submit Race Result with Bet

Submit a race result and automatically link it to an active bet. When both players submit, the bet is automatically completed.

**Endpoint**: `POST /api/v2/tournaments/submit-result`

**Authentication**: JWT + API Key

**Request Body**:
```json
{
  "userId": "uuid",
  "profileId": "uuid",
  "betId": "uuid",  // OPTIONAL - links race to bet
  "raceData": {
    "trackId": "track_01",
    "raceTime": "45.123",
    "checkpoints": "10.5,20.3,30.1,45.123",
    "validationHash": "sha256_hash",
    "mode": "multiplayer",
    "period": "daily",
    "vehicleId": "vehicle_01",
    "timestamp": "2026-04-08T12:00:00Z"
  }
}
```

**Validation**:
- `betId` (UUID, optional): Active bet to link this race to
- Must be a participant (creator or acceptor) in the bet
- Bet must be in `'active'` status
- Cannot submit twice for the same bet

**Business Logic - Without betId**:
1. Validates race data (anti-cheat)
2. Creates race validation record
3. Updates tournament stats
4. Returns tournament results

**Business Logic - With betId**:
1. All of the above, PLUS:
2. Verifies user is a participant in the bet
3. Links race validation to bet (sets `creator_race_validation_id` or `acceptor_race_validation_id`)
4. If both players have now submitted:
   - Compares race times
   - **Automatically determines winner** (fastest time)
   - Completes bet and pays winner
   - Returns bet completion details

**Response** (200 OK) - First player submits:
```json
{
  "success": true,
  "accepted": true,
  "tournaments": [
    { "period": "daily", "qualified": true, ... },
    { "period": "weekly", "qualified": false, ... },
    { "period": "monthly", "qualified": false, ... }
  ],
  "bet": {
    "betId": "uuid",
    "updated": true,
    "bothSubmitted": false,
    "autoCompleted": false
  }
}
```

**Response** (200 OK) - Second player submits (auto-complete):
```json
{
  "success": true,
  "accepted": true,
  "tournaments": [...],
  "bet": {
    "betId": "uuid",
    "updated": true,
    "bothSubmitted": true,
    "autoCompleted": true,
    "outcome": "completed",
    "winnerId": "uuid",
    "winnerPayout": 150.00
  }
}
```

**Response** (200 OK) - Tie detected:
```json
{
  "success": true,
  "accepted": true,
  "tournaments": [...],
  "bet": {
    "betId": "uuid",
    "updated": true,
    "bothSubmitted": true,
    "autoCompleted": true,
    "outcome": "rematch",
    "creatorTime": 45.123,
    "acceptorTime": 45.125,
    "timeDifference": 0.002
  }
}
```

**Auto-Completion Rules**:

| Scenario | Outcome |
|----------|---------|
| Both races valid, creator faster | Creator wins, paid 75% of pot |
| Both races valid, acceptor faster | Acceptor wins, paid 75% of pot |
| Both races valid, tie (< 0.01s diff) | Status set to `'rematch'`, no payout |
| Creator flagged, acceptor valid | Acceptor wins by default |
| Acceptor flagged, creator valid | Creator wins by default |
| Both flagged | Bet refunded to both players |

**Error Responses**:
- `400`: Invalid race data, bet not active, already submitted for this bet
- `403`: Not a participant in the bet, account frozen
- `404`: Bet not found

---

## Admin Endpoints

All admin endpoints are prefixed with `/admin` and require admin role.

### 7. Get All Bets (Admin)

Retrieve all bets with comprehensive filtering options.

**Endpoint**: `GET /api/v2/bets/admin/all`

**Authentication**: JWT + API Key + Admin Role

**Query Parameters**:
```typescript
{
  status?: 'open' | 'active' | 'completed' | 'cancelled' | 'refunded' | 'rematch';
  creatorId?: UUID;
  acceptorId?: UUID;
  startDate?: ISO8601;  // Filter createdAt >= startDate
  endDate?: ISO8601;    // Filter createdAt <= endDate
  limit?: number;       // Default: 100, Max: 1000 (ignored if period is specified)
  offset?: number;      // Default: 0 (ignored if period is specified)
  period?: '7d' | '30d' | '365d';  // Optional: Filter by time period
}
```

**Behavior**:
- **Without `period`**: Returns paginated results using `limit` and `offset`
- **With `period`**: Returns ALL bets from the specified time period, bypassing `limit` and `offset`
  - `'7d'`: Last 7 days
  - `'30d'`: Last 30 days
  - `'365d'`: Last 365 days
- **Period precedence**: If both `period` and `startDate`/`endDate` are provided, `period` takes precedence

**Response** (200 OK) - Without period:
```json
{
  "bets": [
    {
      "id": "uuid",
      "creatorId": "uuid",
      "acceptorId": "uuid",
      "betAmount": "100.00",
      "houseFee": "50.00",
      "type": "open",
      "status": "completed",
      "winnerId": "uuid",
      "createdAt": "2026-04-08T12:00:00Z",
      "updatedAt": "2026-04-08T13:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "player123",
        "email": "player123@example.com"
      },
      "acceptor": {
        "id": "uuid",
        "username": "player456",
        "email": "player456@example.com"
      },
      "winner": {
        "id": "uuid",
        "username": "player456",
        "email": "player456@example.com"
      }
    }
  ],
  "total": 523,
  "limit": 100,
  "offset": 0,
  "period": null
}
```

**Response** (200 OK) - With period:
```json
{
  "bets": [
    {
      "id": "uuid",
      "creatorId": "uuid",
      "acceptorId": "uuid",
      "betAmount": "100.00",
      "houseFee": "50.00",
      "type": "open",
      "status": "completed",
      "winnerId": "uuid",
      "createdAt": "2026-04-01T12:00:00Z",
      "updatedAt": "2026-04-01T13:00:00Z",
      "creator": {
        "id": "uuid",
        "username": "player123",
        "email": "player123@example.com"
      },
      "acceptor": {
        "id": "uuid",
        "username": "player456",
        "email": "player456@example.com"
      },
      "winner": {
        "id": "uuid",
        "username": "player456",
        "email": "player456@example.com"
      }
    }
  ],
  "total": 856,
  "limit": 856,
  "offset": 0,
  "period": "7d"
}
```

---

### 8. Complete Bet (Admin)

Complete a bet and pay out the winner. Applies 25% house fee (the "burn").

**Endpoint**: `POST /api/v2/bets/admin/:betId/complete`

**Authentication**: JWT + API Key + Admin Role

**Path Parameters**:
- `betId` (UUID): Bet ID

**Request Body**:
```json
{
  "winnerId": "uuid",
  "raceValidationId": "uuid"  // Optional
}
```

**Validation**:
- `winnerId` (UUID, required): Must be either creator or acceptor
- `raceValidationId` (UUID, optional): Associated race validation

**Business Logic - House Fee Calculation**:
```javascript
totalPot = betAmount * 2;              // Both players contributed
houseFee = totalPot * 0.25;            // 25% house fee (BURNED)
winnerPayout = totalPot - houseFee;    // 75% to winner

// Example: 100 gains per player
// totalPot = 200
// houseFee = 50 (BURNED/removed from circulation)
// winnerPayout = 150 (paid to winner)
```

**Process**:
1. Locks bet row
2. Verifies bet is `'active'`
3. Ensures winnerId is either creator or acceptor
4. Calculates house fee and winner payout
5. Adds `winnerPayout` to winner's `profile.gains`
6. Updates bet status to `'completed'` and sets `winnerId`
7. Logs action to admin_logs

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Bet completed successfully",
  "bet": {
    "id": "uuid",
    "creatorId": "uuid",
    "acceptorId": "uuid",
    "betAmount": "100.00",
    "houseFee": "50.00",
    "status": "completed",
    "winnerId": "uuid",
    "raceValidationId": "uuid"
  },
  "totalPot": 200.00,
  "houseFee": 50.00,
  "winnerPayout": 150.00
}
```

**Error Responses**:
- `400`: Bet is not active, winner must be a participant
- `404`: Bet or winner not found

---

### 9. Refund Bet (Admin)

Refund a bet to both players (if accepted) or just creator (if not accepted).

**Endpoint**: `POST /api/v2/bets/admin/:betId/refund`

**Authentication**: JWT + API Key + Admin Role

**Path Parameters**:
- `betId` (UUID): Bet ID

**Request Body**:
```json
{
  "reason": "Technical issue - server downtime during race"
}
```

**Validation**:
- `reason` (string, required, max: 5000 chars): Refund justification

**Business Logic**:
1. Locks bet row
2. Verifies bet is not already `'completed'` or `'refunded'`
3. Refunds `betAmount` to creator's `profile.gains`
4. If bet was accepted, refunds `betAmount` to acceptor's `profile.gains`
5. Updates bet status to `'refunded'`
6. Logs action to admin_logs with reason

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Bet refunded successfully",
  "bet": {
    "id": "uuid",
    "creatorId": "uuid",
    "acceptorId": "uuid",
    "betAmount": "100.00",
    "status": "refunded",
    "createdAt": "2026-04-08T12:00:00Z",
    "updatedAt": "2026-04-08T14:00:00Z"
  }
}
```

**Error Responses**:
- `400`: Bet has already been completed or refunded
- `404`: Bet or participant not found

---

## Constants & Configuration

### Betting Limits
```javascript
MIN_BET_AMOUNT = 0.01;
MAX_BET_AMOUNT = 10000.00;
HOUSE_FEE_PERCENTAGE = 25;  // 25% of total pot
BET_EXPIRY_HOURS = 24;       // Hours before a bet expires
```

### House Fee Examples

| Bet Amount (per player) | Total Pot | House Fee (25%) | Winner Payout (75%) |
|-------------------------|-----------|-----------------|---------------------|
| 10.00                   | 20.00     | 5.00            | 15.00               |
| 50.00                   | 100.00    | 25.00           | 75.00               |
| 100.00                  | 200.00    | 50.00           | 150.00              |
| 500.00                  | 1000.00   | 250.00          | 750.00              |
| 1000.00                 | 2000.00   | 500.00          | 1500.00             |

---

## Special Features

### Rematch Support

The `'rematch'` status is **now fully implemented** in the automatic completion system. When race times are within 0.01 seconds of each other:

- Bet status is set to `'rematch'`
- No payout occurs (funds remain locked in bet)
- Both race validations are recorded for audit
- Players can submit new races for the same bet
- First to submit a faster time (or opponent submits slower/flagged) wins

This ensures fair competition when races are extremely close.

### Metadata Field

The `metadata` JSONB field stores:
- Historical data about the bet
- Information about deleted users (usernames, balances at time of bet)
- Previous race validation records
- Any additional context needed for audit purposes

### Race Validation Integration

Bets can be linked to race validations via:
- `creator_race_validation_id`: Creator's race result
- `acceptor_race_validation_id`: Acceptor's race result

This allows tracking which specific races determined the bet outcome.

---

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Insufficient gains. Available: 75.50, Required: 100.00"
}
```

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Account required to create bet"
}
```

**403 Forbidden**:
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Account is frozen. Cannot create bet."
}
```

**404 Not Found**:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Bet not found"
}
```

---

## Transaction Safety

All bet operations use database transactions to ensure atomicity:

1. **Create Bet**: Deducting gains and creating bet record are atomic
2. **Accept Bet**: Deducting acceptor gains and updating bet status are atomic
3. **Complete Bet**: Paying winner and updating bet status are atomic
4. **Auto-Complete Bet**: Race validation linking + winner determination + payout are atomic
5. **Cancel/Refund**: Refunding gains and updating bet status are atomic

Row-level locking (`transaction.LOCK.UPDATE`) prevents race conditions when:
- Accepting bets
- Completing bets (manual or automatic)
- Updating with race validations (prevents double-submission)

**Automatic completion is fully transactional** - if any step fails (fetching validations, calculating winner, paying out), the entire operation rolls back and the bet remains in `'active'` status.

---

## Implementation Details

### File Locations

#### Routes
- [routes/v2/bets.router.js](routes/v2/bets.router.js)

#### Services
- [services/bet.service.js](services/bet.service.js)

#### Models
- [db/models/bet.model.js](db/models/bet.model.js)

#### Schemas (Validation)
- [schemas/bet.schema.js](schemas/bet.schema.js)

#### Migrations
- [db/migrations/20260304000000-create-bets-table.js](db/migrations/20260304000000-create-bets-table.js)

#### Middleware
- [middlewares/auth.handler.js](middlewares/auth.handler.js)
  - `checkApiKey`: Validates API key
  - `checkAdminRole`: Ensures user has admin role
  - `checkNotFrozen`: Prevents frozen users from transacting

---

## Summary

### User Flow (Automatic Completion)
1. **Create**: User creates bet → gains deducted → bet opens in marketplace
2. **Accept**: Another user accepts → gains deducted → bet becomes active
3. **Race**: Players compete and submit results with `betId` parameter
4. **First Submission**: System links race validation to bet → waits for opponent
5. **Second Submission**: System automatically:
   - Compares race times
   - Determines winner (fastest time)
   - Pays winner (75% of pot)
   - Burns house fee (25% of pot)
   - Or sets to `'rematch'` if tie

### User Flow (Manual - Legacy)
1-2. Same as above
3. **Race**: Players compete without submitting betId
4. **Admin Review**: Admin manually reviews race results
5. **Complete**: Admin calls complete endpoint with winnerId

### Admin Flow
1. **Monitor**: View all bets with filtering
2. **Resolve**: Complete bets manually if needed (edge cases)
3. **Handle Issues**: Refund bets when necessary
4. **Audit**: All actions logged with timestamps and reasons

### Key Features
- **Automatic bet completion** when both players submit races
- **Intelligent winner determination** (fastest time, handles flagged races)
- **Rematch support** for ties (< 0.01s difference)
- Atomic transactions prevent balance inconsistencies
- 25% house fee on completion (the "burn" mechanism)
- 24-hour expiry for open bets
- Complete audit trail via race validations and admin logs
- Prevention of self-betting and frozen account participation
- Anti-cheat integration (flagged races handled automatically)
