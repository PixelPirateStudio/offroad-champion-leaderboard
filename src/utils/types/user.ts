import { LeaderboardEntry, MergedEntry } from "./leaderboard";

export type PublicUser = {
    id: string;
    profileId?: string; // Optional, profile-specific identifier
    username: string;
    countryCode?: string; // Optional, ISO 3166-1 alpha-2 country code
    avatarURL?: string | null; // Optional, URL to the user's avatar image
    name: string;
}
export const mergeUsers = (
    entries: LeaderboardEntry[],
    users: Record<string, PublicUser>
  ) => {
    return entries.map((entry) => ({
      ...entry,
      user: users[entry.userId],
    })) as MergedEntry[];
  };

export const userDictionary: Record<string, PublicUser> = {
    "user_001": {
        id: "user_001",
        username: "alex_chen",
        countryCode: "US",
        name: "Alex Chen"
    },
    "user_002": {
        id: "user_002",
        username: "sarah_wilson",
        countryCode: "CA",
        name: "Sarah Wilson"
    },
    "user_003": {
        id: "user_003",
        username: "miguel_rodriguez",
        countryCode: "ES",
        name: "Miguel Rodriguez"
    },
    "user_004": {
        id: "user_004",
        username: "emma_thompson",
        countryCode: "GB",
        name: "Emma Thompson"
    },
    "user_005": {
        id: "user_005",
        username: "kai_nakamura",
        countryCode: "JP",
        name: "Kai Nakamura"
    },
    "user_006": {
        id: "user_006",
        username: "lucas_silva",
        countryCode: "BR",
        name: "Lucas Silva"
    },
    "user_007": {
        id: "user_007",
        username: "anonymous_user",
        name: "Anonymous User"
    },
    "user_008": {
        id: "user_008",
        username: "zoe_martineau",
        countryCode: "FR",
        name: "Zoe Martineau"
    },
    "user_009": {
        id: "user_009",
        username: "david_kim",
        countryCode: "KR",
        name: "David Kim"
    },
    "user_010": {
        id: "user_010",
        username: "isabella_rossi",
        countryCode: "IT",
        name: "Isabella Rossi"
    },
    "user_011": {
        id: "user_011",
        username: "erik_andersson",
        countryCode: "SE",
        name: "Erik Andersson"
    },
    "user_012": {
        id: "user_012",
        username: "priya_sharma",
        countryCode: "IN",
        name: "Priya Sharma"
    },
    "user_013": {
        id: "user_013",
        username: "mystery_gamer",
        name: "Mystery Gamer"
    },
    "user_014": {
        id: "user_014",
        username: "james_oconnor",
        countryCode: "IE",
        name: "James O'Connor"
    },
    "user_015": {
        id: "user_015",
        username: "nina_mueller",
        countryCode: "DE",
        name: "Nina Mueller"
    },
    "user_016": {
        id: "user_016",
        username: "ryan_taylor",
        countryCode: "AU",
        name: "Ryan Taylor"
    },
    "user_017": {
        id: "user_017",
        username: "sofia_petrov",
        countryCode: "RU",
        name: "Sofia Petrov"
    },
    "user_018": {
        id: "user_018",
        username: "carlos_mendez",
        countryCode: "MX",
        name: "Carlos Mendez"
    },
    "user_019": {
        id: "user_019",
        username: "anonymous_dev",
        name: "Anonymous Developer"
    },
    "user_020": {
        id: "user_020",
        username: "liam_van_berg",
        countryCode: "NL",
        name: "Liam van Berg"
    }
};

export type User = PublicUser & {
    email: string;
    joinDate: string; // ISO date string
}

