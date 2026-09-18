import React, { useEffect, useState } from 'react';
import {
  GEO_MAP_COLORS,
  GEO_MAP_BG,
  GEO_MAP_NEUTRAL,
  GEO_MAP_BORDER,
  type GeoMapProps,
  type GeoPathsFile,
} from './geoMap';

interface RegionMapProps extends GeoMapProps {
  /** URL of the precomputed {viewBox, regions:[{code,name,d}]} geometry file */
  src: string;
  /** accessible name for the whole map */
  ariaLabel: string;
}

/**
 * RegionMap — shared interactive SVG map.
 *
 * Geometry is STATIC and self-loaded from `src` (a precomputed, code-keyed
 * paths file). Availability is DYNAMIC and comes entirely from the parent via
 * `jurisdictions` / `savingCodes` (the same single state source as the list) —
 * this component holds no restriction state of its own, so list and map never
 * diverge. Clicking a region calls `onJurisdictionClick(code)`, which the
 * parent routes to the exact same toggle handler the list uses.
 */
export function RegionMap({
  src,
  ariaLabel,
  jurisdictions = {},
  savingCodes,
  selectedCode = null,
  hoveredCode = null,
  onJurisdictionClick,
  onJurisdictionHover,
  className = '',
}: RegionMapProps) {
  const [geo, setGeo] = useState<GeoPathsFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setGeo(null);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: GeoPathsFile) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Map failed to load.
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading map…
      </div>
    );
  }

  // Semantic state has priority; hover only picks a lighter variant of the
  // region's REAL state. Hover can never make disabled/overridden look enabled.
  const fillFor = (code: string, jur: (typeof jurisdictions)[string] | undefined) => {
    if (!jur) return GEO_MAP_NEUTRAL; // no backend entry -> inert
    const hovered = hoveredCode === code;
    if (jur.overridden) {
      return hovered ? GEO_MAP_COLORS.overriddenHover : GEO_MAP_COLORS.overridden;
    }
    if (jur.enabled) {
      return hovered ? GEO_MAP_COLORS.enabledHover : GEO_MAP_COLORS.enabled;
    }
    return hovered ? GEO_MAP_COLORS.disabledHover : GEO_MAP_COLORS.disabled;
  };

  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox={geo.viewBox}
        role="group"
        aria-label={ariaLabel}
        className="w-full h-auto rounded-md"
        style={{ backgroundColor: GEO_MAP_BG }}
      >
        {geo.regions.map((region) => {
          const jur = jurisdictions[region.code];
          const interactive = Boolean(jur) && Boolean(onJurisdictionClick);
          const saving = savingCodes?.has(region.code) ?? false;
          const selected = selectedCode === region.code;

          const statusText = jur
            ? jur.overridden
              ? 'blocked by US restriction'
              : jur.enabled
                ? 'enabled'
                : 'disabled'
            : 'not managed';

          const handleClick = () => {
            if (!interactive || saving) return;
            onJurisdictionClick?.(region.code);
          };

          return (
            <path
              key={region.code}
              d={region.d}
              fill={fillFor(region.code, jur)}
              stroke={selected ? GEO_MAP_COLORS.selected : GEO_MAP_BORDER}
              strokeWidth={selected ? 1.5 : 0.5}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${region.name}: ${statusText}` : undefined}
              aria-pressed={interactive ? Boolean(jur?.enabled) : undefined}
              aria-busy={saving || undefined}
              className={`transition-opacity ${
                interactive ? 'cursor-pointer' : ''
              } ${saving ? 'opacity-50 animate-pulse' : ''} focus:outline-none`}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (!interactive) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }}
              onMouseEnter={() => onJurisdictionHover?.(region.code)}
              onMouseLeave={() => onJurisdictionHover?.(null)}
              onFocus={() => onJurisdictionHover?.(region.code)}
              onBlur={() => onJurisdictionHover?.(null)}
            >
              <title>{`${region.name} (${region.code}) — ${statusText}`}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}

export default RegionMap;
