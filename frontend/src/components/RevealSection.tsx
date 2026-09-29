import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

type RevealTag = "section" | "div";

export function RevealSection({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
} & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (visible) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Tag
      ref={ref as never}
      className={`dash-reveal ${visible ? "is-visible" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
