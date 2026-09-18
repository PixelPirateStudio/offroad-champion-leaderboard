import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  adminApi,
  type GeoRestrictionsResponse,
  type ApiError,
} from '@/services/adminApi';
import { GeoWorldMap } from './maps/GeoWorldMap';
import { GeoUsMap } from './maps/GeoUsMap';
import type { GeoMapJurisdiction } from './maps/geoMap';

type GeoSubTab = 'countries' | 'states';

const US_COUNTRY_CODE = 'US';

// Build the saving-key used to track per-jurisdiction in-flight PATCH calls.
const savingKey = (subTab: GeoSubTab, code: string) => `${subTab}:${code}`;

function ToggleSwitch({
  enabled,
  saving,
  disabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  saving: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}) {
  const isDisabled = saving || disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      disabled={isDisabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-[#0E0A1B] ${
        enabled ? 'bg-yellow-500' : 'bg-gray-600'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      {saving && (
        <ArrowPathIcon className="absolute -right-6 w-4 h-4 text-gray-400 animate-spin" />
      )}
    </button>
  );
}

/**
 * Geo-location Restrictions manager for Bet & Burn.
 *
 * Self-contained: fetches from GET /api/v2/geo-restrictions (source of truth)
 * and mutates via the PATCH endpoints, all through the shared adminApi wrapper.
 * The fetched data state is intentionally kept generic (countries + usStates)
 * so a future interactive map (Phase 4) can reuse the same shape/component.
 */
export function GeoRestrictions() {
  const [data, setData] = useState<GeoRestrictionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [subTab, setSubTab] = useState<GeoSubTab>('countries');
  const [search, setSearch] = useState('');
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  // Shared UI state so the list and the map highlight/select in sync.
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await adminApi.getGeoRestrictions();
      setData(result);
    } catch (err) {
      const message = (err as ApiError)?.message || 'Failed to load geo restrictions';
      setLoadError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // The United States country row acts as the global US switch (backend parent).
  const usCountry = useMemo(
    () => data?.countries.find((c) => c.code === US_COUNTRY_CODE) ?? null,
    [data]
  );
  const usGloballyDisabled = Boolean(usCountry && !usCountry.enabled);

  const list = useMemo(
    () => (subTab === 'countries' ? data?.countries ?? [] : data?.usStates ?? []),
    [subTab, data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (j) => j.name.toLowerCase().includes(q) || j.code.toLowerCase().includes(q)
    );
  }, [list, search]);

  // Availability the map paints from — derived from the SAME `data` as the list
  // (no separate map state). US states carry `overridden` when the US country
  // is globally disabled.
  const jurisdictionsForMap = useMemo(() => {
    const map: Record<string, GeoMapJurisdiction> = {};
    for (const j of list) {
      map[j.code] = {
        enabled: j.enabled,
        configured: j.configured,
        overridden: subTab === 'states' && usGloballyDisabled,
      };
    }
    return map;
  }, [list, subTab, usGloballyDisabled]);

  // Codes currently saving for the active sub-tab (shared with the list rows).
  const savingCodesSet = useMemo(() => {
    const prefix = `${subTab}:`;
    const s = new Set<string>();
    savingKeys.forEach((k) => {
      if (k.startsWith(prefix)) s.add(k.slice(prefix.length));
    });
    return s;
  }, [savingKeys, subTab]);

  const applyLocalUpdate = (subTabForItem: GeoSubTab, code: string, enabled: boolean) => {
    setData((prev) => {
      if (!prev) return prev;
      const key = subTabForItem === 'countries' ? 'countries' : 'usStates';
      const updated = prev[key].map((j) =>
        j.code === code ? { ...j, enabled, configured: true } : j
      );
      return { ...prev, [key]: updated };
    });
  };

  // Single toggle handler shared by BOTH the list rows and the map regions,
  // keyed only by jurisdiction code. This guarantees one code path (and one
  // state source) for every update, so list and map can never diverge.
  const handleToggle = async (code: string) => {
    const item = (subTab === 'countries' ? data?.countries : data?.usStates)?.find(
      (j) => j.code === code
    );
    if (!item) return;

    const key = savingKey(subTab, code);
    if (savingKeys.has(key)) return; // prevent duplicate interaction while saving

    setSelectedCode(code);
    const nextEnabled = !item.enabled;
    setSaveError(null);
    setSavingKeys((prev) => new Set(prev).add(key));

    try {
      // Non-optimistic: only reflect the change after the backend confirms it,
      // so neither the list nor the map ever shows a value that failed to persist.
      const record =
        subTab === 'countries'
          ? await adminApi.updateCountryAvailability(code, nextEnabled)
          : await adminApi.updateStateAvailability(code, nextEnabled);
      applyLocalUpdate(subTab, code, record.enabled);
    } catch (err) {
      const message = (err as ApiError)?.message || 'Update failed';
      setSaveError(`Failed to update ${item.name} (${item.code}): ${message}`);
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Loading state — no fake enabled/disabled values are shown.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg flex items-center gap-3">
          <ArrowPathIcon className="w-5 h-5 animate-spin" />
          Loading geo restrictions...
        </div>
      </div>
    );
  }

  // Error state with retry — no fake jurisdiction data is rendered.
  if (loadError) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center space-y-4">
        <p className="text-red-400">{loadError}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600 transition-all"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subtitle (main title lives in the page header) */}
      <p className="text-sm text-gray-400 text-center">
        Control where Bet &amp; Burn is available. Disabled jurisdictions cannot
        create or accept bets.
      </p>

      {/* Final composition: controls/list on the left, interactive map on the
          right (stacks on narrow screens). */}
      <div className="lg:grid lg:grid-cols-[minmax(300px,380px)_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        {/* LEFT: jurisdiction controls + list */}
        <div className="space-y-4">
      {/* Countries / U.S. States sub-tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setSubTab('countries')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            subTab === 'countries'
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Countries
        </button>
        <button
          onClick={() => setSubTab('states')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            subTab === 'states'
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          U.S. States
        </button>
      </div>

      {/* Search / filter */}
      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${subTab === 'countries' ? 'countries' : 'states'} by name or code...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-400"
        />
      </div>

      {/* US global-override banner (states sub-tab only) */}
      {subTab === 'states' && usGloballyDisabled && (
        <div className="bg-amber-900/20 border border-amber-500 rounded-lg p-3">
          <p className="text-amber-300 text-sm">
            The <span className="font-semibold">United States</span> is globally
            disabled, so <span className="font-semibold">all U.S. states are
            currently blocked</span> regardless of their individual settings.
            Re-enable the US in the Countries tab to apply per-state settings.
          </p>
        </div>
      )}

      {/* Save error feedback */}
      {saveError && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{saveError}</p>
        </div>
      )}

      {/* Jurisdiction list */}
      <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-purple-900/30 text-xs uppercase tracking-wide text-gray-400">
          <span>Jurisdiction</span>
          <span>Bet &amp; Burn</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-purple-900/20">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No {subTab === 'countries' ? 'countries' : 'states'} match &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((item) => {
              const key = savingKey(subTab, item.code);
              const saving = savingKeys.has(key);
              const overridden = subTab === 'states' && usGloballyDisabled;
              return (
                <div
                  key={item.code}
                  onMouseEnter={() => setHoveredCode(item.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-purple-900/10 ${
                    hoveredCode === item.code ? 'bg-purple-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs font-mono">
                      {item.code}
                    </span>
                    <span className="text-white truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {overridden ? (
                      <span className="text-xs text-amber-400">
                        Blocked by US restriction
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          item.enabled ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                    <ToggleSwitch
                      enabled={item.enabled}
                      saving={saving}
                      onToggle={() => handleToggle(item.code)}
                      label={`Toggle Bet & Burn for ${item.name}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

          <div className="text-xs text-gray-500">
            Showing {filtered.length} of {list.length}{' '}
            {subTab === 'countries' ? 'countries' : 'U.S. states'}.
          </div>
        </div>

        {/* RIGHT: interactive map — same data/handlers as the list */}
        <div className="space-y-2">
          <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-4">
            {subTab === 'countries' ? (
              <GeoWorldMap
                jurisdictions={jurisdictionsForMap}
                savingCodes={savingCodesSet}
                hoveredCode={hoveredCode}
                selectedCode={selectedCode}
                onJurisdictionClick={handleToggle}
                onJurisdictionHover={setHoveredCode}
                className="mx-auto max-w-full"
              />
            ) : (
              <GeoUsMap
                jurisdictions={jurisdictionsForMap}
                savingCodes={savingCodesSet}
                hoveredCode={hoveredCode}
                selectedCode={selectedCode}
                onJurisdictionClick={handleToggle}
                onJurisdictionHover={setHoveredCode}
                className="mx-auto max-w-full"
              />
            )}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Click a region to toggle Bet &amp; Burn there — the list and map stay
            in sync. Small nations without a shape can be managed in the list.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GeoRestrictions;
