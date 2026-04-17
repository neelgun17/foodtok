"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export type Profile = {
  id: string;
  handle: string;
  color: string;
};

export type RemoteSpot = {
  id: string;
  owner: string;
  name: string;
  cuisine: string | null;
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string | null;
  dishes: string[];
  vibe_tags: string[];
  price_tier: number | null;
  notes: string | null;
  website_url: string | null;
  created_at: string;
};

export type FriendRequest = {
  from_id: string;
  to_id: string;
  created_at: string;
};
