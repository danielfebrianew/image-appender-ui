"use client";

export function ClickMarker({ left }: { left: number }) {
  return (
    <div
      className="absolute top-7.5 h-4 w-px bg-[#facc15]"
      style={{ left }}
      title="Click sound"
    >
      <div className="absolute -left-1 top-0 h-2 w-2 rotate-45 bg-[#facc15]" />
    </div>
  );
}
