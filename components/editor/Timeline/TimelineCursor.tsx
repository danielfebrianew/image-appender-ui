"use client";

import { secondsToPixels } from "@/lib/timeline-math";

export function TimelineCursor({
  currentTime,
  zoom,
}: {
  currentTime: number;
  zoom: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-[#f87171]"
      style={{ left: secondsToPixels(currentTime, zoom) + 56 }}
    >
      <div className="absolute -left-1.25 top-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-8 border-l-transparent border-r-transparent border-t-[#f87171]" />
    </div>
  );
}
