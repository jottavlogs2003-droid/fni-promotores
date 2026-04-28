import logo from "@/assets/fni-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "h-8",
  md: "h-12",
  lg: "h-20",
  xl: "h-32",
};

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <img
      src={logo}
      alt="FNI Promotores"
      className={cn(sizes[size], "w-auto object-contain select-none", className)}
      draggable={false}
    />
  );
}
