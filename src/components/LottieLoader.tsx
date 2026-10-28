"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { Loader2 } from "lucide-react";

type LottieLoaderProps = {
  label?: string;
  className?: string;
  size?: number;
};

let cachedAnimationData: object | null = null;

export default function LottieLoader({
  label = "Loading...",
  className = "",
  size = 120,
}: LottieLoaderProps) {
  const [animationData, setAnimationData] = useState<object | null>(cachedAnimationData);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cachedAnimationData || failed) return;

    let cancelled = false;

    const loadAnimation = async () => {
      try {
        const response = await fetch("https://assets2.lottiefiles.com/packages/lf20_usmfx6bp.json");
        if (!response.ok) {
          throw new Error("Failed to load Lottie animation");
        }
        const data = (await response.json()) as object;
        if (cancelled) return;
        cachedAnimationData = data;
        setAnimationData(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void loadAnimation();

    return () => {
      cancelled = true;
    };
  }, [failed]);

  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}>
      {animationData ? (
        <Lottie animationData={animationData} loop autoplay style={{ width: size, height: size }} />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
      <p className="text-sm">{label}</p>
    </div>
  );
}
