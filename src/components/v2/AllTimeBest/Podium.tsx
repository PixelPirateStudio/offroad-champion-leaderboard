import { MergedEntry } from "@/utils/types/leaderboard";
import Image from "next/image";

interface PodiumProps {
  entries: MergedEntry[];
}

export const Podium = ({ entries }: PodiumProps) => {
  const top3 = entries.slice(0, 3);
  const actualRunnerUps = entries.slice(3, 11);
  // Always show 8 runner-up positions (4-11), with placeholders if needed
  const runnerUps = Array.from({ length: 8 }, (_, i) => actualRunnerUps[i] || null);

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌐";
    return countryCode
      .toUpperCase()
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");
  };

  const getShieldIcon = (position: number) => {
    switch (position) {
      case 1:
        return "/assets/winner.svg";
      case 2:
        return "/assets/silver.svg";
      case 3:
        return "/assets/bronze.svg";
      default:
        return "/assets/winner.svg";
    }
  };

  // Arrange podium as 2nd, 1st, 3rd
  const [first, second, third] = top3;
  // Always show 3 positions, even if some are undefined
  const podiumOrder = [second, first, third];

  return (
    <div className="flex flex-col h-full">
      <h4 className="text-xl font-bold font-family-inter pl-2 mb-2">
        Best of Off-Road Champion
      </h4>
      <div className="border border-purple-500 rounded-lg p-4 md:p-6 lg:p-8 font-family-inter flex-1">
        <div className="flex flex-col lg:flex-row items-center justify-center lg:items-start gap-4 md:gap-6 lg:gap-8">
          {/* Podium Display */}
          <div className="flex items-end justify-center gap-2 scale-100 w-max lg:w-auto h-full">
            {podiumOrder.map((entry, idx) => {
              const position = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const isFirst = position === 1;

              return (
                <div
                  key={entry?.userId || `placeholder-${position}`}
                  className="flex flex-col items-center grow-0 shrink-0"
                  style={{ marginBottom: isFirst ? "0px" : "-20px" }}
                >
                  {/* Shield Icon */}
                  <div className="relative mb-4">
                    <Image
                      src={getShieldIcon(position)}
                      alt={`Position ${position}`}
                      width={1.5 * (isFirst ? 90 : 70)}
                      height={1.5 * (isFirst ? 105 : 84)}
                      className={`drop-shadow-lg grow-0 shrink-0 ${
                        isFirst
                          ? "w-[120px] h-[140px] md:w-[135px] md:h-[157px] lg:w-[90px] lg:h-[105px] xl:w-[120px] xl:h-[140px]"
                          : "w-[95px] h-[114px] md:w-[105px] md:h-[126px] lg:w-[70px] lg:h-[84px] xl:w-[95px] xl:h-[114px]"
                      } ${!entry ? "opacity-30" : ""}`}
                    />
                    {/* Position number bubble */}
                    <div className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white text-black rounded-full w-7 h-7 md:w-8 md:h-8 lg:w-6 lg:h-6 flex items-center justify-center text-sm font-bold ${!entry ? "opacity-30" : ""}`}>
                      {position}
                    </div>
                  </div>

                  {/* Username */}
                  <div className="text-sm md:text-base lg:text-xs font-bold mb-1 truncate max-w-[100px] md:max-w-[120px] lg:max-w-[80px]">
                    {entry ? entry.user.username : "-"}
                  </div>
                  {/* Number of Races */}
                  <div className="text-sm md:text-base lg:text-xs font-bold mb-1 truncate">
                    {entry ? (
                      <>
                        <span className="text-yellow-500">{entry.racesCompleted ?? entry.races.length}</span>
                        <span className="text-white">W</span>
                      </>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>

                  {/* Flag */}
                  <div className="text-3xl md:text-4xl lg:text-2xl mb-1">
                    {entry ? getCountryFlag(entry.user.countryCode) : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Runner-ups list */}
          <div className="flex flex-col space-y-1 flex-1 w-full lg:w-auto">
            {runnerUps.map((entry, idx) => (
              <div
                key={entry?.userId || `runner-up-${idx + 4}`}
                className={`flex items-center justify-between ${!entry ? "opacity-30" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-5 h-5 flex-shrink-0">
                    <Image
                      src="/assets/winner.svg"
                      alt="Shield"
                      width={20}
                      height={20}
                    />
                  </div>
                  <span className="text-lg flex-shrink-0">
                    {entry ? getCountryFlag(entry.user.countryCode) : ""}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {entry ? entry.user.username : "-"}
                  </span>
                </div>
                <div className="text-lg font-bold flex-shrink-0">
                  {entry ? (
                    <>
                      {entry.racesCompleted ?? entry.races.length}
                      <span className="text-yellow-500">W</span>
                    </>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
