import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useRequireAdmin } from '@/contexts/AdminAuthContext';
import { adminApi } from '@/services/adminApi';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

interface Player {
  id: string;
  username: string;
  email: string;
  name: string;
  country: string;
  isFrozen: boolean;
  isActive: boolean;
  totalRacesAllTime: number;
  createdAt: string;
  profile: {
    gains: number;
    coins: number;
    coinsTemporal: number;
  };
}

interface PlayersResponse {
  total: number;
  players: Player[];
  limit: number;
  offset: number;
}

export default function PlayersPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAdmin();
  const [data, setData] = useState<PlayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterFrozen, setFilterFrozen] = useState<'all' | 'frozen' | 'active'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (isAuthenticated) {
      loadPlayers();
    }
  }, [isAuthenticated, search, filterFrozen, sortBy, sortOrder, page]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean> = {
        limit,
        offset: page * limit,
        sortBy,
        sortOrder,
      };

      if (search) {
        params.search = search;
      }

      if (filterFrozen !== 'all') {
        params.isFrozen = filterFrozen === 'frozen';
      }

      const result = await adminApi.getPlayers(params) as PlayersResponse;
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (authLoading) {
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
          <h1 className="text-3xl font-bold text-white">Player Management</h1>
          <p className="mt-2 text-gray-400">Search, view, and manage player accounts</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by username or name..."
                  className="w-full pl-10 pr-4 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={filterFrozen}
                  onChange={(e) => {
                    setFilterFrozen(e.target.value as 'all' | 'frozen' | 'active');
                    setPage(0);
                  }}
                  className="px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Players</option>
                  <option value="active">Active Only</option>
                  <option value="frozen">Frozen Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="username">Username</option>
                  <option value="totalRacesAllTime">Total Races</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                  className="px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading players...</div>
          ) : data && data.players.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-purple-900/30">
                  <thead className="bg-[#190F31]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Races
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {data.players.map((player) => (
                      <tr key={player.id} className="hover:bg-purple-900/20">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">{player.username}</div>
                            <div className="text-sm text-gray-400">{player.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.country || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            <div>Gains: ${player.profile?.gains.toFixed(2) || '0.00'}</div>
                            <div>Coins: {player.profile?.coins || 0}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.totalRacesAllTime || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.isFrozen ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-500/50">
                              <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                              Frozen
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-500/50">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/admin/players/${player.id}`}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-[#190F31] px-4 py-3 flex items-center justify-between border-t border-purple-900/30">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-4 py-2 border border-purple-900/30 text-sm font-medium rounded-md text-gray-300 bg-[#0E0A1B] hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-purple-900/30 text-sm font-medium rounded-md text-gray-300 bg-[#0E0A1B] hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Showing <span className="font-medium">{page * limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min((page + 1) * limit, data.total)}
                      </span>{' '}
                      of <span className="font-medium">{data.total}</span> players
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-purple-900/30 bg-[#0E0A1B] text-sm font-medium text-gray-400 hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-purple-900/30 bg-[#0E0A1B] text-sm font-medium text-gray-300">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages - 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-purple-900/30 bg-[#0E0A1B] text-sm font-medium text-gray-400 hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No players found matching your criteria
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
