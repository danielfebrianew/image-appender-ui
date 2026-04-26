"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type ToastLevel = "info" | "success" | "warn" | "error";

type Toast = {
  id: string;
  message: string;
  level: ToastLevel;
};

type ToastContextValue = {
  toast(message: string, level?: ToastLevel): void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const LEVEL_STYLES: Record<ToastLevel, string> = {
  info: "border-[#2a2a2a] text-[#f0f0f0]",
  success: "border-[#4ade80]/40 text-[#4ade80]",
  warn: "border-[#facc15]/40 text-[#facc15]",
  error: "border-[#f87171]/40 text-[#f87171]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const toast = useCallback((message: string, level: ToastLevel = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, message, level }]);
    const timer = setTimeout(() => dismiss(id), 3500);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-md border bg-[#1a1a1a] px-3 py-2 text-[12px] shadow-lg ${LEVEL_STYLES[t.level]}`}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-[#555] hover:text-[#888]">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
