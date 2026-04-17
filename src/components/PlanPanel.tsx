"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { readSSE } from "@/lib/sse";
import type { SavedSpot } from "@/lib/store";

type LatLng = [number, number];

export interface PlanResult {
  orderedStops: SavedSpot[];
  polyline: LatLng[];
  distance_m?: number;
  duration_s?: number;
  degraded?: boolean;
  reservations: Record<string, { url: string; provider: string }>;
  summary: string;
}

interface Props {
  spots: SavedSpot[];
  plan: PlanResult | null;
  onPlan: (p: PlanResult | null) => void;
  onClose: () => void;
}

interface Trace {
  id: number;
  kind: "status" | "tool_call" | "tool_result" | "error";
  text: string;
}

export default function PlanPanel({ spots, plan, onPlan, onClose }: Props) {
  const [brief, setBrief] = useState(
    "date night Saturday — drinks, dinner, then dessert. Walkable, under $120 total.",
  );
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const traceIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const pushTrace = (kind: Trace["kind"], text: string) => {
    traceIdRef.current += 1;
    const id = traceIdRef.current;
    setTrace((t) => [...t, { id, kind, text }]);
  };

  const run = async () => {
    if (!brief.trim()) return;
    setRunning(true);
    setTrace([]);
    onPlan(null);

    let orderedSavedIds: string[] = [];
    let polyline: LatLng[] = [];
    let distance_m: number | undefined;
    let duration_s: number | undefined;
    let degraded = false;
    const reservations: Record<string, { url: string; provider: string }> = {};
    let summary = "";

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim(), spots }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || "Plan failed");
      }

      for await (const msg of readSSE(res)) {
        const payload = msg.data ? JSON.parse(msg.data) : {};
        switch (msg.event) {
          case "status":
            pushTrace("status", payload.message);
            break;
          case "tool_call":
            pushTrace("tool_call", `${payload.name}(${shortArgs(payload.args)})`);
            break;
          case "tool_result":
            pushTrace("tool_result", `${payload.name} → ${payload.summary}`);
            break;
          case "stops":
            orderedSavedIds = payload.orderedSavedIds ?? [];
            break;
          case "route":
            polyline = payload.polyline ?? [];
            distance_m = payload.distance_m;
            duration_s = payload.duration_s;
            degraded = !!payload.degraded;
            break;
          case "reservation":
            reservations[payload.savedId] = {
              url: payload.url,
              provider: payload.provider,
            };
            break;
          case "final":
            summary = payload.summary ?? "";
            break;
          case "error":
            pushTrace("error", payload.message ?? "Unknown error");
            toast.error(payload.message ?? "Plan failed");
            break;
        }
      }

      const orderedStops = orderedSavedIds
        .map((id) => spots.find((s) => s.savedId === id))
        .filter((s): s is SavedSpot => !!s);

      if (orderedStops.length >= 2 && polyline.length >= 2) {
        onPlan({
          orderedStops,
          polyline,
          distance_m,
          duration_s,
          degraded,
          reservations,
          summary,
        });
        toast.success("Plan ready!");
      } else if (summary) {
        pushTrace("status", summary);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      pushTrace("error", msg);
      toast.error(msg);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setRunning(false);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-white font-bold">🗓️ Plan My Night</h2>
        <button onClick={handleClose} className="text-gray-400 hover:text-white text-lg">
          ×
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-gray-800">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          disabled={running}
          placeholder="Describe your night…"
          className="w-full bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-[#fe2c55] focus:outline-none resize-none disabled:opacity-60"
        />
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={running || !brief.trim()}
            className="flex-1 bg-[#fe2c55] hover:bg-[#e02650] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2 font-semibold text-sm"
          >
            {running ? "Planning…" : "Build itinerary"}
          </button>
          {plan && !running && (
            <button
              onClick={() => {
                onPlan(null);
                setTrace([]);
              }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {plan ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-400">
              {plan.orderedStops.length} stops
              {plan.distance_m !== undefined && ` · ${(plan.distance_m / 1000).toFixed(2)} km`}
              {plan.duration_s !== undefined && ` · ~${Math.round(plan.duration_s / 60)} min walk`}
              {plan.degraded && " · (straight-line fallback)"}
            </div>
            {plan.orderedStops.map((s, i) => {
              const res = plan.reservations[s.savedId];
              return (
                <div key={s.savedId} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#fe2c55] text-white font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">{s.restaurantName}</p>
                      <p className="text-gray-400 text-xs">
                        {s.cuisine}
                        {s.location.neighborhood && ` · ${s.location.neighborhood}`}
                        {s.priceLevel && ` · ${"$".repeat(s.priceLevel)}`}
                      </p>
                      {s.hours && <p className="text-gray-500 text-xs mt-0.5">🕐 {s.hours}</p>}
                      {res && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[#fe2c55] text-xs hover:underline"
                        >
                          Reserve via {res.provider} →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {plan.summary && (
              <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 whitespace-pre-wrap text-gray-300 text-xs">
                {plan.summary}
              </div>
            )}
          </div>
        ) : trace.length === 0 && !running ? (
          <p className="text-gray-500 text-xs">
            Describe your night above. The agent picks 2–4 spots from your saved map, routes a walking path, and builds a reservation link.
          </p>
        ) : null}

        {trace.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-gray-800">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Agent trace
            </p>
            {trace.map((t) => (
              <div key={t.id} className={`text-xs ${traceColor(t.kind)}`}>
                <span className="text-gray-600 mr-1.5">{icon(t.kind)}</span>
                {t.text}
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-[#fe2c55]" />
                thinking…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function icon(k: Trace["kind"]): string {
  switch (k) {
    case "tool_call":
      return "→";
    case "tool_result":
      return "←";
    case "error":
      return "!";
    default:
      return "·";
  }
}

function traceColor(k: Trace["kind"]): string {
  switch (k) {
    case "tool_call":
      return "text-blue-300";
    case "tool_result":
      return "text-green-300";
    case "error":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

function shortArgs(args: Record<string, unknown>): string {
  const s = JSON.stringify(args);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}
