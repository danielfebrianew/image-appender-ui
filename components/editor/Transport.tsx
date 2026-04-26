"use client";

import { useMemo } from "react";
import { Pause, Play, SkipBack, SkipForward, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { MIN_TRACK_DURATION } from "@/lib/timeline-math";
import { clamp, formatTime } from "@/lib/utils";

function NumberField({
  label,
  value,
  step,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-[#888]">
      {label}
      <input
        type="number"
        value={Number(value.toFixed(2))}
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onCommit(clamp(next, min, max));
        }}
        className="h-7 w-16 rounded-md border border-[#2a2a2a] bg-[#161616] px-1.5 text-center font-mono text-[12px] text-[#f0f0f0] outline-none focus:border-[#7c3aed]"
      />
    </label>
  );
}

export function Transport() {
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const duration = usePlaybackStore((state) => state.duration);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const zoom = usePlaybackStore((state) => state.zoom);
  const selectedTrackId = usePlaybackStore((state) => state.selectedTrackId);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const togglePlayback = usePlaybackStore((state) => state.togglePlayback);
  const setZoom = usePlaybackStore((state) => state.setZoom);
  const tracks = useProjectStore((state) => state.tracks);
  const updateTrack = useProjectStore((state) => state.updateTrack);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, tracks],
  );

  return (
    <div className="flex h-12 shrink-0 items-center justify-center gap-2 border-t border-[#2a2a2a] bg-[#111] px-4">
      <Button size="icon" variant="ghost" onClick={() => setCurrentTime(0)} title="Go to start">
        <SkipBack size={16} />
      </Button>
      <Button size="icon" onClick={togglePlayback} title="Play/pause">
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setCurrentTime(duration)} title="Go to end">
        <SkipForward size={16} />
      </Button>
      <div className="min-w-37.5 text-center font-mono text-[12px] text-[#888]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <Button size="icon" variant="ghost" onClick={() => setZoom(zoom - 12)} title="Zoom out">
        <ZoomOut size={15} />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setZoom(zoom + 12)} title="Zoom in">
        <ZoomIn size={15} />
      </Button>
      {selectedTrack && (
        <div className="ml-2 flex items-center gap-2 border-l border-[#2a2a2a] pl-3">
          <NumberField
            label="Start"
            value={selectedTrack.startSec}
            step={0.1}
            min={0}
            max={Math.max(0, selectedTrack.endSec - MIN_TRACK_DURATION)}
            onCommit={(next) =>
              updateTrack(selectedTrack.id, { startSec: Math.min(next, selectedTrack.endSec - MIN_TRACK_DURATION) })
            }
          />
          <NumberField
            label="End"
            value={selectedTrack.endSec}
            step={0.1}
            min={selectedTrack.startSec + MIN_TRACK_DURATION}
            max={duration || selectedTrack.endSec}
            onCommit={(next) =>
              updateTrack(selectedTrack.id, { endSec: Math.max(next, selectedTrack.startSec + MIN_TRACK_DURATION) })
            }
          />
          <NumberField
            label="Dur"
            value={selectedTrack.endSec - selectedTrack.startSec}
            step={0.1}
            min={MIN_TRACK_DURATION}
            max={Math.max(MIN_TRACK_DURATION, (duration || selectedTrack.endSec) - selectedTrack.startSec)}
            onCommit={(next) =>
              updateTrack(selectedTrack.id, {
                endSec: Math.min(selectedTrack.startSec + next, duration || selectedTrack.startSec + next),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
