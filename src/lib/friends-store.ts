"use client";

import { create } from "zustand";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, Profile, RemoteSpot, FriendRequest } from "./supabase";
import { getOrSignInAnon, getProfile, createProfile } from "./session";

export interface FriendSpot extends RemoteSpot {
  ownerHandle: string;
  ownerColor: string;
}

interface FriendsStore {
  me: Profile | null;
  needsHandle: boolean;
  friends: Profile[];
  spots: FriendSpot[];
  incoming: Profile[];
  outgoing: Profile[];
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  claimHandle: (handle: string, color: string) => Promise<void>;
  sendRequest: (handle: string) => Promise<void>;
  acceptRequest: (fromId: string) => Promise<void>;
  rejectRequest: (fromId: string) => Promise<void>;
  publishSpot: (input: Omit<RemoteSpot, "id" | "owner" | "created_at">) => Promise<void>;
  unpublishSpot: (id: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  me: null,
  needsHandle: false,
  friends: [],
  spots: [],
  incoming: [],
  outgoing: [],
  loading: false,
  error: null,

  init: async () => {
    if (get().loading || get().me) return;
    set({ loading: true, error: null });
    try {
      const userId = await getOrSignInAnon();
      const profile = await getProfile(userId);
      if (!profile) {
        set({ needsHandle: true, loading: false });
        return;
      }
      set({ me: profile, needsHandle: false });
      await hydrate();
      await subscribeRealtime();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ loading: false });
    }
  },

  claimHandle: async (handle, color) => {
    set({ loading: true, error: null });
    try {
      const userId = await getOrSignInAnon();
      const me = await createProfile(userId, handle.trim(), color);
      set({ me, needsHandle: false });
      await hydrate();
      await subscribeRealtime();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  sendRequest: async (handle: string) => {
    const { error } = await supabase().rpc("send_friend_request", {
      other_handle: handle.trim(),
    });
    if (error) throw error;
    await hydrate();
  },

  acceptRequest: async (fromId: string) => {
    const { error } = await supabase().rpc("accept_friend_request", { other_id: fromId });
    if (error) throw error;
    await hydrate();
  },

  rejectRequest: async (fromId: string) => {
    const me = get().me;
    if (!me) return;
    const { error } = await supabase()
      .from("friend_requests")
      .delete()
      .eq("from_id", fromId)
      .eq("to_id", me.id);
    if (error) throw error;
    await hydrate();
  },

  publishSpot: async (input) => {
    const me = get().me;
    if (!me) return;
    const { error } = await supabase()
      .from("spots")
      .insert({ ...input, owner: me.id });
    if (error) throw error;
  },

  unpublishSpot: async (id: string) => {
    const { error } = await supabase().from("spots").delete().eq("id", id);
    if (error) throw error;
  },
}));

async function hydrate() {
  const s = supabase();
  const me = useFriendsStore.getState().me;
  if (!me) return;

  // Friends: rows in friendships where a = me; resolve "b" to profiles
  const { data: friendRows } = await s
    .from("friendships")
    .select("b")
    .eq("a", me.id);
  const friendIds = (friendRows ?? []).map((r: { b: string }) => r.b);

  const { data: friends } = friendIds.length
    ? await s.from("profiles").select("id,handle,color").in("id", friendIds)
    : { data: [] as Profile[] };

  // Friend requests, split by direction
  const { data: reqs } = await s
    .from("friend_requests")
    .select("from_id,to_id,created_at")
    .or(`from_id.eq.${me.id},to_id.eq.${me.id}`);

  const reqList = (reqs ?? []) as FriendRequest[];
  const incomingIds = reqList.filter((r) => r.to_id === me.id).map((r) => r.from_id);
  const outgoingIds = reqList.filter((r) => r.from_id === me.id).map((r) => r.to_id);
  const allReqIds = [...new Set([...incomingIds, ...outgoingIds])];
  const { data: reqProfiles } = allReqIds.length
    ? await s.from("profiles").select("id,handle,color").in("id", allReqIds)
    : { data: [] as Profile[] };
  const profMap = new Map((reqProfiles ?? []).map((p) => [p.id, p as Profile]));
  const incoming = incomingIds.map((id) => profMap.get(id)).filter(Boolean) as Profile[];
  const outgoing = outgoingIds.map((id) => profMap.get(id)).filter(Boolean) as Profile[];

  // Spots: RLS filters to self + friends automatically
  const { data: spotRows } = await s
    .from("spots")
    .select("*")
    .order("created_at", { ascending: false });

  const ownerMap = new Map<string, Profile>([[me.id, me]]);
  (friends ?? []).forEach((f) => ownerMap.set(f.id, f as Profile));

  const spots: FriendSpot[] = (spotRows ?? []).map((row: RemoteSpot) => {
    const owner = ownerMap.get(row.owner);
    return {
      ...row,
      ownerHandle: owner?.handle ?? "unknown",
      ownerColor: owner?.color ?? "#888",
    };
  });

  useFriendsStore.setState({
    friends: (friends ?? []) as Profile[],
    incoming,
    outgoing,
    spots,
  });
}

let channel: RealtimeChannel | null = null;

async function disposeRealtime() {
  if (channel) {
    await supabase().removeChannel(channel);
    channel = null;
  }
}

async function subscribeRealtime() {
  await disposeRealtime();
  const s = supabase();
  channel = s
    .channel("friends-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "spots" },
      (payload) => applySpotChange(payload as RealtimePostgresChangesPayload<RemoteSpot>),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => hydrate())
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => hydrate())
    .subscribe();
}

function applySpotChange(payload: RealtimePostgresChangesPayload<RemoteSpot>) {
  const state = useFriendsStore.getState();
  const ownerMap = new Map<string, Profile>();
  if (state.me) ownerMap.set(state.me.id, state.me);
  state.friends.forEach((f) => ownerMap.set(f.id, f));

  const decorate = (row: RemoteSpot): FriendSpot => {
    const owner = ownerMap.get(row.owner);
    // Unknown owner = a friend-request just accepted whose profile isn't in our map yet.
    // Fall back to a full hydrate so we pick up the profile.
    if (!owner) {
      hydrate();
    }
    return {
      ...row,
      ownerHandle: owner?.handle ?? "unknown",
      ownerColor: owner?.color ?? "#888",
    };
  };

  if (payload.eventType === "INSERT" && payload.new) {
    const next = decorate(payload.new as RemoteSpot);
    useFriendsStore.setState({
      spots: [next, ...state.spots.filter((s) => s.id !== next.id)],
    });
  } else if (payload.eventType === "UPDATE" && payload.new) {
    const next = decorate(payload.new as RemoteSpot);
    useFriendsStore.setState({
      spots: state.spots.map((s) => (s.id === next.id ? next : s)),
    });
  } else if (payload.eventType === "DELETE" && payload.old) {
    const oldId = (payload.old as Partial<RemoteSpot>).id;
    if (!oldId) return;
    useFriendsStore.setState({
      spots: state.spots.filter((s) => s.id !== oldId),
    });
  }
}
