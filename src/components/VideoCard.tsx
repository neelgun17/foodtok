"use client";

import { RestaurantVideo } from "@/data/mockVideos";
import { useFoodMapStore } from "@/lib/store";
import toast from "react-hot-toast";

export default function VideoCard({ video }: { video: RestaurantVideo }) {
  const { saveSpot, isVideoSaved } = useFoodMapStore();
  const saved = isVideoSaved(video.id);

  const handleSave = () => {
    if (saved) return;
    saveSpot({
      videoId: video.id,
      restaurantName: video.restaurantName,
      cuisine: video.cuisine,
      dishes: video.dishes,
      videoUrl: video.videoUrl,
      location: video.location,
      hours: video.hours,
      priceLevel: video.priceLevel,
      websiteUrl: video.websiteUrl,
      orderUrl: video.orderUrl,
    });
    toast.success(`Saved ${video.restaurantName}!`);
  };

  return (
    <div className="relative h-[calc(100vh)] w-full snap-start snap-always flex items-center justify-center">
      <div className="relative h-full flex items-center gap-3">
        {/* Video container */}
        <div className="relative h-[calc(100vh-40px)] w-[calc((100vh-40px)*9/16)] max-w-[480px] rounded-xl overflow-hidden bg-gray-900">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${video.tiktokId}`}
            className="w-full h-full border-0"
            allowFullScreen
            allow="encrypted-media"
          />

          {/* Bottom overlay: restaurant info + action buttons */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pointer-events-none">
            <p className="text-white font-bold text-base drop-shadow-lg">
              {video.restaurantName}
            </p>
            <p className="text-gray-300 text-[13px] drop-shadow mt-0.5">
              {video.location.neighborhood} · {video.location.city}
              {video.hours && <span className="text-gray-400"> · 🕐 {video.hours}</span>}
            </p>
            <p className="text-white text-[13px] mt-2 drop-shadow">{video.caption}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {video.dishes.map((dish) => (
                <span
                  key={dish}
                  className="text-white/80 text-[13px]"
                >
                  #{dish.replace(/\s+/g, "")}
                </span>
              ))}
            </div>

            {/* Order / Website buttons */}
            <div className="flex gap-2 mt-3 pointer-events-auto">
              {video.orderUrl && (
                <a
                  href={video.orderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#fe2c55] hover:bg-[#e02548] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
                >
                  🛵 Order Now
                </a>
              )}
              {video.websiteUrl && (
                <a
                  href={video.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
                >
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right-side action column (TikTok style) */}
        <div className="flex flex-col items-center gap-4 pb-4 self-end mb-6">
          {/* Profile avatar */}
          <div className="relative mb-2">
            <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center text-2xl overflow-hidden">
              {video.thumbnail}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#fe2c55] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">+</span>
            </div>
          </div>

          {/* Heart */}
          <ActionButton icon="♥" label="Like" />

          {/* Comment */}
          <ActionButton icon="💬" label="Comment" />

          {/* Save / Bookmark — the pin action */}
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                saved
                  ? "text-yellow-400"
                  : "text-white group-hover:scale-110"
              }`}
            >
              {saved ? "🔖" : "🏷️"}
            </div>
            <span className={`text-[11px] font-semibold ${saved ? "text-yellow-400" : "text-white"}`}>
              {saved ? "Saved" : "Save"}
            </span>
          </button>

          {/* Share */}
          <ActionButton icon="↗" label="Share" />

          {/* Spinning record (TikTok style) */}
          <div className="mt-2 w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center animate-[spin_3s_linear_infinite]">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl text-white">
        {icon}
      </div>
      <span className="text-white text-[11px] font-semibold">{label}</span>
    </button>
  );
}
