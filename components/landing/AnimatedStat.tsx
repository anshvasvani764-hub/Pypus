"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

export default function AnimatedStat({
  count,
  decimal = 0,
  suffix,
  label,
}: {
  count: number;
  decimal?: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const duration = 1400;
          const start = performance.now();
          function tick(now: number) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(count * eased);
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  const display = decimal ? value.toFixed(decimal) : Math.round(value).toLocaleString("en-IN");

  return (
    <div>
      <div className={styles["stat-num"]} ref={ref}>
        {display}
        <span className={styles.suffix}>{suffix}</span>
      </div>
      <div className={styles["stat-label"]}>{label}</div>
    </div>
  );
}
