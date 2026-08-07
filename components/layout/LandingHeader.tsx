"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${scrolled ? styles.scrolled : ""}`}>
      <nav>
        <a href="/" className={styles.logo}>
          <span className={styles["logo-mark"]}>P</span>Pypus
        </a>

        <ul
          className={styles["nav-links"]}
          style={
            menuOpen
              ? {
                  display: "flex",
                  flexDirection: "column",
                  position: "fixed",
                  top: 64,
                  left: 0,
                  right: 0,
                  background: "#08080A",
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--line)",
                  gap: 18,
                }
              : undefined
          }
        >
          <li><a href="#modules">Modules</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>

        <div className={styles["nav-cta-group"]}>
          <a href="/login" className={styles.login}>Log in</a>
          <a href="/login" className={`${styles.btn} ${styles["btn-primary"]}`}>Start free</a>
        </div>

        <button
          className={styles.hamburger}
          aria-label="Menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
        </button>
      </nav>
    </header>
  );
}
