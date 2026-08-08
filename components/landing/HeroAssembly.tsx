"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

const TILES = [
  { key: "t1", label: "Members", dotColor: "#3B82F6" },
  { key: "t2", label: "Attendance", dotColor: "#10B981" },
  { key: "t3", label: "Payments", dotColor: "#F59E0B" },
  { key: "t4", label: "Reports", dotColor: "#8B5CF6" },
  { key: "t5", label: "Expenses", dotColor: "#EC4899" },
];

export default function HeroAssembly() {
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    tileRefs.current.forEach((tile) => {
      if (!tile) return;
      requestAnimationFrame(() => tile.classList.add(styles.landed));
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === "transform") tile.classList.add(styles.settled);
      };
      tile.addEventListener("transitionend", onEnd);
    });
  }, []);

  return (
    <div className={styles.assembly} aria-hidden="true">
      <div className={styles["assembly-frame"]}>
        {TILES.map((tile, i) => (
          <div
            key={tile.key}
            ref={(el) => { tileRefs.current[i] = el; }}
            className={`${styles["mod-tile"]} ${styles[tile.key]}`}
          >
            <span className={styles.dot} style={{ background: tile.dotColor }} />
            {tile.label}
          </div>
        ))}
      </div>
    </div>
  );
}
