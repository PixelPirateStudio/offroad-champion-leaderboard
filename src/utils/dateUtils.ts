/**
 * Date Formatting Helpers
 * Renders tournament dates in the timezone tournaments are defined in
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Tournament periods roll over on Eastern Time, so the API's UTC timestamps
 * have to be read back in ET rather than in whatever zone the viewer is in
 */
export const TOURNAMENT_TIMEZONE = "America/New_York";

/**
 * Format a tournament timestamp for display in Eastern Time
 */
export function formatTournamentDate(
  isoString: string,
  format: string = "M/D/YYYY"
): string {
  return dayjs(isoString).tz(TOURNAMENT_TIMEZONE).format(format);
}
