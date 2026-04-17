"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { SavedSpot } from "@/lib/store";
import { FriendSpot } from "@/lib/friends-store";
import "leaflet/dist/leaflet.css";

function coloredPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "friend-pin",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

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

function numberedIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: "plan-numbered-marker",
    html: `<div style="background:#fe2c55;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FlyToSpot({ spot }: { spot: SavedSpot | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot) {
      map.flyTo([spot.location.lat, spot.location.lng], 13, { duration: 0.8 });
    }
  }, [spot, map]);
  return null;
}

function FlyToCoord({ coord }: { coord: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coord, 14, { duration: 0.8 });
  }, [coord, map]);
  return null;
}

function FitBounds({ coords, signature }: { coords: [number, number][]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
    // Refit only when the signature changes, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

type LatLng = [number, number];

interface MapViewProps {
  spots: SavedSpot[];
  activeSpot: SavedSpot | null;
  onMarkerClick: (spot: SavedSpot) => void;
  route?: {
    stops: SavedSpot[];
    polyline: LatLng[];
  } | null;
  friendSpots?: FriendSpot[];
  flyToCoord?: LatLng | null;
}

export default function MapView({ spots, activeSpot, onMarkerClick, route, friendSpots, flyToCoord }: MapViewProps) {
  const mappable = useMemo(
    () => spots.filter((s) => s.location.lat !== 0 || s.location.lng !== 0),
    [spots],
  );
  const hasRoute = !!(route && route.polyline.length >= 2);
  const routeIds = useMemo(
    () => new Set(route?.stops.map((s) => s.savedId) ?? []),
    [route],
  );

  const friendMappable = useMemo(
    () => (friendSpots ?? []).filter((s) => s.lat !== 0 || s.lng !== 0),
    [friendSpots],
  );

  const fitCoords: LatLng[] = hasRoute
    ? route!.polyline
    : [
        ...mappable.map((s) => [s.location.lat, s.location.lng] as LatLng),
        ...friendMappable.map((s) => [s.lat, s.lng] as LatLng),
      ];

  const fitSignature = hasRoute
    ? `route:${route!.stops.map((s) => s.savedId).join(",")}:${route!.polyline.length}`
    : `spots:${mappable.map((s) => s.savedId).join(",")}|friends:${friendMappable.map((s) => s.id).join(",")}`;

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
      <FitBounds coords={fitCoords} signature={fitSignature} />
      <FlyToSpot spot={activeSpot && (activeSpot.location.lat !== 0 || activeSpot.location.lng !== 0) ? activeSpot : null} />
      {flyToCoord && <FlyToCoord coord={flyToCoord} />}

      {friendMappable.map((sp) => (
        <Marker
          key={`friend-${sp.id}`}
          position={[sp.lat, sp.lng]}
          icon={coloredPinIcon(sp.ownerColor)}
          opacity={hasRoute ? 0.5 : 1}
        >
          <Popup>
            <strong>{sp.name}</strong>
            <br />
            <span style={{ color: sp.ownerColor }}>@{sp.ownerHandle}</span>
            {sp.dishes.length > 0 && <><br />{sp.dishes.join(", ")}</>}
          </Popup>
        </Marker>
      ))}

      {mappable
        .filter((s) => !routeIds.has(s.savedId))
        .map((spot) => (
          <Marker
            key={spot.savedId}
            position={[spot.location.lat, spot.location.lng]}
            icon={activeSpot?.savedId === spot.savedId ? activeIcon : new L.Icon.Default()}
            opacity={hasRoute ? 0.4 : 1}
            eventHandlers={{ click: () => onMarkerClick(spot) }}
          >
            <Popup>
              <strong>{spot.restaurantName}</strong>
              <br />
              {spot.dishes.join(", ")}
            </Popup>
          </Marker>
        ))}

      {hasRoute && (
        <>
          <Polyline positions={route!.polyline} pathOptions={{ color: "#fe2c55", weight: 4, opacity: 0.85 }} />
          {route!.stops.map((spot, i) => (
            <Marker
              key={`plan-${spot.savedId}`}
              position={[spot.location.lat, spot.location.lng]}
              icon={numberedIcon(i + 1)}
              eventHandlers={{ click: () => onMarkerClick(spot) }}
            >
              <Popup>
                <strong>
                  {i + 1}. {spot.restaurantName}
                </strong>
                <br />
                {spot.dishes.join(", ")}
              </Popup>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
