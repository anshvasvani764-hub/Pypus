"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

/**
 * Fixed, full-viewport animated gradient background.
 * Reacts subtly to scroll position (hue-rotate + drift) via a CSS var.
 * Respects prefers-reduced-motion automatically (handled in landing.module.css).
 */
export default function AuroraBackground() {
  const shiftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    function update() {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      shiftRef.current?.style.setProperty("--scrollP", progress.toFixed(4));
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={styles.aurora} aria-hidden="true">
      <div className={styles["aurora-shift"]} ref={shiftRef}>
        <div className={`${styles["aurora-blob"]} ${styles.a1}`} />
        <div className={`${styles["aurora-blob"]} ${styles.a2}`} />
        <div className={`${styles["aurora-blob"]} ${styles.a3}`} />
        <div className={`${styles["aurora-blob"]} ${styles.a4}`} />
      </div>
    </div>
  );
}
