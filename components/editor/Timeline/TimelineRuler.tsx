"use client";

import { memo } from "react";
import { secondsToPixels } from "@/lib/timeline-math";
import { formatTime } from "@/lib/utils";

export const TimelineRuler = memo(function TimelineRuler({
  duration,
  zoom,
}: {
  duration: number;
  zoom: number;
}) {
  const step = zoom > 120 ? 5 : 15;
  const markers = Array.from(
    { length: Math.floor(duration / step) + 1 },
    (_, index) => index * step,
  );

  return (
    <div className="relative h-7 border-b border-[#262626]">
      {markers.map((time) => (
        <div
          key={time}
          className="absolute top-0 h-full border-l border-[#333] pl-1 pt-1 font-mono text-[11px] text-[#555]"
          style={{ left: secondsToPixels(time, zoom) }}
        >
          {formatTime(time).replace(".0", "")}
        </div>
      ))}
    </div>
  );
});
