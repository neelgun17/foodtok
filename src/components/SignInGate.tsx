"use client";

import { useEffect, useState } from "react";
import { useFriendsStore } from "@/lib/friends-store";
import { getErrorMessage } from "@/lib/errors";
import { randomColor } from "@/lib/session";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function SignInGate({ children }: { children: React.ReactNode }) {
  const { me, needsHandle, socialAvailable, init, claimHandle, error, loading } = useFriendsStore();
  const [handle, setHandle] = useState("");
  const [color, setColor] = useState(randomColor());
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const submit = async () => {
    setLocalErr(null);
    const clean = handle.trim();
    if (clean.length < 2 || clean.length > 24) {
      setLocalErr("Handle must be 2–24 characters");
      return;
    }
    setSubmitting(true);
    try {
      await claimHandle(clean, color);
    } catch (err) {
      const msg = getErrorMessage(err);
      setLocalErr(msg.includes("duplicate") ? "Handle is taken" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (me || !socialAvailable) {
    return (
      <>
        {children}
        {!socialAvailable && error && (
          <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-2xl border border-amber-500/30 bg-gray-950/95 px-4 py-3 text-sm text-amber-100 shadow-2xl backdrop-blur">
            <p className="font-semibold text-amber-300">Friends offline</p>
            <p className="mt-1 leading-snug text-gray-200">{error}</p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative z-[10000] bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl">
          <h2 className="text-xl font-bold mb-1">Join the map</h2>
          <p className="text-sm text-gray-400 mb-4">
            Pick a handle and color. Friends will see your pins in this color.
          </p>
          {needsHandle || !loading ? (
            <>
              <label className="block mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Handle</span>
                <input
                  autoFocus
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="neel"
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#fe2c55]"
                />
              </label>
              <div className="mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Color</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`Pick color ${c}`}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c ? "ring-2 ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {(localErr || error) && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-red-300 text-sm leading-snug">{localErr || error}</p>
                </div>
              )}
              <button
                onClick={submit}
                disabled={submitting || loading}
                className="w-full bg-[#fe2c55] hover:bg-[#e02650] disabled:opacity-60 rounded-lg py-2.5 font-semibold"
              >
                {submitting ? "Joining…" : "Join"}
              </button>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe2c55] mx-auto" />
              <p className="text-gray-400 text-sm mt-3">Connecting…</p>
            </div>
          )}
        </div>
      </div>
      {children}
    </>
  );
}
