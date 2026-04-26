import type { RenderMessage } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function connectRenderSocket(
  jobId: string,
  onMessage: (message: RenderMessage) => void,
  onClose?: () => void,
) {
  const socket = new WebSocket(`${WS_URL}/ws/render/${jobId}`);

  socket.addEventListener("message", (event) => {
    try {
      onMessage(JSON.parse(event.data) as RenderMessage);
    } catch {
      onMessage({ type: "log", level: "info", message: String(event.data) });
    }
  });

  socket.addEventListener("close", () => onClose?.());

  return () => socket.close();
}
