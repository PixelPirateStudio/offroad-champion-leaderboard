/**
 * Shared types + visual tokens for the Geo Restriction maps (Phase 4A foundation).
 *
 * IMPORTANT (Phase 4A): the supplied Figma SVG exports contain NO per-region
 * geographic identifiers (no ISO codes, names, or data attributes on the paths),
 * so region-level interactivity is NOT wired yet. These components render the
 * SVG as a faithful visual backdrop and expose the interaction API below so
 * Phase 4B can drive them once we have identifiable geography. See the Phase 4A
 * report for the identification blocker and options.
 */

// The semantic availability a jurisdiction region is painted from.
export type GeoVisualState = 'enabled' | 'disabled' | 'overridden';

// Colors sampled from Obi's design (#4D57C2 / #2E3368) plus the app's yellow
// accent for selection. Each semantic state has its OWN hover variant so hover
// only lightens the region's real state — it never makes a disabled/overridden
// region look enabled. Kept centralized so the resolver reads from one place.
export const GEO_MAP_COLORS = {
  enabled: '#4D57C2', // Obi purple/blue land (available)
  enabledHover: '#6B76E0', // brighter enabled purple
  disabled: '#2E3368', // Obi darker navy (blocked)
  disabledHover: '#3C4183', // lightened — still clearly dark/disabled, never enabled
  overridden: '#5B3B57', // muted tone for US-override (parent-disabled)
  overriddenHover: '#714A6C', // lightened override — still clearly overridden
  selected: '#EAB308', // app yellow-500 accent (selection outline only)
} as const;

export const GEO_MAP_BG = '#1B162D'; // dark purple canvas from the design
export const GEO_MAP_NEUTRAL = '#39335A'; // regions with no backend entry (inert)
export const GEO_MAP_BORDER = '#1B162D'; // subtle region separation

// Per-jurisdiction data the maps will consume in Phase 4B, keyed by stable code
// (ISO 3166-1 alpha-2 for the world map, US state code for the US map).
export interface GeoMapJurisdiction {
  enabled?: boolean;
  configured?: boolean;
  /** true when a US state is currently overridden by the disabled US country */
  overridden?: boolean;
}

export interface GeoMapProps {
  /** code -> jurisdiction availability (backend-derived, from the shared state) */
  jurisdictions?: Record<string, GeoMapJurisdiction>;
  /** codes currently mid-save (PATCH in flight) */
  savingCodes?: Set<string>;
  /** currently selected jurisdiction code (last clicked) */
  selectedCode?: string | null;
  /** currently hovered jurisdiction code (synced with the list) */
  hoveredCode?: string | null;
  /** fired when a region is clicked -> toggles that jurisdiction */
  onJurisdictionClick?: (code: string) => void;
  /** fired on region hover/leave -> highlights the matching list row */
  onJurisdictionHover?: (code: string | null) => void;
  className?: string;
}

// Precomputed geometry file shape (public/maps/*.paths.json)
export interface GeoRegion {
  code: string;
  name: string;
  d: string;
}
export interface GeoPathsFile {
  viewBox: string;
  regions: GeoRegion[];
}
