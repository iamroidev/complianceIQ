"use client";

import { useEffect, type RefObject } from "react";
import { REDUCE_CHANGE_EVENT } from "@/lib/reduceMotion";

/**
 * Shared between the landing root (which owns the ScrollTrigger setup) and the
 * How-it-works section (which owns the active step and its clickable indicator).
 */
export const landingMotion: {
  goToStep: ((index: number) => void) | null;
  onStepChange: ((index: number) => void) | null;
} = { goToStep: null, onStepChange: null };

/**
 * GSAP ScrollTrigger choreography (§17, landing only): section reveals, the
 * policy-to-checks pull, the audit-pack fan, the AI threads, ≤24px desktop
 * parallax and the pinned four-step scene. Reduced motion never starts it and
 * tears it down live; without JavaScript every section stays readable.
 */
export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let run = 0;
    let teardown: (() => void) | null = null;

    const setup = async () => {
      const myRun = ++run;
      if (document.documentElement.dataset.reduceMotion === "true") {
        teardown?.();
        teardown = null;
        root.removeAttribute("data-motion");
        landingMotion.goToStep = null;
        return;
      }

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (myRun !== run) return;

      teardown?.();
      teardown = null;
      gsap.registerPlugin(ScrollTrigger);
      root.dataset.motion = "on";

      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      const refreshTimer = window.setTimeout(refresh, 420);

      // gsap defers a timeline's ScrollTrigger first refresh by a tick ("the
      // timeline may not have been populated yet"). During that end-less window
      // a later trigger's refresh force-refreshes the waiting timelines; if the
      // page is scrolled past several once:true scenes they kill themselves
      // inside that nested loop and ScrollTrigger's index math reads undefined
      // (TypeError). Ours are populated synchronously, so refresh each timeline
      // right away — an already-passed scene then dies safely inside its own
      // refresh instead of a nested one.
      const initNow = (timeline: gsap.core.Timeline): void => {
        timeline.scrollTrigger?.refresh();
      };

      try {
        const ctx = gsap.context(() => {
          // Sections fade up 16px over 500ms when 20% visible, once (§17).
          gsap.utils.toArray<HTMLElement>("[data-reveal]", root).forEach((element) => {
            gsap.to(element, {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: { trigger: element, start: "top 80%", once: true },
            });
          });

          // Policy to checks (§19.3): thread draws, the sentence travels into
          // the card, the coverage bar fills and the seal stamps.
          const policy = root.querySelector("#policy-scene");
          if (policy) {
            const thread = policy.querySelector("#ptc-thread");
            const strip = policy.querySelector("#ptc-strip");
            const card = policy.querySelector("#ptc-card");
            const bar = policy.querySelector("#ptc-bar");
            const seal = policy.querySelector("#ptc-seal");
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: policy, start: "top 70%", once: true },
            });
            if (thread) {
              timeline.fromTo(
                thread,
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0, duration: 0.7, ease: "none" },
                0,
              );
            }
            if (strip) {
              timeline.fromTo(
                strip,
                { x: 0, y: 0, opacity: 1 },
                { x: 305, y: 6, opacity: 0, duration: 0.9, ease: "power2.inOut" },
                0.15,
              );
            }
            if (card) {
              timeline.fromTo(
                card,
                { y: 14, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
                0.75,
              );
            }
            if (bar) {
              timeline.fromTo(
                bar,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.5, ease: "power2.out", svgOrigin: "400 190" },
                1.05,
              );
            }
            if (seal) {
              timeline.fromTo(
                seal,
                { scale: 0.8 },
                { scale: 1, duration: 0.4, ease: "back.out(2)", svgOrigin: "500 94" },
                1.3,
              );
            }
            initNow(timeline);
          }

          // Audit pack fan (§19.8): pages fan out as the section enters.
          const fan = root.querySelector("#pack-fan > svg");
          if (fan) {
            gsap.from(Array.from(fan.children), {
              autoAlpha: 0,
              y: 16,
              duration: 0.5,
              stagger: 0.06,
              ease: "power2.out",
              scrollTrigger: { trigger: fan, start: "top 75%", once: true },
            });
          }

          // AI threads draw into the "checked against sources" gate (§19.7).
          gsap.fromTo(
            root.querySelectorAll<SVGPathElement>(".lp-thread-connector path"),
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              duration: 0.9,
              stagger: 0.18,
              ease: "none",
              scrollTrigger: { trigger: "#ai .lp-lanes", start: "top 75%", once: true },
            },
          );

          // Section transitions (§16): the bunting thread draws across the
          // band's top edge, then its paper artifacts swing in — once, as
          // the section enters. strokeDashoffset is written straight to the
          // style (fractional pathLength=1 values don't survive gsap.set).
          root.querySelectorAll<HTMLElement>(".lp-bunting").forEach((bunting) => {
            const thread = bunting.querySelector<SVGPathElement>(".lp-bunt-thread");
            const swings = bunting.querySelectorAll(".lp-bunt-swing");
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: bunting, start: "top 85%", once: true },
            });
            if (thread) {
              thread.style.strokeDashoffset = "1";
              const draw = { p: 0 };
              timeline.to(
                draw,
                {
                  p: 1,
                  duration: 1,
                  ease: "none",
                  onUpdate: () => {
                    thread.style.strokeDashoffset = String(1 - draw.p);
                  },
                },
                0,
              );
            }
            if (swings.length > 0) {
              timeline.from(
                swings,
                {
                  autoAlpha: 0,
                  rotation: -8,
                  transformOrigin: "50% 0%",
                  duration: 0.55,
                  stagger: 0.14,
                  ease: "back.out(2)",
                },
                0.3,
              );
            }
            initNow(timeline);
          });

          // Section transition vignettes: draw the connecting thread and spring the badge
          root.querySelectorAll<HTMLElement>(".lp-section-vignette").forEach((vignette) => {
            const thread = vignette.querySelector<SVGPathElement>(".lp-vignette-thread");
            const badge = vignette.querySelector<HTMLElement>(".lp-vignette-badge");
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: vignette, start: "top 90%", once: true },
            });
            if (thread) {
              thread.style.strokeDashoffset = "1";
              const draw = { p: 0 };
              timeline.to(
                draw,
                {
                  p: 1,
                  duration: 0.8,
                  ease: "power2.out",
                  onUpdate: () => {
                    thread.style.strokeDashoffset = String(1 - draw.p);
                  },
                },
                0,
              );
            }
            if (badge) {
              timeline.from(
                badge,
                {
                  autoAlpha: 0,
                  y: 12,
                  scale: 0.9,
                  duration: 0.5,
                  ease: "back.out(1.7)",
                },
                0.2,
              );
            }
            initNow(timeline);
          });

          // Statement illustrations: subtle float-in as cards scroll into view
          root.querySelectorAll<HTMLElement>(".lp-statement").forEach((card, idx) => {
            const visual = card.querySelector<HTMLElement>(".lp-statement-visual");
            if (visual) {
              gsap.from(visual, {
                y: 18,
                autoAlpha: 0,
                duration: 0.6,
                delay: idx * 0.12,
                ease: "power2.out",
                scrollTrigger: { trigger: card, start: "top 85%", once: true },
              });
            }
          });

          // Parallax: at most 24px, desktop only (§17).
          if (window.matchMedia("(min-width: 1025px)").matches) {
            const art = root.querySelector<HTMLElement>("[data-parallax]");
            const hero = root.querySelector<HTMLElement>(".lp-hero");
            if (art && hero) {
              gsap.to(art, {
                y: -24,
                ease: "none",
                scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
              });
            }
            // Oversized bleed motifs drift ≤20px as their section passes.
            root.querySelectorAll<HTMLElement>(".lp-bleed-drift").forEach((drift) => {
              gsap.to(drift, {
                y: -20,
                ease: "none",
                scrollTrigger: {
                  trigger: drift.parentElement ?? drift,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              });
            });
          }

          // How it works: pinned for four steps (≈100vh each), one scene stage.
          // The pin scrubs (§17 "pinned = progress-driven"): the thread draws
          // from the section's arrival to the end of the pin, each step's
          // object morphs in over its quarter, and the stage drifts ≤24px —
          // so every scroll pixel moves something and the pin never reads as
          // a stuck viewport.
          const how = root.querySelector<HTMLElement>(".how");
          const steps = root.querySelectorAll(".how-step");
          if (how && steps.length === 4 && window.matchMedia("(min-width: 861px)").matches) {
            const setStage = (progress: number): void => {
              root
                .querySelectorAll<SVGGElement>(".step-object")
                .forEach((element, index) => {
                  const local = Math.min(1, Math.max(0, progress * 4 - index));
                  const eased = 1 - (1 - local) ** 3;
                  element.style.transform = `translateY(${((1 - eased) * 16).toFixed(2)}px)`;
                });
              root.querySelectorAll<HTMLElement>(".how-scene").forEach((element) => {
                element.style.translate = `0 ${(-24 * progress).toFixed(1)}px`;
              });
            };
            const setThread = (draw: number): void => {
              root.querySelectorAll<SVGPathElement>(".how-thread").forEach((element) => {
                element.style.strokeDashoffset = String(1 - draw);
              });
            };

            let lastStep = -1;
            const pinned = ScrollTrigger.create({
              trigger: how,
              start: "top top",
              end: () => `+=${window.innerHeight * 4}`,
              pin: true,
              onUpdate: (self) => {
                setStage(self.progress);
                const index = Math.min(3, Math.max(0, Math.floor(self.progress * 4)));
                if (index === lastStep) return;
                lastStep = index;
                landingMotion.onStepChange?.(index);
              },
            });
            // One continuous thread across the four steps (§19.4), drawn from
            // the moment the section enters the viewport to the pin's end.
            const threadDraw = ScrollTrigger.create({
              trigger: how,
              start: "top bottom",
              end: () => Number(pinned.end),
              onUpdate: (self) => setThread(self.progress),
            });
            setStage(pinned.progress);
            setThread(threadDraw.progress);
            landingMotion.goToStep = (index: number) => {
              const start = Number(pinned.start);
              const end = Number(pinned.end);
              window.scrollTo({
                top: start + ((end - start) * (index + 0.5)) / 4,
                behavior: "smooth",
              });
            };
          }

          // Thread spine: one teal thread draws down the whole page as you
          // scroll, knotting once per section (DESIGN §16 paper-and-thread).
          const spine = root.querySelector<SVGSVGElement>(".lp-spine");
          const spinePath = spine?.querySelector("path");
          if (spine && spinePath) {
            let dots: SVGCircleElement[] = [];
            let lastDraw = 0;
            const build = () => {
              const height = root.scrollHeight;
              const width = spine.clientWidth || root.clientWidth;
              spine.setAttribute("viewBox", `0 0 ${width} ${height}`);
              spine.style.height = `${height}px`;
              const pad = parseFloat(getComputedStyle(root).paddingLeft) || 18;
              const xMid = Math.min(14, Math.max(5, pad - 12));
              const amp = 4.5;
              const period = 700;
              const xAt = (y: number) => xMid + Math.sin((y / period) * Math.PI * 2) * amp;
              let d = `M ${xMid.toFixed(1)} 0`;
              for (let y = 30; y <= height; y += 30) {
                d += ` L ${xAt(y).toFixed(1)} ${y}`;
              }
              spinePath.setAttribute("d", d);
              spinePath.setAttribute("pathLength", "1");
              dots.forEach((dot) => dot.remove());
              dots = [];
              const litY = lastDraw * height;
              // The pinned #how is wrapped in a pin-spacer; walk the offsetParent
              // chain so the knot lands at the section's in-flow position.
              const topInRoot = (element: HTMLElement) => {
                let y = 0;
                let node: Element | null =
                  element.closest(".pin-spacer") ?? element;
                while (node && node !== root) {
                  y += (node as HTMLElement).offsetTop;
                  node = (node as HTMLElement).offsetParent;
                }
                return y;
              };
              const sections = root.querySelectorAll<HTMLElement>("section, .lp-footer");
              sections.forEach((section) => {
                const y = topInRoot(section) + 40;
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("cx", xAt(y).toFixed(1));
                dot.setAttribute("cy", String(y));
                dot.setAttribute("r", "4");
                dot.dataset.y = String(y);
                dot.style.opacity = y <= litY ? "1" : "0";
                spine.appendChild(dot);
                dots.push(dot);
              });
              spinePath.style.strokeDasharray = "1";
              spinePath.style.strokeDashoffset = String(1 - lastDraw);
            };
            build();
            ScrollTrigger.create({
              trigger: root,
              start: "top bottom",
              end: "bottom top",
              onRefresh: build,
            });
            ScrollTrigger.create({
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              onUpdate: (self) => {
                lastDraw = self.progress;
                spinePath.style.strokeDashoffset = String(1 - self.progress);
                const y = self.progress * root.scrollHeight;
                dots.forEach((dot) => {
                  dot.style.opacity = Number(dot.dataset.y ?? "0") <= y ? "1" : "0";
                });
              },
            });
          }
        }, root);

        teardown = () => {
          window.removeEventListener("load", refresh);
          window.clearTimeout(refreshTimer);
          root.querySelectorAll(".how-thread").forEach((element) => {
            (element as SVGPathElement).style.removeProperty("stroke-dashoffset");
          });
          root.querySelectorAll(".step-object").forEach((element) => {
            (element as SVGGElement).style.removeProperty("transform");
          });
          root.querySelectorAll(".how-scene").forEach((element) => {
            (element as HTMLElement).style.removeProperty("translate");
          });
          root.querySelectorAll(".lp-spine path").forEach((element) => {
            (element as SVGPathElement).style.removeProperty("stroke-dasharray");
            (element as SVGPathElement).style.removeProperty("stroke-dashoffset");
          });
          root.querySelectorAll(".lp-bunt-thread").forEach((element) => {
            (element as SVGPathElement).style.removeProperty("stroke-dashoffset");
          });
          root.querySelectorAll(".lp-spine circle").forEach((element) => {
            (element as SVGCircleElement).style.removeProperty("opacity");
          });
          ctx.revert();
          root.removeAttribute("data-motion");
          landingMotion.goToStep = null;
        };
      } catch {
        root.removeAttribute("data-motion");
        window.removeEventListener("load", refresh);
        window.clearTimeout(refreshTimer);
      }
    };

    void setup();
    const onToggle = () => {
      void setup();
    };
    document.addEventListener(REDUCE_CHANGE_EVENT, onToggle);

    return () => {
      run += 1;
      document.removeEventListener(REDUCE_CHANGE_EVENT, onToggle);
      teardown?.();
    };
  }, [rootRef]);
}
