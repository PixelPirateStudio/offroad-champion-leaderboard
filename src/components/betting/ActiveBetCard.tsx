import React, { useState, useEffect } from 'react';
import { betApi, Bet } from '@/services/betApi';
import { TrackDict } from '@/utils/types/track';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { generateCompleteRaceData, submitRaceResult } from '@/utils/raceGenerator';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ActiveBetCardProps {
  refreshTrigger?: number;
}

export const ActiveBetCard: React.FC<ActiveBetCardProps> = ({ refreshTrigger }) => {
  const { user, refreshUser } = useUserAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [racingBetId, setRacingBetId] = useState<string | null>(null);

  const fetchUserBets = async () => {
    try {
      setError(null);
      const response = await betApi.getUserBets();
      setBets(response.bets || []);
    } catch (err) {
      setError((err as Error).message || 'Failed to load your bets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBets();
  }, [refreshTrigger]);

  const handleRandomRace = async (bet: Bet) => {
    if (!user?.id) {
      setError('User information not available');
      return;
    }

    // Get profileId from either location (backwards compatible)
    const profileId = user.profileId || user.profile?.id || user.id;

    setRacingBetId(bet.id);
    setError(null);

    try {
      // Generate random race data
      const raceData = await generateCompleteRaceData(bet.trackId, profileId);

      // Submit race result with betId
      const result = await submitRaceResult({
        userId: user.id,
        profileId: profileId,
        raceData,
        betId: bet.id,
      });

      // Check if bet auto-completed
      if (result.autoCompleted) {
        if (result.outcome === 'completed') {
          const isWinner = result.winnerId === user.id;
          const winnerPayout = typeof result.winnerPayout === 'string'
            ? parseFloat(result.winnerPayout)
            : (result.winnerPayout || 0);
          const message = isWinner
            ? `🎉 You won! You earned ${winnerPayout.toFixed(2)} gains!`
            : `You lost this bet. Better luck next time!`;
          alert(message);
        } else if (result.outcome === 'rematch') {
          alert('It\'s a tie! Race again to determine the winner.');
        } else if (result.outcome === 'refunded') {
          alert('Both races were flagged. Bet has been refunded.');
        }
      } else {
        alert('Race submitted! Waiting for opponent to race...');
      }

      // Refresh bets and user balance
      await fetchUserBets();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit random race');
    } finally {
      setRacingBetId(null);
    }
  };

  const handleCancelBet = async (betId: string) => {
    if (!confirm('Are you sure you want to cancel this bet? Your wager will be refunded.')) {
      return;
    }

    try {
      setError(null);
      await betApi.cancelBet(betId);
      await fetchUserBets();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message || 'Failed to cancel bet');
    }
  };

  const getStatusBadge = (status: Bet['status']) => {
    const statusConfig = {
      open: { text: 'Open', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
      active: { text: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
      completed: { text: 'Completed', className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
      cancelled: { text: 'Cancelled', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
      expired: { text: 'Expired', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
      refunded: { text: 'Refunded', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
      rematch: { text: 'Rematch', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">My Bets</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <span className="ml-3 text-purple-300">Loading your bets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-amber-400">My Bets</h2>
        <button
          onClick={fetchUserBets}
          className="text-purple-300 hover:text-purple-100 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {bets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-purple-300 text-lg">No active bets</p>
          <p className="text-purple-400 text-sm mt-2">Create a bet to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bets.map((bet) => {
            const track = TrackDict[bet.trackId];
            const isCreator = bet.creatorId === user?.id;
            const opponent = isCreator ? bet.acceptor : bet.creator;
            const userSubmitted = isCreator ? bet.creatorRaceValidationId : bet.acceptorRaceValidationId;
            const opponentSubmitted = isCreator ? bet.acceptorRaceValidationId : bet.creatorRaceValidationId;
            const showRandomRaceButton = bet.status === 'active' && !userSubmitted;
            const isRacing = racingBetId === bet.id;
            const isWinner = bet.winnerId === user?.id;

            // Parse string amounts to numbers
            const betAmount = typeof bet.betAmount === 'string' ? parseFloat(bet.betAmount) : bet.betAmount;
            const winnerPayout = bet.winnerPayout
              ? (typeof bet.winnerPayout === 'string' ? parseFloat(bet.winnerPayout) : bet.winnerPayout)
              : null;

            return (
              <div
                key={bet.id}
                className="bg-purple-950/40 border border-purple-500/20 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(bet.status)}
                      <span className="text-xs text-purple-400">
                        {isCreator ? '(You created)' : '(You accepted)'}
                      </span>
                    </div>
                    <p className="text-sm text-purple-300">
                      {track?.name || bet.trackId} • {betAmount.toFixed(2)} gains
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400">{betAmount.toFixed(2)} gains</p>
                    {bet.status === 'open' && (
                      <p className="text-xs text-purple-400">Expires {dayjs(bet.expiresAt).fromNow()}</p>
                    )}
                  </div>
                </div>

                {/* Opponent Info */}
                {opponent && (
                  <div className="bg-purple-900/30 rounded-lg p-3 mb-3">
                    <p className="text-xs text-purple-300 mb-1">Opponent</p>
                    <p className="text-sm font-semibold text-white">
                      {opponent.name} (@{opponent.username})
                    </p>
                  </div>
                )}

                {/* Race Status for Active Bets */}
                {bet.status === 'active' && (
                  <div className="bg-purple-900/30 rounded-lg p-3 mb-3">
                    <p className="text-xs text-purple-300 mb-2">Race Status</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-200">You:</span>
                        <span className={userSubmitted ? 'text-green-400' : 'text-yellow-400'}>
                          {userSubmitted ? '✓ Submitted' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-200">Opponent:</span>
                        <span className={opponentSubmitted ? 'text-green-400' : 'text-yellow-400'}>
                          {opponentSubmitted ? '✓ Submitted' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completed Bet Result */}
                {bet.status === 'completed' && bet.winnerId && (
                  <div className={`rounded-lg p-3 mb-3 ${isWinner ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                    <p className="text-sm font-semibold text-white mb-1">
                      {isWinner ? '🎉 You Won!' : 'You Lost'}
                    </p>
                    {isWinner && winnerPayout !== null && (
                      <p className="text-green-400 font-bold">
                        +{winnerPayout.toFixed(2)} gains
                      </p>
                    )}
                    {!isWinner && (
                      <p className="text-red-400 font-bold">
                        -{betAmount.toFixed(2)} gains
                      </p>
                    )}
                  </div>
                )}

                {/* Rematch Status */}
                {bet.status === 'rematch' && (
                  <div className="bg-orange-900/30 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-orange-400">
                      It's a tie! Race again to determine the winner.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Random Race Button (DEV TOOL) */}
                  {showRandomRaceButton && (
                    <button
                      onClick={() => handleRandomRace(bet)}
                      disabled={isRacing}
                      className="flex-1 py-2 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all"
                    >
                      {isRacing ? 'Racing...' : '🎲 Random Race (DEV)'}
                    </button>
                  )}

                  {/* Cancel Button (Open bets only) */}
                  {bet.status === 'open' && isCreator && (
                    <button
                      onClick={() => handleCancelBet(bet.id)}
                      className="px-4 py-2 rounded-lg font-semibold bg-red-600/80 text-white hover:bg-red-600 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
