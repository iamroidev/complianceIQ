"use client";

import { useEffect, useState, type ReactNode } from "react";

export type MlCtx = {
  run: number;
  play: boolean;
  replay: () => void;
};

type Props = {
  slug: string;
  title: string;
  spec: string;
  duration?: number;
  wide?: boolean;
  children: (ctx: MlCtx) => ReactNode;
};

export function ReplayCard({ slug, title, spec, duration, wide, children }: Props) {
  const [run, setRun] = useState(0);
  const replay = () => setRun((r) => r + 1);
  const play = run > 0;

  useEffect(() => {
    const onPlayAll = () => setRun((r) => r + 1);
    window.addEventListener("ciq-ml-play-all", onPlayAll);
    return () => window.removeEventListener("ciq-ml-play-all", onPlayAll);
  }, []);

  return (
    <section
      className={`ml-card${wide ? " ml-card-wide" : ""}`}
      data-ml-demo={slug}
      data-ml-name={title}
      data-duration={duration}
    >
      <div className="ml-card-head">
        <div>
          <h3 className="ml-card-title">{title}</h3>
          <p className="ml-card-spec">{spec}</p>
        </div>
        <button type="button" className="ml-replay" data-ml-replay onClick={replay}>
          Replay
        </button>
      </div>
      <div className={`ml-stage${play ? " ml-play" : ""}`} key={run}>
        {children({ run, play, replay })}
      </div>
    </section>
  );
}
