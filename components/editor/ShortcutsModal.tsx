"use client";

import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: "Space", action: "Play / Pause" },
  { keys: "← / →", action: "Seek −1s / +1s" },
  { keys: "Shift + ← / →", action: "Seek −5s / +5s" },
  { keys: ", / .", action: "Frame step backward / forward" },
  { keys: "Ctrl+V", action: "Paste image at playhead" },
  { keys: "Delete / Backspace", action: "Delete selected track" },
  { keys: "D", action: "Duplicate selected track" },
  { keys: "S", action: "Split selected track at playhead" },
  { keys: "[ / ]", action: "Trim track start / end to playhead" },
  { keys: "+ / −", action: "Zoom timeline in / out" },
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Shift+Z", action: "Redo" },
  { keys: "Ctrl+S", action: "Force save" },
  { keys: "Enter", action: "Start render" },
  { keys: "Esc", action: "Deselect track" },
  { keys: "?", action: "Show this help" },
] as const;

type Props = {
  open: boolean;
  onClose(): void;
};

export function ShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-105 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#f0f0f0]">
            <Keyboard size={15} />
            Keyboard Shortcuts
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#888]">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-0.5">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-[#222]">
              <span className="text-[12px] text-[#888]">{action}</span>
              <kbd className="rounded border border-[#333] bg-[#111] px-1.5 py-0.5 font-mono text-[11px] text-[#f0f0f0]">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
