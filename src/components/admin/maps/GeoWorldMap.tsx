import React from 'react';
import { RegionMap } from './RegionMap';
import type { GeoMapProps } from './geoMap';

/**
 * GeoWorldMap — interactive world map for country-level Bet & Burn availability.
 * Geometry: public/maps/world.paths.json (ISO 3166-1 alpha-2 codes, projected
 * from Natural Earth 110m). Availability comes from the shared parent state.
 */
export function GeoWorldMap(props: GeoMapProps) {
  return (
    <RegionMap
      {...props}
      src="/maps/world.paths.json"
      ariaLabel="World map of Bet & Burn country availability"
    />
  );
}

export default GeoWorldMap;
