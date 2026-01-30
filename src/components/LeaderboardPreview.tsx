import {
  Leaderboard,

  MergedEntry,
} from "../utils/types/leaderboard";
import dayjs from "dayjs";
import durations from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(durations);
dayjs.extend(relativeTime);
import { hasFlag } from "country-flag-icons";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import {
  BanknotesIcon,

  EyeIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export const LeaderboardPreview = (props: {
  leaderboard: Leaderboard;
  entries: MergedEntry[];
}) => {
  const { leaderboard, entries } = props;
  return (
    <div className="p-6 py-8 border border-gray-900/20 dark:border-gray-100/30 shadow-xl rounded-2xl max-w-prose bg-gradient-to-br dark:from-zinc-800/80 dark:via-zinc-900/60 dark:to-zinc-950/60 from-white/50 via-zinc-100/50 to-zinc-200/50 backdrop-blur-lg w-full flex flex-col gap-4">
      <div
        className={`border border-gray-900/10 dark:border-gray-100/10 p-2 rounded-lg dark:bg-zinc-900/50 flex flex-row items-center gap-4 w-fit px-6`}
      >
        <BanknotesIcon className={`h-8 w-8 text-green-500`} />
        <p
          className={`text-center text-lg font-semibold text-gray-700 dark:text-gray-300`}
        >
          Top Prize {leaderboard.reward}
        </p>
      </div>
      {leaderboard.startDate && (
        <p className=" text-gray-600 dark:text-gray-400 font-family-work-sans font-medium text-sm">
          {dayjs(leaderboard.startDate).format("MMMM D, YYYY")} -{" "}
          {dayjs(leaderboard.endDate).format("MMMM D, YYYY")}
        </p>
      )}

      <div className={`flex flex-row gap-2 items-center `}>
        <img src="/logo.png" alt="logo" className="h-8 w-8 " />
        <h2 className="text-2xl font-bold font-family-montserrat">
          {leaderboard.name}
        </h2>
      </div>
      {leaderboard.startDate && (
        <p className=" text-gray-500 dark:text-gray-400 font-family-work-sans font-medium text-sm">
          {new Date(leaderboard.endDate).getTime() > Date.now()
            ? `Ends ${dayjs(leaderboard.endDate).fromNow()}`
            : `Ended ${dayjs(leaderboard.endDate).fromNow()}`}
        </p>
      )}
      {leaderboard.description && (
        <p className=" text-gray-600 dark:text-gray-300 font-family-work-sans font">
          {leaderboard.description}
        </p>
      )}

      {/* <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Event ID: {leaderboard.eventId} | Start:{" "}
        {new Date(leaderboard.startDate).toLocaleDateString()} | End:{" "}
        {new Date(leaderboard.endDate).toLocaleDateString()}
      </p> */}
      <div className={`flex flex-row gap-4 items-center justify-between font-family-montserrat`}>
        <h3 className="text-xl font-semibold mb-2">Top Contestants</h3>
        <div className={`flex flex-row gap-4 items-center font-bold`}>
          <span className={`text-gray-500 dark:text-gray-400 w-24 text-end`}>
            Best Time
          </span>
          <span className={`text-gray-500 dark:text-gray-400 w-24 text-end`}>
            Races
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {entries.slice(0, 5).map((entry, index) => (
          <div
            className="flex flex-row gap-2 items-center"
            key={entry.userId}
            style={{
              background:
                index === 0
                  ? "radial-gradient(circle at left, rgba(255, 215, 0, 0.2), transparent)"
                  : index === 1
                  ? "radial-gradient(circle at left, rgba(192, 192, 192, 0.2), transparent)"
                  : index === 2
                  ? "radial-gradient(circle at left, rgba(205, 127, 50, 0.2), transparent)"
                  : "transparent",
              padding: "0.5rem",
              borderRadius: "0.5rem",
            }}
          >
            <span className="text-xl font-mono font-bold text-gray-700 dark:text-gray-300">
              {index + 1}
            </span>
            {/* Display country flag if available */}
            <div
              className={`flex flex-row justify-between items-center w-full font-family-work-sans`}
            >
              <span key={entry.userId} className={`font-bold`}>
                {" "}
                {(hasFlag(entry.user.countryCode ?? "") &&
                  getUnicodeFlagIcon(entry.user.countryCode ?? "")) ||
                  "🌐"}{" "}
                {entry.user.name}
              </span>
              <div className={`flex flex-row gap-4 items-center font-semibold`}>
                <span
                  className={`text-gray-600 dark:text-gray-300 w-24 text-end`}
                >
                  {entry.avgRaceTime
                    ? dayjs.duration(entry.avgRaceTime).format("mm:ss:SSS")
                    : "-"}
                </span>
                <span
                  className={`text-gray-600 dark:text-gray-300 w-24 text-end`}
                >
                  {entry.racesCompleted ?? entry.races.length} Races
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`flex flex-row justify-end`}>
        <Link className={`px-4 py-2 bg-gray-200 dark:bg-zinc-950 dark:border-zinc-100/20 shadow-2xl rounded-full flex flex-row gap-2 items-center cursor-pointer hover:dark:bg-gray-50 hover:dark:text-gray-900 hover:bg-gray-900 hover:text-gray-100 transition-all duration-200`} href={`/leaderboards/${leaderboard.id}`}>
          <EyeIcon
            className={`h-6 w-6 inline-block mr-1`}
          />
          <span className={`text-sm font-bold font-family-montserrat`}>View Leaderboard</span>
        </Link>
      </div>
    </div>
  );
};
export default LeaderboardPreview;
