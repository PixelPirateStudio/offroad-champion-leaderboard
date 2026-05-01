// Race Generator Utilities for creating random races and validation

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export interface RaceData {
  trackId: string;
  mode: 'singleplayer' | 'multiplayer';
  period?: 'daily' | 'weekly' | 'monthly';
  raceTime: string;
  vehicleId: string;
  timestamp: string;
  checkpoints: string;
  validationHash: string;
}

export interface SubmitResultRequest {
  userId: string;
  profileId: string;
  raceData: RaceData;
  betId?: string;
}

export interface SubmitResultResponse {
  message: string;
  bothSubmitted?: boolean;
  autoCompleted?: boolean;
  outcome?: 'completed' | 'rematch' | 'refunded';
  winnerId?: string;
  totalPot?: string | number; // API may return string
  houseFee?: string | number; // API may return string
  winnerPayout?: string | number; // API may return string
  creatorTime?: string | number; // API may return string
  acceptorTime?: string | number; // API may return string
  timeDifference?: string | number; // API may return string
}

/**
 * Generate a random vehicle ID
 */
function getRandomVehicleId(): string {
  const vehicleIds = [
    'vehicle_01',
    'vehicle_02',
    'vehicle_03',
    'vehicle_04',
    'vehicle_05',
    'vehicle_06',
    'vehicle_07',
    'vehicle_08',
  ];
  return vehicleIds[Math.floor(Math.random() * vehicleIds.length)];
}

/**
 * Generate random race data with 4 checkpoints
 * Total time will be between 30-90 seconds
 */
export function generateRandomRace(
  trackId: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Omit<RaceData, 'validationHash'> {
  // Generate random total time between 30 and 90 seconds
  const totalTime = (Math.random() * 60 + 30).toFixed(3);
  const totalTimeFloat = parseFloat(totalTime);

  // Generate 4 checkpoints that are monotonically increasing
  const checkpoint1 = (totalTimeFloat * (0.20 + Math.random() * 0.05)).toFixed(3); // ~20-25% of total
  const checkpoint2 = (totalTimeFloat * (0.40 + Math.random() * 0.05)).toFixed(3); // ~40-45% of total
  const checkpoint3 = (totalTimeFloat * (0.65 + Math.random() * 0.10)).toFixed(3); // ~65-75% of total
  const checkpoint4 = totalTime; // Final checkpoint = total time

  const checkpoints = `${checkpoint1},${checkpoint2},${checkpoint3},${checkpoint4}`;

  const raceData: Omit<RaceData, 'validationHash'> = {
    trackId,
    mode: 'multiplayer',
    raceTime: totalTime,
    vehicleId: getRandomVehicleId(),
    timestamp: new Date().toISOString(),
    checkpoints,
  };

  // Only include period if provided
  if (options?.period) {
    raceData.period = options.period;
  }

  return raceData;
}

/**
 * Generate SHA-256 validation hash
 * Hash format: sha256(profileId:checkpoints:raceTime)
 */
export async function generateValidationHash(
  profileId: string,
  checkpoints: string,
  raceTime: string
): Promise<string> {
  const deterministicString = `${profileId}:${checkpoints}:${raceTime}`;

  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(deterministicString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Generate complete race data with validation hash
 */
export async function generateCompleteRaceData(
  trackId: string,
  profileId: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Promise<RaceData> {
  const raceData = generateRandomRace(trackId, options);
  const validationHash = await generateValidationHash(
    profileId,
    raceData.checkpoints,
    raceData.raceTime
  );

  return {
    ...raceData,
    validationHash,
  };
}

/**
 * Submit race result to the backend
 */
export async function submitRaceResult(
  request: SubmitResultRequest
): Promise<SubmitResultResponse> {
  const token = localStorage.getItem('userToken');

  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    // Debug: Log the request being sent
    console.log('Submitting race result:', JSON.stringify(request, null, 2));

    const response = await fetch(`${API_URL}/api/v2/tournament/submit-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api': API_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to submit race result');
    }

    const data: SubmitResultResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while submitting race result');
  }
}
