

import { useState } from "react";
import LeaderboardPreview from "../components/LeaderboardPreview";
import { RecentEvents } from "../components/RecentEvents";
import { dummyEvents } from "../utils/types/events";
import { LeaderboardData, MergedEntry } from "../utils/types/leaderboard";
import { tournamentApi, LeaderboardResponse } from "../services/tournamentApi";
import {
  transformLeaderboardResponse,
  generateLeaderboardId,
  formatPrize,
} from "../utils/apiTransformers";
import { useRequireUserAuth, useUserAuth } from "@/contexts/UserAuthContext";
import { UserCircleIcon, ArrowRightOnRectangleIcon, CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { BetCreationCard } from "@/components/betting/BetCreationCard";
import { BetMarketplace } from "@/components/betting/BetMarketplace";
import { ActiveBetCard } from "@/components/betting/ActiveBetCard";

type DashboardLeaderboardPageProps = {
    dailySinglePlayer: LeaderboardData<MergedEntry>;
    dailyMultiplayer: LeaderboardData<MergedEntry>;
    weeklySinglePlayer: LeaderboardData<MergedEntry>;
    weeklyMultiplayer: LeaderboardData<MergedEntry>;
    monthlySinglePlayer: LeaderboardData<MergedEntry>;
    monthlyMultiplayer: LeaderboardData<MergedEntry>;
};

export const DashboardLeaderboardPage = (props: DashboardLeaderboardPageProps) => {
  const { isLoading } = useRequireUserAuth();
  const { user, logout, refreshUser } = useUserAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trigger refresh for all bet components and update user balance
  const handleBetAction = async () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh user profile to update balance
    await refreshUser();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0E0A1B] to-[#190F31] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-8 w-full min-h-screen relative overflow-clip`}>
      <div className="absolute top-0 left-0 w-full h-full animate-[spin_20s_ease_infinite] scale-200 dark:opacity-30 dark:saturate-200" style={{
        background: `radial-gradient(at 2% 50%, hsla(275,79%,74%,0.4) 0px, transparent 50%),
        radial-gradient(at 18% 20%, hsla(275,88%,72%,0.4) 0px, transparent 50%),
        radial-gradient(at 16% 20%, hsla(265,83%,72%,0.4) 0px, transparent 50%),
        radial-gradient(at 45% 55%, hsla(214,77%,67%,0.4) 0px, transparent 50%),
        radial-gradient(at 63% 89%, hsla(330,89%,76%,0.4) 0px, transparent 50%),
        radial-gradient(at 47% 72%, hsla(327,61%,75%,0.4) 0px, transparent 50%),
        radial-gradient(at 6% 7%, hsla(320,84%,68%,0.4) 0px, transparent 50%)`,
      }} />

      {/* User Header */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 pt-8">
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <UserCircleIcon className="h-12 w-12 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome, {user?.name || user?.username}
                </h1>
                <p className="text-gray-400 text-sm">
                  @{user?.username} {user?.country && `• ${user.country}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Currency Display */}
              {user?.profile && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-green-400">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      <span className="font-bold">{user.profile.gains.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">Gains</p>
                  </div>
                  {user.profile.coins > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-amber-400">
                        <CurrencyDollarIcon className="h-5 w-5" />
                        <span className="font-bold">{user.profile.coins.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-400">Coins</p>
                    </div>
                  )}
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Betting Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 space-y-8">
        {/* Create Bet */}
        <BetCreationCard onBetCreated={handleBetAction} />

        {/* My Active Bets */}
        <ActiveBetCard refreshTrigger={refreshTrigger} />

        {/* Bet Marketplace */}
        <BetMarketplace onBetAccepted={handleBetAction} refreshTrigger={refreshTrigger} />
      </div>

      {/* <div className="relative z-10 py-8 h-96 grid grid-cols-1 md:grid-cols-2 lg:grid-cols gap-8 mx-auto max-w-7xl ">
        <RecentEvents events={dummyEvents} />
      </div>

      <div className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols gap-8 mx-auto max-w-7xl">
        <LeaderboardPreview {...props.dailySinglePlayer} />
        <LeaderboardPreview {...props.dailyMultiplayer} />
        <LeaderboardPreview {...props.weeklySinglePlayer} />
        <LeaderboardPreview {...props.weeklyMultiplayer} />
        <LeaderboardPreview {...props.monthlySinglePlayer} />
        <LeaderboardPreview {...props.monthlyMultiplayer} />
      </div> */}
    </div>
  );
};
export default DashboardLeaderboardPage;

export const getServerSideProps = async () => {
  try {
    // Fetch prize configuration first
    const prizes = await tournamentApi.getPrizes();

    // Fetch all 6 leaderboards in parallel
    const [
      dailySPResponse,
      dailyMPResponse,
      weeklySPResponse,
      weeklyMPResponse,
      monthlySPResponse,
      monthlyMPResponse,
    ] = await Promise.all([
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
    ]);

    // Transform responses with prize information
    const dailySinglePlayer = transformLeaderboardResponse(
      dailySPResponse as LeaderboardResponse,
      generateLeaderboardId("daily", "singleplayer"),
      formatPrize(prizes.daily.singleplayer.first)
    );

    const dailyMultiplayer = transformLeaderboardResponse(
      dailyMPResponse as LeaderboardResponse,
      generateLeaderboardId("daily", "multiplayer"),
      formatPrize(prizes.daily.multiplayer.first)
    );

    const weeklySinglePlayer = transformLeaderboardResponse(
      weeklySPResponse as LeaderboardResponse,
      generateLeaderboardId("weekly", "singleplayer"),
      formatPrize(prizes.weekly.singleplayer.first)
    );

    const weeklyMultiplayer = transformLeaderboardResponse(
      weeklyMPResponse as LeaderboardResponse,
      generateLeaderboardId("weekly", "multiplayer"),
      formatPrize(prizes.weekly.multiplayer.first)
    );

    const monthlySinglePlayer = transformLeaderboardResponse(
      monthlySPResponse as LeaderboardResponse,
      generateLeaderboardId("monthly", "singleplayer"),
      formatPrize(prizes.monthly.singleplayer.first)
    );

    const monthlyMultiplayer = transformLeaderboardResponse(
      monthlyMPResponse as LeaderboardResponse,
      generateLeaderboardId("monthly", "multiplayer"),
      formatPrize(prizes.monthly.multiplayer.first)
    );

    return {
      props: {
        dailySinglePlayer,
        dailyMultiplayer,
        weeklySinglePlayer,
        weeklyMultiplayer,
        monthlySinglePlayer,
        monthlyMultiplayer,
      } as DashboardLeaderboardPageProps,
    };
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);

    // Return empty leaderboards on error
    // You can also return a fallback to dummy data if preferred
    const emptyLeaderboard: LeaderboardData<MergedEntry> = {
      leaderboard: {
        id: '',
        name: '',
        eventId: '',
        startDate: '',
        endDate: '',
        createdAt: '',
        updatedAt: '',
        reward: '',
      },
      entries: [],
    };

    return {
      props: {
        dailySinglePlayer: emptyLeaderboard,
        dailyMultiplayer: emptyLeaderboard,
        weeklySinglePlayer: emptyLeaderboard,
        weeklyMultiplayer: emptyLeaderboard,
        monthlySinglePlayer: emptyLeaderboard,
        monthlyMultiplayer: emptyLeaderboard,
      },
    };
  }
};
