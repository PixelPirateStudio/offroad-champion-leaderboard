"use client";
import { useState } from "react";
import { RaceDetails } from "@/utils/types/leaderboard";

interface StandingsRowProps {
  place: number;
  username: string;
  countryFlag: string;
  raceCount: number;
  qualified: boolean;
  bestTime: string;
  isWinner?: boolean;
  races?: RaceDetails[];
  trackNames?: Record<string, string>;
}

export const StandingsRow = ({
  place,
  username,
  countryFlag,
  raceCount,
  qualified,
  bestTime,
  isWinner = false,
  races = [],
  trackNames = {},
}: StandingsRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}:${milliseconds.toString().padStart(3, "0")}`;
  };

  return (
    <div className="flex gap-2 md:gap-3">
      {/* Place Card */}
      <div
        className={`flex items-center justify-center p-2 md:p-3 lg:p-4 border border-[#3D3356] rounded-lg cursor-pointer hover:bg-[#2A1F4A]/40 transition-colors self-start ${
          isWinner ? "bg-[#2A1F4A]/60" : "bg-[#1A1331]"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-white text-lg md:text-xl font-bold min-w-[30px] md:min-w-[40px] text-center">
          {place}
        </div>
      </div>

      {/* Main Content Card with Dropdown */}
      <div className="flex-1">
        <div
          className={`grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_100px_100px_140px] items-center p-2 md:p-3 lg:p-4 border border-[#3D3356] ${
            isExpanded ? "rounded-t-lg border-b-0" : "rounded-lg"
          } cursor-pointer hover:bg-[#2A1F4A]/40 transition-colors ${
            isWinner ? "bg-[#2A1F4A]/60" : "bg-[#1A1331]"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Player */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{countryFlag}</span>
            <span className="text-white text-base truncate">{username}</span>
            {isWinner && (
              <span className="text-orange-400 text-base font-bold flex-shrink-0">
                Winner!
              </span>
            )}
          </div>

          {/* Race */}
          <div className="hidden lg:block text-white text-base text-center truncate">{raceCount}</div>

          {/* Qualify */}
          <div className="hidden lg:flex justify-center">
            {qualified ? (
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Best time */}
          <div className="flex items-center justify-center lg:justify-center gap-2">
            <span className="text-white text-base lg:text-lg">{bestTime}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Expanded Race Details */}
        {isExpanded && races.length > 0 && (
          <div className="border-l border-r border-b border-[#3D3356] rounded-b-lg overflow-hidden bg-[#1A1331]">
            {races.map((race, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_60px_60px_140px] items-center p-3 border-b border-[#3D3356] last:border-b-0"
              >
                <div className="text-white text-sm">
                  {trackNames[race.trackID] || (race.trackID && race.trackID !== "0" ? race.trackID.replace(/S1_|_/g, (m) => m === "S1_" ? "" : " ").trim() : "Unknown Track")}
                </div>
                <div className="text-gray-400 text-sm text-center">{index + 1}</div>
                <div className="flex justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-white text-base text-center">{formatTime(race.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
