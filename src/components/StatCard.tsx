import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
  children?: ReactNode;
}

const variants = {
  default: "from-card to-card",
  primary: "from-primary/10 to-primary/5 border-primary/20",
  secondary: "from-secondary/10 to-secondary/5 border-secondary/20",
  success: "from-success/10 to-success/5 border-success/20",
  warning: "from-warning/10 to-warning/5 border-warning/20",
};
const iconColors = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

export function StatCard({ label, value, icon: Icon, trend, variant = "default", children }: StatCardProps) {
  return (
    <Card className={cn("p-4 bg-gradient-to-br shadow-sm", variants[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold font-display mt-1">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl shrink-0", iconColors[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </Card>
  );
}
