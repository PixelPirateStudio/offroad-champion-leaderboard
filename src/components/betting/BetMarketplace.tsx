import React, { useState, useEffect } from 'react';
import { betApi, Bet } from '@/services/betApi';
import { TrackDict } from '@/utils/types/track';
import { useUserAuth } from '@/contexts/UserAuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface BetMarketplaceProps {
  onBetAccepted?: () => void;
  refreshTrigger?: number;
}

export const BetMarketplace: React.FC<BetMarketplaceProps> = ({ onBetAccepted, refreshTrigger }) => {
  const { user } = useUserAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingBetId, setAcceptingBetId] = useState<string | null>(null);

  const fetchMarketplaceBets = async () => {
    try {
      setError(null);
      const response = await betApi.getMarketplaceBets();
      setBets(response.bets || []);
    } catch (err) {
      setError((err as Error).message || 'Failed to load marketplace bets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceBets();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMarketplaceBets, 10000);

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleAcceptBet = async (betId: string, betAmount: number) => {
    const currentGains = user?.profile?.gains || 0;

    if (betAmount > currentGains) {
      setError('Insufficient gains to accept this bet');
      return;
    }

    setAcceptingBetId(betId);
    setError(null);

    try {
      await betApi.acceptBet(betId);

      // Refresh marketplace and notify parent
      await fetchMarketplaceBets();
      if (onBetAccepted) {
        onBetAccepted();
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to accept bet');
    } finally {
      setAcceptingBetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Bet Marketplace</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <span className="ml-3 text-purple-300">Loading bets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-amber-400">Bet Marketplace</h2>
        <button
          onClick={fetchMarketplaceBets}
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
          <p className="text-purple-300 text-lg">No open bets available</p>
          <p className="text-purple-400 text-sm mt-2">Be the first to create a bet!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bets.map((bet) => {
            const track = TrackDict[bet.trackId];
            const betAmount = parseFloat(bet.betAmount as string);
            const houseFee = betAmount * 2 * 0.25;
            const potentialWinnings = betAmount * 2 - houseFee;
            const currentGains = user?.profile?.gains || 0;
            const canAccept = betAmount <= currentGains;
            const expiresIn = dayjs(bet.expiresAt).fromNow();
            const isAccepting = acceptingBetId === bet.id;

            return (
              <div
                key={bet.id}
                className="bg-purple-950/40 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/40 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {bet.creator?.name || 'Unknown Player'}
                    </h3>
                    <p className="text-sm text-purple-300">
                      @{bet.creator?.username || 'unknown'} • {bet.creator?.country || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-400">Expires {expiresIn}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-purple-300">Track</p>
                    <p className="text-sm font-semibold text-white">{track?.name || bet.trackId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-300">Bet Amount</p>
                    <p className="text-sm font-semibold text-amber-400">{betAmount.toFixed(2)} gains</p>
                  </div>
                </div>

                <div className="bg-purple-900/30 rounded-lg p-3 mb-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Total Pot:</span>
                    <span className="text-white font-semibold">{(betAmount * 2).toFixed(2)} gains</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">House Fee (25%):</span>
                    <span className="text-red-400">-{houseFee.toFixed(2)} gains</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-purple-500/20 pt-1">
                    <span className="text-purple-200 font-semibold">Winner Takes:</span>
                    <span className="text-green-400 font-bold">{potentialWinnings.toFixed(2)} gains</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptBet(bet.id, betAmount)}
                  disabled={!canAccept || isAccepting}
                  className={`w-full py-2 rounded-lg font-semibold transition-all ${
                    !canAccept || isAccepting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500'
                  }`}
                >
                  {isAccepting ? 'Accepting...' : canAccept ? 'Accept Bet' : 'Insufficient Gains'}
                </button>

                {!canAccept && (
                  <p className="text-red-400 text-xs text-center mt-1">
                    You need {betAmount.toFixed(2)} gains (you have {currentGains.toFixed(2)})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
