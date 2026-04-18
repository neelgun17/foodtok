"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useFoodMapStore, SavedSpot } from "@/lib/store";
import { useFriendsStore, FriendSpot } from "@/lib/friends-store";
import SignInGate from "@/components/SignInGate";
import FriendsPanel from "@/components/FriendsPanel";
import DiscoveryFeed from "@/components/DiscoveryFeed";
import SpotDetailModal from "@/components/SpotDetailModal";
import PlanPanel, { type PlanResult } from "@/components/PlanPanel";
import Link from "next/link";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type SortOption = "newest" | "oldest" | "name" | "price-low" | "price-high" | "rating";
type TriedFilter = "all" | "tried" | "want-to-go";

function MapPageInner() {
  const { savedSpots, removeSpot, toggleTried, setRating, collections } = useFoodMapStore();
  const allRemoteSpots = useFriendsStore((s) => s.spots);
  const demoSpots = useFriendsStore((s) => s.demoSpots);
  const me = useFriendsStore((s) => s.me);
  const socialAvailable = useFriendsStore((s) => s.socialAvailable);
  const friendSpots = useMemo(() => {
    const live = me ? allRemoteSpots.filter((s) => s.owner !== me.id) : allRemoteSpots;
    return [...demoSpots, ...live];
  }, [allRemoteSpots, demoSpots, me]);
  const incomingCount = useFriendsStore((s) => s.incoming.length);
  const [activeSpot, setActiveSpot] = useState<SavedSpot | null>(null);
  const [modalSpot, setModalSpot] = useState<SavedSpot | null>(null);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [randomPick, setRandomPick] = useState<SavedSpot | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter state
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set());
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set());
  const [selectedPrices, setSelectedPrices] = useState<Set<number>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState("");
  const [triedFilter, setTriedFilter] = useState<TriedFilter>("all");
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [ratedOnly, setRatedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Derive available filter options from saved spots
  const cuisines = useMemo(
    () => [...new Set(savedSpots.map((s) => s.cuisine))].sort(),
    [savedSpots]
  );
  const neighborhoods = useMemo(
    () => [...new Set(savedSpots.map((s) => s.location.neighborhood))].sort(),
    [savedSpots]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCuisines.size > 0) count++;
    if (selectedNeighborhoods.size > 0) count++;
    if (selectedPrices.size > 0) count++;
    if (selectedCollection) count++;
    if (triedFilter !== "all") count++;
    if (deliveryOnly) count++;
    if (hasWebsite) count++;
    if (hasNotes) count++;
    if (ratedOnly) count++;
    return count;
  }, [selectedCuisines, selectedNeighborhoods, selectedPrices, selectedCollection, triedFilter, deliveryOnly, hasWebsite, hasNotes, ratedOnly]);

  const clearAllFilters = () => {
    setSelectedCuisines(new Set());
    setSelectedNeighborhoods(new Set());
    setSelectedPrices(new Set());
    setSelectedCollection("");
    setTriedFilter("all");
    setDeliveryOnly(false);
    setHasWebsite(false);
    setHasNotes(false);
    setRatedOnly(false);
    setSearch("");
    setSortBy("newest");
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let results = savedSpots;

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (s) =>
          s.restaurantName.toLowerCase().includes(q) ||
          s.dishes.some((d) => d.toLowerCase().includes(q)) ||
          s.cuisine.toLowerCase().includes(q) ||
          s.location.neighborhood.toLowerCase().includes(q)
      );
    }

    if (selectedCuisines.size > 0) {
      results = results.filter((s) => selectedCuisines.has(s.cuisine));
    }
    if (selectedNeighborhoods.size > 0) {
      results = results.filter((s) => selectedNeighborhoods.has(s.location.neighborhood));
    }
    if (selectedPrices.size > 0) {
      results = results.filter((s) => s.priceLevel && selectedPrices.has(s.priceLevel));
    }
    if (selectedCollection) {
      results = results.filter((s) => s.collection === selectedCollection);
    }
    if (triedFilter === "tried") {
      results = results.filter((s) => s.tried);
    } else if (triedFilter === "want-to-go") {
      results = results.filter((s) => !s.tried);
    }
    if (deliveryOnly) {
      results = results.filter((s) => !!s.orderUrl);
    }
    if (hasWebsite) {
      results = results.filter((s) => !!s.websiteUrl);
    }
    if (hasNotes) {
      results = results.filter((s) => s.note.trim().length > 0);
    }
    if (ratedOnly) {
      results = results.filter((s) => s.rating > 0);
    }

    const sorted = [...results];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
        break;
      case "name":
        sorted.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
        break;
      case "price-low":
        sorted.sort((a, b) => (a.priceLevel ?? 2) - (b.priceLevel ?? 2));
        break;
      case "price-high":
        sorted.sort((a, b) => (b.priceLevel ?? 2) - (a.priceLevel ?? 2));
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
    }

    return sorted;
  }, [savedSpots, search, selectedCuisines, selectedNeighborhoods, selectedPrices, selectedCollection, triedFilter, deliveryOnly, hasWebsite, hasNotes, ratedOnly, sortBy]);

  useEffect(() => {
    if (activeSpot && listRefs.current[activeSpot.savedId]) {
      listRefs.current[activeSpot.savedId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSpot]);

  const toggleInSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const priceLabel = (level: number) => "$".repeat(level);

  const handleRandomPick = () => {
    const pool = filtered.length > 0 ? filtered : savedSpots;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRandomPick(pick);
    setActiveSpot(pick);
  };

  const openDirections = (spot: SavedSpot) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.location.lat},${spot.location.lng}&destination_place_id=&travelmode=driving`;
    window.open(url, "_blank");
  };

  const onPickFriendSpot = (sp: FriendSpot) => {
    setFlyTo([sp.lat, sp.lng]);
    setFeedOpen(false);
  };

  if (savedSpots.length === 0 && friendSpots.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <span className="text-6xl mb-4">🗺️</span>
        <h2 className="text-white text-xl font-bold mb-2">No spots yet</h2>
        <p className="text-gray-400 text-center mb-6">
          Capture a spot, save one from the feed, or add a friend to see theirs.
        </p>
        <Link
          href="/"
          className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600"
        >
          Browse Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="isolate min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-bold text-lg">Food Map</h1>
            <span className="text-gray-500 text-sm">
              {filtered.length} of {savedSpots.length} spot{savedSpots.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!socialAvailable}
              onClick={() => { setFeedOpen((v) => !v); setFriendsOpen(false); }}
              title={socialAvailable ? "Discovery feed" : "Configure Supabase to enable social features"}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                feedOpen ? "bg-[#fe2c55] text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              📡 Feed
            </button>
            <button
              disabled={!socialAvailable}
              onClick={() => { setFriendsOpen((v) => !v); setFeedOpen(false); }}
              title={socialAvailable ? "Friends" : "Configure Supabase to enable social features"}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                friendsOpen ? "bg-[#fe2c55] text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              👥 Friends
              {incomingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {incomingCount}
                </span>
              )}
            </button>
            {/* Plan my night */}
            <button
              onClick={() => setPlanOpen((v) => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                planOpen || plan
                  ? "bg-[#fe2c55] text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title="Plan my night"
            >
              🗓️ Plan Night
            </button>
            {/* Random pick */}
            <button
              onClick={handleRandomPick}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              title="Pick a random spot"
            >
              🎲 Surprise Me
            </button>
            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? "bg-[#fe2c55] text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurant, dish, cuisine, neighborhood..."
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-[#fe2c55] focus:outline-none placeholder:text-gray-500"
          />
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-3 pb-1 space-y-3">
            {/* Tried / Want-to-go tabs */}
            <FilterSection label="Status">
              <ChipToggle label="All" active={triedFilter === "all"} onClick={() => setTriedFilter("all")} />
              <ChipToggle label="Tried" icon="✅" active={triedFilter === "tried"} onClick={() => setTriedFilter("tried")} />
              <ChipToggle label="Want to Go" icon="🎯" active={triedFilter === "want-to-go"} onClick={() => setTriedFilter("want-to-go")} />
            </FilterSection>

            {/* Collection filter */}
            {collections.length > 0 && (
              <FilterSection label="Collection">
                <ChipToggle label="All" active={selectedCollection === ""} onClick={() => setSelectedCollection("")} />
                {collections.map((c) => (
                  <ChipToggle
                    key={c}
                    label={c}
                    active={selectedCollection === c}
                    onClick={() => setSelectedCollection(selectedCollection === c ? "" : c)}
                  />
                ))}
              </FilterSection>
            )}

            {/* Cuisine chips */}
            <FilterSection label="Cuisine">
              {cuisines.map((c) => (
                <ChipToggle
                  key={c}
                  label={c}
                  active={selectedCuisines.has(c)}
                  onClick={() => setSelectedCuisines(toggleInSet(selectedCuisines, c))}
                />
              ))}
            </FilterSection>

            {/* Neighborhood chips */}
            <FilterSection label="Neighborhood">
              {neighborhoods.map((n) => (
                <ChipToggle
                  key={n}
                  label={n}
                  active={selectedNeighborhoods.has(n)}
                  onClick={() => setSelectedNeighborhoods(toggleInSet(selectedNeighborhoods, n))}
                />
              ))}
            </FilterSection>

            {/* Price level */}
            <FilterSection label="Price">
              {[1, 2, 3].map((p) => (
                <ChipToggle
                  key={p}
                  label={priceLabel(p)}
                  active={selectedPrices.has(p)}
                  onClick={() => setSelectedPrices(toggleInSet(selectedPrices, p))}
                />
              ))}
            </FilterSection>

            {/* Toggle filters */}
            <FilterSection label="Features">
              <ChipToggle label="Delivery" icon="🛵" active={deliveryOnly} onClick={() => setDeliveryOnly(!deliveryOnly)} />
              <ChipToggle label="Has Website" icon="🌐" active={hasWebsite} onClick={() => setHasWebsite(!hasWebsite)} />
              <ChipToggle label="Has Notes" icon="📝" active={hasNotes} onClick={() => setHasNotes(!hasNotes)} />
              <ChipToggle label="Rated" icon="⭐" active={ratedOnly} onClick={() => setRatedOnly(!ratedOnly)} />
            </FilterSection>

            {/* Sort + clear row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 focus:border-[#fe2c55] focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A–Z</option>
                  <option value="rating">Top Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-[#fe2c55] text-xs hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Random pick banner */}
      {randomPick && (
        <div className="bg-gradient-to-r from-[#fe2c55]/20 to-purple-500/20 border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎲</span>
              <div>
                <p className="text-white text-sm font-semibold">
                  Tonight&apos;s pick: {randomPick.restaurantName}!
                </p>
                <p className="text-gray-400 text-xs">
                  {randomPick.cuisine} · {randomPick.location.neighborhood}
                  {randomPick.priceLevel && ` · ${priceLabel(randomPick.priceLevel)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openDirections(randomPick)}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600"
              >
                📍 Directions
              </button>
              <button
                onClick={handleRandomPick}
                className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-full hover:bg-gray-600"
              >
                Re-roll
              </button>
              <button
                onClick={() => setRandomPick(null)}
                className="text-gray-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row w-full">
        {/* Map */}
        <div className="relative z-0 h-[40vh] lg:h-auto lg:flex-1 p-3">
          <MapView
            spots={filtered}
            activeSpot={activeSpot}
            onMarkerClick={(spot) => setActiveSpot(spot)}
            route={plan ? { stops: plan.orderedStops, polyline: plan.polyline } : null}
            friendSpots={friendSpots}
            flyToCoord={flyTo}
          />
        </div>

        {/* List */}
        <div className="lg:w-[420px] overflow-y-auto lg:h-[calc(100vh-120px)] p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="text-gray-400 text-sm">No spots match your filters</p>
              <button onClick={clearAllFilters} className="text-[#fe2c55] text-sm mt-2 hover:underline">
                Clear all filters
              </button>
            </div>
          ) : (
            filtered.map((spot) => (
              <div
                key={spot.savedId}
                ref={(el) => { listRefs.current[spot.savedId] = el; }}
                onClick={() => setActiveSpot(spot)}
                onDoubleClick={() => setModalSpot(spot)}
                className={`bg-gray-900 rounded-xl p-4 cursor-pointer transition-all border-2 ${
                  activeSpot?.savedId === spot.savedId
                    ? "border-[#fe2c55] shadow-lg shadow-red-500/10"
                    : "border-transparent hover:border-gray-700"
                }`}
              >
                {/* Top row: name + tried + remove */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{spot.restaurantName}</h3>
                      {spot.priceLevel && (
                        <span className="text-green-400 text-xs font-medium shrink-0">
                          {priceLabel(spot.priceLevel)}
                        </span>
                      )}
                      {spot.tried && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full shrink-0">
                          Tried
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">
                      {spot.cuisine} · {spot.location.neighborhood}
                    </p>
                    {spot.hours && (
                      <p className="text-gray-500 text-xs mt-0.5">🕐 {spot.hours}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSpot(spot.savedId); }}
                    className="text-gray-600 hover:text-red-400 text-sm shrink-0 ml-2"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(spot.savedId, spot.rating === star ? 0 : star)}
                      className={`text-sm transition-colors ${
                        star <= spot.rating ? "text-yellow-400" : "text-gray-700 hover:text-gray-500"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {spot.rating > 0 && (
                    <span className="text-gray-500 text-[10px] ml-1">{spot.rating}/5</span>
                  )}
                </div>

                {/* Dish chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {spot.dishes.map((d) => (
                    <span key={d} className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Collection badge */}
                {spot.collection && (
                  <div className="mt-2">
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      📁 {spot.collection}
                    </span>
                  </div>
                )}

                {spot.note && (
                  <p className="text-gray-400 text-xs mt-2 italic">📝 {spot.note}</p>
                )}

                {/* Action row */}
                <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTried(spot.savedId)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        spot.tried
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {spot.tried ? "✅ Tried" : "🎯 Want to Go"}
                    </button>
                    <button
                      onClick={() => openDirections(spot)}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-blue-400"
                    >
                      📍 Directions
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {spot.orderUrl && (
                      <a href={spot.orderUrl} target="_blank" rel="noopener noreferrer" className="text-[#fe2c55] text-xs hover:underline">
                        🛵 Order
                      </a>
                    )}
                    <button onClick={() => setModalSpot(spot)} className="text-gray-400 text-xs hover:text-white">
                      Details →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {modalSpot && (
        <SpotDetailModal spot={modalSpot} onClose={() => setModalSpot(null)} />
      )}

      {friendsOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[340px] z-40 shadow-2xl">
          <FriendsPanel onClose={() => setFriendsOpen(false)} />
        </div>
      )}

      {feedOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[340px] z-40 shadow-2xl">
          <DiscoveryFeed onPick={onPickFriendSpot} onClose={() => setFeedOpen(false)} />
        </div>
      )}

      {/* Plan panel */}
      {planOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] z-40 shadow-2xl">
          <PlanPanel
            spots={savedSpots}
            plan={plan}
            onPlan={setPlan}
            onClose={() => setPlanOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <SignInGate>
      <MapPageInner />
    </SignInGate>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-gray-500 text-[11px] uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipToggle({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-[#fe2c55] text-white"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
      }`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  );
}
