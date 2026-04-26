"use client";

import { memo, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Film } from "lucide-react";
import type { VideoClipTrack as VideoClipTrackType } from "@/lib/types";
import { secondsToPixels } from "@/lib/timeline-math";
import { cn } from "@/lib/utils";

export const VideoClipTrack = memo(function VideoClipTrack({
  track,
  zoom,
  selected,
  onSelect,
  onResizeStart,
}: {
  track: VideoClipTrackType;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onResizeStart: (edge: "left" | "right", event: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: track.id, data: { track } });
  const style = useMemo(
    () => ({
      left: secondsToPixels(track.startSec, zoom) + 56,
      width: secondsToPixels(track.endSec - track.startSec, zoom),
      transform: transform ? `translate3d(${transform.x}px,0,0)` : undefined,
    }),
    [track.endSec, track.startSec, transform, zoom],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute top-7 z-10 flex h-9 cursor-grab items-center overflow-hidden rounded border bg-[#0f2032] text-left shadow-sm transition-colors duration-100 active:cursor-grabbing",
        selected ? "border-[#60a5fa]" : "border-[#2563eb]",
        isDragging && "opacity-70",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      {...listeners}
      {...attributes}
    >
      <button
        className="absolute left-0 top-0 z-20 h-full w-2 cursor-ew-resize bg-white/10 hover:bg-white/25"
        onPointerDown={(event) => onResizeStart("left", event)}
        aria-label="Resize left edge"
      />
      <div className="flex h-full w-9 shrink-0 items-center justify-center bg-[#1e3a5f]">
        <Film size={14} className="text-[#93c5fd]" />
      </div>
      <span className="min-w-0 truncate px-2 text-[12px] text-[#bfdbfe]">
        {track.videoName}
      </span>
      <button
        className="absolute right-0 top-0 z-20 h-full w-2 cursor-ew-resize bg-white/10 hover:bg-white/25"
        onPointerDown={(event) => onResizeStart("right", event)}
        aria-label="Resize right edge"
      />
    </div>
  );
});
