import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { adminApi } from '@/services/adminApi';
import { useRequireAdmin } from '@/contexts/AdminAuthContext';

dayjs.extend(relativeTime);

// Bet interface definition (matching API response)
interface Player {
  id: string;
  username: string;
  name?: string;
  country?: string;
}

interface Bet {
  id: string;
  creatorId: string;
  acceptorId: string | null;
  betAmount: string;
  houseFee: string;
  type: 'live' | 'open';
  status: 'open' | 'active' | 'completed' | 'cancelled' | 'refunded' | 'rematch';
  winnerId: string | null;
  creatorRaceValidationId: string | null;
  acceptorRaceValidationId: string | null;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  creator: Player;
  acceptor?: Player;
  winner?: Player;
}

interface BetsResponse {
  bets: Bet[];
  total: number;
  limit: number;
  offset: number;
  period: string | null;
}

interface TaxFormData {
  id: string;
  username: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  totalIncome: number;
  taxFormType: string;
  createdAt: string;
}

// Mock tax form data generator
const generateMockTaxForms = (): TaxFormData[] => {
  return [
    {
      id: 'tax-1',
      username: 'Lizardman_021',
      countryCode: 'US',
      firstName: 'Sam',
      lastName: 'Altman',
      address: '3849 Wilson Ave.',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90291',
      country: 'USA',
      totalIncome: 8500,
      taxFormType: '1099',
      createdAt: '2026-01-13T09:30:00Z',
    },
    {
      id: 'tax-2',
      username: 'Bodwim02',
      countryCode: 'JP',
      firstName: 'Si-Hu',
      lastName: 'Lin',
      address: '3840 Shin Ave.',
      city: 'Tokyo',
      state: 'Chugoku',
      zip: '348042',
      country: 'Japan',
      totalIncome: 4350,
      taxFormType: 'W-8BEN',
      createdAt: '2026-01-13T09:30:00Z',
    },
  ];
};

type TabType = 'live' | 'open' | 'tax';

const REFRESH_INTERVAL = 10000; // 10 seconds for live data refresh

export default function BetsPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAdmin();

  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [page, setPage] = useState(0);
  const [taxYear, setTaxYear] = useState(2026);
  const [betsPeriod, setBetsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [revenuePeriod, setRevenuePeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [taxStatus, setTaxStatus] = useState<'pending' | 'filed' | 'completed'>('pending');

  // Data state
  const [openBets, setOpenBets] = useState<Bet[]>([]);
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [liveTotal, setLiveTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Metrics state
  const [totalBetsCount, setTotalBetsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const limit = 10;

  // Fetch open bets (status: 'open')
  const fetchOpenBets = async () => {
    try {
      setError(null);
      const response = await adminApi.getAllBets({
        status: 'open',
        limit,
        offset: page * limit,
      }) as BetsResponse;

      setOpenBets(response.bets || []);
      setOpenTotal(response.total || 0);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message || 'Failed to load open bets');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch live bets (status: 'active')
  const fetchLiveBets = async () => {
    try {
      setError(null);
      const response = await adminApi.getAllBets({
        status: 'active',
        limit,
        offset: page * limit,
      }) as BetsResponse;

      setLiveBets(response.bets || []);
      setLiveTotal(response.total || 0);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message || 'Failed to load live bets');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch metrics for the selected period
  const fetchMetrics = async (period: 'weekly' | 'monthly' | 'yearly') => {
    try {
      setIsLoadingMetrics(true);
      const periodMap = {
        weekly: '7d',
        monthly: '30d',
        yearly: '365d',
      } as const;

      // Fetch ALL bets (any status) for total count
      const allBetsResponse = await adminApi.getAllBets({
        period: periodMap[period],
      }) as BetsResponse;

      // Fetch only completed bets for revenue calculation
      const completedBetsResponse = await adminApi.getAllBets({
        status: 'completed',
        period: periodMap[period],
      }) as BetsResponse;

      const allBets = allBetsResponse.bets || [];
      const completedBets = completedBetsResponse.bets || [];

      // Total bets count (all statuses)
      const count = allBets.length;

      // Revenue is sum of house fees from completed bets only
      const revenue = completedBets.reduce((sum, bet) => {
        return sum + parseFloat(bet.houseFee || '0');
      }, 0);

      setTotalBetsCount(count);
      setTotalRevenue(revenue);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      // Don't show error to user for metrics, just log it
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Fetch data based on active tab
  const fetchData = () => {
    if (activeTab === 'open') {
      fetchOpenBets();
    } else if (activeTab === 'live') {
      fetchLiveBets();
    }
  };

  // Reset page when changing tabs
  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  // Fetch metrics when period changes
  useEffect(() => {
    if (isAuthenticated && activeTab !== 'tax') {
      fetchMetrics(betsPeriod);
    }
  }, [isAuthenticated, betsPeriod, activeTab]);

  // Fetch data when authenticated, tab changes, or page changes
  useEffect(() => {
    if (isAuthenticated && activeTab !== 'tax') {
      setIsLoading(true);
      fetchData();
    }
  }, [isAuthenticated, activeTab, page]);

  // Auto-refresh for open and live bets
  useEffect(() => {
    if (isAuthenticated && activeTab !== 'tax') {
      const interval = setInterval(() => {
        fetchData();
        fetchMetrics(betsPeriod);
      }, REFRESH_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab, page, betsPeriod]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsLoading(true);
    fetchData();
    fetchMetrics(betsPeriod);
  };

  const taxForms = generateMockTaxForms();
  const paginatedTaxForms = taxForms.slice(page * limit, (page + 1) * limit);
  const taxTotalPages = Math.ceil(taxForms.length / limit);

  // Calculate pagination based on active tab
  const getCurrentBets = () => {
    if (activeTab === 'open') return openBets;
    if (activeTab === 'live') return liveBets;
    return [];
  };

  const getCurrentTotal = () => {
    if (activeTab === 'open') return openTotal;
    if (activeTab === 'live') return liveTotal;
    return 0;
  };

  const currentBets = getCurrentBets();
  const totalPages = Math.ceil(getCurrentTotal() / limit);

  // Calculate metrics based on selected period
  const houseCutPercentage = 0.25;

  const calculatePot = (bet: Bet) => {
    const betAmount = parseFloat(bet.betAmount);
    return betAmount * 2;
  };

  const calculateHousePot = (bet: Bet) => {
    return parseFloat(bet.houseFee);
  };

  const calculateTransfer = (bet: Bet) => {
    const pot = calculatePot(bet);
    const housePot = calculateHousePot(bet);
    return pot - housePot;
  };

  // Country flag emoji mapping
  const getFlagEmoji = (country?: string) => {
    if (!country) return '🏁';

    const countryCode = country.toUpperCase().substring(0, 2);
    const flags: Record<string, string> = {
      JP: '🇯🇵',
      NO: '🇳🇴',
      US: '🇺🇸',
      GB: '🇬🇧',
      DE: '🇩🇪',
      FR: '🇫🇷',
      CA: '🇨🇦',
      AU: '🇦🇺',
      BR: '🇧🇷',
      MX: '🇲🇽',
    };
    return flags[countryCode] || '🏁';
  };

  if (authLoading || isLoading) {
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
            <div className="text-3xl">🏆</div>
          </div>
          <h1 className="text-3xl font-bold text-yellow-500">ORC Bet & Burn Data</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-8 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Live Bets
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`px-8 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'open'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Open Bets
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-8 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'tax'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tax Forms
          </button>
        </div>

        {/* Metrics - Conditional rendering based on active tab */}
        {activeTab !== 'tax' ? (
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-3">
              <select
                value={betsPeriod}
                onChange={(e) => setBetsPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="bg-black border border-gray-600 px-6 py-2 rounded">
                <span className="text-white mr-2">Total Bets:</span>
                <span className="text-green-400 font-semibold">
                  {isLoadingMetrics ? '...' : totalBetsCount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={revenuePeriod}
                onChange={(e) => {
                  const newPeriod = e.target.value as 'weekly' | 'monthly' | 'yearly';
                  setRevenuePeriod(newPeriod);
                  fetchMetrics(newPeriod);
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="bg-black border border-gray-600 px-6 py-2 rounded">
                <span className="text-white mr-2">Revenue:</span>
                <span className="text-green-400 font-semibold">
                  {isLoadingMetrics ? '...' : `$${totalRevenue.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600 transition-all"
              title="Refresh data"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span className="text-sm">Refresh</span>
            </button>

            {/* Last refresh indicator */}
            <div className="text-sm text-gray-400">
              Last updated: {dayjs(lastRefresh).format('h:mm:ss A')}
            </div>
          </div>
        ) : (
          <div className="flex gap-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTaxYear(taxYear - 1)}
                className="w-8 h-8 bg-gray-600 hover:bg-gray-500 flex items-center justify-center"
              >
                <ChevronLeftIcon className="w-5 h-5 text-white" />
              </button>
              <div className="bg-black border border-gray-600 px-6 py-2 rounded">
                <span className="text-white mr-2">Annual Taxes:</span>
                <span className="text-yellow-400 font-semibold">{taxYear}</span>
              </div>
              <button
                onClick={() => setTaxYear(taxYear + 1)}
                className="w-8 h-8 bg-gray-600 hover:bg-gray-500 flex items-center justify-center"
              >
                <ChevronRightIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={taxStatus}
                onChange={(e) => setTaxStatus(e.target.value as 'pending' | 'filed' | 'completed')}
                className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 capitalize"
              >
                <option value="pending">Pending</option>
                <option value="filed">Filed</option>
                <option value="completed">Completed</option>
              </select>
              <div className="bg-black border border-gray-600 px-6 py-2 rounded">
                <span className="text-white">Tax Status</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Open Bets & Live Bets Content */}
        {(activeTab === 'open' || activeTab === 'live') && (
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg overflow-hidden">
            {currentBets.length === 0 && !isLoading ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-lg">
                  No {activeTab} bets found
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-black border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Creator
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Creator Wager
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Acceptor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Acceptor Wager
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Winner
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Pot
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total Transfer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          House Pot
                        </th>
                        {activeTab === 'open' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Expires
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {currentBets.map((bet) => (
                        <tr key={bet.id} className="hover:bg-purple-900/10">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                            {dayjs(bet.createdAt).format('MM/DD/YYYY')}
                            <br />
                            <span className="text-xs text-gray-500">
                              ({dayjs(bet.createdAt).format('h:mma')} EST)
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getFlagEmoji(bet.creator.country)}</span>
                              <span className="text-sm text-white">{bet.creator.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400 font-semibold">
                            ${parseFloat(bet.betAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {bet.acceptor ? (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getFlagEmoji(bet.acceptor.country)}</span>
                                <span className="text-sm text-white">{bet.acceptor.username}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Waiting...</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400 font-semibold">
                            {bet.acceptor ? `$${parseFloat(bet.betAmount).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              bet.status === 'open' ? 'bg-blue-900/30 text-blue-400' :
                              bet.status === 'active' ? 'bg-green-900/30 text-green-400' :
                              bet.status === 'completed' ? 'bg-purple-900/30 text-purple-400' :
                              bet.status === 'rematch' ? 'bg-orange-900/30 text-orange-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {bet.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {bet.winner ? (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getFlagEmoji(bet.winner.country)}</span>
                                <span className="text-sm text-white">{bet.winner.username}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">
                            ${calculatePot(bet).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                            ${calculateTransfer(bet).toFixed(2)}{' '}
                            <span className="text-xs text-gray-500">(-{houseCutPercentage * 100}% fee)</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">
                            ${calculateHousePot(bet).toFixed(2)}
                          </td>
                          {activeTab === 'open' && (
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                              {dayjs(bet.expiresAt).fromNow()}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="bg-black py-6 flex items-center justify-center gap-8 border-t border-gray-700">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center rounded"
                  >
                    <ChevronLeftIcon className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center rounded"
                  >
                    <ChevronRightIcon className="w-6 h-6 text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tax Forms Content */}
        {activeTab === 'tax' && (
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-black border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      First Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Zip
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Total Income
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tax Form
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {paginatedTaxForms.map((form) => (
                    <tr key={form.id} className="hover:bg-purple-900/10">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {dayjs(form.createdAt).format('MM/DD/YYYY')}
                        <br />
                        <span className="text-xs text-gray-500">
                          ({dayjs(form.createdAt).format('h:mma')} EST)
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getFlagEmoji(form.countryCode)}</span>
                          <span className="text-sm text-white">{form.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.firstName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.address}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.city}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.state}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.zip}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.country}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">
                        ${form.totalIncome.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {form.taxFormType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-black py-6 flex items-center justify-center gap-8 border-t border-gray-700">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center rounded"
              >
                <ChevronLeftIcon className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setPage(Math.min(taxTotalPages - 1, page + 1))}
                disabled={page >= taxTotalPages - 1}
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center rounded"
              >
                <ChevronRightIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
