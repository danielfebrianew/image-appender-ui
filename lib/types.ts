export type AspectRatio = "9:16" | "1:1" | "16:9";
export type ImageFit = "cover" | "contain";
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
export type RenderStatus = "idle" | "queued" | "running" | "done" | "error";

export type VideoMeta = {
  url: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoId?: string;
};

export type LayoutConfig = {
  aspectRatio: AspectRatio;
  imageFit: ImageFit;
  overlayHeightPct: number;
  backgroundColor: string;
};

export type ClickConfig = {
  enabled: boolean;
  volume: number;
  asset: string;
};

export type ProjectImage = {
  id: string;
  url: string;
  name: string;
  createdAt: string;
};

export type Cover = {
  url: string;
  filename: string;
  width: number;
  height: number;
  durationSec: number;
};

export type ImageTrack = {
  id: string;
  kind: "image";
  imageId: string;
  imageUrl: string;
  imageName: string;
  startSec: number;
  endSec: number;
  fit?: ImageFit;
  clickEnabled?: boolean;
};

export type VideoClipTrack = {
  id: string;
  kind: "video";
  videoId: string;
  videoName: string;
  thumbnailUrl: string;
  startSec: number;
  endSec: number;
  fit?: ImageFit;
};

export type Track = ImageTrack | VideoClipTrack;

export type ProjectVideo = {
  id: string;
  name: string;
  thumbnailUrl: string;
  durationSec: number;
};

export type Project = {
  projectId: string;
  name: string;
  videoMeta: VideoMeta;
  layout: LayoutConfig;
  clickSound: ClickConfig;
  tracks: Track[];
  images: ProjectImage[];
  videos: ProjectVideo[];
  cover: Cover | null;
};

export type LogLine = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  ts: string;
};

export type TrackPatch = Partial<Omit<Track, "id" | "kind">>;

export type Command =
  | { type: "add_track"; track: Track }
  | { type: "remove_track"; track: Track; index: number }
  | {
      type: "update_track";
      id: string;
      before: TrackPatch;
      after: TrackPatch;
    };

export type RenderMessage =
  | { type: "log"; level?: LogLine["level"]; line?: string; message?: string }
  | { type: "progress"; progress?: number; percent?: number }
  | { type: "done"; output_url: string }
  | { type: "error"; message: string };
