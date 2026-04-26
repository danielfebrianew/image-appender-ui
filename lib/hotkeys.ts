import type { ImageTrack } from "@/lib/types";
import { DEFAULT_IMAGE_DURATION } from "@/lib/timeline-math";

export function duplicateTrackAtEnd(track: ImageTrack, tracks: ImageTrack[]) {
  const latestEnd = tracks.reduce((max, item) => Math.max(max, item.endSec), 0);
  const duration = track.endSec - track.startSec || DEFAULT_IMAGE_DURATION;

  return {
    ...track,
    id: crypto.randomUUID(),
    startSec: latestEnd,
    endSec: latestEnd + duration,
  };
}

export function splitTrackAtTime(track: ImageTrack, currentTime: number) {
  if (currentTime <= track.startSec || currentTime >= track.endSec) {
    return null;
  }

  return {
    left: { ...track, endSec: currentTime },
    right: {
      ...track,
      id: crypto.randomUUID(),
      startSec: currentTime,
    },
  };
}
