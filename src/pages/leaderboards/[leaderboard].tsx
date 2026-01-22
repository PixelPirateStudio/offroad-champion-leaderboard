import { hasFlag } from "country-flag-icons";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { Leaderboard, MergedEntry } from "../../utils/types/leaderboard";
import dayjs, { duration } from "dayjs";
import durations from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { Fragment, useState } from "react";
import { ChevronDownIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { TrackDict } from "../../utils/types/track";
import { GetServerSideProps } from "next";
import { tournamentApi, LeaderboardResponse } from "../../services/tournamentApi";
import {
  transformLeaderboardResponse,
  formatPrize,
} from "../../utils/apiTransformers";
import { useRouter } from "next/router";
dayjs.extend(durations);
dayjs.extend(relativeTime);

// Row component to fix React hooks rule
const TableRow = ({ entry, idx }: { entry: MergedEntry; idx: number }) => {
  const [open, setOpen] = useState(false);
  const avgTime =
    entry.races.length > 0
      ? dayjs
          .duration(
            Math.round(
              entry.races.reduce((sum, race) => sum + race.time, 0) /
                entry.races.length
            )
          )
          .format("m:ss.SSS")
      : "-";

  return (
    <Fragment key={entry.user.username}>
      <tr
        className={`border-0 dark:border-gray-700 font-family-inter
              ${
                idx === 0
                  ? "bg-right-bottom bg-[length:200%_200%] animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-yellow-300/20 via-yellow-300/10 to-yellow-300/0"
                  : ""
              }
              ${
                idx === 1
                  ? "bg-right-bottom bg-[length:200%_200%] animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-gray-300/20 via-gray-300/10 to-gray-300/0"
                  : ""
              }
              ${
                idx === 2
                  ? "bg-right-bottom bg-[length:200%_200%] animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-amber-600/20 via-amber-600/10 to-amber-600/0"
                  : ""
              }
              `}
      >
        <td className="px-4 py-6 font-bold text-gray-700 dark:text-gray-300">
          {idx + 1}
        </td>
        <td className="px-4 py-6 flex items-center gap-2 ">
          {(hasFlag(entry.user.countryCode ?? "") &&
            getUnicodeFlagIcon(entry.user.countryCode ?? "")) ||
            "🌐"}
          <span className="font-bold">{entry.user.name}</span>
          <span className="text-xs text-gray-500">@{entry.user.username}</span>
        </td>
        <td className="px-4 py-6">{avgTime}</td>
        <td className="px-4 py-6">{entry.races.length}</td>
        <td className="px-4 py-6">
          {entry.qualified ? (
            <span className="text-green-600 font-semibold">Yes</span>
          ) : (
            <span className="text-red-600 font-semibold">No</span>
          )}
        </td>
        <td className="px-4 py-6">
          <button
            className="text-blue-600 underline"
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDownIcon
              className={`h-6 w-6 inline-block transition-transform duration-300 ${
                open ? "rotate-180" : "rotate-0"
              }`}
            />
            <span className="sr-only">{open ? "Hide" : "Show"} Races</span>
          </button>
        </td>
      </tr>
      <tr className={`${open ? "" : "hidden"} bg-gray-50 dark:bg-zinc-900/50`}>
        <td colSpan={6} className="px-4 py-6 bg-gray-50/40 dark:bg-zinc-900/0">
          <table
            key={`races-${entry.user.id}`}
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700/50 overflow-hidden"
          >
            <thead
              className={`bg-gray-200/40 dark:bg-zinc-800/0 overflow-hidden rounded-xl font-family-inter`}
            >
              <tr className={`dark:text-gray-100/40 text-gray-900/40`}>
                <th className="px-4 py-2 text-left font-semibold">
                  Track Name
                </th>
                <th className="px-4 py-2 text-left font-semibold w-16">Time</th>
                <th className="px-4 py-2 font-semibold w-40 text-right">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className={``}>
              {entry.races.map((race, index) => (
                <tr
                  key={`${entry.user.id}-${race.trackID}-${index}`}
                  className="border-b last:border-0 dark:border-gray-700/20 font-family-inter"
                >
                  <td className="px-4 py-4 text-lg font-bold">
                    {TrackDict[race.trackID as keyof typeof TrackDict].name}
                  </td>
                  <td className="px-4 py-4">
                    {duration(race.time).format("m:ss.SSS")}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {dayjs(race.date).format("MMM D, YYYY [at] h:mm A")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </td>
      </tr>
    </Fragment>
  );
};

export const LeaderboardPage = (props: {
  leaderboard: Leaderboard;
  entries: MergedEntry[];
}) => {
  const { leaderboard, entries } = props;
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className={`w-full min-h-screen relative`}>
      <div
        className={`flex flex-col gap-8 w-full min-h-screen h-full absolute overflow-clip`}
      >
        <div
          className="absolute top-0 left-0 w-full h-full animate-[spin_20s_ease_infinite] scale-200 dark:opacity-30 dark:saturate-200"
          style={{
            background: `radial-gradient(at 2% 50%, hsla(275,79%,74%,0.4) 0px, transparent 50%),
      radial-gradient(at 18% 20%, hsla(275,88%,72%,0.4) 0px, transparent 50%),
      radial-gradient(at 16% 20%, hsla(265,83%,72%,0.4) 0px, transparent 50%),
      radial-gradient(at 45% 55%, hsla(214,77%,67%,0.4) 0px, transparent 50%),
      radial-gradient(at 63% 89%, hsla(330,89%,76%,0.4) 0px, transparent 50%),
      radial-gradient(at 47% 72%, hsla(327,61%,75%,0.4) 0px, transparent 50%),
      radial-gradient(at 6% 7%, hsla(320,84%,68%,0.4) 0px, transparent 50%)`,
          }}
        />
      </div>
      <div
        className={`relative max-w-7xl h-auto z-10 mx-auto pt-24 md:pt-28 lg:pt-32 pb-8 md:pb-16 lg:pb-24 gap-8 md:gap-12 lg:gap-16 flex flex-col px-4 md:px-8 lg:px-16`}
      >
        {/* Back Button - positioned below the navbar */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors group self-start -mt-8 md:-mt-12 lg:-mt-16 mb-0"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm md:text-base font-semibold">Back</span>
        </button>
        <div className={`absolute top-4 md:top-8 right-4 md:right-8`}>
          {Date.now() < new Date(leaderboard.endDate).getTime() ? (
            <span className="px-3 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 dark:bg-zinc-900/40 bg-gray-100/40 text-gray-800 dark:text-gray-200 text-sm md:text-base font-semibold rounded-xl border border-gray-900/20 dark:border-gray-100/30">
              Ongoing {dayjs(leaderboard.endDate).fromNow()}
            </span>
          ) : (
            <span className="px-3 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 dark:bg-zinc-900/40 bg-gray-100/40 text-gray-800 dark:text-gray-200 text-sm md:text-base font-semibold rounded-xl border border-gray-900/20 dark:border-gray-100/30">
              Ended {dayjs(leaderboard.endDate).fromNow()}
            </span>
          )}
        </div>
        <div
          className={`flex flex-row gap-4 md:gap-6 lg:gap-8 relative p-4 md:p-6 lg:p-8 border border-gray-900/20 dark:border-gray-100/30 shadow-xl rounded-2xl bg-gradient-to-br dark:from-zinc-800/80 dark:via-zinc-900/60 dark:to-zinc-950/60 from-white/50 via-zinc-100/50 to-zinc-200/50 backdrop-blur-lg w-full`}
        >
          <img
            src={"/logo.png"}
            alt="logo"
            className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16"
          />
          <div className={`flex flex-col gap-2`}>
            <h1
              className={`text-2xl md:text-3xl lg:text-4xl font-bold font-family-inter`}
            >
              {leaderboard.name}
            </h1>
            <p className={`text-base md:text-lg font-family-inter`}>
              {leaderboard.description}
            </p>
          </div>
        </div>
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8`}
        >
          {/* Second place */}
          <div
            className={`p-4 md:p-5 lg:p-6 py-6 md:py-7 lg:py-8 border ring-4 ring-gray-600 border-gray-900/20 dark:border-gray-100/30 shadow-xl rounded-2xl max-w-prose bg-gradient-to-br dark:from-zinc-800/80 dark:via-zinc-900/60 dark:to-zinc-950/60 from-white/50 via-zinc-100/50 to-zinc-200/50 backdrop-blur-lg w-full flex flex-col gap-3 md:gap-4 scale-95`}
          >
            {/* Second place */}
            <div className={`flex flex-col gap-2 items-start`}>
              <div className={`flex flex-row items-center gap-2 w-full`}>
                <div
                  className={`h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold`}
                >
                  {(hasFlag(entries[1]?.user.countryCode ?? "") &&
                    getUnicodeFlagIcon(entries[1]?.user.countryCode ?? "")) ||
                    "🌐"}
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`font-bold text-xl font-family-inter`}>
                    {entries[1]?.user.name}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    @{entries[1]?.user.username}
                  </span>
                </div>
              </div>
              <div
                className={`flex flex-row gap-8 w-full justify-between mt-4`}
              >
                <div className={`flex flex-col items-start`}>
                  <span className={`text-3xl font-bold font-family-inter`}>
                    {entries[1]?.races &&
                      dayjs
                        .duration(
                          entries[1].races.reduce(
                            (min, race) => (race.time < min ? race.time : min),
                            Infinity
                          )
                        )
                        .format("m:ss.SSS")}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Best Time
                  </span>
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`text-2xl font-bold font-family-inter`}>
                    {entries[1]?.races?.length || 0}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Total Races
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* First place */}
          <div
            className={`p-4 md:p-5 lg:p-6 py-6 md:py-7 lg:py-8 ring-4 dark:ring-yellow-500 shadow-xl rounded-2xl max-w-prose bg-gradient-to-br dark:from-yellow-500/20 dark:via-yellow-600/20 dark:to-yellow-900/40 from-yellow/50 via-yellow-100/50 to-yellow-200/50 backdrop-blur-lg w-full flex flex-col gap-3 md:gap-4 scale-100`}
          >
            <div className={`flex flex-col gap-2 items-start`}>
              <div className={`flex flex-row items-center gap-2 w-full`}>
                <div
                  className={`h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold`}
                >
                  {(hasFlag(entries[0]?.user.countryCode ?? "") &&
                    getUnicodeFlagIcon(entries[0]?.user.countryCode ?? "")) ||
                    "🌐"}
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`font-bold text-xl font-family-inter`}>
                    {entries[0]?.user.name}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    @{entries[0]?.user.username}
                  </span>
                </div>
              </div>
              <div
                className={`flex flex-row gap-8 w-full justify-between mt-4`}
              >
                <div className={`flex flex-col items-start`}>
                  <span className={`text-3xl font-bold font-family-inter`}>
                    {entries[0]?.races &&
                      dayjs
                        .duration(
                          entries[0].races.reduce(
                            (min, race) => (race.time < min ? race.time : min),
                            Infinity
                          )
                        )
                        .format("m:ss.SSS")}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Best Time
                  </span>
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`text-2xl font-bold font-family-inter`}>
                    {entries[0]?.races?.length || 0}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Total Races
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Third place */}
          <div
            className={`p-4 md:p-5 lg:p-6 py-6 md:py-7 lg:py-8 ring-4 dark:ring-amber-700 ring-amber-800 shadow-xl rounded-2xl max-w-prose bg-gradient-to-br dark:from-amber-900/20 dark:via-amber-900/20 dark:to-amber-900/40 from-yellow/50 via-yellow-100/50 to-yellow-200/50 backdrop-blur-lg w-full flex flex-col gap-3 md:gap-4 scale-90`}
          >
            <div className={`flex flex-col gap-2 items-start`}>
              <div className={`flex flex-row items-center gap-2 w-full`}>
                <div
                  className={`h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold`}
                >
                  {(hasFlag(entries[2]?.user.countryCode ?? "") &&
                    getUnicodeFlagIcon(entries[2]?.user.countryCode ?? "")) ||
                    "🌐"}
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`font-bold text-xl font-family-inter`}>
                    {entries[2]?.user.name}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    @{entries[2]?.user.username}
                  </span>
                </div>
              </div>
              <div
                className={`flex flex-row gap-8 w-full justify-between mt-4`}
              >
                <div className={`flex flex-col items-start`}>
                  <span className={`text-3xl font-bold font-family-inter`}>
                    {entries[2]?.races &&
                      dayjs
                        .duration(
                          entries[2].races.reduce(
                            (min, race) => (race.time < min ? race.time : min),
                            Infinity
                          )
                        )
                        .format("m:ss.SSS")}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Best Time
                  </span>
                </div>
                <div className={`flex flex-col items-start`}>
                  <span className={`text-2xl font-bold font-family-inter`}>
                    {entries[2]?.races?.length || 0}
                  </span>
                  <span className={`text-sm text-gray-500 font-family-inter`}>
                    Total Races
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`flex flex-col gap-4 border border-gray-900/20 dark:border-gray-100/30 shadow-xl rounded-3xl bg-gradient-to-br dark:from-zinc-800/80 dark:via-zinc-900/60 dark:to-zinc-950/60 from-white/50 via-zinc-100/50 to-zinc-200/50 backdrop-blur-lg`}
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-3xl">
            <thead
              className={`bg-gray-900/30 overflow-hidden rounded-xl font-family-inter`}
            >
              <tr>
                <th className="px-4 py-6 text-left font-semibold">#</th>
                <th className="px-4 py-6 text-left font-semibold">Name</th>
                <th className="px-4 py-6 text-left font-semibold">Avg Time</th>
                <th className="px-4 py-6 text-left font-semibold">Races</th>
                <th className="px-4 py-6 text-left font-semibold">Qualified</th>
                <th className="px-4 py-6 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className={`gap-4`}>
              {entries.map((entry, idx) => (
                <TableRow key={entry.user.id} entry={entry} idx={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default LeaderboardPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const leaderboardId = context.params?.leaderboard as string;

  // Parse leaderboard ID to determine period and mode
  // Format: "daily", "weekly", "monthly" (singleplayer) or "daily-multi", "weekly-multi", "monthly-multi" (multiplayer)
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
    // Default to daily if not recognized
    period = "daily";
  }

  try {
    // Fetch prize configuration
    const prizes = await tournamentApi.getPrizes();

    // Fetch leaderboard data
    const response = await tournamentApi.getLeaderboard({
      period,
      mode,
      limit: 500, // Get more entries for detailed leaderboard page
    });

    // Get the appropriate prize
    const prize = prizes[period][mode].first;

    // Transform response
    const leaderboardData = transformLeaderboardResponse(
      response as LeaderboardResponse,
      leaderboardId,
      formatPrize(prize)
    );

    return {
      props: {
        leaderboard: leaderboardData.leaderboard,
        entries: leaderboardData.entries,
      },
    };
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);

    // Return empty data on error
    return {
      props: {
        leaderboard: {} as Leaderboard,
        entries: [],
      },
    };
  }
};
