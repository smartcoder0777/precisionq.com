"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Set false to render a normal password field with no visibility toggle. */
  showVisibilityToggle?: boolean;
  /** Accessible labels for the visibility toggle (e.g. security answer vs login password). */
  toggleAriaLabels?: { show: string; hide: string };
};

const defaultToggleLabels = { show: "Show password", hide: "Hide password" } as const;

/**
 * Password field with optional eye / eye-off toggle (default on).
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { className, showVisibilityToggle = true, disabled, toggleAriaLabels = defaultToggleLabels, ...props },
    ref,
  ) => {
    const [visible, setVisible] = React.useState(false);

    if (!showVisibilityToggle) {
      return <Input ref={ref} type="password" className={className} disabled={disabled} {...props} />;
    }

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          disabled={disabled}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="absolute right-0 top-0 h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? toggleAriaLabels.hide : toggleAriaLabels.show}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
