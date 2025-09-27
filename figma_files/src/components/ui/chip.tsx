import * as React from "react";
import { cn } from "./utils";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  variant?: "default" | "selected" | "muted";
  size?: "default" | "sm" | "lg";
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant = "default", size = "default", selected, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variantClasses = {
      default: "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
      selected: "border-primary bg-primary text-primary-foreground",
      muted: "border-muted bg-muted text-muted-foreground",
    };
    
    const sizeClasses = {
      default: "h-8 px-3 text-sm",
      sm: "h-6 px-2 text-xs",
      lg: "h-10 px-4 text-base",
    };
    
    const finalVariant = selected ? "selected" : variant;
    
    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[finalVariant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Chip.displayName = "Chip";

export { Chip };