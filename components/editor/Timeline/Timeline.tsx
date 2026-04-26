"use client";

import { useRef } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { MousePointer2 } from "lucide-react";
import {
  clampTrackBounds,
  pixelsToSeconds,
  snapTime,
} from "@/lib/timeline-math";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { TimelineRuler } from "@/components/editor/Timeline/TimelineRuler";
import { VideoTrack } from "@/components/editor/Timeline/VideoTrack";
import { ImageTrack } from "@/components/editor/Timeline/ImageTrack";
import { TimelineCursor } from "@/components/editor/Timeline/TimelineCursor";

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracks = useProjectStore((state) => state.tracks);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const duration = usePlaybackStore((state) => state.duration);
  const zoom = usePlaybackStore((state) => state.zoom);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const selectedTrackId = usePlaybackStore((state) => state.selectedTrackId);
  const selectTrack = usePlaybackStore((state) => state.selectTrack);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const edges = tracks.flatMap((track) => [track.startSec, track.endSec]);

  function handleDragEnd(event: DragEndEvent) {
    const track = tracks.find((item) => item.id === event.active.id);
    if (!track) return;

    const delta = pixelsToSeconds(event.delta.x, zoom);
    const length = track.endSec - track.startSec;
    const startSec = snapTime(track.startSec + delta, {
      playhead: currentTime,
      edges,
      zoom,
    });
    const bounds = clampTrackBounds(startSec, startSec + length, duration);
    updateTrack(track.id, bounds);
  }

  function startResize(
    trackId: string,
    edge: "left" | "right",
    event: React.PointerEvent,
  ) {
    event.stopPropagation();
    const track = tracks.find((item) => item.id === trackId);
    if (!track) return;

    const startX = event.clientX;
    const origin = { startSec: track.startSec, endSec: track.endSec };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const delta = pixelsToSeconds(moveEvent.clientX - startX, zoom);
      const precise = moveEvent.altKey;
      const next =
        edge === "left"
          ? {
              startSec: snapTime(origin.startSec + delta, {
                precise,
                playhead: currentTime,
                edges,
                zoom,
              }),
              endSec: origin.endSec,
            }
          : {
              startSec: origin.startSec,
              endSec: snapTime(origin.endSec + delta, {
                precise,
                playhead: currentTime,
                edges,
                zoom,
              }),
            };
      updateTrack(trackId, clampTrackBounds(next.startSec, next.endSec, duration), false);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const latest = useProjectStore.getState().tracks.find((item) => item.id === trackId);
      if (latest) {
        updateTrack(trackId, {
          startSec: latest.startSec,
          endSec: latest.endSec,
        });
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section className="relative h-47 border-t border-[#2a2a2a] bg-[#0d0d0d]">
      <div className="flex h-8 items-center border-b border-[#1f1f1f] px-3">
        <div className="text-[12px] font-semibold text-[#f0f0f0]">Timeline</div>
      </div>
      <div
        ref={containerRef}
        className="relative h-39 overflow-auto"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left + event.currentTarget.scrollLeft - 56;
          setCurrentTime(Math.max(0, pixelsToSeconds(x, zoom)));
          selectTrack(null);
        }}
      >
        <div
          className="relative min-h-full"
          style={{ width: Math.max(900, duration * zoom + 120) }}
        >
          <TimelineRuler duration={duration} zoom={zoom} />
          <VideoTrack duration={duration} zoom={zoom} />
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="relative h-16">
              <div className="absolute left-0 top-8 w-12 text-[11px] text-[#555]">
                Imgs
              </div>
              {tracks.length === 0 ? (
                <div className="absolute left-14 top-5 flex items-center gap-2 text-[12px] text-[#555]">
                  <MousePointer2 size={14} />
                  Press Ctrl+V to paste your first image
                </div>
              ) : (
                tracks.map((track) => (
                  <ImageTrack
                    key={track.id}
                    track={track}
                    zoom={zoom}
                    selected={selectedTrackId === track.id}
                    onSelect={() => selectTrack(track.id)}
                    onResizeStart={(edge, event) => startResize(track.id, edge, event)}
                  />
                ))
              )}
            </div>
          </DndContext>
          <TimelineCursor currentTime={currentTime} zoom={zoom} />
        </div>
      </div>
    </section>
  );
}
