"use client";

import { useEffect, useRef, useState } from "react";
import {
  StepDecide,
  StepDetect,
  StepExplain,
  StepProve,
} from "@/components/illustration/scenes";
import { STEPS } from "./content";
import { landingMotion } from "./motion";
import { PaperTear } from "./Transitions";

const SCENES = {
  detect: StepDetect,
  explain: StepExplain,
  decide: StepDecide,
  prove: StepProve,
} as const;

/**
 * Four steps (§19.4). Static vertical sequence by default; with motion on the
 * landing effect pins the section, stacks the scenes into one stage and swaps
 * them as the scroll moves through four steps.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    landingMotion.onStepChange = setActive;
    return () => {
      if (landingMotion.onStepChange === setActive) landingMotion.onStepChange = null;
    };
  }, []);

  const go = (index: number) => {
    setActive(index);
    if (landingMotion.goToStep) {
      landingMotion.goToStep(index);
      return;
    }
    stepRefs.current[index]?.scrollIntoView({ block: "center" });
  };

  return (
    <section className="how lp-band lp-band--white" id="how">
      <PaperTear tone="canvas" variant={3} />
      <div className="lp-container">
        <p className="lp-kicker">From signal to proof</p>
        <h2 className="lp-h2">How it works</h2>

        <ol className="how-steps">
          {STEPS.map((step, index) => {
            const Scene = SCENES[step.key];
            return (
              <li
                key={step.key}
                role="listitem"
                className={`how-step${active === index ? " is-on" : ""}`}
                ref={(element) => {
                  stepRefs.current[index] = element;
                }}
              >
                <div className="how-scene">
                  <Scene size={480} />
                </div>
                <div className="how-copy">
                  <h3>{step.label}</h3>
                  <p>{step.sentence}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="how-nav" role="group" aria-label="How it works: steps">
          {STEPS.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className="how-dot"
              aria-pressed={active === index}
              onClick={() => go(index)}
            >
              {index + 1}. {step.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
