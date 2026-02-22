"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { SavedSpot } from "@/lib/store";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Next.js/webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const activeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToSpot({ spot }: { spot: SavedSpot | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot) {
      map.flyTo([spot.location.lat, spot.location.lng], 13, { duration: 0.8 });
    }
  }, [spot, map]);
  return null;
}

function FitBounds({ spots }: { spots: SavedSpot[] }) {
  const map = useMap();
  useEffect(() => {
    if (spots.length > 0) {
      const bounds = L.latLngBounds(
        spots.map((s) => [s.location.lat, s.location.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [spots, map]);
  return null;
}

interface MapViewProps {
  spots: SavedSpot[];
  activeSpot: SavedSpot | null;
  onMarkerClick: (spot: SavedSpot) => void;
}

export default function MapView({ spots, activeSpot, onMarkerClick }: MapViewProps) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      className="w-full h-full rounded-xl"
      style={{ minHeight: "300px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds spots={spots} />
      <FlyToSpot spot={activeSpot} />
      {spots.map((spot) => (
        <Marker
          key={spot.savedId}
          position={[spot.location.lat, spot.location.lng]}
          icon={activeSpot?.savedId === spot.savedId ? activeIcon : new L.Icon.Default()}
          eventHandlers={{ click: () => onMarkerClick(spot) }}
        >
          <Popup>
            <strong>{spot.restaurantName}</strong>
            <br />
            {spot.dishes.join(", ")}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
