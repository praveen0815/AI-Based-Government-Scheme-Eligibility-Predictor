import { lazy, Suspense, useEffect, useState } from "react";
import { ChatIcon, SchemesIcon, ScanIcon, SparkIcon, WalletIcon, CheckIcon } from "./icons";

const AiGuidanceScene = lazy(() => import("./AiGuidanceScene"));

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function FallbackVisual() {
  return (
    <div className="ai-hero-fallback">
      <span className="ai-hero-orb ai-hero-orb-a">
        <SparkIcon />
      </span>
      <span className="ai-hero-orb ai-hero-orb-b">
        <ChatIcon />
      </span>
      <span className="ai-hero-orb ai-hero-orb-c">
        <SchemesIcon />
      </span>
      <span className="ai-hero-orb ai-hero-orb-d">
        <WalletIcon />
      </span>
      <span className="ai-hero-orb ai-hero-orb-e">
        <ScanIcon />
      </span>
      <span className="ai-hero-orb ai-hero-orb-f">
        <CheckIcon />
      </span>
    </div>
  );
}

export function AiGuidanceHero() {
  const [fallback, setFallback] = useState(() => import.meta.env.MODE === "test");

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      setFallback(true);
      return;
    }
    if (!canUseWebGL()) {
      setFallback(true);
    }
  }, []);

  return (
    <div className="ai-hero-visual" aria-hidden="true">
      {fallback ? (
        <FallbackVisual />
      ) : (
        <Suspense fallback={<FallbackVisual />}>
          <AiGuidanceScene />
        </Suspense>
      )}
    </div>
  );
}
