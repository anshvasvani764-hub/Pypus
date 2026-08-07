"use client";

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";
import styles from "./landing.module.css";

export default function Reveal({
  children,
  as: Tag = "div",
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — ref typing loosened for polymorphic "as" prop
      ref={ref}
      className={`${styles.reveal} ${inView ? styles.in : ""} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
