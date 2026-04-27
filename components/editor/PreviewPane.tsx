"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, Trash2, Upload, Video } from "lucide-react";
import { deleteCover, deleteVideo, listVideos, uploadCover, uploadVideo } from "@/lib/api";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { resolveCollisionStart } from "@/lib/timeline-math";
import type { ProjectVideo, VideoClipTrack } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

function ratioClass(ratio: string) {
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-[9/16]";
}

function VideoClipOverlay({
  track,
  currentTime,
  isPlaying,
  overlayHeightPct,
  fit,
}: {
  track: VideoClipTrack;
  currentTime: number;
  isPlaying: boolean;
  overlayHeightPct: number;
  fit: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // URL for the overlay video — resolve via backend stream endpoint
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const src = `${API_URL}/api/videos/${track.videoId}/stream`;

  // Sync seek position
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const overlayTime = track.trimStartSec + (currentTime - track.startSec);
    if (Math.abs(video.currentTime - overlayTime) > 0.08) {
      video.currentTime = Math.max(0, overlayTime);
    }
  }, [currentTime, track.startSec, track.trimStartSec]);

  // Sync play/pause
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (isPlaying) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  return (
    <video
      ref={ref}
      src={src}
      className="absolute bottom-0 left-0 w-full"
      style={{ height: `${overlayHeightPct}%`, objectFit: fit as never }}
      muted
      playsInline
      preload="auto"
    />
  );
}

export function PreviewPane() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = new Audio("/click.mp3");
    audio.preload = "auto";
    clickAudioRef.current = audio;
  }, []);

  const clipInputRef = useRef<HTMLInputElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [clipUploading, setClipUploading] = useState(false);
  const [videoLibrary, setVideoLibrary] = useState<ProjectVideo[]>([]);

  const tracks = useProjectStore((state) => state.tracks);
  const videoMeta = useProjectStore((state) => state.videoMeta);
  const layout = useProjectStore((state) => state.layout);
  const clickSound = useProjectStore((state) => state.clickSound);
  const cover = useProjectStore((state) => state.cover);
  const setCover = useProjectStore((state) => state.setCover);
  const projectId = useProjectStore((state) => state.projectId);
  const addTrack = useProjectStore((state) => state.addTrack);
  const removeTrack = useProjectStore((state) => state.removeTrack);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const duration = usePlaybackStore((state) => state.duration);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const setDuration = usePlaybackStore((state) => state.setDuration);
  const setIsPlaying = usePlaybackStore((state) => state.setIsPlaying);
  const selectTrack = usePlaybackStore((state) => state.selectTrack);

  useEffect(() => {
    listVideos().then(setVideoLibrary).catch(() => {});
  }, []);

  async function handleClipUpload(file: File) {
    setClipUploading(true);
    try {
      const result = await uploadVideo(projectId, file);
      const video: ProjectVideo = {
        id: result.videoId,
        name: file.name,
        thumbnailUrl: `${result.url.replace("/stream", "")}/thumbnail`,
        durationSec: result.duration,
      };
      setVideoLibrary((prev) => [video, ...prev]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setClipUploading(false);
    }
  }

  async function handleDeleteVideo(videoId: string) {
    try {
      await deleteVideo(videoId);
      setVideoLibrary((prev) => prev.filter((v) => v.id !== videoId));
      // remove any timeline tracks referencing this video
      const affected = useProjectStore.getState().tracks.filter(
        (t) => t.kind === "video" && t.videoId === videoId,
      );
      affected.forEach((t) => removeTrack(t.id));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  function addClipToTimeline(video: ProjectVideo) {
    if (duration <= 0) return;
    const clipDur = Math.min(video.durationSec || 3, duration);
    const startSec = resolveCollisionStart(currentTime, clipDur, useProjectStore.getState().tracks);
    const endSec = Math.min(startSec + clipDur, duration);
    const track: VideoClipTrack = {
      id: crypto.randomUUID(),
      kind: "video",
      videoId: video.id,
      videoName: video.name,
      thumbnailUrl: video.thumbnailUrl,
      durationSec: video.durationSec,
      startSec,
      endSec,
      trimStartSec: 0,
    };
    addTrack(track);
    selectTrack(track.id);
  }

  const activeTrack = useMemo(
    () =>
      tracks
        .filter((track) => track.startSec <= currentTime && currentTime < track.endSec)
        .at(-1) ?? null,
    [currentTime, tracks],
  );

  const prevActiveTrackId = useRef<string | null>(null);
  useEffect(() => {
    const incomingId = activeTrack?.id ?? null;
    const clickAllowed = activeTrack?.kind === "image" ? (activeTrack.clickEnabled !== false) : false;
    if (incomingId !== null && incomingId !== prevActiveTrackId.current && isPlaying) {
      if (clickSound.enabled && clickAllowed) {
        const audio = clickAudioRef.current;
        if (audio) {
          audio.volume = Math.max(0, Math.min(1, clickSound.volume));
          audio.currentTime = 0;
          void audio.play();
        }
      }
    }
    prevActiveTrackId.current = incomingId;
  }, [activeTrack, clickSound.enabled, clickSound.volume, isPlaying]);

  useEffect(() => {
    setDuration(videoMeta.duration);
    setVideoReady(false);
  }, [setDuration, videoMeta.duration, videoMeta.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 0.08) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      void video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  async function handleCoverFile(file: File) {
    if (!projectId || projectId === "demo") {
      toast("Upload a video first to create the project.", "warn");
      return;
    }
    setCoverUploading(true);
    try {
      const uploaded = await uploadCover(projectId, file);
      setCover(uploaded);
      toast("Cover uploaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Cover upload failed", "error");
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleRemoveCover() {
    if (!projectId || projectId === "demo") return;
    setCoverUploading(true);
    try {
      await deleteCover(projectId);
      setCover(null);
      toast("Cover removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Cover delete failed", "error");
    } finally {
      setCoverUploading(false);
    }
  }

  const noProject = !projectId || projectId === "demo";

  return (
    <section className="flex min-w-60 flex-1 items-center justify-center gap-4 overflow-hidden bg-[#111] px-4 py-4">

      {/* Left: Cover panel */}
      <div className="flex w-36 shrink-0 flex-col gap-2 self-center">
        <div className="text-[11px] font-semibold uppercase text-[#555]">Cover (0.5s)</div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleCoverFile(file);
            e.target.value = "";
          }}
        />
        {cover ? (
          <>
            <div className="relative overflow-hidden rounded-md border border-[#2a2a2a] bg-[#161616]">
              <img src={cover.url} alt={cover.filename} className="h-20 w-full object-contain" />
            </div>
            <div className="truncate text-[11px] text-[#555]" title={cover.filename}>
              {cover.filename}
            </div>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-[#2a2a2a] bg-[#161616] text-[11px] text-[#888] hover:border-[#7c3aed] hover:text-[#f0f0f0] disabled:opacity-50"
            >
              {coverUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Replace
            </button>
            <button
              onClick={() => void handleRemoveCover()}
              disabled={coverUploading}
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-[#2a2a2a] bg-[#161616] text-[11px] text-[#888] hover:border-[#dc2626] hover:text-[#f87171] disabled:opacity-50"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading || noProject}
              className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[#333] bg-[#161616] text-[11px] text-[#666] hover:border-[#7c3aed] hover:text-[#888] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {coverUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload cover
            </button>
            {noProject && (
              <div className="text-[10px] text-[#444]">Upload a video first</div>
            )}
          </>
        )}
        <div className="text-[10px] text-[#444]">Shown 0.5s before video — for Shorts thumbnails</div>
      </div>

      {/* Video player */}
      <div
        className={`relative h-full max-h-[58vh] overflow-hidden rounded-md border border-[#2a2a2a] bg-black shadow-2xl ${ratioClass(layout.aspectRatio)}`}
        style={{ backgroundColor: layout.backgroundColor }}
      >
        {videoMeta.url ? (
          <video
            ref={videoRef}
            src={videoMeta.url}
            className="h-full w-full object-cover"
            onLoadedMetadata={() => setVideoReady(true)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
            playsInline
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[#555]">
            <Video size={32} />
            <span className="text-[12px]">Upload a video to get started</span>
          </div>
        )}

        {activeTrack && activeTrack.kind === "image" && (
          <img
            src={activeTrack.imageUrl}
            alt={activeTrack.imageName}
            className="absolute bottom-0 left-0 w-full"
            style={{
              height: `${layout.overlayHeightPct}%`,
              objectFit: activeTrack.fit ?? layout.imageFit,
            }}
          />
        )}
        {activeTrack && activeTrack.kind === "video" && (
          <VideoClipOverlay
            track={activeTrack}
            currentTime={currentTime}
            isPlaying={isPlaying}
            overlayHeightPct={layout.overlayHeightPct}
            fit={activeTrack.fit ?? layout.imageFit}
          />
        )}

        {videoReady && (
          <div
            className="pointer-events-none absolute bottom-[calc(var(--overlay-h)+4px)] right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white"
            style={{ "--overlay-h": `${layout.overlayHeightPct}%` } as React.CSSProperties}
          >
            {Math.round(layout.overlayHeightPct)}%
          </div>
        )}
      </div>

      {/* Right: Clips panel */}
      <div className="flex w-36 shrink-0 flex-col gap-2 self-stretch">
        <div className="text-[11px] font-semibold uppercase text-[#555]">Clips</div>
        <input
          ref={clipInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleClipUpload(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => clipInputRef.current?.click()}
          disabled={clipUploading}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#333] bg-[#161616] text-[11px] text-[#666] hover:border-[#2563eb] hover:text-[#93c5fd] disabled:opacity-50"
        >
          {clipUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {clipUploading ? "Uploading…" : "Upload clip"}
        </button>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {videoLibrary.map((video) => (
            <div key={video.id} className="group relative flex items-center">
              <button
                disabled={duration <= 0}
                onClick={() => addClipToTimeline(video)}
                title={video.name}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded border border-[#2a2a2a] bg-[#161616] px-1.5 py-1 text-left hover:border-[#2563eb] hover:bg-[#0f2032] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Film size={12} className="shrink-0 text-[#3b82f6]" />
                <span className="min-w-0 truncate text-[11px] text-[#888] group-hover:text-[#93c5fd]">
                  {video.name}
                </span>
              </button>
              <button
                onClick={() => void handleDeleteVideo(video.id)}
                title="Delete clip"
                className="absolute right-1 hidden rounded p-0.5 text-[#555] hover:text-[#f87171] group-hover:block"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {videoLibrary.length === 0 && !clipUploading && (
            <div className="text-[10px] text-[#444]">No clips yet</div>
          )}
        </div>
      </div>
    </section>
  );
}
