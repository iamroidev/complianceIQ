"use client";

import { ReplayCard } from "./ReplayCard";

const EASES = [
  { name: "--ease-out", value: "cubic-bezier(0.22, 1, 0.36, 1)", token: "var(--ease-out)" },
  { name: "--ease-in-out", value: "cubic-bezier(0.65, 0, 0.35, 1)", token: "var(--ease-in-out)" },
  { name: "--ease-spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", token: "var(--ease-spring)" },
];

const DURATIONS = [
  { name: "--dur-instant", ms: 90 },
  { name: "--dur-fast", ms: 160 },
  { name: "--dur-base", ms: 240 },
  { name: "--dur-slow", ms: 420 },
  { name: "--dur-scene", ms: 800 },
];

export function TokenDemos() {
  return (
    <>
      <ReplayCard
        slug="token-easing"
        title="Easing tracks"
        spec="§17 tokens: --ease-out, --ease-in-out, --ease-spring (small overshoot, seals and toggles only). The dot travels the same 284px rail with each curve over 800ms."
        duration={800}
      >
        {({ play }) => (
          <div className="ml-token">
            {EASES.map((e) => (
              <div className="ml-token-row" key={e.name}>
                <span className="ml-token-name">{e.name}</span>
                <div className="ml-rail">
                  <span
                    className="ml-dot"
                    style={play ? { animation: `mlTrack 800ms ${e.token} both` } : undefined}
                  />
                </div>
                <span className="ml-token-val">{e.value}</span>
              </div>
            ))}
          </div>
        )}
      </ReplayCard>

      <ReplayCard
        slug="token-durations"
        title="Duration relay"
        spec="§17 tokens: --dur-instant 90ms · --dur-fast 160ms · --dur-base 240ms · --dur-slow 420ms · --dur-scene 800ms. Product transitions stay ≤ 240ms; --dur-scene is landing-only."
        duration={800}
      >
        {({ play }) => (
          <div className="ml-token">
            {DURATIONS.map((d) => (
              <div className="ml-token-row" key={d.name}>
                <span className="ml-token-name">
                  {d.name} · {d.ms}ms
                </span>
                <div className="ml-rail">
                  <span
                    className="ml-dot"
                    style={play ? { animation: `mlTrack ${d.ms}ms var(--ease-out) both` } : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReplayCard>
    </>
  );
}
