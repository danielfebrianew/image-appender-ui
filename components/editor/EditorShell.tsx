"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Keyboard, Scissors, UploadCloud } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { duplicateTrackAtEnd, splitTrackAtTime } from "@/lib/hotkeys";
import {
  DEFAULT_IMAGE_DURATION,
  resolveCollisionStart,
} from "@/lib/timeline-math";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { isEditableElement } from "@/lib/utils";
import type { ProjectImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Sidebar } from "@/components/editor/Sidebar";
import { PreviewPane } from "@/components/editor/PreviewPane";
import { ImageLibrary } from "@/components/editor/ImageLibrary";
import { Transport } from "@/components/editor/Transport";
import { Timeline } from "@/components/editor/Timeline/Timeline";
import { RenderPanel } from "@/components/editor/RenderPanel";
import { ShortcutsModal } from "@/components/editor/ShortcutsModal";

export function EditorShell() {
  const [dropActive, setDropActive] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();
  const tracks = useProjectStore((state) => state.tracks);
  const layout = useProjectStore((state) => state.layout);
  const addImage = useProjectStore((state) => state.addImage);
  const addTrack = useProjectStore((state) => state.addTrack);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const removeTrack = useProjectStore((state) => state.removeTrack);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const resetProject = useProjectStore((state) => state.reset);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const selectedTrackId = usePlaybackStore((state) => state.selectedTrackId);
  const duration = usePlaybackStore((state) => state.duration);
  const zoom = usePlaybackStore((state) => state.zoom);
  const seek = usePlaybackStore((state) => state.seek);
  const togglePlayback = usePlaybackStore((state) => state.togglePlayback);
  const setZoom = usePlaybackStore((state) => state.setZoom);
  const selectTrack = usePlaybackStore((state) => state.selectTrack);
  const resetPlayback = usePlaybackStore((state) => state.reset);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, tracks],
  );

  const handleReset = useCallback(() => {
    resetProject();
    resetPlayback();
  }, [resetPlayback, resetProject]);

  const insertImage = useCallback(
    (image: ProjectImage) => {
      addImage(image);
      const startSec = resolveCollisionStart(
        currentTime,
        DEFAULT_IMAGE_DURATION,
        useProjectStore.getState().tracks,
      );
      const track = {
        id: crypto.randomUUID(),
        kind: "image" as const,
        imageId: image.id,
        imageUrl: image.url,
        imageName: image.name,
        startSec,
        endSec: Math.min(startSec + DEFAULT_IMAGE_DURATION, duration || startSec + DEFAULT_IMAGE_DURATION),
        fit: layout.imageFit,
        clickEnabled: true,
      };
      addTrack(track);
      selectTrack(track.id);
    },
    [addImage, addTrack, currentTime, duration, layout.imageFit, selectTrack],
  );

  const handleImageBlob = useCallback(
    async (blob: Blob) => {
      try {
        const image = await uploadImage(blob);
        insertImage(image);
      } catch {
        insertImage({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(blob),
          name: blob instanceof File ? blob.name : "Clipboard image",
          createdAt: new Date().toISOString(),
        });
        toast("Backend unavailable — using local preview", "warn");
      }
    },
    [insertImage, toast],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableElement(event.target)) return;
      const item = [...(event.clipboardData?.items ?? [])].find((entry) =>
        entry.type.startsWith("image/"),
      );
      if (!item) return;
      event.preventDefault();
      const file = item.getAsFile();
      if (file) void handleImageBlob(file);
    };

    const onDragOver = (event: DragEvent) => {
      if ([...(event.dataTransfer?.items ?? [])].some((item) => item.type.startsWith("image/"))) {
        event.preventDefault();
        setDropActive(true);
      }
    };

    const onDrop = (event: DragEvent) => {
      const files = [...(event.dataTransfer?.files ?? [])].filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      setDropActive(false);
      files.forEach((file) => void handleImageBlob(file));
    };

    const onDragLeave = () => setDropActive(false);

    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragLeave);

    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragLeave);
    };
  }, [handleImageBlob]);

  useHotkeys("space", (event) => { event.preventDefault(); togglePlayback(); });
  useHotkeys("left", () => seek(-1));
  useHotkeys("right", () => seek(1));
  useHotkeys("shift+left", () => seek(-5));
  useHotkeys("shift+right", () => seek(5));
  useHotkeys(",", () => seek(-1 / 30));
  useHotkeys(".", () => seek(1 / 30));
  useHotkeys("+", () => setZoom(zoom + 12));
  useHotkeys("-", () => setZoom(zoom - 12));
  useHotkeys("mod+z", (event) => { event.preventDefault(); undo(); });
  useHotkeys("mod+shift+z", (event) => { event.preventDefault(); redo(); });
  useHotkeys("delete,backspace", () => {
    if (selectedTrackId) {
      removeTrack(selectedTrackId);
      selectTrack(null);
    }
  });
  useHotkeys("d", () => {
    if (!selectedTrack) return;
    const duplicate = duplicateTrackAtEnd(selectedTrack, tracks);
    addTrack(duplicate);
    selectTrack(duplicate.id);
  });
  useHotkeys("s", () => {
    if (!selectedTrack) return;
    const split = splitTrackAtTime(selectedTrack, currentTime);
    if (!split) return;
    updateTrack(selectedTrack.id, { endSec: split.left.endSec });
    addTrack(split.right);
    selectTrack(split.right.id);
  });
  useHotkeys("[", () => {
    if (selectedTrack && currentTime < selectedTrack.endSec) {
      updateTrack(selectedTrack.id, { startSec: currentTime });
    }
  });
  useHotkeys("]", () => {
    if (selectedTrack && currentTime > selectedTrack.startSec) {
      updateTrack(selectedTrack.id, { endSec: currentTime });
    }
  });
  useHotkeys("esc", () => { selectTrack(null); setShowShortcuts(false); });
  useHotkeys("enter", () => window.dispatchEvent(new CustomEvent("contextclipper:render")));
  useHotkeys("shift+/", (e) => { e.preventDefault(); setShowShortcuts((v) => !v); });

  return (
    <div className="relative flex h-screen min-w-220 flex-col overflow-hidden bg-[#111] text-[#f0f0f0]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#2a2a2a] bg-[#111] px-3">
        <Scissors size={17} className="text-[#7c3aed]" />
        <div className="text-[14px] font-semibold">ContextClipper</div>
        <Button
          className="ml-auto"
          size="sm"
          variant="ghost"
          title="Reset — clear video and images"
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Keyboard shortcuts (?)"
          onClick={() => setShowShortcuts((v) => !v)}
        >
          <Keyboard size={15} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.dispatchEvent(new CustomEvent("contextclipper:render"))}
        >
          Render
        </Button>
      </header>
      <main className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <PreviewPane />
            <ImageLibrary />
          </div>
          <Transport />
        </div>
      </main>
      <Timeline />
      <RenderPanel />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {dropActive && (
        <div className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-md border border-dashed border-[#7c3aed] bg-[#111]/70 text-[#f0f0f0]">
          <div className="flex items-center gap-2 rounded-md bg-[#1a1a1a] px-3 py-2 text-[13px]">
            <UploadCloud size={16} />
            Drop to add at playhead
          </div>
        </div>
      )}
    </div>
  );
}
