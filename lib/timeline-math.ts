import { clamp } from "@/lib/utils";

export const MIN_TRACK_DURATION = 0.2;
export const DEFAULT_IMAGE_DURATION = 3;
export const SNAP_SECONDS = 0.1;

export function secondsToPixels(seconds: number, zoom: number) {
  return seconds * zoom;
}

export function pixelsToSeconds(pixels: number, zoom: number) {
  return pixels / zoom;
}

export function snapTime(
  seconds: number,
  options: {
    precise?: boolean;
    playhead?: number;
    edges?: number[];
    zoom?: number;
  } = {},
) {
  if (options.precise) {
    return Math.max(0, seconds);
  }

  const zoom = options.zoom ?? 80;
  const candidates = [options.playhead, ...(options.edges ?? [])].filter(
    (value): value is number => typeof value === "number",
  );
  const magnetic = candidates.find(
    (candidate) => Math.abs(secondsToPixels(candidate - seconds, zoom)) <= 5,
  );

  if (typeof magnetic === "number") {
    return Math.max(0, magnetic);
  }

  return Math.max(0, Math.round(seconds / SNAP_SECONDS) * SNAP_SECONDS);
}

export function resolveCollisionStart(
  startSec: number,
  duration: number,
  ranges: Array<{ startSec: number; endSec: number }>,
) {
  let nextStart = startSec;
  const ordered = [...ranges].sort((a, b) => a.startSec - b.startSec);

  for (const range of ordered) {
    const nextEnd = nextStart + duration;
    const overlaps = nextStart < range.endSec && nextEnd > range.startSec;
    if (overlaps) {
      nextStart = range.endSec;
    }
  }

  return nextStart;
}

export function clampTrackBounds(
  startSec: number,
  endSec: number,
  duration: number,
) {
  const start = clamp(startSec, 0, Math.max(0, duration - MIN_TRACK_DURATION));
  const end = clamp(endSec, start + MIN_TRACK_DURATION, duration);

  return { startSec: start, endSec: end };
}
