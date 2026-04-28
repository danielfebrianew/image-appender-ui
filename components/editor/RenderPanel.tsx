"use client";

import { useEffect, useRef } from "react";
import { Download, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { RenderStatus } from "@/lib/types";
import { resolveUrl, saveProject, startRender, uploadImage } from "@/lib/api";
import { getProjectSnapshot, useProjectStore, useRenderStore } from "@/lib/store";
import { connectRenderSocket } from "@/lib/ws";
import { useToast } from "@/components/ui/toast";

const SESSION_PROJECT_ID = "session";

const STATUS_STYLES: Record<RenderStatus, string> = {
  idle: "text-[#555]",
  queued: "text-[#facc15]",
  running: "text-[#7c3aed]",
  done: "text-[#4ade80]",
  error: "text-[#f87171]",
};

function StatusBadge({ status }: { status: RenderStatus }) {
  if (status === "idle") return null;
  return (
    <span className={`text-[11px] font-mono uppercase ${STATUS_STYLES[status]}`}>
      {status === "running" ? "running …" : status}
    </span>
  );
}

export function RenderPanel() {
  const { toast } = useToast();
  const status = useRenderStore((state) => state.status);
  const progress = useRenderStore((state) => state.progress);
  const logLines = useRenderStore((state) => state.logLines);
  const outputUrl = useRenderStore((state) => state.outputUrl);
  const setJob = useRenderStore((state) => state.setJob);
  const setStatus = useRenderStore((state) => state.setStatus);
  const setProgress = useRenderStore((state) => state.setProgress);
  const appendLog = useRenderStore((state) => state.appendLog);
  const done = useRenderStore((state) => state.done);
  const fail = useRenderStore((state) => state.fail);

  async function handleRender() {
    try {
      // Upload any local-only blob images to backend first
      const { images, updateTrack, addImage, removeImage } = useProjectStore.getState();
      for (const img of images) {
        if (!img.url.startsWith("blob:")) continue;
        try {
          const blob = await fetch(img.url).then((r) => r.blob());
          const uploaded = await uploadImage(new File([blob], img.name, { type: blob.type }));
          for (const track of useProjectStore.getState().tracks) {
            if (track.kind === "image" && track.imageId === img.id) {
              updateTrack(track.id, { imageId: uploaded.id, imageUrl: uploaded.url } as never, false);
            }
          }
          removeImage(img.id);
          addImage(uploaded);
        } catch {
          // keep local image, render may fail for this track
        }
      }

      // Save current state as the session project, then render it
      const snapshot = { ...getProjectSnapshot(), projectId: SESSION_PROJECT_ID };
      await saveProject(snapshot);
      const jobId = await startRender(SESSION_PROJECT_ID);
      setJob(jobId);
      appendLog({ level: "info", message: "Render queued" });
      connectRenderSocket(jobId, (message) => {
        if (message.type === "log") {
          appendLog({ level: message.level ?? "info", message: message.line ?? message.message ?? "" });
        }
        if (message.type === "progress") {
          setStatus("running");
          setProgress(message.percent ?? message.progress ?? 0);
        }
        if (message.type === "done") {
          done(resolveUrl(message.output_url));
          appendLog({ level: "info", message: "Render done" });
          toast("Render complete — ready to download", "success");
        }
        if (message.type === "error") {
          fail(message.message);
          toast(`Render failed: ${message.message}`, "error");
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Render failed";
      fail(msg);
      toast(msg, "error");
    }
  }

  const handleRenderRef = useRef(handleRender);
  handleRenderRef.current = handleRender;

  useEffect(() => {
    const render = () => void handleRenderRef.current();
    window.addEventListener("contextclipper:render", render);
    return () => window.removeEventListener("contextclipper:render", render);
  }, []);

  const busy = status === "queued" || status === "running";

  return (
    <section className="border-t border-[#2a2a2a] bg-[#101010]">
      <div className="flex h-10 items-center gap-3 px-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#f0f0f0]">
          <TerminalSquare size={14} />
          Render Log
        </div>
        {busy && (
          <div className="w-40">
            <Progress value={progress} />
          </div>
        )}
        <StatusBadge status={status} />
        {outputUrl && (
          <a href={outputUrl} download className="ml-auto">
            <Button size="sm" variant="secondary">
              <Download size={13} />
              Download
            </Button>
          </a>
        )}
      </div>
      <div className="max-h-28 overflow-auto border-t border-[#1f1f1f] px-3 py-2 font-mono text-[11px] leading-5 text-[#888]">
        {logLines.length === 0 ? (
          <div className="text-[#555]">Render output appears here.</div>
        ) : (
          logLines.slice(-80).map((line) => (
            <div key={line.id} className={line.level === "error" ? "text-[#f87171]" : line.level === "warn" ? "text-[#facc15]" : ""}>
              &gt; [{line.level}] {line.message}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
