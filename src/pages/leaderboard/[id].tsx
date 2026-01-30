import { ContestInfo } from "@/components/LeaderboardDetail/ContestInfo";
import { StandingsRow } from "@/components/LeaderboardDetail/StandingsRow";
import { MergedEntry } from "@/utils/types/leaderboard";
import { GetServerSideProps } from "next";
import { tournamentApi, LeaderboardResponse } from "@/services/tournamentApi";
import {
  transformLeaderboardResponse,
  formatPrize,
} from "@/utils/apiTransformers";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const trackNames: Record<string, string> = {
  track1: "Mountain Trace",
  track2: "Snow Caps",
  track3: "Forest Hills",
  track4: "Sand Town",
  track5: "Hell's Kitchen",
  track6: "Devils Ridge",
  track7: "River Town",
  track8: "Doom Valley",
  track9: "Cactus Grasslands",
  track10: "Terry's Lane",
  track11: "Water World",
  track12: "Savage Swamps",
};

interface LeaderboardDetailProps {
  sortedEntries: Array<MergedEntry & { fastestTime: number }>;
  leaderboardName: string;
  startDate: string;
  endDate: string;
  prizeAmount: string;
  qualifyingRaces: number;
}

export default function LeaderboardDetail({
  sortedEntries,
  leaderboardName,
  startDate,
  endDate,
  prizeAmount,
  qualifyingRaces,
}: LeaderboardDetailProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}:${milliseconds.toString().padStart(3, "0")}`;
  };

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌐";
    return countryCode
      .toUpperCase()
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");
  };

  const winner = sortedEntries[0];

  return (
    <div className="min-h-screen bg-[#0B0A1B] p-3 md:p-6 lg:p-8 font-family-inter">
      <div className="max-w-7xl mx-auto">
        {/* Back Button - positioned below the navbar */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors mb-4 mt-20 md:mt-16 lg:mt-20 group"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm md:text-base font-semibold">Back</span>
        </button>

        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-4 md:mb-6 lg:mb-8">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-4xl font-bold text-orange-500 mb-2">
                    {leaderboardName}
                  </h1>
                  <p className="text-lg lg:text-xl text-white mb-2">
                    {dayjs(startDate).format("M/D/YYYY")}
                  </p>
                  <p className="text-gray-400 text-sm">
                    All contestants must complete at least {qualifyingRaces} races to qualify.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Best race time wins.
                  </p>
                </div>

                <div className="flex gap-4 lg:gap-8 w-full lg:w-auto">
                  <div className="text-left lg:text-right flex-1 lg:flex-none">
                    <div className="text-gray-400 text-sm mb-1">Prize Pool</div>
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/coin.svg"
                        alt="Prize"
                        className="w-6 h-6 lg:w-8 lg:h-8"
                      />
                      <span className="text-white text-xl lg:text-2xl font-bold">
                        {prizeAmount}
                      </span>
                    </div>
                  </div>
                  <div className="text-left lg:text-right flex-1 lg:flex-none">
                    <div className="text-gray-400 text-sm mb-1">Players</div>
                    <div className="text-orange-500 text-xl lg:text-2xl font-bold">
                      {sortedEntries.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contest Info */}
            <ContestInfo
              contestType="Time Trials"
              winnerUsername={winner?.user.username || "TBD"}
              winnerFlag={getCountryFlag(winner?.user.countryCode)}
              rules={[
                "Lowest race time wins. To qualify for the tournament you need to race at lease 10 races in one day.",
                "Best time for the day will receive $5.",
                "Best time every week gets $25",
                "Best time every month gets $250",
              ]}
            />

            {/* Standings */}
            <div className="mb-4 md:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 md:mb-4">
                Standings
              </h2>
              <div className="hidden lg:grid grid-cols-[80px_1fr_100px_100px_140px] items-center mb-4 px-2 md:px-4">
                <div className="text-gray-400 text-sm text-center"></div>
                <div className="text-gray-400 text-sm">Race</div>
                <div className="text-gray-400 text-sm text-center">Qualify</div>
                <div className="text-gray-400 text-sm text-center"></div>
                <div className="text-gray-400 text-sm text-center">
                  Best time
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                {sortedEntries.map((entry, index) => (
                  <StandingsRow
                    key={entry.userId}
                    place={index + 1}
                    username={entry.user.username || JSON.stringify(entry)}
                    countryFlag={getCountryFlag(entry.user.countryCode)}
                    raceCount={entry.racesCompleted ?? entry.races.length}
                    qualified={entry.qualified}
                    bestTime={formatTime(entry.fastestTime)}
                    isWinner={index === 0}
                    races={entry.races.sort((a, b) => a.time - b.time)}
                    trackNames={trackNames}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-red-500 text-sm mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Ended 13 hours ago
                </div>
                <div className="text-white text-center mb-2">February 2025</div>
                <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
                  <div>S</div>
                  <div>M</div>
                  <div>T</div>
                  <div>W</div>
                  <div>T</div>
                  <div>F</div>
                  <div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {[...Array(35)].map((_, i) => {
                    const day = i - 2;
                    if (day < 1 || day > 28) {
                      return (
                        <div key={i} className="w-6 h-6 text-gray-600">
                          {day < 1 ? 28 + day : day - 28}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        className={`w-6 h-6 flex items-center justify-center ${
                          day === 5
                            ? "bg-green-500 text-white rounded-full"
                            : day === 6
                            ? "bg-white text-black rounded-full"
                            : "text-white"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="text-white text-center mt-2 text-sm">
                  9:00 AM EST
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const leaderboardId = context.params?.id as string;

  // Parse leaderboard ID to determine period and mode
  const isMultiplayer = leaderboardId.endsWith("-multi");
  const mode = isMultiplayer ? "multiplayer" : "singleplayer";

  let period: "daily" | "weekly" | "monthly";
  if (leaderboardId.startsWith("daily")) {
    period = "daily";
  } else if (leaderboardId.startsWith("weekly")) {
    period = "weekly";
  } else if (leaderboardId.startsWith("monthly")) {
    period = "monthly";
  } else {
    period = "daily";
  }

  try {
    // Fetch prize configuration
    const prizes = await tournamentApi.getPrizes();

    // Fetch leaderboard data
    const response = await tournamentApi.getLeaderboard({
      period,
      mode,
      limit: 500,
    });

    const apiResponse = response as LeaderboardResponse;

    // Get the appropriate prize
    const prize = prizes[period][mode].first;

    // Transform response
    const leaderboardData = transformLeaderboardResponse(
      apiResponse,
      leaderboardId,
      formatPrize(prize)
    );

    // Sort by fastest time (use API's bestSingleRace if available)
    const sortedEntries = leaderboardData.entries
      .map((entry) => ({
        ...entry,
        fastestTime: entry.bestSingleRace ?? (
          entry.races.length > 0
            ? Math.min(...entry.races.map((r) => r.time))
            : Infinity
        ),
      }))
      .sort((a, b) => a.fastestTime - b.fastestTime);

    return {
      props: {
        sortedEntries,
        leaderboardName: leaderboardData.leaderboard.name,
        startDate: apiResponse.tournament.startDate,
        endDate: apiResponse.tournament.endDate,
        prizeAmount: formatPrize(prize),
        qualifyingRaces: apiResponse.tournament.qualifyingRaces,
      },
    };
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);

    return {
      props: {
        sortedEntries: [],
        leaderboardName: "Tournament",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        prizeAmount: "$0.00",
        qualifyingRaces: 10,
      },
    };
  }
};
