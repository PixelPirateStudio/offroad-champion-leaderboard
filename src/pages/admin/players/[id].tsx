import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useRequireAdmin } from '@/contexts/AdminAuthContext';
import { adminApi } from '@/services/adminApi';
import { useRouter } from 'next/router';
import { ActionModal } from '@/components/admin/ActionModal';
import { FundsAdjustmentModal } from '@/components/admin/FundsAdjustmentModal';
import {
  ArrowLeftIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

interface PlayerDetail {
  id: string;
  username: string;
  name: string;
  type: string;
  role: string;
  country: string;
  isFrozen: boolean;
  isActive: boolean;
  totalRacesAllTime: number;
  bestDailyRankAllTime: number;
  createdAt: string;
  profile: {
    id: string;
    gains: number;
    coins: number;
    coinsTemporal: number;
    userId: string;
    createdAt: string;
  };
}

interface Transaction {
  id: string;
  cardClaimCode: string;
  value: number;
  status: string;
  createdAt: string;
}

interface RaceValidation {
  validationId: string;
  userId: string;
  raceTime: string;
  trackId: string;
  flagged: boolean;
  flagReason: string | null;
  createdAt: string;
}

interface PlayerRacesResponse {
  total: number;
  races: RaceValidation[];
}

interface PlayerDetailResponse {
  player: PlayerDetail;
  transactions: Transaction[];
}

export default function PlayerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading, isAuthenticated } = useRequireAdmin();
  const [data, setData] = useState<PlayerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [races, setRaces] = useState<RaceValidation[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [showRaces, setShowRaces] = useState(false);

  // Modals
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadPlayer();
    }
  }, [isAuthenticated, id]);

  const loadPlayer = async () => {
    try {
      setLoading(true);
      const result = await adminApi.getPlayer(id as string) as PlayerDetailResponse;
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async (reason: string) => {
    if (!id) return;
    try {
      setError('');
      setSuccess('');
      await adminApi.freezeAccount(id as string, reason);
      await loadPlayer();
      setSuccess('Account frozen successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      throw err; // Re-throw to let modal handle it
    }
  };

  const handleUnfreeze = async (reason: string) => {
    if (!id) return;
    try {
      setError('');
      setSuccess('');
      await adminApi.unfreezeAccount(id as string, reason);
      await loadPlayer();
      setSuccess('Account unfrozen successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      throw err; // Re-throw to let modal handle it
    }
  };

  const handleAdjustFunds = async (fundsData: {
    coins?: number;
    gains?: number;
    coinsTemporal?: number;
    reason: string;
  }) => {
    if (!id) return;
    try {
      setError('');
      setSuccess('');
      await adminApi.adjustFunds(id as string, fundsData);
      await loadPlayer();
      setSuccess('Funds adjusted successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      throw err; // Re-throw to let modal handle it
    }
  };

  const loadRaces = async () => {
    if (!id) return;
    try {
      setRacesLoading(true);
      const result = await adminApi.getPlayerRaces(id as string, { limit: 10 }) as PlayerRacesResponse;
      setRaces(result.races || []);
    } catch (err) {
      console.error('Failed to load races:', err);
    } finally {
      setRacesLoading(false);
    }
  };

  const toggleRaces = () => {
    if (!showRaces && races.length === 0) {
      loadRaces();
    }
    setShowRaces(!showRaces);
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-purple-400 hover:text-purple-300"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4">
            <p className="text-red-200">{error || 'Player not found'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { player, transactions } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-purple-400 hover:text-purple-300"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Players
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">{player.username}</h1>
          <p className="mt-2 text-gray-400">{player.name}</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-900/30 border border-green-500/50 p-4">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Status Banner */}
        {player.isFrozen && (
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4">
            <div className="flex items-center">
              <ShieldExclamationIcon className="h-6 w-6 text-red-300 mr-3" />
              <div>
                <p className="text-red-200 font-medium">This account is frozen</p>
                <p className="text-red-300 text-sm">
                  The player cannot login or perform any actions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {player.isFrozen ? (
            <button
              onClick={() => setShowUnfreezeModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Unfreeze Account
            </button>
          ) : (
            <button
              onClick={() => setShowFreezeModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <ShieldExclamationIcon className="h-5 w-5 mr-2" />
              Freeze Account
            </button>
          )}
          <button
            onClick={() => setShowFundsModal(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <BanknotesIcon className="h-5 w-5 mr-2" />
            Adjust Coins
          </button>
        </div>

        {/* Player Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-400">User ID</dt>
                <dd className="text-sm text-white font-mono">{player.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Username</dt>
                <dd className="text-sm text-white">{player.username}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Name</dt>
                <dd className="text-sm text-white">{player.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Country</dt>
                <dd className="text-sm text-white">{player.country || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Account Type</dt>
                <dd className="text-sm text-white capitalize">{player.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Role</dt>
                <dd className="text-sm text-white capitalize">{player.role}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Status</dt>
                <dd className="text-sm">
                  {player.isFrozen ? (
                    <span className="text-red-300">Frozen</span>
                  ) : (
                    <span className="text-green-300">Active</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Created At</dt>
                <dd className="text-sm text-white">
                  {dayjs(player.createdAt).format('MMMM D, YYYY h:mm A')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Balances */}
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Balances</h2>
            <div className="space-y-4">
              <div className="bg-[#190F31] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Gains</div>
                <div className="text-2xl font-bold text-green-400">
                  ${player.profile.gains.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#190F31] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Coins</div>
                <div className="text-2xl font-bold text-purple-400">
                  {player.profile.coins.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#190F31] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Coins Temporal</div>
                <div className="text-2xl font-bold text-blue-400">
                  {player.profile.coinsTemporal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Statistics</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-400">Total Races (All Time)</dt>
                <dd className="text-lg text-white font-semibold">
                  {player.totalRacesAllTime || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Best Daily Rank (All Time)</dt>
                <dd className="text-lg text-white font-semibold">
                  {player.bestDailyRankAllTime ? `#${player.bestDailyRankAllTime}` : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Transactions */}
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#190F31] rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm text-white font-medium">
                        {tx.cardClaimCode || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {dayjs(tx.createdAt).format('MMM D, YYYY')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-400 font-semibold">
                        ${tx.value.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs ${
                          tx.status === 'active' ? 'text-green-400' : 'text-gray-400'
                        }`}
                      >
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No transactions found</p>
            )}
          </div>
        </div>

        {/* Race History Section */}
        <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Race History</h2>
            <button
              onClick={toggleRaces}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              {showRaces ? 'Hide' : 'Show'} Races
            </button>
          </div>

          {showRaces && (
            <div>
              {racesLoading ? (
                <p className="text-gray-400 text-sm">Loading races...</p>
              ) : races.length > 0 ? (
                <div className="space-y-3">
                  {races.map((race) => (
                    <div
                      key={race.validationId}
                      className="bg-[#190F31] rounded-lg p-4 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm bg-purple-900/30 px-2 py-1 rounded text-purple-300">
                            {race.trackId}
                          </code>
                          {race.flagged && (
                            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-500/50">
                              Flagged
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dayjs(race.createdAt).format('MMM D, YYYY h:mm A')}
                        </div>
                        {race.flagged && race.flagReason && (
                          <div className="text-xs text-red-400 mt-1">{race.flagReason}</div>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-lg font-mono text-white">{race.raceTime}s</div>
                        <div className="text-xs text-gray-500">Race Time</div>
                      </div>
                      <Link
                        href={`/admin/races/${race.validationId}`}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                  <Link
                    href={`/admin/players/${player.id}/races`}
                    className="block text-center text-purple-400 hover:text-purple-300 text-sm mt-4"
                  >
                    View All Races →
                  </Link>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No races found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ActionModal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        onConfirm={handleFreeze}
        title="Freeze Account"
        description="This will prevent the player from logging in and performing any actions. Please provide a reason for this action."
        confirmText="Freeze Account"
        confirmColor="bg-red-600 hover:bg-red-700"
        placeholder="e.g., Suspected fraudulent activity..."
      />

      <ActionModal
        isOpen={showUnfreezeModal}
        onClose={() => setShowUnfreezeModal(false)}
        onConfirm={handleUnfreeze}
        title="Unfreeze Account"
        description="This will restore the player's access. Please provide a reason for this action."
        confirmText="Unfreeze Account"
        confirmColor="bg-green-600 hover:bg-green-700"
        placeholder="e.g., Issue resolved after investigation..."
      />

      <FundsAdjustmentModal
        isOpen={showFundsModal}
        onClose={() => setShowFundsModal(false)}
        onConfirm={handleAdjustFunds}
        currentFunds={{
          coins: player.profile.coins,
          gains: player.profile.gains,
          coinsTemporal: player.profile.coinsTemporal,
        }}
      />
    </AdminLayout>
  );
}
