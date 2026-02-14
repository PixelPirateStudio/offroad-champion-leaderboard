export default function NFTMarketplace() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* HERO SECTION */}
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

      {/* STATS ROW */}
      <div className="flex justify-center gap-16 py-8 border-b border-amber-400/20 text-center">
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

      {/* NFT GRID */}
      <div className="px-16 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-[#111] rounded-xl overflow-hidden border border-amber-400/10 hover:border-amber-400 transition"
          >
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
