"use client";

import { supabase, Profile } from "./supabase";

const COLOR_POOL = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function randomColor() {
  return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
}

export async function getOrSignInAnon(): Promise<string> {
  const s = supabase();
  const { data } = await s.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  const { data: signed, error } = await s.auth.signInAnonymously();
  if (error) throw error;
  if (!signed.user) throw new Error("anonymous sign-in returned no user");
  return signed.user.id;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase()
    .from("profiles")
    .select("id,handle,color")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function createProfile(userId: string, handle: string, color: string): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .insert({ id: userId, handle, color })
    .select("id,handle,color")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfileColor(userId: string, color: string) {
  const { error } = await supabase().from("profiles").update({ color }).eq("id", userId);
  if (error) throw error;
}
