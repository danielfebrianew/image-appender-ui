"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { DEFAULT_IMAGE_DURATION, resolveCollisionStart } from "@/lib/timeline-math";
import type { ProjectImage } from "@/lib/types";
import { Button } from "@/components/ui/button";

function makeTrack(image: ProjectImage, startSec: number, tracks: { startSec: number; endSec: number }[]) {
  const resolvedStart = resolveCollisionStart(
    startSec,
    DEFAULT_IMAGE_DURATION,
    tracks,
  );

  return {
    id: crypto.randomUUID(),
    imageId: image.id,
    imageUrl: image.url,
    imageName: image.name,
    startSec: resolvedStart,
    endSec: resolvedStart + DEFAULT_IMAGE_DURATION,
    clickEnabled: true,
  };
}

export function ImageLibrary() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const projectId = useProjectStore((state) => state.projectId);
  const images = useProjectStore((state) => state.images);
  const tracks = useProjectStore((state) => state.tracks);
  const addImage = useProjectStore((state) => state.addImage);
  const addTrack = useProjectStore((state) => state.addTrack);
  const removeImage = useProjectStore((state) => state.removeImage);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const selectTrack = usePlaybackStore((state) => state.selectTrack);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        let image: ProjectImage;
        if (projectId === "demo") {
          image = {
            id: crypto.randomUUID(),
            url: URL.createObjectURL(file),
            name: file.name,
            createdAt: new Date().toISOString(),
          };
        } else {
          try {
            image = await uploadImage(projectId, file);
          } catch {
            image = {
              id: crypto.randomUUID(),
              url: URL.createObjectURL(file),
              name: file.name,
              createdAt: new Date().toISOString(),
            };
          }
        }

        addImage(image);
        const track = makeTrack(image, currentTime, useProjectStore.getState().tracks);
        addTrack(track);
        selectTrack(track.id);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRefresh() {
    // Re-fetch images from backend by dispatching a project reload event
    window.dispatchEvent(new CustomEvent("contextclipper:reload"));
  }

  return (
    <aside className="flex w-77.5 shrink-0 flex-col border-l border-[#2a2a2a] bg-[#141414]">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] px-3 py-2">
        <div className="text-[12px] font-semibold text-[#f0f0f0]">
          Image Library
        </div>
        <Button size="icon" variant="ghost" title="Refresh images" onClick={handleRefresh}>
          <RotateCcw size={14} />
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-3 gap-2 p-3">
        {images.map((image) => (
          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#7c3aed]">
            <button
              className="absolute inset-0"
              title={image.name}
              onClick={() => {
                const track = makeTrack(image, currentTime, tracks);
                addTrack(track);
                selectTrack(track.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                removeImage(image.id);
              }}
            >
              <img
                src={image.url}
                alt={image.name}
                className="h-full w-full object-cover"
              />
            </button>
            <span className="absolute bottom-0 left-0 right-0 truncate bg-black/70 px-1 py-0.5 text-left text-[10px] text-white opacity-0 group-hover:opacity-100">
              {image.name}
            </span>
            <Trash2
              className="absolute right-1 top-1 hidden rounded bg-black/70 p-0.5 text-[#f87171] group-hover:block"
              size={16}
              onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
            />
            <button
              className="absolute bottom-5 left-0 right-0 hidden justify-center group-hover:flex"
              title="Prepend 0.5s at start"
              onClick={(e) => {
                e.stopPropagation();
                const track = {
                  id: crypto.randomUUID(),
                  imageId: image.id,
                  imageUrl: image.url,
                  imageName: image.name,
                  startSec: 0,
                  endSec: 0.5,
                  fit: undefined,
                  clickEnabled: true,
                };
                addTrack(track);
                selectTrack(track.id);
              }}
            >
              <span className="rounded bg-[#7c3aed] px-1.5 py-0.5 text-[10px] font-semibold text-white">+0.5s</span>
            </button>
          </div>
        ))}
        <button
          className="flex aspect-square items-center justify-center rounded-md border border-dashed border-[#333] text-[#555] hover:border-[#7c3aed] hover:text-[#888]"
          title="Upload image"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        </button>
      </div>
      <div className="mx-3 mb-3 mt-auto rounded-md border border-dashed border-[#333] bg-[#111] px-3 py-5 text-center text-[12px] text-[#888]">
        Drop images here or press Ctrl+V
      </div>
    </aside>
  );
}
