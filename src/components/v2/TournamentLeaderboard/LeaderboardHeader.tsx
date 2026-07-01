
interface LeaderboardHeaderProps {
  title: string;
  date: string;
  type: string;
  description: string;
  endedTime: string;
  memberCount: number;
  prize: string;
}

export const LeaderboardHeader = ({
  title,
  date,
  type,
  description,
  endedTime,
  memberCount,
  prize,
}: LeaderboardHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6 font-family-inter">
      {/* Left side - Icon and Info */}
      <div className="flex items-center gap-4">
        {/* Tournament Icon */}
        <img
          src="/logo.png"
          alt="Tournament Icon"
          className="w-16 h-16 rounded-full"
        />

        {/* Tournament Details */}
        <div>
          <h2 className="text-white text-xl font-bold">
            {title}
          </h2>
          <p className="text-gray-400 text-sm">
            {date} <span className="text-yellow-500">({type})</span>{" "}
            <span className="text-gray-300">{description}</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">{ endedTime.startsWith('in') ? "Ends" : "Ended"
            } {endedTime}</p>
          <p className="text-orange-500 text-xs font-semibold">
            {memberCount} Members
          </p>
        </div>
      </div>

      {/* Right side - Prize */}
      {prize && (
        <div className="flex items-center gap-2">
          <img src="/assets/coin.svg" alt="Prize Icon" className="w-8 h-8" />
          <div className="text-white text-xl font-bold">Prize: {prize}</div>
        </div>
      )}
    </div>
  );
};
