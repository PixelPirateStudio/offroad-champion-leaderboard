import React, { useState } from 'react';
import { betApi } from '@/services/betApi';
import { allTracks } from '@/utils/types/track';
import { useUserAuth } from '@/contexts/UserAuthContext';

interface BetCreationCardProps {
  onBetCreated?: () => void;
}

export const BetCreationCard: React.FC<BetCreationCardProps> = ({ onBetCreated }) => {
  const { user } = useUserAuth();
  const [trackId, setTrackId] = useState('track1');
  const [betAmount, setBetAmount] = useState('10.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const betAmountNum = parseFloat(betAmount) || 0;
  const houseFee = betAmountNum * 2 * 0.25; // 25% of total pot
  const potentialWinnings = betAmountNum * 2 - houseFee;
  const currentGains = user?.profile?.gains || 0;
  const hasEnoughGains = betAmountNum >= 0.01 && betAmountNum <= currentGains;

  const handleCreateBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (betAmountNum < 0.01 || betAmountNum > 10000) {
      setError('Bet amount must be between 0.01 and 10,000 gains');
      return;
    }

    if (betAmountNum > currentGains) {
      setError('Insufficient gains balance');
      return;
    }

    if (!trackId) {
      setError('Please select a track');
      return;
    }

    setIsLoading(true);

    try {
      const response = await betApi.createBet({
        betAmount: betAmountNum,
        trackId,
      });

      setSuccess(`Bet created successfully! Waiting for opponent...`);
      setBetAmount('10.00');

      // Notify parent component to refresh
      if (onBetCreated) {
        onBetCreated();
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create bet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Create Bet</h2>

      <form onSubmit={handleCreateBet} className="space-y-4">
        {/* Current Balance */}
        <div className="bg-purple-950/40 rounded-lg p-4 border border-purple-500/20">
          <p className="text-sm text-purple-300">Current Balance</p>
          <p className="text-2xl font-bold text-green-400">{currentGains.toFixed(2)} gains</p>
        </div>

        {/* Track Selection */}
        <div>
          <label htmlFor="track" className="block text-sm font-medium text-purple-200 mb-2">
            Track
          </label>
          <select
            id="track"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="w-full bg-purple-950/60 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            disabled={isLoading}
          >
            {allTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bet Amount */}
        <div>
          <label htmlFor="betAmount" className="block text-sm font-medium text-purple-200 mb-2">
            Bet Amount (gains)
          </label>
          <input
            id="betAmount"
            type="number"
            step="0.01"
            min="0.01"
            max="10000"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="w-full bg-purple-950/60 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Enter bet amount"
            disabled={isLoading}
          />
          <p className="text-xs text-purple-400 mt-1">Min: 0.01 | Max: 10,000 gains</p>
        </div>

        {/* Bet Preview */}
        {betAmountNum > 0 && (
          <div className="bg-purple-950/40 rounded-lg p-4 border border-purple-500/20 space-y-2">
            <h3 className="text-sm font-semibold text-purple-200 mb-2">Bet Preview</h3>
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Your Wager:</span>
              <span className="text-white font-semibold">{betAmountNum.toFixed(2)} gains</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Opponent Wager:</span>
              <span className="text-white font-semibold">{betAmountNum.toFixed(2)} gains</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Total Pot:</span>
              <span className="text-amber-400 font-semibold">{(betAmountNum * 2).toFixed(2)} gains</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">House Fee (25%):</span>
              <span className="text-red-400 font-semibold">-{houseFee.toFixed(2)} gains</span>
            </div>
            <div className="border-t border-purple-500/30 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200 font-semibold">Winner Takes:</span>
                <span className="text-green-400 font-bold text-lg">{potentialWinnings.toFixed(2)} gains</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !hasEnoughGains || betAmountNum < 0.01 || betAmountNum > 10000}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            isLoading || !hasEnoughGains || betAmountNum < 0.01 || betAmountNum > 10000
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-purple-950 hover:from-amber-400 hover:to-yellow-400'
          }`}
        >
          {isLoading ? 'Creating Bet...' : 'Create Bet'}
        </button>

        {!hasEnoughGains && betAmountNum > 0 && (
          <p className="text-red-400 text-sm text-center">
            Insufficient gains. You need {betAmountNum.toFixed(2)} but only have {currentGains.toFixed(2)} gains.
          </p>
        )}
      </form>
    </div>
  );
};
