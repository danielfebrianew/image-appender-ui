import type { Cover, ImageFit, ImageTrack, LayoutConfig, Project, ProjectImage, ProjectVideo, Track, VideoClipTrack, VideoMeta } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Backend shape (snake_case) ───────────────────────────────────────────────

type BackendTrack = {
  id: string;
  image_id?: string | null;
  video_id?: string | null;
  start_sec: number;
  end_sec: number;
  trim_start_sec?: number;
  fit_override?: string | null;
};

type BackendVideo = {
  video_id?: string;
  id?: string;
  filename?: string;
  name?: string;
  meta?: {
    duration_sec?: number;
    duration?: number;
  };
};

type BackendImage = {
  image_id?: string;
  id?: string;
  url?: string;
  image_url?: string;
  name?: string;
  filename?: string;
  created_at?: string;
  createdAt?: string;
};

type BackendProject = {
  project_id?: string;
  id?: string;
  name?: string;
  video_id?: string;
  video_meta?: {
    url?: string;
    video_url?: string;
    duration_sec?: number;
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
  };
  layout?: {
    image_area_ratio?: number;
    overlay_height_pct?: number;
    overlayHeightPct?: number;
    image_position?: string;
    image_fit?: string;
    imageFit?: string;
    background_color?: string;
    backgroundColor?: string;
    aspect_ratio?: string;
    aspectRatio?: string;
  };
  click_sound?: {
    enabled?: boolean;
    asset?: string;
    volume?: number;
    trigger?: string;
  };
  tracks?: BackendTrack[];
  images?: BackendImage[];
  videos?: BackendVideo[];
  cover?: BackendCover | null;
};

type BackendCover = {
  path?: string;
  filename?: string;
  width?: number;
  height?: number;
  duration_sec?: number;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────

export function resolveUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeCover(projectId: string, raw: BackendCover | null | undefined): Cover | null {
  if (!raw || !raw.filename) return null;
  return {
    coverId: "",
    url: `${API_URL}/api/projects/${projectId}/cover?v=${encodeURIComponent(raw.filename)}`,
    filename: raw.filename,
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    durationSec: raw.duration_sec ?? 0.5,
  };
}

function normalizeImage(raw: BackendImage): ProjectImage {
  return {
    id: raw.image_id ?? raw.id ?? crypto.randomUUID(),
    url: resolveUrl(raw.url ?? raw.image_url),
    name: raw.name ?? raw.filename ?? "Image",
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  };
}

function normalizeVideo(raw: BackendVideo): ProjectVideo {
  const id = raw.video_id ?? raw.id ?? crypto.randomUUID();
  return {
    id,
    name: raw.filename ?? raw.name ?? id,
    thumbnailUrl: `${API_URL}/api/videos/${id}/thumbnail`,
    durationSec: raw.meta?.duration_sec ?? raw.meta?.duration ?? 0,
  };
}

function normalizeTrack(raw: BackendTrack, images: ProjectImage[], videos: ProjectVideo[]): Track {
  if (raw.video_id) {
    const video = videos.find((v) => v.id === raw.video_id);
    const clip: VideoClipTrack = {
      id: raw.id,
      kind: "video",
      videoId: raw.video_id,
      videoName: video?.name ?? raw.video_id,
      thumbnailUrl: video?.thumbnailUrl ?? `${API_URL}/api/videos/${raw.video_id}/thumbnail`,
      durationSec: video?.durationSec ?? 0,
      startSec: raw.start_sec,
      endSec: raw.end_sec,
      trimStartSec: raw.trim_start_sec ?? 0,
      fit: (raw.fit_override as ImageFit) ?? undefined,
    };
    return clip;
  }
  const image = images.find((img) => img.id === raw.image_id);
  const imageTrack: ImageTrack = {
    id: raw.id,
    kind: "image",
    imageId: raw.image_id ?? "",
    imageUrl: image?.url ?? `${API_URL}/api/images/${raw.image_id}`,
    imageName: image?.name ?? (raw.image_id ?? ""),
    startSec: raw.start_sec,
    endSec: raw.end_sec,
    fit: (raw.fit_override as ImageFit) ?? undefined,
    clickEnabled: true,
  };
  return imageTrack;
}

function normalizeLayout(raw: BackendProject["layout"]): LayoutConfig {
  const fit = (raw?.image_fit ?? raw?.imageFit ?? "cover") as LayoutConfig["imageFit"];
  const ratio = (raw?.aspect_ratio ?? raw?.aspectRatio ?? "9:16") as LayoutConfig["aspectRatio"];
  const heightPct =
    raw?.overlay_height_pct ??
    raw?.overlayHeightPct ??
    (raw?.image_area_ratio != null ? Math.round(raw.image_area_ratio * 100) : 30);
  return {
    aspectRatio: ratio,
    imageFit: fit,
    overlayHeightPct: heightPct,
    backgroundColor: raw?.background_color ?? raw?.backgroundColor ?? "#111111",
  };
}

function normalizeProject(projectId: string, raw: BackendProject): Project {
  const images = (raw.images ?? []).map(normalizeImage);
  const videos = (raw.videos ?? []).map(normalizeVideo);
  const tracks = (raw.tracks ?? []).map((t) => normalizeTrack(t, images, videos));

  const vm = raw.video_meta;
  const videoMeta: VideoMeta = {
    url: vm?.url ?? vm?.video_url ?? "",
    duration: vm?.duration_sec ?? vm?.duration ?? 0,
    width: vm?.width ?? 1080,
    height: vm?.height ?? 1920,
    fps: vm?.fps ?? 30,
    videoId: raw.video_id,
  };

  const resolvedProjectId = raw.project_id ?? raw.id ?? projectId;

  return {
    projectId: resolvedProjectId,
    name: raw.name ?? "Untitled Project",
    videoMeta,
    layout: normalizeLayout(raw.layout),
    clickSound: {
      enabled: raw.click_sound?.enabled ?? true,
      volume: raw.click_sound?.volume ?? 0.6,
      asset: raw.click_sound?.asset ?? "default-click",
    },
    tracks,
    images,
    videos,
    cover: normalizeCover(resolvedProjectId, raw.cover),
  };
}

// Serialize Project back to backend snake_case shape for PUT
function serializeProject(project: Project): object {
  return {
    name: project.name,
    ...(project.videoMeta.videoId ? { video_id: project.videoMeta.videoId } : {}),
    layout: {
      image_area_ratio: project.layout.overlayHeightPct / 100,
      overlay_height_pct: project.layout.overlayHeightPct,
      image_position: "bottom",
      image_fit: project.layout.imageFit,
      background_color: project.layout.backgroundColor,
      aspect_ratio: project.layout.aspectRatio,
    },
    click_sound: {
      enabled: project.clickSound.enabled,
      asset: project.clickSound.asset,
      volume: project.clickSound.volume,
      trigger: "on_image_start",
    },
    tracks: project.tracks.map((t) => ({
      id: t.id,
      image_id: t.kind === "image" ? t.imageId : null,
      video_id: t.kind === "video" ? t.videoId : null,
      start_sec: t.startSec,
      end_sec: t.endSec,
      trim_start_sec: t.kind === "video" ? t.trimStartSec : 0,
      fit_override: t.fit ?? null,
    })),
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Project load failed (${response.status})`);
  }

  return normalizeProject(projectId, await response.json());
}

export async function createProject(name: string, videoId: string): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, video_id: videoId }),
  });

  if (!response.ok) {
    throw new Error(`Project create failed (${response.status})`);
  }

  const data = await response.json();
  const projectId = data.project_id ?? data.id;
  return normalizeProject(projectId, data);
}

export async function saveProject(project: Project) {
  const response = await fetch(`${API_URL}/api/projects/${project.projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeProject(project)),
  });

  if (!response.ok) {
    throw new Error(`Project save failed (${response.status})`);
  }
}

// Upload image globally (backend: POST /api/images), not per-project
export async function uploadImage(file: Blob): Promise<ProjectImage> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "clipboard.png");

  const response = await fetch(`${API_URL}/api/images`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status})`);
  }

  return normalizeImage(await response.json());
}

// Delete image globally (backend: DELETE /api/images/{id})
export async function deleteImage(_projectId: string, imageId: string) {
  await fetch(`${API_URL}/api/images/${imageId}`, {
    method: "DELETE",
  });
}

// Upload video globally (backend: POST /api/videos), returns VideoMeta + video_id
export async function uploadVideo(
  file: File,
): Promise<VideoMeta & { videoId: string }> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_URL}/api/videos`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Video upload failed (${response.status})`);
  }

  const data = await response.json();
  const meta = data.meta ?? data;
  return {
    videoId: data.video_id ?? data.id ?? "",
    url: `${API_URL}/api/videos/${data.video_id ?? data.id}/stream`,
    duration: meta.duration_sec ?? meta.duration ?? 0,
    width: meta.width ?? 1080,
    height: meta.height ?? 1920,
    fps: meta.fps ?? 30,
  };
}

export async function uploadCover(file: Blob): Promise<Cover> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "cover.png");

  const response = await fetch(`${API_URL}/api/covers`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Cover upload failed (${response.status})`);
  }

  const data = await response.json();
  return {
    coverId: data.cover_id,
    url: `${API_URL}/api/covers/${data.cover_id}`,
    filename: data.filename,
    width: data.width,
    height: data.height,
    durationSec: 0.5,
  };
}

export async function deleteCover(coverId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/covers/${coverId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Cover delete failed (${response.status})`);
  }
}

export async function startRender(projectId: string) {
  const response = await fetch(`${API_URL}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });

  if (!response.ok) {
    throw new Error(`Render start failed (${response.status})`);
  }

  const data = await response.json();
  return data.job_id ?? data.jobId;
}

export async function listVideos(): Promise<ProjectVideo[]> {
  const response = await fetch(`${API_URL}/api/videos`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Videos list failed (${response.status})`);
  const data: BackendVideo[] = await response.json();
  return data.map(normalizeVideo);
}

export async function deleteVideo(videoId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Delete video failed (${response.status})`);
}

export async function addVideoTrack(
  projectId: string,
  videoId: string,
  startSec: number,
  endSec: number,
  fit?: string,
): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_id: videoId,
      start_sec: startSec,
      end_sec: endSec,
      fit_override: fit ?? null,
    }),
  });
  if (!response.ok) throw new Error(`Add video track failed (${response.status})`);
  const data = await response.json();
  return normalizeProject(projectId, data);
}

export function createDemoProject(projectId: string): Project {
  return normalizeProject(projectId, {
    project_id: projectId,
    name: "ContextClipper Draft",
  });
}
