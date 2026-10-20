import React from 'react';
import { RegionMap } from './RegionMap';
import type { GeoMapProps } from './geoMap';

/**
 * GeoUsMap — interactive United States map for state-level Bet & Burn
 * availability. Geometry: public/maps/us.paths.json (USPS state codes, with
 * Alaska & Hawaii insets). Availability comes from the shared parent state.
 */
export function GeoUsMap(props: GeoMapProps) {
  return (
    <RegionMap
      {...props}
      src="/maps/us.paths.json"
      ariaLabel="United States map of Bet & Burn state availability"
    />
  );
}

export default GeoUsMap;
