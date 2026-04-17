"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useFriendsStore } from "@/lib/friends-store";

export default function FriendsPanel({ onClose }: { onClose: () => void }) {
  const { me, friends, incoming, outgoing, sendRequest, acceptRequest, rejectRequest } =
    useFriendsStore();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = handle.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await sendRequest(clean);
      toast.success(`Request sent to @${clean}`);
      setHandle("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("no such") ? "Handle not found" : msg);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: string, who: string) => {
    try {
      await acceptRequest(id);
      toast.success(`@${who} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const reject = async (id: string) => {
    try {
      await rejectRequest(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="h-full bg-gray-950 text-white flex flex-col border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h2 className="font-bold text-base">Friends</h2>
          {me && (
            <p className="text-[11px] text-gray-400">
              you&apos;re{" "}
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: me.color }}
                />
                @{me.handle}
              </span>
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
          ×
        </button>
      </div>

      <div className="p-4 border-b border-gray-800">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Add by handle</label>
        <div className="flex gap-2 mt-1.5">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="friendhandle"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#fe2c55]"
          />
          <button
            onClick={submit}
            disabled={busy || !handle.trim()}
            className="bg-[#fe2c55] hover:bg-[#e02650] disabled:opacity-50 rounded-lg px-4 text-sm font-semibold"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {incoming.length > 0 && (
          <Section title={`Incoming (${incoming.length})`}>
            {incoming.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Dot color={p.color} />
                <span className="flex-1 text-sm">@{p.handle}</span>
                <button
                  onClick={() => accept(p.id, p.handle)}
                  className="text-xs bg-green-600 hover:bg-green-500 rounded-full px-3 py-1"
                >
                  Accept
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </Section>
        )}

        {outgoing.length > 0 && (
          <Section title="Pending">
            {outgoing.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Dot color={p.color} />
                <span className="flex-1 text-sm text-gray-400">@{p.handle}</span>
                <span className="text-[10px] text-gray-500">sent</span>
              </div>
            ))}
          </Section>
        )}

        <Section title={`Friends (${friends.length})`}>
          {friends.length === 0 && (
            <p className="text-gray-500 text-xs">
              No friends yet. Share your handle:{" "}
              <span className="text-white">@{me?.handle}</span>
            </p>
          )}
          {friends.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Dot color={p.color} />
              <span className="flex-1 text-sm">@{p.handle}</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
