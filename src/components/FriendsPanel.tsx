"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  mockInviteContacts,
  mockMatchedFriends,
  mockMayaSpots,
  totalMockContactsImported,
  type MockInviteContact,
  type MockMatchedFriend,
} from "@/data/mockContacts";
import { useFriendsStore, type FriendSpot } from "@/lib/friends-store";

const DEMO_AUTO_ACCEPT_HANDLE = "mayaeats";

export default function FriendsPanel({ onClose }: { onClose: () => void }) {
  const {
    me,
    friends,
    incoming,
    outgoing,
    sendRequest,
    acceptRequest,
    rejectRequest,
    addDemoFriendSpots,
  } = useFriendsStore();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactsImported, setContactsImported] = useState(false);
  const [importingContacts, setImportingContacts] = useState(false);
  const [requestedMatches, setRequestedMatches] = useState<Set<string>>(new Set());
  const [invitedContacts, setInvitedContacts] = useState<Set<string>>(new Set());
  const [demoAcceptedMatches, setDemoAcceptedMatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    const maya = mockMatchedFriends.find((f) => f.handle === DEMO_AUTO_ACCEPT_HANDLE);
    if (!maya) return;
    if (!demoAcceptedMatches.has(maya.id)) return;
    const spots: FriendSpot[] = mockMayaSpots.map((spot) => ({
      id: spot.id,
      owner: maya.id,
      name: spot.name,
      cuisine: spot.cuisine,
      lat: spot.lat,
      lng: spot.lng,
      neighborhood: spot.neighborhood,
      city: spot.city,
      dishes: spot.dishes,
      vibe_tags: spot.vibe_tags,
      price_tier: spot.price_tier,
      notes: spot.notes,
      website_url: spot.website_url,
      created_at: spot.created_at,
      ownerHandle: maya.handle,
      ownerColor: maya.color,
    }));
    addDemoFriendSpots(spots);
  }, [demoAcceptedMatches, addDemoFriendSpots]);

  const submit = async () => {
    const clean = handle.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await sendRequest(clean);
      toast.success(`Request sent to @${clean}`);
      setHandle("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("no such") ? "Handle not found" : msg);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: string, who: string) => {
    try {
      await acceptRequest(id);
      toast.success(`@${who} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const reject = async (id: string) => {
    try {
      await rejectRequest(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const importContacts = async () => {
    if (contactsImported || importingContacts) return;
    setImportingContacts(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setContactsImported(true);
    setImportingContacts(false);
    toast.success(
      `Imported ${totalMockContactsImported} contacts and found ${mockMatchedFriends.length} friends on FoodTok`,
    );
  };

  const requestMatchedFriend = (friend: MockMatchedFriend) => {
    if (
      requestedMatches.has(friend.id) ||
      demoAcceptedMatches.has(friend.id) ||
      isKnownProfile(friend.handle, friends, incoming, outgoing)
    ) {
      return;
    }
    if (friend.handle === DEMO_AUTO_ACCEPT_HANDLE) {
      setDemoAcceptedMatches((current) => {
        const next = new Set(current);
        next.add(friend.id);
        return next;
      });
      toast.success(`@${friend.handle} auto-accepted for the demo`);
      return;
    }
    setRequestedMatches((current) => {
      const next = new Set(current);
      next.add(friend.id);
      return next;
    });
    toast.success(`Request sent to @${friend.handle}`);
  };

  const inviteContact = (contact: MockInviteContact) => {
    if (invitedContacts.has(contact.id)) return;
    setInvitedContacts((current) => {
      const next = new Set(current);
      next.add(contact.id);
      return next;
    });
    toast.success(`Invite link prepared for ${contact.name}`);
  };

  const demoFriends = mockMatchedFriends.filter((friend) => demoAcceptedMatches.has(friend.id));
  const matchedPending = mockMatchedFriends.filter((friend) => requestedMatches.has(friend.id));
  const availableMatches = mockMatchedFriends.filter(
    (friend) => !requestedMatches.has(friend.id) && !demoAcceptedMatches.has(friend.id),
  );
  const allFriends = [
    ...friends.map((friend) => ({
      id: friend.id,
      handle: friend.handle,
      color: friend.color,
      isDemo: false,
    })),
    ...demoFriends.map((friend) => ({
      id: friend.id,
      handle: friend.handle,
      color: friend.color,
      isDemo: true,
    })),
  ];

  return (
    <div className="h-full bg-gray-950 text-white flex flex-col border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h2 className="font-bold text-base">Friends</h2>
          {me && (
            <p className="text-[11px] text-gray-400">
              you&apos;re{" "}
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: me.color }}
                />
                @{me.handle}
              </span>
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
          ×
        </button>
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/80 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Find Friends</p>
              <p className="mt-1 text-xs leading-snug text-gray-400">
                Import your contacts to find friends already on FoodTok, then invite the rest.
              </p>
            </div>
            <button
              onClick={importContacts}
              disabled={importingContacts || contactsImported}
              className="rounded-full bg-[#fe2c55] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e02650] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importingContacts ? "Importing..." : contactsImported ? "Imported" : "Import Contacts"}
            </button>
          </div>
          {contactsImported && (
            <p className="mt-3 text-[11px] text-gray-400">
              Imported {totalMockContactsImported} contacts. Found {mockMatchedFriends.length} people on
              FoodTok and {mockInviteContacts.length} to invite.
            </p>
          )}
        </div>

        <label className="text-xs text-gray-400 uppercase tracking-wide">Add by handle</label>
        <div className="flex gap-2 mt-1.5">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="friendhandle"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#fe2c55]"
          />
          <button
            onClick={submit}
            disabled={busy || !handle.trim()}
            className="bg-[#fe2c55] hover:bg-[#e02650] disabled:opacity-50 rounded-lg px-4 text-sm font-semibold"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {contactsImported && availableMatches.length > 0 && (
          <Section title={`Found from Contacts (${availableMatches.length})`}>
            {availableMatches.map((friend) => {
              const state = getRelationshipState(friend.handle, friends, incoming, outgoing);
              return (
                <ContactRow
                  key={friend.id}
                  color={friend.color}
                  name={friend.name}
                  subtitle={`@${friend.handle} · ${friend.phone}`}
                  detail={friend.blurb}
                  action={
                    state ? (
                      <StatusPill label={state} />
                    ) : (
                      <button
                        onClick={() => requestMatchedFriend(friend)}
                        className="rounded-full bg-[#fe2c55] px-3 py-1 text-xs font-semibold text-white hover:bg-[#e02650]"
                      >
                        Add
                      </button>
                    )
                  }
                />
              );
            })}
          </Section>
        )}

        {contactsImported && matchedPending.length > 0 && (
          <Section title={`Requested from Contacts (${matchedPending.length})`}>
            {matchedPending.map((friend) => (
              <ContactRow
                key={friend.id}
                color={friend.color}
                name={friend.name}
                subtitle={`@${friend.handle} · ${friend.email}`}
                detail="Friend request sent from imported contacts."
                action={<StatusPill label="requested" />}
              />
            ))}
          </Section>
        )}

        {contactsImported && mockInviteContacts.length > 0 && (
          <Section title={`Invite Contacts (${mockInviteContacts.length})`}>
            {mockInviteContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                color="#64748b"
                name={contact.name}
                subtitle={`${contact.phone} · ${contact.email}`}
                detail="Not on FoodTok yet."
                action={
                  invitedContacts.has(contact.id) ? (
                    <StatusPill label="invited" />
                  ) : (
                    <button
                      onClick={() => inviteContact(contact)}
                      className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
                    >
                      Invite
                    </button>
                  )
                }
              />
            ))}
          </Section>
        )}

        {incoming.length > 0 && (
          <Section title={`Incoming (${incoming.length})`}>
            {incoming.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Dot color={p.color} />
                <span className="flex-1 text-sm">@{p.handle}</span>
                <button
                  onClick={() => accept(p.id, p.handle)}
                  className="text-xs bg-green-600 hover:bg-green-500 rounded-full px-3 py-1"
                >
                  Accept
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </Section>
        )}

        {outgoing.length > 0 && (
          <Section title="Pending">
            {outgoing.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Dot color={p.color} />
                <span className="flex-1 text-sm text-gray-400">@{p.handle}</span>
                <span className="text-[10px] text-gray-500">sent</span>
              </div>
            ))}
          </Section>
        )}

        <Section title={`Friends (${allFriends.length})`}>
          {allFriends.length === 0 && (
            <p className="text-gray-500 text-xs">
              No friends yet. Import contacts or share your handle:{" "}
              <span className="text-white">@{me?.handle}</span>
            </p>
          )}
          {allFriends.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Dot color={p.color} />
              <span className="flex-1 text-sm">@{p.handle}</span>
              {p.isDemo && <StatusPill label="demo" />}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function ContactRow({
  color,
  name,
  subtitle,
  detail,
  action,
}: {
  color: string;
  name: string;
  subtitle: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-3">
      <Avatar color={color} name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-xs text-gray-400">{subtitle}</p>
        <p className="mt-1 text-[11px] leading-snug text-gray-500">{detail}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Avatar({ color, name }: { color: string; name: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-700 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-300">
      {label}
    </span>
  );
}

function getRelationshipState(
  handle: string,
  friends: { handle: string }[],
  incoming: { handle: string }[],
  outgoing: { handle: string }[],
) {
  if (friends.some((profile) => profile.handle === handle)) return "friends";
  if (handle === DEMO_AUTO_ACCEPT_HANDLE) return null;
  if (incoming.some((profile) => profile.handle === handle)) return "incoming";
  if (outgoing.some((profile) => profile.handle === handle)) return "pending";
  return null;
}

function isKnownProfile(
  handle: string,
  friends: { handle: string }[],
  incoming: { handle: string }[],
  outgoing: { handle: string }[],
) {
  return getRelationshipState(handle, friends, incoming, outgoing) !== null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
