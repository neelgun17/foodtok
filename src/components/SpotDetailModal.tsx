"use client";

import { SavedSpot, useFoodMapStore } from "@/lib/store";
import { useState, useEffect } from "react";

interface SpotDetailModalProps {
  spot: SavedSpot;
  onClose: () => void;
}

export default function SpotDetailModal({ spot, onClose }: SpotDetailModalProps) {
  const { updateNote, toggleTried, setRating, setCollection, collections, addCollection } =
    useFoodMapStore();
  const [note, setNote] = useState(spot.note);
  const [newCollection, setNewCollection] = useState("");

  useEffect(() => {
    setNote(spot.note);
  }, [spot]);

  const handleSaveNote = () => {
    updateNote(spot.savedId, note);
  };

  const priceLabel = (level: number) => "$".repeat(level);

  const openDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${spot.location.lat},${spot.location.lng}&travelmode=driving`,
      "_blank"
    );
  };

  const handleAddCollection = () => {
    const name = newCollection.trim();
    if (!name) return;
    addCollection(name);
    setCollection(spot.savedId, name);
    setNewCollection("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl font-bold">{spot.restaurantName}</h2>
              {spot.priceLevel && (
                <span className="text-green-400 text-sm font-medium">
                  {priceLabel(spot.priceLevel)}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {spot.cuisine} · {spot.location.neighborhood}, {spot.location.city}
            </p>
            {spot.hours && (
              <p className="text-gray-500 text-xs mt-1">🕐 {spot.hours}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tried toggle + Rating */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-800">
          <button
            onClick={() => toggleTried(spot.savedId)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors ${
              spot.tried
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
            }`}
          >
            {spot.tried ? "✅ Tried it!" : "🎯 Want to Go"}
          </button>

          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs mr-1">Rate:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(spot.savedId, spot.rating === star ? 0 : star)}
                className={`text-lg transition-colors ${
                  star <= spot.rating ? "text-yellow-400" : "text-gray-700 hover:text-gray-500"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Collection picker */}
        <div className="mb-4">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Collection</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              onClick={() => setCollection(spot.savedId, "")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !spot.collection
                  ? "bg-[#fe2c55] text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              None
            </button>
            {collections.map((c) => (
              <button
                key={c}
                onClick={() => setCollection(spot.savedId, c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  spot.collection === c
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
              placeholder="New collection..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none placeholder:text-gray-600"
            />
            <button
              onClick={handleAddCollection}
              className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-700 hover:text-white"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Dishes */}
        <div className="mb-4">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Dishes</h3>
          <div className="flex flex-wrap gap-2">
            {spot.dishes.map((dish) => (
              <span
                key={dish}
                className="bg-red-500/20 text-red-300 text-sm px-3 py-1.5 rounded-full"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Your Notes</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSaveNote}
            placeholder="Add a note... (e.g., 'get the spicy ramen')"
            className="w-full bg-gray-800 text-white rounded-xl p-3 text-sm resize-none h-20 border border-gray-700 focus:border-[#fe2c55] focus:outline-none"
          />
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Actions</h3>

          {/* Directions */}
          <button
            onClick={openDirections}
            className="w-full bg-blue-500 text-white text-sm text-center py-2.5 rounded-xl hover:bg-blue-600 transition-colors"
          >
            📍 Get Directions
          </button>

          <div className="flex gap-2">
            {spot.orderUrl && (
              <a
                href={spot.orderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#fe2c55] text-white text-sm text-center py-2.5 rounded-xl hover:bg-[#e02548] transition-colors"
              >
                🛵 Order Now
              </a>
            )}
            {spot.websiteUrl && (
              <a
                href={spot.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gray-700 text-white text-sm text-center py-2.5 rounded-xl hover:bg-gray-600 transition-colors"
              >
                🌐 Website
              </a>
            )}
          </div>

          <a
            href={spot.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-red-400 hover:text-red-300 py-1"
          >
            ▶ Watch Original Video
          </a>
        </div>

        {/* Saved timestamp */}
        <p className="text-gray-600 text-xs text-center mt-4">
          Saved {new Date(spot.savedAt).toLocaleDateString()} at{" "}
          {new Date(spot.savedAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
