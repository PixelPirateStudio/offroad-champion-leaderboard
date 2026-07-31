import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useRequireAdmin } from '@/contexts/AdminAuthContext';
import { adminApi } from '@/services/adminApi';
import { TrophyIcon, PencilIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PrizeConfig {
  configId: string;
  period: string;
  mode: string;
  firstPlacePrize: string;
  secondPlacePrize: string;
  thirdPlacePrize: string;
  goldRewards?: number[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditingConfig {
  period: string;
  mode: string;
  firstPlacePrize: string;
  secondPlacePrize: string;
  thirdPlacePrize: string;
  // Career Mode only: one entry per rewarded placement
  goldRewards?: string[];
}

export default function PrizesPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAdmin();
  const [configs, setConfigs] = useState<PrizeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingConfig, setEditingConfig] = useState<EditingConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPrizes();
    }
  }, [isAuthenticated]);

  const loadPrizes = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPrizes() as PrizeConfig[];
      setConfigs(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load prize configurations');
    } finally {
      setLoading(false);
    }
  };

  // Coin amounts per placement; falls back to the legacy three columns for
  // configs saved before goldRewards existed
  const careerRewards = (config: PrizeConfig): number[] =>
    config.goldRewards ?? [
      Math.round(parseFloat(config.firstPlacePrize)),
      Math.round(parseFloat(config.secondPlacePrize)),
      Math.round(parseFloat(config.thirdPlacePrize)),
    ];

  const multiplayerRewards = (config: PrizeConfig): number[] =>
    config.goldRewards ?? [
      parseFloat(config.firstPlacePrize),
      parseFloat(config.secondPlacePrize),
      parseFloat(config.thirdPlacePrize),
    ];

  const handleEdit = (config: PrizeConfig) => {
    setEditingConfig({
      period: config.period,
      mode: config.mode,
      firstPlacePrize: parseFloat(config.firstPlacePrize).toString(),
      secondPlacePrize: parseFloat(config.secondPlacePrize).toString(),
      thirdPlacePrize: parseFloat(config.thirdPlacePrize).toString(),
      goldRewards: config.mode === 'singleplayer'
        ? careerRewards(config).map((v) => v.toString())
        : multiplayerRewards(config).map((v) => v.toString()),
    });
    setError('');
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    let payload:
      | { firstPlacePrize: number; secondPlacePrize: number; thirdPlacePrize: number }
      | { goldRewards: number[] };

    if (editingConfig.goldRewards) {
      const rewards = editingConfig.goldRewards.map((v) => parseFloat(v));
      const isCareer = isCareerMode(editingConfig.mode);

      if (rewards.length === 0) {
        setError('Need at least one rewarded place');
        return;
      }

      if (isCareer && rewards.some((v) => isNaN(v) || v < 0 || !Number.isInteger(v))) {
        setError('Coin rewards must be non-negative whole numbers');
        return;
      }

      if (!isCareer && rewards.some((v) => isNaN(v) || v < 0)) {
        setError('Prize values cannot be negative');
        return;
      }

      payload = { goldRewards: rewards };
    } else {
      payload = { goldRewards: [] };
    }

    setIsSubmitting(true);
    setError('');

    try {
      await adminApi.updatePrizeConfig(editingConfig.period, editingConfig.mode, payload);

      setEditingConfig(null);
      await loadPrizes();
    } catch (err) {
      setError((err as Error).message || 'Failed to update prize configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPeriod = (period: string) => {
    return period.charAt(0).toUpperCase() + period.slice(1);
  };

  const formatMode = (mode: string) => {
    return mode === 'singleplayer' ? 'Career Mode' : 'Multi-Player';
  };

  // Career Mode (singleplayer) awards gold coins instead of money
  const isCareerMode = (mode: string) => mode === 'singleplayer';

  const formatPrize = (mode: string, value: string) => {
    return isCareerMode(mode)
      ? `${Math.round(parseFloat(value))} coins`
      : `$${parseFloat(value).toFixed(2)}`;
  };

  const ordinal = (n: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
  };

  const placeColor = (place: number) =>
    place === 1 ? 'text-yellow-400' : place === 2 ? 'text-gray-300' : place === 3 ? 'text-orange-400' : 'text-purple-300';

  const periodOrder: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 };
  const sortedConfigs = [...configs].sort((a, b) => {
    if (a.mode !== b.mode) return isCareerMode(a.mode) ? 1 : -1;
    return (periodOrder[a.period] ?? 99) - (periodOrder[b.period] ?? 99);
  });

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Prize Configuration</h1>
          <p className="mt-2 text-gray-400">
            Manage tournament prize amounts. Changes are reflected instantly in the mobile game.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Prize Configs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedConfigs.map((config) => {
            const isEditing =
              editingConfig?.period === config.period && editingConfig?.mode === config.mode;

            return (
              <div
                key={config.configId}
                className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <TrophyIcon className="h-6 w-6 text-purple-400 mr-2" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {formatPeriod(config.period)}
                      </h3>
                      <p className="text-sm text-gray-400">{formatMode(config.mode)}</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-purple-400 hover:text-purple-300"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {editingConfig.goldRewards && (
                      <>
                        {editingConfig.goldRewards.map((value, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <label className="w-24 shrink-0 text-xs text-gray-400">
                              {ordinal(i + 1)} {isCareerMode(editingConfig.mode) ? '(coins)' : '($)'}
                            </label>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) =>
                                setEditingConfig({
                                  ...editingConfig,
                                  goldRewards: editingConfig.goldRewards!.map((v, j) =>
                                    j === i ? e.target.value : v
                                  ),
                                })
                              }
                              className="w-full px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              step={isCareerMode(editingConfig.mode) ? '1' : '0.01'}
                              min="0"
                            />
                            <button
                              onClick={() =>
                                setEditingConfig({
                                  ...editingConfig,
                                  goldRewards: editingConfig.goldRewards!.filter((_, j) => j !== i),
                                })
                              }
                              disabled={editingConfig.goldRewards!.length <= 1}
                              className="text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove place"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setEditingConfig({
                              ...editingConfig,
                              goldRewards: [...editingConfig.goldRewards!, '0'],
                            })
                          }
                          className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add place
                        </button>
                      </>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingConfig(null)}
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 bg-[#190F31] hover:bg-purple-900/30 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isCareerMode(config.mode) ? (
                  <div className="space-y-2">
                    {careerRewards(config).map((coins, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-[#190F31] rounded-lg p-3"
                      >
                        <span className="text-sm text-gray-400">{ordinal(i + 1)} Place</span>
                        <span className={`text-lg font-bold ${placeColor(i + 1)}`}>
                          {coins} coins
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {multiplayerRewards(config).map((amount, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-[#190F31] rounded-lg p-3"
                      >
                        <span className="text-sm text-gray-400">{ordinal(i + 1)} Place</span>
                        <span className={`text-lg font-bold ${placeColor(i + 1)}`}>
                          ${parseFloat(amount.toString()).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-300 mb-2">Important Notes</h3>
          <ul className="text-sm text-purple-200 space-y-1 list-disc list-inside">
            <li>Prize changes are instantly reflected in the mobile game</li>
            <li>All changes are logged with your admin ID and timestamp</li>
            <li>Prize values must be non-negative</li>
            <li>Changes affect future tournaments immediately</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
