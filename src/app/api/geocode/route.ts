import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "food-map-demo/1.0 (educational)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `geocoder ${res.status}` }, { status: 502 });
    }
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: { suburb?: string; neighbourhood?: string; city?: string; town?: string; village?: string };
    }>;
    if (results.length === 0) {
      return NextResponse.json({ found: false });
    }
    const r = results[0];
    return NextResponse.json({
      found: true,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
      neighborhood: r.address?.neighbourhood ?? r.address?.suburb ?? "",
      city: r.address?.city ?? r.address?.town ?? r.address?.village ?? "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
