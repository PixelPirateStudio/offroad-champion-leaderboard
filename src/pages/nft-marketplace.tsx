import { useState } from "react";

export default function NFTMarketplace() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">

      {/* BACKDROP */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-[#0d0d0d] border-r border-amber-400/20 z-40 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-400/10">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-amber-400 text-xl transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-[calc(100%-70px)]">
          <div className="mb-8">
            <p className="text-gray-400 mb-3">Rarity</p>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" className="w-1/2 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Max" className="w-1/2 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button className="mt-3 w-full bg-[#111] border border-gray-700 rounded-lg py-2 text-sm hover:border-amber-400 transition">
              Apply
            </button>
          </div>

          <div className="mb-8">
            <p className="text-gray-400 mb-3">Price</p>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" className="w-1/2 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Max" className="w-1/2 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button className="mt-3 w-full bg-[#111] border border-gray-700 rounded-lg py-2 text-sm hover:border-amber-400 transition">
              Apply
            </button>
          </div>

          <div>
            <p className="text-gray-400 mb-3">Asset Class</p>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-amber-400" />
                Vehicles
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-amber-400" />
                Avatars
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-amber-400" />
                Weapons
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-amber-400" />
                Vehicle Weapons
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="relative h-[60vh] w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')",
          }}
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex flex-col justify-end h-full px-16 pb-16">
          <h1 className="text-4xl font-bold text-amber-400">
            OFF-ROAD CHAMPION NFT MARKETPLACE
          </h1>
          <p className="mt-2 max-w-xl text-gray-300">
            A new era of interactive digital collectibles built for the Off-Road Champion universe.
          </p>
        </div>
      </div>

      {/* STATS + FILTER ROW */}
      <div className="border-b border-amber-400/20">
        <div className="px-16 py-8 flex items-center">

          {/* LEFT SIDE FILTER BUTTON */}
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="bg-[#111] border border-amber-400/30 px-4 py-2 rounded-lg hover:border-amber-400 transition mr-12"
            >
              Filters
            </button>
          )}

          {/* CENTERED STATS */}
          <div className="flex justify-center gap-16 text-center flex-1">
            <div>
              <p className="text-gray-400 text-sm">Floor Price</p>
              <p className="text-xl font-semibold">2.00 ETH</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Top Offer</p>
              <p className="text-xl font-semibold">30.00 ETH</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Volume</p>
              <p className="text-xl font-semibold">910,200 ETH</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Owners</p>
              <p className="text-xl font-semibold">35,000</p>
            </div>
          </div>

        </div>
      </div>

      {/* GRID */}
      <div className="px-16 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-[#111] rounded-xl overflow-hidden border border-amber-400/10 hover:border-amber-400 transition">
            <div className="h-48 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500">NFT Image</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold">Off-Road Champion #{3900 + i}</h3>
              <p className="text-sm text-gray-400 mt-1">1.20 ETH</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}