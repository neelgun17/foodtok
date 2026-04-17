"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useFoodMapStore } from "@/lib/store";
import type { ExtractedSpot } from "@/lib/ai";

type Stage = "pick" | "extracting" | "confirm" | "saving";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CaptureSheet({ open, onClose }: Props) {
  const addSpot = useFoodMapStore((s) => s.addSpot);
  const [stage, setStage] = useState<Stage>("pick");
  const [previews, setPreviews] = useState<string[]>([]);
  const [extracted, setExtracted] = useState<ExtractedSpot | null>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [dishesText, setDishesText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStage("pick");
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setExtracted(null);
    setAddress("");
    setName("");
    setCuisine("");
    setDishesText("");
    setNote("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handlePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 4);
    await runExtraction(arr);
  };

  const handleVideo = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setStage("extracting");
    setError(null);
    try {
      const frames = await extractKeyframes(file, 3);
      await runExtraction(frames);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("pick");
    }
  };

  const runExtraction = async (files: File[]) => {
    setStage("extracting");
    setError(null);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    try {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      const res = await fetch("/api/extract", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || "Extraction failed");
      }
      const data = (await res.json()) as ExtractedSpot;
      setExtracted(data);
      setName(data.name);
      setCuisine(data.cuisine);
      setDishesText(data.dishes.join(", "));
      setAddress(data.best_guess_address);
      setNote(data.notes);
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("pick");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setStage("saving");
    let lat = 0, lng = 0, neighborhood = "", city = "";
    if (address.trim()) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
        const data = await res.json();
        if (data.found) {
          lat = data.lat;
          lng = data.lng;
          neighborhood = data.neighborhood || "";
          city = data.city || "";
        }
      } catch {
        // swallow, still save without coords
      }
    }

    const dishes = dishesText
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    addSpot({
      videoId: `capture-${Date.now()}`,
      restaurantName: name.trim(),
      cuisine: cuisine.trim() || "Unknown",
      dishes,
      videoUrl: "",
      location: { lat, lng, neighborhood, city },
      hours: "",
      priceLevel: extracted?.price_tier ?? 2,
      note: note.trim(),
    });

    toast.success(`Saved ${name.trim()}!`);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="bg-gray-900 text-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold">Capture a Spot</h2>
          <button onClick={close} aria-label="Close" className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {stage === "pick" && (
            <>
              <p className="text-sm text-gray-400">
                Record a clip or upload photos. Claude will pull out the restaurant name, dishes, and address.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="bg-[#fe2c55] hover:bg-[#e02650] rounded-xl py-6 px-3 text-center font-semibold"
                >
                  <div className="text-3xl mb-1">🎥</div>
                  Record / Video
                </button>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl py-6 px-3 text-center font-semibold"
                >
                  <div className="text-3xl mb-1">📷</div>
                  Photos
                </button>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleVideo(e.target.files)}
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotos(e.target.files)}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </>
          )}

          {stage === "extracting" && (
            <div className="py-10 text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fe2c55] mx-auto" />
              <p className="text-gray-300">Analyzing with Claude…</p>
              {previews.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap pt-2">
                  {previews.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={p} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          )}

          {stage === "confirm" && extracted && (
            <div className="space-y-3">
              {previews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previews.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={p} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-400">
                Confidence: {(extracted.confidence * 100).toFixed(0)}% · edit anything that looks off
              </div>
              <Field label="Name" value={name} onChange={setName} placeholder="Restaurant name" />
              <Field label="Cuisine" value={cuisine} onChange={setCuisine} placeholder="e.g. Italian" />
              <Field label="Dishes (comma-separated)" value={dishesText} onChange={setDishesText} />
              <Field label="Address" value={address} onChange={setAddress} placeholder="Full address for map pin" />
              <Field label="Note (optional)" value={note} onChange={setNote} />
              {extracted.vibe_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {extracted.vibe_tags.map((t) => (
                    <span key={t} className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-2.5 font-semibold"
                >
                  Try again
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-[#fe2c55] hover:bg-[#e02650] rounded-lg py-2.5 font-semibold"
                >
                  Save to Map
                </button>
              </div>
            </div>
          )}

          {stage === "saving" && (
            <div className="py-10 text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe2c55] mx-auto" />
              <p className="text-gray-300">Geocoding & saving…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#fe2c55]"
      />
    </label>
  );
}

async function extractKeyframes(file: File, count: number): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Video processing timed out"));
    }, 15000);
    const done = <T,>(fn: () => T) => {
      clearTimeout(timeout);
      return fn();
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          reject(new Error("Could not read video duration"));
          return;
        }
        const canvas = document.createElement("canvas");
        const frames: File[] = [];
        for (let i = 0; i < count; i++) {
          const t = duration * ((i + 1) / (count + 1));
          await seek(video, t);
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas 2d unavailable");
          ctx.drawImage(video, 0, 0);
          const blob: Blob = await new Promise((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.85),
          );
          frames.push(new File([blob], `frame-${i}.jpg`, { type: "image/jpeg" }));
        }
        URL.revokeObjectURL(video.src);
        done(() => resolve(frames));
      } catch (err) {
        URL.revokeObjectURL(video.src);
        done(() => reject(err));
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      done(() => reject(new Error("Failed to load video")));
    };
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      resolve();
    };
    video.addEventListener("seeked", handler);
    video.currentTime = time;
  });
}
