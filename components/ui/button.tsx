import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "icon" | "md";
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border text-[13px] font-medium outline-none transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "border-[#7c3aed] bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
        variant === "secondary" &&
          "border-[#2a2a2a] bg-[#1a1a1a] text-[#f0f0f0] hover:bg-[#222]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[#888] hover:bg-[#1a1a1a] hover:text-[#f0f0f0]",
        variant === "danger" &&
          "border-[#4a2020] bg-[#271313] text-[#f87171] hover:bg-[#351717]",
        size === "md" && "h-8 px-3",
        size === "sm" && "h-7 px-2",
        size === "icon" && "h-8 w-8 px-0",
        className,
      )}
      {...props}
    />
  );
}
