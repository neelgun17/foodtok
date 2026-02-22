import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedSpot {
  savedId: string;
  videoId: string;
  restaurantName: string;
  cuisine: string;
  dishes: string[];
  videoUrl: string;
  location: {
    lat: number;
    lng: number;
    neighborhood: string;
    city: string;
  };
  savedAt: string;
  note: string;
  hours?: string;
  priceLevel?: 1 | 2 | 3;
  websiteUrl?: string;
  orderUrl?: string;
  tried: boolean;
  rating: number; // 0 = unrated, 1-5 stars
  collection: string; // "" = no collection
}

interface FoodMapStore {
  savedSpots: SavedSpot[];
  collections: string[];
  saveSpot: (spot: Omit<SavedSpot, "savedId" | "savedAt" | "note" | "tried" | "rating" | "collection">) => void;
  removeSpot: (savedId: string) => void;
  updateNote: (savedId: string, note: string) => void;
  toggleTried: (savedId: string) => void;
  setRating: (savedId: string, rating: number) => void;
  setCollection: (savedId: string, collection: string) => void;
  addCollection: (name: string) => void;
  removeCollection: (name: string) => void;
  isVideoSaved: (videoId: string) => boolean;
}

export const useFoodMapStore = create<FoodMapStore>()(
  persist(
    (set, get) => ({
      savedSpots: [],
      collections: ["Date Night", "Quick Lunch", "Must Try"],
      saveSpot: (spot) => {
        if (get().savedSpots.some((s) => s.videoId === spot.videoId)) return;
        set((state) => ({
          savedSpots: [
            ...state.savedSpots,
            {
              ...spot,
              savedId: `saved-${Date.now()}`,
              savedAt: new Date().toISOString(),
              note: "",
              tried: false,
              rating: 0,
              collection: "",
            },
          ],
        }));
      },
      removeSpot: (savedId) =>
        set((state) => ({
          savedSpots: state.savedSpots.filter((s) => s.savedId !== savedId),
        })),
      updateNote: (savedId, note) =>
        set((state) => ({
          savedSpots: state.savedSpots.map((s) =>
            s.savedId === savedId ? { ...s, note } : s
          ),
        })),
      toggleTried: (savedId) =>
        set((state) => ({
          savedSpots: state.savedSpots.map((s) =>
            s.savedId === savedId ? { ...s, tried: !s.tried } : s
          ),
        })),
      setRating: (savedId, rating) =>
        set((state) => ({
          savedSpots: state.savedSpots.map((s) =>
            s.savedId === savedId ? { ...s, rating } : s
          ),
        })),
      setCollection: (savedId, collection) =>
        set((state) => ({
          savedSpots: state.savedSpots.map((s) =>
            s.savedId === savedId ? { ...s, collection } : s
          ),
        })),
      addCollection: (name) =>
        set((state) => ({
          collections: state.collections.includes(name)
            ? state.collections
            : [...state.collections, name],
        })),
      removeCollection: (name) =>
        set((state) => ({
          collections: state.collections.filter((c) => c !== name),
          savedSpots: state.savedSpots.map((s) =>
            s.collection === name ? { ...s, collection: "" } : s
          ),
        })),
      isVideoSaved: (videoId) =>
        get().savedSpots.some((s) => s.videoId === videoId),
    }),
    { name: "food-map-storage" }
  )
);
