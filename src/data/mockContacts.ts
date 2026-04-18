export type MockMatchedFriend = {
  id: string;
  name: string;
  handle: string;
  color: string;
  phone: string;
  email: string;
  blurb: string;
};

export type MockInviteContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export const mockMatchedFriends: MockMatchedFriend[] = [
  {
    id: "contact-match-1",
    name: "Maya Patel",
    handle: "mayaeats",
    color: "#22c55e",
    phone: "(512) 555-0142",
    email: "maya.patel@gmail.com",
    blurb: "Usually saves late-night pasta and patio spots.",
  },
  {
    id: "contact-match-2",
    name: "Julian Park",
    handle: "julesafterdark",
    color: "#8b5cf6",
    phone: "(512) 555-0188",
    email: "julian.park@icloud.com",
    blurb: "More likely to send a taco crawl than a calendar invite.",
  },
  {
    id: "contact-match-3",
    name: "Cam Nguyen",
    handle: "camlovesbbq",
    color: "#f97316",
    phone: "(737) 555-0106",
    email: "cam.nguyen@gmail.com",
    blurb: "Has a running list of every brisket stop in Austin.",
  },
  {
    id: "contact-match-4",
    name: "Rina Shah",
    handle: "rinasnacks",
    color: "#06b6d4",
    phone: "(512) 555-0134",
    email: "rina.shah@yahoo.com",
    blurb: "Finds dessert spots before anyone else does.",
  },
  {
    id: "contact-match-5",
    name: "Leo Martinez",
    handle: "leotakesbites",
    color: "#ef4444",
    phone: "(512) 555-0199",
    email: "leo.martinez@gmail.com",
    blurb: "Mostly maps taco trucks and burger counters.",
  },
  {
    id: "contact-match-6",
    name: "Sofia Kim",
    handle: "sofiaseats",
    color: "#eab308",
    phone: "(737) 555-0175",
    email: "sofia.kim@me.com",
    blurb: "Date-night planner with strong East Austin opinions.",
  },
];

export const mockInviteContacts: MockInviteContact[] = [
  {
    id: "contact-invite-1",
    name: "Avery Johnson",
    phone: "(512) 555-0121",
    email: "avery.johnson@gmail.com",
  },
  {
    id: "contact-invite-2",
    name: "Priya Rao",
    phone: "(512) 555-0157",
    email: "priya.rao@outlook.com",
  },
  {
    id: "contact-invite-3",
    name: "Marcus Bell",
    phone: "(737) 555-0163",
    email: "marcus.bell@gmail.com",
  },
];

export const totalMockContactsImported =
  mockMatchedFriends.length + mockInviteContacts.length;
