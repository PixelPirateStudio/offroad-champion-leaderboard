import { MergedEntry } from "@/utils/types/leaderboard";
import { LeaderboardHeader } from "./LeaderboardHeader";
import { LeaderboardRow } from "./LeaderboardRow";
import Link from "next/link";

interface TournamentLeaderboardProps {
  title: string;
  date: string;
  type: string;
  description: string;
  endedTime: string;
  memberCount: number;
  prize: string;
  entries: MergedEntry[];
  leaderboardId: string;
  backgroundColor?: string;
  initialDisplayCount?: number;
}

export const TournamentLeaderboard = ({
  title,
  date,
  type,
  description,
  endedTime,
  memberCount,
  prize,
  entries,
  leaderboardId,
  backgroundColor = "bg-black",
  initialDisplayCount = 6,
}: TournamentLeaderboardProps) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    return `00:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}${milliseconds > 0 ? `.${milliseconds}` : ""}`;
  };

  const getFastestTime = (entry: MergedEntry) => {
    // Use API's bestSingleRace if available, otherwise calculate from races
    if (entry.bestSingleRace) return entry.bestSingleRace;
    if (!entry.races || entry.races.length === 0) return 0;
    return Math.min(...entry.races.map((r) => r.time));
  };

  const displayedEntries = entries.slice(0, initialDisplayCount);

  // Create array with actual entries and empty placeholders to fill initialDisplayCount
  const rowsToDisplay = Array.from({ length: initialDisplayCount }, (_, index) => {
    return displayedEntries[index] || null;
  });

  return (
    <div
      className={`${backgroundColor} border border-purple-500 rounded-lg p-3 md:p-4 lg:p-6 font-family-inter`}
    >
      <LeaderboardHeader
        title={title}
        date={date}
        type={type}
        description={description}
        endedTime={endedTime}
        memberCount={memberCount}
        prize={prize}
      />

      {/* Table Header */}
      <div className="grid grid-cols-[60px_1fr_140px_100px_120px] items-center pb-2 mb-2 border-b border-gray-700">
        <div className="text-gray-400 text-sm">Place</div>
        <div className="text-gray-400 text-sm">Player</div>
        <div className="text-gray-400 text-sm flex justify-center">Score</div>
        <div className="text-gray-400 text-sm flex justify-center">Races</div>
        <div className="text-gray-400 text-sm flex justify-center">
          Qualification
        </div>
      </div>

      {/* Leaderboard Rows */}
      <div>
        {rowsToDisplay.map((entry, index) => {
          if (entry) {
            return (
              <LeaderboardRow
                key={entry.userId}
                place={index + 1}
                username={entry.user.username}
                countryCode={entry.user.countryCode}
                score={formatTime(getFastestTime(entry))}
                races={entry.racesCompleted ?? entry.races.length}
                qualified={entry.qualified}
              />
            );
          } else {
            // Empty placeholder row - matches LeaderboardRow styling
            return (
              <div
                key={`empty-${index}`}
                className="grid grid-cols-[60px_1fr_140px_100px_120px] items-center py-0 border- border-gray-800 last:border-b-0 font-family-inter"
              >
                <div className="text-gray-600 text-lg">{index + 1}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl flex-shrink-0 opacity-0">🌐</span>
                  <span className="text-gray-600 text-base truncate">—</span>
                </div>
                <div className="text-gray-600 text-base flex justify-center truncate">—</div>
                <div className="text-gray-600 text-base flex justify-center truncate">—</div>
                <div className="flex justify-center">
                  <div className="w-6 h-6"></div>
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* See More Button */}
        <div className="flex justify-end mt-2 md:mt-3 lg:mt-4">
          <Link href={`/leaderboard/${leaderboardId}`}>
            <button className="text-yellow-500 border border-yellow-500 px-4 py-2 rounded-full text-sm hover:bg-yellow-500 hover:text-black transition-colors font-family-inter">
              See More
            </button>
          </Link>
        </div>
    </div>
  );
};
