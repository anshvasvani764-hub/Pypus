"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        <Link href="/" className={styles.logo}>
          <span className={styles["logo-mark"]}>P</span>Pypus
        </Link>

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
          <li><Link href="#modules">Modules</Link></li>
          <li><Link href="#how">How it works</Link></li>
          <li><Link href="#pricing">Pricing</Link></li>
          <li><Link href="#faq">FAQ</Link></li>
        </ul>

        <div className={styles["nav-cta-group"]}>
          <Link href="/login" className={styles.login}>Log in</Link>
          <Link href="/login" className={`${styles.btn} ${styles["btn-primary"]}`}>Start free</Link>
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
