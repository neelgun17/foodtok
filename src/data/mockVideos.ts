export interface RestaurantVideo {
  id: string;
  restaurantName: string;
  cuisine: string;
  dishes: string[];
  caption: string;
  videoUrl: string;
  tiktokId: string;
  location: {
    lat: number;
    lng: number;
    neighborhood: string;
    city: string;
  };
  thumbnail: string;
  hours?: string;
  priceLevel?: 1 | 2 | 3;
  websiteUrl?: string;
  orderUrl?: string;
}

export const mockVideos: RestaurantVideo[] = [
  {
    id: "v1",
    restaurantName: "Franklin Barbecue",
    cuisine: "BBQ",
    dishes: ["Brisket", "Pulled Pork", "Banana Pudding"],
    caption: "Waited 4 hours in line and would do it again tomorrow",
    videoUrl: "https://www.tiktok.com/@waynedang/video/7282837935416724779",
    tiktokId: "7282837935416724779",
    location: { lat: 30.2702, lng: -97.7312, neighborhood: "East Austin", city: "Austin" },
    thumbnail: "🥩",
    hours: "11am–3pm",
    priceLevel: 2,
    websiteUrl: "https://franklinbbq.com/",
    orderUrl: "https://preorder.franklinbbq.com/",
  },
  {
    id: "v2",
    restaurantName: "Ramen Del Barrio",
    cuisine: "Ramen",
    dishes: ["Tonkotsu Ramen", "Birria Ramen", "Takoyaki"],
    caption: "Austin's best ramen spot and it's not even close",
    videoUrl: "https://www.tiktok.com/@larabuchar/video/7443600755925290296",
    tiktokId: "7443600755925290296",
    location: { lat: 30.2580, lng: -97.7238, neighborhood: "East Cesar Chavez", city: "Austin" },
    thumbnail: "🍜",
    hours: "11am–9pm",
    priceLevel: 2,
    websiteUrl: "https://www.ramendelbarrio.com/",
    orderUrl: "https://www.doordash.com/store/ramen-del-barrio-32846661/",
  },
  {
    id: "v3",
    restaurantName: "Tacos Las Amazonas",
    cuisine: "Mexican",
    dishes: ["Al Pastor Tacos", "Birria Tacos", "Quesabirria"],
    caption: "The al pastor here is unreal, best tacos in Austin hands down",
    videoUrl: "https://www.tiktok.com/@thehungrylonghorn/video/7359265686247542058",
    tiktokId: "7359265686247542058",
    location: { lat: 30.3177, lng: -97.7036, neighborhood: "North Austin", city: "Austin" },
    thumbnail: "🌮",
    hours: "7am–3am",
    priceLevel: 1,
    orderUrl: "https://www.ubereats.com/store/tacos-las-amazonas-estilo-jalisco-1/cBYGu6G2Uhyt7BXqqJ0VIw",
  },
  {
    id: "v4",
    restaurantName: "Terry Black's BBQ",
    cuisine: "BBQ",
    dishes: ["Beef Rib", "Brisket", "Mac & Cheese"],
    caption: "The beef rib at Terry Black's is an absolute unit",
    videoUrl: "https://www.tiktok.com/@how.kev.eats/video/7499282658552253738",
    tiktokId: "7499282658552253738",
    location: { lat: 30.2531, lng: -97.7545, neighborhood: "South Congress", city: "Austin" },
    thumbnail: "🍖",
    hours: "11am–9pm",
    priceLevel: 2,
    websiteUrl: "https://terryblacksbbq.com/",
    orderUrl: "https://www.ubereats.com/store/terry-blacks-barbecue-austins/I3Ay2HDYVcqwqm1uqWGBlQ",
  },
  {
    id: "v5",
    restaurantName: "Basil Thai",
    cuisine: "Thai",
    dishes: ["Pad Kra Pao", "Green Curry", "Thai Tea"],
    caption: "This tiny Thai spot in Austin is absolutely incredible",
    videoUrl: "https://www.tiktok.com/@512bites/video/7518889538270334239",
    tiktokId: "7518889538270334239",
    location: { lat: 30.3450, lng: -97.7394, neighborhood: "North Loop", city: "Austin" },
    thumbnail: "🍛",
    hours: "11am–9:30pm",
    priceLevel: 1,
    websiteUrl: "https://basilthaiatx.com/",
    orderUrl: "https://www.ubereats.com/store/basil-thai/pKjXQoCFSdKcsvFZmrGhSw",
  },
  {
    id: "v6",
    restaurantName: "Taqueria 10 de 10",
    cuisine: "Mexican",
    dishes: ["Tacos de Suadero", "Gorditas", "Elote"],
    caption: "Hidden gem taqueria that locals don't want you to know about",
    videoUrl: "https://www.tiktok.com/@how.kev.eats/video/7305863355577715998",
    tiktokId: "7305863355577715998",
    location: { lat: 30.2364, lng: -97.7632, neighborhood: "South Lamar", city: "Austin" },
    thumbnail: "🌮",
    hours: "8am–12am",
    priceLevel: 1,
    websiteUrl: "https://taqueria1010.toast.site/",
    orderUrl: "https://www.ubereats.com/store/taqueria-de-diez/rihL2V5BXcOMd3cLIvxydg",
  },
  {
    id: "v7",
    restaurantName: "Reunion Pizzeria",
    cuisine: "Pizza",
    dishes: ["Margherita Pizza", "Pepperoni", "Tiramisu"],
    caption: "Austin finally has world-class Neapolitan pizza",
    videoUrl: "https://www.tiktok.com/@thedaviddouglass/video/7319307725224037674",
    tiktokId: "7319307725224037674",
    location: { lat: 30.2672, lng: -97.7431, neighborhood: "Downtown", city: "Austin" },
    thumbnail: "🍕",
    hours: "11am–10pm",
    priceLevel: 2,
    orderUrl: "https://www.ubereats.com/store/reunion-pizza-730-shady-lane/Va_lCbJqX4eErHvE3AKLcg",
  },
  {
    id: "v8",
    restaurantName: "Suerte",
    cuisine: "Fine Dining",
    dishes: ["Suerte Tacos", "Bone Marrow", "Masa Fries"],
    caption: "Fine dining meets Mexican comfort food and it works perfectly",
    videoUrl: "https://www.tiktok.com/@diegoojedaatx/video/7357885677742132526",
    tiktokId: "7357885677742132526",
    location: { lat: 30.2596, lng: -97.7186, neighborhood: "East Austin", city: "Austin" },
    thumbnail: "🌮",
    hours: "5pm–10pm",
    priceLevel: 3,
    websiteUrl: "https://www.suerteatx.com/",
  },
];
