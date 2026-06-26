export type TournamentEvent = {
    id: string;
    name: string;
    startDate: string; // ISO date string
    endDate: string;   // ISO date string
    winningUserId?: string; // Optional, user ID of the winner
    winnerCountry?: string; // Optional, ISO 3166-1 alpha-2 country code of the winner
    iconURL?: string; // Optional, URL to an icon representing the event
    description?: string; // Optional, brief description of the event
    prizeType?: 'cash' | 'points' | 'other' | string; // Optional, type of prize
    prizeAmount?: number; // Optional, amount of the prize
};


export const dummyEvents: TournamentEvent[] = [
    // Singleplayer Daily
    {
        id: "sp-daily-916",
        name: "Single Player Daily Tournament",
        startDate: "2025-09-17T07:00:00Z",
        endDate: "2025-09-18T06:59:00.0Z",
        winningUserId: "user_001",
        iconURL: "logo.png",
        description: "Complete as many levels as possible in a single day!",
        prizeType: 'points',
        prizeAmount: 1000
    },

    // Multiplayer Daily
    {
        id: "mp-daily-001",
        name: "Multiplayer Daily Tournament",
        startDate: "2025-09-18T12:00:00Z",
        endDate: "2025-09-18T23:59:59Z",
        winningUserId: "user_002",
        iconURL: "logo.png",
        description: "Compete against other players in real-time matches throughout the day",
        prizeType: 'cash',
        prizeAmount: 50
    }
].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());