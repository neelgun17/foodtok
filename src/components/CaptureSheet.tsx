"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { demoCaptureSets } from "@/data/demoCaptureSets";
import { useFoodMapStore } from "@/lib/store";
import { useFriendsStore } from "@/lib/friends-store";
import type { ExtractedSpot } from "@/lib/ai";

type Stage = "pick" | "library" | "extracting" | "confirm" | "saving";

const MAX_EXTRACT_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CaptureSheet({ open, onClose }: Props) {
  const addSpot = useFoodMapStore((s) => s.addSpot);
  const publishSpot = useFriendsStore((s) => s.publishSpot);
  const me = useFriendsStore((s) => s.me);
  const [shareToFriends, setShareToFriends] = useState(true);
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
  const sampleSet = demoCaptureSets[0];

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

  const handleDemoSet = async (setId: string) => {
    const demo = demoCaptureSets.find((item) => item.id === setId);
    if (!demo) return;

    setStage("extracting");
    setError(null);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);

    try {
      const files = await Promise.all(
        demo.images.map(async (image) => {
          const res = await fetch(image.url, { cache: "no-store" });
          if (!res.ok) {
            throw new Error(`Couldn't load demo image: ${image.filename}`);
          }
          const blob = await res.blob();
          return new File([blob], image.filename, { type: image.mediaType });
        }),
      );

      await runExtraction(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("pick");
    }
  };

  const runExtraction = async (files: File[]) => {
    setStage("extracting");
    setError(null);
    try {
      const prepared = await prepareImagesForUpload(files);
      const totalBytes = prepared.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_EXTRACT_TOTAL_BYTES) {
        throw new Error("Capture is too large for live deploy. Use 1-2 photos or smaller images.");
      }

      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews(prepared.map((f) => URL.createObjectURL(f)));

      const form = new FormData();
      prepared.forEach((f) => form.append("images", f));
      const res = await fetch("/api/extract", { method: "POST", body: form });
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("Capture is too large for the deployed app. Use fewer or smaller photos.");
        }
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

    if (shareToFriends && me && (lat !== 0 || lng !== 0)) {
      try {
        await publishSpot({
          name: name.trim(),
          cuisine: cuisine.trim() || null,
          lat,
          lng,
          neighborhood: neighborhood || null,
          city: city || null,
          dishes,
          vibe_tags: extracted?.vibe_tags ?? [],
          price_tier: extracted?.price_tier ?? null,
          notes: note.trim() || null,
          website_url: null,
        });
      } catch (err) {
        toast.error(`Saved locally, share failed: ${err instanceof Error ? err.message : err}`);
      }
    } else if (shareToFriends && me) {
      toast("Couldn't geocode — not shared with friends", { icon: "⚠️" });
    }

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
                Record a clip or upload photos. Gemini will pull out the restaurant name, dishes, and address.
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
                  onClick={() => setStage("library")}
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

          {stage === "library" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Select Photos</p>
                  <p className="text-xs text-gray-400">
                    Review the selected set or upload your own photos from device.
                  </p>
                </div>
                <button
                  onClick={() => setStage("pick")}
                  className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold"
                >
                  Back
                </button>
              </div>

              <div className="rounded-xl border border-[#fe2c55]/40 bg-gray-950/70 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{sampleSet.title}</p>
                    <p className="text-xs text-gray-400">{sampleSet.images.length} selected</p>
                  </div>
                  <button
                    onClick={() => handleDemoSet(sampleSet.id)}
                    className="rounded-full bg-[#fe2c55] hover:bg-[#e02650] px-3 py-1.5 text-xs font-semibold"
                  >
                    Continue
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {sampleSet.images.map((image) => (
                    <div key={image.url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt=""
                        className="h-24 w-full rounded-lg object-cover ring-2 ring-[#fe2c55]"
                      />
                      <div className="absolute right-2 top-2 rounded-full bg-[#fe2c55] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Selected
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full rounded-xl bg-gray-800 hover:bg-gray-700 py-3 text-sm font-semibold"
              >
                Upload From Device
              </button>

              <p className="text-[11px] text-gray-500">
                Source notes live in <code>public/demo-capture/franklin/ATTRIBUTION.txt</code>.
              </p>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {stage === "extracting" && (
            <div className="py-10 text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fe2c55] mx-auto" />
              <p className="text-gray-300">Analyzing with AI</p>
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
              {me && (
                <label className="flex items-center gap-2 text-sm text-gray-300 pt-1">
                  <input
                    type="checkbox"
                    checked={shareToFriends}
                    onChange={(e) => setShareToFriends(e.target.checked)}
                    className="accent-[#fe2c55]"
                  />
                  Share with friends (@{me.handle})
                </label>
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
          const { width, height } = fitWithin(video.videoWidth, video.videoHeight, MAX_IMAGE_DIMENSION);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas 2d unavailable");
          ctx.drawImage(video, 0, 0, width, height);
          const blob: Blob = await new Promise((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.78),
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

async function prepareImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageForUpload(file)));
}

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, MAX_IMAGE_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const attempts = [0.82, 0.72, 0.62];
  let bestBlob: Blob | null = null;

  for (const quality of attempts) {
    const blob = await canvasToBlob(canvas, quality);
    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob;
    }
    if (blob.size <= 900 * 1024) break;
  }

  if (!bestBlob) return file;
  if (bestBlob.size >= file.size && width === image.naturalWidth && height === image.naturalHeight) {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "capture";
  return new File([bestBlob], `${name}.jpg`, { type: "image/jpeg" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to read image: ${file.name}`));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode image"));
    }, "image/jpeg", quality);
  });
}

function fitWithin(width: number, height: number, maxDimension: number) {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
