"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, Upload, Video } from "lucide-react";
import { deleteCover, uploadCover } from "@/lib/api";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";

function ratioClass(ratio: string) {
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-[9/16]";
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

  const [videoReady, setVideoReady] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const tracks = useProjectStore((state) => state.tracks);
  const videoMeta = useProjectStore((state) => state.videoMeta);
  const layout = useProjectStore((state) => state.layout);
  const clickSound = useProjectStore((state) => state.clickSound);
  const cover = useProjectStore((state) => state.cover);
  const setCover = useProjectStore((state) => state.setCover);
  const projectId = useProjectStore((state) => state.projectId);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const setDuration = usePlaybackStore((state) => state.setDuration);
  const setIsPlaying = usePlaybackStore((state) => state.setIsPlaying);

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
          <img
            src={activeTrack.thumbnailUrl}
            alt={activeTrack.videoName}
            className="absolute bottom-0 left-0 w-full"
            style={{
              height: `${layout.overlayHeightPct}%`,
              objectFit: activeTrack.fit ?? layout.imageFit,
            }}
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

      {/* Right spacer — keeps video centered */}
      <div className="w-36 shrink-0" />
    </section>
  );
}
