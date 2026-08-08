"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import AuroraBackground from "./AuroraBackground";
import LandingHeader from "./LandingHeader";
import HeroAutomationFeed from "./HeroAutomationFeed";
import Reveal from "./Reveal";
import AnimatedStat from "./AnimatedStat";
import FaqAccordion from "./FaqAccordion";
import { inter, jetbrainsMono } from "./fonts";
import {
  STATS,
  PROOF_LOGOS,
  MODULES,
  STEPS,
  TESTIMONIALS,
  PRICING_PLANS,
} from "./landing-data";

export default function LandingPage() {
  // smooth-scroll only while this page is mounted, so it never leaks to
  // the rest of the app (dashboard / workstation etc.)
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className={`${styles.landingRoot} ${inter.variable} ${jetbrainsMono.variable}`}>
      <AuroraBackground />
      <LandingHeader />

      {/* ---------- HERO ---------- */}
      <section className={styles.hero}>
        <div className={`${styles["glow-orb"]} ${styles.g1}`} />
        <div className={`${styles["glow-orb"]} ${styles.g2}`} />
        <div className={styles["hero-inner"]}>
          <div>
            <span className={styles.eyebrow}>WHERE YOUR GYM RUNS ITSELF</span>
            <h1>Your gym runs itself. You just focus on <em>growth</em>.</h1>
            <p className={styles["hero-sub"]}>
              Fee reminders that send themselves on WhatsApp. Receipts that generate on their own.
              Attendance that tracks without anyone typing a thing. Pypus automates the busywork —
              so nothing falls through the cracks, and you spend your day growing the gym, not managing it.
            </p>
            <div className={styles["hero-ctas"]}>
              <Link href="/login" className={`${styles.btn} ${styles["btn-emerald"]}`}>Start free trial</Link>
              <Link href="#how" className={`${styles.btn} ${styles["btn-ghost"]}`}>Watch 2-min demo</Link>
            </div>
            <p className={styles["hero-note"]}>Trusted by gym owners across Gurugram · Live in under 24 hours</p>
          </div>
          <HeroAutomationFeed />
        </div>
      </section>

      {/* ---------- SOCIAL PROOF MARQUEE ---------- */}
      <div className={styles.proof}>
        <p className={styles["proof-label"]}>Trusted by gyms and academies across NCR</p>
        <div className={styles.marquee}>
          {[...PROOF_LOGOS, ...PROOF_LOGOS].map((name, i) => (
            <span key={i}>{name}</span>
          ))}
        </div>
      </div>

      {/* ---------- STATS ---------- */}
      <div className={`${styles.stats} ${styles.reveal} ${styles.in}`}>
        <div className={`${styles.wrap} ${styles["stats-grid"]}`}>
          {STATS.map((s, i) => (
            <AnimatedStat key={i} count={s.count} decimal={s.decimal} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </div>

      {/* ---------- PROBLEM / SOLUTION ---------- */}
      <section>
        <div className={styles.wrap}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>THE SHIFT</span>
            <h2>The morning your gym starts running itself.</h2>
            <p>Three small moments, happening quietly, every single day.</p>
          </Reveal>
          <div className={styles["ps-grid"]}>
            <Reveal className={styles["ps-card"]}>
              <span className={styles["ps-tag"]}>MORNING CHECK-IN</span>
              <h3>Every member, welcomed in one tap</h3>
              <p>Your front desk taps a name, attendance logs itself, and streaks build automatically — a warm, effortless start to every member&apos;s day.</p>
              <div className={styles["ps-tagline"]}>Powered by the Attendance automation</div>
            </Reveal>
            <Reveal className={styles["ps-card"]}>
              <span className={styles["ps-tag"]}>FEE DAY</span>
              <h3>Dues that quietly track themselves</h3>
              <p>The moment a payment lands, it&apos;s recorded. The moment one&apos;s coming due, you&apos;ll already know — calm and on time, every month.</p>
              <div className={styles["ps-tagline"]}>Powered by the Payments automation</div>
            </Reveal>
            <Reveal className={styles["ps-card"]}>
              <span className={styles["ps-tag"]}>MONTH END</span>
              <h3>A report that&apos;s already waiting for you</h3>
              <p>Revenue, retention and attendance trends update live, so closing the month takes minutes — and reads like good news.</p>
              <div className={styles["ps-tagline"]}>Powered by the Reports automation</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES / AUTOMATIONS ---------- */}
      <section id="features" style={{ position: "relative", overflow: "hidden" }}>
        <div
          className={styles["glow-orb"]}
          style={{ width: 380, height: 380, background: "radial-gradient(circle,rgba(20,184,166,0.14),transparent 70%)", top: -100, right: -120 }}
        />
        <div className={styles.wrap} style={{ position: "relative", zIndex: 1 }}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>THE AUTOMATIONS</span>
            <h2>Five automations that quietly run your gym.</h2>
            <p>You don&apos;t send fee reminders. You don&apos;t write receipts by hand. You don&apos;t chase attendance. Pypus already did it — on WhatsApp, in the background — while you focus on growth.</p>
          </Reveal>
          <div className={styles["mod-grid"]}>
            {MODULES.map((m) => (
              <Reveal key={m.code} className={styles["mod-card"]}>
                <div className={styles["accent-bar"]} style={{ background: m.accent }} />
                <span className={styles.code}>{m.code}</span>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </Reveal>
            ))}
            <Reveal
              className={styles["mod-card"]}
              style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--emerald-tint)", border: "1px dashed var(--emerald)" }}
            >
              <span className={styles.code} style={{ borderColor: "var(--emerald)", color: "var(--emerald-dark)" }}>[NEW]</span>
              <h3 style={{ color: "var(--emerald-dark)" }}>More automations coming</h3>
              <p>Staff payroll and lead pipeline automations are next — same system, no migration.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- SHOWCASE (device mockup) ---------- */}
      <section className={styles.showcase}>
        <div className={`${styles["glow-orb"]} ${styles.s1}`} />
        <div className={`${styles["glow-orb"]} ${styles.s2}`} />
        <div className={`${styles.wrap} ${styles["showcase-inner"]}`}>
          <Reveal className={styles["section-head"]} style={{ margin: "0 auto 0", textAlign: "center", maxWidth: 640 }}>
            <span className={styles.eyebrow}>SEE IT COME TOGETHER</span>
            <h2>Everything your front desk needs, on every screen.</h2>
            <p>The same dashboard your team checks in members on today follows you to your phone tonight — nothing to sync, nothing to remember.</p>
          </Reveal>
          <Reveal as="div" className={styles["device-stage"]}>
            <div className={styles.laptop}>
              <div className={styles["laptop-screen"]}>
                <div className={styles["laptop-inner"]}>
                  <div className={styles["laptop-topbar"]}><span /><span /><span /></div>
                  <div className={styles["laptop-body"]}>
                    <div className={styles["laptop-sidebar"]}>
                      <div className={`${styles["side-item"]} ${styles.active}`} />
                      <div className={styles["side-item"]} />
                      <div className={styles["side-item"]} />
                      <div className={styles["side-item"]} />
                    </div>
                    <div className={styles["laptop-main"]}>
                      <div className={styles["laptop-cards"]}>
                        <div className={styles.card}><div className={styles.n} /><div className={styles.l} /></div>
                        <div className={styles.card}><div className={styles.n} /><div className={styles.l} /></div>
                        <div className={styles.card}><div className={styles.n} /><div className={styles.l} /></div>
                      </div>
                      <div className={styles["laptop-chart"]}>
                        {[40, 65, 50, 80, 55, 90, 70, 60].map((h, i) => (
                          <i key={i} style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles["laptop-base"]} />
            </div>
            <div className={styles.phone}>
              <div className={styles["phone-screen"]}>
                <div className={styles["phone-top"]}><div className={styles.n} /></div>
                <div className={styles["phone-list"]}>
                  <div className={`${styles["phone-row"]} ${styles.done}`}><div className={styles.avatar} /><div className={styles.bar} /></div>
                  <div className={`${styles["phone-row"]} ${styles.done}`}><div className={styles.avatar} /><div className={styles.bar} /></div>
                  <div className={styles["phone-row"]}><div className={styles.avatar} /><div className={styles.bar} /></div>
                  <div className={styles["phone-row"]}><div className={styles.avatar} /><div className={styles.bar} /></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" style={{ background: "rgba(21,20,15,0.78)" }}>
        <div className={styles.wrap}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>SETUP</span>
            <h2>Live in three steps.</h2>
          </Reveal>
          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <Reveal key={i} className={styles.step}>
                <span className={styles["step-num"]}>{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < STEPS.length - 1 && <div className={styles["step-line"]} />}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div
          className={styles["glow-orb"]}
          style={{ width: 340, height: 340, background: "radial-gradient(circle,rgba(16,185,129,0.10),transparent 70%)", top: -80, left: "50%", transform: "translateX(-50%)" }}
        />
        <div className={styles.wrap} style={{ position: "relative", zIndex: 1 }}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>FROM OWNERS</span>
            <h2>What gym owners actually say.</h2>
          </Reveal>
        </div>
        <div className={styles["testi-marquee-wrap"]}>
          <div className={styles["testi-track"]}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className={styles["testi-card"]}>
                <p className={styles["testi-quote"]}>&quot;{t.quote}&quot;</p>
                <div className={styles["testi-person"]}>
                  {t.photo ? (
                    <img
                      src={t.photo}
                      alt={`${t.name} logo`}
                      className={styles["testi-avatar"]}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div className={styles["testi-avatar"]}>
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className={styles["testi-name"]}>{t.name}</div>
                    <div className={styles["testi-role"]}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" style={{ background: "rgba(21,20,15,0.78)", position: "relative", overflow: "hidden" }}>
        <div
          className={styles["glow-orb"]}
          style={{ width: 420, height: 420, background: "radial-gradient(circle,rgba(16,185,129,0.16),transparent 70%)", bottom: -160, left: -100 }}
        />
        <div className={styles.wrap} style={{ position: "relative", zIndex: 1 }}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>PRICING</span>
            <h2>Pay for what you switch on.</h2>
            <p>Every plan includes all five automations. The difference is scale and support.</p>
          </Reveal>
          <div className={styles["pricing-grid"]}>
            {PRICING_PLANS.map((plan) => (
              <Reveal
                key={plan.name}
                className={`${styles["price-card"]} ${plan.featured ? styles.featured : ""} ${plan.blurred ? styles.blurredCard : ""}`}
              >
                <div className={styles.cardContent}>
                  {plan.featured && <span className={styles["price-badge"]}>MOST PICKED</span>}
                  <h3>{plan.name}</h3>
                  <div className={styles["price-amount"]}>
                    {plan.price}<span style={{ fontSize: 16, fontWeight: 600 }}>/mo</span>
                  </div>
                  <div className={styles["price-period"]}>{plan.period}</div>
                  <ul className={styles["price-features"]}>
                    {plan.features.map((f) => (
                      <li key={f}><span className={styles.check}>✓</span>{f}</li>
                    ))}
                  </ul>
                  <a
                    href={plan.ctaHref}
                    className={`${styles.btn} ${plan.featured ? styles["btn-emerald"] : styles["btn-ghost"]}`}
                    style={{ width: "100%" }}
                  >
                    {plan.ctaLabel}
                  </a>
                </div>
                {plan.blurred && (
                  <div className={styles.blurOverlay}>
                    <span className={styles.lockIcon}>🔒</span>
                    <span className={styles.blurText}>{plan.blurLabel || "Coming Soon"}</span>
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq">
        <div className={styles.wrap}>
          <Reveal className={styles["section-head"]}>
            <span className={styles.eyebrow}>QUESTIONS</span>
            <h2>Before you ask.</h2>
          </Reveal>
          <FaqAccordion />
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section>
        <div className={styles.wrap}>
          <Reveal className={styles["final-cta"]}>
            <h2>Your gym, finally running like one system.</h2>
            <p>Set up your first automation in under 10 minutes, and watch your front desk, fees and reports fall quietly into place.</p>
            <div className={styles["hero-ctas"]}>
              <Link href="/login" className={`${styles.btn} ${styles["btn-emerald"]}`}>Start free trial</Link>
              <Link href="/login" className={`${styles.btn} ${styles["btn-ghost"]}`} style={{ borderColor: "rgba(245,244,239,0.3)", color: "#F5F4EF" }}>Talk to sales</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer>
        <div className={styles.wrap}>
          <div className={styles["footer-grid"]}>
            <div className={styles["footer-brand"]}>
              <Link href="/" className={styles.logo}><img src="/logo.png" alt="Pypus logo" className={styles["logo-mark"]} />Pypus</Link>
              <p>Where your business runs itself. One quiet, connected system for gyms and service businesses.</p>
            </div>
            <div className={styles["footer-col"]}>
              <h4>PRODUCT</h4>
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="#how">How it works</Link>
            </div>
            <div className={styles["footer-col"]}>
              <h4>COMPANY</h4>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/careers">Careers</Link>
            </div>
            <div className={styles["footer-col"]}>
              <h4>LEGAL</h4>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-conditions">Terms & Conditions</Link>
            </div>
          </div>
          <div className={styles["footer-bottom"]}>
            <span>© {new Date().getFullYear()} Pypus. All rights reserved.</span>
            <span>Made in Gurugram</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
