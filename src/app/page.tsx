"use client";

import VideoCard from "@/components/VideoCard";
import { mockVideos } from "@/data/mockVideos";

export default function FeedPage() {
  return (
    <div className="h-screen bg-black overflow-y-auto snap-y snap-mandatory">
      {mockVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
