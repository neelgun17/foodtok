export interface DemoCaptureImage {
  url: string;
  filename: string;
  mediaType: "image/jpeg" | "image/webp";
}

export interface DemoCaptureSet {
  id: string;
  title: string;
  description: string;
  images: DemoCaptureImage[];
}

export const demoCaptureSets: DemoCaptureSet[] = [
  {
    id: "franklin-bbq",
    title: "Franklin Barbecue",
    description: "Use 3 real photos so you can demo Gemini extraction without taking new shots live.",
    images: [
      {
        url: "/demo-capture/franklin/storefront-line.jpg",
        filename: "franklin-storefront-line.jpg",
        mediaType: "image/jpeg",
      },
      {
        url: "/demo-capture/franklin/storefront-open.jpg",
        filename: "franklin-storefront-open.jpg",
        mediaType: "image/jpeg",
      },
      {
        url: "/demo-capture/franklin/plate.webp",
        filename: "franklin-plate.webp",
        mediaType: "image/webp",
      },
    ],
  },
];
