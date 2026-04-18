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

export type MockFriendSpot = {
  id: string;
  name: string;
  cuisine: string;
  lat: number;
  lng: number;
  neighborhood: string;
  city: string;
  dishes: string[];
  vibe_tags: string[];
  price_tier: number;
  notes: string;
  website_url: string | null;
  created_at: string;
};

// Maya's saved spots — Austin, late-night pasta + patio leaning.
export const mockMayaSpots: MockFriendSpot[] = [
  {
    id: "demo-maya-spot-1",
    name: "L'Oca d'Oro",
    cuisine: "Italian",
    lat: 30.3006,
    lng: -97.7062,
    neighborhood: "Mueller",
    city: "Austin",
    dishes: ["Cacio e pepe", "Bucatini all'amatriciana"],
    vibe_tags: ["late-night", "date-night"],
    price_tier: 3,
    notes: "Sit at the bar after 9pm — half-price pasta specials.",
    website_url: "https://locadoroaustin.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "demo-maya-spot-2",
    name: "Juniper",
    cuisine: "Italian",
    lat: 30.2654,
    lng: -97.7217,
    neighborhood: "East Austin",
    city: "Austin",
    dishes: ["Agnolotti", "Burrata"],
    vibe_tags: ["patio", "date-night"],
    price_tier: 3,
    notes: "Patio is the move — ask for the back tables.",
    website_url: "https://juniperaustin.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "demo-maya-spot-3",
    name: "Contigo",
    cuisine: "American",
    lat: 30.298,
    lng: -97.6827,
    neighborhood: "East Austin",
    city: "Austin",
    dishes: ["Green beans", "Rabbit & dumplings"],
    vibe_tags: ["patio", "casual"],
    price_tier: 2,
    notes: "Huge patio, dog-friendly, stays open late on weekends.",
    website_url: "https://contigotexas.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 54).toISOString(),
  },
];
