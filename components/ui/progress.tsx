export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#262626]">
      <div
        className="h-full rounded-full bg-[#7c3aed] transition-[width] duration-100"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
