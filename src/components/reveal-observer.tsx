"use client";

import { useEffect } from "react";

// Come l'effetto "reveal" delle guide di buckled.it: da 200px più in basso, 0,65 s.
const REVEAL: Keyframe[] = [
  { opacity: 0, transform: "translateY(200px)" },
  { opacity: 1, transform: "none" },
];
// Barre dei punteggi: il riempimento cresce da sinistra.
const GROW: Keyframe[] = [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }];
const SELECTOR = "[data-reveal] > *, [data-grow]";

/**
 * Animazioni all'ingresso nello schermo, una volta sola, quando l'elemento è visibile al 10%:
 * - `data-reveal` sul contenitore: ogni figlio diretto (scheda) sale dal basso;
 * - `data-grow` su un riempimento: la barra cresce da sinistra (barre in fila sfalsate).
 * Anima con la Web Animations API, senza toccare classi o attributi: le schede arrivano
 * in streaming e cambiarle prima che React le idrati darebbe errori di idratazione.
 * Lo stato iniziale (nascosto) è in globals.css.
 */
export function RevealObserver() {
  useEffect(() => {
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        let bars = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          // fill "forwards": a fine animazione resta lo stato finale, sopra lo stato iniziale del CSS.
          if (e.target.hasAttribute("data-grow")) {
            e.target.animate(GROW, { duration: 800, delay: Math.min(bars++, 12) * 40, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
          } else {
            e.target.animate(REVEAL, { duration: 650, easing: "ease", fill: "forwards" });
          }
        }
      },
      { threshold: 0.1 },
    );
    const scan = () => {
      for (const el of document.querySelectorAll(SELECTOR)) {
        if (seen.has(el)) continue;
        seen.add(el);
        io.observe(el);
      }
    };
    scan();
    // Navigazione lato client, filtri, streaming: le schede nuove arrivano dopo.
    let frame = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
