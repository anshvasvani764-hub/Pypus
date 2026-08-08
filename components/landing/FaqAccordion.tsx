"use client";

import { useState } from "react";
import styles from "./landing.module.css";
import { FAQ_ITEMS } from "./landing-data";

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles["faq-list"]}>
      {FAQ_ITEMS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div
            key={i}
            className={`${styles["faq-item"]} ${open ? styles.open : ""}`}
          >
            <button
              className={styles["faq-q"]}
              onClick={() => setOpenIndex(open ? null : i)}
            >
              {item.question} <span className={styles.plus}>+</span>
            </button>
            <div className={styles["faq-a"]}>
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
