import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { RecentEvents } from "../components/v2/RecentEvents/RecentEvents";
import { TournamentEvent } from "../utils/types/events";
import { Podium } from "../components/v2/AllTimeBest/Podium";
import { TournamentLeaderboard } from "../components/v2/TournamentLeaderboard/TournamentLeaderboard";
import { MergedEntry } from "../utils/types/leaderboard";
import { tournamentApi, LeaderboardResponse, TournamentSummaryResponse } from "../services/tournamentApi";
import {
  transformLeaderboardResponse,
  generateLeaderboardId,
  formatPrize,
} from "../utils/apiTransformers";
import dayjs from "dayjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface HomeProps {
  dailySingleEntries: MergedEntry[];
  dailyMultiEntries: MergedEntry[];
  weeklySingleEntries: MergedEntry[];
  weeklyMultiEntries: MergedEntry[];
  monthlySingleEntries: MergedEntry[];
  monthlyMultiEntries: MergedEntry[];
  recentEvents: TournamentEvent[];
  prizes: {
    dailySP: string;
    dailyMP: string;
    weeklySP: string;
    weeklyMP: string;
    monthlySP: string;
    monthlyMP: string;
  };
  tournamentDates: {
    dailySP: { startDate: string; endDate: string };
    dailyMP: { startDate: string; endDate: string };
    weeklySP: { startDate: string; endDate: string };
    weeklyMP: { startDate: string; endDate: string };
    monthlySP: { startDate: string; endDate: string };
    monthlyMP: { startDate: string; endDate: string };
  };
}

export default function Home({
  dailySingleEntries,
  dailyMultiEntries,
  weeklySingleEntries,
  weeklyMultiEntries,
  monthlySingleEntries,
  monthlyMultiEntries,
  recentEvents,
  prizes,
  tournamentDates,
}: HomeProps) {

  const getTimeStatus = (endDate: string) => {
    const now = dayjs();
    const end = dayjs(endDate);

    if (now.isAfter(end)) {
      const duration = now.diff(end);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const minutes = Math.floor(duration / (1000 * 60));
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      }
    } else {
      const duration = end.diff(now);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `in ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        const minutes = Math.floor(duration / (1000 * 60));
        return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-start justify-items-center min-h-screen p-4 pb-12 gap-8 md:p-6 md:pb-16 md:gap-12 lg:p-8 lg:pb-20 lg:gap-16 relative`}
    >
      {/* Background Gradient */}
      <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 2906 3521" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <rect width="2906" height="3521" fill="url(#paint0_linear_1_3)"/>
        <defs>
          <linearGradient id="paint0_linear_1_3" x1="1453" y1="0" x2="1453" y2="3521" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0E0A1B"/>
            <stop offset="0.4375" stopColor="#190F31"/>
          </linearGradient>
        </defs>
      </svg>

      <main className="flex flex-col gap-4 md:gap-6 lg:gap-8 row-start-2 max-w-7xl w-full pt-4">
        {/* Top Section - Recent Events and Podium */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-stretch">
          <RecentEvents events={recentEvents} />
          <Podium entries={dailySingleEntries} />
        </div>

        {/* Tournament Leaderboards - 2x3 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-3 gap-4 md:gap-5 lg:gap-6">
          {/* Multi-Player Column */}
          <div className="flex flex-col gap-4 md:gap-5 lg:grid lg:grid-rows-subgrid lg:gap-0 lg:row-span-3 border-[3px] border-[#FC8B00] rounded-[10px] p-3">
            <TournamentLeaderboard
              title="Multi-Player: Daily Tournament:"
              date={dayjs(tournamentDates.dailyMP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best times today"
              endedTime={getTimeStatus(tournamentDates.dailyMP.endDate)}
              memberCount={dailyMultiEntries.length}
              prize={prizes.dailyMP}
              entries={dailyMultiEntries}
              leaderboardId="daily-multi"
              backgroundColor="bg-black"
            />

            <TournamentLeaderboard
              title="Multi-Player: Weekly Tournament:"
              date={dayjs(tournamentDates.weeklyMP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best weeks times"
              endedTime={getTimeStatus(tournamentDates.weeklyMP.endDate)}
              memberCount={weeklyMultiEntries.length}
              prize={prizes.weeklyMP}
              entries={weeklyMultiEntries}
              leaderboardId="weekly-multi"
              backgroundColor="bg-[#0A0520]"
            />

            <TournamentLeaderboard
              title="Multi-Player: Monthly Tournament"
              date={dayjs(tournamentDates.monthlyMP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best months times"
              endedTime={getTimeStatus(tournamentDates.monthlyMP.endDate)}
              memberCount={monthlyMultiEntries.length}
              prize={prizes.monthlyMP}
              entries={monthlyMultiEntries}
              leaderboardId="monthly-multi"
              backgroundColor="bg-black"
            />
          </div>

          {/* Career Mode Column */}
          <div className="flex flex-col gap-4 md:gap-5 lg:grid lg:grid-rows-subgrid lg:gap-0 lg:row-span-3 border-[3px] border-[#00FC03] rounded-[10px] p-3">
            <TournamentLeaderboard
              title="Career Mode: Daily Tournament:"
              date={dayjs(tournamentDates.dailySP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best times today"
              endedTime={getTimeStatus(tournamentDates.dailySP.endDate)}
              memberCount={dailySingleEntries.length}
              prize={prizes.dailySP}
              entries={dailySingleEntries}
              leaderboardId="daily"
              backgroundColor="bg-black"
            />

            <TournamentLeaderboard
              title="Career Mode: Weekly Tournament"
              date={dayjs(tournamentDates.weeklySP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best weeks times"
              endedTime={getTimeStatus(tournamentDates.weeklySP.endDate)}
              memberCount={weeklySingleEntries.length}
              prize={prizes.weeklySP}
              entries={weeklySingleEntries}
              leaderboardId="weekly"
              backgroundColor="bg-[#0A0520]"
            />

            <TournamentLeaderboard
              title="Career Mode: Monthly Tournament:"
              date={dayjs(tournamentDates.monthlySP.startDate).format("M/D/YYYY")}
              type="Time Trials"
              description="Best months times"
              endedTime={getTimeStatus(tournamentDates.monthlySP.endDate)}
              memberCount={monthlySingleEntries.length}
              prize={prizes.monthlySP}
              entries={monthlySingleEntries}
              leaderboardId="monthly"
              backgroundColor="bg-black"
            />
          </div>
        </div>
      </main>
      {/* <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer> */}
    </div>
  );
}

export const getServerSideProps = async () => {
  try {
    // Fetch prizes, all 6 leaderboards, and recent winners in parallel
    const [
      prizes,
      dailySPResponse,
      dailyMPResponse,
      weeklySPResponse,
      weeklyMPResponse,
      monthlySPResponse,
      monthlyMPResponse,
      summaryResponse,
    ] = await Promise.all([
      tournamentApi.getPrizes(),
      tournamentApi.getLeaderboard({
        period: "daily",
        mode: "singleplayer",
        limit: 100,
      }),
      tournamentApi.getLeaderboard({
        period: "daily",
        mode: "multiplayer",
        limit: 100,
      }),
      tournamentApi.getLeaderboard({
        period: "weekly",
        mode: "singleplayer",
        limit: 100,
      }),
      tournamentApi.getLeaderboard({
        period: "weekly",
        mode: "multiplayer",
        limit: 100,
      }),
      tournamentApi.getLeaderboard({
        period: "monthly",
        mode: "singleplayer",
        limit: 100,
      }),
      tournamentApi.getLeaderboard({
        period: "monthly",
        mode: "multiplayer",
        limit: 100,
      }),
      tournamentApi.getTournamentSummary({ includeWinners: true }),
    ]);

    // Transform all responses
    const dailySPData = transformLeaderboardResponse(
      dailySPResponse as LeaderboardResponse,
      generateLeaderboardId("daily", "singleplayer")
    );
    const dailyMPData = transformLeaderboardResponse(
      dailyMPResponse as LeaderboardResponse,
      generateLeaderboardId("daily", "multiplayer")
    );
    const weeklySPData = transformLeaderboardResponse(
      weeklySPResponse as LeaderboardResponse,
      generateLeaderboardId("weekly", "singleplayer")
    );
    const weeklyMPData = transformLeaderboardResponse(
      weeklyMPResponse as LeaderboardResponse,
      generateLeaderboardId("weekly", "multiplayer")
    );
    const monthlySPData = transformLeaderboardResponse(
      monthlySPResponse as LeaderboardResponse,
      generateLeaderboardId("monthly", "singleplayer")
    );
    const monthlyMPData = transformLeaderboardResponse(
      monthlyMPResponse as LeaderboardResponse,
      generateLeaderboardId("monthly", "multiplayer")
    );

    // Sort all entries by qualification status first, then by fastest time
    const sortByFastestTime = (entries: MergedEntry[]) => {
      return entries
        .map((entry) => ({
          ...entry,
          fastestTime: entry.bestSingleRace ?? (
            entry.races.length > 0
              ? Math.min(...entry.races.map((r) => r.time))
              : Infinity
          ),
        }))
        .sort((a, b) => {
          // Sort by qualified status first (qualified players first)
          if (a.qualified !== b.qualified) {
            return a.qualified ? -1 : 1;
          }
          // Then sort by fastest time
          return a.fastestTime - b.fastestTime;
        });
    };
    const usernameToCountry: Record<string, string> = {};
    [dailySPResponse, dailyMPResponse, weeklySPResponse, weeklyMPResponse, monthlySPResponse, monthlyMPResponse]
      .flatMap((r) => (r as LeaderboardResponse).leaderboard ?? [])
      .forEach((entry) => { if (entry.country) usernameToCountry[entry.username] = entry.country; });

    const recentWinners = (summaryResponse as TournamentSummaryResponse).recentWinners ?? [];
    const recentEvents: TournamentEvent[] = recentWinners.filter((w) => w.period === "daily" && w.mode === "multiplayer").slice(0, 2).map((winner) => ({
      id: `${winner.mode}-${winner.period}-${winner.startDate}`,
      name: `${winner.mode === "multiplayer" ? "Multiplayer" : "Career Mode"} ${winner.period.charAt(0).toUpperCase() + winner.period.slice(1)} Tournament`,
      startDate: winner.startDate,
      endDate: winner.endDate,
      winningUserId: winner.winnerUsername,
      winnerCountry: usernameToCountry[winner.winnerUsername],
      iconURL: "logo.png",
      prizeType: "cash",
      prizeAmount: parseFloat(winner.prizeAmount),
    }));

    console.log("Leaderboard data fetched and transformed successfully.",weeklySPData.entries);

    const dailySPApi = dailySPResponse as LeaderboardResponse;
    const dailyMPApi = dailyMPResponse as LeaderboardResponse;
    const weeklySPApi = weeklySPResponse as LeaderboardResponse;
    const weeklyMPApi = weeklyMPResponse as LeaderboardResponse;
    const monthlySPApi = monthlySPResponse as LeaderboardResponse;
    const monthlyMPApi = monthlyMPResponse as LeaderboardResponse;

    return {
      props: {
        dailySingleEntries: sortByFastestTime(dailySPData.entries),
        dailyMultiEntries: sortByFastestTime(dailyMPData.entries),
        weeklySingleEntries: sortByFastestTime(weeklySPData.entries),
        weeklyMultiEntries: sortByFastestTime(weeklyMPData.entries),
        monthlySingleEntries: sortByFastestTime(monthlySPData.entries),
        monthlyMultiEntries: sortByFastestTime(monthlyMPData.entries),
        prizes: {
          dailySP: "",
          dailyMP: formatPrize(prizes.daily.multiplayer.first),
          weeklySP: prizes.weekly.singleplayer.first.toFixed(2),
          weeklyMP: formatPrize(prizes.weekly.multiplayer.first),
          monthlySP: prizes.monthly.singleplayer.first.toFixed(2),
          monthlyMP: formatPrize(prizes.monthly.multiplayer.first),
        },
        tournamentDates: {
          dailySP: { startDate: dailySPApi.tournament.startDate, endDate: dailySPApi.tournament.endDate },
          dailyMP: { startDate: dailyMPApi.tournament.startDate, endDate: dailyMPApi.tournament.endDate },
          weeklySP: { startDate: weeklySPApi.tournament.startDate, endDate: weeklySPApi.tournament.endDate },
          weeklyMP: { startDate: weeklyMPApi.tournament.startDate, endDate: weeklyMPApi.tournament.endDate },
          monthlySP: { startDate: monthlySPApi.tournament.startDate, endDate: monthlySPApi.tournament.endDate },
          monthlyMP: { startDate: monthlyMPApi.tournament.startDate, endDate: monthlyMPApi.tournament.endDate },
        },
        recentEvents,
      },
    };
  } catch (error: unknown) {
    console.error("Failed to fetch leaderboard data:", error);

    const now = new Date().toISOString();

    return {
      props: {
        dailySingleEntries: [],
        dailyMultiEntries: [],
        weeklySingleEntries: [],
        weeklyMultiEntries: [],
        monthlySingleEntries: [],
        monthlyMultiEntries: [],
        prizes: {
          dailySP: "",
          dailyMP: "$5.00",
          weeklySP: "0.00",
          weeklyMP: "$6.00",
          monthlySP: "0.00",
          monthlyMP: "$5.00",
        },
        tournamentDates: {
          dailySP: { startDate: now, endDate: now },
          dailyMP: { startDate: now, endDate: now },
          weeklySP: { startDate: now, endDate: now },
          weeklyMP: { startDate: now, endDate: now },
          monthlySP: { startDate: now, endDate: now },
          monthlyMP: { startDate: now, endDate: now },
        },
        recentEvents: [],
      },
    };
  }
};
