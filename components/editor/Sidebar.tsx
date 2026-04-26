"use client";

import { useRef, useState } from "react";
import { Check, Loader2, MousePointerClick, SlidersHorizontal, Upload } from "lucide-react";
import { createProject, uploadVideo } from "@/lib/api";
import { usePlaybackStore, useProjectStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";

export function Sidebar() {
  const { toast } = useToast();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const projectId = useProjectStore((state) => state.projectId);
  const name = useProjectStore((state) => state.name);
  const videoMeta = useProjectStore((state) => state.videoMeta);
  const layout = useProjectStore((state) => state.layout);
  const clickSound = useProjectStore((state) => state.clickSound);
  const hydrate = useProjectStore((state) => state.hydrate);
  const setName = useProjectStore((state) => state.setName);
  const setVideoMeta = useProjectStore((state) => state.setVideoMeta);
  const updateLayout = useProjectStore((state) => state.updateLayout);
  const updateClickSound = useProjectStore((state) => state.updateClickSound);
  const setDuration = usePlaybackStore((state) => state.setDuration);

  function deriveProjectName(filename: string) {
    const base = filename.replace(/\.[^.]+$/, "");
    const uid = crypto.randomUUID().slice(0, 4);
    return `edited_${base}_${uid}`;
  }

  async function handleVideoFile(file: File) {
    setVideoUploading(true);
    const projectName = deriveProjectName(file.name);
    setName(projectName);

    const localUrl = URL.createObjectURL(file);
    let videoId: string | null = null;

    // Always use local object URL for preview playback
    await new Promise<void>((resolve) => {
      const video = document.createElement("video");
      video.src = localUrl;
      video.onloadedmetadata = () => {
        setVideoMeta({
          url: localUrl,
          duration: video.duration,
          width: video.videoWidth || 1080,
          height: video.videoHeight || 1920,
          fps: 30,
        });
        setDuration(video.duration);
        resolve();
      };
      video.onerror = () => resolve();
    });

    // Upload to backend in background to get video_id for rendering
    try {
      const result = await uploadVideo(projectId, file);
      videoId = result.videoId;
      const current = useProjectStore.getState().videoMeta;
      setVideoMeta({ ...current, videoId, duration: result.duration, width: result.width, height: result.height, fps: result.fps });
    } catch {
      toast("Backend unavailable — render will not work", "warn");
    }

    if (projectId === "demo" && videoId) {
      try {
        const { tracks: existingTracks, images: existingImages, videoMeta: existingVideoMeta, layout, clickSound, name } = useProjectStore.getState();
        const project = await createProject(projectName, videoId);
        hydrate({ ...project, name, layout, clickSound, tracks: existingTracks, images: existingImages, videoMeta: existingVideoMeta });
        window.history.replaceState(null, "", `/editor/${project.projectId}`);
      } catch {
        toast("Project creation failed — render unavailable", "error");
      }
    }

    setVideoUploading(false);
  }

  return (
    <aside className="flex w-59 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#0f0f0f]">
      <div className="border-b border-[#2a2a2a] p-3 space-y-2">
        <label className="mb-1 block text-[11px] uppercase text-[#555]">
          Project
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-2 text-[13px] text-[#f0f0f0] outline-none focus:border-[#7c3aed]"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleVideoFile(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={videoUploading}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#161616] text-[12px] text-[#888] hover:border-[#7c3aed] hover:text-[#f0f0f0] disabled:opacity-50"
        >
          {videoUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {videoMeta.url ? "Change video" : "Upload video"}
        </button>
        {videoMeta.url && !videoUploading && (
          <div className="truncate text-[11px] text-[#555]" title={videoMeta.url}>
            {videoMeta.url.split("/").at(-1)}
          </div>
        )}
      </div>

      <section className="space-y-3 border-b border-[#2a2a2a] p-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#f0f0f0]">
          <SlidersHorizontal size={14} />
          Layout
        </div>
        <label className="block text-[11px] text-[#888]">
          Ratio
          <select
            value={layout.aspectRatio}
            onChange={(event) =>
              updateLayout({ aspectRatio: event.target.value as never })
            }
            className="mt-1 h-8 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-2 text-[13px] text-[#f0f0f0] outline-none"
          >
            <option value="9:16">9:16 Vertical</option>
            <option value="1:1">1:1 Square</option>
            <option value="16:9">16:9 Wide</option>
          </select>
        </label>
        <label className="block text-[11px] text-[#888]">
          Overlay height: {layout.overlayHeightPct}%
          <input
            type="range"
            min={20}
            max={45}
            value={layout.overlayHeightPct}
            onChange={(event) =>
              updateLayout({ overlayHeightPct: Number(event.target.value) })
            }
            className="mt-1 w-full accent-[#7c3aed]"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["cover", "contain"] as const).map((fit) => (
            <button
              key={fit}
              onClick={() => updateLayout({ imageFit: fit })}
              className={`flex h-8 items-center justify-center gap-1 rounded-md border text-[12px] capitalize transition-colors ${
                layout.imageFit === fit
                  ? "border-[#7c3aed] bg-[#6d28d9] text-white"
                  : "border-[#2a2a2a] bg-[#161616] text-[#888] hover:border-[#555]"
              }`}
            >
              {layout.imageFit === fit && <Check size={12} />}
              {fit}
            </button>
          ))}
        </div>
        <div className="block text-[11px] text-[#888]">
          Background
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={layout.backgroundColor}
              onChange={(event) =>
                updateLayout({ backgroundColor: event.target.value })
              }
              className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-[#2a2a2a] bg-[#161616] p-0.5"
            />
            <input
              type="text"
              value={layout.backgroundColor.toUpperCase()}
              onChange={(event) => {
                const val = event.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                  updateLayout({ backgroundColor: val });
                }
              }}
              className="h-8 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-2 font-mono text-[12px] text-[#f0f0f0] outline-none focus:border-[#7c3aed]"
              maxLength={7}
            />
          </div>
        </div>
      </section>


      <section className="space-y-3 p-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#f0f0f0]">
          <MousePointerClick size={14} />
          Click
        </div>
        <label className="flex items-center justify-between text-[12px] text-[#888]">
          Sound
          <input
            type="checkbox"
            checked={clickSound.enabled}
            onChange={(event) =>
              updateClickSound({ enabled: event.target.checked })
            }
            className="accent-[#7c3aed]"
          />
        </label>
        <label className="block text-[11px] text-[#888]">
          Volume: {Math.round(clickSound.volume * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={clickSound.volume}
            onChange={(event) =>
              updateClickSound({ volume: Number(event.target.value) })
            }
            className="mt-1 w-full accent-[#7c3aed]"
          />
        </label>
        <div className="rounded-md border border-[#2a2a2a] bg-[#161616] px-2 py-1.5 text-[12px] text-[#888]">
          {clickSound.asset}
        </div>
      </section>
    </aside>
  );
}
