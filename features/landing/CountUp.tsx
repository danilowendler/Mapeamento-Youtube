"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contador que sobe ao entrar na viewport. Respeita
 * prefers-reduced-motion (salta direto ao valor final).
 */
export function CountUp({
  end,
  durationMs = 1400,
  suffix = "",
  className = "",
}: {
  end: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        if (reduced) {
          setValue(end);
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          // ease-out cúbico: acelera a sensação de "explosão"
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(end * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [end, durationMs]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
