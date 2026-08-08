"use client";

import styles from "./landing.module.css";

const FEED = [
  { label: "Fee reminder sent", meta: "WhatsApp · 9:02 AM" },
  { label: "Receipt generated", meta: "₹2,499 · 9:03 AM" },
  { label: "Attendance logged", meta: "41 check-ins today" },
  { label: "Report updated", meta: "Just now" },
];

export default function HeroAutomationFeed() {
  return (
    <div className={styles["auto-feed"]} aria-hidden="true">
      <div className={styles["auto-feed-card"]}>
        <div className={styles["auto-feed-head"]}>
          <span className={styles["auto-feed-dot"]} />
          Today, automatically
        </div>
        {FEED.map((item, i) => (
          <div
            key={item.label}
            className={styles["auto-feed-row"]}
            style={{ animationDelay: `${0.5 + i * 0.15}s` }}
          >
            <span className={styles["auto-feed-check"]}>✓</span>
            <div>
              <div className={styles["auto-feed-label"]}>{item.label}</div>
              <div className={styles["auto-feed-meta"]}>{item.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
