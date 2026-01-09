/**
 * Zarpeo Icons (SVG sprite) - corporate color by default
 *
 * 1) Inline `sprite.svg` once (e.g. in App layout).
 * 2) Use:
 *    <ZIcon name="boat" className="w-6 h-6" />
 *    <ZIcon name="boat" className="w-6 h-6" color="#0B3C5D" />
 */
import React from "react";

const DEFAULT_COLOR = "#0E6BA8";

export function ZIcon({
  name,
  title,
  className,
  color = DEFAULT_COLOR,
}: {
  name:
"anchor" | "boat" | "book-nautical" | "calendar" | "certificate" | "chart" | "charter" | "chat" | "compass" | "fish" | "heart" | "hook" | "lifebuoy" | "login" | "logout" | "map" | "marina" | "per-exam" | "pin" | "quiz" | "sailboat" | "search" | "settings" | "shield" | "store" | "tackle" | "timer" | "user" | "user-plus" | "users" | "waves" | "weather";
  title?: string;
  className?: string;
  color?: string;
}) {
  const labelled = Boolean(title);
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-hidden={!labelled}
      aria-label={labelled ? title : undefined}
    >
      {labelled ? <title>{title}</title> : null}
      <use href={`#zarpeo-${name}`} />
      <style>{`svg { stroke: ${color}; }`}</style>
    </svg>
  );
}
