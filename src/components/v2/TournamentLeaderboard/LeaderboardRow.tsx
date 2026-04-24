interface LeaderboardRowProps {
  place: number;
  username: string;
  countryCode?: string;
  score: string;
  races: number;
  qualified: boolean;
}

export const LeaderboardRow = ({
  place,
  username,
  countryCode,
  score,
  races,
  qualified,
}: LeaderboardRowProps) => {
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌐";
    return countryCode
      .toUpperCase()
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");
  };

  return (
    <div className="grid grid-cols-[40px_1fr_110px] sm:grid-cols-[60px_1fr_140px_100px_120px] items-center py-0 border- border-gray-800 last:border-b-0 font-family-inter">
      {/* Place */}
      <div className="text-white text-lg">{place}</div>

      {/* Player */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-2xl flex-shrink-0">{getCountryFlag(countryCode)}</span>
        <span className="text-white text-base truncate">{username}</span>
      </div>

      {/* Score */}
      <div className="text-white text-base flex justify-center truncate">{score}</div>

      {/* Races */}
      <div className="hidden sm:flex text-yellow-500 text-base justify-center font-semibold truncate">
        {races}
      </div>

      {/* Qualification */}
      <div className="hidden sm:flex justify-center">
        {qualified ? (
          <svg
            className="w-6 h-6 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
