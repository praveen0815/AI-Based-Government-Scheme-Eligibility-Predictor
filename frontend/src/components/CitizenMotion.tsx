import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function MotionBlock({
  children,
  className,
  delay = 0,
  ...rest
}: HTMLMotionProps<"div"> & { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedMetric({ value }: { value: string }) {
  const reduce = useReducedMotion();
  const parsed = value.match(/^(\d+)(.*)$/);
  const [shown, setShown] = useState(reduce || !parsed ? value : `0${parsed[2]}`);

  useEffect(() => {
    const match = value.match(/^(\d+)(.*)$/);
    if (!match || reduce) {
      setShown(value);
      return undefined;
    }
    const target = Number(match[1]);
    const suffix = match[2];
    const started = performance.now();
    const duration = 780;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setShown(`${Math.round(target * eased)}${suffix}`);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, value]);

  return <>{shown}</>;
}
