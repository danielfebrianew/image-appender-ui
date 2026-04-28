"use client";

import { create } from "zustand";
import type {
  ClickConfig,
  Command,
  Cover,
  LayoutConfig,
  LogLine,
  Project,
  ProjectImage,
  ProjectVideo,
  RenderStatus,
  SaveStatus,
  Track,
  TrackPatch,
  VideoMeta,
} from "@/lib/types";

type ProjectState = {
  projectId: string;
  name: string;
  videoMeta: VideoMeta;
  layout: LayoutConfig;
  clickSound: ClickConfig;
  tracks: Track[];
  images: ProjectImage[];
  videos: ProjectVideo[];
  cover: Cover | null;
  saveStatus: SaveStatus;
  lastError: string | null;
  undoStack: Command[];
  redoStack: Command[];
  hydrate(project: Project): void;
  setSaveStatus(status: SaveStatus): void;
  markError(message: string): void;
  setName(name: string): void;
  updateLayout(patch: Partial<LayoutConfig>): void;
  updateClickSound(patch: Partial<ClickConfig>): void;
  setVideoMeta(meta: VideoMeta): void;
  addImage(image: ProjectImage): void;
  removeImage(id: string): void;
  setVideos(videos: ProjectVideo[]): void;
  addVideo(video: ProjectVideo): void;
  removeVideo(id: string): void;
  setCover(cover: Cover | null): void;
  addTrack(track: Track, record?: boolean): void;
  updateTrack(id: string, patch: TrackPatch, record?: boolean): void;
  removeTrack(id: string, record?: boolean): void;
  reorderTracks(ids: string[]): void;
  undo(): void;
  redo(): void;
  reset(): void;
};

const blankVideo: VideoMeta = {
  url: "",
  duration: 0,
  width: 1080,
  height: 1920,
  fps: 30,
};

const defaultLayout: LayoutConfig = {
  aspectRatio: "9:16",
  imageFit: "cover",
  overlayHeightPct: 30,
  backgroundColor: "#111111",
};

const defaultClick: ClickConfig = {
  enabled: true,
  volume: 0.6,
  asset: "default-click",
};

function toProject(state: ProjectState): Project {
  return {
    projectId: state.projectId,
    name: state.name,
    videoMeta: state.videoMeta,
    layout: state.layout,
    clickSound: state.clickSound,
    tracks: state.tracks,
    images: state.images,
    videos: state.videos,
    cover: state.cover,
  };
}

function reverseCommand(command: Command): Command {
  if (command.type === "add_track") {
    return { type: "remove_track", track: command.track, index: -1 };
  }
  if (command.type === "remove_track") {
    return { type: "add_track", track: command.track };
  }
  return {
    type: "update_track",
    id: command.id,
    before: command.after,
    after: command.before,
  };
}

function applyCommand(
  state: Pick<ProjectState, "tracks">,
  command: Command,
): Track[] {
  if (command.type === "add_track") {
    return [...state.tracks, command.track];
  }

  if (command.type === "remove_track") {
    return state.tracks.filter((track) => track.id !== command.track.id);
  }

  return state.tracks.map((track) =>
    track.id === command.id ? { ...track, ...command.after } : track,
  );
}

function pushCommand(stack: Command[], command: Command) {
  return [...stack, command].slice(-50);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: "",
  name: "",
  videoMeta: blankVideo,
  layout: defaultLayout,
  clickSound: defaultClick,
  tracks: [],
  images: [],
  videos: [],
  cover: null,
  saveStatus: "idle",
  lastError: null,
  undoStack: [],
  redoStack: [],
  hydrate(project) {
    set({
      ...project,
      saveStatus: "idle",
      lastError: null,
      undoStack: [],
      redoStack: [],
    });
  },
  setSaveStatus(saveStatus) {
    set({ saveStatus });
  },
  markError(message) {
    set({ lastError: message, saveStatus: "error" });
  },
  setName(name) {
    set({ name, saveStatus: "dirty" });
  },
  updateLayout(patch) {
    set((state) => ({
      layout: { ...state.layout, ...patch },
      saveStatus: "dirty",
    }));
  },
  updateClickSound(patch) {
    set((state) => ({
      clickSound: { ...state.clickSound, ...patch },
      saveStatus: "dirty",
    }));
  },
  setVideoMeta(meta) {
    set({ videoMeta: meta, saveStatus: "dirty" });
  },
  addImage(image) {
    set((state) => ({
      images: state.images.some((item) => item.id === image.id)
        ? state.images
        : [image, ...state.images],
      saveStatus: "dirty",
    }));
  },
  removeImage(id) {
    set((state) => ({
      images: state.images.filter((image) => image.id !== id),
      tracks: state.tracks.filter((track) => track.kind !== "image" || track.imageId !== id),
      saveStatus: "dirty",
    }));
  },
  setVideos(videos) {
    set({ videos });
  },
  addVideo(video) {
    set((state) => ({
      videos: state.videos.some((v) => v.id === video.id)
        ? state.videos
        : [video, ...state.videos],
    }));
  },
  removeVideo(id) {
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
      tracks: state.tracks.filter((t) => t.kind !== "video" || t.videoId !== id),
    }));
  },
  setCover(cover) {
    set({ cover });
  },
  addTrack(track, record = true) {
    set((state) => ({
      tracks: [...state.tracks, track],
      undoStack: record
        ? pushCommand(state.undoStack, { type: "add_track", track })
        : state.undoStack,
      redoStack: record ? [] : state.redoStack,
      saveStatus: "dirty",
    }));
  },
  updateTrack(id, patch, record = true) {
    const beforeTrack = get().tracks.find((track) => track.id === id);
    if (!beforeTrack) return;

    const before = Object.fromEntries(
      Object.keys(patch).map((key) => [
        key,
        beforeTrack[key as keyof Track],
      ]),
    ) as TrackPatch;

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, ...patch } : track,
      ),
      undoStack: record
        ? pushCommand(state.undoStack, {
            type: "update_track",
            id,
            before,
            after: patch,
          })
        : state.undoStack,
      redoStack: record ? [] : state.redoStack,
      saveStatus: "dirty",
    }));
  },
  removeTrack(id, record = true) {
    const index = get().tracks.findIndex((track) => track.id === id);
    const track = get().tracks[index];
    if (!track) return;

    set((state) => ({
      tracks: state.tracks.filter((item) => item.id !== id),
      undoStack: record
        ? pushCommand(state.undoStack, { type: "remove_track", track, index })
        : state.undoStack,
      redoStack: record ? [] : state.redoStack,
      saveStatus: "dirty",
    }));
  },
  reorderTracks(ids) {
    set((state) => ({
      tracks: ids
        .map((id) => state.tracks.find((track) => track.id === id))
        .filter((track): track is Track => Boolean(track)),
      saveStatus: "dirty",
    }));
  },
  undo() {
    const command = get().undoStack.at(-1);
    if (!command) return;

    set((state) => ({
      tracks: applyCommand(state, reverseCommand(command)),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: pushCommand(state.redoStack, command),
      saveStatus: "dirty",
    }));
  },
  redo() {
    const command = get().redoStack.at(-1);
    if (!command) return;

    set((state) => ({
      tracks: applyCommand(state, command),
      undoStack: pushCommand(state.undoStack, command),
      redoStack: state.redoStack.slice(0, -1),
      saveStatus: "dirty",
    }));
  },
  reset() {
    set({
      videoMeta: blankVideo,
      tracks: [],
      images: [],
      cover: null,
      saveStatus: "idle",
      lastError: null,
      undoStack: [],
      redoStack: [],
    });
  },
}));

type PlaybackState = {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  zoom: number;
  selectedTrackId: string | null;
  setCurrentTime(currentTime: number): void;
  seek(delta: number): void;
  setIsPlaying(isPlaying: boolean): void;
  togglePlayback(): void;
  setDuration(duration: number): void;
  setZoom(zoom: number): void;
  selectTrack(id: string | null): void;
  reset(): void;
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  duration: 0,
  zoom: 82,
  selectedTrackId: null,
  setCurrentTime(currentTime) {
    set({ currentTime: Math.max(0, Math.min(currentTime, get().duration)) });
  },
  seek(delta) {
    get().setCurrentTime(get().currentTime + delta);
  },
  setIsPlaying(isPlaying) {
    set({ isPlaying });
  },
  togglePlayback() {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },
  setDuration(duration) {
    set((state) => ({
      duration,
      currentTime: Math.min(state.currentTime, duration),
    }));
  },
  setZoom(zoom) {
    set({ zoom: Math.max(36, Math.min(180, zoom)) });
  },
  selectTrack(selectedTrackId) {
    set({ selectedTrackId });
  },
  reset() {
    set({ currentTime: 0, isPlaying: false, duration: 0, zoom: 82, selectedTrackId: null });
  },
}));

type RenderState = {
  jobId: string | null;
  status: RenderStatus;
  progress: number;
  logLines: LogLine[];
  outputUrl: string | null;
  setJob(jobId: string): void;
  setStatus(status: RenderStatus): void;
  setProgress(progress: number): void;
  appendLog(line: Omit<LogLine, "id" | "ts">): void;
  done(outputUrl: string): void;
  fail(message: string): void;
  reset(): void;
};

export const useRenderStore = create<RenderState>((set) => ({
  jobId: null,
  status: "idle",
  progress: 0,
  logLines: [],
  outputUrl: null,
  setJob(jobId) {
    set({ jobId, status: "queued", progress: 0, outputUrl: null });
  },
  setStatus(status) {
    set({ status });
  },
  setProgress(progress) {
    set({ progress: Math.max(0, Math.min(100, progress)) });
  },
  appendLog(line) {
    set((state) => ({
      logLines: [
        ...state.logLines.slice(-999),
        {
          ...line,
          id: crypto.randomUUID(),
          ts: new Date().toLocaleTimeString(),
        },
      ],
    }));
  },
  done(outputUrl) {
    set({ status: "done", progress: 100, outputUrl });
  },
  fail(message) {
    set((state) => ({
      status: "error",
      logLines: [
        ...state.logLines,
        {
          id: crypto.randomUUID(),
          ts: new Date().toLocaleTimeString(),
          level: "error",
          message,
        },
      ],
    }));
  },
  reset() {
    set({
      jobId: null,
      status: "idle",
      progress: 0,
      logLines: [],
      outputUrl: null,
    });
  },
}));

export function getProjectSnapshot() {
  return toProject(useProjectStore.getState());
}
