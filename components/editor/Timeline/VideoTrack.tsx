"use client";

import { secondsToPixels } from "@/lib/timeline-math";

export function VideoTrack({
  duration,
  zoom,
}: {
  duration: number;
  zoom: number;
}) {
  return (
    <div className="relative h-9 border-b border-[#222]">
      <div className="absolute left-0 top-2 w-12 text-[11px] text-[#555]">
        Video
      </div>
      <div
        className="absolute left-14 top-2 h-5 rounded-sm bg-[#333]"
        style={{ width: secondsToPixels(duration, zoom) }}
      />
    </div>
  );
}
