"use client";

import { useFriendsStore, FriendSpot } from "@/lib/friends-store";

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
}

export default function DiscoveryFeed({
  onPick,
  onClose,
}: {
  onPick: (spot: FriendSpot) => void;
  onClose: () => void;
}) {
  const { spots, me } = useFriendsStore();

  return (
    <div className="h-full bg-gray-950 text-white flex flex-col border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="font-bold text-base">Discovery Feed</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {spots.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-6">
            No shared spots yet. Capture one or add a friend.
          </p>
        )}
        {spots.map((sp) => {
          const isMine = me && sp.owner === me.id;
          return (
            <button
              key={sp.id}
              onClick={() => onPick(sp)}
              className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sp.ownerColor }}
                />
                <span className="text-[11px] text-gray-400">
                  @{sp.ownerHandle}
                  {isMine && <span className="ml-1 text-gray-600">(you)</span>}
                </span>
                <span className="text-[10px] text-gray-600 ml-auto">
                  {timeAgo(sp.created_at)}
                </span>
              </div>
              <p className="font-semibold text-sm truncate">{sp.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {sp.cuisine ?? "—"}
                {sp.neighborhood ? ` · ${sp.neighborhood}` : ""}
              </p>
              {sp.dishes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {sp.dishes.slice(0, 3).map((d) => (
                    <span
                      key={d}
                      className="text-[10px] bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded-full"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
